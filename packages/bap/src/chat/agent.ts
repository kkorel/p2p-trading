/**
 * Oorja Agent — Core conversational state machine.
 * Handles onboarding (OTP → VC → trading) and general Q&A.
 * Messages are kept short and farmer-friendly.
 */

import {
  prisma,
  createLogger,
  sendOtp,
  verifyOtpAndAuthenticate,
  createSession,
  validatePhoneNumber,
  normalizePhone,
  calculateAllowedLimit,
  verifyCredential as verifyVCStructure,
  detectCredentialType,
  extractCapacity,
} from '@p2p/shared';
import { knowledgeBase } from './knowledge-base';
import { mockTradingAgent } from './trading-agent';
import { askLLM } from './llm-fallback';
import { detectLanguage, translateToEnglish, translateFromEnglish, isTranslationAvailable, type SarvamLangCode } from './sarvam';
import { extractVCFromPdf } from '../vc-pdf-analyzer';

const logger = createLogger('OorjaAgent');

// --- Types ---

export interface FileData {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface AgentMessage {
  text: string;
  buttons?: Array<{ text: string; callbackData?: string }>;
  delay?: number;
}

export interface AgentResponse {
  messages: AgentMessage[];
  newState?: string;
  contextUpdate?: Partial<SessionContext>;
  authToken?: string; // Set when user authenticates through chat
}

interface SessionContext {
  phone?: string;
  name?: string;
  otpAttempts?: number;
  userId?: string;
  authToken?: string;
  providerId?: string;
  vcVerified?: boolean;
  tradingActive?: boolean;
  productionCapacity?: number;
  tradeLimit?: number;
  discom?: string;
  askedDiscom?: boolean;
  language?: SarvamLangCode;
  intent?: 'sell' | 'buy' | 'learn';
  langPicked?: boolean;
}

type ChatState =
  | 'GREETING'
  | 'WAITING_PHONE'
  | 'WAITING_OTP'
  | 'WAITING_NAME'
  | 'OTP_VERIFIED'
  | 'EXPLAIN_VC'
  | 'WAITING_VC_UPLOAD'
  | 'VC_VERIFIED'
  | 'CONFIRM_TRADING'
  | 'TRADING_ACTIVE'
  | 'GENERAL_CHAT';

interface StateHandler {
  onEnter: (ctx: SessionContext) => Promise<AgentResponse>;
  onMessage: (ctx: SessionContext, message: string, fileData?: FileData) => Promise<AgentResponse>;
}

// --- State Handlers ---

const LANG_BUTTONS = [
  { text: 'English', callbackData: 'lang:en-IN' },
  { text: 'हिंदी', callbackData: 'lang:hi-IN' },
  { text: 'বাংলা', callbackData: 'lang:bn-IN' },
  { text: 'தமிழ்', callbackData: 'lang:ta-IN' },
  { text: 'తెలుగు', callbackData: 'lang:te-IN' },
  { text: 'ಕನ್ನಡ', callbackData: 'lang:kn-IN' },
];

const INTENT_BUTTONS = [
  { text: 'Sell my energy ⚡', callbackData: 'intent:sell' },
  { text: 'Buy energy 🔌', callbackData: 'intent:buy' },
  { text: 'Learn more 📖', callbackData: 'intent:learn' },
];

const states: Record<ChatState, StateHandler> = {
  GREETING: {
    async onEnter() {
      return {
        messages: [
          { text: 'Namaste! I am Oorja.' },
          {
            text: 'Choose your language:',
            buttons: LANG_BUTTONS,
            delay: 300,
          },
        ],
      };
    },
    async onMessage(ctx, message) {
      // Language selection from button
      if (message.startsWith('lang:')) {
        const lang = message.replace('lang:', '') as SarvamLangCode;
        return {
          messages: [
            {
              text: 'What would you like to do?',
              buttons: INTENT_BUTTONS,
            },
          ],
          contextUpdate: { language: lang, langPicked: true },
        };
      }

      // Intent selection from button
      if (message.startsWith('intent:')) {
        const intent = message.replace('intent:', '') as 'sell' | 'buy' | 'learn';
        if (intent === 'learn') {
          return {
            messages: [
              {
                text: 'With P2P trading, you sell your extra solar power directly to neighbors. You earn Rs 5-8 per unit instead of Rs 2 from the grid.',
                buttons: [
                  { text: 'Start selling', callbackData: 'intent:sell' },
                  { text: 'Start buying', callbackData: 'intent:buy' },
                ],
              },
            ],
            contextUpdate: { intent },
          };
        }
        return {
          messages: [],
          newState: 'WAITING_PHONE',
          contextUpdate: { intent },
        };
      }

      // If language was already picked and user sends free text, show intent buttons
      if (ctx.langPicked) {
        return {
          messages: [
            {
              text: 'What would you like to do?',
              buttons: INTENT_BUTTONS,
            },
          ],
        };
      }

      // Free-text reply — detect language from script
      const detected = detectLanguage(message);
      if (detected !== 'en-IN') {
        return {
          messages: [
            {
              text: 'What would you like to do?',
              buttons: INTENT_BUTTONS,
            },
          ],
          contextUpdate: { language: detected, langPicked: true },
        };
      }

      // English text — default to English, show intent
      return {
        messages: [
          {
            text: 'What would you like to do?',
            buttons: INTENT_BUTTONS,
          },
        ],
        contextUpdate: { language: 'en-IN' as SarvamLangCode, langPicked: true },
      };
    },
  },

  WAITING_PHONE: {
    async onEnter(ctx) {
      const intentText = ctx.intent === 'buy' ? 'buy energy' : 'sell energy';
      return {
        messages: [
          { text: `Let's get you started to ${intentText}.\n\nYour phone number?` },
        ],
      };
    },
    async onMessage(ctx, message) {
      const phone = message.trim().replace(/[\s\-()]/g, '');

      if (!validatePhoneNumber(phone)) {
        return {
          messages: [{ text: 'Please enter a valid 10-digit phone number.' }],
        };
      }

      const normalized = normalizePhone(phone);
      const result = await sendOtp(normalized);

      if (!result.success) {
        return {
          messages: [{ text: 'Could not send OTP. Please try again.' }],
        };
      }

      return {
        messages: [],
        newState: 'WAITING_OTP',
        contextUpdate: { phone: normalized },
      };
    },
  },

  WAITING_OTP: {
    async onEnter(ctx) {
      return {
        messages: [
          { text: `Code sent to ${ctx.phone}. Enter it:` },
        ],
      };
    },
    async onMessage(ctx, message) {
      const otp = message.trim().replace(/\s/g, '');
      const attempts = (ctx.otpAttempts || 0) + 1;

      if (!/^\d{4,6}$/.test(otp)) {
        return {
          messages: [{ text: 'Enter the 6-digit code.' }],
          contextUpdate: { otpAttempts: attempts },
        };
      }

      const result = await verifyOtpAndAuthenticate(ctx.phone!, otp, ctx.name);

      if (!result.success) {
        if (attempts >= 3) {
          return {
            messages: [{ text: 'Too many wrong attempts. Let\'s try again.' }],
            newState: 'WAITING_PHONE',
            contextUpdate: { otpAttempts: 0 },
          };
        }
        return {
          messages: [{ text: `Wrong code. ${3 - attempts} attempt(s) left.` }],
          contextUpdate: { otpAttempts: attempts },
        };
      }

      // Create session token
      const authSession = await createSession({
        userId: result.userId!,
        deviceInfo: 'Oorja-Agent',
      });

      if (result.isNewUser) {
        return {
          messages: [],
          newState: 'WAITING_NAME',
          contextUpdate: {
            userId: result.userId,
            authToken: authSession.token,
            otpAttempts: 0,
          },
          authToken: authSession.token,
        };
      }

      // Existing user — check if already onboarded
      if (result.user?.profileComplete) {
        return {
          messages: [
            { text: `Welcome back, ${result.user.name || 'friend'}!` },
          ],
          newState: 'GENERAL_CHAT',
          contextUpdate: {
            userId: result.userId,
            authToken: authSession.token,
            name: result.user.name || undefined,
            otpAttempts: 0,
          },
          authToken: authSession.token,
        };
      }

      return {
        messages: [],
        newState: 'OTP_VERIFIED',
        contextUpdate: {
          userId: result.userId,
          authToken: authSession.token,
          name: result.user?.name || undefined,
          otpAttempts: 0,
        },
        authToken: authSession.token,
      };
    },
  },

  WAITING_NAME: {
    async onEnter() {
      return {
        messages: [{ text: 'What is your name?' }],
      };
    },
    async onMessage(ctx, message) {
      const name = message.trim();
      if (name.length < 2) {
        return {
          messages: [{ text: 'Please enter your name.' }],
        };
      }

      if (ctx.userId) {
        await prisma.user.update({
          where: { id: ctx.userId },
          data: { name },
        });
      }

      return {
        messages: [],
        newState: 'OTP_VERIFIED',
        contextUpdate: { name },
      };
    },
  },

  OTP_VERIFIED: {
    async onEnter(ctx) {
      const greeting = `Welcome, ${ctx.name || 'friend'}!`;

      // Buyer intent — skip VC, go to general chat
      if (ctx.intent === 'buy') {
        await prisma.user.update({
          where: { id: ctx.userId! },
          data: { profileComplete: true },
        });
        return {
          messages: [
            { text: `${greeting} You can now browse and buy energy from the Buy tab.` },
          ],
          newState: 'GENERAL_CHAT',
        };
      }

      // Seller intent — need VC verification
      return {
        messages: [
          { text: `${greeting} Let's verify your solar panel to start selling.` },
        ],
        newState: 'EXPLAIN_VC',
      };
    },
    async onMessage() {
      return { messages: [], newState: 'EXPLAIN_VC' };
    },
  },

  EXPLAIN_VC: {
    async onEnter(ctx) {
      // If we already know the DISCOM, skip to upload prompt
      if (ctx.askedDiscom && ctx.discom) {
        return {
          messages: [
            {
              text: `Upload your solar credential PDF from ${ctx.discom}.\n\nDon't have it? Download sample: https://open-vcs.up.railway.app`,
              buttons: [{ text: 'I have it', callbackData: 'ready' }],
            },
          ],
          newState: 'WAITING_VC_UPLOAD',
        };
      }

      return {
        messages: [
          {
            text: 'Which electricity company (DISCOM) is in your area?',
            buttons: [
              { text: 'BSES Rajdhani', callbackData: 'discom:BSES Rajdhani' },
              { text: 'BSES Yamuna', callbackData: 'discom:BSES Yamuna' },
              { text: 'Tata Power', callbackData: 'discom:Tata Power' },
              { text: 'Other', callbackData: 'discom:other' },
            ],
          },
        ],
      };
    },
    async onMessage(ctx, message) {
      const KNOWN_DISCOMS: Record<string, string> = {
        'bses rajdhani': 'BSES Rajdhani',
        'bses yamuna': 'BSES Yamuna',
        'tata power': 'Tata Power Delhi',
        'tata': 'Tata Power',
        'msedcl': 'MSEDCL',
        'bescom': 'BESCOM',
        'cesc': 'CESC',
        'tangedco': 'TANGEDCO',
        'uhbvn': 'UHBVN',
        'dhbvn': 'DHBVN',
        'pspcl': 'PSPCL',
        'jvvnl': 'JVVNL',
        'uppcl': 'UPPCL',
        'other': 'your DISCOM',
      };

      const DISCOM_BUTTONS = [
        { text: 'BSES Rajdhani', callbackData: 'discom:BSES Rajdhani' },
        { text: 'BSES Yamuna', callbackData: 'discom:BSES Yamuna' },
        { text: 'Tata Power', callbackData: 'discom:Tata Power' },
        { text: 'Other', callbackData: 'discom:other' },
      ];

      // 1. Handle DISCOM selection from button (prefixed callback)
      if (message.startsWith('discom:')) {
        const raw = message.replace('discom:', '').trim();
        const resolvedDiscom = KNOWN_DISCOMS[raw.toLowerCase()] || raw;
        return makeDiscomResponse(resolvedDiscom);
      }

      // 2. Handle typed DISCOM name (check known names before KB)
      const lower = message.trim().toLowerCase();
      if (KNOWN_DISCOMS[lower]) {
        return makeDiscomResponse(KNOWN_DISCOMS[lower]);
      }

      // 3. Check knowledge base for questions
      const kbAnswer = knowledgeBase.findAnswer(message);
      if (kbAnswer) {
        return {
          messages: [
            { text: kbAnswer },
            { text: 'Which DISCOM is in your area?', buttons: DISCOM_BUTTONS, delay: 300 },
          ],
        };
      }

      // 4. Default: treat unknown input as a DISCOM name
      return makeDiscomResponse(message.trim());

      function makeDiscomResponse(discom: string): AgentResponse {
        return {
          messages: [
            {
              text: `Got it — ${discom}!\n\nUpload your solar credential PDF from ${discom}.\n\nDon't have it? Download sample:\nhttps://open-vcs.up.railway.app`,
              buttons: [{ text: 'I have it', callbackData: 'ready' }],
            },
          ],
          newState: 'WAITING_VC_UPLOAD',
          contextUpdate: { discom, askedDiscom: true },
        };
      }
    },
  },

  WAITING_VC_UPLOAD: {
    async onEnter() {
      return {
        messages: [
          { text: 'Upload the PDF when ready. Ask me anything meanwhile!' },
        ],
      };
    },
    async onMessage(ctx, message, fileData) {
      if (!fileData) {
        const kbAnswer = knowledgeBase.findAnswer(message);
        if (kbAnswer) {
          return {
            messages: [
              { text: kbAnswer },
              { text: 'Upload your credential PDF when ready.', delay: 300 },
            ],
          };
        }

        const isQuestion = message.includes('?') || message.length > 15;
        if (isQuestion) {
          const llmAnswer = await askLLM(message, `User is uploading their solar credential from ${ctx.discom || 'their DISCOM'}.`);
          if (llmAnswer) {
            return {
              messages: [
                { text: llmAnswer },
                { text: 'Upload the PDF when ready.', delay: 300 },
              ],
            };
          }
        }

        return {
          messages: [{ text: 'Please upload your credential as a PDF file.' }],
        };
      }

      // Process the uploaded file
      try {
        const extraction = await extractVCFromPdf(fileData.buffer);

        if (!extraction.success || !extraction.credential) {
          return {
            messages: [{ text: 'Could not read this PDF. Please check and try again.' }],
          };
        }

        const credential = extraction.credential;
        const verificationResult = await verifyVCStructure(credential);
        const capacityKW = extractCapacity(credential as any);

        if (!capacityKW || capacityKW <= 0) {
          return {
            messages: [{ text: 'No valid capacity found in this document. Please try again.' }],
          };
        }

        const AVG_PEAK_SUN_HOURS = 4.5;
        const DAYS_PER_MONTH = 30;
        const monthlyKWh = Math.round(capacityKW * AVG_PEAK_SUN_HOURS * DAYS_PER_MONTH);

        const user = await prisma.user.findUnique({ where: { id: ctx.userId! } });
        const trustScore = user?.trustScore || 0.3;
        const allowedLimit = calculateAllowedLimit(trustScore);
        const tradeLimit = Math.round((monthlyKWh * allowedLimit) / 100);

        await prisma.user.update({
          where: { id: ctx.userId! },
          data: {
            productionCapacity: monthlyKWh,
            allowedTradeLimit: allowedLimit,
          },
        });

        return {
          messages: [],
          newState: 'VC_VERIFIED',
          contextUpdate: {
            vcVerified: true,
            productionCapacity: monthlyKWh,
            tradeLimit,
          },
        };
      } catch (error: any) {
        logger.error(`VC verification failed in chat: ${error.message}`);
        return {
          messages: [{ text: 'Something went wrong. Please try uploading again.' }],
        };
      }
    },
  },

  VC_VERIFIED: {
    async onEnter(ctx) {
      return {
        messages: [
          {
            text: `Verified! Your panel produces ~${ctx.productionCapacity} kWh/month. You can trade up to ${ctx.tradeLimit} kWh.\n\nShall I start selling your extra energy?`,
            buttons: [
              { text: 'Yes, start!', callbackData: 'yes' },
              { text: 'Not now', callbackData: 'no' },
            ],
          },
        ],
        newState: 'CONFIRM_TRADING',
      };
    },
    async onMessage() {
      return { messages: [], newState: 'CONFIRM_TRADING' };
    },
  },

  CONFIRM_TRADING: {
    async onEnter() {
      return { messages: [] };
    },
    async onMessage(ctx, message) {
      const lower = message.toLowerCase().trim();
      const isYes = ['yes', 'y', 'haan', 'ha', 'ok', 'sure', 'start', 'yes, start!'].includes(lower);
      const isNo = ['no', 'n', 'nahi', 'nope', 'not now', 'later', 'baad mein'].includes(lower);

      if (isYes) {
        await prisma.user.update({
          where: { id: ctx.userId! },
          data: { profileComplete: true },
        });

        const offerResult = await mockTradingAgent.createDefaultOffer(ctx.userId!);

        if (offerResult.success && offerResult.offer) {
          const o = offerResult.offer;
          return {
            messages: [
              { text: `Done! Your energy is now listed for sale:\n${o.quantity} kWh at Rs ${o.pricePerKwh}/unit, tomorrow 6AM-6PM.\n\nBuyers can now purchase your energy. I'll keep you updated!` },
            ],
            newState: 'GENERAL_CHAT',
            contextUpdate: { tradingActive: true },
          };
        }

        return {
          messages: [
            { text: 'Profile set up! You can create offers from the Sell tab.' },
          ],
          newState: 'GENERAL_CHAT',
          contextUpdate: { tradingActive: true },
        };
      }

      if (isNo) {
        await prisma.user.update({
          where: { id: ctx.userId! },
          data: { profileComplete: true },
        });

        return {
          messages: [
            { text: 'No problem. You can start selling anytime from the Sell tab or ask me here.' },
          ],
          newState: 'GENERAL_CHAT',
        };
      }

      // Not a clear yes/no
      const kbAnswer = knowledgeBase.findAnswer(message);
      if (kbAnswer) {
        return {
          messages: [
            { text: kbAnswer },
            {
              text: 'Start selling your energy?',
              buttons: [
                { text: 'Yes', callbackData: 'yes' },
                { text: 'No', callbackData: 'no' },
              ],
              delay: 300,
            },
          ],
        };
      }

      return {
        messages: [
          {
            text: 'Start selling?',
            buttons: [
              { text: 'Yes', callbackData: 'yes' },
              { text: 'No', callbackData: 'no' },
            ],
          },
        ],
      };
    },
  },

  TRADING_ACTIVE: {
    async onEnter() {
      return { messages: [], newState: 'GENERAL_CHAT' };
    },
    async onMessage() {
      return { messages: [], newState: 'GENERAL_CHAT' };
    },
  },

  GENERAL_CHAT: {
    async onEnter() {
      return { messages: [] };
    },
    async onMessage(ctx, message) {
      const lower = message.toLowerCase();

      // Dynamic queries — earnings
      if (lower.includes('earn') || lower.includes('kamaayi') || lower.includes('income') || lower.includes('how much did')) {
        if (ctx.userId) {
          const summary = await mockTradingAgent.getEarningsSummary(ctx.userId);
          return { messages: [{ text: summary }] };
        }
      }

      // Dynamic queries — balance
      if (lower.includes('balance') || lower.includes('wallet') || lower.includes('paisa')) {
        if (ctx.userId) {
          const user = await prisma.user.findUnique({
            where: { id: ctx.userId },
            select: { balance: true, name: true },
          });
          if (user) {
            return {
              messages: [{ text: `Your balance: Rs ${user.balance.toFixed(2)}` }],
            };
          }
        }
      }

      // Dynamic queries — orders
      if (lower.includes('order') || lower.includes('status') || lower.includes('trade')) {
        if (ctx.userId) {
          const summary = await mockTradingAgent.getOrdersSummary(ctx.userId);
          return { messages: [{ text: summary }] };
        }
      }

      // Dynamic queries — create new offer
      if (lower.includes('new offer') || lower.includes('create offer') || lower.includes('sell more') || lower.includes('naya offer')) {
        if (ctx.userId) {
          const result = await mockTradingAgent.createDefaultOffer(ctx.userId);
          if (result.success && result.offer) {
            return {
              messages: [
                { text: `New offer created: ${result.offer.quantity} kWh at Rs ${result.offer.pricePerKwh}/unit, tomorrow 6AM-6PM.` },
              ],
            };
          }
          return { messages: [{ text: result.error || 'Could not create offer. Try again.' }] };
        }
      }

      // Knowledge base
      const kbAnswer = knowledgeBase.findAnswer(message);
      if (kbAnswer) {
        return { messages: [{ text: kbAnswer }] };
      }

      // LLM fallback
      const llmAnswer = await askLLM(message, `User "${ctx.name || 'seller'}" on the Oorja P2P energy trading platform.`);
      if (llmAnswer) {
        return { messages: [{ text: llmAnswer }] };
      }

      // Last resort
      return {
        messages: [
          {
            text: 'I can help with:',
            buttons: [
              { text: 'My earnings', callbackData: 'how much did I earn' },
              { text: 'My balance', callbackData: 'what is my balance' },
              { text: 'My orders', callbackData: 'show my orders' },
              { text: 'New offer', callbackData: 'create new offer' },
            ],
          },
        ],
      };
    },
  },
};

// --- Translation helpers ---

async function translateResponse(
  response: AgentResponse,
  targetLang: SarvamLangCode
): Promise<AgentResponse> {
  if (targetLang === 'en-IN' || !isTranslationAvailable()) return response;

  const translatedMessages: AgentMessage[] = [];
  for (const msg of response.messages) {
    const translatedText = await translateFromEnglish(msg.text, targetLang);
    let translatedButtons = msg.buttons;
    if (msg.buttons && msg.buttons.length > 0) {
      translatedButtons = await Promise.all(
        msg.buttons.map(async (btn) => ({
          text: await translateFromEnglish(btn.text, targetLang),
          callbackData: btn.callbackData, // Keep English for matching
        }))
      );
    }
    translatedMessages.push({
      ...msg,
      text: translatedText,
      buttons: translatedButtons,
    });
  }

  return { ...response, messages: translatedMessages };
}

// --- Main Entry Point ---

export async function processMessage(
  platform: 'TELEGRAM' | 'WEB',
  platformId: string,
  userMessage: string,
  fileData?: FileData
): Promise<AgentResponse> {
  // Find or create session
  let session = await prisma.chatSession.findUnique({
    where: { platform_platformId: { platform, platformId } },
  });

  if (!session) {
    session = await prisma.chatSession.create({
      data: { platform, platformId, state: 'GREETING', contextJson: '{}' },
    });

    // Detect language from first message
    const detectedLang = detectLanguage(userMessage);

    // Store user message
    await storeMessage(session.id, 'user', userMessage);

    // Translate user message to English if needed
    let processedMessage = userMessage;
    if (detectedLang !== 'en-IN') {
      processedMessage = await translateToEnglish(userMessage, detectedLang);
      logger.info(`Language detected: ${detectedLang}, translated input: "${processedMessage}"`);
    }

    // Run GREETING onEnter + onMessage
    const ctx: SessionContext = { language: detectedLang };
    const enterResp = await states.GREETING.onEnter(ctx);
    await storeAgentMessages(session.id, enterResp.messages);

    const msgResp = await states.GREETING.onMessage(ctx, processedMessage, fileData);

    if (msgResp.newState) {
      const effectiveLang = (msgResp.contextUpdate?.language as SarvamLangCode) || detectedLang;
      const newCtx = { ...ctx, ...msgResp.contextUpdate, language: effectiveLang };
      await transitionState(session.id, msgResp.newState, { ...msgResp.contextUpdate, language: effectiveLang });
      const newEnter = await states[msgResp.newState as ChatState].onEnter(newCtx);
      await storeAgentMessages(session.id, newEnter.messages);

      // Handle auto-transitions from onEnter (e.g., OTP_VERIFIED → EXPLAIN_VC)
      let allMessages = [...enterResp.messages, ...msgResp.messages, ...newEnter.messages];
      let currentState = msgResp.newState as ChatState;
      let currentCtx = { ...newCtx, ...newEnter.contextUpdate };
      let authToken = msgResp.authToken || newEnter.authToken;

      while (newEnter.newState && newEnter.newState !== currentState) {
        await transitionState(session.id, newEnter.newState, newEnter.contextUpdate);
        currentState = newEnter.newState as ChatState;
        currentCtx = { ...currentCtx, ...newEnter.contextUpdate };
        const nextEnter = await states[currentState].onEnter(currentCtx);
        await storeAgentMessages(session.id, nextEnter.messages);
        allMessages = [...allMessages, ...nextEnter.messages];
        authToken = authToken || nextEnter.authToken;
        if (!nextEnter.newState || nextEnter.newState === currentState) break;
        Object.assign(newEnter, nextEnter);
      }

      const result: AgentResponse = { messages: allMessages, authToken };
      return translateResponse(result, effectiveLang);
    }

    // No state transition — just show enter messages + onMessage messages
    const allMessages = [...enterResp.messages, ...msgResp.messages];
    await storeAgentMessages(session.id, msgResp.messages);
    if (msgResp.contextUpdate) {
      const merged = { ...ctx, ...msgResp.contextUpdate };
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { contextJson: JSON.stringify(merged) },
      });
    }
    const effectiveLang = (msgResp.contextUpdate?.language as SarvamLangCode) || detectedLang;
    return translateResponse({ messages: allMessages }, effectiveLang);
  }

  // Existing session
  await storeMessage(session.id, 'user', userMessage);
  const ctx = JSON.parse(session.contextJson) as SessionContext;
  const currentState = session.state as ChatState;
  const stateHandler = states[currentState];

  if (!stateHandler) {
    logger.error(`Unknown state: ${currentState}`);
    return { messages: [{ text: 'Something went wrong. Please try again.' }] };
  }

  // Detect/update language from user input
  const detectedLang = detectLanguage(userMessage);
  const userLang: SarvamLangCode = (detectedLang !== 'en-IN')
    ? detectedLang
    : (ctx.language || 'en-IN');

  // Translate user message to English if needed (skip for pure numbers, short button callbacks)
  let processedMessage = userMessage;
  const isStructuredInput = /^\d+$/.test(userMessage.trim()) || userMessage.trim().length <= 3;
  if (detectedLang !== 'en-IN' && !isStructuredInput) {
    processedMessage = await translateToEnglish(userMessage, detectedLang);
    logger.info(`Translated [${detectedLang} → en-IN]: "${userMessage}" → "${processedMessage}"`);
  }

  // Update language in context if changed
  if (userLang !== ctx.language) {
    ctx.language = userLang;
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { contextJson: JSON.stringify(ctx) },
    });
  }

  const response = await stateHandler.onMessage(ctx, processedMessage, fileData);
  await storeAgentMessages(session.id, response.messages);

  // Handle state transition
  if (response.newState && response.newState !== currentState) {
    const mergedCtx = { ...ctx, ...response.contextUpdate };
    await transitionState(session.id, response.newState, response.contextUpdate);

    const enterResp = await states[response.newState as ChatState].onEnter(mergedCtx);
    await storeAgentMessages(session.id, enterResp.messages);

    let allMessages = [...response.messages, ...enterResp.messages];
    let chainState = response.newState as ChatState;
    let chainCtx = { ...mergedCtx, ...enterResp.contextUpdate };
    let authToken = response.authToken || enterResp.authToken;

    // Follow auto-transition chains
    let nextResp = enterResp;
    while (nextResp.newState && nextResp.newState !== chainState) {
      await transitionState(session.id, nextResp.newState, nextResp.contextUpdate);
      chainState = nextResp.newState as ChatState;
      chainCtx = { ...chainCtx, ...nextResp.contextUpdate };
      nextResp = await states[chainState].onEnter(chainCtx);
      await storeAgentMessages(session.id, nextResp.messages);
      allMessages = [...allMessages, ...nextResp.messages];
      authToken = authToken || nextResp.authToken;
    }

    // Use language from contextUpdate if the user just selected it
    const effectiveLang = (response.contextUpdate?.language as SarvamLangCode) || userLang;
    return translateResponse({ messages: allMessages, authToken }, effectiveLang);
  }

  // No state transition — just update context if needed
  if (response.contextUpdate) {
    const merged = { ...ctx, ...response.contextUpdate };
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { contextJson: JSON.stringify(merged) },
    });
  }

  const effectiveLang = (response.contextUpdate?.language as SarvamLangCode) || userLang;
  return translateResponse(response, effectiveLang);
}

// --- Helpers ---

async function transitionState(
  sessionId: string,
  newState: string,
  contextUpdate?: Partial<SessionContext>
) {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const currentCtx = JSON.parse(session.contextJson);
  const merged = { ...currentCtx, ...contextUpdate };

  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      state: newState as any,
      contextJson: JSON.stringify(merged),
      ...(contextUpdate?.userId ? { userId: contextUpdate.userId } : {}),
      ...(contextUpdate?.authToken ? { authToken: contextUpdate.authToken } : {}),
    },
  });
}

async function storeMessage(sessionId: string, role: string, content: string, metadata?: any) {
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role,
      content,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

async function storeAgentMessages(sessionId: string, messages: AgentMessage[]) {
  for (const msg of messages) {
    await storeMessage(
      sessionId,
      'agent',
      msg.text,
      msg.buttons ? { buttons: msg.buttons } : undefined
    );
  }
}

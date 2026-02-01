/**
 * Oorja Agent — Core conversational state machine.
 * Handles onboarding (OTP → VC → trading) and general Q&A.
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

const states: Record<ChatState, StateHandler> = {
  GREETING: {
    async onEnter() {
      return {
        messages: [
          {
            text: 'Namaste! I am Oorja, your energy trading helper.\n\nI will help you sell your extra solar energy to your neighbors and earn money.',
          },
          {
            text: 'Which language would you like to chat in?',
            buttons: [
              { text: 'English', callbackData: 'lang:en-IN' },
              { text: 'हिंदी', callbackData: 'lang:hi-IN' },
              { text: 'বাংলা', callbackData: 'lang:bn-IN' },
              { text: 'தமிழ்', callbackData: 'lang:ta-IN' },
              { text: 'తెలుగు', callbackData: 'lang:te-IN' },
              { text: 'ಕನ್ನಡ', callbackData: 'lang:kn-IN' },
            ],
            delay: 500,
          },
        ],
      };
    },
    async onMessage(_ctx, message) {
      // Handle language selection from button
      if (message.startsWith('lang:')) {
        const lang = message.replace('lang:', '') as SarvamLangCode;
        return {
          messages: [],
          newState: 'WAITING_PHONE',
          contextUpdate: { language: lang },
        };
      }
      // Free-text reply — detect language from script, stay in GREETING if ambiguous
      const detected = detectLanguage(message);
      if (detected !== 'en-IN') {
        return {
          messages: [],
          newState: 'WAITING_PHONE',
          contextUpdate: { language: detected },
        };
      }
      // English text or "hi" — no language detected, stay in GREETING to let user pick
      return { messages: [] };
    },
  },

  WAITING_PHONE: {
    async onEnter() {
      return {
        messages: [
          {
            text: 'Great! Let us begin.\n\nPlease share your phone number (the one linked to your electricity meter).\nFor example: 9876543210',
          },
        ],
      };
    },
    async onMessage(ctx, message) {
      const phone = message.trim().replace(/[\s\-()]/g, '');

      if (!validatePhoneNumber(phone)) {
        return {
          messages: [
            {
              text: 'That does not look like a valid phone number. Please enter a 10-digit phone number.\nFor example: 9876543210',
            },
          ],
        };
      }

      const normalized = normalizePhone(phone);
      const result = await sendOtp(normalized);

      if (!result.success) {
        return {
          messages: [{ text: `Could not send OTP: ${result.message}. Please try again.` }],
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
          {
            text: `I have sent a verification code to ${ctx.phone}.\n\nPlease enter the 6-digit code you received.`,
          },
        ],
      };
    },
    async onMessage(ctx, message) {
      const otp = message.trim().replace(/\s/g, '');
      const attempts = (ctx.otpAttempts || 0) + 1;

      if (!/^\d{4,6}$/.test(otp)) {
        return {
          messages: [{ text: 'Please enter the 6-digit verification code. Only numbers.' }],
          contextUpdate: { otpAttempts: attempts },
        };
      }

      const result = await verifyOtpAndAuthenticate(ctx.phone!, otp, ctx.name);

      if (!result.success) {
        if (attempts >= 3) {
          return {
            messages: [{ text: 'Too many wrong attempts. Let us try again with your phone number.' }],
            newState: 'WAITING_PHONE',
            contextUpdate: { otpAttempts: 0 },
          };
        }
        return {
          messages: [
            { text: `That code is not correct. You have ${3 - attempts} attempt(s) left. Please try again.` },
          ],
          contextUpdate: { otpAttempts: attempts },
        };
      }

      // Create session token for the agent
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
        };
      }

      // Existing user — check if already onboarded
      if (result.user?.profileComplete) {
        return {
          messages: [
            { text: `Welcome back, ${result.user.name || 'friend'}! Your account is already set up.` },
          ],
          newState: 'GENERAL_CHAT',
          contextUpdate: {
            userId: result.userId,
            authToken: authSession.token,
            name: result.user.name || undefined,
            otpAttempts: 0,
          },
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
      };
    },
  },

  WAITING_NAME: {
    async onEnter() {
      return {
        messages: [
          { text: 'Welcome! Since this is your first time, please tell me your name.' },
        ],
      };
    },
    async onMessage(ctx, message) {
      const name = message.trim();
      if (name.length < 2) {
        return {
          messages: [{ text: 'Please enter your full name (at least 2 characters).' }],
        };
      }

      // Update user name in DB
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
      return {
        messages: [
          {
            text: `Verified! Welcome, ${ctx.name || 'friend'}!\n\nNow I need to verify your solar panel credentials so we can calculate how much energy you can sell.`,
          },
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
              text: `To start selling energy, I need your Generation Profile Credential. Think of it as an ID card for your solar panel.\n\nYour ${ctx.discom} office should have given you this document as a PDF. If you do not have it yet, you can download a sample here:\nhttps://open-vcs.up.railway.app`,
            },
            {
              text: 'Please upload the PDF document here.',
              buttons: [{ text: 'I have it ready', callbackData: 'ready' }],
              delay: 500,
            },
          ],
          newState: 'WAITING_VC_UPLOAD',
        };
      }

      // First ask which DISCOM the user belongs to
      return {
        messages: [
          {
            text: 'Before we set up trading, I need to verify your solar panel details.\n\nWhich electricity company (DISCOM) provides power in your area?',
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
      // Common DISCOM names mapping
      const KNOWN_DISCOMS: Record<string, string> = {
        'bses rajdhani': 'BSES Rajdhani',
        'bses yamuna': 'BSES Yamuna',
        'tata power': 'Tata Power Delhi',
        'tata': 'Tata Power',
        'msedcl': 'MSEDCL (Maharashtra)',
        'bescom': 'BESCOM (Karnataka)',
        'cesc': 'CESC (Kolkata)',
        'tangedco': 'TANGEDCO (Tamil Nadu)',
        'uhbvn': 'UHBVN (Haryana)',
        'dhbvn': 'DHBVN (Haryana)',
        'pspcl': 'PSPCL (Punjab)',
        'jvvnl': 'JVVNL (Rajasthan)',
        'uppcl': 'UPPCL (UP)',
        'other': 'your local DISCOM',
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
            {
              text: 'Which DISCOM provides electricity in your area?',
              buttons: DISCOM_BUTTONS,
              delay: 300,
            },
          ],
        };
      }

      // 4. Default: treat unknown input as a DISCOM name
      return makeDiscomResponse(message.trim());

      function makeDiscomResponse(discom: string): AgentResponse {
        return {
          messages: [
            {
              text: `Got it — ${discom}!\n\nTo sell energy on our platform, you need a Generation Profile Credential from ${discom}. This is a digital certificate that proves you own a solar panel and how much energy it can produce.\n\nYou can get this document from your ${discom} office. If you do not have it yet, you can download a sample from:\nhttps://open-vcs.up.railway.app`,
            },
            {
              text: 'Please upload the PDF document whenever you have it ready.',
              buttons: [{ text: 'I have it ready', callbackData: 'ready' }],
              delay: 500,
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
          { text: 'Go ahead and upload the PDF whenever you are ready. If you have any questions about the process, just ask!' },
        ],
      };
    },
    async onMessage(ctx, message, fileData) {
      if (!fileData) {
        // Try knowledge base first
        const kbAnswer = knowledgeBase.findAnswer(message);
        if (kbAnswer) {
          return {
            messages: [
              { text: kbAnswer },
              { text: 'Please upload your credential PDF whenever you are ready.', delay: 300 },
            ],
          };
        }

        // Try LLM fallback for questions
        const isQuestion = message.includes('?') || message.length > 15;
        if (isQuestion) {
          const llmAnswer = await askLLM(message, `User is uploading their Generation Profile credential from ${ctx.discom || 'their DISCOM'}. They may have questions about the process.`);
          if (llmAnswer) {
            return {
              messages: [
                { text: llmAnswer },
                { text: 'Whenever you are ready, just upload the PDF.', delay: 300 },
              ],
            };
          }
        }

        return {
          messages: [{ text: 'I am waiting for your PDF document. Please upload it as a file attachment.\n\nIf you have any questions, feel free to ask!' }],
        };
      }

      // Process the uploaded file
      try {
        const extraction = await extractVCFromPdf(fileData.buffer);

        if (!extraction.success || !extraction.credential) {
          return {
            messages: [
              {
                text: 'I could not read the credential from this PDF. Please make sure it is the correct document and try again.',
              },
            ],
          };
        }

        // Verify the credential structure
        const credential = extraction.credential;
        const verificationResult = await verifyVCStructure(credential);

        // Extract capacity
        const capacityKW = extractCapacity(credential as any);

        if (!capacityKW || capacityKW <= 0) {
          return {
            messages: [
              {
                text: 'I could not find a valid production capacity in this document. Please check the file and try again.',
              },
            ],
          };
        }

        const AVG_PEAK_SUN_HOURS = 4.5;
        const DAYS_PER_MONTH = 30;
        const monthlyKWh = Math.round(capacityKW * AVG_PEAK_SUN_HOURS * DAYS_PER_MONTH);

        // Update user in DB
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
          messages: [
            { text: 'Something went wrong while verifying your document. Please try uploading again.' },
          ],
        };
      }
    },
  },

  VC_VERIFIED: {
    async onEnter(ctx) {
      return {
        messages: [
          {
            text: `Excellent! Your credentials are verified!\n\nHere is what I found:\n- Monthly Production: ${ctx.productionCapacity} kWh\n- Trade Limit: ${ctx.tradeLimit} kWh\n\nWould you like me to start trading your extra energy from tomorrow? I will create a sell offer at a fair market rate.`,
            buttons: [
              { text: 'Yes, start trading!', callbackData: 'yes' },
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
      const isYes = ['yes', 'y', 'haan', 'ha', 'ok', 'sure', 'start', 'yes, start trading!'].includes(lower);
      const isNo = ['no', 'n', 'nahi', 'nope', 'not now', 'later', 'baad mein'].includes(lower);

      if (isYes) {
        // Set profileComplete and create offer
        await prisma.user.update({
          where: { id: ctx.userId! },
          data: { profileComplete: true },
        });

        const offerResult = await mockTradingAgent.createDefaultOffer(ctx.userId!);

        if (offerResult.success && offerResult.offer) {
          const o = offerResult.offer;
          return {
            messages: [
              {
                text: `Setting up your seller profile and creating your first offer...\n\nDone! Here is what I set up:\n- Offer: ${o.quantity} kWh at Rs ${o.pricePerKwh}/kWh\n- Available: Tomorrow 6:00 AM to 6:00 PM\n\nYour offer is now live! Buyers can see it and purchase your energy.\n\nI will keep you updated on any orders. You can ask me anything about trading anytime.`,
              },
            ],
            newState: 'GENERAL_CHAT',
            contextUpdate: { tradingActive: true },
          };
        }

        return {
          messages: [
            {
              text: 'Your profile is set up! I had a small issue creating the first offer, but you can create one from the Sell tab in the app.\n\nYou can ask me anything about trading anytime.',
            },
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
            {
              text: 'No problem! Your credentials are verified and your profile is ready. You can start trading anytime from the Sell tab or just ask me here.\n\nFeel free to ask me any questions about energy trading!',
            },
          ],
          newState: 'GENERAL_CHAT',
        };
      }

      // Not a clear yes/no — ask again
      const kbAnswer = knowledgeBase.findAnswer(message);
      if (kbAnswer) {
        return {
          messages: [
            { text: kbAnswer },
            {
              text: 'So, would you like me to start trading for you?',
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
            text: 'Please reply "yes" to start trading or "no" to skip for now.',
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
              messages: [
                { text: `Your wallet balance is Rs ${user.balance.toFixed(2)}, ${user.name || 'friend'}.` },
              ],
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
                {
                  text: `Done! I created a new sell offer:\n- ${result.offer.quantity} kWh at Rs ${result.offer.pricePerKwh}/kWh\n- Available tomorrow 6 AM to 6 PM`,
                },
              ],
            };
          }
          return { messages: [{ text: result.error || 'Could not create offer right now. Please try again.' }] };
        }
      }

      // Knowledge base
      const kbAnswer = knowledgeBase.findAnswer(message);
      if (kbAnswer) {
        return { messages: [{ text: kbAnswer }] };
      }

      // LLM fallback — handles arbitrary questions naturally
      const llmAnswer = await askLLM(message, `User "${ctx.name || 'seller'}" is an active seller on the Oorja P2P energy trading platform.`);
      if (llmAnswer) {
        return { messages: [{ text: llmAnswer }] };
      }

      // Last resort fallback
      return {
        messages: [
          {
            text: 'I can help you with:\n- "How much did I earn?" — Check earnings\n- "What is my balance?" — Check wallet\n- "Show my orders" — See recent orders\n- "Create new offer" — List energy for sale\n- "What is P2P trading?" — Learn about trading',
            buttons: [
              { text: 'My earnings', callbackData: 'how much did I earn' },
              { text: 'My balance', callbackData: 'what is my balance' },
              { text: 'My orders', callbackData: 'show my orders' },
            ],
          },
        ],
      };
    },
  },
};

// --- Translation helpers ---

/**
 * Translate all agent message texts (and button labels) to the target language.
 * Preserves callbackData in English for state machine matching.
 */
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

      while (newEnter.newState && newEnter.newState !== currentState) {
        await transitionState(session.id, newEnter.newState, newEnter.contextUpdate);
        currentState = newEnter.newState as ChatState;
        currentCtx = { ...currentCtx, ...newEnter.contextUpdate };
        const nextEnter = await states[currentState].onEnter(currentCtx);
        await storeAgentMessages(session.id, nextEnter.messages);
        allMessages = [...allMessages, ...nextEnter.messages];
        if (!nextEnter.newState || nextEnter.newState === currentState) break;
        // Continue chain
        Object.assign(newEnter, nextEnter);
      }

      const result: AgentResponse = { messages: allMessages };
      return translateResponse(result, effectiveLang);
    }

    return translateResponse({ messages: enterResp.messages }, detectedLang);
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

    // Follow auto-transition chains
    let nextResp = enterResp;
    while (nextResp.newState && nextResp.newState !== chainState) {
      await transitionState(session.id, nextResp.newState, nextResp.contextUpdate);
      chainState = nextResp.newState as ChatState;
      chainCtx = { ...chainCtx, ...nextResp.contextUpdate };
      nextResp = await states[chainState].onEnter(chainCtx);
      await storeAgentMessages(session.id, nextResp.messages);
      allMessages = [...allMessages, ...nextResp.messages];
    }

    // Use language from contextUpdate if the user just selected it
    const effectiveLang = (response.contextUpdate?.language as SarvamLangCode) || userLang;
    return translateResponse({ messages: allMessages }, effectiveLang);
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

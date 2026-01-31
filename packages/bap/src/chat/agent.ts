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
            text: 'Namaste! I am Oorja, your energy trading helper.\n\nI will help you sell your extra solar energy to your neighbors and earn money. It is very simple!',
          },
          {
            text: 'Shall we start setting up your account? Just reply with anything to begin.',
            buttons: [{ text: 'Yes, let us start!', callbackData: 'yes' }],
            delay: 500,
          },
        ],
      };
    },
    async onMessage() {
      return { messages: [], newState: 'WAITING_PHONE' };
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
    async onEnter() {
      return {
        messages: [
          {
            text: 'To trade energy, you need a Generation Profile Credential — it is like an ID card for your solar panel.\n\nYour DISCOM office should have given you a PDF document. If you do not have it, you can download a sample from:\nhttps://open-vcs.up.railway.app',
          },
          {
            text: 'Please upload that PDF document here. You can send it as a file attachment.',
            buttons: [{ text: 'I have it ready', callbackData: 'ready' }],
            delay: 500,
          },
        ],
      };
    },
    async onMessage(ctx, message) {
      // Check if it is a question
      const kbAnswer = knowledgeBase.findAnswer(message);
      if (kbAnswer) {
        return {
          messages: [
            { text: kbAnswer },
            { text: 'Whenever you are ready, please upload your credential PDF.', delay: 300 },
          ],
        };
      }
      return {
        messages: [],
        newState: 'WAITING_VC_UPLOAD',
      };
    },
  },

  WAITING_VC_UPLOAD: {
    async onEnter() {
      return {
        messages: [
          { text: 'I am waiting for your credential PDF. Please upload it whenever you are ready.\n\nIf you have any questions, just ask!' },
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
              { text: 'Please upload your credential PDF whenever you are ready.', delay: 300 },
            ],
          };
        }
        return {
          messages: [{ text: 'I am waiting for your PDF document. Please upload it as a file.' }],
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

      // Dynamic queries
      if (lower.includes('earn') || lower.includes('kamaayi') || lower.includes('income') || lower.includes('how much did')) {
        if (ctx.userId) {
          const summary = await mockTradingAgent.getEarningsSummary(ctx.userId);
          return { messages: [{ text: summary }] };
        }
      }

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

      if (lower.includes('order') || lower.includes('status') || lower.includes('trade')) {
        if (ctx.userId) {
          const summary = await mockTradingAgent.getOrdersSummary(ctx.userId);
          return { messages: [{ text: summary }] };
        }
      }

      // Knowledge base
      const kbAnswer = knowledgeBase.findAnswer(message);
      if (kbAnswer) {
        return { messages: [{ text: kbAnswer }] };
      }

      // Fallback
      return {
        messages: [
          {
            text: 'I am not sure about that. Here are some things I can help with:\n- "How much did I earn?" — Check earnings\n- "What is my balance?" — Check wallet\n- "Show my orders" — See recent orders\n- "What is P2P trading?" — Learn about trading\n- "Help" — See all options',
          },
        ],
      };
    },
  },
};

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

    // Store user message
    await storeMessage(session.id, 'user', userMessage);

    // Run GREETING onEnter + onMessage
    const ctx = {} as SessionContext;
    const enterResp = await states.GREETING.onEnter(ctx);
    await storeAgentMessages(session.id, enterResp.messages);

    const msgResp = await states.GREETING.onMessage(ctx, userMessage, fileData);

    if (msgResp.newState) {
      const newCtx = { ...ctx, ...msgResp.contextUpdate };
      await transitionState(session.id, msgResp.newState, msgResp.contextUpdate);
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

      return { messages: allMessages };
    }

    return { messages: enterResp.messages };
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

  const response = await stateHandler.onMessage(ctx, userMessage, fileData);
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

    return { messages: allMessages };
  }

  // No state transition — just update context if needed
  if (response.contextUpdate) {
    const merged = { ...ctx, ...response.contextUpdate };
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { contextJson: JSON.stringify(merged) },
    });
  }

  return response;
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

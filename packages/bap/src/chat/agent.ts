/**
 * Oorja Agent — Core conversational state machine.
 * Flow: Name → Phone → OTP → Utility Cred (mandatory) → Optional Creds → Trading → Chat
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
  extractNormalizedGenerationClaims,
  extractNormalizedUtilityCustomerClaims,
  extractNormalizedConsumptionProfileClaims,
  extractNormalizedStorageProfileClaims,
  extractNormalizedProgramEnrollmentClaims,
  getIssuerId,
} from '@p2p/shared';
import { knowledgeBase } from './knowledge-base';
import { mockTradingAgent, parseTimePeriod } from './trading-agent';
import { askLLM, classifyIntent, composeResponse } from './llm-fallback';
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
  authToken?: string;
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
  language?: SarvamLangCode | 'hinglish';
  intent?: 'sell' | 'buy' | 'learn';
  langPicked?: boolean;
  expectedCredType?: string;
  verifiedCreds?: string[];
}

type ChatState =
  | 'GREETING'
  | 'WAITING_NAME'
  | 'WAITING_PHONE'
  | 'WAITING_OTP'
  | 'AUTHENTICATED'
  | 'ASK_DISCOM'
  | 'WAITING_UTILITY_CRED'
  | 'ASK_INTENT'
  | 'OFFER_OPTIONAL_CREDS'
  | 'WAITING_OPTIONAL_CRED'
  | 'CONFIRM_TRADING'
  | 'GENERAL_CHAT'
  // Legacy states (kept for backward compat with existing sessions)
  | 'OTP_VERIFIED'
  | 'EXPLAIN_VC'
  | 'WAITING_VC_UPLOAD'
  | 'VC_VERIFIED'
  | 'TRADING_ACTIVE';

interface StateHandler {
  onEnter: (ctx: SessionContext) => Promise<AgentResponse>;
  onMessage: (ctx: SessionContext, message: string, fileData?: FileData) => Promise<AgentResponse>;
}

// --- Credential mapping ---

const CRED_DISPLAY_NAMES: Record<string, string> = {
  UtilityCustomerCredential: 'Utility Customer',
  GenerationProfileCredential: 'Generation Profile (Solar)',
  ConsumptionProfileCredential: 'Consumption Profile',
  StorageProfileCredential: 'Storage Profile (Battery)',
  UtilityProgramEnrollmentCredential: 'Program Enrollment',
};

// --- Credential processing helper ---

async function processCredentialUpload(
  userId: string,
  fileData: FileData,
  expectedType?: string
): Promise<{ success: boolean; credType: string; summary: string; error?: string }> {
  let credential: any;

  if (fileData.mimeType === 'application/json') {
    try {
      credential = JSON.parse(fileData.buffer.toString('utf-8'));
    } catch {
      return { success: false, credType: '', summary: '', error: 'Could not read this JSON file. Please check and try again.' };
    }
  } else {
    const extraction = await extractVCFromPdf(fileData.buffer);
    if (!extraction.success || !extraction.credential) {
      return { success: false, credType: '', summary: '', error: 'Could not read this PDF. Please check and try again.' };
    }
    credential = extraction.credential;
  }

  // Detect type
  const detectedType = detectCredentialType(credential);
  if (!detectedType) {
    return { success: false, credType: '', summary: '', error: 'This does not look like a valid credential. Please upload a Beckn DEG credential (PDF or JSON).' };
  }

  // Check expected type
  if (expectedType && detectedType !== expectedType) {
    const expectedName = CRED_DISPLAY_NAMES[expectedType] || expectedType;
    const actualName = CRED_DISPLAY_NAMES[detectedType] || detectedType;
    return {
      success: false,
      credType: detectedType,
      summary: '',
      error: `This is a ${actualName} credential, but I need a ${expectedName} credential. Please upload the right one.`,
    };
  }

  // Verify structure
  await verifyVCStructure(credential);

  // Extract claims based on type
  let claims: any = {};
  let summary = '';
  const dbCredType = degTypeToDbType(detectedType);

  switch (detectedType) {
    case 'UtilityCustomerCredential': {
      claims = extractNormalizedUtilityCustomerClaims(credential);
      summary = `Consumer: ${claims.consumerNumber || 'N/A'}, Meter: ${claims.meterNumber || 'N/A'}`;
      if (claims.fullName) summary = `${claims.fullName} — ${summary}`;
      break;
    }
    case 'GenerationProfileCredential': {
      claims = extractNormalizedGenerationClaims(credential);
      const kw = claims.capacityKW || extractCapacity(credential);
      summary = `${kw || '?'} kW ${claims.sourceType || 'Solar'}`;
      if (claims.fullName) summary = `${claims.fullName} — ${summary}`;
      break;
    }
    case 'ConsumptionProfileCredential': {
      claims = extractNormalizedConsumptionProfileClaims(credential);
      summary = `Load: ${claims.sanctionedLoadKW || '?'} kW, Type: ${claims.premisesType || claims.connectionType || 'N/A'}`;
      break;
    }
    case 'StorageProfileCredential': {
      claims = extractNormalizedStorageProfileClaims(credential);
      summary = `${claims.storageCapacityKWh || '?'} kWh ${claims.storageType || 'Battery'}`;
      break;
    }
    case 'UtilityProgramEnrollmentCredential': {
      claims = extractNormalizedProgramEnrollmentClaims(credential);
      summary = `Program: ${claims.programName || claims.programCode || 'N/A'}`;
      break;
    }
  }

  // Upsert into userCredential table
  await prisma.userCredential.upsert({
    where: {
      userId_credentialType: {
        userId,
        credentialType: dbCredType,
      },
    },
    create: {
      userId,
      credentialType: dbCredType,
      rawJson: JSON.stringify(credential),
      verified: true,
      verifiedAt: new Date(),
      extractedClaims: JSON.stringify(claims),
      issuerId: claims.issuer || getIssuerId(credential.issuer),
    },
    update: {
      rawJson: JSON.stringify(credential),
      verified: true,
      verifiedAt: new Date(),
      extractedClaims: JSON.stringify(claims),
      issuerId: claims.issuer || getIssuerId(credential.issuer),
    },
  });

  // Update user fields based on credential type
  if (detectedType === 'GenerationProfileCredential') {
    const capacityKW = claims.capacityKW || extractCapacity(credential);
    if (capacityKW && capacityKW > 0) {
      const AVG_PEAK_SUN_HOURS = 4.5;
      const DAYS_PER_MONTH = 30;
      const monthlyKWh = Math.round(capacityKW * AVG_PEAK_SUN_HOURS * DAYS_PER_MONTH);
      await prisma.user.update({
        where: { id: userId },
        data: { productionCapacity: monthlyKWh },
      });
    }
  }

  return { success: true, credType: detectedType, summary };
}

function degTypeToDbType(degType: string): any {
  const map: Record<string, string> = {
    UtilityCustomerCredential: 'UTILITY_CUSTOMER',
    GenerationProfileCredential: 'GENERATION_PROFILE',
    ConsumptionProfileCredential: 'CONSUMPTION_PROFILE',
    StorageProfileCredential: 'STORAGE_PROFILE',
    UtilityProgramEnrollmentCredential: 'PROGRAM_ENROLLMENT',
  };
  return map[degType] || 'UTILITY_CUSTOMER';
}

async function getVerifiedCredentials(userId: string): Promise<string[]> {
  const creds = await prisma.userCredential.findMany({
    where: { userId, verified: true },
    select: { credentialType: true },
  });
  return creds.map((c) => c.credentialType);
}

// --- Hinglish helper ---
// Returns Hinglish text when language is 'hinglish', otherwise English
function h(ctx: SessionContext, en: string, hi: string): string {
  return ctx.language === 'hinglish' ? hi : en;
}

// --- State Handlers ---

const LANG_BUTTONS = [
  { text: 'English', callbackData: 'lang:en-IN' },
  { text: 'हिंदी', callbackData: 'lang:hi-IN' },
  { text: 'Hinglish', callbackData: 'lang:hinglish' },
  { text: 'বাংলা', callbackData: 'lang:bn-IN' },
  { text: 'தமிழ்', callbackData: 'lang:ta-IN' },
  { text: 'తెలుగు', callbackData: 'lang:te-IN' },
  { text: 'ಕನ್ನಡ', callbackData: 'lang:kn-IN' },
];

const DISCOM_LIST = [
  { text: 'BSES Rajdhani', callbackData: 'discom:bses_rajdhani' },
  { text: 'BSES Yamuna', callbackData: 'discom:bses_yamuna' },
  { text: 'Tata Power Delhi', callbackData: 'discom:tata_power_delhi' },
  { text: 'BESCOM (Bangalore)', callbackData: 'discom:bescom' },
  { text: 'MSEDCL (Maharashtra)', callbackData: 'discom:msedcl' },
  { text: 'UPPCL (UP)', callbackData: 'discom:uppcl' },
  { text: 'TANGEDCO (TN)', callbackData: 'discom:tangedco' },
  { text: 'WBSEDCL (WB)', callbackData: 'discom:wbsedcl' },
  { text: 'Other', callbackData: 'discom:other' },
];

const DISCOM_CRED_LINKS: Record<string, string> = {
  bses_rajdhani: 'https://creds.bsesdelhi.com/rajdhani',
  bses_yamuna: 'https://creds.bsesdelhi.com/yamuna',
  tata_power_delhi: 'https://creds.tatapower.com/delhi',
  bescom: 'https://creds.bescom.karnataka.gov.in',
  msedcl: 'https://creds.mahadiscom.in/credentials',
  uppcl: 'https://creds.uppcl.org',
  tangedco: 'https://creds.tangedco.tn.gov.in',
  wbsedcl: 'https://creds.wbsedcl.in',
  other: 'https://open-vcs.up.railway.app',
};

const CRED_FARMER_NAMES: Record<string, { en: string; hi: string }> = {
  GenerationProfileCredential: { en: 'solar generation ID', hi: 'solar ka ID' },
  ConsumptionProfileCredential: { en: 'electricity consumption ID', hi: 'bijli consumption ka ID' },
  StorageProfileCredential: { en: 'battery storage ID', hi: 'battery ka ID' },
  UtilityProgramEnrollmentCredential: { en: 'program enrollment ID', hi: 'program ka ID' },
};

const states: Record<ChatState, StateHandler> = {
  GREETING: {
    async onEnter() {
      return {
        messages: [
          { text: 'Namaste! Main Oorja hun.\nMain aapko apne ghar pe banai bijli se paise kamane mein madad karunga. Aur jinhe bijli khareedni hai, unhe sahi daam pe dilaunga.' },
          {
            text: 'Apni bhasha chune / Choose your language:',
            buttons: LANG_BUTTONS,
            delay: 300,
          },
        ],
      };
    },
    async onMessage(ctx, message) {
      // Language selection from button
      if (message.startsWith('lang:')) {
        const lang = message.replace('lang:', '');
        return {
          messages: [],
          newState: 'WAITING_NAME',
          contextUpdate: { language: lang as any, langPicked: true },
        };
      }

      // Free-text — show language picker again (don't auto-transition)
      return {
        messages: [
          {
            text: 'Apni bhasha chune / Choose your language:',
            buttons: LANG_BUTTONS,
          },
        ],
      };
    },
  },

  WAITING_NAME: {
    async onEnter(ctx) {
      return {
        messages: [{ text: h(ctx, 'What is your name?', 'Aapka naam kya hai?') }],
      };
    },
    async onMessage(ctx, message) {
      const name = message.trim();
      if (name.length < 2) {
        return {
          messages: [{ text: h(ctx, 'Please enter your name.', 'Apna naam batao.') }],
        };
      }
      return {
        messages: [],
        newState: 'WAITING_PHONE',
        contextUpdate: { name },
      };
    },
  },

  WAITING_PHONE: {
    async onEnter(ctx) {
      const name = ctx.name || 'friend';
      return {
        messages: [
          { text: h(ctx, `Nice to meet you, ${name}! Your phone number?`, `${name}, aapse milke khushi hui! Aapka phone number?`) },
        ],
      };
    },
    async onMessage(ctx, message) {
      const phone = message.trim().replace(/[\s\-()]/g, '');

      if (!validatePhoneNumber(phone)) {
        return {
          messages: [{ text: h(ctx, 'Please enter a valid 10-digit phone number.', 'Sahi 10-digit phone number daalo.') }],
        };
      }

      const normalized = normalizePhone(phone);
      const result = await sendOtp(normalized);

      if (!result.success) {
        return {
          messages: [{ text: h(ctx, 'Could not send OTP. Please try again.', 'OTP nahi bhej paye. Dobara try karo.') }],
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
          { text: h(ctx, `Code sent to ${ctx.phone}. Enter it:`, `${ctx.phone} pe code bheja hai. Yahan daalo:`) },
        ],
      };
    },
    async onMessage(ctx, message) {
      const otp = message.trim().replace(/\s/g, '');
      const attempts = (ctx.otpAttempts || 0) + 1;

      if (!/^\d{4,6}$/.test(otp)) {
        return {
          messages: [{ text: h(ctx, 'Enter the 6-digit code.', '6-digit code daalo.') }],
          contextUpdate: { otpAttempts: attempts },
        };
      }

      const result = await verifyOtpAndAuthenticate(ctx.phone!, otp, ctx.name);

      if (!result.success) {
        if (attempts >= 3) {
          return {
            messages: [{ text: h(ctx, 'Too many wrong attempts. Let\'s try again.', 'Bahut galat try. Chalo phir se shuru karte hain.') }],
            newState: 'WAITING_PHONE',
            contextUpdate: { otpAttempts: 0 },
          };
        }
        const left = 3 - attempts;
        return {
          messages: [{ text: h(ctx, `Wrong code. ${left} attempt(s) left.`, `Galat code. ${left} try baaki.`) }],
          contextUpdate: { otpAttempts: attempts },
        };
      }

      // Update name if new user
      if (result.isNewUser && ctx.name && result.userId) {
        await prisma.user.update({
          where: { id: result.userId },
          data: { name: ctx.name },
        });
      } else if (!result.isNewUser && result.user?.name) {
        ctx.name = result.user.name;
      }

      // Create session token
      const authSession = await createSession({
        userId: result.userId!,
        deviceInfo: 'Oorja-Agent',
      });

      return {
        messages: [],
        newState: 'AUTHENTICATED',
        contextUpdate: {
          userId: result.userId,
          authToken: authSession.token,
          name: ctx.name || result.user?.name || undefined,
          otpAttempts: 0,
        },
        authToken: authSession.token,
      };
    },
  },

  AUTHENTICATED: {
    async onEnter(ctx) {
      const name = ctx.name || 'friend';
      if (!ctx.userId) {
        return {
          messages: [{ text: h(ctx, `Welcome, ${name}!`, `Swagat hai, ${name}!`) }],
          newState: 'ASK_DISCOM',
        };
      }

      const verifiedCreds = await getVerifiedCredentials(ctx.userId);
      const user = await prisma.user.findUnique({ where: { id: ctx.userId } });

      if (user?.profileComplete) {
        const n = ctx.name || user.name || 'friend';
        return {
          messages: [{ text: h(ctx, `Welcome back, ${n}!`, `Wapas swagat, ${n}!`) }],
          newState: 'GENERAL_CHAT',
          contextUpdate: { verifiedCreds },
        };
      }

      if (verifiedCreds.includes('UTILITY_CUSTOMER')) {
        const n = ctx.name || user?.name || 'friend';
        return {
          messages: [{ text: h(ctx, `Welcome back, ${n}!`, `Wapas swagat, ${n}!`) }],
          newState: 'ASK_INTENT',
          contextUpdate: { verifiedCreds },
        };
      }

      return {
        messages: [{ text: h(ctx, `Welcome, ${name}!`, `Swagat hai, ${name}!`) }],
        newState: 'ASK_DISCOM',
        contextUpdate: { verifiedCreds },
      };
    },
    async onMessage() {
      return { messages: [] };
    },
  },

  ASK_DISCOM: {
    async onEnter(ctx) {
      return {
        messages: [
          {
            text: h(ctx,
              'Which company do you get electricity from?',
              'Aap konsi company se bijli lete ho?'
            ),
            buttons: DISCOM_LIST,
          },
        ],
      };
    },
    async onMessage(ctx, message) {
      if (message.startsWith('discom:')) {
        const discomKey = message.replace('discom:', '');

        if (discomKey === 'other') {
          return {
            messages: [
              {
                text: h(ctx,
                  'Please type your electricity company name:',
                  'Apni bijli company ka naam likho:'
                ),
              },
            ],
            contextUpdate: { askedDiscom: true },
          };
        }

        const discomEntry = DISCOM_LIST.find(d => d.callbackData === message);
        const discomName = discomEntry?.text || discomKey;
        return {
          messages: [],
          newState: 'WAITING_UTILITY_CRED',
          contextUpdate: { discom: discomName },
        };
      }

      // Free text — treat as manual DISCOM name entry
      const typed = message.trim();
      if (typed.length < 2) {
        return {
          messages: [
            {
              text: h(ctx,
                'Please select your electricity company or type the name:',
                'Apni bijli company chuno ya naam likho:'
              ),
              buttons: DISCOM_LIST,
            },
          ],
        };
      }

      return {
        messages: [],
        newState: 'WAITING_UTILITY_CRED',
        contextUpdate: { discom: typed },
      };
    },
  },

  WAITING_UTILITY_CRED: {
    async onEnter(ctx) {
      const discomLabel = ctx.discom || 'your DISCOM';
      // Look up DISCOM-specific credential link
      const discomKey = Object.keys(DISCOM_CRED_LINKS).find(
        key => DISCOM_LIST.find(d => d.callbackData === `discom:${key}`)?.text === ctx.discom
      ) || 'other';
      const credLink = DISCOM_CRED_LINKS[discomKey] || DISCOM_CRED_LINKS['other'];

      return {
        messages: [
          {
            text: h(ctx,
              `I need your electricity account ID from ${discomLabel}. You can get it online here:\n${credLink}\n\nDownload and upload it here (PDF or JSON).`,
              `Mujhe aapki bijli company (${discomLabel}) ka ID chahiye. Vo aapko online mil jaayega is website par:\n${credLink}\n\nDownload karke yahan upload karo (PDF ya JSON).`
            ),
          },
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
              { text: h(ctx, 'Upload your electricity account ID when ready (PDF or JSON).', 'Jab ready ho tab bijli company ka ID upload karo (PDF ya JSON).'), delay: 300 },
            ],
          };
        }

        const isQuestion = message.includes('?') || message.length > 15;
        if (isQuestion) {
          const llmAnswer = await askLLM(message, 'User needs to upload their electricity account ID to start P2P energy trading.');
          if (llmAnswer) {
            return {
              messages: [
                { text: llmAnswer },
                { text: h(ctx, 'Upload the ID when ready.', 'Jab ready ho tab ID upload karo.'), delay: 300 },
              ],
            };
          }
        }

        return {
          messages: [{ text: h(ctx, 'Please upload your electricity account ID (PDF or JSON).', 'Apni bijli company ka ID upload karo (PDF ya JSON).') }],
        };
      }

      try {
        const result = await processCredentialUpload(ctx.userId!, fileData, 'UtilityCustomerCredential');

        if (!result.success) {
          return {
            messages: [{ text: result.error || 'Could not verify this credential. Please try again.' }],
          };
        }

        // Mark profile as complete after mandatory utility cred — App button will work from here
        await prisma.user.update({
          where: { id: ctx.userId! },
          data: { profileComplete: true },
        });

        return {
          messages: [{ text: h(ctx, `Verified! ${result.summary}`, `Verify ho gaya! ${result.summary}`) }],
          newState: 'ASK_INTENT',
          contextUpdate: {
            verifiedCreds: [...(ctx.verifiedCreds || []), 'UTILITY_CUSTOMER'],
          },
        };
      } catch (error: any) {
        logger.error(`Utility cred verification failed: ${error.message}`);
        return {
          messages: [{ text: 'Something went wrong verifying this. Please try again.' }],
        };
      }
    },
  },

  ASK_INTENT: {
    async onEnter(ctx) {
      return {
        messages: [
          {
            text: h(ctx,
              'What would you like to do?',
              'Ab batao, aapko kya karna hai?'
            ),
            buttons: [
              { text: h(ctx, 'Sell solar energy', 'Solar se bijli bechna'), callbackData: 'intent:solar' },
              { text: h(ctx, 'Battery storage', 'Battery mein store karna'), callbackData: 'intent:battery' },
              { text: h(ctx, 'Buy energy', 'Bijli khareedna'), callbackData: 'intent:buy' },
              { text: h(ctx, 'Just browse', 'Bas dekhna hai'), callbackData: 'intent:skip' },
            ],
          },
        ],
      };
    },
    async onMessage(ctx, message) {
      if (message.startsWith('intent:')) {
        const intent = message.replace('intent:', '');

        if (intent === 'skip') {
          return {
            messages: [],
            newState: 'CONFIRM_TRADING',
          };
        }

        if (intent === 'solar') {
          return {
            messages: [],
            newState: 'OFFER_OPTIONAL_CREDS',
            contextUpdate: { intent: 'sell', expectedCredType: 'GenerationProfileCredential' },
          };
        }

        if (intent === 'battery') {
          return {
            messages: [],
            newState: 'OFFER_OPTIONAL_CREDS',
            contextUpdate: { intent: 'sell', expectedCredType: 'StorageProfileCredential' },
          };
        }

        if (intent === 'buy') {
          return {
            messages: [],
            newState: 'OFFER_OPTIONAL_CREDS',
            contextUpdate: { intent: 'buy', expectedCredType: 'ConsumptionProfileCredential' },
          };
        }
      }

      // Free text — try to detect intent
      const lower = message.toLowerCase();
      if (lower.includes('solar') || lower.includes('bech') || lower.includes('sell')) {
        return {
          messages: [],
          newState: 'OFFER_OPTIONAL_CREDS',
          contextUpdate: { intent: 'sell', expectedCredType: 'GenerationProfileCredential' },
        };
      }
      if (lower.includes('battery') || lower.includes('store') || lower.includes('storage')) {
        return {
          messages: [],
          newState: 'OFFER_OPTIONAL_CREDS',
          contextUpdate: { intent: 'sell', expectedCredType: 'StorageProfileCredential' },
        };
      }
      if (lower.includes('buy') || lower.includes('khareed') || lower.includes('kharid')) {
        return {
          messages: [],
          newState: 'OFFER_OPTIONAL_CREDS',
          contextUpdate: { intent: 'buy', expectedCredType: 'ConsumptionProfileCredential' },
        };
      }
      if (lower.includes('skip') || lower.includes('nahi') || lower.includes('no') || lower.includes('aage') || lower.includes('dekh') || lower.includes('browse')) {
        return {
          messages: [],
          newState: 'CONFIRM_TRADING',
        };
      }

      // Re-prompt
      return {
        messages: [
          {
            text: h(ctx,
              'Please choose what you\'d like to do:',
              'Choose karo, aapko kya karna hai:'
            ),
            buttons: [
              { text: h(ctx, 'Sell solar energy', 'Solar se bijli bechna'), callbackData: 'intent:solar' },
              { text: h(ctx, 'Battery storage', 'Battery mein store karna'), callbackData: 'intent:battery' },
              { text: h(ctx, 'Buy energy', 'Bijli khareedna'), callbackData: 'intent:buy' },
              { text: h(ctx, 'Just browse', 'Bas dekhna hai'), callbackData: 'intent:skip' },
            ],
          },
        ],
      };
    },
  },

  OFFER_OPTIONAL_CREDS: {
    async onEnter(ctx) {
      const verifiedCreds = ctx.verifiedCreds || [];
      const expectedType = ctx.expectedCredType;

      // No expected credential or already verified → move on
      if (!expectedType) {
        return { messages: [], newState: 'CONFIRM_TRADING' };
      }

      const dbType = degTypeToDbType(expectedType);
      if (verifiedCreds.includes(dbType)) {
        return { messages: [], newState: 'CONFIRM_TRADING' };
      }

      // Route to credential upload
      return {
        messages: [],
        newState: 'WAITING_OPTIONAL_CRED',
        contextUpdate: { expectedCredType: expectedType },
      };
    },
    async onMessage(ctx, message, fileData) {
      // Shouldn't normally receive messages (pass-through state), but handle gracefully
      if (fileData) {
        return states.WAITING_OPTIONAL_CRED.onMessage(ctx, message, fileData);
      }
      return {
        messages: [],
        newState: 'WAITING_OPTIONAL_CRED',
      };
    },
  },

  WAITING_OPTIONAL_CRED: {
    async onEnter(ctx) {
      const expectedType = ctx.expectedCredType || '';
      const farmerName = CRED_FARMER_NAMES[expectedType] || { en: 'ID', hi: 'ID' };

      // Get credential link based on DISCOM
      const discomKey = Object.keys(DISCOM_CRED_LINKS).find(
        key => DISCOM_LIST.find(d => d.callbackData === `discom:${key}`)?.text === ctx.discom
      ) || 'other';
      const credLink = DISCOM_CRED_LINKS[discomKey] || DISCOM_CRED_LINKS['other'];

      return {
        messages: [
          {
            text: h(ctx,
              `Your electricity company would have given you a ${farmerName.en} online. You can get it here:\n${credLink}\n\nUpload it here (PDF or JSON).`,
              `Aapki bijli company ne aapko ${farmerName.hi} diya hoga online. Is link par mil jaayega:\n${credLink}\n\nUpload karo (PDF ya JSON).`
            ),
          },
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
              { text: h(ctx, 'Upload the ID when ready.', 'Jab ready ho tab ID upload karo.'), delay: 300 },
            ],
          };
        }

        // Let user skip
        if (message.toLowerCase().includes('skip') || message.toLowerCase().includes('back') || message.toLowerCase().includes('nahi')) {
          return {
            messages: [],
            newState: 'CONFIRM_TRADING',
          };
        }

        const farmerName = CRED_FARMER_NAMES[ctx.expectedCredType || ''] || { en: 'ID', hi: 'ID' };
        return {
          messages: [
            {
              text: h(ctx,
                `Please upload your ${farmerName.en} (PDF or JSON).`,
                `Apna ${farmerName.hi} upload karo (PDF ya JSON).`
              ),
              buttons: [{ text: h(ctx, 'Skip this', 'Ye skip karo'), callbackData: 'skip' }],
            },
          ],
        };
      }

      try {
        const result = await processCredentialUpload(ctx.userId!, fileData, ctx.expectedCredType);

        if (!result.success) {
          return {
            messages: [{ text: result.error || h(ctx, 'Could not verify. Please try again.', 'Verify nahi ho paya. Dobara try karo.') }],
          };
        }

        const dbType = degTypeToDbType(result.credType);
        const updatedCreds = [...new Set([...(ctx.verifiedCreds || []), dbType])];

        return {
          messages: [{ text: h(ctx, `Verified! ${result.summary}`, `Verify ho gaya! ${result.summary}`) }],
          newState: 'CONFIRM_TRADING',
          contextUpdate: {
            verifiedCreds: updatedCreds,
          },
        };
      } catch (error: any) {
        logger.error(`Optional cred verification failed: ${error.message}`);
        return {
          messages: [{ text: h(ctx, 'Something went wrong. Please try again.', 'Kuch gadbad ho gayi. Dobara try karo.') }],
        };
      }
    },
  },

  CONFIRM_TRADING: {
    async onEnter(ctx) {
      const verifiedCreds = ctx.verifiedCreds || [];
      const hasGeneration = verifiedCreds.includes('GENERATION_PROFILE');
      const hasStorage = verifiedCreds.includes('STORAGE_PROFILE');

      // Selling flow — explain what Oorja does, show expected earnings, ask to start
      if (hasGeneration || hasStorage) {
        const user = await prisma.user.findUnique({
          where: { id: ctx.userId! },
          select: { productionCapacity: true, allowedTradeLimit: true },
        });

        const capacity = user?.productionCapacity || ctx.productionCapacity;
        const tradeLimitPct = user?.allowedTradeLimit || 10;
        const pricePerKwh = 6.0;
        let explainEn: string;
        let explainHi: string;

        if (hasGeneration) {
          const capEn = capacity ? `Your solar panel generates ~${capacity} kWh/month. ` : '';
          const capHi = capacity ? `Aapka solar panel ~${capacity} kWh/month bijli banata hai. ` : '';

          // Calculate expected monthly earnings
          let earningsEn = '';
          let earningsHi = '';
          if (capacity) {
            const tradeableKwh = Math.floor(capacity * tradeLimitPct / 100);
            const expectedMonthly = Math.round(tradeableKwh * pricePerKwh);
            earningsEn = `You can earn approximately Rs ${expectedMonthly}/month from this. `;
            earningsHi = `Isse aap lagbhag Rs ${expectedMonthly}/month kama sakte ho. `;
          }

          explainEn = `${capEn}I'll sell the extra energy from your solar panels at good prices in the market to maximize your profit. ${earningsEn}`;
          explainHi = `${capHi}Main aapke ghar pe lage solar se jo bijli bani hai, usse achhe daam pe market mein bechunga taaki aapka profit ho. ${earningsHi}`;
        } else {
          explainEn = `I'll help you store energy in your battery and sell it at the best times for maximum returns.`;
          explainHi = `Main aapki battery mein store ki hui bijli ko sahi waqt pe bech ke aapka munafa badhaunga.`;
        }

        return {
          messages: [
            {
              text: h(ctx, `${explainEn}\n\nShall we start?`, `${explainHi}\n\nShuru karein?`),
              buttons: [
                { text: h(ctx, 'Yes, start!', 'Haan, shuru karo!'), callbackData: 'yes' },
                { text: h(ctx, 'Not now', 'Abhi nahi'), callbackData: 'no' },
              ],
            },
          ],
        };
      }

      // Buyer flow — explain and mark complete
      if (ctx.intent === 'buy') {
        await prisma.user.update({
          where: { id: ctx.userId! },
          data: { profileComplete: true },
        });

        return {
          messages: [
            { text: h(ctx,
              'I\'ll help you find the best energy deals from local producers at fair prices. Your profile is ready!',
              'Main aapko local producers se sahi daam pe bijli dilaunga. Aapka profile ready hai!'
            ) },
          ],
          newState: 'GENERAL_CHAT',
        };
      }

      // Browser / no specific intent — just mark complete
      await prisma.user.update({
        where: { id: ctx.userId! },
        data: { profileComplete: true },
      });

      return {
        messages: [
          { text: h(ctx,
            'Your profile is set up! You can browse energy offers or ask me anything.',
            'Aapka profile ready hai! Energy offers dekh sakte ho ya mujhse kuch bhi poocho.'
          ) },
        ],
        newState: 'GENERAL_CHAT',
      };
    },
    async onMessage(ctx, message) {
      const lower = message.toLowerCase().trim();
      const isYes = ['yes', 'y', 'haan', 'ha', 'ok', 'sure', 'start', 'yes, start!', 'haan, shuru karo!'].includes(lower);
      const isNo = ['no', 'n', 'nahi', 'nope', 'not now', 'later', 'baad mein', 'abhi nahi'].includes(lower);

      if (isYes) {
        try {
          await prisma.user.update({
            where: { id: ctx.userId! },
            data: { profileComplete: true },
          });

          const offerResult = await mockTradingAgent.createDefaultOffer(ctx.userId!);

          if (offerResult.success && offerResult.offer) {
            const o = offerResult.offer;
            return {
              messages: [
                { text: h(ctx,
                  `Done! Your energy is now listed for sale:\n${o.quantity} kWh at Rs ${o.pricePerKwh}/unit, tomorrow 6AM-6PM.\n\nBuyers can now purchase your energy!`,
                  `Ho gaya! Aapki energy ab sale pe hai:\n${o.quantity} kWh Rs ${o.pricePerKwh}/unit pe, kal subah 6 se shaam 6 tak.\n\nBuyers ab aapki energy khareed sakte hain!`
                ) },
              ],
              newState: 'GENERAL_CHAT',
              contextUpdate: { tradingActive: true },
            };
          }

          logger.warn(`createDefaultOffer returned error for user ${ctx.userId}: ${offerResult.error}`);
          return {
            messages: [
              { text: h(ctx,
                'Profile set up! You can create offers from the Sell tab or tell me here (e.g. "list 50 kWh at Rs 6").',
                'Profile ready! Sell tab se ya mujhse kaho (jaise "50 kWh Rs 6 pe daal do") aur offer ban jayega.'
              ) },
            ],
            newState: 'GENERAL_CHAT',
            contextUpdate: { tradingActive: true },
          };
        } catch (error: any) {
          logger.error(`CONFIRM_TRADING yes handler failed: ${error.message}`);
          return {
            messages: [
              { text: h(ctx,
                'Profile is set up! You can create offers by telling me (e.g. "list 50 kWh at Rs 6").',
                'Profile ready hai! Mujhse kaho (jaise "50 kWh Rs 6 pe daal do") aur offer ban jayega.'
              ) },
            ],
            newState: 'GENERAL_CHAT',
            contextUpdate: { tradingActive: true },
          };
        }
      }

      if (isNo) {
        await prisma.user.update({
          where: { id: ctx.userId! },
          data: { profileComplete: true },
        }).catch(() => {});

        return {
          messages: [
            { text: h(ctx,
              'No problem. You can start selling anytime from the Sell tab or ask me here.',
              'Koi baat nahi. Kabhi bhi Sell tab se ya mujhse poocho, bechna shuru kar sakte ho.'
            ) },
          ],
          newState: 'GENERAL_CHAT',
        };
      }

      const kbAnswer = knowledgeBase.findAnswer(message);
      if (kbAnswer) {
        return {
          messages: [
            { text: kbAnswer },
            {
              text: h(ctx, 'Start selling your energy?', 'Energy bechna shuru karein?'),
              buttons: [
                { text: h(ctx, 'Yes', 'Haan'), callbackData: 'yes' },
                { text: h(ctx, 'No', 'Nahi'), callbackData: 'no' },
              ],
              delay: 300,
            },
          ],
        };
      }

      return {
        messages: [
          {
            text: h(ctx, 'Start selling?', 'Bechna shuru karein?'),
            buttons: [
              { text: h(ctx, 'Yes', 'Haan'), callbackData: 'yes' },
              { text: h(ctx, 'No', 'Nahi'), callbackData: 'no' },
            ],
          },
        ],
      };
    },
  },

  GENERAL_CHAT: {
    async onEnter() {
      return { messages: [] };
    },
    async onMessage(ctx, message) {
      // --- Step 1: Classify intent with LLM ---
      const intent = await classifyIntent(message);
      let dataContext = '';
      let fallbackText = '';

      // --- Step 2: Execute action and gather data ---
      if (ctx.userId && intent) {
        switch (intent.intent) {
          case 'show_listings': {
            dataContext = await mockTradingAgent.getActiveListings(ctx.userId, 'en');
            fallbackText = ctx.language === 'hinglish'
              ? await mockTradingAgent.getActiveListings(ctx.userId, 'hinglish')
              : dataContext;
            break;
          }

          case 'show_earnings': {
            const period = parseTimePeriod(message);
            if (period) {
              dataContext = await mockTradingAgent.getSalesByPeriod(ctx.userId, period.startDate, period.endDate, period.label, 'en');
            } else {
              dataContext = await mockTradingAgent.getEarningsSummary(ctx.userId, 'en');
            }
            fallbackText = dataContext;
            break;
          }

          case 'show_sales': {
            const period = parseTimePeriod(message) || (intent.params?.time_period ? parseTimePeriod(intent.params.time_period) : null);
            if (period) {
              dataContext = await mockTradingAgent.getSalesByPeriod(ctx.userId, period.startDate, period.endDate, period.label, 'en');
            } else {
              dataContext = await mockTradingAgent.getEarningsSummary(ctx.userId, 'en');
            }
            fallbackText = dataContext;
            break;
          }

          case 'show_balance': {
            const user = await prisma.user.findUnique({
              where: { id: ctx.userId },
              select: { balance: true },
            });
            if (user) {
              dataContext = `Wallet balance: Rs ${user.balance.toFixed(2)}`;
              fallbackText = h(ctx, dataContext, `Aapka wallet balance: Rs ${user.balance.toFixed(2)}`);
            }
            break;
          }

          case 'show_orders': {
            dataContext = await mockTradingAgent.getOrdersSummary(ctx.userId, 'en');
            fallbackText = ctx.language === 'hinglish'
              ? await mockTradingAgent.getOrdersSummary(ctx.userId, 'hinglish')
              : dataContext;
            break;
          }

          case 'create_listing': {
            const result = await mockTradingAgent.createCustomOffer(ctx.userId, {
              pricePerKwh: intent.params?.price_per_kwh,
              quantity: intent.params?.quantity_kwh,
              timeDesc: intent.params?.time_description,
            });

            if (result.success && result.offer) {
              const o = result.offer;
              const start = new Date(o.startTime);
              const end = new Date(o.endTime);
              dataContext = `Successfully created new listing: ${o.quantity} kWh at Rs ${o.pricePerKwh}/unit, ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} to ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Buyers can now see and buy this energy.`;
              fallbackText = h(ctx,
                `Done! ${o.quantity} kWh listed at Rs ${o.pricePerKwh}/unit.`,
                `Ho gaya! ${o.quantity} kWh Rs ${o.pricePerKwh}/unit pe list ho gaya.`
              );
            } else {
              dataContext = `Failed to create listing: ${result.error || 'Unknown error'}`;
              fallbackText = h(ctx, 'Could not create the listing. Try again.', 'Listing nahi ban payi. Dobara try karo.');
            }
            break;
          }

          case 'discom_rates': {
            const name = ctx.discom || 'DISCOM';
            dataContext = `${name} electricity rates: Normal slab Rs 5.50/unit, Peak hours (6PM-10PM) Rs 7.50/unit. P2P trading rate on Oorja: Rs 6.00/unit — cheaper than peak DISCOM rates, better than net metering (Rs 2/unit).`;
            fallbackText = dataContext;
            break;
          }

          case 'trading_tips': {
            dataContext = 'Trading tips: 1) Trade regularly — more trades = better trust score = more buyers. 2) Keep solar panels clean for maximum generation. 3) List energy during peak hours (6PM-10PM) for higher demand and prices. 4) Price slightly below DISCOM rates (Rs 5-7/unit) for faster sales. 5) Upload all credentials for a verified profile that attracts more buyers.';
            fallbackText = dataContext;
            break;
          }

          case 'general_qa':
            // No data to fetch — compose from KB or general knowledge
            break;
        }
      }

      // Enrich with knowledge base if relevant
      const kbAnswer = knowledgeBase.findAnswer(message);
      if (kbAnswer) {
        if (!dataContext) dataContext = kbAnswer;
        else dataContext += `\n\nAdditional info: ${kbAnswer}`;
        if (!fallbackText) fallbackText = kbAnswer;
      }

      // --- Step 3: Compose natural response with LLM ---
      if (dataContext || intent?.intent === 'general_qa' || !intent) {
        const composed = await composeResponse(
          message,
          dataContext || 'No specific data available. Answer based on general knowledge about Oorja P2P energy trading platform.',
          ctx.language,
          ctx.name
        );
        if (composed) return { messages: [{ text: composed }] };
      }

      // --- Fallback: return raw data if LLM composition failed ---
      if (fallbackText) return { messages: [{ text: fallbackText }] };

      // --- Keyword fallback (when LLM completely unavailable) ---
      if (!intent && ctx.userId) {
        const lower = message.toLowerCase();

        if ((lower.includes('listing') || lower.includes('offer')) &&
            (lower.includes('my') || lower.includes('mere') || lower.includes('show') || lower.includes('dikha') || lower.includes('active') || lower.includes('kitna'))) {
          return { messages: [{ text: await mockTradingAgent.getActiveListings(ctx.userId, ctx.language) }] };
        }
        if (lower.includes('earn') || lower.includes('kamai') || lower.includes('kamaya') || lower.includes('income') || lower.includes('munafa')) {
          return { messages: [{ text: await mockTradingAgent.getEarningsSummary(ctx.userId, ctx.language) }] };
        }
        if (lower.includes('balance') || lower.includes('wallet') || lower.includes('paise') || lower.includes('khata')) {
          const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { balance: true } });
          if (user) return { messages: [{ text: h(ctx, `Wallet balance: Rs ${user.balance.toFixed(2)}`, `Wallet balance: Rs ${user.balance.toFixed(2)}`) }] };
        }
        if (lower.includes('order') || lower.includes('status')) {
          return { messages: [{ text: await mockTradingAgent.getOrdersSummary(ctx.userId, ctx.language) }] };
        }
        if ((lower.includes('new') || lower.includes('create') || lower.includes('naya') || lower.includes('daal') || lower.includes('bana')) &&
            (lower.includes('offer') || lower.includes('listing'))) {
          const result = await mockTradingAgent.createDefaultOffer(ctx.userId);
          if (result.success && result.offer) {
            return { messages: [{ text: h(ctx,
              `New offer created: ${result.offer.quantity} kWh at Rs ${result.offer.pricePerKwh}/unit, tomorrow 6AM-6PM.`,
              `Naya offer ban gaya: ${result.offer.quantity} kWh Rs ${result.offer.pricePerKwh}/unit pe, kal subah 6 se shaam 6 tak.`
            ) }] };
          }
          return { messages: [{ text: result.error || h(ctx, 'Could not create offer.', 'Offer nahi ban paya.') }] };
        }
      }

      // Last resort
      return {
        messages: [
          {
            text: h(ctx, 'I can help with:', 'Main yeh madad kar sakta hun:'),
            buttons: [
              { text: h(ctx, 'My earnings', 'Meri kamayi'), callbackData: 'show my earnings' },
              { text: h(ctx, 'My listings', 'Mere listings'), callbackData: 'show my listings' },
              { text: h(ctx, 'My orders', 'Mere orders'), callbackData: 'show my orders' },
              { text: h(ctx, 'New listing', 'Naya listing'), callbackData: 'create new listing' },
            ],
          },
        ],
      };
    },
  },

  // Legacy states — redirect to new flow
  OTP_VERIFIED: {
    async onEnter() {
      return { messages: [], newState: 'AUTHENTICATED' };
    },
    async onMessage() {
      return { messages: [], newState: 'AUTHENTICATED' };
    },
  },

  EXPLAIN_VC: {
    async onEnter() {
      return { messages: [], newState: 'WAITING_UTILITY_CRED' };
    },
    async onMessage() {
      return { messages: [], newState: 'WAITING_UTILITY_CRED' };
    },
  },

  WAITING_VC_UPLOAD: {
    async onEnter() {
      return { messages: [], newState: 'WAITING_UTILITY_CRED' };
    },
    async onMessage(ctx, message, fileData) {
      return states.WAITING_UTILITY_CRED.onMessage(ctx, message, fileData);
    },
  },

  VC_VERIFIED: {
    async onEnter() {
      return { messages: [], newState: 'OFFER_OPTIONAL_CREDS' };
    },
    async onMessage() {
      return { messages: [], newState: 'OFFER_OPTIONAL_CREDS' };
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
};

// --- Translation helpers ---

async function translateResponse(
  response: AgentResponse,
  targetLang: SarvamLangCode | 'hinglish'
): Promise<AgentResponse> {
  // Hinglish = English responses (user types Roman Hindi, reads English fine)
  if (targetLang === 'hinglish') return response;

  const effectiveLang = targetLang as SarvamLangCode;
  if (effectiveLang === 'en-IN' || !isTranslationAvailable()) return response;

  const translatedMessages: AgentMessage[] = [];
  for (const msg of response.messages) {
    const translatedText = await translateFromEnglish(msg.text, effectiveLang);
    let translatedButtons = msg.buttons;
    if (msg.buttons && msg.buttons.length > 0) {
      translatedButtons = await Promise.all(
        msg.buttons.map(async (btn) => ({
          text: await translateFromEnglish(btn.text, effectiveLang),
          callbackData: btn.callbackData,
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
  let session = await prisma.chatSession.findUnique({
    where: { platform_platformId: { platform, platformId } },
  });

  if (!session) {
    session = await prisma.chatSession.create({
      data: { platform, platformId, state: 'GREETING', contextJson: '{}' },
    });

    await storeMessage(session.id, 'user', userMessage);

    // New session — just show the greeting + language picker, wait for selection
    const ctx: SessionContext = {};
    const enterResp = await states.GREETING.onEnter(ctx);
    await storeAgentMessages(session.id, enterResp.messages);

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

  const detectedLang = detectLanguage(userMessage);
  // For hinglish users: don't override with en-IN (Roman Hindi looks like English)
  const userLang: SarvamLangCode | 'hinglish' =
    ctx.language === 'hinglish'
      ? 'hinglish'
      : (detectedLang !== 'en-IN' ? detectedLang : (ctx.language || 'en-IN'));

  let processedMessage = userMessage;
  const isStructuredInput = /^\d+$/.test(userMessage.trim()) || userMessage.trim().length <= 3;
  const isHinglish = ctx.language === 'hinglish';
  if (detectedLang !== 'en-IN' && !isStructuredInput && !isHinglish) {
    processedMessage = await translateToEnglish(userMessage, detectedLang);
    logger.info(`Translated [${detectedLang} → en-IN]: "${userMessage}" → "${processedMessage}"`);
  }

  if (userLang !== ctx.language) {
    ctx.language = userLang;
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { contextJson: JSON.stringify(ctx) },
    });
  }

  const response = await stateHandler.onMessage(ctx, processedMessage, fileData);
  await storeAgentMessages(session.id, response.messages);

  if (response.newState && response.newState !== currentState) {
    const mergedCtx = { ...ctx, ...response.contextUpdate };
    await transitionState(session.id, response.newState, response.contextUpdate);

    const enterResp = await states[response.newState as ChatState].onEnter(mergedCtx);
    await storeAgentMessages(session.id, enterResp.messages);

    let allMessages = [...response.messages, ...enterResp.messages];
    let chainState = response.newState as ChatState;
    let chainCtx = { ...mergedCtx, ...enterResp.contextUpdate };
    let authToken = response.authToken || enterResp.authToken;

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

    const effectiveLang = (response.contextUpdate?.language as any) || userLang;
    return translateResponse({ messages: allMessages, authToken }, effectiveLang);
  }

  if (response.contextUpdate) {
    const merged = { ...ctx, ...response.contextUpdate };
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { contextJson: JSON.stringify(merged) },
    });
  }

  const effectiveLang = (response.contextUpdate?.language as any) || userLang;
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

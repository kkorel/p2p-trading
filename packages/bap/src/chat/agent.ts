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
import { mockTradingAgent, parseTimePeriod, getWelcomeBackData, executePurchase, discoverBestOffer, completePurchase } from './trading-agent';
import { askLLM, classifyIntent, composeResponse, extractNameWithLLM } from './llm-fallback';
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
  /** Language used for the response (for TTS) */
  responseLanguage?: string;
  /** User's voice output preference (for auto-play) */
  voiceOutputEnabled?: boolean;
}

/**
 * Options for voice input processing
 */
export interface VoiceInputOptions {
  /** Language detected from voice input (e.g., 'hi-IN', 'ta-IN') */
  detectedLanguage?: string;
  /** Whether this message came from voice input */
  isVoiceInput?: boolean;
}

interface PendingListing {
  pricePerKwh?: number;
  quantity?: number;
  timeDesc?: string;
  energyType?: string;
  awaitingField?: 'energy_type' | 'quantity' | 'price' | 'timeframe' | 'confirm';
}

interface PendingPurchase {
  quantity?: number;
  maxPrice?: number;
  timeDesc?: string;
  awaitingField?: 'quantity' | 'timeframe' | 'confirm' | 'confirm_offer';
  // Populated after discovery — single offer (legacy)
  discoveredOffer?: {
    offerId: string;
    providerId: string;
    providerName: string;
    price: number;
    quantity: number;
    timeWindow: string;
  };
  // Smart buy multi-offer
  discoveredOffers?: Array<{
    offerId: string;
    providerId: string;
    providerName: string;
    price: number;
    quantity: number;
    subtotal: number;
    timeWindow: string;
  }>;
  selectionType?: 'single' | 'multiple';
  summary?: {
    totalQuantity: number;
    totalPrice: number;
    averagePrice: number;
    fullyFulfilled: boolean;
    shortfall: number;
    offersUsed: number;
  };
  transactionId?: string;
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
  /** Flag to skip name question in WAITING_NAME.onEnter if already asked */
  nameAsked?: boolean;
  expectedCredType?: string;
  verifiedCreds?: string[];
  pendingListing?: PendingListing;
  pendingPurchase?: PendingPurchase;
  /** User's preference for voice output (TTS auto-play) */
  voiceOutputEnabled?: boolean;
  // Runtime-only — not serialized to contextJson
  _sessionId?: string;
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
  | 'ASK_VOICE_PREF' // Deprecated: voice toggle now in header UI
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

/**
 * Extract the actual name from common phrases like "My name is Jack" or "I'm Jack".
 * Returns just the name portion, or the full message if no pattern matches.
 */
function extractName(message: string): string {
  let text = message.trim();
  
  // Common patterns in English
  const englishPatterns = [
    /^(?:my name is|i'm|i am|call me|this is|it's|its)\s+(.+)$/i,
    /^(.+?)\s+(?:is my name|here)$/i,
    /^(?:name:?\s*)(.+)$/i,
  ];
  
  // Common patterns in Hindi/Hinglish
  const hindiPatterns = [
    /^(?:mera naam|mera name|naam|name)\s+(?:hai\s+)?(.+)$/i,
    /^(?:main|mai|me)\s+(.+?)\s+(?:hun|hoon|hu)$/i,
    /^(.+?)\s+(?:mera naam hai|hai mera naam)$/i,
  ];
  
  const allPatterns = [...englishPatterns, ...hindiPatterns];
  
  for (const pattern of allPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Clean up the extracted name
      let name = match[1].trim();
      // Remove trailing punctuation
      name = name.replace(/[.!?,;:]+$/, '').trim();
      if (name.length >= 2) {
        return name;
      }
    }
  }
  
  // No explicit pattern matched - try to extract a name from casual speech
  // Remove filler words and clean up
  const fillerWords = /^(uh+|um+|hmm+|well|ok|okay|hey|hi|hello|so|yeah|yes|no|oh)[,.\s]+/gi;
  text = text.replace(fillerWords, '').trim();
  
  // Remove trailing questions/phrases like "what's yours?", "and you?", "what about you?"
  text = text.replace(/[,.\s]+(what'?s?\s+yours|and\s+you|what\s+about\s+you|you\??)\s*\??$/i, '').trim();
  
  // Remove surrounding punctuation
  text = text.replace(/^[,.\s!?]+|[,.\s!?]+$/g, '').trim();
  
  // If the result looks like a reasonable name (1-3 words, starts with capital or is short)
  const words = text.split(/\s+/);
  if (words.length <= 3 && text.length >= 2 && text.length <= 50) {
    // Check if it looks like a name (not a full sentence)
    const hasVerb = /\b(is|am|are|was|were|have|has|do|does|can|will|would|should)\b/i.test(text);
    if (!hasVerb) {
      return text;
    }
  }
  
  // Last resort: try to find a capitalized word that looks like a name
  const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g);
  if (capitalizedWords && capitalizedWords.length > 0) {
    // Return the first capitalized word (likely a name)
    return capitalizedWords[0];
  }
  
  // Fallback: return first word if it's reasonable length
  const firstWord = words[0]?.replace(/[^a-zA-Z\u0900-\u097F]/g, '');
  if (firstWord && firstWord.length >= 2 && firstWord.length <= 20) {
    return firstWord;
  }
  
  // Ultimate fallback
  return text || message.trim();
}

// --- Listing creation helpers (multi-turn detail gathering) ---

/**
 * Check which listing detail is missing and ask the user for it.
 * Returns an AgentResponse if something is missing, or null if all details are present.
 */
function askNextListingDetail(ctx: SessionContext, pending: PendingListing): AgentResponse | null {
  if (!pending.energyType) {
    return {
      messages: [{
        text: h(ctx,
          'What type of energy do you want to sell?',
          'Aap konsi energy bechna chahte ho?'
        ),
        buttons: [
          { text: h(ctx, 'Solar', 'Solar'), callbackData: 'listing_type:SOLAR' },
          { text: h(ctx, 'Wind', 'Wind'), callbackData: 'listing_type:WIND' },
          { text: h(ctx, 'Hydro', 'Hydro'), callbackData: 'listing_type:HYDRO' },
        ],
      }],
      contextUpdate: { pendingListing: { ...pending, awaitingField: 'energy_type' } },
    };
  }

  if (pending.quantity == null) {
    return {
      messages: [{
        text: h(ctx,
          'How many kWh (units) do you want to sell?',
          'Kitne kWh (unit) bechna chahte ho?'
        ),
      }],
      contextUpdate: { pendingListing: { ...pending, awaitingField: 'quantity' } },
    };
  }

  if (pending.pricePerKwh == null) {
    return {
      messages: [{
        text: h(ctx,
          'What price per unit (kWh) in Rs? DISCOM rates are around Rs 5-8/unit.',
          'Per unit (kWh) kitne Rs mein bechoge? DISCOM rate Rs 5-8/unit ke aas-paas hai.'
        ),
        buttons: [
          { text: 'Rs 5/unit', callbackData: 'listing_price:5' },
          { text: 'Rs 6/unit', callbackData: 'listing_price:6' },
          { text: 'Rs 7/unit', callbackData: 'listing_price:7' },
        ],
      }],
      contextUpdate: { pendingListing: { ...pending, awaitingField: 'price' } },
    };
  }

  if (!pending.timeDesc) {
    return {
      messages: [{
        text: h(ctx,
          'When do you want to sell? (e.g. "tomorrow 6AM-6PM", "today")',
          'Kab bechna chahte ho? (jaise "kal subah 6 se shaam 6", "aaj")'
        ),
        buttons: [
          { text: h(ctx, 'Tomorrow 6AM-6PM', 'Kal subah 6-shaam 6'), callbackData: 'listing_time:tomorrow' },
          { text: h(ctx, 'Today', 'Aaj'), callbackData: 'listing_time:today' },
        ],
      }],
      contextUpdate: { pendingListing: { ...pending, awaitingField: 'timeframe' } },
    };
  }

  // All details present — ask for confirmation
  const typeLabel = pending.energyType || 'Solar';
  const timeLabel = pending.timeDesc || 'tomorrow';
  return {
    messages: [{
      text: h(ctx,
        `Here's your listing:\n• ${pending.quantity} kWh of ${typeLabel} energy\n• Rs ${pending.pricePerKwh}/unit\n• Time: ${timeLabel}\n\nShall I create it?`,
        `Aapki listing:\n• ${pending.quantity} kWh ${typeLabel} energy\n• Rs ${pending.pricePerKwh}/unit\n• Time: ${timeLabel}\n\nBana dun?`
      ),
      buttons: [
        { text: h(ctx, 'Yes, create it!', 'Haan, bana do!'), callbackData: 'listing_confirm:yes' },
        { text: h(ctx, 'No, cancel', 'Nahi, cancel karo'), callbackData: 'listing_confirm:no' },
      ],
    }],
    contextUpdate: { pendingListing: { ...pending, awaitingField: 'confirm' } },
  };
}

/**
 * Handle user input for a pending listing (multi-turn).
 * Returns AgentResponse if handled, null if not a pending-listing input.
 */
async function handlePendingListingInput(ctx: SessionContext, message: string): Promise<AgentResponse | null> {
  const pending = ctx.pendingListing;
  if (!pending?.awaitingField) return null;

  const lower = message.toLowerCase().trim();

  // Allow cancellation at any point
  if (lower === 'cancel' || lower === 'nahi' || lower === 'no' || lower === 'back' || lower === 'stop') {
    return {
      messages: [{ text: h(ctx, 'Listing cancelled.', 'Listing cancel ho gayi.') }],
      contextUpdate: { pendingListing: undefined },
    };
  }

  switch (pending.awaitingField) {
    case 'energy_type': {
      let energyType: string | undefined;
      if (message.startsWith('listing_type:')) {
        energyType = message.replace('listing_type:', '');
      } else if (lower.includes('solar')) {
        energyType = 'SOLAR';
      } else if (lower.includes('wind')) {
        energyType = 'WIND';
      } else if (lower.includes('hydro')) {
        energyType = 'HYDRO';
      } else if (lower.includes('mix')) {
        energyType = 'MIXED';
      }

      if (!energyType) {
        return {
          messages: [{
            text: h(ctx, 'Please select an energy type:', 'Energy type chuno:'),
            buttons: [
              { text: 'Solar', callbackData: 'listing_type:SOLAR' },
              { text: 'Wind', callbackData: 'listing_type:WIND' },
              { text: 'Hydro', callbackData: 'listing_type:HYDRO' },
            ],
          }],
        };
      }

      const updated = { ...pending, energyType, awaitingField: undefined as any };
      const next = askNextListingDetail(ctx, updated);
      return next || { messages: [], contextUpdate: { pendingListing: updated } };
    }

    case 'quantity': {
      const num = parseFloat(message.replace(/[^\d.]/g, ''));
      if (!num || num <= 0) {
        return {
          messages: [{ text: h(ctx, 'Please enter a valid number of kWh.', 'Sahi kWh number daalo.') }],
        };
      }
      const updated = { ...pending, quantity: Math.round(num), awaitingField: undefined as any };
      const next = askNextListingDetail(ctx, updated);
      return next || { messages: [], contextUpdate: { pendingListing: updated } };
    }

    case 'price': {
      let price: number | undefined;
      if (message.startsWith('listing_price:')) {
        price = parseFloat(message.replace('listing_price:', ''));
      } else {
        price = parseFloat(message.replace(/[^\d.]/g, ''));
      }

      if (!price || price <= 0) {
        return {
          messages: [{ text: h(ctx, 'Please enter a valid price in Rs.', 'Sahi price daalo (Rs mein).') }],
        };
      }
      const updated = { ...pending, pricePerKwh: price, awaitingField: undefined as any };
      const next = askNextListingDetail(ctx, updated);
      return next || { messages: [], contextUpdate: { pendingListing: updated } };
    }

    case 'timeframe': {
      let timeDesc: string | undefined;
      if (message.startsWith('listing_time:')) {
        timeDesc = message.replace('listing_time:', '');
      } else {
        timeDesc = message.trim();
      }

      if (!timeDesc || timeDesc.length < 2) {
        return {
          messages: [{ text: h(ctx, 'Please tell me when you want to sell (e.g. "tomorrow", "today").', 'Kab bechna hai batao (jaise "kal", "aaj").') }],
        };
      }
      const updated = { ...pending, timeDesc, awaitingField: undefined as any };
      const next = askNextListingDetail(ctx, updated);
      return next || { messages: [], contextUpdate: { pendingListing: updated } };
    }

    case 'confirm': {
      if (message.startsWith('listing_confirm:')) {
        const answer = message.replace('listing_confirm:', '');
        if (answer === 'no') {
          return {
            messages: [{ text: h(ctx, 'Listing cancelled.', 'Listing cancel ho gayi.') }],
            contextUpdate: { pendingListing: undefined },
          };
        }
      }

      const isYes = ['yes', 'y', 'haan', 'ha', 'ok', 'sure', 'create', 'bana', 'listing_confirm:yes'].includes(lower)
        || message === 'listing_confirm:yes';
      const isNo = ['no', 'n', 'nahi', 'nope', 'cancel', 'listing_confirm:no'].includes(lower)
        || message === 'listing_confirm:no';

      if (isNo) {
        return {
          messages: [{ text: h(ctx, 'Listing cancelled.', 'Listing cancel ho gayi.') }],
          contextUpdate: { pendingListing: undefined },
        };
      }

      if (isYes) {
        // Create the listing
        return await createListingFromPending(ctx, pending);
      }

      // Re-prompt
      return {
        messages: [{
          text: h(ctx, 'Create this listing?', 'Ye listing banaun?'),
          buttons: [
            { text: h(ctx, 'Yes', 'Haan'), callbackData: 'listing_confirm:yes' },
            { text: h(ctx, 'No', 'Nahi'), callbackData: 'listing_confirm:no' },
          ],
        }],
      };
    }
  }

  return null;
}

/**
 * Create a listing from the completed pending listing details.
 */
async function createListingFromPending(ctx: SessionContext, pending: PendingListing): Promise<AgentResponse> {
  if (!ctx.userId || !pending.pricePerKwh || !pending.quantity) {
    return {
      messages: [{ text: h(ctx, 'Something went wrong. Please try again.', 'Kuch gadbad ho gayi. Dobara try karo.') }],
      contextUpdate: { pendingListing: undefined },
    };
  }

  const result = await mockTradingAgent.createCustomOffer(ctx.userId, {
    pricePerKwh: pending.pricePerKwh,
    quantity: pending.quantity,
    timeDesc: pending.timeDesc,
  });

  if (result.success && result.offer) {
    const o = result.offer;
    const start = new Date(o.startTime);
    const end = new Date(o.endTime);
    return {
      messages: [{
        text: h(ctx,
          `Done! Your listing is live:\n• ${o.quantity} kWh at Rs ${o.pricePerKwh}/unit\n• ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} to ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n\nBuyers can now see and buy your energy!`,
          `Ho gaya! Aapki listing live hai:\n• ${o.quantity} kWh Rs ${o.pricePerKwh}/unit pe\n• ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} se ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} tak\n\nBuyers ab aapki energy khareed sakte hain!`
        ),
      }],
      contextUpdate: { pendingListing: undefined },
    };
  }

  return {
    messages: [{ text: h(ctx, `Could not create the listing: ${result.error || 'Unknown error'}. Please try again.`, `Listing nahi ban payi: ${result.error || 'Unknown error'}. Dobara try karo.`) }],
    contextUpdate: { pendingListing: undefined },
  };
}

// --- Purchase (buyer) helpers (multi-turn detail gathering) ---

/**
 * Check which purchase detail is missing and ask the user for it.
 * Returns an AgentResponse if something is missing, or null if all details are present.
 */
function askNextPurchaseDetail(ctx: SessionContext, pending: PendingPurchase): AgentResponse | null {
  if (pending.quantity == null) {
    return {
      messages: [{
        text: h(ctx,
          'How many kWh (units) of energy do you want to buy?',
          'Kitne kWh (unit) energy khareedna chahte ho?'
        ),
        buttons: [
          { text: '10 kWh', callbackData: 'purchase_qty:10' },
          { text: '25 kWh', callbackData: 'purchase_qty:25' },
          { text: '50 kWh', callbackData: 'purchase_qty:50' },
        ],
      }],
      contextUpdate: { pendingPurchase: { ...pending, awaitingField: 'quantity' } },
    };
  }

  // maxPrice is no longer asked — smart-buy finds the cheapest combination automatically.
  // If user volunteers a max price via intent params, it's kept but not required.

  if (!pending.timeDesc) {
    return {
      messages: [{
        text: h(ctx,
          'When do you need the energy? Pick a day and time, or type your own (e.g. "tomorrow morning").',
          'Energy kab chahiye? Din aur time chuno, ya khud likho (jaise "kal subah").'
        ),
        buttons: [
          { text: h(ctx, 'Tomorrow morning', 'Kal subah'), callbackData: 'purchase_time:tomorrow morning' },
          { text: h(ctx, 'Tomorrow afternoon', 'Kal dopahar'), callbackData: 'purchase_time:tomorrow afternoon' },
          { text: h(ctx, 'Today evening', 'Aaj shaam'), callbackData: 'purchase_time:today evening' },
        ],
      }],
      contextUpdate: { pendingPurchase: { ...pending, awaitingField: 'timeframe' } },
    };
  }

  // All details present — signal caller to proceed with discovery
  return null;
}

/**
 * Discover the best offer(s) and present them to the user for confirmation.
 * Uses smart buy to automatically find single or multi-seller deals.
 */
async function discoverAndShowOffer(ctx: SessionContext, pending: PendingPurchase): Promise<AgentResponse> {
  if (!ctx.userId || !pending.quantity) {
    return {
      messages: [{ text: h(ctx, 'Something went wrong. Please try again.', 'Kuch gadbad ho gayi. Dobara try karo.') }],
      contextUpdate: { pendingPurchase: undefined },
    };
  }

  const searchMsg: AgentMessage = {
    text: h(ctx,
      'Searching for the best deals...',
      'Sabse acche deals dhundh raha hun...'
    ),
  };

  const result = await discoverBestOffer(ctx.userId, {
    quantity: pending.quantity,
    timeDesc: pending.timeDesc,
  });

  if (!result.success || !result.transactionId || (!result.discoveredOffer && !result.discoveredOffers?.length)) {
    // Auth expired — prompt re-login
    if (result.authExpired) {
      return {
        messages: [
          searchMsg,
          { text: h(ctx,
            'Your session has expired. Please log in again using /start.',
            'Aapka session expire ho gaya. /start se dobara login karo.'
          ) },
        ],
        contextUpdate: { pendingPurchase: undefined },
      };
    }

    // Build suggestion message with alternative time windows
    const messages: AgentMessage[] = [searchMsg];
    let errorText = result.error || 'No matching offers found.';

    if (result.availableWindows && result.availableWindows.length > 0) {
      const windowStrs = result.availableWindows.slice(0, 3).map(tw => {
        try {
          const s = new Date(tw.startTime);
          const e = new Date(tw.endTime);
          return `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${s.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}-${e.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
        } catch { return ''; }
      }).filter(Boolean);

      if (windowStrs.length > 0) {
        errorText += h(ctx,
          `\n\nOffers are available at these times:\n${windowStrs.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\nWould you like to try a different time?`,
          `\n\nYe time pe offers available hain:\n${windowStrs.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\nKya alag time pe try karna hai?`
        );
      }
    }

    messages.push({
      text: h(ctx, errorText, errorText),
      buttons: [
        { text: h(ctx, 'Try different time', 'Alag time'), callbackData: 'purchase_time:retry' },
        { text: h(ctx, 'Cancel', 'Cancel karo'), callbackData: 'purchase_offer_confirm:no' },
      ],
    });

    return {
      messages,
      contextUpdate: { pendingPurchase: { ...pending, awaitingField: 'timeframe', timeDesc: undefined } },
    };
  }

  const offers = result.discoveredOffers || [];
  const summary = result.summary;
  const selectionType = result.selectionType || 'single';

  // --- Single offer display ---
  if (selectionType === 'single' && offers.length === 1) {
    const offer = offers[0];
    const totalPrice = offer.subtotal || (offer.price * offer.quantity);

    return {
      messages: [
        searchMsg,
        {
          text: h(ctx,
            `Found a match!\n\n• Seller: ${offer.providerName}\n• ${offer.quantity} kWh at Rs ${offer.price}/unit\n• Total: Rs ${totalPrice.toFixed(2)}\n• Time: ${offer.timeWindow}\n\nDo you want to buy this?`,
            `Offer mil gaya!\n\n• Seller: ${offer.providerName}\n• ${offer.quantity} kWh Rs ${offer.price}/unit pe\n• Total: Rs ${totalPrice.toFixed(2)}\n• Time: ${offer.timeWindow}\n\nYe khareedna hai?`
          ),
          buttons: [
            { text: h(ctx, 'Yes, buy it!', 'Haan, khareed lo!'), callbackData: 'purchase_offer_confirm:yes' },
            { text: h(ctx, 'No, cancel', 'Nahi, cancel karo'), callbackData: 'purchase_offer_confirm:no' },
          ],
        },
      ],
      contextUpdate: {
        pendingPurchase: {
          ...pending,
          awaitingField: 'confirm_offer',
          discoveredOffer: {
            offerId: offer.offerId,
            providerId: offer.providerId,
            providerName: offer.providerName,
            price: offer.price,
            quantity: offer.quantity,
            timeWindow: offer.timeWindow,
          },
          discoveredOffers: offers,
          selectionType,
          summary,
          transactionId: result.transactionId,
        },
      },
    };
  }

  // --- Multi-offer display ---
  const offerLines = offers.map((o, i) =>
    `${i + 1}. ${o.providerName}\n   ${o.quantity} kWh × Rs ${o.price}/unit = Rs ${o.subtotal.toFixed(2)}`
  ).join('\n\n');

  const totalLine = summary
    ? `Total: ${summary.totalQuantity} kWh | Avg Rs ${summary.averagePrice.toFixed(2)}/unit | Rs ${summary.totalPrice.toFixed(2)}`
    : `Total: Rs ${offers.reduce((s, o) => s + o.subtotal, 0).toFixed(2)}`;

  const fulfillLine = summary && !summary.fullyFulfilled
    ? h(ctx,
        `\n(Partial: ${summary.shortfall} kWh short of ${pending.quantity} kWh requested)`,
        `\n(Partial: ${pending.quantity} mein se ${summary.shortfall} kWh nahi mili)`
      )
    : '';

  const timeWindow = offers[0]?.timeWindow || 'Flexible';

  return {
    messages: [
      searchMsg,
      {
        text: h(ctx,
          `Found best deals from ${offers.length} sellers!\n\n${offerLines}\n\n${totalLine}\nTime: ${timeWindow}${fulfillLine}\n\nAccept this deal?`,
          `${offers.length} sellers se best deals mile!\n\n${offerLines}\n\n${totalLine}\nTime: ${timeWindow}${fulfillLine}\n\nYe deal accept karna hai?`
        ),
        buttons: [
          { text: h(ctx, 'Yes, buy all!', 'Haan, sab khareed lo!'), callbackData: 'purchase_offer_confirm:yes' },
          { text: h(ctx, 'No, cancel', 'Nahi, cancel karo'), callbackData: 'purchase_offer_confirm:no' },
        ],
      },
    ],
    contextUpdate: {
      pendingPurchase: {
        ...pending,
        awaitingField: 'confirm_offer',
        discoveredOffers: offers,
        selectionType,
        summary,
        transactionId: result.transactionId,
      },
    },
  };
}

/**
 * Handle user input for a pending purchase (multi-turn).
 * Returns AgentResponse if handled, null if not a pending-purchase input.
 */
async function handlePendingPurchaseInput(ctx: SessionContext, message: string): Promise<AgentResponse | null> {
  const pending = ctx.pendingPurchase;
  if (!pending?.awaitingField) return null;

  const lower = message.toLowerCase().trim();

  // Allow cancellation at any point
  if (lower === 'cancel' || lower === 'nahi' || lower === 'no' || lower === 'back' || lower === 'stop') {
    return {
      messages: [{ text: h(ctx, 'Purchase cancelled.', 'Purchase cancel ho gayi.') }],
      contextUpdate: { pendingPurchase: undefined },
    };
  }

  switch (pending.awaitingField) {
    case 'quantity': {
      let qty: number | undefined;
      if (message.startsWith('purchase_qty:')) {
        qty = parseFloat(message.replace('purchase_qty:', ''));
      } else {
        qty = parseFloat(message.replace(/[^\d.]/g, ''));
      }

      if (!qty || qty <= 0) {
        return {
          messages: [{ text: h(ctx, 'Please enter a valid number of kWh.', 'Sahi kWh number daalo.') }],
        };
      }
      const updated = { ...pending, quantity: Math.round(qty), awaitingField: undefined as any };
      const next = askNextPurchaseDetail(ctx, updated);
      if (next) return next;
      return discoverAndShowOffer(ctx, updated);
    }

    case 'timeframe': {
      let timeDesc: string | undefined;
      if (message.startsWith('purchase_time:')) {
        timeDesc = message.replace('purchase_time:', '');
      } else {
        timeDesc = message.trim();
      }

      if (!timeDesc || timeDesc.length < 2) {
        return {
          messages: [{ text: h(ctx, 'Please tell me when you need the energy (e.g. "tomorrow", "today").', 'Kab chahiye batao (jaise "kal", "aaj").') }],
        };
      }
      const updated = { ...pending, timeDesc, awaitingField: undefined as any };
      const next = askNextPurchaseDetail(ctx, updated);
      if (next) return next;
      return discoverAndShowOffer(ctx, updated);
    }

    case 'confirm': {
      if (message.startsWith('purchase_confirm:')) {
        const answer = message.replace('purchase_confirm:', '');
        if (answer === 'no') {
          return {
            messages: [{ text: h(ctx, 'Purchase cancelled.', 'Purchase cancel ho gayi.') }],
            contextUpdate: { pendingPurchase: undefined },
          };
        }
      }

      const isYes = ['yes', 'y', 'haan', 'ha', 'ok', 'sure', 'buy', 'kharid', 'purchase_confirm:yes'].includes(lower)
        || message === 'purchase_confirm:yes';
      const isNo = ['no', 'n', 'nahi', 'nope', 'cancel', 'purchase_confirm:no'].includes(lower)
        || message === 'purchase_confirm:no';

      if (isNo) {
        return {
          messages: [{ text: h(ctx, 'Purchase cancelled.', 'Purchase cancel ho gayi.') }],
          contextUpdate: { pendingPurchase: undefined },
        };
      }

      if (isYes) {
        return await executeAndReportPurchase(ctx, pending);
      }

      // Re-prompt
      return {
        messages: [{
          text: h(ctx, 'Shall I proceed with the purchase?', 'Purchase karein?'),
          buttons: [
            { text: h(ctx, 'Yes', 'Haan'), callbackData: 'purchase_confirm:yes' },
            { text: h(ctx, 'No', 'Nahi'), callbackData: 'purchase_confirm:no' },
          ],
        }],
      };
    }

    case 'confirm_offer': {
      if (message.startsWith('purchase_offer_confirm:')) {
        const answer = message.replace('purchase_offer_confirm:', '');
        if (answer === 'no') {
          return {
            messages: [{ text: h(ctx, 'Purchase cancelled.', 'Purchase cancel ho gayi.') }],
            contextUpdate: { pendingPurchase: undefined },
          };
        }
      }

      const isYes = ['yes', 'y', 'haan', 'ha', 'ok', 'sure', 'buy', 'kharid', 'purchase_offer_confirm:yes'].includes(lower)
        || message === 'purchase_offer_confirm:yes';
      const isNo = ['no', 'n', 'nahi', 'nope', 'cancel', 'purchase_offer_confirm:no'].includes(lower)
        || message === 'purchase_offer_confirm:no';

      if (isNo) {
        return {
          messages: [{ text: h(ctx, 'Purchase cancelled.', 'Purchase cancel ho gayi.') }],
          contextUpdate: { pendingPurchase: undefined },
        };
      }

      if (isYes) {
        // Need userId, transactionId, quantity, and at least one offer
        const hasOffer = pending.discoveredOffer || (pending.discoveredOffers && pending.discoveredOffers.length > 0);
        if (!ctx.userId || !pending.transactionId || !hasOffer || !pending.quantity) {
          return {
            messages: [{ text: h(ctx, 'Something went wrong. Please try again.', 'Kuch gadbad ho gayi. Dobara try karo.') }],
            contextUpdate: { pendingPurchase: undefined },
          };
        }

        const confirmMsg: AgentMessage = {
          text: h(ctx,
            'Completing your purchase...',
            'Aapki purchase complete kar raha hun...'
          ),
        };

        // Build the offer metadata for completePurchase (uses first offer for legacy fields)
        const primaryOffer = pending.discoveredOffer || (pending.discoveredOffers ? {
          offerId: pending.discoveredOffers[0].offerId,
          providerId: pending.discoveredOffers[0].providerId,
          providerName: pending.discoveredOffers[0].providerName,
          price: pending.discoveredOffers[0].price,
          quantity: pending.discoveredOffers[0].quantity,
          timeWindow: pending.discoveredOffers[0].timeWindow,
        } : undefined);

        const result = await completePurchase(
          ctx.userId,
          pending.transactionId,
          primaryOffer,
          pending.quantity
        );

        if (result.success) {
          // Multi-offer success display
          if (pending.selectionType === 'multiple' && pending.summary && pending.discoveredOffers) {
            const s = pending.summary;
            const offerList = pending.discoveredOffers.map((o, i) =>
              `${i + 1}. ${o.providerName}: ${o.quantity} kWh × Rs ${o.price}/unit`
            ).join('\n');
            const bulkInfo = result.bulkResult
              ? `\n• ${result.bulkResult.confirmedCount} order(s) confirmed`
              : '';

            return {
              messages: [
                confirmMsg,
                {
                  text: h(ctx,
                    `Purchase successful!\n\n${offerList}\n\n• Total: ${s.totalQuantity} kWh at avg Rs ${s.averagePrice.toFixed(2)}/unit\n• Amount: Rs ${s.totalPrice.toFixed(2)}${bulkInfo}\n• Time: ${pending.discoveredOffers[0].timeWindow}\n\nYour energy will be delivered via the grid. Payment is held in escrow until delivery is verified.`,
                    `Purchase ho gayi!\n\n${offerList}\n\n• Total: ${s.totalQuantity} kWh avg Rs ${s.averagePrice.toFixed(2)}/unit pe\n• Amount: Rs ${s.totalPrice.toFixed(2)}${bulkInfo}\n• Time: ${pending.discoveredOffers[0].timeWindow}\n\nAapki energy grid se deliver hogi. Payment escrow mein hai jab tak delivery verify nahi hoti.`
                  ),
                },
              ],
              contextUpdate: { pendingPurchase: undefined },
            };
          }

          // Single offer success display
          if (result.order) {
            const o = result.order;
            return {
              messages: [
                confirmMsg,
                {
                  text: h(ctx,
                    `Purchase successful!\n• ${o.quantity} kWh from ${o.providerName}\n• Rs ${o.pricePerKwh}/unit (Total: Rs ${o.totalPrice.toFixed(2)})\n• Time: ${o.timeWindow}\n\nYour energy will be delivered via the grid. Payment is held in escrow until delivery is verified.`,
                    `Purchase ho gayi!\n• ${o.quantity} kWh ${o.providerName} se\n• Rs ${o.pricePerKwh}/unit (Total: Rs ${o.totalPrice.toFixed(2)})\n• Time: ${o.timeWindow}\n\nAapki energy grid se deliver hogi. Payment escrow mein hai jab tak delivery verify nahi hoti.`
                  ),
                },
              ],
              contextUpdate: { pendingPurchase: undefined },
            };
          }
        }

        return {
          messages: [
            confirmMsg,
            { text: h(ctx,
              `Could not complete purchase: ${result.error || 'Unknown error'}. Please try again.`,
              `Purchase nahi ho payi: ${result.error || 'Unknown error'}. Dobara try karo.`
            ) },
          ],
          contextUpdate: { pendingPurchase: undefined },
        };
      }

      // Re-prompt
      const isMulti = pending.selectionType === 'multiple';
      return {
        messages: [{
          text: h(ctx,
            isMulti ? 'Do you want to buy all these offers?' : 'Do you want to buy this offer?',
            isMulti ? 'Ye saari offers khareedni hain?' : 'Ye offer khareedna hai?'
          ),
          buttons: [
            { text: h(ctx, 'Yes', 'Haan'), callbackData: 'purchase_offer_confirm:yes' },
            { text: h(ctx, 'No', 'Nahi'), callbackData: 'purchase_offer_confirm:no' },
          ],
        }],
      };
    }
  }

  return null;
}

/**
 * Execute the purchase and return result to user.
 */
async function executeAndReportPurchase(ctx: SessionContext, pending: PendingPurchase): Promise<AgentResponse> {
  if (!ctx.userId || !pending.quantity) {
    return {
      messages: [{ text: h(ctx, 'Something went wrong. Please try again.', 'Kuch gadbad ho gayi. Dobara try karo.') }],
      contextUpdate: { pendingPurchase: undefined },
    };
  }

  // Show "searching" message
  const searchMsg = h(ctx,
    'Searching for the best offer and processing your purchase...',
    'Sabse accha offer dhundh raha hun aur purchase process kar raha hun...'
  );

  const result = await executePurchase(ctx.userId, {
    quantity: pending.quantity,
    timeDesc: pending.timeDesc,
  });

  if (result.success && result.order) {
    const o = result.order;
    return {
      messages: [
        { text: searchMsg },
        {
          text: h(ctx,
            `Purchase successful!\n• ${o.quantity} kWh from ${o.providerName}\n• Rs ${o.pricePerKwh}/unit (Total: Rs ${o.totalPrice.toFixed(2)})\n• Time: ${o.timeWindow}\n\nYour energy will be delivered via the grid. Payment is held in escrow until delivery is verified.`,
            `Purchase ho gayi!\n• ${o.quantity} kWh ${o.providerName} se\n• Rs ${o.pricePerKwh}/unit (Total: Rs ${o.totalPrice.toFixed(2)})\n• Time: ${o.timeWindow}\n\nAapki energy grid se deliver hogi. Payment escrow mein hai jab tak delivery verify nahi hoti.`
          ),
        },
      ],
      contextUpdate: { pendingPurchase: undefined },
    };
  }

  return {
    messages: [
      { text: searchMsg },
      { text: h(ctx, `Could not complete purchase: ${result.error || 'Unknown error'}. Please try again.`, `Purchase nahi ho payi: ${result.error || 'Unknown error'}. Dobara try karo.`) },
    ],
    contextUpdate: { pendingPurchase: undefined },
  };
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

      // Free-text: Language was auto-detected by processMessage() before this handler ran
      // ctx.language is already set - acknowledge AND ask name in one message
      return {
        messages: [{
          text: h(ctx, 
            'Hi! Nice to meet you. What is your name?',
            'Haan! Aapse milke khushi hui. Aapka naam kya hai?'
          ),
        }],
        newState: 'WAITING_NAME',
        contextUpdate: { langPicked: true, nameAsked: true },
      };
    },
  },

  // Legacy: ASK_VOICE_PREF - voice toggle is now in header UI, but handle existing sessions
  ASK_VOICE_PREF: {
    async onEnter(ctx) {
      // Skip this state entirely - just transition to WAITING_NAME
      return {
        messages: [],
        newState: 'WAITING_NAME',
      };
    },
    async onMessage(ctx, message) {
      // If user somehow sends a message here, just move on
      return {
        messages: [],
        newState: 'WAITING_NAME',
      };
    },
  },

  WAITING_NAME: {
    async onEnter(ctx) {
      // Skip if name was already asked (from GREETING free-text flow)
      if (ctx.nameAsked) {
        return { messages: [] };
      }
      return {
        messages: [{ text: h(ctx, 'What is your name?', 'Aapka naam kya hai?') }],
      };
    },
    async onMessage(ctx, message) {
      // Try LLM-powered name extraction first (handles casual speech like "Uh, Jack, what's yours?")
      let name = await extractNameWithLLM(message);
      
      // Fall back to regex extraction if LLM unavailable or fails
      if (!name) {
        name = extractName(message);
      }
      
      if (!name || name.length < 2) {
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

        // Compose a welcome-back summary with LLM
        const summaryData = await getWelcomeBackData(ctx.userId);
        const credContext = 'User profile: Already onboarded and verified. Do NOT ask for credentials — they have already completed onboarding.';
        const composed = await composeResponse(
          'welcome back, give me a summary of my activity',
          `${credContext}\n\n${summaryData}`,
          ctx.language,
          n
        );

        return {
          messages: [{ text: composed || h(ctx, `Welcome back, ${n}!`, `Wapas swagat, ${n}!`) }],
          newState: 'GENERAL_CHAT',
          contextUpdate: { verifiedCreds, tradingActive: true },
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
      const verifiedCreds = ctx.verifiedCreds || (ctx.userId ? await getVerifiedCredentials(ctx.userId) : []);

      // --- Build user profile context so LLM knows credentials are already verified ---
      let userProfileContext = '';
      if (verifiedCreds.length > 0) {
        const DB_TYPE_TO_DISPLAY: Record<string, string> = {
          UTILITY_CUSTOMER: 'Utility Customer',
          GENERATION_PROFILE: 'Generation Profile (Solar)',
          CONSUMPTION_PROFILE: 'Consumption Profile',
          STORAGE_PROFILE: 'Storage Profile (Battery)',
          PROGRAM_ENROLLMENT: 'Program Enrollment',
        };
        const credNames = verifiedCreds.map(c => DB_TYPE_TO_DISPLAY[c] || c).join(', ');
        userProfileContext = `User profile: Already onboarded and verified. Verified credentials: ${credNames}. Do NOT ask the user to upload or provide any credentials — they have already completed onboarding.`;
      }

      // --- Handle pending listing flow (multi-turn detail gathering) ---
      if (ctx.pendingListing?.awaitingField) {
        const result = await handlePendingListingInput(ctx, message);
        if (result) return result;
      }

      // --- Handle pending purchase flow (multi-turn detail gathering) ---
      if (ctx.pendingPurchase?.awaitingField) {
        const result = await handlePendingPurchaseInput(ctx, message);
        if (result) return result;
      }

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
            // --- Credential gate: must have Generation Profile to sell ---
            if (!verifiedCreds.includes('GENERATION_PROFILE')) {
              return {
                messages: [
                  {
                    text: h(ctx,
                      'To sell energy, I need your solar generation credential first. This proves your solar panel capacity.\n\nYou can get it from your DISCOM or download a sample from the credential portal.',
                      'Energy bechne ke liye pehle aapka solar generation ka credential chahiye. Ye aapke solar panel ki capacity prove karta hai.\n\nYe aapko apni DISCOM se ya credential portal se mil jaayega.'
                    ),
                    buttons: [
                      { text: h(ctx, 'Upload credential', 'Credential upload karo'), callbackData: 'upload_gen_cred' },
                    ],
                  },
                ],
                newState: 'OFFER_OPTIONAL_CREDS',
                contextUpdate: { expectedCredType: 'GenerationProfileCredential' },
              };
            }

            // --- Gather missing details interactively ---
            const pending: PendingListing = {
              pricePerKwh: intent.params?.price_per_kwh,
              quantity: intent.params?.quantity_kwh,
              timeDesc: intent.params?.time_description,
            };

            const askResult = askNextListingDetail(ctx, pending);
            if (askResult) return askResult;

            // All details provided — create the listing
            return await createListingFromPending(ctx, pending);
          }

          case 'buy_energy': {
            // --- Credential gate: must have Consumption Profile to buy ---
            if (!verifiedCreds.includes('CONSUMPTION_PROFILE')) {
              return {
                messages: [
                  {
                    text: h(ctx,
                      'To buy energy, I need your consumption profile credential first. This proves your electricity connection and load capacity.\n\nYou can get it from your DISCOM or download a sample from the credential portal.',
                      'Energy khareedne ke liye pehle aapka consumption profile credential chahiye. Ye aapka bijli connection aur load capacity prove karta hai.\n\nYe aapko apni DISCOM se ya credential portal se mil jaayega.'
                    ),
                    buttons: [
                      { text: h(ctx, 'Upload credential', 'Credential upload karo'), callbackData: 'upload_cons_cred' },
                    ],
                  },
                ],
                newState: 'OFFER_OPTIONAL_CREDS',
                contextUpdate: { expectedCredType: 'ConsumptionProfileCredential' },
              };
            }

            // --- Gather missing details interactively ---
            const pendingBuy: PendingPurchase = {
              quantity: intent.params?.quantity_kwh,
              maxPrice: intent.params?.max_price,
              timeDesc: intent.params?.time_description,
            };

            const askBuyResult = askNextPurchaseDetail(ctx, pendingBuy);
            if (askBuyResult) return askBuyResult;

            // All details provided — discover best offer and show to user
            return await discoverAndShowOffer(ctx, pendingBuy);
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

      // --- Step 3: Compose natural response with LLM (with chat memory) ---
      if (dataContext || intent?.intent === 'general_qa' || !intent) {
        // Load recent chat history for short-term memory
        const chatHistory = ctx._sessionId ? await getRecentChatContext(ctx._sessionId) : '';
        const fullContext = [
          userProfileContext,
          chatHistory ? `Recent conversation:\n${chatHistory}` : '',
          dataContext || 'No specific data available. Answer based on general knowledge about Oorja P2P energy trading platform.',
        ].filter(Boolean).join('\n\n');
        const composed = await composeResponse(
          message,
          fullContext,
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
        if ((lower.includes('new') || lower.includes('create') || lower.includes('naya') || lower.includes('daal') || lower.includes('bana') || lower.includes('sell') || lower.includes('bech')) &&
            (lower.includes('offer') || lower.includes('listing') || lower.includes('energy') || lower.includes('bijli'))) {
          // Credential gate for keyword fallback too
          if (!verifiedCreds.includes('GENERATION_PROFILE')) {
            return {
              messages: [
                {
                  text: h(ctx,
                    'To sell energy, I need your solar generation credential first. This proves your solar panel capacity.',
                    'Energy bechne ke liye pehle aapka solar generation ka credential chahiye.'
                  ),
                  buttons: [
                    { text: h(ctx, 'Upload credential', 'Credential upload karo'), callbackData: 'upload_gen_cred' },
                  ],
                },
              ],
              newState: 'OFFER_OPTIONAL_CREDS',
              contextUpdate: { expectedCredType: 'GenerationProfileCredential' },
            };
          }
          // Start interactive listing creation
          const pending: PendingListing = {};
          const askResult = askNextListingDetail(ctx, pending);
          if (askResult) return askResult;
        }
        // Buy keyword fallback (includes "best deal", "find deal")
        if (((lower.includes('buy') || lower.includes('kharid') || lower.includes('chahiye') || lower.includes('purchase') || lower.includes('leni')) &&
            (lower.includes('energy') || lower.includes('bijli') || lower.includes('unit') || lower.includes('kwh'))) ||
            (lower.includes('best') && lower.includes('deal')) ||
            (lower.includes('find') && (lower.includes('deal') || lower.includes('offer'))) ||
            (lower.includes('acch') && lower.includes('deal'))) {
          // Credential gate for keyword fallback too
          if (!verifiedCreds.includes('CONSUMPTION_PROFILE')) {
            return {
              messages: [
                {
                  text: h(ctx,
                    'To buy energy, I need your consumption profile credential first.',
                    'Energy khareedne ke liye pehle aapka consumption profile credential chahiye.'
                  ),
                  buttons: [
                    { text: h(ctx, 'Upload credential', 'Credential upload karo'), callbackData: 'upload_cons_cred' },
                  ],
                },
              ],
              newState: 'OFFER_OPTIONAL_CREDS',
              contextUpdate: { expectedCredType: 'ConsumptionProfileCredential' },
            };
          }
          // Start interactive purchase
          const pendingBuy: PendingPurchase = {};
          const askBuyResult = askNextPurchaseDetail(ctx, pendingBuy);
          if (askBuyResult) return askBuyResult;
        }
      }

      // Last resort
      return {
        messages: [
          {
            text: h(ctx, 'I can help with:', 'Main yeh madad kar sakta hun:'),
            buttons: [
              { text: h(ctx, 'My orders', 'Mere orders'), callbackData: 'show my orders' },
              { text: h(ctx, 'My listings', 'Mere listings'), callbackData: 'show my listings' },
              { text: h(ctx, 'Sell energy', 'Energy bechna'), callbackData: 'I want to sell energy' },
              { text: h(ctx, 'Buy energy', 'Energy khareedna'), callbackData: 'I want to buy energy' },
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
  // For TTS purposes, treat hinglish as Hindi (hi-IN)
  if (targetLang === 'hinglish') {
    return { ...response, responseLanguage: 'hi-IN' };
  }

  const effectiveLang = targetLang as SarvamLangCode;
  if (effectiveLang === 'en-IN' || !isTranslationAvailable()) {
    return { ...response, responseLanguage: effectiveLang };
  }

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

  return { ...response, messages: translatedMessages, responseLanguage: effectiveLang };
}

// --- Main Entry Point ---

export async function processMessage(
  platform: 'TELEGRAM' | 'WEB' | 'WHATSAPP',
  platformId: string,
  userMessage: string,
  fileData?: FileData,
  authenticatedUserId?: string,
  voiceOptions?: VoiceInputOptions
): Promise<AgentResponse> {
  let session = await prisma.chatSession.findUnique({
    where: { platform_platformId: { platform, platformId } },
  });

  if (!session) {
    // --- Fast-track for authenticated users (logged in via app) ---
    if (authenticatedUserId) {
      const user = await prisma.user.findUnique({
        where: { id: authenticatedUserId },
        select: { id: true, name: true, profileComplete: true, providerId: true, phone: true, languagePreference: true },
      });

      if (user?.profileComplete) {
        // User already onboarded — skip straight to GENERAL_CHAT with welcome-back summary
        const verifiedCreds = await getVerifiedCredentials(user.id);
        const ctx: SessionContext = {
          userId: user.id,
          name: user.name || undefined,
          phone: user.phone || undefined,
          verifiedCreds,
          tradingActive: true,
          language: (user.languagePreference as any) || undefined,
        };

        session = await prisma.chatSession.upsert({
          where: { platform_platformId: { platform, platformId } },
          create: {
            platform,
            platformId,
            state: 'GENERAL_CHAT',
            contextJson: JSON.stringify(ctx),
            userId: user.id,
          },
          update: {
            state: 'GENERAL_CHAT',
            contextJson: JSON.stringify(ctx),
            userId: user.id,
          },
        });

        await storeMessage(session.id, 'user', userMessage);

        // Compose a welcome-back summary using LLM — respect saved language preference
        const savedLang = ctx.language;
        logger.info(`[Language] New session for user ${user.id}, saved preference: "${savedLang || 'none'}"`);
        const summaryData = await getWelcomeBackData(user.id);
        const credContext = 'User profile: Already onboarded and verified. Do NOT ask for credentials — they have already completed onboarding.';
        const welcomeMsg = await composeResponse(
          'welcome back, give me a summary of my activity',
          `${credContext}\n\n${summaryData}`,
          savedLang,
          user.name || undefined
        );

        const fallbackWelcome = savedLang === 'hinglish'
          ? `Wapas aaye ${user.name || 'dost'}! Aaj kya madad karun?`
          : `Welcome back, ${user.name || 'friend'}! How can I help you today?`;
        const messages: AgentMessage[] = [{ text: welcomeMsg || fallbackWelcome }];
        await storeAgentMessages(session.id, messages);

        return { messages };
      }

      if (user) {
        // User exists but hasn't completed onboarding — check how far they got
        const verifiedCreds = await getVerifiedCredentials(user.id);
        const ctx: SessionContext = {
          userId: user.id,
          name: user.name || undefined,
          phone: user.phone || undefined,
          verifiedCreds,
        };

        let startState: ChatState = 'ASK_DISCOM';
        if (verifiedCreds.includes('UTILITY_CUSTOMER')) {
          startState = 'ASK_INTENT';
        }

        session = await prisma.chatSession.upsert({
          where: { platform_platformId: { platform, platformId } },
          create: {
            platform,
            platformId,
            state: startState,
            contextJson: JSON.stringify(ctx),
            userId: user.id,
          },
          update: {
            state: startState,
            contextJson: JSON.stringify(ctx),
            userId: user.id,
          },
        });

        await storeMessage(session.id, 'user', userMessage);

        const welcomeMsg: AgentMessage = {
          text: `Welcome, ${user.name || 'friend'}! Let's finish setting up your profile.`,
        };
        const enterResp = await states[startState].onEnter(ctx);
        const allMessages = [welcomeMsg, ...enterResp.messages];
        await storeAgentMessages(session.id, allMessages);

        // Chain through if onEnter triggers a state transition
        if (enterResp.newState && enterResp.newState !== startState) {
          await transitionState(session.id, enterResp.newState, enterResp.contextUpdate);
          const chainResp = await states[enterResp.newState as ChatState].onEnter({ ...ctx, ...enterResp.contextUpdate });
          await storeAgentMessages(session.id, chainResp.messages);
          return { messages: [...allMessages, ...chainResp.messages] };
        }

        return { messages: allMessages };
      }
    }

    // --- Default: anonymous or unrecognized user — start from greeting ---
    session = await prisma.chatSession.upsert({
      where: { platform_platformId: { platform, platformId } },
      create: { platform, platformId, state: 'GREETING', contextJson: '{}' },
      update: { state: 'GREETING', contextJson: '{}' },
    });

    await storeMessage(session.id, 'user', userMessage);

    const ctx: SessionContext = {};
    const enterResp = await states.GREETING.onEnter(ctx);
    await storeAgentMessages(session.id, enterResp.messages);

    return { messages: enterResp.messages };
  }

  // Existing session
  await storeMessage(session.id, 'user', userMessage);
  const ctx = JSON.parse(session.contextJson) as SessionContext;
  ctx._sessionId = session.id; // Runtime-only, not persisted
  const currentState = session.state as ChatState;
  const stateHandler = states[currentState];

  if (!stateHandler) {
    logger.error(`Unknown state: ${currentState}`);
    return { messages: [{ text: 'Something went wrong. Please try again.' }] };
  }

  // Per-message language detection — dynamically switch language mid-conversation
  // For voice input, use the language detected by STT (already translated to English)
  // For text input, detect language from the text itself
  const isStructuredInput = /^\d+$/.test(userMessage.trim()) || userMessage.trim().length <= 3;
  const isCallbackData = userMessage.includes(':') && !userMessage.includes(' ');
  
  let detectedLang: SarvamLangCode | 'hinglish';
  let processedMessage = userMessage;
  
  if (voiceOptions?.isVoiceInput && voiceOptions.detectedLanguage) {
    // Voice input: STT already translated to English, use the detected language
    detectedLang = voiceOptions.detectedLanguage as SarvamLangCode;
    logger.info(`[Voice] Using STT-detected language: ${detectedLang}`);
    // Message is already in English from STT, no translation needed
  } else {
    // Text input: detect language from the text
    detectedLang = detectLanguage(userMessage);
    // Translate native-script messages to English for processing
    if (detectedLang !== 'en-IN' && detectedLang !== 'hinglish' && !isStructuredInput) {
      processedMessage = await translateToEnglish(userMessage, detectedLang as SarvamLangCode);
      logger.info(`Translated [${detectedLang} → en-IN]: "${userMessage}" → "${processedMessage}"`);
    }
  }

  // Determine effective language for this message:
  // 1. Structured input (numbers, callbacks) → keep existing preference
  // 2. Voice input with detected language → use that language
  // 3. Native Indic script detected → switch to that language
  // 4. Hinglish detected → switch to hinglish
  // 5. English detected (no Indic, no Hinglish) → switch to English
  let userLang: SarvamLangCode | 'hinglish';
  if (isStructuredInput || isCallbackData) {
    // Don't change language on button presses or numeric input
    userLang = (ctx.language || 'en-IN') as SarvamLangCode | 'hinglish';
  } else if (voiceOptions?.isVoiceInput && voiceOptions.detectedLanguage) {
    // Voice input: always use the STT-detected language
    userLang = voiceOptions.detectedLanguage as SarvamLangCode;
  } else if (detectedLang === 'hinglish') {
    userLang = 'hinglish';
  } else if (detectedLang !== 'en-IN') {
    // Native Indic script (Devanagari, Bengali, etc.)
    userLang = detectedLang;
  } else {
    // English detected — switch to English
    userLang = 'en-IN';
  }

  // Update language preference if changed — persist to session and user profile
  if (userLang !== ctx.language) {
    logger.info(`[Language] Switching: "${ctx.language || 'none'}" → "${userLang}" (detected: ${detectedLang}, input: "${userMessage.substring(0, 40)}")`);
    ctx.language = userLang;
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { contextJson: serializeContext(ctx) },
    });
    // Persist language preference to user profile for cross-session continuity
    if (ctx.userId) {
      prisma.user.update({
        where: { id: ctx.userId },
        data: { languagePreference: userLang },
      }).catch(() => {}); // Fire-and-forget, non-critical
    }
  } else {
    logger.debug(`[Language] Kept: "${userLang}" (detected: ${detectedLang})`);
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
    const voiceEnabled = chainCtx.voiceOutputEnabled;
    return translateResponse({ messages: allMessages, authToken, voiceOutputEnabled: voiceEnabled }, effectiveLang);
  }

  if (response.contextUpdate) {
    const merged = { ...ctx, ...response.contextUpdate };
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { contextJson: serializeContext(merged) },
    });
  }

  const effectiveLang = (response.contextUpdate?.language as any) || userLang;
  const mergedCtx = { ...ctx, ...response.contextUpdate };
  const voiceEnabled = mergedCtx.voiceOutputEnabled;
  return translateResponse({ ...response, voiceOutputEnabled: voiceEnabled }, effectiveLang);
}

// --- Helpers ---

/** Strip runtime-only fields (prefixed with _) before persisting */
function serializeContext(ctx: SessionContext): string {
  const { _sessionId, ...rest } = ctx;
  return JSON.stringify(rest);
}

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
      contextJson: serializeContext(merged),
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

/**
 * Load recent chat messages for short-term memory context.
 * Returns a formatted string of the last N messages (privacy-safe: no phone numbers or tokens).
 */
async function getRecentChatContext(sessionId: string, limit: number = 6): Promise<string> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { role: true, content: true },
    });

    if (messages.length === 0) return '';

    // Reverse to chronological order and format
    return messages.reverse().map(m => {
      const role = m.role === 'user' ? 'User' : 'Oorja';
      // Strip any sensitive data patterns (phone numbers, tokens)
      const safeContent = m.content
        .replace(/\b\d{10,12}\b/g, '[phone]')
        .replace(/Bearer\s+\S+/g, '[token]')
        .substring(0, 200);
      return `${role}: ${safeContent}`;
    }).join('\n');
  } catch {
    return '';
  }
}

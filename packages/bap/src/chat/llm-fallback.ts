/**
 * LLM Fallback — Uses OpenRouter to answer questions the knowledge base cannot handle.
 * Provides natural, context-aware answers about P2P energy trading.
 */

import axios from 'axios';
import { createLogger } from '@p2p/shared';

const logger = createLogger('OorjaLLM');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = `You are Oorja, a friendly and warm energy trading assistant for the Oorja P2P Energy Trading platform in India. You help rural farmers and small solar panel owners sell their extra solar energy to neighbors through the electricity grid.

Key facts about the platform:
- P2P (peer-to-peer) energy trading lets solar panel owners sell surplus energy directly to neighbors
- Sellers set their own price per kWh (unit). DISCOM rate is ~Rs 10/kWh for consumers. Sellers typically price Rs 5-8/kWh
- Selling back to grid (net metering) pays only Rs 2/kWh — P2P trading pays much more
- DISCOM is the local electricity distribution company that manages the grid and verifies energy delivery
- To start selling, a user needs a Generation Profile Credential (VC) — a digital certificate proving solar panel ownership and capacity
- The VC is issued by the user's DISCOM office. Common DISCOMs in India: BSES Rajdhani, BSES Yamuna, Tata Power, MSEDCL, BESCOM, CESC, TANGEDCO, UHBVN, DHBVN, PSPCL, JVVNL
- The user can download a sample VC from: https://open-vcs.up.railway.app
- Trade limit depends on solar panel capacity and trust score. New sellers start at 10% of production capacity
- Trust score (0-100%) increases with successful energy deliveries
- Payment is held in escrow until DISCOM verifies delivery
- Cancellation is allowed within 30 minutes. Seller cancellation has a penalty

Personality:
- Speak in simple, clear English. Avoid technical jargon
- Be warm, patient, and encouraging — these are farmers and first-time tech users
- Use short sentences. One idea per message
- When explaining something, use everyday analogies
- If unsure, say so honestly and offer to help with something else
- Keep answers brief (2-4 sentences max) unless they ask for detailed explanation

Important:
- Only answer questions about P2P energy trading, solar energy, the Oorja platform, electricity, DISCOMs, and related topics. For unrelated questions, politely redirect.
- If the conversation context mentions the user is already onboarded or has verified credentials, do NOT ask them to upload or provide credentials again. Help them with trading instead.`;

// --- Intent classification types ---

export interface ClassifiedIntent {
  intent: 'show_listings' | 'show_earnings' | 'show_balance' | 'show_orders' | 'show_sales'
    | 'create_listing' | 'buy_energy' | 'discom_rates' | 'trading_tips' | 'market_insights'
    | 'show_dashboard' | 'track_activity' | 'change_language' | 'general_qa';
  params?: {
    price_per_kwh?: number;
    quantity_kwh?: number;
    max_price?: number;
    time_description?: string;
    time_period?: string;
  };
}

const INTENT_PROMPT = `You are Oorja, a P2P energy trading assistant. Classify the user's message into ONE intent. The user may speak in English, Hindi (Hinglish/Roman Hindi), or a mix.

Intents:
- "show_listings": User wants to see their active listings/offers (e.g. "show my listings", "mere offers dikhao", "kitne listing hain")
- "show_earnings": User asks about income/earnings/money made (e.g. "kitna kamaya", "my earnings", "how much did I earn")
- "show_balance": User asks about wallet/account balance (e.g. "mere account mein kitne paise", "wallet balance")
- "show_orders": User asks about order status/history (e.g. "mera order kya hua", "show my orders")
- "show_sales": User asks about sales for a time period (e.g. "aaj kitna becha", "sold today", "is hafte ki bikri")
- "create_listing": User wants to CREATE/SELL a new energy listing/offer (e.g. "50 kWh Rs 6 pe daal do", "listing daalni hai", "naya offer banao", "sell 30 units at 7 rupees tomorrow")
- "buy_energy": User wants to BUY/PURCHASE energy or find the best deal (e.g. "buy 20 kWh", "energy khareedni hai", "bijli chahiye", "I want to buy energy", "mujhe 30 unit chahiye", "purchase solar energy", "find best deal", "find me the best deal", "sabse accha deal", "best offer dikhao")
- "market_insights": User asks about market conditions, prices, available offers, trends (e.g. "market insights", "market kaisa hai", "current prices", "what's the market like", "available energy", "show market", "market update", "price trends")
- "show_dashboard": User wants to see their dashboard or overall status (e.g. "show dashboard", "my dashboard", "mera dashboard", "overview", "my status")
- "track_activity": User wants to track BOTH orders AND earnings together (e.g. "track orders and earnings", "track activity", "my activity", "meri activity", "status dekho", "show status", "kya chal raha hai", "activity summary")
- "discom_rates": User asks about DISCOM/electricity rates or tariffs
- "trading_tips": User asks for tips on how to earn more or improve trading
- "change_language": User wants to change/switch their chat language (e.g. "change to Hindi", "switch language", "Tamil mein baat karo", "bhasha badlo", "I want to talk in Bengali")
- "general_qa": General question about energy trading, Oorja, solar, etc.

IMPORTANT: If the user says they want to "place", "create", "add", "daal", "bana", "list" something — that's "create_listing", NOT "show_listings" or "show_orders".
IMPORTANT: If the user says they want to "buy", "purchase", "kharid", "chahiye", "leni hai" energy — that's "buy_energy", NOT "create_listing".
IMPORTANT: When the user specifies all buy details in one message, extract ALL params. Examples:
  "buy 20 kWh at Rs 6 from 1-6 AM today" → {"intent": "buy_energy", "params": {"quantity_kwh": 20, "max_price": 6, "time_description": "1-6 AM today"}}
  "mujhe 30 unit chahiye Rs 7 pe kal subah 1 se 6 baje" → {"intent": "buy_energy", "params": {"quantity_kwh": 30, "max_price": 7, "time_description": "kal subah 1 se 6 baje"}}

For "create_listing", extract params if mentioned:
- price_per_kwh: number (Rs per unit/kWh)
- quantity_kwh: number (kWh or units)
- time_description: string (e.g. "tomorrow", "kal", "next week")

For "buy_energy", extract params if mentioned:
- quantity_kwh: number (kWh or units the user wants to buy)
- max_price: number (maximum Rs per unit the user is willing to pay)
- time_description: string — preserve the EXACT time phrase the user said (e.g. "1-6 AM today", "2 to 8 PM tomorrow", "kal subah 1 se 6 baje", "tomorrow morning", "today evening"). Do NOT simplify or normalize the time.

For "show_sales", extract:
- time_period: string (e.g. "today", "aaj", "this week", "is hafte")

Respond ONLY with valid JSON, no markdown, no explanation:
{"intent": "...", "params": {...}}`;

/**
 * Classify user intent using LLM. Returns null if LLM unavailable.
 */
export async function classifyIntent(userMessage: string): Promise<ClassifiedIntent | null> {
  if (!OPENROUTER_API_KEY) return null;

  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: INTENT_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://p2p-energy-trading.local',
          'X-Title': 'Oorja Intent Classifier',
        },
        timeout: 10000,
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;

    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    logger.debug(`Intent: "${userMessage.substring(0, 50)}" → ${parsed.intent}`);
    return parsed as ClassifiedIntent;
  } catch (error: any) {
    logger.warn(`Intent classification failed: ${error.message}`);
    return null;
  }
}

/**
 * Ask the LLM a question with optional conversation context.
 * Returns null if the LLM is not configured or fails.
 */
export async function askLLM(
  userMessage: string,
  conversationContext?: string
): Promise<string | null> {
  if (!OPENROUTER_API_KEY) {
    logger.debug('OpenRouter not configured — skipping LLM fallback');
    return null;
  }

  try {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    if (conversationContext) {
      messages.push({ role: 'system', content: `Current conversation context: ${conversationContext}` });
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://p2p-energy-trading.local',
          'X-Title': 'Oorja Chat Agent',
        },
        timeout: 15000,
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (reply) {
      logger.debug(`LLM response for "${userMessage.substring(0, 40)}...": ${reply.substring(0, 80)}...`);
      return reply;
    }

    return null;
  } catch (error: any) {
    logger.warn(`LLM fallback failed: ${error.message}`);
    return null;
  }
}

// --- Natural response composition ---

const COMPOSE_PROMPT = `You are Oorja, a warm and friendly P2P energy trading assistant in India. You help farmers and small solar panel owners trade surplus solar energy.

CRITICAL LANGUAGE RULES:
- If told to reply in Hinglish: Use Roman Hindi script (NOT Devanagari). Mix Hindi and English naturally. Example: "Bhai, aapne 45 kWh bech ke Rs 270 kamaye! Bahut accha chal raha hai."
- If told to reply in English: Use simple, clear English.

RESPONSE STYLE:
- Talk like a helpful friend/neighbor, not a robot
- Weave data naturally into sentences — NO bullet-point lists, NO "\\n-" formatting
- Keep it concise (2-4 sentences)
- Be encouraging about their trading progress
- If they created something, be enthusiastic
- If they have no data yet, encourage them warmly
- If asked about something unrelated, gently redirect to energy trading
- Use Rs (not ₹) for currency
- Address by name when available

IMPORTANT: If the data context says the user is "already onboarded" or has "verified credentials", NEVER ask them to upload, provide, or submit any credentials or documents. They have already completed this step. Focus on helping them with trading, earnings, listings, and other platform features instead.`;

/**
 * Extract a person's name from natural speech using LLM.
 * Handles casual responses like "Uh, Jack, what's yours?" → "Jack"
 * Returns null if LLM unavailable or fails.
 */
export async function extractNameWithLLM(userMessage: string): Promise<string | null> {
  if (!OPENROUTER_API_KEY) return null;

  const NAME_EXTRACT_PROMPT = `Extract the person's NAME from this message. The user was asked "What is your name?" and responded with this message.

Rules:
- Return ONLY the name, nothing else
- Remove filler words (uh, um, well, etc.)
- Remove questions they ask back (like "what's yours?", "and you?")
- If they say "My name is X" or "I'm X" or "Call me X", extract X
- If they just say a name like "Jack" or "Priya", return that
- Handle Hindi/Hinglish: "Mera naam Raj hai" → "Raj"
- If you cannot find a clear name, return "UNCLEAR"

Examples:
- "Uh, Jack, what's yours?" → "Jack"
- "My name is Priya" → "Priya"
- "I'm John, nice to meet you" → "John"
- "Mera naam Raj hai" → "Raj"
- "Call me Sam" → "Sam"
- "Jack" → "Jack"
- "Hello there" → "UNCLEAR"

User's message: "${userMessage}"

Return ONLY the extracted name (one or two words max) or "UNCLEAR":`;

  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'user', content: NAME_EXTRACT_PROMPT },
        ],
        temperature: 0.1,
        max_tokens: 20,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://p2p-energy-trading.local',
          'X-Title': 'Oorja Name Extractor',
        },
        timeout: 5000,
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (reply && reply !== 'UNCLEAR' && reply.length >= 2 && reply.length <= 50) {
      // Clean up any quotes or extra punctuation
      const cleaned = reply.replace(/^["']|["']$/g, '').trim();
      logger.debug(`Name extracted: "${userMessage.substring(0, 30)}..." → "${cleaned}"`);
      return cleaned;
    }
    return null;
  } catch (error: any) {
    logger.warn(`Name extraction failed: ${error.message}`);
    return null;
  }
}

/**
 * Compose a natural, conversational response using LLM.
 * Takes the user's message, relevant data, and user context.
 * Returns null if LLM unavailable or fails.
 */
export async function composeResponse(
  userMessage: string,
  dataContext: string,
  language: string | undefined,
  userName?: string
): Promise<string | null> {
  if (!OPENROUTER_API_KEY) return null;

  const LANG_NAMES: Record<string, string> = {
    'hi-IN': 'Hindi', 'bn-IN': 'Bengali', 'gu-IN': 'Gujarati', 'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam', 'mr-IN': 'Marathi', 'od-IN': 'Odia', 'pa-IN': 'Punjabi',
    'ta-IN': 'Tamil', 'te-IN': 'Telugu',
  };
  let langInstruction: string;
  if (language === 'hinglish') {
    langInstruction = 'Reply in Hinglish (Roman Hindi script, NOT Devanagari).';
  } else if (language && LANG_NAMES[language]) {
    langInstruction = `Reply in ${LANG_NAMES[language]} using the native script. Keep it simple and conversational.`;
  } else {
    langInstruction = 'Reply in simple English.';
  }

  const nameNote = userName ? `User's name is ${userName}.` : '';

  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: COMPOSE_PROMPT },
          {
            role: 'user',
            content: `${langInstruction} ${nameNote}\n\nUser said: "${userMessage}"\n\nRelevant data:\n${dataContext || 'No specific data available.'}\n\nCompose a natural, friendly response.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://p2p-energy-trading.local',
          'X-Title': 'Oorja Response Composer',
        },
        timeout: 15000,
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (reply) {
      logger.debug(`Composed: "${userMessage.substring(0, 30)}..." → "${reply.substring(0, 80)}..."`);
      return reply;
    }
    return null;
  } catch (error: any) {
    logger.warn(`Response composition failed: ${error.message}`);
    return null;
  }
}

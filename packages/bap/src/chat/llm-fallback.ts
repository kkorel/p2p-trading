/**
 * LLM Fallback — Uses OpenRouter to answer questions the knowledge base cannot handle.
 * Provides natural, context-aware answers about P2P energy trading.
 */

import axios from 'axios';
import { createLogger } from '@p2p/shared';

const logger = createLogger('OorjaLLM');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';

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

Important: Only answer questions about P2P energy trading, solar energy, the Oorja platform, electricity, DISCOMs, and related topics. For unrelated questions, politely redirect.`;

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

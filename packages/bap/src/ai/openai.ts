/**
 * OpenAI Integration Module
 * Handles LLM communication for AI trading agents with function calling
 */

import { config, createLogger } from '@p2p/shared';
import {
  Agent,
  AgentConfig,
  MarketContext,
  MarketOffer,
  AgentDecision,
} from './types';

const logger = createLogger('OpenAI');

// OpenAI API types (minimal, to avoid large dependency)
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  max_tokens?: number;
  temperature?: number;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ==================== Tool Definitions ====================

const AGENT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'propose_trade',
      description: 'Propose a trade for user approval (or immediate execution in auto mode). Use this when you identify a good trading opportunity.',
      parameters: {
        type: 'object',
        properties: {
          offer_id: {
            type: 'string',
            description: 'The ID of the offer to trade on',
          },
          quantity: {
            type: 'number',
            description: 'The quantity in kWh to trade',
          },
          reasoning: {
            type: 'string',
            description: 'Clear explanation of why this trade is recommended',
          },
        },
        required: ['offer_id', 'quantity', 'reasoning'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wait',
      description: 'Decide to take no action this cycle. Use this when market conditions are not favorable or constraints are not met.',
      parameters: {
        type: 'object',
        properties: {
          reasoning: {
            type: 'string',
            description: 'Explanation of why no action is recommended right now',
          },
        },
        required: ['reasoning'],
      },
    },
  },
];

// ==================== System Prompt Builder ====================

function buildSystemPrompt(agent: Agent): string {
  const cfg = agent.config;
  const role = agent.type === 'buyer' ? 'BUYER' : 'SELLER';
  
  let constraints = '';
  
  if (agent.type === 'buyer') {
    if (cfg.maxPricePerKwh) {
      constraints += `- Maximum price: $${cfg.maxPricePerKwh}/kWh\n`;
    }
    if (cfg.preferredSources && cfg.preferredSources.length > 0) {
      constraints += `- Preferred energy sources: ${cfg.preferredSources.join(', ')}\n`;
    }
  } else {
    if (cfg.minPricePerKwh) {
      constraints += `- Minimum price: $${cfg.minPricePerKwh}/kWh\n`;
    }
  }
  
  if (cfg.minQuantity) {
    constraints += `- Minimum quantity per trade: ${cfg.minQuantity} kWh\n`;
  }
  if (cfg.maxQuantity) {
    constraints += `- Maximum quantity per trade: ${cfg.maxQuantity} kWh\n`;
  }
  if (cfg.dailyLimit) {
    constraints += `- Daily trading limit: ${cfg.dailyLimit} kWh\n`;
  }
  if (cfg.minTrustScore) {
    constraints += `- Minimum counterparty trust score: ${(cfg.minTrustScore * 100).toFixed(0)}%\n`;
  }
  
  const riskProfile = cfg.riskTolerance || 'medium';
  let riskGuidance = '';
  if (riskProfile === 'low') {
    riskGuidance = 'Be conservative. Only trade with high-trust counterparties and favorable prices. When in doubt, wait.';
  } else if (riskProfile === 'high') {
    riskGuidance = 'Be opportunistic. Accept moderate risks for better prices. Act quickly on good opportunities.';
  } else {
    riskGuidance = 'Balance risk and reward. Consider both price and trust factors carefully.';
  }
  
  const customInstructions = cfg.customInstructions 
    ? `\nUSER INSTRUCTIONS:\n${cfg.customInstructions}\n`
    : '';
  
  const modeExplanation = agent.execution_mode === 'auto'
    ? 'You are in AUTO-EXECUTE mode. Your trade proposals will be executed immediately without user approval.'
    : 'You are in APPROVAL mode. Your trade proposals will be sent to the user for approval before execution.';
  
  return `You are an AI trading agent for a P2P energy trading platform.

ROLE: ${role}
AGENT NAME: ${agent.name}
EXECUTION MODE: ${agent.execution_mode.toUpperCase()}
${modeExplanation}

YOUR CONSTRAINTS:
${constraints || '- No specific constraints configured\n'}

RISK PROFILE: ${riskProfile.toUpperCase()}
${riskGuidance}
${customInstructions}

INSTRUCTIONS:
1. Analyze the current market offers provided to you
2. Evaluate each offer against your constraints and role
3. As a ${role}, you want to ${agent.type === 'buyer' ? 'BUY energy at the lowest price from trusted sellers' : 'SELL energy at the highest price to trusted buyers'}
4. Consider: price, quantity available, counterparty trust score, and time windows
5. If you find a suitable opportunity, call propose_trade with your recommendation
6. If no good opportunities exist, call wait and explain why

DECISION CRITERIA:
- Price: ${agent.type === 'buyer' ? 'Lower is better' : 'Higher is better'}
- Trust Score: Higher is better (0-100%, aim for 60%+ for safety)
- Quantity: Must fit within your min/max constraints
- Time Window: Consider if the delivery window works for you

Always provide clear reasoning for your decisions. Be specific about which offer you're choosing and why.`;
}

// ==================== User Prompt Builder ====================

function buildUserPrompt(context: MarketContext, agentType: 'buyer' | 'seller'): string {
  const { offers, account_balance, daily_traded_quantity, daily_limit, timestamp, recently_rejected } = context;
  
  // Build rejection notice if there are recently rejected offers
  let rejectionNotice = '';
  if (recently_rejected && recently_rejected.length > 0) {
    rejectionNotice = `
IMPORTANT - RECENTLY REJECTED:
The user has recently rejected proposals for the following offers. Do NOT propose these again - they have been filtered from the available offers list. Consider waiting or looking for different opportunities.
Rejected offer IDs: ${recently_rejected.map(r => r.offer_id).join(', ')}
`;
  }
  
  if (offers.length === 0) {
    const noOffersReason = (recently_rejected && recently_rejected.length > 0)
      ? 'All available offers have been recently rejected by the user, or no new offers exist.'
      : 'No offers currently available in the market.';
    
    return `MARKET STATUS (${timestamp})
${rejectionNotice}
${noOffersReason}

Account Balance: $${account_balance.toFixed(2)}
Daily Traded: ${daily_traded_quantity} kWh${daily_limit ? ` / ${daily_limit} kWh limit` : ''}

Since there are no suitable offers available, please call the 'wait' function and explain the situation.`;
  }
  
  const offersText = offers.map((offer, idx) => {
    return `[${idx + 1}] Offer ID: ${offer.id}
    Provider: ${offer.provider_name} (ID: ${offer.provider_id})
    Trust Score: ${(offer.provider_trust_score * 100).toFixed(0)}%
    Energy Source: ${offer.source_type}
    Price: $${offer.price_per_kwh.toFixed(4)}/kWh
    Available Quantity: ${offer.max_quantity} kWh
    Time Window: ${offer.time_window.start} to ${offer.time_window.end}`;
  }).join('\n\n');
  
  // Calculate market stats
  const prices = offers.map(o => o.price_per_kwh);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const avgTrust = offers.reduce((a, o) => a + o.provider_trust_score, 0) / offers.length;
  
  return `MARKET STATUS (${timestamp})
${rejectionNotice}
SUMMARY:
- Total Offers: ${offers.length}
- Price Range: $${minPrice.toFixed(4)} - $${maxPrice.toFixed(4)}/kWh
- Average Price: $${avgPrice.toFixed(4)}/kWh
- Average Trust: ${(avgTrust * 100).toFixed(0)}%

YOUR ACCOUNT:
- Balance: $${account_balance.toFixed(2)}
- Daily Traded: ${daily_traded_quantity} kWh${daily_limit ? ` / ${daily_limit} kWh limit` : ''}
${daily_limit ? `- Remaining Daily Allowance: ${Math.max(0, daily_limit - daily_traded_quantity)} kWh` : ''}

AVAILABLE OFFERS:
${offersText}

Analyze these offers and decide whether to propose a trade or wait. Remember your role as a ${agentType.toUpperCase()} - you want to ${agentType === 'buyer' ? 'buy at the best price' : 'sell at the best price'}.`;
}

// ==================== OpenAI API Call ====================

async function callOpenAI(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const apiKey = config.ai.openaiApiKey;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured. Set it in environment variables.');
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }
  
  return response.json() as Promise<ChatCompletionResponse>;
}

// ==================== Main Agent Analysis Function ====================

export async function analyzeMarketAndDecide(
  agent: Agent,
  marketContext: MarketContext
): Promise<AgentDecision> {
  const systemPrompt = buildSystemPrompt(agent);
  const userPrompt = buildUserPrompt(marketContext, agent.type);
  
  logger.info(`[${agent.name}] Analyzing market with ${marketContext.offers.length} offers...`);
  
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  
  try {
    const response = await callOpenAI({
      model: config.ai.model,
      messages,
      tools: AGENT_TOOLS,
      tool_choice: 'auto',
      max_tokens: config.ai.maxTokens,
      temperature: 0.3, // Lower temperature for more consistent decisions
    });
    
    const choice = response.choices[0];
    const message = choice.message;
    
    logger.debug(`[${agent.name}] LLM response finish_reason: ${choice.finish_reason}`, {
      tokens: response.usage,
    });
    
    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      if (toolCall.function.name === 'propose_trade') {
        logger.info(`[${agent.name}] Decision: PROPOSE TRADE`, {
          offer_id: args.offer_id,
          quantity: args.quantity,
        });
        
        return {
          action: 'propose_trade',
          offer_id: args.offer_id,
          quantity: args.quantity,
          reasoning: args.reasoning,
          confidence: 0.8, // Default confidence
        };
      } else if (toolCall.function.name === 'wait') {
        logger.info(`[${agent.name}] Decision: WAIT`, {
          reasoning: args.reasoning?.substring(0, 100),
        });
        
        return {
          action: 'wait',
          reasoning: args.reasoning,
        };
      }
    }
    
    // If no tool call, treat response content as reasoning to wait
    const reasoning = message.content || 'No specific action determined by agent';
    logger.info(`[${agent.name}] Decision: WAIT (no tool call)`, {
      reasoning: reasoning.substring(0, 100),
    });
    
    return {
      action: 'wait',
      reasoning,
    };
    
  } catch (error: any) {
    logger.error(`[${agent.name}] LLM analysis failed: ${error.message}`);
    
    return {
      action: 'error',
      reasoning: `Analysis failed: ${error.message}`,
    };
  }
}

// ==================== Utility: Check if OpenAI is configured ====================

export function isOpenAIConfigured(): boolean {
  return !!config.ai.openaiApiKey;
}

// ==================== Export tool definitions for reference ====================

export { AGENT_TOOLS };

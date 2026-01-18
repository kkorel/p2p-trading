/**
 * AI Trading Agent Types
 */

// ==================== Agent Types ====================

export type AgentType = 'buyer' | 'seller';
export type AgentStatus = 'active' | 'paused' | 'stopped';
export type ExecutionMode = 'auto' | 'approval';

export interface AgentConfig {
  // Price constraints
  maxPricePerKwh?: number;      // For buyers: max price willing to pay
  minPricePerKwh?: number;      // For sellers: min price willing to accept
  
  // Quantity constraints
  minQuantity?: number;          // Min kWh per trade
  maxQuantity?: number;          // Max kWh per trade
  dailyLimit?: number;           // Max kWh per day
  
  // Trust constraints
  minTrustScore?: number;        // Min counterparty trust (0-1)
  
  // Time constraints
  preferredTimeWindows?: Array<{
    startHour: number;           // 0-23
    endHour: number;             // 0-23
  }>;
  
  // Energy preferences (for buyers)
  preferredSources?: Array<'SOLAR' | 'WIND' | 'HYDRO'>;
  
  // Risk tolerance
  riskTolerance?: 'low' | 'medium' | 'high';
  
  // Custom instructions for the LLM
  customInstructions?: string;
}

export interface Agent {
  id: string;
  name: string;
  owner_id: string;              // 'platform' for shared agent
  type: AgentType;
  status: AgentStatus;
  execution_mode: ExecutionMode;
  config: AgentConfig;
  created_at: string;
  updated_at: string;
}

export interface AgentRow {
  id: string;
  name: string;
  owner_id: string;
  type: string;
  status: string;
  execution_mode: string;
  config_json: string;
  created_at: string;
  updated_at: string;
}

// ==================== Trade Proposal Types ====================

export type ProposalAction = 'buy' | 'sell';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';

export interface TradeProposal {
  id: string;
  agent_id: string;
  action: ProposalAction;
  offer_id: string | null;
  quantity: number;
  price_per_unit: number | null;
  total_price: number | null;
  reasoning: string | null;
  status: ProposalStatus;
  transaction_id: string | null;
  order_id: string | null;
  created_at: string;
  decided_at: string | null;
  executed_at: string | null;
}

export interface TradeProposalRow {
  id: string;
  agent_id: string;
  action: string;
  offer_id: string | null;
  quantity: number;
  price_per_unit: number | null;
  total_price: number | null;
  reasoning: string | null;
  status: string;
  transaction_id: string | null;
  order_id: string | null;
  created_at: string;
  decided_at: string | null;
  executed_at: string | null;
}

// ==================== Agent Log Types ====================

export type AgentLogEventType = 
  | 'analysis' 
  | 'proposal' 
  | 'execution' 
  | 'approval' 
  | 'rejection' 
  | 'error' 
  | 'start' 
  | 'stop';

export interface AgentLogDetails {
  message?: string;
  offers_analyzed?: number;
  proposal_id?: string;
  transaction_id?: string;
  order_id?: string;
  error?: string;
  reasoning?: string;
  market_summary?: {
    total_offers: number;
    price_range: { min: number; max: number };
    avg_trust_score: number;
  };
  decision?: string;
  [key: string]: unknown;
}

export interface AgentLog {
  id: string;
  agent_id: string;
  event_type: AgentLogEventType;
  details: AgentLogDetails;
  created_at: string;
}

export interface AgentLogRow {
  id: string;
  agent_id: string;
  event_type: string;
  details_json: string;
  created_at: string;
}

// ==================== LLM Types ====================

export interface MarketOffer {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_trust_score: number;
  source_type: string;
  price_per_kwh: number;
  currency: string;
  max_quantity: number;
  time_window: {
    start: string;
    end: string;
  };
}

export interface RejectedOffer {
  offer_id: string;
  rejected_at: string;
}

export interface MarketContext {
  offers: MarketOffer[];
  account_balance: number;
  currency: string;
  daily_traded_quantity: number;
  daily_limit: number | null;
  timestamp: string;
  /** Offers that were recently rejected by the user - don't propose these again */
  recently_rejected?: RejectedOffer[];
}

export interface AgentDecision {
  action: 'propose_trade' | 'wait' | 'error';
  offer_id?: string;
  quantity?: number;
  reasoning: string;
  confidence?: number;
}

// ==================== OpenAI Function Calling Types ====================

export interface AnalyzeMarketParams {
  // No params needed, market data provided in context
}

export interface ProposeTradeParams {
  offer_id: string;
  quantity: number;
  reasoning: string;
}

export interface ExecuteTradeParams {
  offer_id: string;
  quantity: number;
}

export interface WaitParams {
  reasoning: string;
}

export type AgentToolName = 'analyze_market' | 'propose_trade' | 'execute_trade' | 'wait';

export interface AgentToolCall {
  name: AgentToolName;
  arguments: AnalyzeMarketParams | ProposeTradeParams | ExecuteTradeParams | WaitParams;
}

// ==================== API Types ====================

export interface CreateAgentRequest {
  name: string;
  type: AgentType;
  execution_mode?: ExecutionMode;
  config?: AgentConfig;
}

export interface UpdateAgentRequest {
  name?: string;
  execution_mode?: ExecutionMode;
  config?: AgentConfig;
}

export interface AgentResponse {
  status: 'ok' | 'error';
  agent?: Agent;
  agents?: Agent[];
  error?: string;
}

export interface ProposalResponse {
  status: 'ok' | 'error';
  proposal?: TradeProposal;
  proposals?: TradeProposal[];
  error?: string;
}

export interface AgentLogResponse {
  status: 'ok' | 'error';
  logs?: AgentLog[];
  error?: string;
}

// ==================== Conversion Helpers ====================

export function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    owner_id: row.owner_id,
    type: row.type as AgentType,
    status: row.status as AgentStatus,
    execution_mode: row.execution_mode as ExecutionMode,
    config: JSON.parse(row.config_json || '{}'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function rowToProposal(row: TradeProposalRow): TradeProposal {
  return {
    id: row.id,
    agent_id: row.agent_id,
    action: row.action as ProposalAction,
    offer_id: row.offer_id,
    quantity: row.quantity,
    price_per_unit: row.price_per_unit,
    total_price: row.total_price,
    reasoning: row.reasoning,
    status: row.status as ProposalStatus,
    transaction_id: row.transaction_id,
    order_id: row.order_id,
    created_at: row.created_at,
    decided_at: row.decided_at,
    executed_at: row.executed_at,
  };
}

export function rowToLog(row: AgentLogRow): AgentLog {
  return {
    id: row.id,
    agent_id: row.agent_id,
    event_type: row.event_type as AgentLogEventType,
    details: JSON.parse(row.details_json || '{}'),
    created_at: row.created_at,
  };
}

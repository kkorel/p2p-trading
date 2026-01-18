/**
 * AI Trading Agents Module
 * Export all AI-related functionality
 */

// Types
export * from './types';

// OpenAI integration
export { analyzeMarketAndDecide, isOpenAIConfigured, AGENT_TOOLS } from './openai';

// Agent engine (core logic)
export {
  // Agent CRUD
  getAgent,
  getActiveAgents,
  getAllAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  
  // Proposal operations
  createProposal,
  getProposal,
  getPendingProposals,
  getAllProposals,
  updateProposalStatus,
  getRecentlyRejectedOfferIds,
  getRecentRejections,
  
  // Logging
  logAgentEvent,
  getAgentLogs,
  
  // Agent cycle
  runAgentCycle,
  
  // Proposal actions
  approveProposal,
  rejectProposal,
  
  // Agent control
  startAgent,
  stopAgent,
  pauseAgent,
} from './agent-engine';

// Scheduler
export {
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
  getSchedulerStatus,
  triggerAgentCycle,
} from './agent-scheduler';

/**
 * Agent Scheduler
 * Periodically runs active agents and manages their execution cycles
 */

import { createLogger, config } from '@p2p/shared';
import { getActiveAgents, runAgentCycle, getPendingProposals, updateProposalStatus } from './agent-engine';
import { Agent } from './types';

const logger = createLogger('AgentScheduler');

// ==================== Scheduler State ====================

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;
let lastRunTime: Date | null = null;
let cycleCount = 0;

// Track which agents are currently being processed to avoid overlap
const processingAgents = new Set<string>();

// ==================== Scheduler Control ====================

export function startScheduler(): void {
  if (schedulerInterval) {
    logger.warn('Scheduler already running');
    return;
  }
  
  const intervalMs = config.agents.cycleIntervalMs;
  
  logger.info(`Starting agent scheduler with ${intervalMs}ms interval`);
  
  // Run immediately on start
  runSchedulerCycle();
  
  // Then run periodically
  schedulerInterval = setInterval(runSchedulerCycle, intervalMs);
  isRunning = true;
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    isRunning = false;
    logger.info('Agent scheduler stopped');
  }
}

export function isSchedulerRunning(): boolean {
  return isRunning;
}

export async function getSchedulerStatus(): Promise<{
  running: boolean;
  lastRunTime: string | null;
  cycleCount: number;
  processingAgents: string[];
  intervalMs: number;
  pendingApprovals: number;
  maxPendingApprovals: number;
  throttled: boolean;
}> {
  // Get pending approvals count
  const pendingProposals = await getPendingProposals();
  const pendingCount = pendingProposals.length;
  const maxPending = 5; // Same as MAX_PENDING_APPROVALS in agent-engine
  
  return {
    running: isRunning,
    lastRunTime: lastRunTime?.toISOString() || null,
    cycleCount,
    processingAgents: Array.from(processingAgents),
    intervalMs: config.agents.cycleIntervalMs,
    pendingApprovals: pendingCount,
    maxPendingApprovals: maxPending,
    throttled: pendingCount >= maxPending,
  };
}

// ==================== Main Scheduler Cycle ====================

async function runSchedulerCycle(): Promise<void> {
  cycleCount++;
  lastRunTime = new Date();
  
  logger.debug(`Scheduler cycle #${cycleCount} starting...`);
  
  try {
    // Get all active agents
    const activeAgents = await getActiveAgents();
    
    if (activeAgents.length === 0) {
      logger.debug('No active agents to run');
      return;
    }
    
    logger.info(`Running ${activeAgents.length} active agent(s)...`);
    
    // Filter out agents that are already being processed
    const agentsToRun = activeAgents.filter(agent => !processingAgents.has(agent.id));
    
    // Limit concurrent agents
    const maxConcurrent = config.agents.maxConcurrent;
    const agentsThisCycle = agentsToRun.slice(0, maxConcurrent);
    
    if (agentsThisCycle.length < agentsToRun.length) {
      logger.warn(`Limiting to ${maxConcurrent} concurrent agents (${agentsToRun.length} waiting)`);
    }
    
    // Run agents in parallel
    const promises = agentsThisCycle.map(agent => runAgentSafely(agent));
    await Promise.allSettled(promises);
    
    // Expire old proposals
    await expireOldProposals();
    
    logger.debug(`Scheduler cycle #${cycleCount} complete`);
    
  } catch (error: any) {
    logger.error(`Scheduler cycle failed: ${error.message}`);
  }
}

// ==================== Safe Agent Execution ====================

async function runAgentSafely(agent: Agent): Promise<void> {
  if (processingAgents.has(agent.id)) {
    logger.warn(`[${agent.name}] Already processing, skipping`);
    return;
  }
  
  processingAgents.add(agent.id);
  
  try {
    await runAgentCycle(agent);
  } catch (error: any) {
    logger.error(`[${agent.name}] Unhandled error: ${error.message}`);
  } finally {
    processingAgents.delete(agent.id);
  }
}

// ==================== Proposal Expiry ====================

async function expireOldProposals(): Promise<void> {
  try {
    const pendingProposals = await getPendingProposals();
    const expiryMs = config.agents.proposalExpiryMs;
    const now = Date.now();
    
    let expiredCount = 0;
    
    for (const proposal of pendingProposals) {
      const createdAt = new Date(proposal.created_at).getTime();
      if (now - createdAt > expiryMs) {
        await updateProposalStatus(proposal.id, 'expired');
        expiredCount++;
        logger.debug(`Expired proposal ${proposal.id}`);
      }
    }
    
    if (expiredCount > 0) {
      logger.info(`Expired ${expiredCount} old proposal(s)`);
    }
    
  } catch (error: any) {
    logger.error(`Failed to expire proposals: ${error.message}`);
  }
}

// ==================== Manual Trigger ====================

export async function triggerAgentCycle(agentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { getAgent, runAgentCycle } = await import('./agent-engine');
    
    const agent = await getAgent(agentId);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }
    
    if (processingAgents.has(agentId)) {
      return { success: false, error: 'Agent is currently processing' };
    }
    
    // Run the agent
    await runAgentSafely(agent);
    
    return { success: true };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

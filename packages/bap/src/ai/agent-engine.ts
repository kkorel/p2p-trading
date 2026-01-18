/**
 * Agent Engine
 * Core logic for running AI trading agents - market analysis, decision making, and execution
 */

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { createLogger, config } from '@p2p/shared';
import { waitForDb, saveDb } from '../db';
import {
  Agent,
  AgentRow,
  TradeProposal,
  TradeProposalRow,
  AgentLog,
  AgentLogRow,
  AgentLogEventType,
  AgentLogDetails,
  MarketContext,
  MarketOffer,
  AgentDecision,
  rowToAgent,
  rowToProposal,
  rowToLog,
} from './types';
import { analyzeMarketAndDecide, isOpenAIConfigured } from './openai';

const logger = createLogger('AgentEngine');

// ==================== Database Operations ====================

export async function getAgent(agentId: string): Promise<Agent | null> {
  const db = await waitForDb() as any;
  const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
  stmt.bind([agentId]);
  let agent: Agent | null = null;
  if (stmt.step()) {
    agent = rowToAgent(stmt.getAsObject() as AgentRow);
  }
  stmt.free();
  return agent;
}

export async function getActiveAgents(): Promise<Agent[]> {
  const db = await waitForDb() as any;
  const agents: Agent[] = [];
  const stmt = db.prepare("SELECT * FROM agents WHERE status = 'active'");
  while (stmt.step()) {
    agents.push(rowToAgent(stmt.getAsObject() as AgentRow));
  }
  stmt.free();
  return agents;
}

export async function getAllAgents(ownerId?: string): Promise<Agent[]> {
  const db = await waitForDb() as any;
  const agents: Agent[] = [];
  let stmt;
  if (ownerId) {
    stmt = db.prepare('SELECT * FROM agents WHERE owner_id = ? ORDER BY created_at DESC');
    stmt.bind([ownerId]);
  } else {
    stmt = db.prepare('SELECT * FROM agents ORDER BY created_at DESC');
  }
  while (stmt.step()) {
    agents.push(rowToAgent(stmt.getAsObject() as AgentRow));
  }
  stmt.free();
  return agents;
}

export async function createAgent(agent: Omit<Agent, 'created_at' | 'updated_at'>): Promise<Agent> {
  const db = await waitForDb() as any;
  const now = new Date().toISOString();
  
  db.run(
    `INSERT INTO agents (id, name, owner_id, type, status, execution_mode, config_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      agent.id,
      agent.name,
      agent.owner_id,
      agent.type,
      agent.status,
      agent.execution_mode,
      JSON.stringify(agent.config),
      now,
      now,
    ]
  );
  saveDb();
  
  return { ...agent, created_at: now, updated_at: now };
}

export async function updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent | null> {
  const db = await waitForDb() as any;
  const now = new Date().toISOString();
  
  const setClauses: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.execution_mode !== undefined) {
    setClauses.push('execution_mode = ?');
    values.push(updates.execution_mode);
  }
  if (updates.config !== undefined) {
    setClauses.push('config_json = ?');
    values.push(JSON.stringify(updates.config));
  }
  
  if (setClauses.length === 0) {
    return getAgent(agentId);
  }
  
  setClauses.push('updated_at = ?');
  values.push(now);
  values.push(agentId);
  
  db.run(`UPDATE agents SET ${setClauses.join(', ')} WHERE id = ?`, values);
  saveDb();
  
  return getAgent(agentId);
}

export async function deleteAgent(agentId: string): Promise<boolean> {
  const db = await waitForDb() as any;
  
  // Delete associated logs and proposals first
  db.run('DELETE FROM agent_logs WHERE agent_id = ?', [agentId]);
  db.run('DELETE FROM trade_proposals WHERE agent_id = ?', [agentId]);
  db.run('DELETE FROM agents WHERE id = ?', [agentId]);
  saveDb();
  
  return true;
}

// ==================== Trade Proposal Operations ====================

export async function createProposal(proposal: Omit<TradeProposal, 'created_at' | 'decided_at' | 'executed_at'>): Promise<TradeProposal> {
  const db = await waitForDb() as any;
  const now = new Date().toISOString();
  
  db.run(
    `INSERT INTO trade_proposals 
     (id, agent_id, action, offer_id, quantity, price_per_unit, total_price, reasoning, status, transaction_id, order_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proposal.id,
      proposal.agent_id,
      proposal.action,
      proposal.offer_id,
      proposal.quantity,
      proposal.price_per_unit,
      proposal.total_price,
      proposal.reasoning,
      proposal.status,
      proposal.transaction_id,
      proposal.order_id,
      now,
    ]
  );
  saveDb();
  
  return { ...proposal, created_at: now, decided_at: null, executed_at: null };
}

export async function getProposal(proposalId: string): Promise<TradeProposal | null> {
  const db = await waitForDb() as any;
  const stmt = db.prepare('SELECT * FROM trade_proposals WHERE id = ?');
  stmt.bind([proposalId]);
  let proposal: TradeProposal | null = null;
  if (stmt.step()) {
    proposal = rowToProposal(stmt.getAsObject() as TradeProposalRow);
  }
  stmt.free();
  return proposal;
}

export async function getPendingProposals(agentId?: string): Promise<TradeProposal[]> {
  const db = await waitForDb() as any;
  const proposals: TradeProposal[] = [];
  let stmt;
  
  if (agentId) {
    stmt = db.prepare("SELECT * FROM trade_proposals WHERE agent_id = ? AND status = 'pending' ORDER BY created_at DESC");
    stmt.bind([agentId]);
  } else {
    stmt = db.prepare("SELECT * FROM trade_proposals WHERE status = 'pending' ORDER BY created_at DESC");
  }
  
  while (stmt.step()) {
    proposals.push(rowToProposal(stmt.getAsObject() as TradeProposalRow));
  }
  stmt.free();
  return proposals;
}

export async function getAllProposals(agentId?: string, limit: number = 50): Promise<TradeProposal[]> {
  const db = await waitForDb() as any;
  const proposals: TradeProposal[] = [];
  let stmt;
  
  if (agentId) {
    stmt = db.prepare('SELECT * FROM trade_proposals WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?');
    stmt.bind([agentId, limit]);
  } else {
    stmt = db.prepare('SELECT * FROM trade_proposals ORDER BY created_at DESC LIMIT ?');
    stmt.bind([limit]);
  }
  
  while (stmt.step()) {
    proposals.push(rowToProposal(stmt.getAsObject() as TradeProposalRow));
  }
  stmt.free();
  return proposals;
}

/**
 * Get offer IDs that have been recently rejected by the user
 * These should not be re-proposed for a cooldown period
 */
export async function getRecentlyRejectedOfferIds(agentId: string, cooldownMinutes: number = 30): Promise<Set<string>> {
  const db = await waitForDb() as any;
  const rejectedOfferIds = new Set<string>();
  
  // Get proposals rejected within the cooldown period
  const cutoffTime = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();
  
  const stmt = db.prepare(`
    SELECT DISTINCT offer_id FROM trade_proposals 
    WHERE agent_id = ? 
      AND status = 'rejected' 
      AND decided_at > ?
      AND offer_id IS NOT NULL
  `);
  stmt.bind([agentId, cutoffTime]);
  
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    if (row.offer_id) {
      rejectedOfferIds.add(row.offer_id);
    }
  }
  stmt.free();
  
  return rejectedOfferIds;
}

/**
 * Get rejection history for context (what offers were rejected and why)
 */
export async function getRecentRejections(agentId: string, limit: number = 5): Promise<Array<{ offer_id: string; reasoning: string; rejected_at: string }>> {
  const db = await waitForDb() as any;
  const rejections: Array<{ offer_id: string; reasoning: string; rejected_at: string }> = [];
  
  const stmt = db.prepare(`
    SELECT offer_id, reasoning, decided_at as rejected_at 
    FROM trade_proposals 
    WHERE agent_id = ? 
      AND status = 'rejected' 
      AND offer_id IS NOT NULL
    ORDER BY decided_at DESC 
    LIMIT ?
  `);
  stmt.bind([agentId, limit]);
  
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    rejections.push({
      offer_id: row.offer_id,
      reasoning: row.reasoning || '',
      rejected_at: row.rejected_at,
    });
  }
  stmt.free();
  
  return rejections;
}

export async function updateProposalStatus(
  proposalId: string,
  status: 'approved' | 'rejected' | 'executed' | 'expired',
  extra?: { transaction_id?: string; order_id?: string }
): Promise<TradeProposal | null> {
  const db = await waitForDb() as any;
  const now = new Date().toISOString();
  
  const updates: string[] = ['status = ?'];
  const values: any[] = [status];
  
  if (status === 'approved' || status === 'rejected') {
    updates.push('decided_at = ?');
    values.push(now);
  }
  
  if (status === 'executed') {
    updates.push('executed_at = ?');
    values.push(now);
  }
  
  if (extra?.transaction_id) {
    updates.push('transaction_id = ?');
    values.push(extra.transaction_id);
  }
  
  if (extra?.order_id) {
    updates.push('order_id = ?');
    values.push(extra.order_id);
  }
  
  values.push(proposalId);
  
  db.run(`UPDATE trade_proposals SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();
  
  return getProposal(proposalId);
}

// ==================== Agent Log Operations ====================

export async function logAgentEvent(
  agentId: string,
  eventType: AgentLogEventType,
  details: AgentLogDetails
): Promise<AgentLog> {
  const db = await waitForDb() as any;
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(
    `INSERT INTO agent_logs (id, agent_id, event_type, details_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, agentId, eventType, JSON.stringify(details), now]
  );
  saveDb();
  
  return {
    id,
    agent_id: agentId,
    event_type: eventType,
    details,
    created_at: now,
  };
}

export async function getAgentLogs(agentId: string, limit: number = 50): Promise<AgentLog[]> {
  const db = await waitForDb() as any;
  const logs: AgentLog[] = [];
  const stmt = db.prepare('SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?');
  stmt.bind([agentId, limit]);
  
  while (stmt.step()) {
    logs.push(rowToLog(stmt.getAsObject() as AgentLogRow));
  }
  stmt.free();
  return logs;
}

// ==================== Market Data Fetching ====================

async function fetchMarketOffers(): Promise<MarketOffer[]> {
  try {
    // Internal call to discover endpoint to get current market state
    // For simplicity, we'll query the database directly for available offers
    const db = await waitForDb() as any;
    const offers: MarketOffer[] = [];
    
    const stmt = db.prepare(`
      SELECT 
        o.id,
        o.provider_id,
        p.name as provider_name,
        p.trust_score as provider_trust_score,
        i.source_type,
        o.price_value,
        o.currency,
        o.max_qty,
        o.time_window_json
      FROM catalog_offers o
      JOIN providers p ON o.provider_id = p.id
      JOIN catalog_items i ON o.item_id = i.id
    `);
    
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      const timeWindow = JSON.parse(row.time_window_json || '{}');
      
      offers.push({
        id: row.id,
        provider_id: row.provider_id,
        provider_name: row.provider_name || 'Unknown',
        provider_trust_score: row.provider_trust_score || 0.5,
        source_type: row.source_type || 'SOLAR',
        price_per_kwh: row.price_value || 0,
        currency: row.currency || 'USD',
        max_quantity: row.max_qty || 0,
        time_window: {
          start: timeWindow.startTime || new Date().toISOString(),
          end: timeWindow.endTime || new Date().toISOString(),
        },
      });
    }
    stmt.free();
    
    logger.debug(`Fetched ${offers.length} market offers`);
    return offers;
    
  } catch (error: any) {
    logger.error(`Failed to fetch market offers: ${error.message}`);
    return [];
  }
}

async function getDailyTradedQuantity(agentId: string): Promise<number> {
  const db = await waitForDb() as any;
  const today = new Date().toISOString().split('T')[0];
  
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as total
    FROM trade_proposals
    WHERE agent_id = ? 
      AND status = 'executed'
      AND DATE(executed_at) = ?
  `);
  stmt.bind([agentId, today]);
  
  let total = 0;
  if (stmt.step()) {
    total = (stmt.getAsObject() as any).total || 0;
  }
  stmt.free();
  
  return total;
}

// ==================== Trade Execution ====================

async function executeTrade(
  agent: Agent,
  offerId: string,
  quantity: number
): Promise<{ success: boolean; transaction_id?: string; order_id?: string; error?: string }> {
  try {
    logger.info(`[${agent.name}] Executing trade: offer=${offerId}, qty=${quantity}`);
    
    // Step 1: Discover to get fresh catalog
    const discoverRes = await axios.post(`${config.urls.bap}/api/discover`, {
      minQuantity: quantity,
    });
    
    const transactionId = discoverRes.data.transaction_id;
    if (!transactionId) {
      return { success: false, error: 'Failed to get transaction ID from discover' };
    }
    
    // Wait for catalog callback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 2: Select the offer
    const selectRes = await axios.post(`${config.urls.bap}/api/select`, {
      transaction_id: transactionId,
      offer_id: offerId,
      quantity,
    });
    
    if (selectRes.data.error) {
      return { success: false, error: selectRes.data.error };
    }
    
    // Wait for selection callback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Step 3: Initialize order
    const initRes = await axios.post(`${config.urls.bap}/api/init`, {
      transaction_id: transactionId,
    });
    
    if (initRes.data.error) {
      return { success: false, error: initRes.data.error };
    }
    
    // Wait for init callback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Get order ID from transaction state
    const txStateRes = await axios.get(`${config.urls.bap}/api/transactions/${transactionId}`);
    const orderId = txStateRes.data.order?.id;
    
    if (!orderId) {
      return { success: false, error: 'Failed to get order ID after init' };
    }
    
    // Step 4: Confirm order
    const confirmRes = await axios.post(`${config.urls.bap}/api/confirm`, {
      transaction_id: transactionId,
      order_id: orderId,
    });
    
    if (confirmRes.data.error) {
      return { success: false, error: confirmRes.data.error };
    }
    
    logger.info(`[${agent.name}] Order confirmed, initiating settlement...`, {
      transaction_id: transactionId,
      order_id: orderId,
    });
    
    // Step 5: Initiate settlement flow to update demo accounts
    try {
      // First initiate the settlement record
      await axios.post(`${config.urls.bap}/api/settlement/initiate`, {
        tradeId: orderId,
        transaction_id: transactionId,
      });
      
      // Then auto-run the settlement to completion (updates demo accounts)
      await axios.post(`${config.urls.bap}/api/settlement/auto-run`, {
        tradeId: orderId,
        scenario: 'SUCCESS',
      });
      
      logger.info(`[${agent.name}] Settlement completed for trade`, {
        transaction_id: transactionId,
        order_id: orderId,
      });
    } catch (settlementErr: any) {
      // Log but don't fail the trade - settlement can be retried
      logger.warn(`[${agent.name}] Settlement initiation failed (trade still valid): ${settlementErr.message}`);
    }
    
    logger.info(`[${agent.name}] Trade executed successfully`, {
      transaction_id: transactionId,
      order_id: orderId,
    });
    
    return {
      success: true,
      transaction_id: transactionId,
      order_id: orderId,
    };
    
  } catch (error: any) {
    logger.error(`[${agent.name}] Trade execution failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==================== Constants ====================

const MAX_PENDING_APPROVALS = 5;

// ==================== Main Agent Run Cycle ====================

export async function runAgentCycle(agent: Agent): Promise<void> {
  if (!isOpenAIConfigured()) {
    logger.warn(`[${agent.name}] OpenAI not configured, skipping cycle`);
    await logAgentEvent(agent.id, 'error', {
      message: 'OpenAI API key not configured',
    });
    return;
  }
  
  // Check if we've hit the pending approval limit (only for approval mode agents)
  if (agent.execution_mode === 'approval') {
    const pendingProposals = await getPendingProposals();
    if (pendingProposals.length >= MAX_PENDING_APPROVALS) {
      logger.info(`[${agent.name}] Skipping cycle - ${pendingProposals.length} pending approvals (max: ${MAX_PENDING_APPROVALS})`);
      await logAgentEvent(agent.id, 'analysis', {
        message: `Waiting for pending approvals to clear (${pendingProposals.length}/${MAX_PENDING_APPROVALS})`,
        decision: 'wait',
        reasoning: `There are ${pendingProposals.length} pending approvals waiting for user action. Will resume when count drops below ${MAX_PENDING_APPROVALS}.`,
      });
      return;
    }
  }
  
  logger.info(`[${agent.name}] Starting analysis cycle...`);
  
  try {
    // Fetch current market offers
    const allOffers = await fetchMarketOffers();
    
    // Filter out recently rejected offers (30 minute cooldown)
    const rejectedOfferIds = await getRecentlyRejectedOfferIds(agent.id, 30);
    const offers = allOffers.filter(o => !rejectedOfferIds.has(o.id));
    
    if (rejectedOfferIds.size > 0) {
      logger.info(`[${agent.name}] Filtered out ${rejectedOfferIds.size} recently rejected offer(s)`);
    }
    
    // Get daily traded quantity for limits
    const dailyTraded = await getDailyTradedQuantity(agent.id);
    
    // Build market context
    // Get recent rejection history to inform the LLM
    const recentRejections = await getRecentRejections(agent.id, 5);
    
    const marketContext: MarketContext = {
      offers,
      account_balance: 10000, // TODO: Get from demo accounts
      currency: 'USD',
      daily_traded_quantity: dailyTraded,
      daily_limit: agent.config.dailyLimit || null,
      timestamp: new Date().toISOString(),
      recently_rejected: recentRejections.map(r => ({
        offer_id: r.offer_id,
        rejected_at: r.rejected_at,
      })),
    };
    
    // Log analysis start
    await logAgentEvent(agent.id, 'analysis', {
      message: 'Starting market analysis',
      offers_analyzed: offers.length,
      filtered_rejected: rejectedOfferIds.size,
      market_summary: offers.length > 0 ? {
        total_offers: offers.length,
        price_range: {
          min: Math.min(...offers.map(o => o.price_per_kwh)),
          max: Math.max(...offers.map(o => o.price_per_kwh)),
        },
        avg_trust_score: offers.reduce((a, o) => a + o.provider_trust_score, 0) / offers.length,
      } : undefined,
    });
    
    // Get LLM decision
    const decision = await analyzeMarketAndDecide(agent, marketContext);
    
    if (decision.action === 'error') {
      await logAgentEvent(agent.id, 'error', {
        message: 'Analysis failed',
        error: decision.reasoning,
      });
      return;
    }
    
    if (decision.action === 'wait') {
      await logAgentEvent(agent.id, 'analysis', {
        message: 'Decided to wait',
        decision: 'wait',
        reasoning: decision.reasoning,
      });
      return;
    }
    
    if (decision.action === 'propose_trade' && decision.offer_id && decision.quantity) {
      // Find the offer to get price info
      const offer = offers.find(o => o.id === decision.offer_id);
      const pricePerUnit = offer?.price_per_kwh || 0;
      const totalPrice = pricePerUnit * decision.quantity;
      
      if (agent.execution_mode === 'auto') {
        // Auto-execute mode: execute immediately
        logger.info(`[${agent.name}] Auto-executing trade...`);
        
        const result = await executeTrade(agent, decision.offer_id, decision.quantity);
        
        if (result.success) {
          // Create proposal record as executed
          const proposal = await createProposal({
            id: uuidv4(),
            agent_id: agent.id,
            action: agent.type === 'buyer' ? 'buy' : 'sell',
            offer_id: decision.offer_id,
            quantity: decision.quantity,
            price_per_unit: pricePerUnit,
            total_price: totalPrice,
            reasoning: decision.reasoning,
            status: 'executed',
            transaction_id: result.transaction_id || null,
            order_id: result.order_id || null,
          });
          
          await logAgentEvent(agent.id, 'execution', {
            message: 'Trade executed successfully',
            proposal_id: proposal.id,
            transaction_id: result.transaction_id,
            order_id: result.order_id,
            reasoning: decision.reasoning,
          });
        } else {
          await logAgentEvent(agent.id, 'error', {
            message: 'Trade execution failed',
            error: result.error,
            reasoning: decision.reasoning,
          });
        }
        
      } else {
        // Approval mode: create pending proposal
        const proposal = await createProposal({
          id: uuidv4(),
          agent_id: agent.id,
          action: agent.type === 'buyer' ? 'buy' : 'sell',
          offer_id: decision.offer_id,
          quantity: decision.quantity,
          price_per_unit: pricePerUnit,
          total_price: totalPrice,
          reasoning: decision.reasoning,
          status: 'pending',
          transaction_id: null,
          order_id: null,
        });
        
        await logAgentEvent(agent.id, 'proposal', {
          message: 'Trade proposal created for approval',
          proposal_id: proposal.id,
          reasoning: decision.reasoning,
        });
        
        logger.info(`[${agent.name}] Created pending proposal: ${proposal.id}`);
      }
    }
    
  } catch (error: any) {
    logger.error(`[${agent.name}] Cycle failed: ${error.message}`);
    await logAgentEvent(agent.id, 'error', {
      message: 'Cycle failed',
      error: error.message,
    });
  }
}

// ==================== Proposal Approval/Rejection ====================

export async function approveProposal(proposalId: string): Promise<{ success: boolean; error?: string }> {
  const proposal = await getProposal(proposalId);
  
  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }
  
  if (proposal.status !== 'pending') {
    return { success: false, error: `Proposal is not pending (status: ${proposal.status})` };
  }
  
  const agent = await getAgent(proposal.agent_id);
  if (!agent) {
    return { success: false, error: 'Agent not found' };
  }
  
  // Mark as approved first
  await updateProposalStatus(proposalId, 'approved');
  
  // Execute the trade
  if (proposal.offer_id) {
    const result = await executeTrade(agent, proposal.offer_id, proposal.quantity);
    
    if (result.success) {
      await updateProposalStatus(proposalId, 'executed', {
        transaction_id: result.transaction_id,
        order_id: result.order_id,
      });
      
      await logAgentEvent(agent.id, 'approval', {
        message: 'Proposal approved and executed',
        proposal_id: proposalId,
        transaction_id: result.transaction_id,
        order_id: result.order_id,
      });
      
      return { success: true };
    } else {
      await logAgentEvent(agent.id, 'error', {
        message: 'Approved proposal execution failed',
        proposal_id: proposalId,
        error: result.error,
      });
      
      return { success: false, error: result.error };
    }
  }
  
  return { success: false, error: 'No offer ID in proposal' };
}

export async function rejectProposal(proposalId: string): Promise<{ success: boolean; error?: string }> {
  const proposal = await getProposal(proposalId);
  
  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }
  
  if (proposal.status !== 'pending') {
    return { success: false, error: `Proposal is not pending (status: ${proposal.status})` };
  }
  
  await updateProposalStatus(proposalId, 'rejected');
  
  await logAgentEvent(proposal.agent_id, 'rejection', {
    message: 'Proposal rejected by user',
    proposal_id: proposalId,
  });
  
  return { success: true };
}

// ==================== Agent Start/Stop ====================

export async function startAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
  const agent = await getAgent(agentId);
  
  if (!agent) {
    return { success: false, error: 'Agent not found' };
  }
  
  if (agent.status === 'active') {
    return { success: true }; // Already active
  }
  
  await updateAgent(agentId, { status: 'active' });
  
  await logAgentEvent(agentId, 'start', {
    message: 'Agent started',
  });
  
  logger.info(`[${agent.name}] Agent started`);
  
  return { success: true };
}

export async function stopAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
  const agent = await getAgent(agentId);
  
  if (!agent) {
    return { success: false, error: 'Agent not found' };
  }
  
  if (agent.status === 'stopped') {
    return { success: true }; // Already stopped
  }
  
  await updateAgent(agentId, { status: 'stopped' });
  
  await logAgentEvent(agentId, 'stop', {
    message: 'Agent stopped',
  });
  
  logger.info(`[${agent.name}] Agent stopped`);
  
  return { success: true };
}

export async function pauseAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
  const agent = await getAgent(agentId);
  
  if (!agent) {
    return { success: false, error: 'Agent not found' };
  }
  
  await updateAgent(agentId, { status: 'paused' });
  
  await logAgentEvent(agentId, 'stop', {
    message: 'Agent paused',
  });
  
  logger.info(`[${agent.name}] Agent paused`);
  
  return { success: true };
}

/**
 * Agent API Routes
 * REST endpoints for AI trading agent management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@p2p/shared';
import { waitForDb } from './db';
import {
  // Types
  Agent,
  AgentConfig,
  AgentType,
  ExecutionMode,
  CreateAgentRequest,
  UpdateAgentRequest,
  
  // Agent operations
  getAgent,
  getAllAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  startAgent,
  stopAgent,
  pauseAgent,
  
  // Proposal operations
  getProposal,
  getPendingProposals,
  getAllProposals,
  approveProposal,
  rejectProposal,
  
  // Logging
  getAgentLogs,
  
  // Scheduler
  isSchedulerRunning,
  getSchedulerStatus,
  triggerAgentCycle,
  
  // OpenAI
  isOpenAIConfigured,
} from './ai';

const router = Router();
const logger = createLogger('AgentRoutes');

// ==================== Helper Functions ====================

interface EnrichedProposal {
  id: string;
  agent_id: string;
  agent_name?: string;
  action: string;
  offer_id: string | null;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  reasoning: string;
  status: string;
  transaction_id: string | null;
  order_id: string | null;
  created_at: string;
  decided_at: string | null;
  executed_at: string | null;
  // Enriched offer details
  offer?: {
    provider_name: string;
    provider_trust_score: number;
    source_type: string;
    time_window_start: string;
    time_window_end: string;
  };
}

/**
 * Enrich proposals with offer and agent details from the database
 */
async function enrichProposals(proposals: any[]): Promise<EnrichedProposal[]> {
  if (proposals.length === 0) return [];
  
  const db = await waitForDb() as any;
  
  return proposals.map(p => {
    const enriched: EnrichedProposal = { ...p };
    
    // Get agent name
    if (p.agent_id) {
      const agentStmt = db.prepare('SELECT name FROM agents WHERE id = ?');
      agentStmt.bind([p.agent_id]);
      if (agentStmt.step()) {
        enriched.agent_name = (agentStmt.getAsObject() as any).name;
      }
      agentStmt.free();
    }
    
    // Get offer details
    if (p.offer_id) {
      const stmt = db.prepare(`
        SELECT 
          p.name as provider_name,
          p.trust_score as provider_trust_score,
          i.source_type,
          o.time_window_json
        FROM catalog_offers o
        JOIN providers p ON o.provider_id = p.id
        JOIN catalog_items i ON o.item_id = i.id
        WHERE o.id = ?
      `);
      stmt.bind([p.offer_id]);
      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        const timeWindow = JSON.parse(row.time_window_json || '{}');
        enriched.offer = {
          provider_name: row.provider_name || 'Unknown Provider',
          provider_trust_score: row.provider_trust_score || 0,
          source_type: row.source_type || 'UNKNOWN',
          time_window_start: timeWindow.startTime || '',
          time_window_end: timeWindow.endTime || '',
        };
      }
      stmt.free();
    }
    
    return enriched;
  });
}

// ==================== Agent CRUD Endpoints ====================

/**
 * GET /api/agents - List all agents
 */
router.get('/api/agents', async (req: Request, res: Response) => {
  try {
    const ownerId = req.query.owner_id as string | undefined;
    const agents = await getAllAgents(ownerId);
    
    res.json({
      status: 'ok',
      agents,
      count: agents.length,
    });
  } catch (error: any) {
    logger.error(`Failed to list agents: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * GET /api/agents/:id - Get single agent
 */
router.get('/api/agents/:id', async (req: Request, res: Response) => {
  try {
    const agent = await getAgent(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ status: 'error', error: 'Agent not found' });
    }
    
    res.json({ status: 'ok', agent });
  } catch (error: any) {
    logger.error(`Failed to get agent: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * POST /api/agents - Create new agent
 */
router.post('/api/agents', async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateAgentRequest;
    
    if (!body.name || !body.type) {
      return res.status(400).json({ status: 'error', error: 'name and type are required' });
    }
    
    if (!['buyer', 'seller'].includes(body.type)) {
      return res.status(400).json({ status: 'error', error: 'type must be buyer or seller' });
    }
    
    const agent = await createAgent({
      id: uuidv4(),
      name: body.name,
      owner_id: 'user', // TODO: Get from auth
      type: body.type as AgentType,
      status: 'stopped',
      execution_mode: (body.execution_mode || 'approval') as ExecutionMode,
      config: body.config || {},
    });
    
    logger.info(`Created agent: ${agent.name} (${agent.id})`);
    
    res.json({ status: 'ok', agent });
  } catch (error: any) {
    logger.error(`Failed to create agent: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * PATCH /api/agents/:id - Update agent
 */
router.patch('/api/agents/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body as UpdateAgentRequest;
    const agentId = req.params.id;
    
    const existing = await getAgent(agentId);
    if (!existing) {
      return res.status(404).json({ status: 'error', error: 'Agent not found' });
    }
    
    const updates: Partial<Agent> = {};
    
    if (body.name !== undefined) updates.name = body.name;
    if (body.execution_mode !== undefined) updates.execution_mode = body.execution_mode;
    if (body.config !== undefined) {
      // Merge config with existing
      updates.config = { ...existing.config, ...body.config };
    }
    
    const agent = await updateAgent(agentId, updates);
    
    logger.info(`Updated agent: ${agentId}`);
    
    res.json({ status: 'ok', agent });
  } catch (error: any) {
    logger.error(`Failed to update agent: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * DELETE /api/agents/:id - Delete agent
 */
router.delete('/api/agents/:id', async (req: Request, res: Response) => {
  try {
    const agentId = req.params.id;
    
    const existing = await getAgent(agentId);
    if (!existing) {
      return res.status(404).json({ status: 'error', error: 'Agent not found' });
    }
    
    // Don't allow deleting platform agent
    if (existing.owner_id === 'platform') {
      return res.status(403).json({ status: 'error', error: 'Cannot delete platform agent' });
    }
    
    await deleteAgent(agentId);
    
    logger.info(`Deleted agent: ${agentId}`);
    
    res.json({ status: 'ok', deleted: agentId });
  } catch (error: any) {
    logger.error(`Failed to delete agent: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// ==================== Agent Control Endpoints ====================

/**
 * POST /api/agents/:id/start - Start agent
 */
router.post('/api/agents/:id/start', async (req: Request, res: Response) => {
  try {
    const result = await startAgent(req.params.id);
    
    if (!result.success) {
      return res.status(400).json({ status: 'error', error: result.error });
    }
    
    const agent = await getAgent(req.params.id);
    res.json({ status: 'ok', agent });
  } catch (error: any) {
    logger.error(`Failed to start agent: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * POST /api/agents/:id/stop - Stop agent
 */
router.post('/api/agents/:id/stop', async (req: Request, res: Response) => {
  try {
    const result = await stopAgent(req.params.id);
    
    if (!result.success) {
      return res.status(400).json({ status: 'error', error: result.error });
    }
    
    const agent = await getAgent(req.params.id);
    res.json({ status: 'ok', agent });
  } catch (error: any) {
    logger.error(`Failed to stop agent: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * POST /api/agents/:id/pause - Pause agent
 */
router.post('/api/agents/:id/pause', async (req: Request, res: Response) => {
  try {
    const result = await pauseAgent(req.params.id);
    
    if (!result.success) {
      return res.status(400).json({ status: 'error', error: result.error });
    }
    
    const agent = await getAgent(req.params.id);
    res.json({ status: 'ok', agent });
  } catch (error: any) {
    logger.error(`Failed to pause agent: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * POST /api/agents/:id/trigger - Manually trigger agent cycle
 */
router.post('/api/agents/:id/trigger', async (req: Request, res: Response) => {
  try {
    const result = await triggerAgentCycle(req.params.id);
    
    if (!result.success) {
      return res.status(400).json({ status: 'error', error: result.error });
    }
    
    res.json({ status: 'ok', message: 'Agent cycle triggered' });
  } catch (error: any) {
    logger.error(`Failed to trigger agent: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// ==================== Agent Logs Endpoint ====================

/**
 * GET /api/agents/:id/logs - Get agent activity logs
 */
router.get('/api/agents/:id/logs', async (req: Request, res: Response) => {
  try {
    const agentId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const agent = await getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ status: 'error', error: 'Agent not found' });
    }
    
    const logs = await getAgentLogs(agentId, limit);
    
    res.json({ status: 'ok', logs, count: logs.length });
  } catch (error: any) {
    logger.error(`Failed to get agent logs: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// ==================== Proposal Endpoints ====================

/**
 * GET /api/proposals - List all proposals with enriched offer details
 */
router.get('/api/proposals', async (req: Request, res: Response) => {
  try {
    const agentId = req.query.agent_id as string | undefined;
    const pendingOnly = req.query.pending === 'true';
    const limit = parseInt(req.query.limit as string) || 50;
    
    let proposals;
    if (pendingOnly) {
      proposals = await getPendingProposals(agentId);
    } else {
      proposals = await getAllProposals(agentId, limit);
    }
    
    // Enrich proposals with offer and agent details
    const enrichedProposals = await enrichProposals(proposals);
    
    res.json({ status: 'ok', proposals: enrichedProposals, count: enrichedProposals.length });
  } catch (error: any) {
    logger.error(`Failed to list proposals: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * GET /api/proposals/:id - Get single proposal
 */
router.get('/api/proposals/:id', async (req: Request, res: Response) => {
  try {
    const proposal = await getProposal(req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ status: 'error', error: 'Proposal not found' });
    }
    
    res.json({ status: 'ok', proposal });
  } catch (error: any) {
    logger.error(`Failed to get proposal: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * POST /api/proposals/:id/approve - Approve a pending proposal
 */
router.post('/api/proposals/:id/approve', async (req: Request, res: Response) => {
  try {
    const result = await approveProposal(req.params.id);
    
    if (!result.success) {
      return res.status(400).json({ status: 'error', error: result.error });
    }
    
    const proposal = await getProposal(req.params.id);
    
    logger.info(`Approved proposal: ${req.params.id}`);
    
    res.json({ status: 'ok', proposal });
  } catch (error: any) {
    logger.error(`Failed to approve proposal: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * POST /api/proposals/:id/reject - Reject a pending proposal
 */
router.post('/api/proposals/:id/reject', async (req: Request, res: Response) => {
  try {
    const result = await rejectProposal(req.params.id);
    
    if (!result.success) {
      return res.status(400).json({ status: 'error', error: result.error });
    }
    
    const proposal = await getProposal(req.params.id);
    
    logger.info(`Rejected proposal: ${req.params.id}`);
    
    res.json({ status: 'ok', proposal });
  } catch (error: any) {
    logger.error(`Failed to reject proposal: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// ==================== Scheduler Status Endpoint ====================

/**
 * GET /api/agents/scheduler/status - Get scheduler status
 */
router.get('/api/agents/scheduler/status', async (req: Request, res: Response) => {
  try {
    const status = await getSchedulerStatus();
    const openaiConfigured = isOpenAIConfigured();
    
    res.json({
      status: 'ok',
      scheduler: status,
      openai_configured: openaiConfigured,
    });
  } catch (error: any) {
    logger.error(`Failed to get scheduler status: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

export default router;

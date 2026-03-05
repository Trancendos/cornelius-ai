/**
 * Cornelius API Server — REST + WebSocket interface
 *
 * Exposes the Cornelius orchestrator as an HTTP service with:
 * - REST endpoints for orchestration, agent management, consensus
 * - WebSocket endpoint for real-time agent mesh events
 * - Health check and metrics endpoints
 *
 * Architecture: Luminous Multi-Agent Orchestration Framework
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { orchestrator } from '../orchestration/orchestrator';
import { nexusRouter } from '../routing/nexus-router';
import { mcpServer } from '../mcp/mcp-server';
import { allAgents, getAgent } from '../registry/agents';
import { logger } from '../utils/logger';

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// HEALTH & METRICS
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'cornelius-ai',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/metrics', (_req: Request, res: Response) => {
  const meshStatus = orchestrator.getMeshStatus();
  const routingMetrics = nexusRouter.getMetrics();
  res.json({
    mesh: meshStatus,
    routing: routingMetrics,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ORCHESTRATION ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/orchestrate
 * Main orchestration endpoint — analyse intent and delegate to appropriate agent
 */
app.post('/api/v1/orchestrate', async (req: Request, res: Response) => {
  try {
    const { prompt, userId, context } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required and must be a string' });
    }

    const result = await orchestrator.orchestrate(prompt, userId || 'anonymous', context);
    return res.json(result);
  } catch (err) {
    logger.error({ err }, 'Orchestration error');
    return res.status(500).json({ error: 'Orchestration failed', details: String(err) });
  }
});

/**
 * POST /api/v1/analyse-intent
 * Analyse intent without executing — useful for previewing routing decisions
 */
app.post('/api/v1/analyse-intent', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const intent = await orchestrator.analyseIntent(prompt);
    return res.json(intent);
  } catch (err) {
    logger.error({ err }, 'Intent analysis error');
    return res.status(500).json({ error: 'Intent analysis failed', details: String(err) });
  }
});

/**
 * POST /api/v1/consensus
 * Trigger a consensus round across multiple agents
 */
app.post('/api/v1/consensus', async (req: Request, res: Response) => {
  try {
    const { topic, agents, context } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic is required' });

    const result = await orchestrator.negotiateConsensus({ topic, agents, context });
    return res.json(result);
  } catch (err) {
    logger.error({ err }, 'Consensus error');
    return res.status(500).json({ error: 'Consensus failed', details: String(err) });
  }
});

/**
 * GET /api/v1/history
 * Get orchestration history / audit trail
 */
app.get('/api/v1/history', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = orchestrator.getOrchestrationHistory(limit);
  res.json({ history, count: history.length });
});

// ============================================================================
// AGENT MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/agents
 * List all agents with optional filtering
 */
app.get('/api/v1/agents', (req: Request, res: Response) => {
  const { tier, capability, status } = req.query;

  let agents = allAgents;

  if (tier) {
    agents = agents.filter(a => a.tier === tier);
  }
  if (capability) {
    agents = agents.filter(a => a.capabilities.includes(capability as string));
  }
  if (status) {
    agents = agents.filter(a => a.status === status);
  }

  res.json({
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      displayName: a.displayName,
      tier: a.tier,
      role: a.role,
      status: a.status,
      capabilities: a.capabilities,
    })),
    count: agents.length,
  });
});

/**
 * GET /api/v1/agents/:agentId
 * Get detailed info for a specific agent
 */
app.get('/api/v1/agents/:agentId', (req: Request, res: Response) => {
  const agent = getAgent(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: `Agent '${req.params.agentId}' not found` });
  }
  return res.json(agent);
});

/**
 * GET /api/v1/agents/:agentId/status
 * Get live status for a specific agent
 */
app.get('/api/v1/agents/:agentId/status', async (req: Request, res: Response) => {
  try {
    const agent = getAgent(req.params.agentId);
    if (!agent) {
      return res.status(404).json({ error: `Agent '${req.params.agentId}' not found` });
    }

    const meshStatus = orchestrator.getMeshStatus();
    const agentStatus = meshStatus.agents.find((a: { id: string }) => a.id === req.params.agentId);

    return res.json({
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
      },
      mesh: agentStatus || { id: req.params.agentId, status: 'unknown' },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Status check failed', details: String(err) });
  }
});

// ============================================================================
// MESH TOPOLOGY ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/mesh
 * Get full mesh topology and health
 */
app.get('/api/v1/mesh', (_req: Request, res: Response) => {
  const status = orchestrator.getMeshStatus();
  res.json(status);
});

/**
 * GET /api/v1/mesh/routing
 * Get Nexus ACO routing metrics and pheromone trails
 */
app.get('/api/v1/mesh/routing', (_req: Request, res: Response) => {
  const metrics = nexusRouter.getMetrics();
  res.json(metrics);
});

// ============================================================================
// MCP ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/mcp/info
 * Get MCP server capabilities
 */
app.get('/api/v1/mcp/info', (_req: Request, res: Response) => {
  res.json(mcpServer.getServerInfo());
});

/**
 * POST /api/v1/mcp/tool
 * Execute an MCP tool call
 */
app.post('/api/v1/mcp/tool', async (req: Request, res: Response) => {
  try {
    const { tool, args } = req.body;
    if (!tool) return res.status(400).json({ error: 'tool name is required' });

    const result = await mcpServer.handleToolCall(tool, args || {});
    return res.json(result);
  } catch (err) {
    logger.error({ err }, 'MCP tool call error');
    return res.status(500).json({ error: 'MCP tool call failed', details: String(err) });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

export function createWebSocketServer(httpServer: ReturnType<typeof createServer>) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    logger.info('WebSocket client connected');

    // Send initial mesh status on connect
    ws.send(JSON.stringify({
      type: 'mesh_status',
      data: orchestrator.getMeshStatus(),
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'orchestrate') {
          const result = await orchestrator.orchestrate(msg.prompt, msg.userId || 'ws-client');
          ws.send(JSON.stringify({ type: 'orchestration_result', data: result, id: msg.id }));
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        } else if (msg.type === 'subscribe_mesh') {
          // Client wants real-time mesh updates — handled by broadcast interval
          ws.send(JSON.stringify({ type: 'subscribed', channel: 'mesh' }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: String(err) }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      logger.info('WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err }, 'WebSocket error');
      clients.delete(ws);
    });
  });

  // Broadcast mesh status every 30 seconds
  setInterval(() => {
    if (clients.size === 0) return;
    const payload = JSON.stringify({
      type: 'mesh_heartbeat',
      data: orchestrator.getMeshStatus(),
      timestamp: new Date().toISOString(),
    });
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }, 30_000);

  logger.info('WebSocket server ready at /ws');
  return wss;
}

export { app };
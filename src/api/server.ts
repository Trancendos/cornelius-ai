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
// IAM MIDDLEWARE — Trancendos 2060 Standard (TRN-PROD-001)
// ============================================================================
import { createHash, createHmac } from 'crypto';

const IAM_JWT_SECRET = process.env.IAM_JWT_SECRET || process.env.JWT_SECRET || '';
const IAM_ALGORITHM = process.env.JWT_ALGORITHM || 'HS512';
const SERVICE_ID = 'cornelius';
const MESH_ADDRESS = process.env.MESH_ADDRESS || 'cornelius.agent.local';

function sha512Audit(data: string): string {
  return createHash('sha512').update(data).digest('hex');
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64 + '='.repeat((4 - b64.length % 4) % 4), 'base64').toString('utf8');
}

interface JWTClaims {
  sub: string; email?: string; role?: string;
  active_role_level?: number; permissions?: string[];
  exp?: number; jti?: string;
}

function verifyIAMToken(token: string): JWTClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, sig] = parts;
    const header = JSON.parse(b64urlDecode(h));
    const alg = header.alg === 'HS512' ? 'sha512' : 'sha256';
    const expected = createHmac(alg, IAM_JWT_SECRET)
      .update(`${h}.${p}`).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    if (expected !== sig) return null;
    const claims = JSON.parse(b64urlDecode(p)) as JWTClaims;
    if (claims.exp && Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch { return null; }
}

function requireIAMLevel(maxLevel: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) { res.status(401).json({ error: 'Authentication required', service: SERVICE_ID }); return; }
    const claims = verifyIAMToken(token);
    if (!claims) { res.status(401).json({ error: 'Invalid or expired token', service: SERVICE_ID }); return; }
    const level = claims.active_role_level ?? 6;
    if (level > maxLevel) {
      console.log(JSON.stringify({ level: 'audit', decision: 'DENY', service: SERVICE_ID,
        principal: claims.sub, requiredLevel: maxLevel, actualLevel: level, path: req.path,
        integrityHash: sha512Audit(`DENY:${claims.sub}:${req.path}:${Date.now()}`),
        timestamp: new Date().toISOString() }));
      res.status(403).json({ error: 'Insufficient privilege level', required: maxLevel, actual: level });
      return;
    }
    (req as any).principal = claims;
    next();
  };
}

function iamRequestMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Service-Id', SERVICE_ID);
  res.setHeader('X-Mesh-Address', MESH_ADDRESS);
  res.setHeader('X-IAM-Version', '1.0');
  next();
}

function iamHealthStatus() {
  return {
    iam: {
      version: '1.0', algorithm: IAM_ALGORITHM,
      status: IAM_JWT_SECRET ? 'configured' : 'unconfigured',
      meshAddress: MESH_ADDRESS,
      routingProtocol: process.env.MESH_ROUTING_PROTOCOL || 'static_port',
      cryptoMigrationPath: 'hmac_sha512 → ml_kem (2030) → hybrid_pqc (2040) → slh_dsa (2060)',
    },
  };
}
// ============================================================================
// END IAM MIDDLEWARE
// ============================================================================

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
      ...iamHealthStatus(),
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
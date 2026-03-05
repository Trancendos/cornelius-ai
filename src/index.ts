/**
 * Cornelius-AI — Master AI Orchestrator
 *
 * Entry point for the Luminous Multi-Agent Orchestration Framework.
 * Wires together:
 *   - Agent Registry (24-agent mesh)
 *   - Cornelius Orchestrator (intent analysis + task delegation)
 *   - Nexus Router (ACO-based routing with pheromone trails)
 *   - MCP Server (Model Context Protocol exposure)
 *   - REST API + WebSocket server
 *
 * Architecture: Trancendos Industry 6.0 / 2060 Standard
 * Component: Luminous (cornelius-ai) — The Cognitive Core
 */

import { createServer } from 'http';
import { app, createWebSocketServer } from './api/server';
import { orchestrator } from './orchestration/orchestrator';
import { nexusRouter } from './routing/nexus-router';
import { mcpServer } from './mcp/mcp-server';
import { allAgents, getActiveAgents } from './registry/agents';
import { env } from './config/env';
import { logger } from './utils/logger';

// ============================================================================
// BOOTSTRAP
// ============================================================================

async function bootstrap(): Promise<void> {
  logger.info('╔══════════════════════════════════════════════════════════╗');
  logger.info('║          CORNELIUS-AI — MASTER AI ORCHESTRATOR           ║');
  logger.info('║          Luminous Multi-Agent Orchestration v1.0         ║');
  logger.info('╚══════════════════════════════════════════════════════════╝');

  // ── 1. Initialise Agent Registry ──────────────────────────────────────────
  const activeAgents = getActiveAgents();
  logger.info(`Agent registry loaded: ${allAgents.length} total, ${activeAgents.length} active`);

  // ── 2. Register agents with Nexus Router ──────────────────────────────────
  for (const agent of activeAgents) {
    const endpoint = agent.endpoint || `http://localhost:${4000 + Math.floor(Math.random() * 1000)}`;
    nexusRouter.registerAgent(agent.id, endpoint);
  }
  logger.info(`Nexus router: ${activeAgents.length} agents registered`);

  // ── 3. Start pheromone evaporation cycle ──────────────────────────────────
  setInterval(() => {
    nexusRouter.evaporatePheromones();
  }, 60_000); // Evaporate every 60 seconds
  logger.info('Nexus ACO pheromone evaporation cycle started (60s interval)');

  // ── 4. Log MCP server info ─────────────────────────────────────────────────
  if (env.MCP_ENABLED) {
    const mcpInfo = mcpServer.getServerInfo();
    logger.info(`MCP server ready: ${mcpInfo.tools.length} tools exposed`);
    logger.info(`MCP tools: ${mcpInfo.tools.map((t: { name: string }) => t.name).join(', ')}`);
  }

  // ── 5. Start HTTP + WebSocket server ──────────────────────────────────────
  const httpServer = createServer(app);
  createWebSocketServer(httpServer);

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(env.PORT, env.HOST, () => {
      resolve();
    });
    httpServer.on('error', reject);
  });

  logger.info(`✅ Cornelius-AI listening on http://${env.HOST}:${env.PORT}`);
  logger.info(`   REST API:   http://${env.HOST}:${env.PORT}/api/v1`);
  logger.info(`   WebSocket:  ws://${env.HOST}:${env.PORT}/ws`);
  logger.info(`   Health:     http://${env.HOST}:${env.PORT}/health`);
  logger.info(`   Metrics:    http://${env.HOST}:${env.PORT}/metrics`);
  logger.info(`   MCP:        http://${env.HOST}:${env.PORT}/api/v1/mcp/info`);

  // ── 6. Log mesh topology ───────────────────────────────────────────────────
  const meshStatus = orchestrator.getMeshStatus();
  logger.info(`Mesh topology: ${meshStatus.totalAgents} agents, ${meshStatus.activeAgents} active`);

  // ── 7. Graceful shutdown handlers ─────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — initiating graceful shutdown...`);
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
}

// ============================================================================
// EXPORTS (for use as a library)
// ============================================================================

export { orchestrator } from './orchestration/orchestrator';
export { nexusRouter } from './routing/nexus-router';
export { mcpServer } from './mcp/mcp-server';
export { agentRegistry, allAgents, getAgent, getActiveAgents, getAgentsByTier, getAgentsByCapability } from './registry/agents';
export type { Agent, AgentCapabilities, AgentPersonality } from './registry/agents';

// ============================================================================
// MAIN
// ============================================================================

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
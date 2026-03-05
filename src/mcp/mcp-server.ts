/**
 * MCP Server — Model Context Protocol Interface for Cornelius
 * 
 * Exposes Cornelius orchestration capabilities as an MCP server,
 * allowing any MCP-compatible client to connect to the Trancendos agent mesh.
 * 
 * Architecture: Luminous MCP Integration (Anthropic Model Context Protocol)
 * Reference: https://modelcontextprotocol.io
 */

import { orchestrator } from '../orchestration/orchestrator';
import { agentRegistry, allAgents } from '../registry/agents';
import { nexusRouter } from '../routing/nexus-router';

// ============================================================================
// MCP TOOL DEFINITIONS
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export const CORNELIUS_MCP_TOOLS: MCPTool[] = [
  {
    name: 'orchestrate',
    description: 'Orchestrate a user request through the Cornelius agent mesh. Analyses intent and delegates to the appropriate specialised agent.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The user request or task to orchestrate' },
        userId: { type: 'string', description: 'Optional user ID for context' },
        priority: { type: 'string', description: 'Task priority', enum: ['low', 'normal', 'high', 'critical'] },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'analyse_intent',
    description: 'Analyse the intent of a user request without delegating to agents. Returns the detected intent, confidence, and suggested agent.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The user request to analyse' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'get_agent_status',
    description: 'Get the status of a specific agent or all agents in the mesh.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Optional agent ID. If omitted, returns all agents.' },
      },
    },
  },
  {
    name: 'get_mesh_topology',
    description: 'Get the current agent mesh topology including all tiers, active agents, and routing status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'negotiate_consensus',
    description: 'Initiate a multi-agent consensus negotiation round using argumentative weighted evaluation.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The topic or decision to reach consensus on' },
        options: { type: 'string', description: 'Comma-separated list of options to vote on' },
        participants: { type: 'string', description: 'Comma-separated list of agent IDs to participate' },
      },
      required: ['topic', 'options', 'participants'],
    },
  },
  {
    name: 'get_routing_metrics',
    description: 'Get The Nexus routing metrics including latency, success rates, and pheromone trail status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_agents',
    description: 'List all registered agents in the Trancendos agent mesh with their capabilities and status.',
    inputSchema: {
      type: 'object',
      properties: {
        tier: { type: 'string', description: 'Filter by tier', enum: ['core', 'process', 'specialized', 'all'] },
        status: { type: 'string', description: 'Filter by status', enum: ['active', 'inactive', 'maintenance', 'all'] },
      },
    },
  },
  {
    name: 'get_orchestration_history',
    description: 'Get the history of recent orchestration requests.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Number of records to return (default: 20)' },
      },
    },
  },
];

// ============================================================================
// MCP SERVER
// ============================================================================

export class CorneliusMCPServer {
  private readonly serverInfo = {
    name: 'cornelius-ai',
    version: '1.0.0',
    description: 'Cornelius — Master AI Orchestrator (Luminous Multi-Agent Framework)',
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  };

  /**
   * Handle MCP tool call
   */
  async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      switch (toolName) {
        case 'orchestrate':
          return await this.handleOrchestrate(args);
        case 'analyse_intent':
          return await this.handleAnalyseIntent(args);
        case 'get_agent_status':
          return this.handleGetAgentStatus(args);
        case 'get_mesh_topology':
          return this.handleGetMeshTopology();
        case 'negotiate_consensus':
          return await this.handleNegotiateConsensus(args);
        case 'get_routing_metrics':
          return this.handleGetRoutingMetrics();
        case 'list_agents':
          return this.handleListAgents(args);
        case 'get_orchestration_history':
          return this.handleGetOrchestrationHistory(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Get server info and available tools
   */
  getServerInfo() {
    return {
      ...this.serverInfo,
      tools: CORNELIUS_MCP_TOOLS,
    };
  }

  // ============================================================================
  // TOOL HANDLERS
  // ============================================================================

  private async handleOrchestrate(args: Record<string, unknown>): Promise<MCPToolResult> {
    const prompt = args.prompt as string;
    const userId = args.userId as string | undefined;

    const result = await orchestrator.orchestrate(prompt, userId);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          orchestrationId: result.orchestrationId,
          intent: result.intent,
          delegatedTo: result.delegatedTo,
          tasks: result.tasks,
          consensusRequired: result.consensusRequired,
          synthesisedResponse: result.synthesisedResponse,
          success: result.success,
          timestamp: result.timestamp,
        }, null, 2),
      }],
    };
  }

  private async handleAnalyseIntent(args: Record<string, unknown>): Promise<MCPToolResult> {
    const prompt = args.prompt as string;
    const result = await orchestrator.analyseIntent(prompt);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  }

  private handleGetAgentStatus(args: Record<string, unknown>): MCPToolResult {
    const agentId = args.agentId as string | undefined;
    const result = orchestrator.getAgentStatus(agentId);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  }

  private handleGetMeshTopology(): MCPToolResult {
    const status = orchestrator.getMeshStatus();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(status, null, 2),
      }],
    };
  }

  private async handleNegotiateConsensus(args: Record<string, unknown>): Promise<MCPToolResult> {
    const topic = args.topic as string;
    const options = (args.options as string).split(',').map(s => s.trim());
    const participants = (args.participants as string).split(',').map(s => s.trim());

    const result = await orchestrator.negotiateConsensus({ topic, options, participants });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  }

  private handleGetRoutingMetrics(): MCPToolResult {
    const metrics = nexusRouter.getMetrics();
    const trails = nexusRouter.getPheromoneTrails();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ metrics, pheromoneTrails: trails.slice(0, 20) }, null, 2),
      }],
    };
  }

  private handleListAgents(args: Record<string, unknown>): MCPToolResult {
    const tierFilter = args.tier as string | undefined;
    const statusFilter = args.status as string | undefined;

    let agents = allAgents;

    if (tierFilter && tierFilter !== 'all') {
      agents = agents.filter(a => a.tier === tierFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      agents = agents.filter(a => a.status === statusFilter);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(agents.map(a => ({
          id: a.id,
          name: a.displayName,
          tier: a.tier,
          role: a.role,
          capabilities: a.capabilities,
          status: a.status,
        })), null, 2),
      }],
    };
  }

  private handleGetOrchestrationHistory(args: Record<string, unknown>): MCPToolResult {
    const limit = parseInt(args.limit as string || '20', 10);
    const history = orchestrator.getOrchestrationHistory(limit);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(history, null, 2),
      }],
    };
  }
}

export const mcpServer = new CorneliusMCPServer();
export default mcpServer;
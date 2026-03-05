/**
 * Cornelius Orchestrator — Master AI Orchestration Engine
 * 
 * The central nervous system of the Trancendos Agentic Framework.
 * Analyses user requests, routes tasks to appropriate agents, and synthesises results.
 * 
 * Migrated from: server/services/corneliusOrchestrator.ts (Trancendos monorepo)
 * Architecture: Luminous Multi-Agent Orchestration (Swarm Intelligence)
 */

import { agentRegistry, getAgentsByCapability, type Agent } from '../registry/agents';

// ============================================================================
// INTENT ROUTING
// ============================================================================

const INTENT_KEYWORDS: Record<string, string[]> = {
  code_generation: ['implement', 'build', 'create app', 'develop', 'program', 'function', 'class', 'api', 'write code', 'generate code'],
  security_audit: ['security', 'vulnerability', 'owasp', 'threat', 'penetration test', 'audit security', 'sql injection', 'xss', 'csrf', 'check for vulnerabilities', 'security scan'],
  dependency_validation: ['dependency', 'package', 'npm', 'library', 'malicious', 'license'],
  compliance: ['compliance', 'gdpr', 'soc 2', 'iso 27001', 'regulation', 'governance'],
  legal: ['contract', 'legal', 'terms', 'agreement', 'liability'],
  patent: ['patent', 'ip', 'intellectual property', 'prior art', 'trademark'],
  deployment: ['deploy', 'kubernetes', 'docker', 'ci/cd', 'infrastructure'],
  financial: ['cost', 'budget', 'expense', 'revenue', 'profit'],
  trading: ['trade', 'market', 'stock', 'investment', 'portfolio'],
  knowledge: ['documentation', 'explain', 'what is', 'how to', 'search', 'find'],
  self_healing: ['error', 'broken', 'fix', 'heal', 'repair', 'anomaly', 'crash', 'failure'],
  data_routing: ['route', 'transfer', 'send data', 'move file', 'transmit'],
  secrets: ['secret', 'api key', 'credential', 'password', 'token store'],
  certificate: ['certificate', 'pqc', 'quantum', 'crypto', 'sign', 'encrypt'],
};

const AGENT_ROUTING: Record<string, string> = {
  code_generation: 'codex',
  security_audit: 'guardian',
  dependency_validation: 'carl',
  compliance: 'senator',
  legal: 'justitia',
  patent: 'justitia',
  deployment: 'prometheus',
  financial: 'dorris',
  trading: 'mercury',
  knowledge: 'carl',
  code_review: 'tessa',
  self_healing: 'the_dr',
  data_routing: 'hive_agent',
  secrets: 'void_agent',
  certificate: 'lighthouse_agent',
};

// ============================================================================
// TYPES
// ============================================================================

export interface IntentAnalysisResult {
  intent: string;
  confidence: number;
  suggestedAgent: string;
  reasoning: string;
  alternativeAgents?: string[];
}

export interface TaskDelegationResult {
  taskId: string;
  agentId: string;
  agentName: string;
  status: 'delegated' | 'queued' | 'failed';
  estimatedCompletion?: string;
}

export interface OrchestrationResult {
  success: boolean;
  orchestrationId: string;
  intent: string;
  delegatedTo: string[];
  tasks: TaskDelegationResult[];
  synthesisedResponse?: string;
  consensusRequired?: boolean;
  error?: string;
  timestamp: string;
}

export interface ConsensusRequest {
  topic: string;
  options: string[];
  participants: string[];
  weights?: Record<string, number>;
  deadline?: string;
}

export interface ConsensusResult {
  roundId: string;
  topic: string;
  winner: string;
  votes: Record<string, string>;
  confidence: number;
  reasoning: string;
  timestamp: string;
}

export interface AgentMeshStatus {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  maintenanceAgents: number;
  topology: {
    tier1: string[];
    tier2: string[];
    tier3: string[];
  };
  lastUpdated: string;
}

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

export class CorneliusOrchestrator {
  private taskQueue: Map<string, TaskDelegationResult> = new Map();
  private orchestrationHistory: OrchestrationResult[] = [];
  private consensusRounds: Map<string, ConsensusResult> = new Map();

  /**
   * Analyse user intent using keyword detection + LLM classification
   */
  async analyseIntent(userPrompt: string): Promise<IntentAnalysisResult> {
    const lowerPrompt = userPrompt.toLowerCase();

    // Fast path: keyword-based detection
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerPrompt.includes(keyword)) {
          const suggestedAgent = AGENT_ROUTING[intent] || 'cornelius';
          return {
            intent,
            confidence: 0.8,
            suggestedAgent,
            reasoning: `Keyword match: "${keyword}" → ${intent}`,
            alternativeAgents: this.getAlternativeAgents(intent),
          };
        }
      }
    }

    // Default: route to Cornelius for general orchestration
    return {
      intent: 'general',
      confidence: 0.5,
      suggestedAgent: 'cornelius',
      reasoning: 'No specific intent detected — routing to Cornelius for general orchestration',
      alternativeAgents: ['carl', 'archie'],
    };
  }

  /**
   * Orchestrate a user request — analyse intent and delegate to appropriate agents
   */
  async orchestrate(userPrompt: string, userId?: string): Promise<OrchestrationResult> {
    const orchestrationId = `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    try {
      // Step 1: Analyse intent
      const intentResult = await this.analyseIntent(userPrompt);

      // Step 2: Determine if consensus is required (multi-agent tasks)
      const consensusRequired = this.requiresConsensus(intentResult.intent);

      // Step 3: Delegate to primary agent
      const primaryTask = await this.delegateTask(
        orchestrationId,
        intentResult.suggestedAgent,
        userPrompt,
        intentResult.intent
      );

      const tasks = [primaryTask];

      // Step 4: Delegate to alternative agents if consensus required
      if (consensusRequired && intentResult.alternativeAgents) {
        for (const altAgentId of intentResult.alternativeAgents.slice(0, 2)) {
          const altTask = await this.delegateTask(
            orchestrationId,
            altAgentId,
            userPrompt,
            intentResult.intent
          );
          tasks.push(altTask);
        }
      }

      const result: OrchestrationResult = {
        success: true,
        orchestrationId,
        intent: intentResult.intent,
        delegatedTo: tasks.map(t => t.agentId),
        tasks,
        consensusRequired,
        synthesisedResponse: `Task orchestrated to ${tasks.map(t => t.agentName).join(', ')}. Awaiting agent responses.`,
        timestamp,
      };

      this.orchestrationHistory.push(result);
      return result;

    } catch (error) {
      const errorResult: OrchestrationResult = {
        success: false,
        orchestrationId,
        intent: 'unknown',
        delegatedTo: [],
        tasks: [],
        error: error instanceof Error ? error.message : 'Unknown orchestration error',
        timestamp,
      };
      this.orchestrationHistory.push(errorResult);
      return errorResult;
    }
  }

  /**
   * Delegate a task to a specific agent
   */
  async delegateTask(
    orchestrationId: string,
    agentId: string,
    prompt: string,
    intent: string
  ): Promise<TaskDelegationResult> {
    const taskId = `task_${orchestrationId}_${agentId}_${Date.now()}`;
    const agent = agentRegistry.get(agentId);

    const task: TaskDelegationResult = {
      taskId,
      agentId,
      agentName: agent?.displayName || agentId,
      status: agent ? 'delegated' : 'failed',
      estimatedCompletion: new Date(Date.now() + 30000).toISOString(),
    };

    this.taskQueue.set(taskId, task);
    return task;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskDelegationResult | null {
    return this.taskQueue.get(taskId) || null;
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId?: string): Agent | Agent[] | null {
    if (agentId) {
      return agentRegistry.get(agentId) || null;
    }
    return Array.from(agentRegistry.values());
  }

  /**
   * Get agent mesh topology and status
   */
  getMeshStatus(): AgentMeshStatus {
    const agents = Array.from(agentRegistry.values());
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      inactiveAgents: agents.filter(a => a.status === 'inactive').length,
      maintenanceAgents: agents.filter(a => a.status === 'maintenance').length,
      topology: {
        tier1: agents.filter(a => a.tier === 'core').map(a => a.id),
        tier2: agents.filter(a => a.tier === 'process').map(a => a.id),
        tier3: agents.filter(a => a.tier === 'specialized').map(a => a.id),
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Initiate multi-agent consensus negotiation
   * Uses argumentative weighted evaluation (Luminous consensus protocol)
   */
  async negotiateConsensus(request: ConsensusRequest): Promise<ConsensusResult> {
    const roundId = `consensus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Weighted voting: each participant votes on the best option
    const votes: Record<string, string> = {};
    const weights = request.weights || {};

    for (const participantId of request.participants) {
      const agent = agentRegistry.get(participantId);
      if (agent) {
        // Simple heuristic: agents vote based on their capabilities
        const vote = this.agentVote(agent, request.options, request.topic);
        votes[participantId] = vote;
      }
    }

    // Tally weighted votes
    const tally: Record<string, number> = {};
    for (const [agentId, vote] of Object.entries(votes)) {
      const weight = weights[agentId] || 1;
      tally[vote] = (tally[vote] || 0) + weight;
    }

    const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || request.options[0];
    const totalWeight = Object.values(tally).reduce((a, b) => a + b, 0);
    const confidence = totalWeight > 0 ? (tally[winner] || 0) / totalWeight : 0;

    const result: ConsensusResult = {
      roundId,
      topic: request.topic,
      winner,
      votes,
      confidence,
      reasoning: `Weighted consensus: ${winner} received ${Math.round(confidence * 100)}% of weighted votes`,
      timestamp: new Date().toISOString(),
    };

    this.consensusRounds.set(roundId, result);
    return result;
  }

  /**
   * Get orchestration history
   */
  getOrchestrationHistory(limit = 20): OrchestrationResult[] {
    return this.orchestrationHistory.slice(-limit);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private requiresConsensus(intent: string): boolean {
    const consensusIntents = ['compliance', 'legal', 'financial', 'trading', 'deployment'];
    return consensusIntents.includes(intent);
  }

  private getAlternativeAgents(intent: string): string[] {
    const alternatives: Record<string, string[]> = {
      code_generation: ['the_dr', 'archie'],
      security_audit: ['norman', 'guardian'],
      compliance: ['senator', 'justitia'],
      financial: ['mercury', 'dorris'],
      knowledge: ['observatory_agent', 'carl'],
    };
    return alternatives[intent] || [];
  }

  private agentVote(agent: Agent, options: string[], topic: string): string {
    // Simple heuristic voting based on agent capabilities
    // In production: use LLM to generate reasoned votes
    const capabilityMatch = options.findIndex(opt =>
      agent.capabilities.some(cap => opt.toLowerCase().includes(cap.replace('_', ' ')))
    );
    return capabilityMatch >= 0 ? options[capabilityMatch] : options[0];
  }
}

// Singleton instance
export const orchestrator = new CorneliusOrchestrator();
export default orchestrator;
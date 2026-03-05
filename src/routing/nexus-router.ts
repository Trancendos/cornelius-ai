/**
 * Nexus Router — Ant Colony Optimization (ACO) Inter-Agent Routing
 * 
 * Implements Phase 1 (round-robin with latency tracking) of the ACO routing system.
 * Phase 2: Latency-aware routing
 * Phase 3: Full ACO with pheromone trails (Redis sorted sets)
 * 
 * Architecture: The Nexus — Swarm Intelligence AI Data Transfer Hub
 */

export interface RouteEntry {
  agentId: string;
  endpoint: string;
  latencyMs: number;
  successRate: number;
  pheromoneStrength: number; // ACO pheromone trail (0-1)
  lastUsed: Date;
  totalRequests: number;
  failedRequests: number;
}

export interface RoutingDecision {
  selectedAgent: string;
  endpoint: string;
  algorithm: 'round-robin' | 'latency-aware' | 'aco';
  pheromoneStrength: number;
  reasoning: string;
  alternativeRoutes: string[];
}

export interface PheromoneTrail {
  from: string;
  to: string;
  strength: number;
  lastReinforced: Date;
  evaporationRate: number;
}

// ============================================================================
// ACO NEXUS ROUTER
// ============================================================================

export class NexusRouter {
  private routeTable: Map<string, RouteEntry[]> = new Map();
  private pheromoneTrails: Map<string, PheromoneTrail> = new Map();
  private roundRobinIndex: Map<string, number> = new Map();
  
  // ACO parameters
  private readonly EVAPORATION_RATE = 0.1; // Pheromone evaporation per cycle
  private readonly REINFORCEMENT_FACTOR = 0.3; // Pheromone reinforcement on success
  private readonly MIN_PHEROMONE = 0.01;
  private readonly MAX_PHEROMONE = 1.0;

  /**
   * Register an agent endpoint in the routing table
   */
  registerAgent(agentId: string, endpoint: string): void {
    const existing = this.routeTable.get(agentId) || [];
    const entry: RouteEntry = {
      agentId,
      endpoint,
      latencyMs: 0,
      successRate: 1.0,
      pheromoneStrength: 0.5, // Start with neutral pheromone
      lastUsed: new Date(),
      totalRequests: 0,
      failedRequests: 0,
    };
    existing.push(entry);
    this.routeTable.set(agentId, existing);
  }

  /**
   * Route a message to the optimal agent endpoint
   * Phase 1: Round-robin
   * Phase 2: Latency-aware (when latency data available)
   * Phase 3: Full ACO (when pheromone trails are established)
   */
  route(targetAgentId: string, sourceAgentId?: string): RoutingDecision | null {
    const routes = this.routeTable.get(targetAgentId);
    if (!routes || routes.length === 0) {
      return null;
    }

    // Determine routing algorithm based on available data
    const hasLatencyData = routes.some(r => r.totalRequests > 10);
    const hasPheromoneData = routes.some(r => r.pheromoneStrength !== 0.5);

    let selected: RouteEntry;
    let algorithm: RoutingDecision['algorithm'];

    if (hasPheromoneData && routes.length > 1) {
      // Phase 3: ACO routing
      selected = this.acoSelect(routes);
      algorithm = 'aco';
    } else if (hasLatencyData && routes.length > 1) {
      // Phase 2: Latency-aware routing
      selected = this.latencyAwareSelect(routes);
      algorithm = 'latency-aware';
    } else {
      // Phase 1: Round-robin
      selected = this.roundRobinSelect(targetAgentId, routes);
      algorithm = 'round-robin';
    }

    // Update pheromone trail if source is known
    if (sourceAgentId) {
      this.depositPheromone(sourceAgentId, targetAgentId, selected.endpoint);
    }

    return {
      selectedAgent: selected.agentId,
      endpoint: selected.endpoint,
      algorithm,
      pheromoneStrength: selected.pheromoneStrength,
      reasoning: this.buildReasoning(selected, algorithm),
      alternativeRoutes: routes
        .filter(r => r.endpoint !== selected.endpoint)
        .map(r => r.endpoint),
    };
  }

  /**
   * Record the result of a routing decision (for pheromone reinforcement)
   */
  recordResult(agentId: string, endpoint: string, success: boolean, latencyMs: number): void {
    const routes = this.routeTable.get(agentId);
    if (!routes) return;

    const route = routes.find(r => r.endpoint === endpoint);
    if (!route) return;

    route.totalRequests++;
    route.latencyMs = (route.latencyMs * 0.8) + (latencyMs * 0.2); // Exponential moving average
    route.lastUsed = new Date();

    if (!success) {
      route.failedRequests++;
      // Evaporate pheromone on failure
      route.pheromoneStrength = Math.max(
        this.MIN_PHEROMONE,
        route.pheromoneStrength * (1 - this.EVAPORATION_RATE * 2)
      );
    } else {
      // Reinforce pheromone on success
      route.pheromoneStrength = Math.min(
        this.MAX_PHEROMONE,
        route.pheromoneStrength + this.REINFORCEMENT_FACTOR * (1 / (latencyMs / 100 + 1))
      );
    }

    route.successRate = 1 - (route.failedRequests / route.totalRequests);
  }

  /**
   * Get current pheromone trail state (for monitoring)
   */
  getPheromoneTrails(): PheromoneTrail[] {
    return Array.from(this.pheromoneTrails.values());
  }

  /**
   * Get routing table (for monitoring)
   */
  getRoutingTable(): Record<string, RouteEntry[]> {
    const result: Record<string, RouteEntry[]> = {};
    for (const [agentId, routes] of this.routeTable.entries()) {
      result[agentId] = routes;
    }
    return result;
  }

  /**
   * Apply pheromone evaporation (should be called periodically)
   */
  evaporatePheromones(): void {
    for (const trail of this.pheromoneTrails.values()) {
      trail.strength = Math.max(
        this.MIN_PHEROMONE,
        trail.strength * (1 - trail.evaporationRate)
      );
    }

    // Also evaporate route pheromones
    for (const routes of this.routeTable.values()) {
      for (const route of routes) {
        route.pheromoneStrength = Math.max(
          this.MIN_PHEROMONE,
          route.pheromoneStrength * (1 - this.EVAPORATION_RATE)
        );
      }
    }
  }

  /**
   * Get routing metrics
   */
  getMetrics(): {
    totalAgents: number;
    totalRoutes: number;
    averageLatency: number;
    averageSuccessRate: number;
    pheromoneTrailCount: number;
  } {
    const allRoutes = Array.from(this.routeTable.values()).flat();
    const avgLatency = allRoutes.length > 0
      ? allRoutes.reduce((sum, r) => sum + r.latencyMs, 0) / allRoutes.length
      : 0;
    const avgSuccessRate = allRoutes.length > 0
      ? allRoutes.reduce((sum, r) => sum + r.successRate, 0) / allRoutes.length
      : 1;

    return {
      totalAgents: this.routeTable.size,
      totalRoutes: allRoutes.length,
      averageLatency: Math.round(avgLatency),
      averageSuccessRate: Math.round(avgSuccessRate * 100) / 100,
      pheromoneTrailCount: this.pheromoneTrails.size,
    };
  }

  // ============================================================================
  // PRIVATE: ROUTING ALGORITHMS
  // ============================================================================

  private roundRobinSelect(agentId: string, routes: RouteEntry[]): RouteEntry {
    const currentIndex = this.roundRobinIndex.get(agentId) || 0;
    const selected = routes[currentIndex % routes.length];
    this.roundRobinIndex.set(agentId, (currentIndex + 1) % routes.length);
    return selected;
  }

  private latencyAwareSelect(routes: RouteEntry[]): RouteEntry {
    // Select route with lowest latency, weighted by success rate
    return routes.reduce((best, current) => {
      const bestScore = best.latencyMs / (best.successRate + 0.01);
      const currentScore = current.latencyMs / (current.successRate + 0.01);
      return currentScore < bestScore ? current : best;
    });
  }

  private acoSelect(routes: RouteEntry[]): RouteEntry {
    // ACO probabilistic selection based on pheromone strength
    const totalPheromone = routes.reduce((sum, r) => sum + r.pheromoneStrength, 0);
    const random = Math.random() * totalPheromone;
    
    let cumulative = 0;
    for (const route of routes) {
      cumulative += route.pheromoneStrength;
      if (random <= cumulative) {
        return route;
      }
    }
    return routes[routes.length - 1];
  }

  private depositPheromone(from: string, to: string, endpoint: string): void {
    const trailKey = `${from}→${to}:${endpoint}`;
    const existing = this.pheromoneTrails.get(trailKey);
    
    if (existing) {
      existing.strength = Math.min(
        this.MAX_PHEROMONE,
        existing.strength + this.REINFORCEMENT_FACTOR
      );
      existing.lastReinforced = new Date();
    } else {
      this.pheromoneTrails.set(trailKey, {
        from,
        to,
        strength: this.REINFORCEMENT_FACTOR,
        lastReinforced: new Date(),
        evaporationRate: this.EVAPORATION_RATE,
      });
    }
  }

  private buildReasoning(route: RouteEntry, algorithm: string): string {
    switch (algorithm) {
      case 'aco':
        return `ACO selection: pheromone strength ${route.pheromoneStrength.toFixed(3)}, success rate ${(route.successRate * 100).toFixed(1)}%`;
      case 'latency-aware':
        return `Latency-aware: ${route.latencyMs}ms avg latency, ${(route.successRate * 100).toFixed(1)}% success rate`;
      default:
        return `Round-robin selection (${route.totalRequests} total requests)`;
    }
  }
}

export const nexusRouter = new NexusRouter();
export default nexusRouter;
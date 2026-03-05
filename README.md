# Cornelius-AI — Master AI Orchestrator

> **Luminous** — The Cognitive Core of the Trancendos Industry 6.0 Platform

Cornelius is the master orchestrator of the Trancendos 24-agent mesh. It analyses user intent, routes tasks to the appropriate specialist agents, negotiates consensus across the mesh, and exposes the entire system via REST, WebSocket, and Model Context Protocol (MCP).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CORNELIUS-AI                             │
│                   Master AI Orchestrator                        │
├─────────────────┬───────────────────┬───────────────────────────┤
│  Agent Registry │   Orchestrator    │      Nexus Router         │
│  (24 agents)    │  (Intent → Agent) │   (ACO Pheromone Trails)  │
├─────────────────┴───────────────────┴───────────────────────────┤
│                      MCP Server (8 tools)                       │
├─────────────────────────────────────────────────────────────────┤
│              REST API + WebSocket (Express)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | File | Description |
|-----------|------|-------------|
| Agent Registry | `src/registry/agents.ts` | 24-agent mesh (7 core + 5 process + 12 specialized) |
| Orchestrator | `src/orchestration/orchestrator.ts` | Intent analysis, task delegation, consensus |
| Nexus Router | `src/routing/nexus-router.ts` | 3-phase ACO routing with pheromone trails |
| MCP Server | `src/mcp/mcp-server.ts` | Model Context Protocol exposure (8 tools) |
| API Server | `src/api/server.ts` | REST + WebSocket interface |
| Config | `src/config/env.ts` | Zod-validated environment config |
| Logger | `src/utils/logger.ts` | Pino structured logging |

---

## The 24-Agent Mesh

### Tier 1 — Core Agents (7)
| Agent | ID | Role |
|-------|----|------|
| Cornelius | `cornelius` | Master orchestrator |
| The Dr | `the_dr` | Self-healing & anomaly detection |
| Norman | `norman` | Security intelligence |
| Guardian | `guardian` | IAM & zero-trust |
| Dorris | `dorris` | Financial autonomy & mailbox |
| Prometheus | `prometheus` | Infrastructure & deployment |
| SYNAPSE | `synapse` | Neuro-symbolic verification |

### Tier 2 — Process Agents (5)
| Agent | ID | Role |
|-------|----|------|
| Mercury | `mercury` | Autonomous trading |
| CARL | `carl` | Knowledge & RAG |
| Senator | `senator` | Compliance & governance |
| Justitia | `justitia` | Legal & contracts |
| Tessa | `tessa` | Code review & quality |

### Tier 3 — Specialized Agents (12)
| Agent | ID | Role |
|-------|----|------|
| Nexus | `nexus_agent` | ACO routing |
| HIVE | `hive_agent` | Data transfer |
| Chaos | `chaos_agent` | Adversarial testing |
| Lighthouse | `lighthouse_agent` | PQC (ML-DSA/ML-KEM) |
| Void | `void_agent` | Shamir's Secret Sharing |
| IceBox | `icebox_agent` | Malware sandbox |
| Observatory | `observatory_agent` | Immutable event log |
| Codex | `codex` | Code generation |
| Atlas | `atlas` | System mapping |
| Iris | `iris` | UI/UX generation |
| Echo | `echo` | Communication |
| Forge | `forge` | Build & CI/CD |

---

## Nexus ACO Routing

The Nexus Router implements Ant Colony Optimization in 3 phases:

| Phase | Trigger | Algorithm |
|-------|---------|-----------|
| Phase 1 | Default | Round-robin |
| Phase 2 | >10 requests recorded | Latency-aware weighted selection |
| Phase 3 | Pheromone data established | Full ACO with evaporation + reinforcement |

**Parameters:**
- Evaporation rate: `0.1` (configurable via `ACO_EVAPORATION_RATE`)
- Reinforcement factor: `0.3` (configurable via `ACO_REINFORCEMENT_FACTOR`)
- Evaporation interval: 60 seconds

---

## MCP Server

Cornelius exposes 8 tools via the Model Context Protocol:

| Tool | Description |
|------|-------------|
| `orchestrate` | Full orchestration — analyse intent + delegate |
| `analyse_intent` | Intent analysis only (no execution) |
| `get_agent_status` | Status of a specific agent |
| `get_mesh_topology` | Full mesh topology and health |
| `negotiate_consensus` | Trigger consensus round |
| `get_routing_metrics` | Nexus ACO routing metrics |
| `list_agents` | List agents with optional filtering |
| `get_orchestration_history` | Audit trail |

---

## API Reference

### Health & Metrics
```
GET  /health              — Service health check
GET  /metrics             — Mesh + routing metrics
```

### Orchestration
```
POST /api/v1/orchestrate       — Orchestrate a task
POST /api/v1/analyse-intent    — Analyse intent only
POST /api/v1/consensus         — Trigger consensus round
GET  /api/v1/history           — Orchestration audit trail
```

### Agent Management
```
GET  /api/v1/agents            — List all agents
GET  /api/v1/agents/:id        — Get agent details
GET  /api/v1/agents/:id/status — Get agent live status
```

### Mesh Topology
```
GET  /api/v1/mesh              — Full mesh topology
GET  /api/v1/mesh/routing      — Nexus ACO routing metrics
```

### MCP
```
GET  /api/v1/mcp/info          — MCP server capabilities
POST /api/v1/mcp/tool          — Execute MCP tool call
```

### WebSocket
```
ws://host:port/ws
```

**Message types:**
- `orchestrate` → `orchestration_result`
- `ping` → `pong`
- `subscribe_mesh` → `subscribed` + periodic `mesh_heartbeat`

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy env config
cp .env.example .env

# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start

# Type check
npm run typecheck

# Tests
npm test
```

---

## Integration with Infinity Portal

Cornelius integrates with the Infinity Portal backend via:

1. **REST API** — `POST /api/v1/cornelius/orchestrate` (proxied through infinity-portal)
2. **WebSocket** — Real-time agent mesh events
3. **MCP** — Direct tool calls from Claude/other LLM clients

Set `INFINITY_PORTAL_URL` in `.env` to point at your running infinity-portal backend.

---

## Zero-Cost Mandate

Cornelius is designed to run on free-tier infrastructure:
- **Render.com** free tier (512MB RAM, 0.1 CPU)
- **Railway.app** free tier
- **Fly.io** free tier (256MB RAM)

All LLM calls are optional — set `LLM_PROVIDER=none` to use keyword-based intent classification only (zero API cost).

---

## Related Repositories

| Repo | Component | Description |
|------|-----------|-------------|
| [infinity-portal](https://github.com/Trancendos/infinity-portal) | Infinity Portal | Main frontend + backend gateway |
| [the-dr-ai](https://github.com/Trancendos/the-dr-ai) | The Dr | Self-healing agent |
| [norman-ai](https://github.com/Trancendos/norman-ai) | Norman | Security intelligence |
| [guardian-ai](https://github.com/Trancendos/guardian-ai) | Guardian | IAM & zero-trust |
| [central-plexus](https://github.com/Trancendos/central-plexus) | Infinity OS | Event bus & routing |
| [shared-core](https://github.com/Trancendos/shared-core) | Transfer Hub | Shared utilities |

---

*Part of the Trancendos Industry 6.0 / 2060 Standard platform.*
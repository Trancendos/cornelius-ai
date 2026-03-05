/**
 * Environment Configuration — Cornelius-AI
 * Centralised env var parsing with Zod validation
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),

  // Auth
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRY: z.string().default('1h'),

  // Infinity Portal backend
  INFINITY_PORTAL_URL: z.string().url().default('http://localhost:8000'),
  INFINITY_PORTAL_API_KEY: z.string().optional(),

  // LLM Provider (for intent classification)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'local', 'none']).default('none'),
  LLM_MODEL: z.string().default('gpt-4o-mini'),

  // Agent mesh
  AGENT_HEARTBEAT_INTERVAL_MS: z.coerce.number().default(30_000),
  CONSENSUS_TIMEOUT_MS: z.coerce.number().default(10_000),
  MAX_ORCHESTRATION_HISTORY: z.coerce.number().default(1000),

  // Nexus ACO routing
  ACO_EVAPORATION_RATE: z.coerce.number().default(0.1),
  ACO_REINFORCEMENT_FACTOR: z.coerce.number().default(0.3),
  ACO_PHASE2_THRESHOLD: z.coerce.number().default(10),

  // MCP server
  MCP_ENABLED: z.coerce.boolean().default(true),
  MCP_SERVER_NAME: z.string().default('cornelius-ai'),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach(issue => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    // Don't exit in test mode — use defaults
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
  return result.success ? result.data : envSchema.parse({});
}

export const env = parseEnv();
export type Env = typeof env;
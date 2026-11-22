import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from root or server
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const configSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  TAVILY_API_KEY: z.string().optional().default(''),
  MAX_AGENT_ITERATIONS: z.coerce.number().default(5),
  MAX_WEB_SEARCHES_PER_REQUEST: z.coerce.number().default(5),
  AGENT_REQUEST_TIMEOUT_MS: z.coerce.number().default(60000),
  MOCK_AI: z.coerce.boolean().default(false),
});

const rawConfig = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  APP_TIMEZONE: process.env.APP_TIMEZONE,
  DATABASE_URL: process.env.DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  MAX_AGENT_ITERATIONS: process.env.MAX_AGENT_ITERATIONS,
  MAX_WEB_SEARCHES_PER_REQUEST: process.env.MAX_WEB_SEARCHES_PER_REQUEST,
  AGENT_REQUEST_TIMEOUT_MS: process.env.AGENT_REQUEST_TIMEOUT_MS,
  MOCK_AI: process.env.MOCK_AI === 'true' || !process.env.OPENAI_API_KEY,
};

export const config = configSchema.parse(rawConfig);
export type Config = z.infer<typeof configSchema>;

import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("4089"),
  DATABASE_URL: z.string(),

  // AirLyft Configuration
  AIRLYFT_PROJECT_ID: z.string().optional(),
  AIRLYFT_API_KEY: z.string().optional(),
  AIRLYFT_GRAPHQL_URL: z
    .string()
    .default("https://quests-api.datahaven.xyz/graphql"),
  AIRLYFT_REST_URL: z.string().default("https://quests-api.datahaven.xyz/api"),

  // Logging Configuration
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),
  LOG_DIR: z.string().default("./logs"),

  // Services URLs via API Gateway
  AUTH_SERVICE_URL: z.string().default("http://localhost:3000/auth-service"),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),

  database: {
    url: env.DATABASE_URL,
  },

  airLyft: {
    projectId: env.AIRLYFT_PROJECT_ID || "",
    apiKey: env.AIRLYFT_API_KEY || "",
    graphqlEndpoint: env.AIRLYFT_GRAPHQL_URL,
    restEndpoint: env.AIRLYFT_REST_URL,
  },

  logging: {
    level: env.LOG_LEVEL,
    dir: env.LOG_DIR,
  },

  services: {
    authServiceUrl: env.AUTH_SERVICE_URL,
  },
} as const;

// Export type for TypeScript
export type Config = typeof config;

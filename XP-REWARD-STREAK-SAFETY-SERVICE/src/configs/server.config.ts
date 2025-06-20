import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string(),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_DIR: z.string().default("./logs"),

  // AirLyft Configuration
  AIRLYFT_API_KEY: z.string().optional(),
  AIRLYFT_PROJECT_ID: z.string().optional(),
  AIRLYFT_API_URL: z
    .string()
    .default("https://quests-api.datahaven.xyz/graphql"),

  // Brevo Configuration
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),

  // Service URLs
  QUEST_SERVICE_URL: z.string().url().default("http://localhost:3003"),
});

const envVars = envSchema.parse(process.env);

export const config = {
  env: envVars.NODE_ENV,
  port: parseInt(envVars.PORT, 10),

  database: {
    url: envVars.DATABASE_URL,
  },

  logging: {
    level: envVars.LOG_LEVEL,
    dir: envVars.LOG_DIR,
  },

  airLyft: {
    apiKey: envVars.AIRLYFT_API_KEY || "",
    projectId: envVars.AIRLYFT_PROJECT_ID || "",
    apiUrl: envVars.AIRLYFT_API_URL,
  },

  brevo: {
    apiKey: envVars.BREVO_API_KEY || "",
    senderEmail: envVars.BREVO_SENDER_EMAIL || "",
  },

  services: {
    questServiceUrl: envVars.QUEST_SERVICE_URL,
  },
} as const;

// Export types for TypeScript
export type Config = typeof config;

import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000"),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_DIR: z.string().default("./logs"),

  // Service URLs
  AUTH_SERVICE_URL: z.string().url().default("http://localhost:3001"),
  SUPPORT_SERVICE_URL: z.string().url().default("http://localhost:3002"),
  QUEST_SERVICE_URL: z.string().url().default("http://localhost:3003"),

  // Service Paths
  AUTH_SERVICE_PATH: z.string().default("/auths-ervice"),
  SUPPORT_SERVICE_PATH: z.string().default("/support-service"),
  QUEST_SERVICE_PATH: z.string().default("/quest-service"),
});

const envVars = envSchema.parse(process.env);

export const config = {
  env: envVars.NODE_ENV,
  port: parseInt(envVars.PORT, 10),

  logging: {
    level: envVars.LOG_LEVEL,
    dir: envVars.LOG_DIR,
  },

  // Service URLs
  url: {
    authService: envVars.AUTH_SERVICE_URL || "http://localhost:3001",
    supportService: envVars.SUPPORT_SERVICE_URL || "http://localhost:3002",
    questService: envVars.QUEST_SERVICE_URL || "http://localhost:3003",
  },

  path: {
    authService: envVars.AUTH_SERVICE_PATH,
    supportService: envVars.SUPPORT_SERVICE_PATH,
    questService: envVars.QUEST_SERVICE_PATH,
  },
} as const;

// Export types for TypeScript
export type Config = typeof config;

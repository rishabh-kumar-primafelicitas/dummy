import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string(),

  // JWT Configuration
  JWT_SECRET: z
    .string()
    .min(32, "JWT secret must be at least 32 characters long"),
  JWT_ACCESS_TOKEN_EXPIRE: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRE: z.string().default("7d"),

  // Security Configuration
  BCRYPT_ROUNDS: z.string().default("12"),
  MAX_LOGIN_ATTEMPTS: z.string().default("5"),
  ACCOUNT_LOCK_TIME: z.string().default("2h"),

  // Session Configuration
  SESSION_CLEANUP_INTERVAL: z.string().default("1h"),
  INACTIVE_SESSION_TIMEOUT: z.string().default("30d"),

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

  // Frontend URL
  FRONTEND_URL: z.string().url().default("http://localhost:4200"),

  // Service URLs
  AUTH_SERVICE_URL: z
    .string()
    .url()
    .default("http://localhost:3000/auth-service"),
  QUEST_SERVICE_URL: z
    .string()
    .url()
    .default("http://localhost:3000/quest-service"),
  XP_SERVICE_URL: z.string().url().default("http://localhost:3000/xp-service"),
});

const envVars = envSchema.parse(process.env);

// Helper function to convert time strings to milliseconds
const parseTimeToMs = (timeStr: string): number => {
  const unit = timeStr.slice(-1);
  const value = parseInt(timeStr.slice(0, -1), 10);

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return parseInt(timeStr, 10);
  }
};

export const config = {
  env: envVars.NODE_ENV,
  port: parseInt(envVars.PORT, 10),

  database: {
    url: envVars.DATABASE_URL,
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    accessTokenExpire: envVars.JWT_ACCESS_TOKEN_EXPIRE,
    refreshTokenExpire: envVars.JWT_REFRESH_TOKEN_EXPIRE,
    accessTokenExpireMs: parseTimeToMs(envVars.JWT_ACCESS_TOKEN_EXPIRE),
    refreshTokenExpireMs: parseTimeToMs(envVars.JWT_REFRESH_TOKEN_EXPIRE),
  },

  security: {
    bcryptRounds: parseInt(envVars.BCRYPT_ROUNDS, 10),
    maxLoginAttempts: parseInt(envVars.MAX_LOGIN_ATTEMPTS, 10),
    accountLockTimeMs: parseTimeToMs(envVars.ACCOUNT_LOCK_TIME),
  },

  session: {
    cleanupInterval: envVars.SESSION_CLEANUP_INTERVAL,
    cleanupIntervalMs: parseTimeToMs(envVars.SESSION_CLEANUP_INTERVAL),
    inactiveTimeoutMs: parseTimeToMs(envVars.INACTIVE_SESSION_TIMEOUT),
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

  frontendUrl: envVars.FRONTEND_URL,

  services: {
    authServiceUrl: envVars.AUTH_SERVICE_URL,
    questServiceUrl: envVars.QUEST_SERVICE_URL,
    xpServiceUrl: envVars.XP_SERVICE_URL,
  },
} as const;

// Export types for TypeScript
export type Config = typeof config;

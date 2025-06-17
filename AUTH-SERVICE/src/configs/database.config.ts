import mongoose from "mongoose";
import { config } from "./server.config";
import { logger } from "@utils/logger.util";

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.database.url);
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Database connection failed:", error);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  logger.warn("Database disconnected");
});

mongoose.connection.on("reconnected", () => {
  logger.info("Database reconnected successfully");
});

mongoose.connection.on("error", (error) => {
  logger.error("Database error:", error);
});

mongoose.connection.on("connected", () => {
  logger.info("Database connection established");
});

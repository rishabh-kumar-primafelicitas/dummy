import { createApp } from "./app";
import { connectDatabase } from "@config/database.config";
import { config } from "@config/server.config";
import { logger } from "@utils/logger";
import { SchedulerUtil } from "@utils/scheduler.util";
import mongoose from "mongoose";

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize scheduled jobs
    const scheduler = new SchedulerUtil();
    scheduler.initializeScheduledJobs();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(
        `Server running on port ${config.port} in ${config.env} mode`
      );

      // Log scheduler status
      const jobsStatus = scheduler.getJobsStatus();
      logger.info("Scheduler status:", jobsStatus);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      // Stop scheduled jobs first
      try {
        scheduler.stopAllJobs();
        logger.info("All scheduled jobs stopped");
      } catch (error: any) {
        logger.error("Error stopping scheduled jobs:", error);
      }

      server.close(() => {
        logger.info("HTTP server closed");
      });

      // Close database connections
      await mongoose.connection.close();
      logger.info("Database connection closed");

      process.exit(0);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("UNHANDLED_REJECTION");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

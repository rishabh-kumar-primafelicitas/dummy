import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { morganMiddleware } from "./middlewares/logger.middleware";
import { errorHandler } from "./middlewares/error.handler.middleware";
import { indexRoutes } from "./routes/index.routes";
import { NotFoundError } from "./errors/index";

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Parsing middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Compression middleware
  app.use(compression());

  // Logging middleware
  app.use(morganMiddleware);

  // Health check
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: true, timestamp: new Date().toISOString() });
  });

  // Routes
  app.use("/api", indexRoutes);

  // Not Found handler
  app.use((req, _res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from '@middleware/errorHandler.middleware';
import { config } from '@config/server.config';
import morgan from 'morgan';
import { NotFoundError } from '@utils/errors/index';
import { indexRoutes } from '@routes/index.route';
import { morganMiddleware } from '@middleware/logger.middleware';
export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware
  app.use(compression());

  // Logging middleware
  if (config.env === 'development') {
    app.use(morgan('dev'));
    app.use(morganMiddleware);
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: true, timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api', indexRoutes);

  // Not Found handler
  app.use((req, _res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};

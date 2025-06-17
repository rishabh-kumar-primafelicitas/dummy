import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { morganMiddleware } from "@middlewares/logger.middleware";
import { config } from "./configs/server.config";
import {
  createProxyMiddleware,
  fixRequestBody,
  Options,
} from "http-proxy-middleware";
import { ClientRequest } from "http";
import { logger } from "@utils/logger";

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Compression middleware
  app.use(compression());

  // Logging middleware
  app.use(morganMiddleware);

  // Static file serving (if needed)
  if (config.env === "development") {
    // Gateway info endpoint
    app.get("/", (_req, res): void => {
      const response = {
        status: true,
        message: "API Gateway",
        version: "1.0.0",
        services: {
          auth: "/auth-service",
          support: "/support-service",
        },
      };
      res.json(response);
    });
  }

  // Health check
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: true, timestamp: new Date().toISOString() });
  });

  // Proxy configuration for services
  const services = [
    {
      route: config.path.authService,
      target: config.url.authService,
      rewriteFrom: "^/auth-service",
      rewriteTo: "",
    },
    {
      route: config.path.supportService,
      target: config.url.supportService,
      rewriteFrom: "^/support-service",
      rewriteTo: "",
    },
    {
      route: config.path.questService,
      target: config.url.questService,
      rewriteFrom: "^/quest-service",
      rewriteTo: "",
    },
  ];

  // Health check utility function
  const checkServiceHealth = async (serviceUrl: string): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      // Construct health check URL using the origin of the serviceUrl.
      // This assumes the health endpoint is at '/health' on the root of the service host.
      const parsedServiceUrl = new URL(serviceUrl);
      const healthCheckEndpoint = `${parsedServiceUrl.origin}/health`;

      const response = await fetch(healthCheckEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal, // Pass the abort signal to fetch
      });

      clearTimeout(timeoutId); // Clear the timeout if fetch completes

      if (response.ok) {
        const data = (await response.json()) as { status?: boolean };
        return data.status === true;
      }
      return false;
    } catch (error) {
      clearTimeout(timeoutId); // Clear the timeout if fetch errors
      // Log the original serviceUrl and the actual endpoint checked for clarity
      const parsedServiceUrl = new URL(serviceUrl);
      const healthCheckEndpoint = `${parsedServiceUrl.origin}/health`;
      if (error instanceof Error && error.name === "AbortError") {
        console.error(
          `Health check timed out for service ${serviceUrl} (checked at ${healthCheckEndpoint})`
        );
      } else {
        console.error(
          `Health check failed for service ${serviceUrl} (checked at ${healthCheckEndpoint}):`,
          error
        );
      }
      return false;
    }
  };

  // const checkServiceHealth = async (serviceUrl: string): Promise<boolean> => {
  //   try {
  //     // Construct health check URL using the origin of the serviceUrl.
  //     // This assumes the health endpoint is at '/health' on the root of the service host.
  //     const parsedServiceUrl = new URL(serviceUrl);
  //     const healthCheckEndpoint = `${parsedServiceUrl.origin}/health`;

  //     console.log(`Checking health of service at ${healthCheckEndpoint}`);

  //     const response = await fetch(healthCheckEndpoint, {
  //       method: "GET",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     console.log(`Health check response for ${serviceUrl}:`, response);

  //     if (response.ok) {
  //       console.log(`Service ${serviceUrl} is healthy.`);
  //       const data = (await response.json()) as { status?: boolean };
  //       console.log(`Health check data for ${serviceUrl}:`, data);
  //       return data.status === true;
  //     }
  //     return false;
  //   } catch (error) {
  //     // Log the original serviceUrl and the actual endpoint checked for clarity
  //     const parsedServiceUrl = new URL(serviceUrl);
  //     const healthCheckEndpoint = `${parsedServiceUrl.origin}/health`;
  //     console.error(
  //       `Health check failed for service ${serviceUrl} (checked at ${healthCheckEndpoint}):`,
  //       error
  //     );
  //     return false;
  //   }
  // };

  // Setup proxies with health checks
  services.forEach(({ route, target, rewriteFrom, rewriteTo }) => {
    app.use(
      route,
      async (_req: Request, res: Response, next: NextFunction) => {
        // Check service health before proxying
        const isHealthy = await checkServiceHealth(target);

        if (!isHealthy) {
          logger.error(
            `Service unavailable: ${route} (${target}) is unhealthy`
          );
          res.status(503).json({
            error: "Service Unavailable",
            message: `The ${route} service is currently unavailable or unhealthy`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // If healthy, proceed to proxy
        next();
      },
      createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: {
          [rewriteFrom]: rewriteTo,
        },
        onProxyReq: (proxyReq: ClientRequest, req: Request, _res: Response) => {
          console.log("req", req);
          // 1) fixRequestBody only wants (proxyReq, req)
          fixRequestBody(proxyReq, req);

          // 2) grab existing X-Forwarded-For (string|string[]|undefined)
          const existingHdr = req.headers["x-forwarded-for"];
          const existingStr = Array.isArray(existingHdr)
            ? existingHdr.join(", ")
            : existingHdr ?? "";

          // 3) ensure req.ip is a string (Express.Request.ip can be undefined in defs)
          const clientIp = req.ip ?? "";

          // build a guaranteed-string header
          const forwardedFor = existingStr
            ? `${existingStr}, ${clientIp}`
            : clientIp;

          console.log("Setting X-Forwarded-For header:", forwardedFor);

          proxyReq.setHeader("X-Forwarded-For", forwardedFor);
        },

        // selfHandleResponse: false,
        // parseReqBody: true,
        onError: (err: Error, _req: Request, res: Response) => {
          console.error(`Proxy error: ${err.message}`);
          logger.error(`Proxy error: ${err.message}`);
          res.status(503).json({
            status: false,
            error: "Service Unavailable",
            message: "The requested service is currently unavailable",
            timestamp: new Date().toISOString(),
          });
        },
      } as Options)
    );
  });

  // Parsing middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Routes
  //   app.use("/api", indexRoutes);

  // Not Found handler
  //   app.use((req, res, next) => {
  //     const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  //     next(error);
  //   });

  // Error handling middleware (must be last)
  //   app.use(errorHandler);

  return app;
};

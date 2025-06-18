import axios, { AxiosError } from "axios";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from "@utils/errors";
import { AppError } from "@utils/errors/app.error";
import { logger } from "@utils/logger.util";

/**
 * Configure global axios interceptors to handle errors consistently
 */
export function setupAxiosInterceptors(): void {
  // Request interceptor for logging
  axios.interceptors.request.use(
    (config) => {
      logger.debug(
        `Sending ${config.method?.toUpperCase()} request to ${config.url}`
      );
      return config;
    },
    (error) => {
      logger.error("Request configuration error:", error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  axios.interceptors.response.use(
    // Success handler
    (response) => {
      logger.debug(
        `Received ${response.status} response from ${response.config.url}`
      );
      return response;
    },

    // Error handler
    (error: AxiosError) => {
      if (error.response) {
        // The server responded with a status code outside of 2xx range
        const statusCode = error.response.status;
        const responseData = error.response.data as any;
        const requestUrl = error.config?.url || "unknown endpoint";
        const message =
          responseData?.message ||
          responseData?.error ||
          `HTTP Error ${statusCode}`;

        logger.error(
          `Request to ${requestUrl} failed with status ${statusCode}: ${message}`
        );

        // Transform to appropriate application error based on status code
        switch (statusCode) {
          case 400:
            return Promise.reject(new BadRequestError(message));
          case 401:
            return Promise.reject(new UnauthorizedError(message));
          case 403:
            return Promise.reject(new ForbiddenError(message));
          case 404:
            return Promise.reject(new NotFoundError(message));
          default:
            return Promise.reject(new AppError(message, statusCode));
        }
      } else if (error.request) {
        // Request was made but no response received
        logger.error("No response received from server", {
          url: error.config?.url,
          method: error.config?.method,
        });
        return Promise.reject(
          new InternalServerError("No response received from service")
        );
      } else {
        // Error in setting up the request
        logger.error("Error setting up the request", error.message);
        return Promise.reject(
          new InternalServerError(`Request setup error: ${error.message}`)
        );
      }
    }
  );

  logger.info("Axios interceptors configured successfully");
}

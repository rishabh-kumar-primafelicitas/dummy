import { Request, Response, NextFunction } from "express";
import { logger } from "@utils/logger";
import { AppError } from "@utils/errors/app.error";
import { ValidationError } from "@utils/errors/validation.error";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = err;

  // Convert specific errors to AppError
  if (!(error instanceof AppError)) {
    let statusCode = 500;
    let message = "Internal Server Error";

    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      statusCode = 400;
      message = "Validation failed";

      const mongooseErrorObjects = (err as any).errors;
      let processedValidationErrors: Record<string, string> = {};

      if (mongooseErrorObjects && typeof mongooseErrorObjects === "object") {
        processedValidationErrors = Object.values(mongooseErrorObjects).reduce(
          (
            acc: Record<string, string>,
            errorValue: unknown // Start with unknown for safety, then check type
          ) => {
            // Type guard to ensure errorValue is an object with string path and message
            if (
              errorValue &&
              typeof errorValue === "object" &&
              "path" in errorValue &&
              typeof (errorValue as any).path === "string" &&
              "message" in errorValue &&
              typeof (errorValue as any).message === "string"
            ) {
              acc[(errorValue as any).path] = (errorValue as any).message;
            }
            return acc;
          },
          {} as Record<string, string> // Initialize accumulator as Record<string, string>
        );
      }
      error = new ValidationError(
        processedValidationErrors,
        message,
        statusCode
      );
    }
    // Handle Mongoose duplicate key errors
    else if (err.name === "MongoServerError" && (err as any).code === 11000) {
      statusCode = 409;
      message = "Resource already exists";
    }
    // Handle JWT errors
    else if (err.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Authentication failed";
    }
    // Handle JWT expired errors
    else if (err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Authentication expired";
    }
    // Use original message for other errors but make it generic in production
    else if (err.message) {
      if (process.env.NODE_ENV === "production") {
        message = statusCode === 500 ? "Internal Server Error" : "Bad Request";
      } else {
        message = err.message;
      }
    }

    if (!(error instanceof ValidationError)) {
      error = new AppError(message, statusCode, false);
    }
  }

  const appError = error as AppError;

  // Log all errors for debugging
  logger.error("Error occurred:", {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      body: req.body,
      params: req.params,
      query: req.query,
      headers: {
        "user-agent": req.get("user-agent"),
        authorization: req.get("authorization") ? "[REDACTED]" : undefined,
      },
    },
  });

  // Build error response
  const response: any = {
    status: false,
    message: appError.message,
    // statusCode: appError.statusCode,
  };

  // Include validation errors in development mode
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;

    // Include validation details for ValidationError
    if (error instanceof ValidationError) {
      response.validationErrors = error.validationErrors;
    }
  }

  // Ensure JSON response
  res.setHeader("Content-Type", "application/json");
  res.status(appError.statusCode).json(response);
};

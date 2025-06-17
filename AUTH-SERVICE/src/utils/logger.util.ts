import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { config } from "configs/server.config"; 

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }), // Log the stack trace for errors
  winston.format.splat(),
  winston.format.json() // More structured logging for files
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports: winston.transport[] = [
  new DailyRotateFile({
    filename: path.join(config.logging.dir, "error-%DATE%.log"), 
    datePattern: "YYYY-MM-DD",
    level: "error",
    maxSize: "20m",
    maxFiles: "14d",
    format: logFormat,
    zippedArchive: true,
  }),
  new DailyRotateFile({
    filename: path.join(config.logging.dir, "combined-%DATE%.log"), 
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "14d",
    format: logFormat,
    zippedArchive: true,
  }),
];

// Conditionally add console transport for non-production environments
if (config.env !== "production") {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: config.logging.level, // Use config.logging.level
  levels: winston.config.npm.levels,
  format: logFormat, // Default format for this logger
  transports,
  exitOnError: false,
});

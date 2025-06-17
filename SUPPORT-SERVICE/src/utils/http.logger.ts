import { config } from '@config/server.config';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const httpLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`)
);

const transports: winston.transport[] = [
  new DailyRotateFile({
    filename: path.join(config.logging.dir, 'http-access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    maxSize: '20m',
    maxFiles: '14d',
    format: httpLogFormat,
    zippedArchive: true,
  }),
];

// Conditionally add console transport for HTTP logs in development
if (config.env === 'development') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => `${info.message}`) // Morgan already formats the message well
      ),
      level: 'http',
    })
  );
}

export const httpLogger = winston.createLogger({
  level: 'http',
  levels: winston.config.npm.levels,
  format: httpLogFormat,
  transports,
  exitOnError: false,
});

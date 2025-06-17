import morgan from "morgan";
import { httpLogger } from "@utils/http.logger";
import { Request } from "express";

// Client's IP address
morgan.token(
  "client-ip",
  (req: Request) => req.ip || req.socket?.remoteAddress
);

const stream = {
  write: (message: string) => {
    httpLogger.http(message.trim());
  },
};

const skip = () => {
  return false; 
};

export const morganMiddleware = morgan(
  // Add :client-ip to the format string
  ":client-ip - :method :url :status :res[content-length] - :response-time ms",
  { stream, skip }
);

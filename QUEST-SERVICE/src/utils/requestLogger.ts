import { Request, Response, NextFunction } from "express";

// Request Logger Middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const { method, url, body, query, params } = req;
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] ${method} ${url}`);
  // console.log(`Params: ${JSON.stringify(params)}`);
  // console.log(`Query: ${JSON.stringify(query)}`);
  // console.log(`Body: ${JSON.stringify(body)}`);

  next();
};

export default requestLogger;

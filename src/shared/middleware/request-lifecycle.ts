import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

export function requestLifecycleLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  logger.info("Incoming request", {
    module: "http",
    requestId: req.context.requestId,
    sessionId: req.context.sessionId,
    cartId: req.context.cartId,
    method: req.method,
    path: req.originalUrl,
  });

  res.on("finish", () => {
    logger.info("Completed request", {
      module: "http",
      requestId: req.context.requestId,
      sessionId: req.context.sessionId,
      cartId: req.context.cartId,
      statusCode: res.statusCode,
      durationMs: Date.now() - req.context.startedAt,
    });
  });

  next();
}

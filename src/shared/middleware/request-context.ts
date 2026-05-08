import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export interface RequestContext {
  requestId: string;
  sessionId?: string;
  cartId?: string;
  orderId?: string;
  startedAt: number;
}

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = req.header("x-request-id") || randomUUID();
  const cartId = req.session?.cartId;

  req.context = {
    requestId,
    sessionId: req.sessionID,
    cartId,
    startedAt: Date.now(),
  };

  res.setHeader("x-request-id", requestId);
  next();
}

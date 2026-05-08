import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";
import { generateToken } from "../security/csrf";

export function viewLocalsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const flash = req.session.flash ?? null;

  res.locals.appName = env.APP_NAME;
  res.locals.appBaseUrl = env.APP_BASE_URL;
  res.locals.env = env.NODE_ENV;
  res.locals.requestId = req.context.requestId;
  res.locals.currentPath = req.path;
  res.locals.currentUrl = req.originalUrl;
  res.locals.csrfToken = "";
  res.locals.flash = flash;
  res.locals.cartItemCount = req.session.cartItemCount ?? 0;

  if (typeof req.session.flash !== "undefined") {
    req.session.flash = null;
  }

  const shouldGenerateCsrfToken =
    req.path === "/csrf-token" ||
    (req.method === "GET" &&
      !req.path.startsWith("/api/") &&
      req.path !== "/health");

  if (!shouldGenerateCsrfToken) {
    next();
    return;
  }

  const csrfToken = generateToken(req);
  res.locals.csrfToken = csrfToken;

  next();
}

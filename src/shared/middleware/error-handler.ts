import { renderPage } from "../view/render";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { invalidCsrfTokenError } from "../security/csrf";
import { errorResponse } from "../utils/api-response";
import { logger } from "../utils/logger";

export function notFoundHandler(req: Request, res: Response): void {
  const payload = errorResponse(
    "NOT_FOUND",
    `Route ${req.method} ${req.originalUrl} was not found.`,
  );

  if (req.originalUrl.startsWith("/api/")) {
    res.status(404).json(payload);
    return;
  }

  renderPage(req, res, "pages/error", {
    title: "Khong tim thay trang",
    message: payload.error.message,
    statusCode: 404,
  });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let normalizedError: AppError;

  if (error === invalidCsrfTokenError) {
    normalizedError = new AppError({
      statusCode: 403,
      code: "INVALID_CSRF_TOKEN",
      message: "Security token is invalid or missing.",
    });
  } else if (error instanceof AppError) {
    normalizedError = error;
  } else if (error instanceof Error) {
    normalizedError = new AppError({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      details: error.message,
      expose: false,
    });
  } else {
    normalizedError = new AppError({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      expose: false,
    });
  }

  logger.error("Request failed", error, {
    module: "error",
    requestId: req.context?.requestId,
    sessionId: req.context?.sessionId,
    cartId: req.context?.cartId,
    path: req.originalUrl,
  });

  if (res.headersSent) {
    return;
  }

  if (req.originalUrl.startsWith("/api/")) {
    res
      .status(normalizedError.statusCode)
      .json(
        errorResponse(
          normalizedError.code,
          normalizedError.expose
            ? normalizedError.message
            : "An unexpected error occurred.",
          normalizedError.expose ? normalizedError.details : undefined,
        ),
      );
    return;
  }

  renderPage(req, res, "pages/error", {
    title: "Da xay ra loi",
    message: normalizedError.expose
      ? normalizedError.message
      : "Da xay ra loi he thong. Vui long thu lai sau.",
    statusCode: normalizedError.statusCode,
  });
}

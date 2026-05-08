import rateLimit from "express-rate-limit";
import { env } from "../../config/env";
import { errorResponse } from "../utils/api-response";

export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      errorResponse(
        "RATE_LIMITED",
        "Too many requests. Please try again in a moment.",
      ),
    );
  },
});

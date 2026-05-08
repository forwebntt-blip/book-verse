import morgan from "morgan";
import type { Request } from "express";
import { logger } from "../utils/logger";

morgan.token("request-id", (req: Request) => req.context?.requestId ?? "-");
morgan.token("session-id", (req: Request) => req.context?.sessionId ?? "-");
morgan.token("cart-id", (req: Request) => req.context?.cartId ?? "-");

export const httpLoggerMiddleware = morgan(
  ":method :url :status :response-time ms req=:request-id sess=:session-id cart=:cart-id",
  {
    stream: {
      write: (message) => {
        logger.info(message.trim(), {
          module: "http",
        });
      },
    },
  },
);

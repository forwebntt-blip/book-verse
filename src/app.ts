import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import pgSimple from "connect-pg-simple";
import { env, isProduction } from "./config/env";
import { paths } from "./config/paths";
import { getPgPool } from "./infra/database/pg";
import { registerModuleRoutes } from "./modules";
import { createAdminStorefrontRouter } from "./modules/admin";
import { createAuthStorefrontRouter } from "./modules/auth";
import { createCartStorefrontRouter } from "./modules/cart";
import { createCatalogStorefrontRouter } from "./modules/catalog";
import { createCheckoutStorefrontRouter } from "./modules/checkout";
import { createSearchStorefrontRouter } from "./modules/search";
import { createSpaStorefrontRouter } from "./spa";
import { errorHandler, notFoundHandler } from "./shared/middleware/error-handler";
import { authContextMiddleware } from "./shared/middleware/auth-context";
import { httpLoggerMiddleware } from "./shared/middleware/logging";
import { viewLocalsMiddleware } from "./shared/middleware/locals";
import { requestContextMiddleware } from "./shared/middleware/request-context";
import { requestLifecycleLogger } from "./shared/middleware/request-lifecycle";
import { apiRateLimit } from "./shared/middleware/rate-limit";
import { csrfSynchronisedProtection } from "./shared/security/csrf";

export function createApp() {
  const app = express();
  const PgStore = pgSimple(session);

  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(cookieParser());

  app.use(
    session({
      store: new PgStore({
        pool: getPgPool(),
        tableName: env.SESSION_TABLE_NAME,
        createTableIfMissing: false,
      }),
      secret: env.SESSION_SECRET,
      name: env.SESSION_COOKIE_NAME,
      resave: false,
      saveUninitialized: true,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: env.ENABLE_SECURE_COOKIES || isProduction,
        maxAge: env.SESSION_TTL_SECONDS * 1000,
      },
    }),
  );

  app.use(requestContextMiddleware);
  app.use(requestLifecycleLogger);
  app.use(httpLoggerMiddleware);
  app.use(authContextMiddleware);
  app.use(viewLocalsMiddleware);
  app.use(express.static(paths.public, { maxAge: isProduction ? "1d" : 0 }));
  app.use(
    express.static(paths.clientDist, {
      index: false,
      maxAge: isProduction ? "1d" : 0,
    }),
  );

  app.get("/health", async (_req, res, next) => {
    try {
      const pool = getPgPool();
      await pool.query("SELECT 1");

      res.json({
        success: true,
        data: {
          status: "ok",
          app: env.APP_NAME,
          env: env.NODE_ENV,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/csrf-token", (req, res) => {
    if (!req.session.initializedAt) {
      req.session.initializedAt = new Date().toISOString();
    }

    res.json({
      success: true,
      data: {
        csrfToken: res.locals.csrfToken,
      },
    });
  });

  app.use("/api", apiRateLimit);
  app.use(csrfSynchronisedProtection);
  app.use(createAuthStorefrontRouter());
  app.use(createCartStorefrontRouter());
  app.use(createAdminStorefrontRouter());
  app.use(createSpaStorefrontRouter());
  app.use(createSearchStorefrontRouter());
  app.use(createCheckoutStorefrontRouter());
  app.use(createCatalogStorefrontRouter());
  registerModuleRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

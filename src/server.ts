import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { getPgPool, closePgPool } from "./infra/database/pg";
import { disconnectPrisma } from "./infra/database/prisma";
import { logger } from "./shared/utils/logger";

const app = createApp();
const server = createServer(app);

async function bootstrap() {
  try {
    await getPgPool().query("SELECT 1");

    logger.info("Database connection established", {
      module: "bootstrap",
      env: env.NODE_ENV,
    });

    server.listen(env.PORT, () => {
      logger.info("Application started", {
        module: "bootstrap",
        port: env.PORT,
        env: env.NODE_ENV,
        appName: env.APP_NAME,
      });
    });
  } catch (error) {
    logger.error("Application bootstrap failed", error, {
      module: "bootstrap",
      env: env.NODE_ENV,
    });

    await disconnectPrisma();
    await closePgPool();
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  logger.info("Shutting down application", {
    module: "bootstrap",
    signal,
  });

  server.close(async (closeError) => {
    if (closeError) {
      logger.error("Failed to close HTTP server cleanly", closeError, {
        module: "bootstrap",
      });
      process.exitCode = 1;
    }

    await disconnectPrisma();
    await closePgPool();
    process.exit();
  });
}

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    void shutdown(signal);
  });
});

void bootstrap();

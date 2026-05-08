import { Pool } from "pg";
import { env } from "../../config/env";
import { logger } from "../../shared/utils/logger";

let poolInstance: Pool | null = null;

export function getPgPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: env.DATABASE_URL,
    });

    poolInstance.on("error", (error) => {
      logger.error("Unexpected PostgreSQL pool error", error, {
        module: "database",
      });
    });
  }

  return poolInstance;
}

export async function closePgPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

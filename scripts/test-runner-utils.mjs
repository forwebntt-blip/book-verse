import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import net from "node:net";

export const BASE_URL = "http://localhost:3000";
export const TSX_CLI_PATH = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");

export async function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net
      .createConnection({ port, host: "127.0.0.1" })
      .once("connect", () => {
        socket.destroy();
        resolve(true);
      })
      .once("error", () => {
        resolve(false);
      });
  });
}

export async function assertPortFree(port) {
  if (await isPortInUse(port)) {
    throw new Error(
      `Port ${port} is already in use. Stop any running dev/server process before running this test.`,
    );
  }
}

export async function waitForHealth(timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // server not ready yet
    }

    await delay(1_000);
  }

  throw new Error(`Server did not become healthy within ${timeoutMs}ms.`);
}

export async function waitForPortFree(port, timeoutMs = 30_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!(await isPortInUse(port))) {
      return;
    }

    await delay(500);
  }

  throw new Error(`Port ${port} did not become free within ${timeoutMs}ms.`);
}

export async function runManagedSelftest({ logPath, selftestPath }) {
  await assertPortFree(3000);
  await writeFile(logPath, "");

  const serverLog = createWriteStream(logPath, { flags: "w" });
  const server = spawn(process.execPath, [TSX_CLI_PATH, "src/server.ts"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.pipe(serverLog);
  server.stderr.pipe(serverLog);

  try {
    await waitForHealth();

    const selftest = spawn(process.execPath, [TSX_CLI_PATH, selftestPath], {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    const exitCode = await new Promise((resolve, reject) => {
      selftest.on("error", reject);
      selftest.on("exit", (code) => resolve(code ?? 1));
    });

    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  } finally {
    const cleanup = spawn(process.execPath, [TSX_CLI_PATH, "prisma/cleanup-test-data.ts"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    await Promise.race([
      new Promise((resolve) => cleanup.once("exit", resolve)),
      delay(60_000),
    ]);

    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      delay(5_000),
    ]);
    if (server.exitCode === null && server.signalCode === null) {
      server.kill("SIGKILL");
      await Promise.race([
        new Promise((resolve) => server.once("exit", resolve)),
        delay(5_000),
      ]);
    }
    await waitForPortFree(3000);
    serverLog.end();
  }
}

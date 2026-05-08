import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();

const fixedTargets = [
  "dist",
  "coverage",
  "public",
  "checkout-debug.log",
  "dev-server-3100.err.log",
  "dev-server-3100.log",
  "dev-server.err.log",
  "dev-server.log",
  "spa-dev-server.err.log",
  "spa-dev-server.out.log",
  join("tests", "manual", "part6-selftest-server.log"),
  join("tests", "manual", "part7-selftest-server.log"),
  join("tests", "manual", "part8-selftest-server.log"),
];

function isGeneratedLog(name) {
  return /^run-.*\.log$/i.test(name);
}

async function removeTarget(target) {
  try {
    await rm(join(root, target), {
      recursive: true,
      force: true,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "EBUSY" || error.code === "EPERM")
    ) {
      console.warn(`Skip busy target: ${target}`);
      return;
    }

    throw error;
  }
}

async function main() {
  for (const target of fixedTargets) {
    await removeTarget(target);
  }

  const rootEntries = await readdir(root, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isFile() && isGeneratedLog(entry.name)) {
      await removeTarget(entry.name);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

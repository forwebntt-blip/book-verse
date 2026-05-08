import { spawn } from "node:child_process";
import process from "node:process";
import { assertPortFree } from "./test-runner-utils.mjs";

async function run(command, args) {
  const executable = process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  const child = spawn(executable, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error(`${executable} ${args.join(" ")} failed with exit code ${exitCode}.`);
  }
}

async function main() {
  await assertPortFree(3000);
  await run("npm", ["run", "build"]);
  await run("npm", ["run", "test"]);
  await run("npm", ["run", "prisma:generate"]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

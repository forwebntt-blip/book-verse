import { join } from "node:path";
import { runManagedSelftest } from "../../scripts/test-runner-utils.mjs";

runManagedSelftest({
  logPath: join(process.cwd(), "tests", "manual", "part8-selftest-server.log"),
  selftestPath: "tests/manual/part8-selftest.ts",
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

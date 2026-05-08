import { join } from "node:path";
import { runManagedSelftest } from "./test-runner-utils.mjs";

const target = process.argv[2];

const mapping = {
  part6: {
    selftestPath: "tests/manual/part6-selftest.ts",
    logPath: join(process.cwd(), "tests", "manual", "part6-selftest-server.log"),
  },
  part7: {
    selftestPath: "tests/manual/part7-selftest.ts",
    logPath: join(process.cwd(), "tests", "manual", "part7-selftest-server.log"),
  },
  part8: {
    selftestPath: "tests/manual/part8-selftest.ts",
    logPath: join(process.cwd(), "tests", "manual", "part8-selftest-server.log"),
  },
};

if (!target || !(target in mapping)) {
  console.error("Usage: node scripts/run-managed-selftest.mjs <part6|part7|part8>");
  process.exit(1);
}

runManagedSelftest(mapping[target]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


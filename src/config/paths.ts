import path from "node:path";

const rootDir = process.cwd();

export const paths = {
  root: rootDir,
  public: path.join(rootDir, "public"),
};

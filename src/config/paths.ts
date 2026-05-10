import path from "node:path";

const rootDir = process.cwd();

export const paths = {
  root: rootDir,
  public: path.join(rootDir, "public"),
  clientDist: path.join(rootDir, "dist-client"),
  clientIndex: path.join(rootDir, "dist-client", "index.html"),
};

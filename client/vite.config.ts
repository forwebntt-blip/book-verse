import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/csrf-token": "http://localhost:3000",
      "/images": "http://localhost:3000",
      "/search": "http://localhost:3000",
      "/cart": "http://localhost:3000",
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../dist-client"),
    emptyOutDir: true,
  },
});

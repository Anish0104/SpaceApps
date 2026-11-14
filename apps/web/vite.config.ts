import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // forward /api to the local worker (pnpm dev:worker)
    proxy: { "/api": "http://localhost:8787" },
    fs: { allow: ["../.."] }, // allow importing /data/*.json from the repo root
  },
});

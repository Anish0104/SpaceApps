import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// phoneSpaceApp: the FlameAtlas mobile PWA. Standalone app, reuses @flameatlas/engine and the
// released dataset. Service worker and manifest live in public/ and are copied verbatim.
export default defineConfig({
  plugins: [react()],
  server: { port: 5273, fs: { allow: ["../.."] } }, // import /data/*.json from the repo root
  build: { outDir: "dist", target: "es2022" },
});

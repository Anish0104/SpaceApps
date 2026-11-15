// Used only by `pnpm eval:score`: runs the offline scoring script with vitest's TypeScript loader.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["scripts/eval-score.run.ts"], reporters: ["basic"] },
});

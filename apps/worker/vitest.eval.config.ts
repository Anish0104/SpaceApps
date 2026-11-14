// Used only by `pnpm eval:rank`: runs the offline ranking script with vitest's TypeScript loader.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["scripts/eval-rank.run.ts"], reporters: ["basic"] },
});

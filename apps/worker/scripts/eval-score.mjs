#!/usr/bin/env node
/**
 * pnpm eval:score [questions.json]
 * Offline scoring of any question file (default data/eval/questions.json); e.g.
 *   pnpm eval:score data/eval/heldout.json
 * Runs scripts/eval-score.run.ts under vitest (it loads the TypeScript engine), passing the file in EVAL_QUESTIONS.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const arg = process.argv[2];
// pnpm runs this from apps/worker; INIT_CWD is where you typed the command.
const file = arg ? (isAbsolute(arg) ? arg : resolve(process.env.INIT_CWD ?? process.cwd(), arg)) : "";
if (file && !existsSync(file)) { console.error(`No question file at ${file}`); process.exit(2); }
const r = spawnSync("npx", ["vitest", "run", "--config", "vitest.score.config.ts"], {
  cwd: fileURLToPath(new URL("../", import.meta.url)), stdio: "inherit", env: { ...process.env, EVAL_QUESTIONS: file },
});
process.exit(r.status ?? 1);

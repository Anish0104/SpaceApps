/**
 * Shared by the quota-spending dev scripts (`pnpm eval:record`, `pnpm summaries`). Plain Node, no
 * dependencies, so it runs without a TypeScript toolchain; the worker tests import it too.
 *
 * Guarantees, in this order, for every task:
 *   1. already done (output exists)  -> skipped, nothing is sent
 *   2. --dry-run                     -> printed with its worst-case cost, nothing is sent
 *   3. budget used up                -> stop; no further task is sent
 *   4. otherwise                     -> run(remaining): the worker refuses any Gemini request past `remaining`
 */

/**
 * @param {string[]} argv  process.argv.slice(2)
 * @param {{ defaultMaxCalls: number, listFlag: string }} opts  listFlag: "--questions" or "--ids"
 * @returns {{ only: string[] | null, maxCalls: number, dryRun: boolean, scenario: string | null }}
 */
export function parseFlags(argv, { defaultMaxCalls, listFlag }) {
  const out = { only: null, maxCalls: defaultMaxCalls, dryRun: false, scenario: null };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s, 2);
    const value = () => {
      const v = inline ?? argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${flag} needs a value`);
      return v;
    };
    if (flag === "--dry-run") out.dryRun = true;
    else if (flag === "--max-calls") {
      const n = Number(value());
      if (!Number.isInteger(n) || n < 0) throw new Error("--max-calls must be a whole number >= 0");
      out.maxCalls = n;
    } else if (flag === listFlag) out.only = value().split(",").map((s) => s.trim()).filter(Boolean);
    else if (flag === "--scenario") out.scenario = value();
    else throw new Error(`unknown flag ${flag}`);
  }
  return out;
}

/**
 * @typedef {{ callsUsed: number, saved: boolean, note?: string }} TaskResult
 * @typedef {{ label: string, worstCase: number, done: () => boolean, run: (budget: number) => Promise<TaskResult> }} Task
 * @typedef {{ planned: string[], skipped: string[], saved: string[], failed: string[], callsUsed: number, stoppedForBudget: boolean }} RunSummary
 */

/**
 * @param {Task[]} tasks
 * @param {{ maxCalls: number, dryRun: boolean, log?: (line: string) => void }} opts
 * @returns {Promise<RunSummary>}
 */
export async function runBudgeted(tasks, { maxCalls, dryRun, log = console.log }) {
  /** @type {RunSummary} */
  const summary = { planned: [], skipped: [], saved: [], failed: [], callsUsed: 0, stoppedForBudget: false };
  let worst = 0;
  for (const task of tasks) {
    if (task.done()) { summary.skipped.push(task.label); log(`skip   ${task.label} (already recorded)`); continue; }
    if (dryRun) {
      worst += task.worstCase;
      summary.planned.push(task.label);
      log(`plan   ${task.label} (up to ${task.worstCase} Gemini request${task.worstCase === 1 ? "" : "s"})`);
      continue;
    }
    const remaining = maxCalls - summary.callsUsed;
    if (remaining <= 0) { summary.stoppedForBudget = true; log(`stop   budget of ${maxCalls} Gemini requests reached; ${task.label} and later tasks not sent`); break; }
    let result;
    try {
      result = await task.run(remaining);
    } catch (e) {
      // A transport error (worker down, timeout) is not retried; we cannot know if quota was spent,
      // so the whole remaining budget is treated as used.
      summary.callsUsed = maxCalls;
      summary.failed.push(task.label);
      log(`fail   ${task.label}: ${e instanceof Error ? e.message : String(e)} (no retry; stopping)`);
      summary.stoppedForBudget = true;
      break;
    }
    summary.callsUsed += Math.min(result.callsUsed, remaining);
    (result.saved ? summary.saved : summary.failed).push(task.label);
    log(`${result.saved ? "saved " : "noted "} ${task.label}: ${result.note ?? ""} [${result.callsUsed} request${result.callsUsed === 1 ? "" : "s"}, ${maxCalls - summary.callsUsed} left]`);
  }
  if (dryRun) log(`\nDry run: ${summary.planned.length} task(s), at most ${worst} Gemini requests if every model fails over; --max-calls ${maxCalls} would stop earlier. Nothing was sent.`);
  return summary;
}

/** Eval questions have no scenario of their own; this picks the one both systems are asked under. */
export const DEFAULT_EVAL_SCENARIO = "moon-challenge";
/** @param {{ scenarioId?: string }} q  @param {string | null} flag */
export const scenarioIdFor = (q, flag) => q.scenarioId ?? flag ?? DEFAULT_EVAL_SCENARIO;

/** Path of one recorded output, relative to the repo root. */
export const evalPath = (dataVersion, system, qid) => `eval/runs/${dataVersion}/${system}/${qid}.json`;

/**
 * One task per (question, system). `post` sends the body to /api/dev/eval and returns the JSON reply.
 * @param {{ id: string, question: string, scenarioId?: string }[]} questions
 * @param {{ systems: string[], dataVersion: string, models: number, scenario: string | null,
 *           exists: (path: string) => boolean, write: (path: string, obj: unknown) => void,
 *           post: (body: object) => Promise<{ results: any[], callsUsed: number }> }} io
 * @returns {Task[]}
 */
export function evalTasks(questions, { systems, dataVersion, models, scenario, exists, write, post }) {
  return questions.flatMap((q) => systems.map((system) => {
    const path = evalPath(dataVersion, system, q.id);
    const scenarioId = scenarioIdFor(q, scenario);
    return {
      label: `${q.id} ${system} [${scenarioId}]`,
      worstCase: models,
      done: () => exists(path),
      run: async (budget) => {
        const { results, callsUsed } = await post({ qid: q.id, question: q.question, scenarioId, systems: [system], maxCalls: Math.min(budget, models) });
        const r = results[0];
        if (r?.recorded) write(path, r);
        const why = r?.recorded ? `answered by ${r.model}` : `not recorded (${r?.error ?? r?.log?.at(-1) ?? "no model answered"})`;
        return { callsUsed, saved: Boolean(r?.recorded), note: why };
      },
    };
  }));
}

/**
 * One task per investigation. `post` sends { psiId, maxCalls } to /api/dev/summaries.
 * `file.summaries` is updated in memory; the caller writes the file once at the end.
 * @param {string[]} psiIds
 * @param {{ dataVersion: string, models: number, file: { summaries: Record<string, unknown> },
 *           post: (body: object) => Promise<{ outcome: string, entry?: unknown, reason?: string, callsUsed: number }> }} io
 * @returns {Task[]}
 */
export function summaryTasks(psiIds, { dataVersion, models, file, post }) {
  return psiIds.map((psiId) => {
    const key = `${psiId}@${dataVersion}`;
    return {
      label: psiId,
      worstCase: models,
      done: () => key in file.summaries,
      run: async (budget) => {
        const r = await post({ psiId, maxCalls: Math.min(budget, models) });
        if (r.outcome === "saved" && r.entry) file.summaries[key] = r.entry;
        return { callsUsed: r.callsUsed, saved: r.outcome === "saved", note: r.outcome === "saved" ? "summary saved" : `skipped (${r.reason ?? "no valid summary"})` };
      },
    };
  });
}

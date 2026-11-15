import { IconCheck } from "./Icons";

export const ANSWER_STEPS = ["Finding records", "Checking citations", "Writing answer"] as const;

/** The answer card's shape, shimmering, with the pipeline step underway. Shown before the answer arrives. */
export function AnswerSkeleton({ step }: { step: number }) {
  return (
    <div className="panel route-enter overflow-hidden" aria-live="polite" aria-busy="true">
      <span className="sr-only">Working: {ANSWER_STEPS[Math.min(step, ANSWER_STEPS.length - 1)]}</span>
      <ol aria-hidden="true" className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--border)] px-5 py-3 text-xs sm:px-7">
        {ANSWER_STEPS.map((s, i) => {
          const done = i < step;
          const now = i === step;
          return (
            <li key={s} className={`flex items-center gap-2 ${done || now ? "text-[var(--text)]" : "text-[var(--text-faint)]"}`}>
              <span className={`step-dot ${done ? "is-done" : now ? "is-now" : ""}`}>{done && <IconCheck size={11} />}</span>
              {s}
            </li>
          );
        })}
      </ol>
      <div aria-hidden="true" className="space-y-6 p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="skel h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <span className="skel block h-4 w-40" />
            <span className="skel block h-3 w-72 max-w-full" />
          </div>
        </div>
        <div className="space-y-3">
          <span className="skel block h-3 w-32" />
          <span className="skel block h-3.5 w-full" />
          <span className="skel block h-3.5 w-[92%]" />
          <span className="skel block h-3.5 w-[78%]" />
          <span className="flex gap-2 pt-1">
            <span className="skel h-5 w-16 rounded-md" />
            <span className="skel h-5 w-20 rounded-md" />
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <span className="skel block h-20 rounded-xl" />
          <span className="skel block h-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

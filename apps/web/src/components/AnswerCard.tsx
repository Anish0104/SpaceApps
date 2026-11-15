import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AskResponse } from "@flameatlas/engine";
import { dataset } from "../lib/data";
import { humanizeField } from "../lib/labels";
import { RecordTag } from "./RecordTag";
import { FlameMark } from "./FlameMark";
import { IconArrowRight } from "./Icons";

type VerdictDetails = {
  tone: "green" | "yellow" | "red";
  label: "Strong evidence" | "Partial evidence" | "No direct evidence";
  summary: string;
  icon: ReactNode;
};

function getVerdict(a: AskResponse): VerdictDetails {
  if (a.verdict === "green" && a.status !== "cannot_confirm") {
    return {
      tone: "green",
      label: "Strong evidence",
      summary: "Direct combustion measurements under closely matched conditions.",
      icon: <path d="m6 12.5 4 4L18 8" />,
    };
  }
  if (a.verdict === "yellow" || (a.status === "cannot_confirm" && a.verdict !== "red")) {
    return {
      tone: "yellow",
      label: "Partial evidence",
      summary: "Analog experiments or related conditions; key environment parameters differ.",
      icon: <path d="M12 7.5v5.5M12 16.5h.01" />,
    };
  }
  return {
    tone: "red",
    label: "No direct evidence",
    summary: "No curated NASA combustion tests match this combination of variables.",
    icon: <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" />,
  };
}

const SOURCE_LABELS: Record<AskResponse["source"], string> = {
  llm: "AI answer, numbers checked against the cited records",
  cache: "Cached AI answer, numbers checked against the cited records",
  template: "Template answer built directly from the records",
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Reveals the answer word by word. Purely presentational: the validated text is never changed, and the
 * full sentence is always in the DOM for screen readers (the animated copy is aria-hidden).
 */
function useWordReveal(sentences: string[][], animate: boolean) {
  const total = useMemo(() => sentences.reduce((n, s) => n + s.length, 0), [sentences]);
  const [shown, setShown] = useState(animate ? 0 : total);

  useEffect(() => {
    if (!animate || shown >= total) return;
    const step = total > 140 ? 3 : total > 70 ? 2 : 1;
    const t = window.setTimeout(() => setShown((n) => Math.min(total, n + step)), 34);
    return () => window.clearTimeout(t);
  }, [animate, shown, total]);

  return { shown, total, done: shown >= total, finish: () => setShown(total) };
}

export function AnswerCard({
  a,
  question,
  animate = true,
  onSelectRecord,
}: {
  a: AskResponse;
  question?: string;
  animate?: boolean;
  onSelectRecord?: (id: string, el: HTMLElement) => void;
}) {
  const verdict = getVerdict(a);
  const words = useMemo(() => a.sentences.map((s) => s.text.split(/(?<=\s)/)), [a]);
  const { shown, done, finish } = useWordReveal(words, animate && !prefersReducedMotion());

  let before = 0;
  return (
    <article aria-label="Evidence answer card" className="answer panel overflow-hidden">
      {question && (
        <div className="flex items-start gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-7">
          <span aria-hidden="true" className="answer-avatar-q">Q</span>
          <p className="pt-0.5 font-medium text-[var(--text)]">{question}</p>
        </div>
      )}

      {/* Verdict */}
      <header className={`answer-verdict tone-${verdict.tone} px-5 py-5 sm:px-7`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="answer-verdict-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {verdict.icon}
              </svg>
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">{verdict.label}</h2>
                <span className="chip chip-quiet">Evidence rating, not a safety rating</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{verdict.summary}</p>
            </div>
          </div>
          <div className="text-right text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
              <FlameMark size={10} /> {SOURCE_LABELS[a.source]}
            </span>
            {dataset.fixture && <span className="mt-1 block text-[var(--verdict-yellow)]">Fixture test data</span>}
          </div>
        </div>
      </header>

      <div className="space-y-7 px-5 py-6 sm:px-7">
        {/* What the evidence says */}
        <section aria-labelledby="ans-evidence">
          <h3 id="ans-evidence" className="answer-label">What the evidence says</h3>
          {a.sentences.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {a.sentences.map((s, i) => {
                const w = words[i]!;
                const visible = Math.max(0, Math.min(w.length, shown - before));
                const complete = visible >= w.length;
                const active = !complete && visible > 0;
                before += w.length;
                // Not started yet: keep the full text for screen readers, show nothing.
                if (visible === 0 && !complete) return <li key={i} className="sr-only">{s.text}</li>;
                return (
                  <li key={i} className="answer-sentence">
                    <span className="sr-only">{s.text}</span>
                    <span aria-hidden="true" className="leading-relaxed text-[var(--text)]">
                      {w.slice(0, visible).join("")}
                      {active && <span className="type-caret" />}
                    </span>
                    {complete && s.recordIds.length > 0 && (
                      <span className="reveal-in mt-1.5 flex flex-wrap gap-1.5 sm:ml-2 sm:mt-0 sm:inline-flex sm:align-middle">
                        {s.recordIds.map((id) => (
                          <RecordTag key={id} id={id} onSelect={onSelectRecord} />
                        ))}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">No record-backed statement found for this question.</p>
          )}
          {!done && (
            <button type="button" onClick={finish} className="mt-3 text-xs text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text)] hover:underline">
              Show full answer
            </button>
          )}
        </section>

        {done && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {a.differs.length > 0 && (
                <section aria-labelledby="ans-differs" className="answer-box reveal-in" style={{ animationDelay: "60ms" }}>
                  <h3 id="ans-differs" className="answer-label">What differs from this scenario</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {a.differs.map((d) => (
                      <li key={d} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--text)]">
                        {humanizeField(d)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section aria-labelledby="ans-limit" className={`answer-box reveal-in ${a.differs.length ? "" : "md:col-span-2"}`} style={{ animationDelay: "140ms" }}>
                <h3 id="ans-limit" className="answer-label">Where the evidence ends</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{a.limit}</p>
              </section>
            </div>

            <section aria-labelledby="ans-next" className="answer-next reveal-in" style={{ animationDelay: "220ms" }}>
              <div className="min-w-0">
                <h3 id="ans-next" className="answer-label">What to test next</h3>
                <p className="mt-1.5 text-sm text-[var(--text)]">
                  {a.next.target ? a.next.target : "Targeted flammability testing at the scenario's conditions."}
                </p>
              </div>
              <Link to="/missing-experiment" className="btn btn-secondary btn-sm shrink-0">
                See the missing experiment <IconArrowRight size={14} />
              </Link>
            </section>
          </>
        )}
      </div>

      <footer className="flex flex-col justify-between gap-2 border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:px-7">
        <p className="measure">{a.scope} Ratings describe how much matched evidence exists, never life-safety clearance.</p>
        <span className="shrink-0 font-mono text-[11px]">Data v{a.dataVersion}</span>
      </footer>
    </article>
  );
}

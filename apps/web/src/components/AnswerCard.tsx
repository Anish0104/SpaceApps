import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AskResponse } from "@flameatlas/engine";
import { dataset } from "../lib/data";
import { humanizeField } from "../lib/labels";
import { RecordTag } from "./RecordTag";

type VerdictDetails = {
  lightClass: string;
  label: "Strong evidence" | "Partial evidence" | "No direct evidence";
  summary: string;
  icon: ReactNode;
};

function getVerdict(a: AskResponse): VerdictDetails {
  if (a.verdict === "green" && a.status !== "cannot_confirm") {
    return {
      lightClass: "text-[var(--verdict-green)]",
      label: "Strong evidence",
      summary: "Direct combustion measurements under closely matched conditions.",
      icon: (
        <svg aria-hidden="true" className="h-5 w-5 fill-current" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      ),
    };
  }

  if (a.verdict === "yellow" || (a.status === "cannot_confirm" && a.verdict !== "red")) {
    return {
      lightClass: "text-[var(--verdict-yellow)]",
      label: "Partial evidence",
      summary: "Analog experiments or related conditions; key environment parameters differ.",
      icon: (
        <svg aria-hidden="true" className="h-5 w-5 fill-current" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
    };
  }

  return {
    lightClass: "text-[var(--verdict-red)]",
    label: "No direct evidence",
    summary: "No curated NASA combustion tests match this combination of variables.",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5 fill-current" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    ),
  };
}

const SOURCE_LABELS: Record<AskResponse["source"], string> = {
  llm: "Live AI synthesis, checked against NASA records",
  cache: "Cached synthesis, checked against NASA records",
  template: "Retrieved template answer, verified against records",
};

function Beat({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 pt-4 first:pt-0">
      <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs text-[var(--text)]">
          {number}
        </span>
        {title}
      </h3>
      <div className="pl-7">{children}</div>
    </section>
  );
}

export function AnswerCard({
  a,
  onSelectRecord,
}: {
  a: AskResponse;
  onSelectRecord?: (id: string, el: HTMLElement) => void;
}) {
  const verdict = getVerdict(a);
  const cannotConfirm = a.status === "cannot_confirm";

  return (
    <article
      aria-label="Evidence answer card"
      className="panel divide-y divide-[var(--border)] p-6 sm:p-8"
    >
      {/* Beat 1: Verdict */}
      <section className="space-y-3 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`flex shrink-0 ${verdict.lightClass}`}>
              {verdict.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
                  {verdict.label}
                </h2>
                <span className="rounded-[4px] bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                  Evidence rating
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {verdict.summary}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-[var(--text-muted)]">
            <span className="inline-block rounded-[4px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1">
              {SOURCE_LABELS[a.source]}
            </span>
            {dataset.fixture && (
              <span className="mt-1 block text-[var(--verdict-yellow)]">
                Fixture test data
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Beat 2: What the evidence says */}
      <Beat number={2} title="What the evidence says">
        {a.sentences.length > 0 ? (
          <ul className="measure space-y-3 text-[15px] leading-relaxed text-[var(--text)]">
            {a.sentences.map((s, i) => (
              <li key={i} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                <span>{s.text}</span>
                {s.recordIds.length > 0 && (
                  <span className="inline-flex shrink-0 flex-wrap gap-1.5">
                    {s.recordIds.map((id) => (
                      <RecordTag key={id} id={id} onSelect={onSelectRecord} />
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            No record-backed statement found for this question.
          </p>
        )}
      </Beat>

      {/* Beat 3: What differs */}
      {a.differs.length > 0 && (
        <Beat number={3} title="What differs from this scenario">
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-muted)]">
              Conditions that diverge between the cited NASA test runs and your active scenario:
            </p>
            <ul className="flex flex-wrap gap-2">
              {a.differs.map((d) => (
                <li
                  key={d}
                  className="rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text)]"
                >
                  {humanizeField(d)}
                </li>
              ))}
            </ul>
          </div>
        </Beat>
      )}

      {/* Beat 4: Where the evidence ends (limit) */}
      <Beat number={4} title="Where the evidence ends">
        <p className="measure text-[15px] leading-relaxed text-[var(--text)]">
          {a.limit}
        </p>
      </Beat>

      {/* Beat 5: What to test next */}
      <Beat number={5} title="What to test next">
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <p className="text-sm text-[var(--text)]">
            {a.next.target ? a.next.target : "Conduct targeted flammability testing to bridge extrapolation gaps."}
          </p>
          <div className="mt-3">
            <Link
              to="/missing-experiment"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              See the missing experiment
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
                <path d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </Beat>

      {/* Beat 6: Scope note */}
      <section className="pt-4 text-xs text-[var(--text-muted)]">
        <div className="flex flex-col justify-between gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center">
          <p className="measure leading-relaxed">
            {a.scope} • Ratings describe experimental evidence volume and precision, never human life-safety clearance.
          </p>
          <span className="shrink-0 font-mono text-[11px]">
            Data v{a.dataVersion}
          </span>
        </div>
      </section>
    </article>
  );
}

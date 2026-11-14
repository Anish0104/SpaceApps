import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AskResponse } from "@flameatlas/engine";
import { dataset } from "../lib/data";
import { humanizeField } from "../lib/labels";
import { VerdictLight, type Light } from "./Badge";
import { RecordTag } from "./RecordTag";

type VerdictView = { light: Light; words: string };

/** The light rates evidence strength, never safety. */
const VERDICT: Record<AskResponse["verdict"], VerdictView> = {
  green: { light: "green", words: "Direct evidence" },
  yellow: { light: "yellow", words: "Partial evidence: analogs only" },
  red: { light: "red", words: "Insufficient evidence" },
};

/** A cannot-confirm answer never shows green: at best it has related analogs. */
function verdictView(a: AskResponse): VerdictView {
  if (a.status !== "cannot_confirm") return VERDICT[a.verdict];
  return a.verdict === "red"
    ? { light: "red", words: "Cannot confirm: no relevant evidence" }
    : { light: "yellow", words: "Cannot confirm: related analogs only" };
}

const SOURCE_WORDS: Record<AskResponse["source"], string> = {
  llm: "Live AI answer, checked against NASA records",
  cache: "Saved demo answer, checked against NASA records",
  template: "Rules-only answer (AI unavailable)",
};

function Beat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold text-ink/70">{label}</h3>
      {children}
    </section>
  );
}

function Verdict({ a }: { a: AskResponse }) {
  const { light, words } = verdictView(a);
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex"><VerdictLight light={light} label={`Evidence light: ${words}`} /></span>
      <div>
        <h2 className="text-lg font-semibold">{words}</h2>
        <p className="text-sm text-ink/70">Evidence strength, not a safety rating.</p>
      </div>
    </div>
  );
}

function NextStep({ next }: { next: AskResponse["next"] }) {
  const target = next.target ? `: ${next.target}` : "";
  if (next.kind === "missing_experiment") {
    return <Link to="/missing-experiment" className="link font-semibold">See the missing experiment{target}</Link>;
  }
  return <p>What the evidence supports now{target}</p>;
}

/** Cannot-confirm state: what is missing, and where to go next. */
function WhatWeNeed({ a }: { a: AskResponse }) {
  return (
    <section className="rounded-[6px] border border-regolith p-4">
      <h3 className="font-semibold">What we'd need to answer this</h3>
      {a.missingFields.length > 0 ? (
        <ul className="dense mt-1 list-disc pl-5">
          {a.missingFields.map((f) => <li key={f}>{humanizeField(f)}</li>)}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-ink/70">The answer did not name specific missing fields.</p>
      )}
      {a.next.kind === "missing_experiment" && a.next.target && <p className="mt-2">Proposed next step: {a.next.target}</p>}
      <Link to="/missing-experiment" className="btn btn-secondary mt-3">See the missing experiment</Link>
    </section>
  );
}

/** The six beats of an answer, in order: verdict, receipts, what differs, limit, next step, scope. */
export function AnswerCard({ a }: { a: AskResponse }) {
  const cannotConfirm = a.status === "cannot_confirm";
  return (
    <article aria-label="Answer" className="panel space-y-5 p-4 sm:p-6">
      {/* Beat 1: verdict (evidence strength, never safety) */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <Verdict a={a} />
        <p className="text-sm text-ink/70 sm:text-right">
          {SOURCE_WORDS[a.source]}
          {dataset.fixture && <span className="block font-semibold text-ink">Showing development data (fixture)</span>}
        </p>
      </div>

      {/* Beat 2: receipts */}
      <Beat label="Receipts">
        {a.sentences.length > 0 ? (
          <ul className="measure list-disc space-y-2 pl-5">
            {a.sentences.map((s, i) => (
              <li key={i}>
                {s.text}{" "}
                <span className="inline-flex flex-wrap gap-1 align-middle">{s.recordIds.map((id) => <RecordTag key={id} id={id} />)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink/70">No record-backed statement for this question.</p>
        )}
      </Beat>

      {/* Beat 3: what differs / missing */}
      {a.differs.length > 0 && (
        <Beat label="Differs or missing">
          <ul className="flex flex-wrap gap-1.5">
            {a.differs.map((d) => <li key={d} className="chip chip-quiet whitespace-normal">{humanizeField(d)}</li>)}
          </ul>
        </Beat>
      )}

      {/* Beat 4: honest limit */}
      <Beat label="Limit"><p className="measure">{a.limit}</p></Beat>

      {/* Beat 5: bridge to action */}
      {cannotConfirm && <WhatWeNeed a={a} />}
      {a.next.kind !== "none" && !(cannotConfirm && a.next.kind === "missing_experiment") && (
        <Beat label="Next step"><NextStep next={a.next} /></Beat>
      )}

      {/* Beat 6: scope */}
      <div className="border-t border-rule pt-3 text-sm text-ink/70">
        <p className="measure">{a.scope}</p>
        <p>Data version {a.dataVersion}</p>
      </div>
    </article>
  );
}

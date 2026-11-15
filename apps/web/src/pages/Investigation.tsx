import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import type { SummaryEntry } from "@flameatlas/engine";
import { invById, isPsiRecord, runsFor, summaryFor } from "../lib/data";
import { MOCK_ASK } from "../lib/api";
import { mockSummary } from "../lib/mockSummary";
import { RecordTag } from "../components/RecordTag";
import { hasAcronym, investigationLabel, sentenceCase } from "../lib/labels";
import { ValueCell } from "../components/ValueCell";
import { RegimeMark } from "../components/Badge";

const COLUMNS = [
  "Run",
  "Test #",
  "Material",
  "Geometry",
  "Thickness",
  "Oxygen",
  "Pressure",
  "O₂ partial pressure",
  "Flow",
  "Flow direction",
  "Gravity",
  "Key outcome",
  "Status",
];

/** A precomputed summary: each sentence with its receipts. Every number in it was checked against the records it cites. */
function Summary({ s }: { s: SummaryEntry }) {
  const mock = s.model === "MOCK";
  return (
    <section aria-labelledby="summary-heading" className="panel p-6 sm:p-8">
      <p className="eyebrow">Cited summary</p>
      <h2 id="summary-heading" className="section-title mt-2">
        Summary
      </h2>
      <ul className="measure mt-4 space-y-3 leading-relaxed text-[var(--text)]">
        {s.sentences.map((x, i) => (
          <li key={i}>
            {x.text}{" "}
            <span className="inline-flex flex-wrap gap-1 align-middle">
              {x.recordIds.map((id) => (
                <RecordTag key={id} id={id} />
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
        {mock
          ? "Mock mode: placeholder summary for UI development, not from any record."
          : `Written by AI from the records on this page${s.generatedAt ? ` on ${s.generatedAt}` : ""}. Each number was checked against the record it cites.`}
      </p>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-[var(--text)]">{children}</dd>
    </div>
  );
}

export default function Investigation() {
  const { psiId = "" } = useParams();
  const inv = invById(psiId);

  if (!inv) {
    return (
      <div className="panel mx-auto max-w-xl space-y-4 p-10 text-center">
        <h1 className="page-title">Investigation not found</h1>
        <p className="text-sm text-[var(--text-muted)]">
          No investigation with the id "{psiId}" is in this dataset. Check the id, or pick one from the research atlas.
        </p>
        <Link to="/atlas" className="btn btn-primary">
          Open the research atlas
        </Link>
      </div>
    );
  }

  const runs = runsFor(psiId);
  const fromPsi = isPsiRecord(inv);
  const fromNtrs = inv.url.includes("ntrs.nasa.gov");
  // Precomputed only; nothing is generated per page view. Mock mode previews the section when no summary exists yet.
  const summary = summaryFor(inv.psiId) ?? (MOCK_ASK ? mockSummary(inv) : undefined);

  return (
    <div className="space-y-10">
      <Link to="/atlas" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 7h-9M6 3.5 2.5 7 6 10.5" />
        </svg>
        Research atlas
      </Link>

      <header className="space-y-6">
        <div>
          <p className="eyebrow">
            {fromPsi ? inv.psiId : fromNtrs ? "NASA report (NTRS), not PSI" : "Not a PSI record"} · {sentenceCase(inv.safetyRole)}
          </p>
          <h1 className="page-title max-w-[28ch]">
            {inv.name}
            {hasAcronym(inv) && <span className="ml-3 font-mono text-[0.55em] font-normal text-[var(--accent)]">{inv.acronym.trim()}</span>}
          </h1>
        </div>

        <dl className="panel grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
          {fromPsi ? <Fact label="PSI id">{inv.psiId}</Fact> : <Fact label="Record">{fromNtrs ? "NASA report (NTRS)" : "Source document"}</Fact>}
          <Fact label="Project type">{inv.projectType}</Fact>
          <Fact label="Fuel phase">{sentenceCase(inv.fuelPhase ?? runs[0]?.fuelPhase ?? "not documented")}</Fact>
          {inv.hardware && <Fact label="Hardware">{inv.hardware}</Fact>}
          {inv.platform && <Fact label="Platform">{inv.platform}</Fact>}
          {inv.doi && <Fact label="DOI">{inv.doi}</Fact>}
          <Fact label="Source">
            <a href={inv.url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
              {fromPsi ? "NASA PSI page" : fromNtrs ? "NASA report on NTRS" : "Source document"}
              <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 1h7v7H7.5V3.56L2.53 8.53 1.47 7.47 6.44 2.5H2V1z" />
              </svg>
            </a>
          </Fact>
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="objectives-heading" className="panel p-6 sm:p-8">
          <p className="eyebrow">From the source</p>
          <h2 id="objectives-heading" className="section-title mt-2">
            Objectives
          </h2>
          <p className="mt-4 leading-relaxed text-[var(--text)]">{inv.objectives}</p>
        </section>
        {inv.earthBenefits ? (
          <section aria-labelledby="benefits-heading" className="panel p-6 sm:p-8">
            <p className="eyebrow">From the source</p>
            <h2 id="benefits-heading" className="section-title mt-2">
              Earth benefits
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--text)]">{inv.earthBenefits}</p>
          </section>
        ) : (
          inv.relatedIds.length > 0 && <Related ids={inv.relatedIds} />
        )}
      </div>

      {summary && <Summary s={summary} />}

      {inv.earthBenefits && inv.relatedIds.length > 0 && <Related ids={inv.relatedIds} />}

      <section aria-labelledby="runs-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Run-level data</p>
            <h2 id="runs-heading" className="section-title mt-2">
              Experimental runs <span className="font-mono text-lg text-[var(--text-muted)]">{runs.length}</span>
            </h2>
          </div>
          {runs.length > 0 && <span className="text-xs text-[var(--text-muted)]">Scroll sideways for every condition. Hover a value for its source.</span>}
        </div>

        {runs.length === 0 ? (
          <div className="hatch rounded-xl border border-[var(--border)] p-8 text-center">
            <span className="rounded bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-muted)]">No run-level data in our curated dataset.</span>
          </div>
        ) : (
          <>
            <div className="panel overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)]">
                  <tr>
                    {COLUMNS.map((col) => (
                      <th key={col} scope="col" className="whitespace-nowrap px-3.5 py-3 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {runs.map((r) => {
                    const outcome = r.outcomes[0];
                    return (
                      <tr key={r.id} className="align-top transition-colors hover:bg-[var(--surface-2)]">
                        <th scope="row" className="whitespace-nowrap px-3.5 py-3 font-mono text-xs font-medium text-[var(--text)]">
                          {r.id}
                        </th>
                        <td className="whitespace-nowrap px-3.5 py-3 font-mono text-xs text-[var(--text-muted)]">{r.testNumber ?? "—"}</td>
                        <td className="px-3.5 py-3"><ValueCell v={r.material} /></td>
                        <td className="px-3.5 py-3"><ValueCell v={r.geometry} /></td>
                        <td className="px-3.5 py-3"><ValueCell v={r.thicknessMm} /></td>
                        <td className="px-3.5 py-3"><ValueCell v={r.o2MolPct} /></td>
                        <td className="px-3.5 py-3"><ValueCell v={r.pressureKPa} /></td>
                        <td className="px-3.5 py-3"><ValueCell v={r.o2PartialKPa} /></td>
                        <td className="px-3.5 py-3"><ValueCell v={r.flowCmS} /></td>
                        <td className="px-3.5 py-3"><ValueCell v={r.flowDirection} /></td>
                        <td className="px-3.5 py-3">
                          <ValueCell v={r.gravityG} />
                          {r.gravityG.value !== null && (
                            <span className="mt-1 block text-xs text-[var(--text-muted)]">
                              <RegimeMark g={r.gravityG.value} />
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          {outcome ? (
                            <span className="block min-w-[10rem]">
                              <span className="block text-xs text-[var(--text-muted)]">{outcome.label}</span>
                              <ValueCell v={outcome.value} />
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3">
                          <span
                            className={`chip ${r.status === "verified" ? "chip-outline" : "chip-quiet"}`}
                            title={r.status === "verified" ? "Checked by a second person" : "Collected, not yet checked by a second person"}
                          >
                            {sentenceCase(r.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 text-xs text-[var(--text-muted)]">
              <p>
                Solid fill is measured, solid outline is computed, dotted outline is inferred, dashed outline is assumed, hatch is
                not documented.
              </p>
              {runs.some((r) => r.status === "imported") && (
                <p>Imported runs were collected from the source and have not yet been verified by a second person.</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Related({ ids }: { ids: string[] }) {
  return (
    <section aria-labelledby="related-heading" className="panel p-6 sm:p-8">
      <p className="eyebrow">Connections</p>
      <h2 id="related-heading" className="section-title mt-2">
        Related investigations
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {ids.map((id) => {
          const rel = invById(id);
          return (
            <li key={id}>
              {rel ? (
                <Link
                  to={`/investigation/${id}`}
                  title={rel.name}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] transition-colors hover:border-[var(--accent)]"
                >
                  {investigationLabel(rel)}
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">{id}</span>
                </Link>
              ) : (
                <span className="inline-flex rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)]">
                  {id} (not in this dataset)
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

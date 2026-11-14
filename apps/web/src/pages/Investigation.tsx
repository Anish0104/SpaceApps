import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { invById, isPsiRecord, runsFor } from "../lib/data";
import { sentenceCase } from "../lib/labels";
import { ValueCell } from "../components/ValueCell";
import { RegimeMark } from "../components/Badge";

const COLUMNS = ["Run", "Material", "Geometry", "Oxygen", "Pressure", "O2 partial pressure", "Flow", "Gravity", "Status"];

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink/70">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

export default function Investigation() {
  const { psiId = "" } = useParams();
  const inv = invById(psiId);
  if (!inv) {
    return (
      <div className="space-y-4">
        <h1 className="display text-2xl">Investigation not found</h1>
        <p className="measure">No investigation with the id "{psiId}" is in this dataset. Check the id, or pick one from the research atlas.</p>
        <Link to="/atlas" className="btn btn-secondary">Open the research atlas</Link>
      </div>
    );
  }
  const runs = runsFor(psiId);
  const fromPsi = isPsiRecord(inv);
  const fromNtrs = inv.url.includes("ntrs.nasa.gov");

  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <h1 className="display text-2xl sm:text-3xl">{inv.name} ({inv.acronym})</h1>
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          {fromPsi
            ? <Fact label="PSI id">{inv.psiId}</Fact>
            : <Fact label="Record">{fromNtrs ? "From NASA report (NTRS), not PSI" : "Not a PSI record"}</Fact>}
          <Fact label="Project type">{inv.projectType}</Fact>
          <Fact label="Safety role">{sentenceCase(inv.safetyRole)}</Fact>
          {inv.hardware && <Fact label="Hardware">{inv.hardware}</Fact>}
          {inv.doi && <Fact label="DOI">{inv.doi}</Fact>}
          <Fact label="Source"><a href={inv.url} target="_blank" rel="noreferrer" className="link">{fromPsi ? "NASA PSI page" : fromNtrs ? "NASA report on NTRS" : "Source document"}</a></Fact>
        </dl>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Objectives</h2>
        <p className="measure mt-1">{inv.objectives}</p>
        {/* TODO(Anish): cited AI summary from POST /api/summarize */}
      </section>

      {inv.relatedIds.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Related investigations</h2>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {inv.relatedIds.map((id) => (
              <li key={id}>
                {invById(id)
                  ? <Link to={`/investigation/${id}`} className="link">{id}</Link>
                  : <span>{id} <span className="text-sm text-ink/70">(not in this dataset)</span></span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">Experimental runs ({runs.length})</h2>
        {runs.length === 0 ? (
          <p className="hatch mt-3 rounded-[6px] border border-regolith p-4">
            <span className="bg-panel px-1">No run-level data in our curated dataset.</span>
          </p>
        ) : (
          <>
            <div className="panel mt-3 overflow-x-auto">
              <table className="dense w-full text-left text-base">
                <thead className="border-b border-rule text-sm text-ink/70">
                  <tr>{COLUMNS.map((h) => <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-module/60">
                      <th scope="row" className="whitespace-nowrap px-3 py-2 font-semibold">{r.id}</th>
                      <td className="px-3 py-2"><ValueCell v={r.material} /></td>
                      <td className="px-3 py-2"><ValueCell v={r.geometry} /></td>
                      <td className="px-3 py-2"><ValueCell v={r.o2MolPct} /></td>
                      <td className="px-3 py-2"><ValueCell v={r.pressureKPa} /></td>
                      <td className="px-3 py-2"><ValueCell v={r.o2PartialKPa} /></td>
                      <td className="px-3 py-2"><ValueCell v={r.flowCmS} /></td>
                      <td className="px-3 py-2">
                        <ValueCell v={r.gravityG} />
                        {r.gravityG.value !== null && <span className="block text-sm"><RegimeMark g={r.gravityG.value} /></span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{sentenceCase(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm text-ink/70">
              Solid fill is measured, solid outline is computed, dotted outline is inferred, dashed outline is assumed, hatch is not documented. Hover a value for its source.
            </p>
            {runs.some((r) => r.status === "imported") && (
              <p className="mt-1 text-sm text-ink/70">Imported runs were collected from the source and have not yet been verified by a second person.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

import { Link, useParams } from "react-router-dom";
import { invById, runsFor } from "../lib/data";
import { ValueCell } from "../components/ValueCell";
import { Tag } from "../components/Badge";

export default function Investigation() {
  const { psiId = "" } = useParams();
  const inv = invById(psiId);
  if (!inv) return <p>Unknown investigation {psiId}.</p>;
  const runs = runsFor(psiId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">{inv.name} ({inv.acronym})</h1>
        <div className="mt-1 flex flex-wrap gap-2">
          <Tag>{inv.psiId}</Tag><Tag>{inv.projectType}</Tag><Tag>{inv.safetyRole}</Tag>
          {inv.hardware && <Tag>{inv.hardware}</Tag>}
          <a href={inv.url} target="_blank" rel="noreferrer" className="text-xs text-measured underline">PSI page</a>
          {inv.doi && <span className="font-mono text-xs">DOI {inv.doi}</span>}
        </div>
      </div>

      <section>
        <h2 className="font-semibold">Objectives</h2>
        <p className="text-sm">{inv.objectives}</p>
        {/* TODO(Anish): cited AI summary from POST /api/summarize */}
      </section>

      {inv.relatedIds.length > 0 && (
        <section className="text-sm">
          <h2 className="font-semibold">Related investigations</h2>
          <div className="flex gap-2">
            {inv.relatedIds.map((id) => <Link key={id} to={`/investigation/${id}`} className="text-measured underline">{id}</Link>)}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold">Experimental runs ({runs.length})</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-gap">No run-level data in our curated dataset.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-left text-xs">
              <thead className="border-b border-line text-ink/60">
                <tr>{["Run", "Material", "Geometry", "O₂", "Pressure", "pO₂", "Flow", "Gravity", "Status"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-line">
                    <td className="p-2 font-mono">{r.id}</td>
                    <td className="p-2"><ValueCell v={r.material} /></td>
                    <td className="p-2"><ValueCell v={r.geometry} /></td>
                    <td className="p-2"><ValueCell v={r.o2MolPct} /></td>
                    <td className="p-2"><ValueCell v={r.pressureKPa} /></td>
                    <td className="p-2"><ValueCell v={r.o2PartialKPa} /></td>
                    <td className="p-2"><ValueCell v={r.flowCmS} /></td>
                    <td className="p-2"><ValueCell v={r.gravityG} /></td>
                    <td className="p-2"><Tag tone={r.status === "verified" ? "match" : "ink"}>{r.status}</Tag></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

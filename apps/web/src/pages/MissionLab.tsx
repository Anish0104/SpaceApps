import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { O2_PARTIAL_FORMULA, engineerReadout, kPaToPsi, type NearestRun, type ReadoutRow } from "@flameatlas/engine";
import { dataset } from "../lib/data";
import { useScenario } from "../lib/scenario";
import { RegimeMark, Tag, VerdictLight } from "../components/Badge";
import { RecordTag } from "../components/RecordTag";
import { ScenarioStrip } from "../components/ScenarioStrip";
import { EvidenceMap } from "../components/EvidenceMap";

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (x: number, digits = 1) => String(Number(x.toFixed(digits)));

/** The scenario value for a condition: assumed inputs are dashed, the computed one is a solid outline. */
function Target({ row }: { row: ReadoutRow }) {
  if (typeof row.target === "string") return <span className="value value-assumed">{row.target}</span>;
  const cls = row.targetType === "COMPUTED" ? "value value-computed" : "value value-assumed";
  const digits = row.condition === "gravityG" ? 3 : row.condition === "pressureKPa" ? 2 : 1;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={cls} title={row.formula ? `Computed: ${row.formula}` : "Assumed scenario input, not evidence"}>
        {fmt(row.target, digits)} {row.unit}
      </span>
      {row.condition === "pressureKPa" && <span className="text-sm text-ink/70">{fmt(kPaToPsi(row.target))} psi</span>}
      {row.condition === "gravityG" && <span className="text-sm"><RegimeMark g={row.target} /></span>}
    </span>
  );
}

/** The engine's note, with run ids turned into links to their investigation. */
function Note({ text }: { text: string }) {
  const ids = new Set(dataset.runs.map((r) => r.id));
  const parts: ReactNode[] = text.split(/([A-Za-z0-9-]+)/).map((part, i) => (ids.has(part) ? <RecordTag key={i} id={part} /> : part));
  return <>{parts}</>;
}

function Nearest({ title, run, unit }: { title: string; run: NearestRun | null; unit: string }) {
  return (
    <div>
      <dt className="text-sm text-ink/70">{title}</dt>
      <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        {run ? (
          <>
            <RecordTag id={run.runId} />
            <span>{fmt(run.value)} {unit}</span>
            <span className="text-sm text-ink/70">{run.verified ? "verified" : "imported, not yet cross-checked"}</span>
          </>
        ) : <Tag variant="hatch">Not documented on any curated run</Tag>}
      </dd>
    </div>
  );
}

export default function MissionLab() {
  const { scenario: s } = useScenario();
  const readout = engineerReadout(s, dataset.runs);
  const near = readout.nearestTested;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl sm:text-3xl">Mission lab</h1>
        <p className="measure mt-2">What the evidence supports now for this crew environment, one condition at a time. Pick another environment in the header.</p>
      </div>

      <ScenarioStrip scenario={s} />

      <section className="panel">
        <h2 className="border-b border-rule px-4 py-3 font-semibold sm:px-5">Evidence coverage, not a safety rating</h2>
        <ul className="divide-y divide-rule">
          {readout.rows.map((r) => (
            <li key={r.condition} className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5 md:grid-cols-[20px_10rem_16rem_minmax(0,1fr)]">
              {/* No nearby run is missing evidence: hatch, never a fill colour */}
              <VerdictLight light={r.light === "red" ? "hatch" : r.light} />
              <span className="font-semibold">{upperFirst(r.name)}</span>
              <span className="dense col-start-2 md:col-start-auto"><Target row={r} /></span>
              <span className="col-start-2 md:col-start-auto"><Note text={r.note} /></span>
            </li>
          ))}
        </ul>
        <p className="border-t border-rule px-4 py-3 text-sm text-ink/70 sm:px-5">{readout.limit} {readout.scope}</p>
      </section>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/70">
        <li className="flex items-center gap-2"><VerdictLight light="green" /> Green: a verified run of this material within tolerance</li>
        <li className="flex items-center gap-2"><VerdictLight light="yellow" /> Amber: not yet cross-checked, a different material, or runs that disagree</li>
        <li className="flex items-center gap-2"><VerdictLight light="hatch" /> Hatched: not in our curated data</li>
      </ul>

      <section className="panel px-4 py-4 sm:px-5">
        <h2 className="font-semibold">Nearest tested condition</h2>
        <p className="measure mt-1 text-sm text-ink/70">
          A higher oxygen percentage does not mean more oxygen. The nearest run is found two ways: on the oxygen percentage, and on the
          O2 partial pressure ({O2_PARTIAL_FORMULA}).
        </p>
        <dl className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-2">
          <Nearest title={`Matched on oxygen percentage (scenario ${fmt(s.o2MolPct)} mol%)`} run={near.byMolPct} unit="mol%" />
          <Nearest title="Matched on O2 partial pressure (computed)" run={near.byPartialPressure} unit="kPa" />
        </dl>
        {near.disagree && <p className="mt-3 font-semibold">The two ways of matching point at different runs.</p>}
      </section>

      <section className="panel px-4 py-4 sm:px-5">
        <h2 className="font-semibold">Evidence map</h2>
        <div className="mt-3"><EvidenceMap runs={dataset.runs} scenario={s} /></div>
      </section>

      {readout.doesNotTransfer.length > 0 && (
        <section className="panel px-4 py-4 sm:px-5">
          <h2 className="font-semibold">What does not transfer</h2>
          <ul className="measure mt-2 list-disc space-y-1 pl-5">
            {readout.doesNotTransfer.map((t) => <li key={t}><Note text={t} /></li>)}
          </ul>
        </section>
      )}

      {readout.toVerify.length > 0 && (
        <section className="panel px-4 py-4 sm:px-5">
          <h2 className="font-semibold">Waiting on a cross-check</h2>
          <p className="measure mt-1 text-sm text-ink/70">These runs match a condition but have not been checked against their source page by a second person. Verifying them turns amber to green.</p>
          <div className="mt-2 flex flex-wrap gap-2">{readout.toVerify.map((id) => <RecordTag key={id} id={id} />)}</div>
        </section>
      )}

      {readout.gap && (
        <section className="panel px-4 py-4 sm:px-5">
          <h2 className="font-semibold">The gap this exposes</h2>
          <p className="measure mt-1">No curated run covers {readout.gap.target}.</p>
          <Link to="/missing-experiment" className="btn btn-primary mt-3">See the experiment that would close it</Link>
        </section>
      )}
    </div>
  );
}

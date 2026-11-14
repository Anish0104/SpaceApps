import type { ReactNode } from "react";
import { kPaToPsi } from "@flameatlas/engine";
import { dataset } from "../lib/data";
import { useScenario } from "../lib/scenario";
import { RegimeMark, Tag, VerdictLight } from "../components/Badge";
import { ScenarioStrip } from "../components/ScenarioStrip";

type Light = "green" | "yellow" | "red";

/** Evidence coverage per condition (NOT a safety rating). Juvana: replace with the engine's engineer readout. */
function coverageFor(field: "o2MolPct" | "pressureKPa" | "gravityG", target: number, tol: number): { light: Light; note: string } {
  const verified = dataset.runs.filter((r) => r.status === "verified" && r[field].value !== null);
  const any = dataset.runs.filter((r) => r[field].value !== null);
  const near = (rs: typeof any) => rs.find((r) => Math.abs((r[field].value as number) - target) <= tol);
  const v = near(verified);
  if (v) return { light: "green", note: `verified run ${v.id}` };
  const a = near(any);
  if (a) return { light: "yellow", note: `imported, unverified run ${a.id}` };
  return { light: "red", note: "not in our curated data" };
}

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function MissionLab() {
  const { scenario: s } = useScenario();
  const rows: { label: string; value: ReactNode; light: Light; note: string }[] = [
    { label: "Oxygen", value: `${s.o2MolPct} mol%`, ...coverageFor("o2MolPct", s.o2MolPct, 2) },
    { label: "Pressure", value: `${s.pressureKPa} kPa (${kPaToPsi(s.pressureKPa).toFixed(1)} psi)`, ...coverageFor("pressureKPa", s.pressureKPa, 5) },
    { label: "Gravity", value: <span className="inline-flex flex-wrap items-center gap-x-3">{s.gravityG} g <RegimeMark g={s.gravityG} /></span>, ...coverageFor("gravityG", s.gravityG, 0.02) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl sm:text-3xl">Mission lab</h1>
        <p className="measure mt-2">How much of this crew environment has a nearby tested condition in the dataset. Pick another environment in the header.</p>
      </div>

      <ScenarioStrip scenario={s} />

      <section className="panel">
        <h2 className="border-b border-rule px-4 py-3 font-semibold sm:px-5">Evidence coverage, not a safety rating</h2>
        <ul className="divide-y divide-rule">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5 md:grid-cols-[20px_8rem_16rem_minmax(0,1fr)]">
              {/* No nearby run is missing evidence: hatch, never a fill colour */}
              <VerdictLight light={r.light === "red" ? "hatch" : r.light} />
              <span className="font-semibold">{r.label}</span>
              <span className="dense col-start-2 md:col-start-auto">{r.value}</span>
              <span className="col-start-2 md:col-start-auto">
                {r.light === "red" ? <Tag variant="hatch">{upperFirst(r.note)}</Tag> : upperFirst(r.note)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/70">
        <li className="flex items-center gap-2"><VerdictLight light="green" /> Green: a verified run within tolerance</li>
        <li className="flex items-center gap-2"><VerdictLight light="yellow" /> Yellow: unverified or analog only</li>
        <li className="flex items-center gap-2"><VerdictLight light="hatch" /> Hatched: not in our curated data</li>
      </ul>
      {/* TODO(Juvana): evidence map (gravity × O₂ partial pressure, Recharts scatter), nearest tested condition by mole fraction vs partial pressure */}
    </div>
  );
}

import { useMemo, useState } from "react";
import { engineerReadout, kPaToPsi, o2PartialKPa } from "@flameatlas/engine";
import { useStore } from "../store";
import { dataset, invById, field, sourceRef, type Field } from "../data";

const LIGHT: Record<string, "green" | "amber" | "red"> = { green: "green", yellow: "amber", red: "red" };
const fmt = (n: number, d = 1) => Number(n.toFixed(d)).toString();

const Chevron = ({ dir }: { dir: "l" | "r" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir === "l" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

function Condition({ name, f }: { name: string; f: Field }) {
  const documented = f.value !== null;
  return (
    <div className="item">
      <div className="item-top">
        <span className="item-name" style={{ fontWeight: 500 }}>{name}</span>
        <span className="num" style={{ fontSize: 17, fontWeight: 600 }}>
          {documented ? <>{f.value}<span className="u" style={{ color: "var(--muted)", fontWeight: 400 }}>{f.unit ? ` ${f.unit}` : ""}</span></> : <span className="faint" style={{ fontWeight: 400 }}>Not documented</span>}
        </span>
      </div>
      <div className="row between" style={{ marginTop: 8 }}>
        <span className={`tag${f.type === "MEASURED" ? " accent" : ""}`}>{documented ? f.type.toLowerCase() : "undocumented"}</span>
        {documented && f.src && <a className="src" href={f.src.url} target="_blank" rel="noreferrer">{sourceRef(f.src)}</a>}
      </div>
      {!documented && f.missing && <p className="caption" style={{ margin: "7px 0 0" }}>{f.missing.replace(/_/g, " ")}</p>}
    </div>
  );
}

/** Mission Lab: the real NASA experiment record is the centrepiece. Step through curated runs; every
 *  value is the record's own measurement (or marked undocumented), with its evidence type and a link
 *  to the NASA source. */
export function Lab() {
  const { scenario: sc } = useStore();
  const runs = dataset.runs;
  const [i, setI] = useState(0);
  const run = runs[i];
  const inv = invById(run.psiId);
  const verified = run.status === "verified";

  const readout = useMemo(() => engineerReadout(sc, runs), [sc, runs]);
  const po2 = o2PartialKPa(sc.o2MolPct, sc.pressureKPa);

  return (
    <div className="page">
      <h1 className="title">Mission Lab</h1>
      <p className="subtitle">{sc.name.split(" (")[0]} · real NASA test records</p>

      <div className="card">
        <div className="stepper">
          <button className="step" aria-label="Previous run" onClick={() => setI((x) => (x - 1 + runs.length) % runs.length)}><Chevron dir="l" /></button>
          <div className="rec">
            <div className="mat">{run.material.value ?? "Material not documented"}</div>
            <div className="meta">{inv?.acronym} · run {i + 1} of {runs.length}</div>
          </div>
          <button className="step" aria-label="Next run" onClick={() => setI((x) => (x + 1) % runs.length)}><Chevron dir="r" /></button>
        </div>
        <div className="row between" style={{ marginTop: 14 }}>
          <span className={`tag${verified ? " green" : ""}`}>{verified ? "Verified" : "Awaiting cross-check"}</span>
          {inv && <a className="src" href={inv.url} target="_blank" rel="noreferrer">PSI record</a>}
        </div>
      </div>

      <div className="sec">Documented conditions</div>
      <div className="group">
        <Condition name="Oxygen fraction" f={field(run.o2MolPct)} />
        <Condition name="Total pressure" f={field(run.pressureKPa)} />
        <Condition name="Gravity" f={field(run.gravityG)} />
        <Condition name="O₂ partial pressure" f={field(run.o2PartialKPa)} />
      </div>

      <div className="sec">Evidence vs {sc.name.split(" (")[0]}</div>
      <div className="card">
        <p className="caption num" style={{ margin: "0 0 4px" }}>{fmt(sc.o2MolPct)} mol% · {fmt(sc.pressureKPa)} kPa ({fmt(kPaToPsi(sc.pressureKPa))} psi) · pO₂ {fmt(po2)} kPa</p>
        {readout.rows.map((r) => (
          <div className="evrow" key={r.condition}>
            <span className={`dot ${r.light === "red" ? "off" : LIGHT[r.light]}`} />
            <div>
              <div className="evrow-t">{r.name}</div>
              <p className="evrow-s">{r.note}</p>
            </div>
          </div>
        ))}
        <p className="caption" style={{ marginTop: 12 }}>{readout.limit} {readout.scope}</p>
      </div>

      {readout.nearestTested.disagree && (
        <div className="note" style={{ marginTop: 12 }}>
          Nearest tested condition depends on how you match oxygen: {readout.nearestTested.byMolPct?.runId} by mole fraction
          vs {readout.nearestTested.byPartialPressure?.runId} by partial pressure. A higher O₂ percentage does not mean more oxygen.
        </div>
      )}

      <p className="caption" style={{ marginTop: 14, textAlign: "center" }}>
        Green marks a verified run within tolerance; amber an analog or not-yet-checked run; grey means not in the curated data.
        These rate evidence coverage, never safety.
      </p>
    </div>
  );
}

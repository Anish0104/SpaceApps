import { useMemo, useState } from "react";
import { engineerReadout, kPaToPsi, o2PartialKPa, gravityRegime } from "@flameatlas/engine";
import { useStore } from "../store";
import { dataset, invById, field, sourceRef, type Field } from "../data";
import { FlameView } from "../components/FlameView";

const LIGHT: Record<string, "green" | "amber" | "red"> = { green: "green", yellow: "amber", red: "red" };
const fmt = (n: number, d = 1) => Number(n.toFixed(d)).toString();
const EV_CLASS: Record<string, string> = { MEASURED: "measured", COMPUTED: "computed", ASSUMED: "assumed", INFERRED: "inferred", UNKNOWN: "unknown" };

function Condition({ name, f }: { name: string; f: Field }) {
  const documented = f.value !== null;
  return (
    <div className="condcard">
      <div className="top">
        <div className="k label">{name}</div>
        <span className={`ev ${EV_CLASS[f.type] ?? "unknown"}`}>{documented ? f.type : "Undocumented"}</span>
      </div>
      <div style={{ marginTop: 6 }}>
        {documented
          ? <span className="val mono">{f.value}{f.unit ? <span className="u"> {f.unit}</span> : null}</span>
          : <span className="val undoc mono">not documented</span>}
      </div>
      {documented && f.src && (
        <a className="src" href={f.src.url} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: "inline-block" }}>
          {sourceRef(f.src)} ↗
        </a>
      )}
      {!documented && f.missing && <p className="small faint" style={{ margin: "6px 0 0" }}>{f.missing.replace(/_/g, " ")}</p>}
    </div>
  );
}

/**
 * Mission Lab: the real NASA experiment record is the centerpiece. Step through curated runs; every
 * value shown is the record's own measurement (or marked undocumented), with its evidence type and a
 * link to the NASA source. The flame is a labelled qualitative illustration, never a measurement.
 */
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
    <>
      <div className="eyebrow">Mission Lab · {sc.name.split(" (")[0]}</div>
      <h1 className="h-xl">Inside the test chamber</h1>

      <div className="card">
        <div className="stepper">
          <button className="step-btn" aria-label="Previous run" onClick={() => setI((x) => (x - 1 + runs.length) % runs.length)}>‹</button>
          <div className="rec">
            <div className="id mono">{run.id} · {i + 1}/{runs.length}</div>
            <div className="mat">{run.material.value ?? "Material not documented"}</div>
            <div className="small faint">{inv?.acronym} — {inv?.name}</div>
          </div>
          <button className="step-btn" aria-label="Next run" onClick={() => setI((x) => (x + 1) % runs.length)}>›</button>
        </div>
        <div className="row between" style={{ marginTop: 12 }}>
          <span className={`ev ${verified ? "verified" : "imported"}`}>{verified ? "Verified" : "Imported · awaiting cross-check"}</span>
          {inv && <a className="src" href={inv.url} target="_blank" rel="noreferrer">PSI record ↗</a>}
        </div>
      </div>

      <h2 className="sec">Documented conditions</h2>
      <div className="cond">
        <Condition name="Oxygen fraction" f={field(run.o2MolPct)} />
        <Condition name="Total pressure" f={field(run.pressureKPa)} />
        <Condition name="Gravity" f={field(run.gravityG)} />
        <Condition name="O₂ partial pressure" f={field(run.o2PartialKPa)} />
      </div>

      <h2 className="sec">Gravity illustration</h2>
      <div className="card">
        <div style={{ position: "relative" }}>
          <FlameView gravityG={sc.gravityG} o2MolPct={sc.o2MolPct} height={190} />
          <span className="ev assumed" style={{ position: "absolute", top: 8, left: 8 }}>Illustration — not measured</span>
          <span className="mono small faint" style={{ position: "absolute", bottom: 8, right: 10 }}>{gravityRegime(sc.gravityG)} · {fmt(sc.gravityG, 3)} g</span>
        </div>
        <p className="small faint" style={{ marginTop: 8 }}>Qualitative buoyancy shape only — not a measurement.</p>
      </div>

      <h2 className="sec">Evidence vs this scenario</h2>
      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="label">{sc.name.split(" (")[0]}</span>
          <span className="mono small faint">{fmt(sc.o2MolPct)} mol% · {fmt(sc.pressureKPa)} kPa ({fmt(kPaToPsi(sc.pressureKPa))} psi) · pO₂ {fmt(po2)} kPa</span>
        </div>
        {readout.rows.map((r) => (
          <div className="item" key={r.condition}>
            <span className={`dot ${r.light === "red" ? "hatch" : LIGHT[r.light]}`} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
              <p className="small" style={{ margin: 0 }}>{r.note}</p>
            </div>
          </div>
        ))}
        <p className="small faint" style={{ marginTop: 10 }}>{readout.limit} {readout.scope}</p>
      </div>

      {readout.nearestTested.disagree && (
        <div className="note" style={{ marginTop: 12 }}>
          Nearest tested condition depends on how you match oxygen: {readout.nearestTested.byMolPct?.runId} by mole
          fraction vs {readout.nearestTested.byPartialPressure?.runId} by partial pressure. A higher O₂ percentage does not mean more oxygen.
        </div>
      )}

      <p className="small faint" style={{ marginTop: 12, textAlign: "center" }}>
        Green = verified run within tolerance · Amber = analog or not yet cross-checked · Hatched = not in curated data.
        Lights rate evidence coverage, never safety.
      </p>
    </>
  );
}

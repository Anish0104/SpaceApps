import { useMemo, useState } from "react";
import { engineerReadout, kPaToPsi, o2PartialKPa, gravityRegime, type Scenario } from "@flameatlas/engine";
import { dataset, scenarios } from "../data";
import { FlameView } from "../components/FlameView";

const LIGHT: Record<string, "green" | "amber" | "red"> = { green: "green", yellow: "amber", red: "red" };
const fmt = (n: number, d = 1) => String(Number(n.toFixed(d)));

/** Build a Scenario from live slider values, starting from a named preset. */
function customScenario(base: Scenario, o2: number, pKpa: number, g: number): Scenario {
  return { ...base, id: "custom", name: "Custom habitat", o2MolPct: o2, pressureKPa: pKpa, gravityG: g, source: "Your inputs (assumed)" };
}

export function Lab() {
  const [preset, setPreset] = useState<Scenario>(scenarios.find((s) => s.id === "moon-challenge")!);
  const [o2, setO2] = useState(preset.o2MolPct);
  const [p, setP] = useState(preset.pressureKPa);
  const [g, setG] = useState(preset.gravityG);
  const [touched, setTouched] = useState(false);

  const choose = (s: Scenario) => { setPreset(s); setO2(s.o2MolPct); setP(s.pressureKPa); setG(s.gravityG); setTouched(false); };
  const change = (fn: () => void) => { fn(); setTouched(true); };

  const sc = useMemo(() => customScenario(preset, o2, p, g), [preset, o2, p, g]);
  const readout = useMemo(() => engineerReadout(sc, dataset.runs), [sc]);
  const po2 = o2PartialKPa(o2, p);

  return (
    <>
      <h1>Mission Lab</h1>
      <p className="small">Pick a crew environment, then adjust its atmosphere. The evidence readout updates live.</p>

      <div className="presets" role="group" aria-label="Crew environment">
        {scenarios.map((s) => (
          <button key={s.id} className="pill" aria-pressed={!touched && preset.id === s.id} onClick={() => choose(s)}>{s.name.split(" (")[0]}</button>
        ))}
      </div>

      <div className="card">
        <div className="stage">
          <FlameView gravityG={g} o2MolPct={o2} />
          <span className="chip assumed tag-ill">Illustrative shape — not measured</span>
          <span className="g-read">{gravityRegime(g)} · {fmt(g, 3)} g</span>
        </div>

        <div className="control">
          <div className="top"><span>Gravity</span><span className="val">{fmt(g, 3)} g</span></div>
          <input type="range" min={0} max={1} step={0.005} value={g} onChange={(e) => change(() => setG(+e.target.value))} aria-label="Gravity" />
        </div>
        <div className="control">
          <div className="top"><span>Oxygen</span><span className="val">{fmt(o2)} mol%</span></div>
          <input type="range" min={15} max={100} step={0.5} value={o2} onChange={(e) => change(() => setO2(+e.target.value))} aria-label="Oxygen" />
        </div>
        <div className="control">
          <div className="top"><span>Pressure</span><span className="val">{fmt(p, 1)} kPa · {fmt(kPaToPsi(p))} psi</span></div>
          <input type="range" min={20} max={110} step={0.5} value={p} onChange={(e) => change(() => setP(+e.target.value))} aria-label="Pressure" />
        </div>

        <div className="row between small" style={{ marginTop: 4 }}>
          <span className="chip computed">O₂ partial pressure {fmt(po2)} kPa</span>
          <span className="chip assumed">Inputs assumed</span>
        </div>
      </div>

      <h2>What the evidence covers</h2>
      <div className="card">
        {readout.rows.map((r) => (
          <div className="item" key={r.condition}>
            <span className={`dot ${r.light === "red" ? "hatch" : LIGHT[r.light]}`} />
            <div>
              <h3 style={{ fontSize: 14 }}>{r.name}</h3>
              <p className="small" style={{ margin: 0 }}>{r.note}</p>
            </div>
          </div>
        ))}
        <p className="small faint" style={{ marginTop: 10 }}>{readout.limit}</p>
      </div>

      {readout.nearestTested.disagree && (
        <div className="note">
          Nearest tested condition depends on how you match oxygen: {readout.nearestTested.byMolPct?.runId} by
          mole fraction vs {readout.nearestTested.byPartialPressure?.runId} by partial pressure. A higher O₂
          percentage does not mean more oxygen.
        </div>
      )}

      <p className="small faint" style={{ marginTop: 14 }}>
        Green = a verified run of this material within tolerance · Amber = analog or not yet cross-checked ·
        Hatched = not in our curated data. Lights rate evidence coverage, never safety.
      </p>
    </>
  );
}

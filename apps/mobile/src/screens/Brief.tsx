import { kPaToPsi, o2PartialKPa } from "@flameatlas/engine";
import { useStore } from "../store";
import { scenarios } from "../data";
import { Viewport } from "../components/Viewport";

const fmt = (n: number, d = 1) => Number(n.toFixed(d)).toString();
// four quick switches map to curated scenarios (from the backend list)
const QUICK: [string, string][] = [["Earth", "earth"], ["Orbit", "iss"], ["Moon", "moon-challenge"], ["Mars", "mars"]];

/**
 * Mission Brief: choose a crew environment and open the Lab. Every reading comes from the selected
 * scenario in the backend data (scenarios.json) with its real source. Atmosphere inputs are labelled
 * as assumed scenario inputs and oxygen partial pressure as calculated — honestly, per the record.
 */
export function Brief({ onOpenLab, onOpenAsk }: { onOpenLab: () => void; onOpenAsk: () => void }) {
  const { scenario: sc, setScenarioId } = useStore();
  const po2 = o2PartialKPa(sc.o2MolPct, sc.pressureKPa);

  return (
    <>
      <div className="eyebrow">Mission Brief</div>
      <h1 className="h-xl">Choose a destination</h1>

      <div className="viewport" style={{ marginTop: 6 }}>
        <Viewport environment={sc.environment} height={250} />
        <span className="credit mono">Rendered illustration</span>
        <div className="overlay">
          <div className="place">{sc.environment}</div>
          <div className="row between" style={{ marginTop: 2 }}>
            <h2 className="h-lg" style={{ margin: 0 }}>{sc.name}</h2>
            <button className="btn ice" style={{ width: "auto" }} onClick={onOpenLab}>Flight view →</button>
          </div>
        </div>
      </div>

      <div className="switches" style={{ marginTop: 12 }}>
        {QUICK.map(([label, id]) => (
          <button key={id} className="sw" aria-pressed={sc.id === id} onClick={() => setScenarioId(id)}>{label}</button>
        ))}
      </div>
      <div className="pills" style={{ marginTop: 8 }} role="group" aria-label="All environments">
        {scenarios.map((s) => (
          <button key={s.id} className="pill" aria-pressed={sc.id === s.id} onClick={() => setScenarioId(s.id)}>{s.name.split(" (")[0]}</button>
        ))}
      </div>

      <h2 className="sec">Scenario atmosphere</h2>
      <div className="grid3">
        <div className="reading">
          <div className="k">Oxygen</div>
          <div><span className="v">{fmt(sc.o2MolPct)}</span> <span className="u">mol%</span></div>
          <div style={{ marginTop: 7 }}><span className="ev assumed">Assumed</span></div>
        </div>
        <div className="reading">
          <div className="k">Pressure</div>
          <div><span className="v">{fmt(sc.pressureKPa)}</span> <span className="u">kPa</span></div>
          <div className="u" style={{ marginTop: 2 }}>{fmt(kPaToPsi(sc.pressureKPa))} psi</div>
          <div style={{ marginTop: 5 }}><span className="ev assumed">Assumed</span></div>
        </div>
        <div className="reading">
          <div className="k">Gravity</div>
          <div><span className="v">{fmt(sc.gravityG, 3)}</span> <span className="u">g</span></div>
          <div style={{ marginTop: 7 }}><span className="ev assumed">Assumed</span></div>
        </div>
      </div>
      <div className="reading" style={{ marginTop: 10 }}>
        <div className="row between">
          <div><div className="k">O₂ partial pressure</div><div><span className="v">{fmt(po2)}</span> <span className="u">kPa</span></div></div>
          <span className="ev computed">Calculated</span>
        </div>
        <p className="small faint" style={{ margin: "6px 0 0", fontFamily: "var(--mono)", fontSize: 11 }}>pO₂ = O₂ mol% / 100 × pressure</p>
      </div>
      <p className="small faint" style={{ marginTop: 10 }}>Source: {sc.source}.{sc.note ? ` ${sc.note}.` : ""}</p>

      <button className="btn primary" style={{ marginTop: 14 }} onClick={onOpenLab}>Open Mission Lab</button>
      <button className="btn ghost" style={{ marginTop: 10 }} onClick={onOpenAsk}>Ask the archive</button>
    </>
  );
}

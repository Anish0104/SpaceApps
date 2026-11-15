import { kPaToPsi, o2PartialKPa } from "@flameatlas/engine";
import { useStore } from "../store";
import { scenarios } from "../data";
import { sceneFor } from "../scenes";
import { Window } from "../components/Window";

const fmt = (n: number, d = 1) => Number(n.toFixed(d)).toString();
const QUICK: [string, string][] = [["Earth", "earth"], ["Orbit", "iss"], ["Moon", "moon-challenge"], ["Mars", "mars"]];

/** Mission Brief: choose a destination and open the Lab. Readings come from the selected scenario in
 *  the backend data with its source; atmosphere inputs are labelled assumed, O₂ partial pressure calculated. */
export function Brief({ onOpenLab, onFlight }: { onOpenLab: () => void; onFlight: () => void }) {
  const { scenario: sc, setScenarioId } = useStore();
  const po2 = o2PartialKPa(sc.o2MolPct, sc.pressureKPa);

  return (
    <>
      <div className="row between" style={{ marginBottom: 6 }}>
        <div className="brand" style={{ fontSize: 18 }}><img src="/icon.svg" alt="" aria-hidden="true" style={{ width: 26, height: 26 }} />Flame<b>Atlas</b></div>
      </div>
      <h1 className="h-xl" style={{ marginTop: 2 }}>Choose a destination</h1>

      <div style={{ marginTop: 4 }}>
        <Window scenario={sc} height={290} sizes="min(540px, 94vw)">
          <button className="btn ice" style={{ width: "auto", background: "rgba(8,13,24,0.45)", borderColor: "rgba(255,255,255,0.3)", color: "#fff" }} onClick={onFlight}>Flight view →</button>
        </Window>
      </div>
      <h2 className="h-lg" style={{ marginTop: 12 }}>{sc.name}</h2>

      <div className="switches" style={{ marginTop: 10 }}>
        {QUICK.map(([label, id]) => (
          <button key={id} className="sw" aria-pressed={sc.id === id} onClick={() => setScenarioId(id)}>
            <span className="planet" style={{ background: sceneFor({ id, environment: id }).heroAccent }} />{label}
          </button>
        ))}
      </div>
      <div className="pills" style={{ marginTop: 8 }} role="group" aria-label="All presets">
        {scenarios.map((s) => <button key={s.id} className="pill" aria-pressed={sc.id === s.id} onClick={() => setScenarioId(s.id)}>{sceneFor(s).pickerLabel ?? sceneFor(s).label}</button>)}
      </div>

      <h2 className="sec">Scenario atmosphere</h2>
      <div className="grid3">
        <div className="reading"><div className="k">Oxygen</div><div><span className="v">{fmt(sc.o2MolPct)}</span> <span className="u">mol%</span></div><div style={{ marginTop: 7 }}><span className="ev assumed">Assumed</span></div></div>
        <div className="reading"><div className="k">Pressure</div><div><span className="v">{fmt(sc.pressureKPa)}</span> <span className="u">kPa</span></div><div className="u" style={{ marginTop: 2 }}>{fmt(kPaToPsi(sc.pressureKPa))} psi</div><div style={{ marginTop: 5 }}><span className="ev assumed">Assumed</span></div></div>
        <div className="reading"><div className="k">Gravity</div><div><span className="v">{fmt(sc.gravityG, 3)}</span> <span className="u">g</span></div><div style={{ marginTop: 7 }}><span className="ev assumed">Assumed</span></div></div>
      </div>
      <div className="reading" style={{ marginTop: 10 }}>
        <div className="row between">
          <div><div className="k">O₂ partial pressure</div><div><span className="v">{fmt(po2)}</span> <span className="u">kPa</span></div></div>
          <span className="ev computed">Calculated</span>
        </div>
      </div>
      <p className="small faint" style={{ marginTop: 10 }}>Source: {sc.source}.{sc.note ? ` ${sc.note}.` : ""}</p>

      <button className="btn primary" style={{ marginTop: 14 }} onClick={onOpenLab}>Open Mission Lab</button>
    </>
  );
}

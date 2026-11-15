import { kPaToPsi, o2PartialKPa } from "@flameatlas/engine";
import { useStore } from "../store";
import { scenarios } from "../data";
import { sceneFor, orbStyle } from "../scenes";

const fmt = (n: number, d = 1) => Number(n.toFixed(d)).toString();
const envName = (s: { id: string; environment: string }) => sceneFor(s).pickerLabel ?? sceneFor(s).label;

const Arrow = () => (
  <span className="arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
);

/** Home: choose the crew environment, read its atmosphere, open the Lab. Atmosphere inputs are
 *  labelled assumed; O₂ partial pressure is calculated. Every figure comes from the backend scenario. */
export function Brief({ onOpenLab }: { onOpenLab: () => void }) {
  const { scenario: sc, setScenarioId } = useStore();
  const po2 = o2PartialKPa(sc.o2MolPct, sc.pressureKPa);

  return (
    <div className="page">
      <p className="greeting">Mission planner</p>
      <h1 className="hero">Which crew<br />environment?</h1>

      <div className="sec">Choose destination</div>
      <div className="dests">
        {scenarios.map((s) => {
          const on = sc.id === s.id;
          return (
            <button key={s.id} className={`dest${on ? " sel" : ""}`} aria-pressed={on} onClick={() => setScenarioId(s.id)}>
              <span className="orb" style={orbStyle(sceneFor(s).heroAccent)} />
              <span className="dest-main">
                <span className="dest-name">{envName(s)}</span>
                <span className="dest-sub">{fmt(s.o2MolPct)}% O₂ · {fmt(s.pressureKPa)} kPa</span>
              </span>
              <span className="dest-meta">{fmt(s.gravityG, 2)} g</span>
              <Arrow />
            </button>
          );
        })}
      </div>

      <div className="sec">Atmosphere · {sc.name.split(" (")[0]}</div>
      <div className="reads">
        <div className="read">
          <div className="k">Oxygen</div>
          <div className="v">{fmt(sc.o2MolPct)}<span className="u"> mol%</span></div>
          <div className="sub">assumed</div>
        </div>
        <div className="read">
          <div className="k">Pressure</div>
          <div className="v">{fmt(sc.pressureKPa)}<span className="u"> kPa</span></div>
          <div className="sub">{fmt(kPaToPsi(sc.pressureKPa))} psi</div>
        </div>
        <div className="read">
          <div className="k">Gravity</div>
          <div className="v">{fmt(sc.gravityG, 3)}<span className="u"> g</span></div>
          <div className="sub">assumed</div>
        </div>
        <div className="read wide">
          <div>
            <div className="k">O₂ partial pressure</div>
            <div className="v">{fmt(po2)}<span className="u"> kPa</span></div>
          </div>
          <span className="tag accent">Calculated</span>
        </div>
      </div>
      <p className="caption">Source: {sc.source}.{sc.note ? ` ${sc.note}.` : ""}</p>

      <button className="btn primary" style={{ marginTop: 18 }} onClick={onOpenLab}>Open Mission Lab</button>
    </div>
  );
}

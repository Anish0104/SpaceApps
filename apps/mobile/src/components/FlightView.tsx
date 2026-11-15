import { useEffect } from "react";
import { kPaToPsi, o2PartialKPa } from "@flameatlas/engine";
import { useStore } from "../store";
import { scenarios } from "../data";
import { sceneFor, sceneSrcSet, sceneSrc, photoUrl } from "../scenes";

const fmt = (n: number, d = 1) => Number(n.toFixed(d)).toString();
// destinations to swipe through, in flight order
const ORDER = ["earth", "iss", "moon-challenge", "moon-fm2", "rover", "mars", "suit"];

/**
 * Full-screen Flight View: the environment's NASA photo fills the viewport; destination, readings and
 * controls sit near the bottom. Swipe, arrow keys, or the prev/next buttons change destination; Open
 * Lab carries it forward; Exit or Escape dismiss. Photo drifts slowly (static under reduced motion).
 */
export function FlightView({ onExit, onOpenLab }: { onExit: () => void; onOpenLab: () => void }) {
  const { scenario: sc, setScenarioId } = useStore();
  const s = sceneFor(sc);
  const i = Math.max(0, ORDER.indexOf(sc.id));
  const go = (d: number) => setScenarioId(ORDER[(i + d + ORDER.length) % ORDER.length]);
  const po2 = o2PartialKPa(sc.o2MolPct, sc.pressureKPa);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // touch swipe
  let x0 = 0;
  const start = (e: React.TouchEvent) => { x0 = e.touches[0].clientX; };
  const end = (e: React.TouchEvent) => { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); };

  return (
    <div className="flight" role="dialog" aria-modal="true" aria-label="Flight view" onTouchStart={start} onTouchEnd={end}>
      <img className="drift-img" key={s.id} src={sceneSrc(s)} srcSet={sceneSrcSet(s)} sizes="100vw" alt={s.photo.caption} style={{ objectPosition: s.focus }} />
      <div className="frame" />
      <button className="btn ghost exit" style={{ width: "auto", background: "rgba(8,13,24,0.5)", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={onExit}>Exit ✕</button>
      <button className="arrow" style={{ left: 14 }} aria-label="Previous destination" onClick={() => go(-1)}>‹</button>
      <button className="arrow" style={{ right: 14 }} aria-label="Next destination" onClick={() => go(1)}>›</button>

      <div className="foot">
        <div className="mono" style={{ color: "rgba(237,245,255,0.75)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>{s.label}</div>
        <div className="dest">{sc.name.split(" (")[0]}</div>
        <div className="reads">
          {[["O₂", `${fmt(sc.o2MolPct)} mol%`], ["Pressure", `${fmt(sc.pressureKPa)} kPa`], ["Gravity", `${fmt(sc.gravityG, 3)} g`]].map(([k, v]) => (
            <div key={k} className="reading" style={{ background: "rgba(8,13,24,0.5)", borderColor: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}>
              <div className="k" style={{ color: "rgba(237,245,255,0.6)" }}>{k}</div><div className="v" style={{ color: "#fff" }}>{v}</div>
            </div>
          ))}
        </div>
        <p className="mono" style={{ color: "rgba(237,245,255,0.7)", fontSize: 11, margin: "0 0 10px" }}>
          pO₂ {fmt(po2)} kPa (calculated) · <a href={photoUrl(s.photo.nasaId)} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{s.photo.credit} ↗</a>
        </p>
        <div className="pills" style={{ marginBottom: 10 }}>
          {scenarios.map((x) => <button key={x.id} className="pill" aria-pressed={x.id === sc.id} onClick={() => setScenarioId(x.id)} style={{ background: "rgba(8,13,24,0.5)", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}>{sceneFor(x).label}</button>)}
        </div>
        <button className="btn primary" onClick={() => { onExit(); onOpenLab(); }}>Open Mission Lab →</button>
      </div>
    </div>
  );
}

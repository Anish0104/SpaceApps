import { useEffect, useState } from "react";
import { useStore } from "../store";
import { sceneFor, sceneSrc, sceneSrcSet } from "../scenes";

const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The opening: a spacecraft porthole with the current environment's NASA photo. Enter expands the
 *  porthole toward the viewer and dissolves into the app (~1s); instant under reduced motion. */
export function Launch({ onEnter }: { onEnter: () => void }) {
  const { scenario } = useStore();
  const s = sceneFor(scenario);
  const [going, setGoing] = useState(false);
  const enter = () => { if (reduced()) return onEnter(); setGoing(true); setTimeout(onEnter, 1060); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") enter(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className={`launch${going ? " go" : ""}`} role="dialog" aria-label="Enter FlameAtlas">
      <div className="porthole">
        <img src={sceneSrc(s)} srcSet={sceneSrcSet(s)} sizes="80vw" alt={s.photo.caption} style={{ objectPosition: s.focus }} />
      </div>
      <div className="cta">
        <div style={{ textAlign: "center" }}>
          <div className="eyebrow">FlameAtlas</div>
          <h1 className="h-xl" style={{ margin: "2px 0 0" }}>Fire in freefall</h1>
          <p className="small" style={{ maxWidth: 330 }}>NASA's microgravity combustion archive, read for your crew environment. Evidence strength describes the archive — never a safety approval.</p>
        </div>
        <button className="btn primary" style={{ maxWidth: 330 }} onClick={enter} autoFocus>Enter the station →</button>
      </div>
    </div>
  );
}

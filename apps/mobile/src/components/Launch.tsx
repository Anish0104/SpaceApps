import { useEffect, useState } from "react";
import { Viewport } from "./Viewport";
import { useStore } from "../store";

const prefersReduced = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The opening: a spacecraft porthole showing the current environment. Tapping "Enter" expands the
 * porthole toward the viewer and dissolves into the app (~1s). Under reduced motion, entry is instant.
 */
export function Launch({ onEnter }: { onEnter: () => void }) {
  const { scenario } = useStore();
  const [going, setGoing] = useState(false);

  const enter = () => {
    if (prefersReduced()) return onEnter();
    setGoing(true);
    setTimeout(onEnter, 1050);
  };

  // keyboard: Enter/Space launches
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") enter(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className={`launch${going ? " go" : ""}`} role="dialog" aria-label="Enter FlameAtlas">
      <div className="porthole">
        <Viewport environment={scenario.environment} height={460} />
        <span className="viewport-credit" style={{ position: "absolute", top: 14, right: 16, fontFamily: "var(--mono)", fontSize: 10, color: "rgba(237,245,255,0.6)" }}>
          Rendered illustration
        </span>
      </div>
      <div className="cta">
        <div style={{ textAlign: "center" }}>
          <div className="eyebrow">FlameAtlas</div>
          <h1 className="h-xl" style={{ margin: "2px 0 0" }}>Fire safety from<br />NASA's microgravity archive</h1>
          <p className="small" style={{ maxWidth: 320 }}>Evidence strength describes the archive. It is never a safety approval.</p>
        </div>
        <button className="btn primary" style={{ maxWidth: 320 }} onClick={enter} autoFocus>Enter the station →</button>
      </div>
    </div>
  );
}

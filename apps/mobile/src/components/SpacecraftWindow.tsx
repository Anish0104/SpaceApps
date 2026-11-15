import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { JOURNEY, JOURNEY_SECONDS, journeySrcSet, journeySrc, journeyUrl } from "../journey";

const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The hero as a spacecraft porthole: an oval metal window framing real NASA flight photos. The view
 * advances on its own every few seconds in flight order, each frame drifting slowly; a pause button
 * stops it, and it pauses when the tab is hidden. Under reduced motion a single frame is shown, still.
 * Overlaid `children` (headline, CTA) sit over the glass.
 */
export function SpacecraftWindow({ children }: { children?: ReactNode }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [layers, setLayers] = useState<number[]>([0]);
  const frame = JOURNEY[index]!;
  const still = reduced();

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (paused || hidden || still) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % JOURNEY.length), JOURNEY_SECONDS * 1000);
    return () => window.clearTimeout(t);
  }, [index, paused, hidden, still]);

  // Keep the outgoing frame beneath while the new one fades in.
  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1] === index ? prev : [...prev.slice(-1), index]));
  }, [index]);

  return (
    <div className="ship-window" style={{ ["--journey-accent" as string]: frame.accent } as CSSProperties}>
      <span aria-hidden="true" className="ship-rim" />
      <div className="landing-frame ship-glass">
        <div aria-hidden="true" className="ship-scene">
          {layers.map((i) => {
            const f = JOURNEY[i]!;
            return (
              <div key={`${i}-${f.key}`} className="journey-layer" onAnimationEnd={(e) => e.target === e.currentTarget && setLayers((prev) => (prev.length > 1 && prev[prev.length - 1] === i ? prev.slice(-1) : prev))}>
                <img
                  className={`scene-img ${still ? "" : "journey-drift"}`}
                  srcSet={journeySrcSet(f)} src={journeySrc(f)} sizes="100vw" alt="" decoding="async"
                  style={{ objectPosition: f.focus, ["--dx" as string]: `${f.drift[0]}%`, ["--dy" as string]: `${f.drift[1]}%`, ["--dur" as string]: `${JOURNEY_SECONDS + 2}s` } as CSSProperties}
                />
              </div>
            );
          })}
          <div className="scene-scrim-frame" />
        </div>

        <span aria-hidden="true" className="ship-glare" />

        <div className="ship-label">
          <span className="ship-label-lead">Exterior view</span>
          <span aria-hidden="true" className="ship-label-lead">·</span>
          <span key={frame.key} className="journey-stage">{frame.stage}</span>
        </div>

        <div className="ship-overlay">{children}</div>

        <div className="journey-bar">
          <ol aria-label="Journey" className="journey-dots">
            {JOURNEY.map((f, i) => (
              <li key={f.key} className="journey-seg" title={f.stage}>
                <span className={i < index ? "is-done" : i === index ? "is-now" : ""} style={i === index ? ({ animationDuration: `${JOURNEY_SECONDS}s`, animationPlayState: paused || hidden || still ? "paused" : "running" } as CSSProperties) : undefined} />
                <span className="sr-only">{f.stage}{i === index ? " (now showing)" : ""}</span>
              </li>
            ))}
          </ol>
          {!still && (
            <button type="button" className="journey-pause" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Resume the journey" : "Pause the journey"} aria-pressed={paused}>
              {paused
                ? <svg aria-hidden="true" width="9" height="11" viewBox="0 0 10 12" fill="currentColor"><path d="M1 1 9 6 1 11Z" /></svg>
                : <svg aria-hidden="true" width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="2.6" height="8" rx="0.6" /><rect x="6.4" y="1" width="2.6" height="8" rx="0.6" /></svg>}
            </button>
          )}
        </div>

        <a key={frame.nasaId} href={journeyUrl(frame)} target="_blank" rel="noreferrer" className="journey-credit">
          {frame.caption} · NASA {frame.nasaId}
        </a>
      </div>
    </div>
  );
}

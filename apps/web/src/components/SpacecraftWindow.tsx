import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { JOURNEY, JOURNEY_SECONDS, journeySrcSet, journeyUrl, type JourneyFrame } from "../lib/journey";

const reducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The landing hero as a spacecraft viewport. The view changes on its own every few seconds, in flight order
 * (Earth orbit, outbound, lunar flyby, the Moon, Mars), each frame drifting slowly so it feels like motion.
 * A pause button stops it (auto-advancing content must be pausable), and it pauses when the tab is hidden.
 * Under prefers-reduced-motion the frames cross-fade without drifting.
 */
export function SpacecraftWindow({ children }: { children: (frame: JourneyFrame) => ReactNode }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [layers, setLayers] = useState<number[]>([0]);
  const frame = JOURNEY[index]!;
  const still = reducedMotion();

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Advance after each frame's time on screen.
  useEffect(() => {
    if (paused || hidden) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % JOURNEY.length), JOURNEY_SECONDS * 1000);
    return () => window.clearTimeout(t);
  }, [index, paused, hidden]);

  // Keep the outgoing frame underneath while the new one fades in; warm the next image.
  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1] === index ? prev : [...prev.slice(-1), index]));
    const next = JOURNEY[(index + 1) % JOURNEY.length]!;
    if (typeof Image !== "undefined") {
      const img = new Image();
      img.sizes = "100vw";
      img.srcset = journeySrcSet(next);
    }
  }, [index]);

  return (
    <div className="ship-window" style={{ ["--journey-accent" as string]: frame.accent }}>
      <span aria-hidden="true" className="ship-rim" />
      <div className="landing-frame ship-glass">
        <div aria-hidden="true" className="ship-media absolute inset-0 overflow-hidden bg-black">
          {layers.map((i) => {
            const f = JOURNEY[i]!;
            return (
              <div key={`${i}-${f.key}`} className="journey-layer" onAnimationEnd={(e) => e.target === e.currentTarget && setLayers((prev) => (prev.length > 1 && prev[prev.length - 1] === i ? prev.slice(-1) : prev))}>
                <img
                  className={`scene-img ${still ? "" : "journey-drift"}`}
                  srcSet={journeySrcSet(f)}
                  src={`${f.src}-1600.webp`}
                  sizes="100vw"
                  alt=""
                  decoding="async"
                  style={{ objectPosition: f.focus, ["--dx" as string]: `${f.drift[0]}%`, ["--dy" as string]: `${f.drift[1]}%`, ["--dur" as string]: `${JOURNEY_SECONDS + 2}s` } as CSSProperties}
                />
              </div>
            );
          })}
          <div className="scene-scrim-frame absolute inset-0" />
        </div>

        <span aria-hidden="true" className="ship-glare" />

        {/* HUD: where we are, and the journey's progress */}
        <div className="ship-label">
          <span className="ship-label-lead">Exterior view</span>
          <span aria-hidden="true" className="ship-label-lead opacity-50">·</span>
          <span key={frame.key} className="journey-stage">{frame.stage}</span>
        </div>

        <div className="relative z-10">{children(frame)}</div>

        <div className="journey-bar">
          <ol aria-label="Journey" className="flex flex-1 gap-1.5">
            {JOURNEY.map((f, i) => (
              <li key={f.key} className="journey-seg" title={f.stage}>
                <span
                  className={i < index ? "is-done" : i === index ? "is-now" : ""}
                  style={i === index ? ({ animationDuration: `${JOURNEY_SECONDS}s`, animationPlayState: paused || hidden ? "paused" : "running" } as CSSProperties) : undefined}
                />
                <span className="sr-only">{f.stage}{i === index ? " (now showing)" : ""}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Resume the journey" : "Pause the journey"}
            aria-pressed={paused}
            className="journey-pause"
          >
            {paused ? (
              <svg aria-hidden="true" width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M1 1 9 6 1 11Z" /></svg>
            ) : (
              <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="2.6" height="8" rx="0.6" /><rect x="6.4" y="1" width="2.6" height="8" rx="0.6" /></svg>
            )}
          </button>
        </div>

        <a
          key={frame.nasaId}
          href={journeyUrl(frame)}
          target="_blank"
          rel="noreferrer"
          title={`${frame.title}. ${frame.credit}, ${frame.date}. Scene photo, not evidence.`}
          className="journey-credit"
        >
          {frame.caption} · NASA {frame.nasaId}
        </a>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { srcSet, src, type Scene } from "../lib/scenes";

/**
 * The active scene's photo, cross-fading when the scenario changes. The outgoing image stays underneath
 * until the new one has loaded and faded in, so a switch never flashes the background colour.
 *  - "home": the home hero; the photo fades into the page background on the left and bottom
 *  - "frame": inside the landing page's rounded hero frame, behind centred white text
 *  - "compact": strip behind white text (scenario strip)
 *  - "page": faint, masked into the page background (every other page)
 */
export function SceneBackdrop({
  scene,
  variant = "page",
  drift = false,
}: {
  scene: Scene;
  variant?: "home" | "frame" | "compact" | "page";
  drift?: boolean;
}) {
  const [layers, setLayers] = useState<Scene[]>([scene]);

  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1]?.id === scene.id ? prev : [...prev.slice(-1), scene]));
  }, [scene]);

  const drop = (id: string) => setLayers((prev) => (prev.length > 1 && prev[prev.length - 1]?.id === id ? prev.slice(-1) : prev));

  const wrapper = variant === "page" ? "page-backdrop" : variant === "home" ? "home-backdrop" : "absolute inset-0 overflow-hidden";
  const solidBg = variant === "compact" || variant === "frame";

  return (
    <div aria-hidden="true" className={wrapper} style={solidBg ? { background: scene.fallback } : undefined}>
      {layers.map((s) => (
        <div key={s.id} className="scene-layer" onAnimationEnd={(e) => e.target === e.currentTarget && drop(s.id)}>
          <img
            className={`scene-img ${drift ? "scene-drift" : ""}`}
            srcSet={srcSet(s)}
            src={src(s)}
            sizes="100vw"
            alt=""
            decoding="async"
            style={{ objectPosition: s.focus }}
          />
        </div>
      ))}
      {variant === "home" && <div className="scene-scrim-home" />}
      {variant === "compact" && <div className="scene-scrim-compact absolute inset-0" />}
      {variant === "frame" && <div className="scene-scrim-frame absolute inset-0" />}
    </div>
  );
}

/** Small credit line for the photo behind a section. Photos set the scene; they are not evidence. */
export function PhotoCredit({ scene, className = "" }: { scene: Scene; className?: string }) {
  const p = scene.photo;
  return (
    <a
      href={`https://images.nasa.gov/details/${p.nasaId}`}
      target="_blank"
      rel="noreferrer"
      title={`${p.title}. ${p.center}, ${p.date}.${p.note ? ` ${p.note}.` : ""} Scene photo, not evidence.`}
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide transition-opacity hover:opacity-100 ${className}`}
    >
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1" y="2.5" width="10" height="7.5" rx="1.5" />
        <circle cx="6" cy="6.25" r="1.9" />
      </svg>
      <span>
        {p.caption} · NASA {p.nasaId}
      </span>
    </a>
  );
}

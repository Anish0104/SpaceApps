import { useEffect, useRef, useState } from "react";
import { RegimeMark } from "./Badge";

/**
 * The home page instrument: one flame outline, three gravity stops. It illustrates buoyancy and
 * is not a simulation. The Moon stop is drawn as a dashed outline over the hatch because there is
 * no long-duration data to draw from; its shape is a placeholder, never a prediction.
 */

/** One closed outline, four cubic segments. The same parameters draw a teardrop or a sphere. */
type Shape = { cy: number; w: number; rb: number; ht: number; side: number; tipX: number; tipDrop: number };

const CX = 120;
const FUEL_Y = 170;
const KAPPA = 0.5523; // circular arc as a cubic

const STOPS = [
  {
    name: "Earth", g: 1, gLabel: "1 g",
    caption: "Buoyancy lifts hot gas, so the flame stretches into a tall, sooty yellow teardrop.",
    shape: { cy: 166, w: 30, rb: 30, ht: 136, side: 0.38, tipX: 0.1, tipDrop: 54 },
  },
  {
    name: "Moon", g: 0.165, gLabel: "0.165 g",
    caption: "No sustained, spacecraft-based lunar-gravity flame-spread data in PSI yet. FM2 is targeting launch in late 2026.",
    shape: { cy: 168, w: 38, rb: 38, ht: 86, side: 0.46, tipX: 0.32, tipDrop: 24 },
  },
  {
    name: "Orbit", g: 0, gLabel: "~0 g",
    caption: "With almost no buoyancy, the flame settles into a dim blue sphere around the fuel.",
    shape: { cy: FUEL_Y, w: 46, rb: 46, ht: 46, side: KAPPA, tipX: KAPPA, tipDrop: 0 },
  },
] as const;

const LAST = STOPS.length - 1;
const DURATION_MS = 450;
const SHAPE_KEYS = ["cy", "w", "rb", "ht", "side", "tipX", "tipDrop"] as const;

function shapeAt(pos: number): Shape {
  const i = Math.min(LAST - 1, Math.floor(pos));
  const f = pos - i;
  const a: Shape = STOPS[i]!.shape;
  const b: Shape = STOPS[i + 1]!.shape;
  const out = { ...a };
  for (const k of SHAPE_KEYS) out[k] = a[k] + (b[k] - a[k]) * f;
  return out;
}

function pathOf({ cy, w, rb, ht, side, tipX, tipDrop }: Shape): string {
  const n = (x: number) => x.toFixed(2);
  const top = cy - ht;
  const bottom = cy + rb;
  return [
    `M ${n(CX)} ${n(bottom)}`,
    `C ${n(CX + KAPPA * w)} ${n(bottom)} ${n(CX + w)} ${n(cy + KAPPA * rb)} ${n(CX + w)} ${n(cy)}`,
    `C ${n(CX + w)} ${n(cy - side * ht)} ${n(CX + tipX * w)} ${n(top + tipDrop)} ${n(CX)} ${n(top)}`,
    `C ${n(CX - tipX * w)} ${n(top + tipDrop)} ${n(CX - w)} ${n(cy - side * ht)} ${n(CX - w)} ${n(cy)}`,
    `C ${n(CX - w)} ${n(cy + KAPPA * rb)} ${n(CX - KAPPA * w)} ${n(bottom)} ${n(CX)} ${n(bottom)} Z`,
  ].join(" ");
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function FlameInstrument() {
  const [stop, setStop] = useState(1); // opens on the Moon: the gap is the point
  const [pos, setPos] = useState(1); // animated position between stops, 0..2
  const posRef = useRef(1);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /** The shape only ever animates here, in response to the slider. */
  function moveTo(next: number) {
    setStop(next);
    cancelAnimationFrame(raf.current);
    if (prefersReducedMotion()) {
      posRef.current = next;
      setPos(next);
      return;
    }
    const from = posRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const p = from + (next - from) * (1 - Math.pow(1 - t, 3));
      posRef.current = p;
      setPos(p);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  const d = pathOf(shapeAt(pos));
  const current = STOPS[stop]!;
  const earth = Math.max(0, 1 - pos);
  const moon = Math.max(0, 1 - Math.abs(pos - 1));
  const orbit = Math.max(0, pos - 1);

  return (
    <figure className="panel grid gap-x-10 gap-y-6 p-6 sm:p-10 md:grid-cols-12">
      <div className="flex justify-center rounded-xl bg-[radial-gradient(circle_at_50%_60%,var(--surface-2),transparent_70%)] md:col-span-5">
        <svg viewBox="50 20 140 204" className="h-64 w-auto max-w-full md:h-80" role="img"
          aria-label={`Flame illustration at ${current.name} gravity, ${current.gLabel}. ${current.caption}`}>
          <defs>
            <linearGradient id="flame-soot" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--flame-blue)" />
              <stop offset="14%" stopColor="var(--flame-soot-b)" />
              <stop offset="55%" stopColor="var(--flame-soot-a)" />
              <stop offset="100%" stopColor="var(--flame-soot-b)" stopOpacity="0.85" />
            </linearGradient>
            <radialGradient id="flame-orbit" cx="50%" cy="60%" r="55%">
              <stop offset="0%" stopColor="var(--flame-blue)" stopOpacity="0.05" />
              <stop offset="70%" stopColor="var(--flame-blue)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--flame-blue)" stopOpacity="0.75" />
            </radialGradient>
            <filter id="flame-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <pattern id="flame-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--text-muted)" strokeWidth="1.2" opacity="0.4" />
            </pattern>
          </defs>
          {/* Earth: soot yellow, flickers only when settled */}
          <path d={d} fill="var(--flame-soot-b)" opacity={earth * 0.45} filter="url(#flame-glow)" />
          <path d={d} fill="url(#flame-soot)" opacity={earth} className={pos === 0 ? "flame-flicker" : undefined} />
          {/* Orbit: dim CH blue, steady */}
          <path d={d} fill="var(--flame-blue)" opacity={orbit * 0.35} filter="url(#flame-glow)" />
          <path d={d} fill="url(#flame-orbit)" stroke="var(--flame-blue)" strokeWidth="1.5" opacity={orbit} />
          {/* Moon: no data, so hatch and a dashed outline */}
          <g opacity={moon}>
            <path d={d} fill="url(#flame-hatch)" />
            <path d={d} fill="none" stroke="var(--text)" strokeWidth="1.5" strokeDasharray="6 5" strokeLinecap="round" />
          </g>
          {/* The fuel stays put; only the flame around it changes */}
          <circle cx={CX} cy={FUEL_Y} r="4" fill="var(--text)" />
        </svg>
      </div>

      <div className="flex flex-col justify-center gap-6 md:col-span-7">
        <div aria-live="polite" className="md:min-h-36">
          <p className="font-semibold tracking-tight text-2xl text-[var(--text)]">{current.name} <span className="font-mono text-base text-[var(--text-muted)]">{current.gLabel}</span></p>
          <p className="measure mt-2 text-[var(--text)] leading-relaxed">{current.caption}</p>
          {stop === 1 && (
            <p className="measure mt-2 text-sm text-[var(--text-muted)]">
              The dashed outline is a placeholder, not a prediction: Earth and orbit do not bound the Moon.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="gravity-stop" className="eyebrow">
            Gravity stop
          </label>
          <input
            id="gravity-stop"
            type="range"
            min={0}
            max={LAST}
            step={1}
            value={stop}
            className="gravity-slider"
            aria-valuetext={`${current.name}, ${current.gLabel}`}
            onChange={(e) => moveTo(Number(e.target.value))}
          />
          <div aria-hidden="true" className="grid grid-cols-3 text-xs text-[var(--text-muted)] pt-1">
            {STOPS.map((s, i) => (
              <span
                key={s.name}
                className={`flex flex-col ${
                  i === 0 ? "items-start" : i === LAST ? "items-end" : "items-center"
                } ${i === stop ? "font-medium text-[var(--text)]" : ""}`}
              >
                <RegimeMark g={s.g} />
                <span className="mt-0.5">{s.gLabel}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="text-xs text-[var(--text-muted)] md:col-span-12 border-t border-[var(--border)] pt-3">
        Illustration of buoyancy, not a simulation.
      </figcaption>
    </figure>
  );
}

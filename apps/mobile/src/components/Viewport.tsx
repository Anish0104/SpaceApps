import { useMemo } from "react";

/**
 * The view through a spacecraft window. These are rendered SVG scenes (not photographs), credited
 * honestly as illustrations, so the whole experience works offline with no large binaries. The
 * scene is set by the crew environment; swapping in attributed NASA photography later is a drop-in.
 */
type Env = "earth" | "station" | "moon" | "mars" | "rover" | "suit";

const SCENE: Record<Env, { sky: [string, string]; body: string; bodyHi: string; label: string }> = {
  earth:   { sky: ["#0a1430", "#050a18"], body: "#2b6fd6", bodyHi: "#8fd0ff", label: "Low Earth orbit" },
  station: { sky: ["#070d1e", "#04060f"], body: "#1a3566", bodyHi: "#5a8bff", label: "Spacecraft cabin" },
  moon:    { sky: ["#05080f", "#02040a"], body: "#b9c0cf", bodyHi: "#eef2f8", label: "Lunar surface" },
  mars:    { sky: ["#140a0a", "#0a0607"], body: "#c2653a", bodyHi: "#f0a36a", label: "Martian surface" },
  rover:   { sky: ["#120a0a", "#080506"], body: "#a85a38", bodyHi: "#e08a52", label: "Pressurized rover" },
  suit:    { sky: ["#060a14", "#03050c"], body: "#23457f", bodyHi: "#94d6ff", label: "EVA / spacesuit" },
};

/** Deterministic star positions so the field is stable across renders. */
function stars(n: number) {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let s = 1337;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < n; i++) out.push({ x: rnd() * 400, y: rnd() * 260, r: rnd() * 1.3 + 0.3, o: rnd() * 0.7 + 0.3 });
  return out;
}

export function Viewport({ environment, height = 260 }: { environment: string; height?: number }) {
  const env = (["earth", "station", "moon", "mars", "rover", "suit"].includes(environment) ? environment : "station") as Env;
  const s = SCENE[env];
  const pts = useMemo(() => stars(70), []);
  const surface = env === "moon" || env === "mars" || env === "rover";

  return (
    <svg viewBox="0 0 400 260" width="100%" height={height} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`View: ${s.label}`} style={{ display: "block" }}>
      <defs>
        <radialGradient id={`sky-${env}`} cx="50%" cy="30%" r="90%">
          <stop offset="0%" stopColor={s.sky[0]} /><stop offset="100%" stopColor={s.sky[1]} />
        </radialGradient>
        <radialGradient id={`body-${env}`} cx="38%" cy="34%" r="75%">
          <stop offset="0%" stopColor={s.bodyHi} /><stop offset="55%" stopColor={s.body} />
          <stop offset="100%" stopColor="#05070e" />
        </radialGradient>
        <linearGradient id={`surf-${env}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={s.body} /><stop offset="100%" stopColor="#05070e" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#sky-${env})`} />
      <g className="drift">
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#cfe3ff" opacity={p.o} />)}
        {pts.slice(0, 20).map((p, i) => <circle key={`b${i}`} cx={(p.x + 220) % 420 - 10} cy={p.y} r={p.r} fill="#cfe3ff" opacity={p.o * 0.7} />)}
      </g>
      {surface ? (
        <>
          <circle cx="300" cy="70" r="26" fill={s.bodyHi} opacity="0.35" />
          <path d="M0 200 Q 120 150 240 195 T 400 185 V 260 H 0 Z" fill={`url(#surf-${env})`} />
          <path d="M0 220 Q 160 185 400 215 V 260 H 0 Z" fill="#05070e" opacity="0.6" />
        </>
      ) : (
        <>
          <circle cx="250" cy="150" r="118" fill={`url(#body-${env})`} />
          <circle cx="250" cy="150" r="118" fill="none" stroke={s.bodyHi} strokeWidth="1" opacity="0.25" />
        </>
      )}
      {/* window inner bevel highlight */}
      <rect x="2" y="2" width="396" height="256" rx="22" fill="none" stroke="rgba(148,214,255,0.12)" strokeWidth="2" />
    </svg>
  );
}

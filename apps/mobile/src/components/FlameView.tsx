import { gravityRegime } from "@flameatlas/engine";

/**
 * An illustrative flame shape. In normal gravity, buoyancy lifts hot gas into a teardrop; in
 * microgravity, with no buoyancy, a flame becomes a near-sphere fed only by diffusion. This SVG
 * morphs between those two shapes with the gravity input, and changes size and colour with oxygen.
 *
 * It is a teaching illustration of flame SHAPE, not a measurement: no spread rate, no flammability
 * verdict, and never a safety claim. The label on the stage says so.
 */
export function FlameView({ gravityG, o2MolPct }: { gravityG: number; o2MolPct: number }) {
  // 0 = microgravity sphere, 1 = full teardrop. Rises with gravity (capped at Earth).
  const t = Math.min(1, Math.max(0, gravityG / 1));
  const regime = gravityRegime(gravityG);

  // sphere radius grows a little with oxygen (illustrative only)
  const o2n = Math.min(1, Math.max(0, (o2MolPct - 15) / 85));
  const r = 44 + o2n * 14;
  const cx = 100, cy = 125;

  // teardrop: tip pulled up by (t), body stays near the sphere. Control points interpolate.
  const tip = cy - r - t * 62;                 // how far the point rises
  const shoulder = cy - r * (0.2 + t * 0.1);
  const bulge = r * (1 + t * 0.12);
  const path = [
    `M ${cx} ${tip}`,
    `C ${cx - bulge * 0.55} ${shoulder}, ${cx - bulge} ${cy + r * 0.2}, ${cx} ${cy + r}`,
    `C ${cx + bulge} ${cy + r * 0.2}, ${cx + bulge * 0.55} ${shoulder}, ${cx} ${tip}`,
    "Z",
  ].join(" ");

  // colour: cooler/bluer in microgravity, warmer with more oxygen
  const outer = regime === "orbit" ? "#2b4ea8" : "#7a4bd0";
  const mid = o2n > 0.5 ? "#8fb2ff" : "#5a8bff";

  return (
    <svg viewBox="0 0 200 220" width="100%" height="100%" aria-label={`Illustrative flame in ${regime} gravity`}>
      <defs>
        <radialGradient id="fl" cx="50%" cy="62%" r="60%">
          <stop offset="0%" stopColor="#eaf2ff" />
          <stop offset="42%" stopColor={mid} />
          <stop offset="100%" stopColor={outer} />
        </radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      {/* wick / sample base */}
      <rect x="96" y={cy + r} width="8" height="26" rx="2" fill="#39445f" />
      {/* glow */}
      <path d={path} fill={mid} opacity="0.35" filter="url(#glow)" className="flicker" />
      {/* flame body */}
      <path d={path} fill="url(#fl)" className="flicker" />
      {/* inner core */}
      <ellipse cx={cx} cy={cy + r * 0.25} rx={r * 0.42} ry={r * (0.42 + t * 0.15)} fill="#eef4ff" opacity="0.85" />
    </svg>
  );
}

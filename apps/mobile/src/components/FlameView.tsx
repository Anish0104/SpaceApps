import { gravityRegime } from "@flameatlas/engine";

/**
 * A qualitative buoyancy illustration of flame SHAPE. In normal gravity, buoyant hot gas rises into a
 * teardrop; in microgravity, with no buoyancy, a flame becomes a near-sphere fed by diffusion. The
 * shape morphs with gravity and shifts colour with oxygen. It is NOT a measurement: no spread rate,
 * no flammability verdict, never a safety claim. The Lab labels it as an illustration.
 */
export function FlameView({ gravityG, o2MolPct, height = 210 }: { gravityG: number; o2MolPct: number; height?: number }) {
  const t = Math.min(1, Math.max(0, gravityG / 1));          // 0 = microgravity sphere, 1 = teardrop
  const regime = gravityRegime(gravityG);
  const o2n = Math.min(1, Math.max(0, (o2MolPct - 15) / 85));
  const r = 44 + o2n * 14;
  const cx = 100, cy = 125;
  const tip = cy - r - t * 62;
  const shoulder = cy - r * (0.2 + t * 0.1);
  const bulge = r * (1 + t * 0.12);
  const path = `M ${cx} ${tip} C ${cx - bulge * 0.55} ${shoulder}, ${cx - bulge} ${cy + r * 0.2}, ${cx} ${cy + r} C ${cx + bulge} ${cy + r * 0.2}, ${cx + bulge * 0.55} ${shoulder}, ${cx} ${tip} Z`;

  // microgravity reads cool/blue (diffusion), normal gravity warm (buoyant); oxygen brightens
  const warm = t > 0.4;
  const outer = warm ? "#8a3f1c" : "#1f3f86";
  const mid = warm ? "#e48a54" : "#5aa0ff";
  const core = o2n > 0.5 ? "#fff4ea" : "#eaf4ff";

  return (
    <svg viewBox="0 0 200 220" width="100%" height={height} aria-label={`Illustrative flame in ${regime} gravity`} style={{ display: "block" }}>
      <defs>
        <radialGradient id="flg" cx="50%" cy="62%" r="60%">
          <stop offset="0%" stopColor={core} /><stop offset="42%" stopColor={mid} /><stop offset="100%" stopColor={outer} />
        </radialGradient>
        <filter id="fglow"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <rect x="96" y={cy + r} width="8" height="26" rx="2" fill="#2a3a55" />
      <path d={path} fill={mid} opacity="0.3" filter="url(#fglow)" className="flicker" />
      <path d={path} fill="url(#flg)" className="flicker" />
      <ellipse cx={cx} cy={cy + r * 0.25} rx={r * 0.42} ry={r * (0.42 + t * 0.15)} fill={core} opacity="0.85" />
    </svg>
  );
}

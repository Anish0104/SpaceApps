import {
  CartesianGrid, Cell, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import { gravityRegime, o2PartialKPa, runPO2, type GravityRegime, type Run, type Scenario } from "@flameatlas/engine";

/** Columns left to right. A gravity regime always has the same colour (see Badge.tsx). */
/** `tick` is the short axis label: all four must fit side by side at phone width. */
const REGIMES: { id: GravityRegime; label: string; tick: string; color: string }[] = [
  { id: "orbit", label: "Orbit (~0 g)", tick: "Orbit", color: "var(--ch-blue)" },
  { id: "moon", label: "Moon (0.165 g)", tick: "Moon", color: "var(--moon)" },
  { id: "mars", label: "Mars (0.38 g)", tick: "Mars", color: "var(--mars)" },
  { id: "earth", label: "Earth (1 g)", tick: "Earth", color: "var(--soot)" },
];
const column = (g: number) => REGIMES.findIndex((r) => r.id === gravityRegime(g));

/** Material is a marker shape, never a colour: colour already means gravity regime. */
const FAMILIES = [
  { id: "sibal", label: "Cotton-fiberglass (SIBAL)", shape: "circle", test: /sibal|cotton-fiberglass/i },
  { id: "pmma", label: "PMMA", shape: "square", test: /pmma/i },
  { id: "other", label: "Other material", shape: "triangle", test: /./ },
] as const;
const familyOf = (material: string | null) => FAMILIES.find((f) => f.test.test(material ?? "")) ?? FAMILIES[2];

interface Point { x: number; y: number; id: string; material: string; o2: number | null; p: number | null; status: Run["status"]; color: string }

const fmt = (n: number, d = 1) => String(Number(n.toFixed(d)));

function PointTip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const pt = active ? payload?.[0]?.payload : undefined;
  if (!pt) return null;
  return (
    <div className="panel px-3 py-2 text-sm">
      <div className="font-semibold">{pt.id}</div>
      <div>{pt.material}</div>
      <div>{pt.o2 === null ? "O2 not documented" : `${fmt(pt.o2)} mol% O2`}{pt.p === null ? "" : ` at ${fmt(pt.p)} kPa`}</div>
      <div>O2 partial pressure {fmt(pt.y)} kPa (computed)</div>
      <div className="text-ink/70">{pt.status === "verified" ? "Verified" : "Imported, not yet cross-checked"}</div>
    </div>
  );
}

/**
 * What has been tested: gravity regime against O2 partial pressure, one mark per curated run.
 * Empty columns are hatched (missing evidence is never a fill colour). The scenario is drawn as
 * a dashed line and ring because its values are assumed inputs, not evidence.
 */
export function EvidenceMap({ runs, scenario }: { runs: Run[]; scenario: Scenario }) {
  const perColumn = new Map<number, number>();
  const points: (Point & { family: string })[] = [];
  const unplaced: string[] = [];
  for (const r of runs) {
    const g = r.gravityG.value, y = runPO2(r);
    if (g === null || y === null) { unplaced.push(r.id); continue; }
    const col = column(g);
    const n = perColumn.get(col) ?? 0;
    perColumn.set(col, n + 1);
    // spread marks sideways inside the column so runs at the same condition stay visible
    const x = col + ((n % 7) - 3) * 0.09;
    points.push({
      x, y, id: r.id, material: r.material.value ?? "Material not documented", o2: r.o2MolPct.value, p: r.pressureKPa.value,
      status: r.status, color: REGIMES[col].color, family: familyOf(r.material.value).id,
    });
  }

  const target = o2PartialKPa(scenario.o2MolPct, scenario.pressureKPa);
  const scenarioCol = column(scenario.gravityG);
  const yMax = Math.ceil(Math.max(target, ...points.map((p) => p.y)) / 5) * 5 + 5;
  const empty = REGIMES.map((_, i) => i).filter((i) => !perColumn.has(i));
  const counts = REGIMES.map((r, i) => `${r.label}: ${perColumn.get(i) ?? 0}`).join("; ");

  return (
    <figure>
      <div role="img" aria-label={`Evidence map. Curated runs per gravity regime: ${counts}. Scenario O2 partial pressure ${fmt(target)} kPa.`} className="h-[360px] w-full">
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
            <defs>
              <pattern id="map-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--regolith)" strokeWidth="1" opacity="0.6" />
              </pattern>
            </defs>
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis type="number" dataKey="x" domain={[-0.5, 3.5]} ticks={[0, 1, 2, 3]} interval={0} tickFormatter={(i: number) => REGIMES[i]?.tick ?? ""}
              tick={{ fill: "var(--ink)", fontSize: 13 }} stroke="var(--regolith)" />
            <YAxis type="number" dataKey="y" domain={[0, yMax]} ticks={Array.from({ length: yMax / 5 + 1 }, (_, i) => i * 5)} tick={{ fill: "var(--ink)", fontSize: 13 }} stroke="var(--regolith)"
              label={{ value: "O2 partial pressure (kPa, computed)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fill: "var(--ink)", fontSize: 13 } }} />
            {empty.map((i) => (
              <ReferenceArea key={i} x1={i - 0.5} x2={i + 0.5} y1={0} y2={yMax} fill="url(#map-hatch)" stroke="none"
                label={{ value: "No run", position: "insideTop", fill: "var(--ink)", fontSize: 13 }} />
            ))}
            <ReferenceLine y={target} stroke="var(--ink)" strokeDasharray="5 4"
              label={{ value: `Scenario ${fmt(target)} kPa`, position: "insideBottomRight", fill: "var(--ink)", fontSize: 13 }} />
            <ReferenceDot x={scenarioCol} y={target} r={9} fill="none" stroke="var(--ink)" strokeDasharray="3 3" strokeWidth={1.5} />
            <Tooltip content={<PointTip />} cursor={false} />
            {FAMILIES.map((f) => {
              const data = points.filter((p) => p.family === f.id);
              return (
                <Scatter key={f.id} name={f.label} data={data} shape={f.shape} isAnimationActive={false} stroke="var(--ink)" strokeWidth={0.75}>
                  {/* fill per point: the regime colour of its column */}
                  {data.map((p) => <Cell key={p.id} fill={p.color} />)}
                </Scatter>
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 space-y-1 text-sm text-ink/70">
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-ink">
          {FAMILIES.map((f) => (
            <li key={f.id} className="flex items-center gap-1.5">
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
                {f.shape === "circle" && <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" />}
                {f.shape === "square" && <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" />}
                {f.shape === "triangle" && <path d="M6 1 L11 11 L1 11 Z" fill="none" stroke="currentColor" />}
              </svg>
              {f.label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeDasharray="3 3" /></svg>
            Scenario (assumed)
          </li>
        </ul>
        <p>
          Each mark is one curated run, coloured by gravity regime ({REGIMES.map((r) => r.label).join(", ")}). The dashed line and ring are the
          scenario, from assumed inputs. Hatched columns have no curated run: no sustained, spacecraft-based
          lunar-gravity flame-spread data is in PSI. Earth and orbit are reference points, not bounds for the Moon or Mars.
        </p>
        {unplaced.length > 0 && <p>Not placed (gravity or oxygen not documented): {unplaced.join(", ")}.</p>}
      </figcaption>
    </figure>
  );
}

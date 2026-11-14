import { gravityRegime, o2PartialKPa, kPaToPsi, O2_PARTIAL_FORMULA } from "@flameatlas/engine";
import { dataset } from "../lib/data";
import { useScenario } from "../lib/scenario";
import { EvidenceBadge } from "../components/Badge";

type Light = "green" | "yellow" | "red";
const LIGHT: Record<Light, string> = { green: "bg-match", yellow: "bg-assumed", red: "bg-gap" };

/** Evidence coverage per condition (NOT a safety rating). Juvana: replace with the engine's engineer readout. */
function coverageFor(field: "o2MolPct" | "pressureKPa" | "gravityG", target: number, tol: number): { light: Light; note: string } {
  const verified = dataset.runs.filter((r) => r.status === "verified" && r[field].value !== null);
  const any = dataset.runs.filter((r) => r[field].value !== null);
  const near = (rs: typeof any) => rs.find((r) => Math.abs((r[field].value as number) - target) <= tol);
  const v = near(verified);
  if (v) return { light: "green", note: `verified run ${v.id}` };
  const a = near(any);
  if (a) return { light: "yellow", note: `imported, unverified run ${a.id}` };
  return { light: "red", note: "not in our curated data" };
}

export default function MissionLab() {
  const { scenario: s } = useScenario();
  const po2 = o2PartialKPa(s.o2MolPct, s.pressureKPa);
  const rows: { label: string; value: string; light: Light; note: string }[] = [
    { label: "O₂ fraction", value: `${s.o2MolPct} mol%`, ...coverageFor("o2MolPct", s.o2MolPct, 2) },
    { label: "Pressure", value: `${s.pressureKPa} kPa (${kPaToPsi(s.pressureKPa).toFixed(1)} psi)`, ...coverageFor("pressureKPa", s.pressureKPa, 5) },
    { label: "Gravity", value: `${s.gravityG} g (${gravityRegime(s.gravityG)})`, ...coverageFor("gravityG", s.gravityG, 0.02) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Mission Lab</h1>
      <div className="rounded border border-line bg-white p-4 text-sm">
        <div className="flex items-center gap-2"><b>{s.name}</b> <EvidenceBadge type="ASSUMED" /></div>
        <p className="text-xs text-ink/60">Source: {s.source}{s.note ? ` · ${s.note}` : ""}</p>
        <p className="mt-2">O₂ partial pressure: <span className="font-mono">{po2.toFixed(1)} kPa</span> <EvidenceBadge type="COMPUTED" />
          <span className="ml-2 text-xs text-ink/60">{O2_PARTIAL_FORMULA}</span></p>
      </div>

      <div className="rounded border border-line bg-white">
        <div className="border-b border-line p-3 text-sm font-semibold">Evidence coverage, not a safety rating</div>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 border-b border-line p-3 text-sm last:border-0">
            <span className={`h-3 w-3 rounded-full ${LIGHT[r.light]}`} />
            <span className="w-28 font-semibold">{r.label}</span>
            <span className="w-56 font-mono">{r.value}</span>
            <span className="text-ink/70">{r.note}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink/60">Green = verified run within tolerance · Yellow = unverified or analog only · Red = not in our curated data.</p>
      {/* TODO(Juvana): evidence map (gravity × O₂ partial pressure, Recharts scatter), nearest tested condition by mole fraction vs partial pressure */}
    </div>
  );
}

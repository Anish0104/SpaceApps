import { O2_PARTIAL_FORMULA, kPaToPsi, o2PartialKPa, type Scenario } from "@flameatlas/engine";
import { sceneFor } from "../lib/scenes";
import { PhotoCredit, SceneBackdrop } from "./SceneBackdrop";

const fmt = (x: number, digits = 1) => String(Number(x.toFixed(digits)));

/** One input: label above, value in a dashed (assumed) or solid (computed) box. */
function Stat({ label, value, sub, computed = false, title }: { label: string; value: string; sub?: string; computed?: boolean; title: string }) {
  return (
    <div className="strip-stat" title={title}>
      <dt className="text-[11px] text-white/60">{label}</dt>
      {/* The value never breaks; on a narrow tile its unit conversion moves to the next line. */}
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className={`strip-value whitespace-nowrap ${computed ? "is-computed" : ""}`}>{value}</span>
        {sub && <span className="text-[11px] text-white/50">{sub}</span>}
      </dd>
    </div>
  );
}

/**
 * The active crew environment: name, its four inputs, and where they come from, over the environment's
 * NASA scene photo. Inputs are assumed (dashed), the O2 partial pressure is computed (solid). Never evidence.
 */
export function ScenarioStrip({ scenario }: { scenario: Scenario }) {
  const scene = sceneFor(scenario);
  const p = scenario.pressureKPa;
  const assumed = "Assumed scenario input, not evidence";

  return (
    <section aria-label="Active scenario context" className="relative isolate overflow-hidden rounded-2xl border border-[var(--border)] text-white shadow-[var(--shadow)]">
      <SceneBackdrop scene={scene} variant="compact" />

      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: scene.heroAccent }} />
          <h2 key={scenario.id} className="route-enter text-xl leading-tight text-white sm:text-2xl">
            {scenario.name}
          </h2>
          <span className="rounded-full border border-dashed border-white/40 px-2.5 py-0.5 text-[11px] text-white/80">Assumed inputs</span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Oxygen" value={`${fmt(scenario.o2MolPct)} mol%`} title={assumed} />
          <Stat label="Pressure" value={`${fmt(p, 2)} kPa`} sub={`${fmt(kPaToPsi(p))} psi`} title={assumed} />
          <Stat label="O₂ partial pressure" value={`${fmt(o2PartialKPa(scenario.o2MolPct, p))} kPa`} computed title={`Computed: ${O2_PARTIAL_FORMULA}`} />
          <Stat label="Gravity" value={`${fmt(scenario.gravityG, 3)} g`} title={assumed} />
        </dl>

        <div className="mt-4 flex flex-col gap-1.5 text-[11px] text-white/55 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="min-w-0 truncate" title={`Source: ${scenario.source}`}>
            Source: {scenario.source}
          </p>
          <PhotoCredit scene={scene} className="shrink-0 text-white/45" />
        </div>
      </div>
    </section>
  );
}

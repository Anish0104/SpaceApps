import type { ReactNode } from "react";
import { O2_PARTIAL_FORMULA, kPaToPsi, o2PartialKPa, type Scenario } from "@flameatlas/engine";
import { sceneFor } from "../lib/scenes";
import { PhotoCredit, SceneBackdrop } from "./SceneBackdrop";

const fmt = (x: number, digits = 1) => String(Number(x.toFixed(digits)));

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-normal text-[rgba(255,255,255,0.65)]">{label}</dt>
      <dd className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-mono text-white">{children}</dd>
    </div>
  );
}

/**
 * Scene strip: 200 px tall, across the top of the Ask page, showing the active scenario's scene image
 * with a dark overlay and the scenario name + parameters.
 */
export function ScenarioStrip({ scenario }: { scenario: Scenario }) {
  const scene = sceneFor(scenario);
  const p = scenario.pressureKPa;

  return (
    <section
      aria-label="Active scenario context"
      className="relative isolate min-h-[200px] overflow-hidden rounded-2xl border border-[var(--border)] text-white shadow-[var(--shadow)]"
    >
      {/* Background scene */}
      <SceneBackdrop scene={scene} variant="compact" />

      {/* Content overlay */}
      <div className="relative z-10 flex min-h-[200px] flex-col justify-between p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: scene.heroAccent }}
              aria-hidden="true"
            />
            <h2 key={scenario.id} className="route-enter text-xl text-white sm:text-2xl">
              {scenario.name}
            </h2>
            <span className="rounded-[4px] border border-[rgba(255,255,255,0.3)] bg-[rgba(0,0,0,0.4)] px-2 py-0.5 text-xs text-[rgba(255,255,255,0.85)]">
              Assumed context
            </span>
          </div>

          <span className="text-xs italic text-[rgba(255,255,255,0.65)]">
            Inputs, not evidence
          </span>
        </div>

        {/* Parameters */}
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Item label="Oxygen">
            <span className="rounded-[4px] border border-dashed border-[rgba(255,255,255,0.5)] px-1.5 py-0.5">
              {fmt(scenario.o2MolPct)} mol%
            </span>
          </Item>
          <Item label="Pressure">
            <span className="rounded-[4px] border border-dashed border-[rgba(255,255,255,0.5)] px-1.5 py-0.5">
              {fmt(p, 2)} kPa
            </span>
            <span className="text-xs text-[rgba(255,255,255,0.65)]">
              {fmt(kPaToPsi(p))} psi
            </span>
          </Item>
          <Item label="O2 partial pressure">
            <span
              className="rounded-[4px] border border-solid border-white bg-[rgba(255,255,255,0.15)] px-1.5 py-0.5"
              title={`Computed: ${O2_PARTIAL_FORMULA}`}
            >
              {fmt(o2PartialKPa(scenario.o2MolPct, p))} kPa
            </span>
          </Item>
          <Item label="Gravity">
            <span className="rounded-[4px] border border-dashed border-[rgba(255,255,255,0.5)] px-1.5 py-0.5">
              {fmt(scenario.gravityG, 3)} g
            </span>
          </Item>
        </dl>

        <div className="mt-4 flex flex-col gap-2 text-xs text-white/60 sm:flex-row sm:items-end sm:justify-between">
          <p className="measure">
            Source: {scenario.source}. Dashed border: assumed input. Solid border: computed ({O2_PARTIAL_FORMULA}).
          </p>
          <PhotoCredit scene={scene} className="shrink-0 text-white/50" />
        </div>
      </div>
    </section>
  );
}

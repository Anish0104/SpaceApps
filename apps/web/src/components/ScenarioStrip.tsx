import type { ReactNode } from "react";
import { O2_PARTIAL_FORMULA, kPaToPsi, o2PartialKPa, type Scenario } from "@flameatlas/engine";
import { EvidenceBadge, RegimeMark } from "./Badge";

const fmt = (x: number, digits = 1) => String(Number(x.toFixed(digits)));

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink/70">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">{children}</dd>
    </div>
  );
}

/**
 * The scenario a page or an answer is working against. Its values are ASSUMED inputs (dashed
 * outline), never evidence; the O2 partial pressure is COMPUTED from them (solid outline, with
 * its formula).
 */
export function ScenarioStrip({ scenario }: { scenario: Scenario }) {
  const p = scenario.pressureKPa;
  return (
    <section aria-label="Scenario" className="panel px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-semibold">{scenario.name}</h2>
        <EvidenceBadge type="ASSUMED" />
        <span className="text-sm text-ink/70">Scenario inputs, not evidence.</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        <Item label="Oxygen"><span className="value value-assumed">{fmt(scenario.o2MolPct)} mol%</span></Item>
        <Item label="Pressure">
          <span className="value value-assumed">{fmt(p, 2)} kPa</span>
          <span className="text-sm text-ink/70">{fmt(kPaToPsi(p))} psi</span>
        </Item>
        <Item label="O2 partial pressure">
          <span className="value value-computed" title={`Computed: ${O2_PARTIAL_FORMULA}`}>{fmt(o2PartialKPa(scenario.o2MolPct, p))} kPa</span>
        </Item>
        <Item label="Gravity">
          <span className="value value-assumed">{fmt(scenario.gravityG, 3)} g</span>
          <span className="text-sm"><RegimeMark g={scenario.gravityG} /></span>
        </Item>
      </dl>
      <p className="mt-3 text-sm text-ink/70">
        Source: {scenario.source}.{scenario.note ? ` ${scenario.note}.` : ""} Solid outline is computed: {O2_PARTIAL_FORMULA}.
      </p>
    </section>
  );
}

import { Tag } from "../components/Badge";

const FIELDS = [
  "Research question",
  "Hypothesis / alternative",
  "Variable changed",
  "Held fixed",
  "Measure",
  "Motivating NASA runs",
  "Skeptic's objection",
] as const;

/**
 * The Missing Experiment. Juvana: wire /api/design + /api/skeptic and the engine's planner scoring.
 * The card shape below is the target UI.
 */
export default function MissingExperiment() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl sm:text-3xl">The missing experiment</h1>
        <p className="measure mt-2">The experiment that would close the biggest evidence gap for the chosen crew environment.</p>
      </div>
      <section className="panel p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <Tag>AI-proposed</Tag>
          <Tag>Rules-verified</Tag>
          <Tag>Robust</Tag>
        </div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-y-2">
          {FIELDS.map((f) => (
            <div key={f} className="sm:contents">
              <dt className="font-semibold">{f}</dt>
              <dd className="text-ink/70">…</dd>
            </div>
          ))}
          <div className="sm:contents">
            <dt className="font-semibold">FM2 comparison</dt>
            <dd>lines up with / differs from FM2's test design</dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-rule pt-3 text-sm text-ink/70">Illustrative research proposal, not an approved NASA protocol.</p>
      </section>
    </div>
  );
}

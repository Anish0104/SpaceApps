/**
 * The Missing Experiment. Juvana: wire /api/design + /api/skeptic and the engine's planner scoring.
 * The card shape below is the target UI.
 */
export default function MissingExperiment() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">The Missing Experiment</h1>
      <div className="rounded border border-line bg-white p-4 text-sm">
        <div className="mb-2 flex gap-2 font-mono text-[10px]">
          <span className="rounded bg-computed/10 px-1.5 py-0.5 text-computed">AI-proposed</span>
          <span className="rounded bg-measured/10 px-1.5 py-0.5 text-measured">rules-verified</span>
          <span className="rounded bg-match/10 px-1.5 py-0.5 text-match">robust</span>
        </div>
        <dl className="grid grid-cols-[10rem_1fr] gap-y-1">
          <dt className="font-semibold">Research question</dt><dd>…</dd>
          <dt className="font-semibold">Hypothesis / alternative</dt><dd>…</dd>
          <dt className="font-semibold">Variable changed</dt><dd>…</dd>
          <dt className="font-semibold">Held fixed</dt><dd>…</dd>
          <dt className="font-semibold">Measure</dt><dd>…</dd>
          <dt className="font-semibold">Motivating NASA runs</dt><dd>…</dd>
          <dt className="font-semibold">Skeptic's objection</dt><dd>…</dd>
          <dt className="font-semibold">FM2 comparison</dt><dd>lines up with / differs from FM2's test design</dd>
        </dl>
        <p className="mt-3 text-xs text-ink/60">Illustrative research proposal, not an approved NASA protocol.</p>
      </div>
    </div>
  );
}

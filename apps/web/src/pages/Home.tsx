import { Link } from "react-router-dom";
import { coverage, dataset } from "../lib/data";

function Panel({ title, g, children, empty = false }: { title: string; g: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className={`flex h-56 flex-col items-center justify-between rounded-lg border p-4 ${empty ? "border-dashed border-gap bg-white" : "border-line bg-white"}`}>
      <div className="font-display text-sm">{title}</div>
      <div className="flex flex-1 items-center justify-center">{children}</div>
      <div className="font-mono text-xs text-ink/60">{g}</div>
    </div>
  );
}

export default function Home() {
  const counters = [
    ["Investigations indexed", coverage.investigations],
    ["Runs imported", coverage.runsImported],
    ["Runs verified", coverage.runsVerified],
    ["Relationships mapped", coverage.relationships],
    ["Documents linked", coverage.documents],
  ] as const;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold leading-tight">Would Earth testing tell us enough about a fire on the Moon?</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Earth" g="1 g">
          <div className="h-24 w-10 rounded-[50%_50%_45%_45%/70%_70%_30%_30%] bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-200" />
        </Panel>
        <Panel title="Moon" g="0.165 g · long-duration data: none yet" empty>
          <span className="font-display text-6xl text-gap/40">?</span>
        </Panel>
        <Panel title="Orbit" g="~0 g">
          <div className="h-12 w-12 rounded-full bg-blue-500/40 shadow-[0_0_24px_rgba(59,130,246,0.6)]" />
        </Panel>
      </div>
      <p className="text-xs text-ink/60">Illustration of buoyancy, not a simulation. FM2 is targeting launch in late 2026.</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {counters.map(([label, n]) => (
          <div key={label} className="rounded border border-line bg-white p-3">
            <div className="font-mono text-2xl font-semibold">{n}</div>
            <div className="text-xs text-ink/60">{label}</div>
          </div>
        ))}
      </div>
      {dataset.fixture && <p className="text-xs text-gap">Showing FIXTURE data (fake values for development).</p>}

      <div className="flex flex-wrap gap-3">
        <Link to="/mission-lab" className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white">Designing something?</Link>
        <Link to="/missing-experiment" className="rounded border border-ink px-4 py-2 text-sm font-semibold">Researching a gap?</Link>
      </div>
    </div>
  );
}

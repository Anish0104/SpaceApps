import { Link } from "react-router-dom";
import { coverage, dataset } from "../lib/data";
import { FlameInstrument } from "../components/FlameInstrument";

export default function Home() {
  const counters = [
    ["Investigations indexed", coverage.investigations],
    ["Runs imported", coverage.runsImported],
    ["Runs verified", coverage.runsVerified],
    ["Relationships mapped", coverage.relationships],
    ["Documents linked", coverage.documents],
  ] as const;

  return (
    <div className="space-y-10 sm:space-y-12">
      <div className="grid grid-cols-12">
        <h1 className="display col-span-12 text-2xl sm:text-3xl lg:col-span-10 lg:text-4xl">
          Would Earth testing tell us enough about a fire on the Moon?
        </h1>
      </div>

      <FlameInstrument />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-12">
        {counters.map(([label, n]) => (
          <div key={label} className="flex flex-col-reverse">
            <dt className="text-sm text-ink/70">{label}</dt>
            <dd className="text-xl font-semibold">{n}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link to="/mission-lab" className="btn btn-primary">Check a habitat design</Link>
        <Link to="/missing-experiment" className="btn btn-secondary">Find the next experiment</Link>
      </div>

      {dataset.fixture && (
        <p className="measure text-sm text-ink/70">
          Showing fixture data: fake values for development, not NASA data. The counts above describe the fixture set.
        </p>
      )}
    </div>
  );
}

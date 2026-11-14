import { Link } from "react-router-dom";
import { coverage, dataset, earthApplications, invById } from "../lib/data";
import { FlameInstrument } from "../components/FlameInstrument";
import { investigationLabel } from "../lib/labels";

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

      {earthApplications.length > 0 && (
        <section aria-labelledby="space-to-earth" className="panel p-4 sm:p-6">
          <h2 id="space-to-earth" className="display text-xl">From space to Earth</h2>
          <p className="measure mt-1 text-sm text-ink/70">NASA fire research for spacecraft that led to technology used on Earth. Each item links to its source.</p>
          <ul className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2">
            {earthApplications.map((a) => {
              const related = a.relatedPsiIds.map((id) => invById(id)).filter((inv) => inv !== undefined);
              return (
                <li key={a.id} className="min-w-0 border-t border-rule pt-3">
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="mt-1 text-sm"><span className="text-ink/70">In space: </span>{a.space}</p>
                  <p className="mt-1 text-sm"><span className="text-ink/70">On Earth: </span>{a.earth}</p>
                  <p className="mt-2 text-sm">
                    <span className="text-ink/70">Source: </span>
                    <a href={a.url} target="_blank" rel="noreferrer" className="link break-words underline">{a.source}</a>
                  </p>
                  {related.length > 0 && (
                    <p className="mt-1 text-sm">
                      <span className="text-ink/70">Related: </span>
                      {related.map((inv, i) => (
                        <span key={inv.psiId}>{i > 0 && ", "}<Link to={`/investigation/${inv.psiId}`} title={inv.name} className="link underline">{investigationLabel(inv)} ({inv.psiId})</Link></span>
                      ))}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {dataset.fixture && (
        <p className="measure text-sm text-ink/70">
          Showing fixture data: fake values for development, not NASA data. The counts above describe the fixture set.
        </p>
      )}
    </div>
  );
}

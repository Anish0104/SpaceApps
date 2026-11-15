import { coverage, dataset, releaseCoverage } from "../lib/data";

/** The product claims FlameAtlas holds itself to (keep in sync with CLAUDE.md "Product claims"). */
const LIMITS = [
  ["Not a safety rating", "FlameAtlas never says a material is safe or unsafe. Lights and verdicts rate evidence coverage and strength."],
  ["No bounds from endpoints", "Earth (1 g) and orbit (~0 g) are reference points, not limits for the Moon or Mars; lunar gravity may be more flammable than either."],
  ["No transfer without evidence", "No cross-material or cross-apparatus transfer: burner gas is not a cabin atmosphere, and liquid droplets are not solid fabric."],
  ["Gaps are dataset gaps", "\"Not in our curated data\", never \"nobody has studied it\"."],
  ["Proposals are illustrative", "Not approved NASA protocols. They line up with, or differ from, FM2's design; they never predict it."],
  ["No invented numbers", "Missing values stay missing, with a reason. Pixels are never a spread rate without calibration."],
  ["Plain claims about AI", "SI-powered, with AI agents. No superintelligence claim."],
] as const;

const VERDICTS = [
  ["Can isolate", "The target condition changes between the two runs while every other documented condition matches within tolerance.", "light-green"],
  ["Cannot isolate", "Another condition (for example flow speed or oxygen fraction) also changed, so the difference cannot be put on the target alone.", "light-yellow"],
  ["Can't confirm", "A compared run has an undocumented value for a tracked condition, so a hidden confound cannot be ruled out.", "light-red"],
] as const;

export default function Limits() {
  const counts = releaseCoverage ?? coverage;
  return (
    <div className="space-y-14">
      <header>
        <h1 className="page-title">What FlameAtlas does not claim</h1>
        <p className="page-lede">
          The boundaries of what the curated data supports. Everything shown in the app links to its NASA source; when a value is not
          in a source, it is marked "not documented".
        </p>
      </header>

      <section aria-labelledby="claims-heading" className="space-y-5">
        <h2 id="claims-heading" className="section-title">
          The rules we hold to
        </h2>
        <ol className="grid gap-4 md:grid-cols-2">
          {LIMITS.map(([title, body], i) => (
            <li key={title} className="panel flex gap-4 p-5">
              <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="font-medium text-[var(--text)]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="index-heading" className="space-y-5">
        <h2 id="index-heading" className="section-title">
          What is indexed
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Investigations", counts.investigations],
            ["Runs imported", counts.runsImported],
            ["Runs verified", counts.runsVerified],
            ["Source documents", coverage.documents],
          ].map(([label, n]) => (
            <div key={label} className="panel p-5">
              <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
              <dd className="mt-1 font-semibold tracking-tight text-4xl text-[var(--text)]">{n}</dd>
            </div>
          ))}
        </dl>
        <p className="measure text-sm text-[var(--text-muted)]">
          Data version <span className="font-mono text-[var(--text)]">{dataset.version}</span>, drawn from NASA Physical Sciences
          Informatics (PSI) and NASA reports on the Technical Reports Server (NTRS). A run is "verified" only after a second person
          checks it against the source; the person who collects a value never verifies it.
        </p>
      </section>

      <section aria-labelledby="referee-heading" className="space-y-5">
        <h2 id="referee-heading" className="section-title">
          How the Referee decides
        </h2>
        <p className="measure text-[var(--text-muted)]">
          To credit a difference in flame behaviour to one condition, such as gravity, everything else has to match. The Referee checks
          every tracked condition of two runs:
        </p>
        <ul className="grid gap-4 md:grid-cols-3">
          {VERDICTS.map(([title, body, light]) => (
            <li key={title} className="panel p-5">
              <p className="flex items-center gap-2.5 font-medium text-[var(--text)]">
                <span aria-hidden="true" className={`light ${light}`} />
                {title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--text-muted)]">These verdicts rate whether a comparison is fair. They are not safety ratings.</p>
      </section>

      <p className="border-t border-[var(--border)] pt-6 text-xs text-[var(--text-muted)]">
        FlameAtlas is an independent tool built for the NASA Space Apps Challenge 2026. It is not endorsed by NASA and is not a
        flight-certification system.
      </p>
    </div>
  );
}

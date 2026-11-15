import { useMemo, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { rankInvestigations } from "@flameatlas/engine";
import { coverage, dataset, earthApplications, invById, isPsiRecord, releaseCoverage, runsFor } from "../lib/data";
import { FlameInstrument } from "../components/FlameInstrument";
import { investigationLabel } from "../lib/labels";
import { useScenario } from "../lib/scenario";
import { SpacecraftWindow } from "../components/SpacecraftWindow";
import { evidenceSegments } from "../components/CoveragePreview";
import { IconArrowRight, IconAsk, IconAtlas, IconExperiment, IconLab, IconLimits, IconReferee } from "../components/Icons";

const TOOLS: { to: string; title: string; body: string; icon: ComponentType<{ size?: number }> }[] = [
  { to: "/ask", title: "Ask the archive", body: "Plain-language questions, answered from NASA records. Every sentence carries its receipts, and every number is checked.", icon: IconAsk },
  { to: "/atlas", title: "Research atlas", body: "The PSI combustion investigations, ranked by how closely they match your crew environment.", icon: IconAtlas },
  { to: "/mission-lab", title: "Mission lab", body: "Condition by condition, what the evidence supports for this environment, with the nearest tested runs.", icon: IconLab },
  { to: "/referee", title: "Referee", body: "Can a difference between two runs be put on one variable, or did something else change too?", icon: IconReferee },
  { to: "/missing-experiment", title: "Missing experiment", body: "The run that would close the biggest gap, proposed by rules and checked against the data. Illustrative only.", icon: IconExperiment },
  { to: "/limits", title: "Limits", body: "What FlameAtlas never claims: no safety ratings, no bounds from Earth and orbit, no invented numbers.", icon: IconLimits },
];

const STEPS = [
  ["Pick a crew environment", "Spacecraft cabin, Moon base, FM2 habitat, rover, Mars habitat or spacesuit, each with its own oxygen, pressure and gravity."],
  ["See what NASA tested", "Every value traces to its NASA source and page, marked measured, computed, assumed or not documented."],
  ["Find where the evidence ends", "Gaps stay visible as gaps, and the missing experiment shows what would close them."],
] as const;

export default function Home() {
  const { scenario } = useScenario();
  const counts = releaseCoverage ?? coverage;
  const psiCount = dataset.investigations.filter(isPsiRecord).length;

  const segments = useMemo(() => {
    const ranked = rankInvestigations(
      dataset.investigations.map((inv) => ({ investigation: inv, runs: runsFor(inv.psiId), questionScore: 0 })),
      scenario,
    );
    return evidenceSegments(scenario, ranked);
  }, [scenario]);

  return (
    <div>
      {/* Hero: the environment's NASA photo in a glowing frame, over a faint starfield */}
      <section aria-labelledby="hero-title" className="landing-hero relative isolate -mt-16 pt-16">
        <div aria-hidden="true" className="landing-stars" />
        <div className="content-container relative z-10 pb-8 pt-6 sm:pt-8">
          {/* A spacecraft viewport; the view changes on its own, in flight order. Wider than the text column. */}
          <div className="ship-stage">
          <SpacecraftWindow>
            {(frame) => (
              <div className="ship-content flex flex-col items-center justify-center px-[8%] pb-24 pt-20 text-center text-white max-sm:px-6">
                <p className="landing-pill-dark route-enter" key={frame.key}>
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: frame.accent }} />
                  <span className="truncate">Now passing: {frame.stage}</span>
                </p>
                <h1 id="hero-title" className="landing-title route-enter mt-6" style={{ animationDelay: "60ms" }}>
                  <span className="block">How does fire</span>
                  <span className="landing-title-accent block" style={{ ["--hero-accent" as string]: frame.accent }}>
                    behave in space?
                  </span>
                </h1>
                <p className="landing-tagline route-enter mt-6" style={{ animationDelay: "120ms" }}>
                  Explore NASA combustion experiments. See where the evidence ends.
                </p>
                <div className="route-enter mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row" style={{ animationDelay: "180ms" }}>
                  <Link to="/dashboard" className="landing-btn landing-btn-primary">
                    Open the dashboard <IconArrowRight size={16} />
                  </Link>
                  <Link to="/ask" className="landing-btn landing-btn-glass">
                    Ask a question
                  </Link>
                </div>
              </div>
            )}
          </SpacecraftWindow>
          </div>

          <a href="#live" className="landing-cue">
            <svg aria-hidden="true" width="14" height="20" viewBox="0 0 14 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="12" height="18" rx="6" />
              <path className="landing-cue-dot" d="M7 5v3" strokeLinecap="round" />
            </svg>
            Scroll to explore
          </a>
        </div>
      </section>

      <div className="content-container space-y-24 py-20 sm:space-y-32 sm:py-28">
        {/* Live from the dataset: counts and a preview of the dashboard's coverage view */}
        <section id="live" aria-labelledby="live-heading" className="scroll-mt-20 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div>
            <h2 id="live-heading" className="section-title">Live from the dataset</h2>
            <p className="mt-2 max-w-[52ch] text-[var(--text-muted)]">
              FlameAtlas ranks NASA's combustion experiments for your crew environment, shows which results can fairly be compared, and
              marks exactly where the evidence ends. Every number links to its NASA source.
            </p>
            <dl className="mt-8 grid max-w-xl grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
              {[
                [psiCount, "PSI investigations"],
                [counts.runsImported, "curated runs"],
                [counts.runsVerified, "runs verified"],
                [coverage.documents, "NASA sources"],
              ].map(([n, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="block text-3xl font-semibold tracking-tight text-[var(--text)]">{n}</span>
                    <span className="text-xs text-[var(--text-muted)]">{label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <aside aria-label={`Evidence preview for ${scenario.name}`} className="landing-preview panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
              <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span aria-hidden="true" className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
                </span>
                Dashboard preview
              </span>
              <span className="chip chip-dashed">Assumed inputs</span>
            </div>
            <div className="p-5">
              <p className="text-xs text-[var(--text-muted)]">Crew environment</p>
              <p key={scenario.id} className="route-enter text-lg font-semibold leading-snug tracking-tight text-[var(--text)]">
                {scenario.name}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                {scenario.gravityG} g · {scenario.o2MolPct}% O₂ · {scenario.pressureKPa} kPa
              </p>
              <p className="mt-5 text-xs font-medium text-[var(--text)]">Where the evidence ends</p>
              <ul className="mt-2 space-y-2.5">
                {segments.map((sg) => {
                  const unknown = sg.count === 0;
                  return (
                    <li key={sg.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                      <span className="truncate text-xs text-[var(--text-muted)]">{sg.label}</span>
                      <span className="font-mono text-[11px] text-[var(--text)]">{unknown ? "Unknown" : `${sg.count}/${counts.investigations}`}</span>
                      <span className={`col-span-2 block h-1.5 overflow-hidden rounded-full ${unknown ? "hatch border border-dashed border-[var(--border-strong)]" : "bg-[var(--surface-2)]"}`}>
                        {!unknown && (
                          <span className="block h-full rounded-full bg-[var(--accent)] transition-[width] duration-700" style={{ width: `${(sg.count / Math.max(1, counts.investigations)) * 100}%` }} />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Link to="/dashboard" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text)] hover:underline">
                Open in the dashboard <IconArrowRight size={14} />
              </Link>
            </div>
          </aside>
        </section>

        {/* What's inside */}
        <section id="inside" aria-labelledby="inside-heading" className="scroll-mt-20 space-y-8">
          <div className="max-w-2xl">
            <h2 id="inside-heading" className="section-title">What's inside the dashboard</h2>
            <p className="mt-2 text-[var(--text-muted)]">Six tools over one curated, sourced dataset. Pick an environment once; every tool follows it.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map(({ to, title, body, icon: Icon }) => (
              <Link key={to} to={to} className="panel panel-hover group flex flex-col p-6">
                <span className="landing-tool-icon">
                  <Icon size={20} />
                </span>
                <span className="mt-4 text-lg font-semibold tracking-tight text-[var(--text)]">{title}</span>
                <span className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">{body}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--text-muted)] transition-colors group-hover:text-[var(--text)]">
                  Open <IconArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-heading" className="scroll-mt-20 space-y-8">
          <h2 id="how-heading" className="section-title">How it works</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="panel p-6">
                <span className="landing-step">{i + 1}</span>
                <h3 className="mt-4 font-semibold text-[var(--text)]">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* The science */}
        <section id="flame" aria-labelledby="flame-heading" className="scroll-mt-20 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="flame-heading" className="section-title">See the flame change</h2>
            <span className="text-xs italic text-[var(--text-muted)]">Illustrative, not a simulation</span>
          </div>
          <FlameInstrument />
        </section>

        {earthApplications.length > 0 && (
          <section aria-labelledby="earth-apps-heading" className="space-y-6">
            <div>
              <h2 id="earth-apps-heading" className="section-title">From space to Earth</h2>
              <p className="measure mt-2 text-[var(--text-muted)]">
                NASA fire research for spacecraft that led to technology used on Earth. Each item links to its source.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {earthApplications.map((a) => {
                const related = a.relatedPsiIds.map((id) => invById(id)).filter((inv) => inv !== undefined);
                return (
                  <article key={a.id} className="panel panel-hover flex flex-col justify-between p-6">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-[var(--text)]">{a.title}</h3>
                      <dl className="mt-4 space-y-3 text-sm leading-relaxed">
                        <div>
                          <dt className="eyebrow">In space</dt>
                          <dd className="mt-1 text-[var(--text)]">{a.space}</dd>
                        </div>
                        <div>
                          <dt className="eyebrow">On Earth</dt>
                          <dd className="mt-1 text-[var(--text)]">{a.earth}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="mt-5 space-y-1 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
                      <p>
                        Source:{" "}
                        <a href={a.url} target="_blank" rel="noreferrer" className="link">
                          {a.source}
                        </a>
                      </p>
                      {related.length > 0 && (
                        <p>
                          Related:{" "}
                          {related.map((inv, i) => (
                            <span key={inv.psiId}>
                              {i > 0 && ", "}
                              <Link to={`/investigation/${inv.psiId}`} title={inv.name} className="link">
                                {investigationLabel(inv)} ({inv.psiId})
                              </Link>
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Closing call to action */}
        <section aria-labelledby="cta-heading" className="landing-cta panel relative overflow-hidden px-6 py-12 text-center sm:px-12">
          <h2 id="cta-heading" className="section-title">Ready to look at the evidence?</h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-[var(--text-muted)]">
            Open the dashboard for {scenario.name}, or switch environments at any time from the top bar.
          </p>
          <Link to="/dashboard" className="btn btn-primary mt-7 h-12 px-6">
            Open the dashboard <IconArrowRight size={16} />
          </Link>
        </section>

        {dataset.fixture && (
          <p className="measure text-xs text-[var(--text-muted)]">Showing fixture data: fake values for development, not NASA data.</p>
        )}
      </div>
    </div>
  );
}

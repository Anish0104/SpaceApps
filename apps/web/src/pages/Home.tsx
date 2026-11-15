import { Link } from "react-router-dom";
import { O2_PARTIAL_FORMULA, kPaToPsi, o2PartialKPa } from "@flameatlas/engine";
import { dataset, earthApplications, invById, isPsiRecord } from "../lib/data";
import { FlameInstrument } from "../components/FlameInstrument";
import { investigationLabel } from "../lib/labels";
import { useScenario } from "../lib/scenario";
import { sceneFor } from "../lib/scenes";
import { PhotoCredit, SceneBackdrop } from "../components/SceneBackdrop";
import { EnvironmentSelector } from "../components/EnvironmentSelector";
import { CoveragePreview } from "../components/CoveragePreview";

const fmt = (x: number, digits = 1) => String(Number(x.toFixed(digits)));

export default function Home() {
  const { scenario } = useScenario();
  const scene = sceneFor(scenario);
  const pO2 = o2PartialKPa(scenario.o2MolPct, scenario.pressureKPa);

  return (
    <div>
      <section
        aria-labelledby="hero-title"
        className="relative isolate -mt-16 flex min-h-[640px] flex-col overflow-hidden pt-16 text-white sm:h-[min(92vh,900px)]"
      >
        <SceneBackdrop scene={scene} drift />

        <div className="content-container relative z-10 grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="route-enter">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
              <span className="h-px w-6" style={{ background: scene.heroAccent }} />
              {dataset.investigations.filter(isPsiRecord).length} NASA PSI combustion investigations
            </p>
            <h1 id="hero-title" className="display-hero mt-5 max-w-[13ch]">
              How does fire behave in space?
            </h1>
            <p className="hero-lede mt-5 max-w-[46ch] text-lg leading-relaxed text-white/90">
              Explore NASA combustion experiments, see which results can fairly be compared, and find where the evidence
              ends for each crew environment.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/ask"
                className="btn h-12 bg-white px-6 text-[#10131a] hover:bg-white/90 hover:shadow-[0_8px_24px_-10px_rgba(255,255,255,0.6)]"
              >
                Ask about this scenario
                <Arrow />
              </Link>
              <Link to="/atlas" className="btn h-12 border-white/45 px-6 text-white hover:border-white/80 hover:bg-white/10">
                Explore the atlas
              </Link>
            </div>
          </div>

          {/* Scenario readout: inputs for the active environment, never evidence */}
          <aside
            aria-label={`Scenario inputs for ${scenario.name}`}
            className="glass hidden rounded-2xl p-5 lg:block"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--g-muted)]">Scenario inputs</p>
              <span className="rounded-full border border-dashed border-[var(--g-line)] px-2 py-px text-[11px] text-[var(--g-muted)]">Assumed</span>
            </div>
            <p key={scenario.id} className="route-enter mt-2 font-semibold tracking-tight text-2xl leading-tight">
              {scenario.name}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--g-rule)] pt-4">
              <Readout label="Gravity" value={`${fmt(scenario.gravityG, 3)} g`} />
              <Readout label="Oxygen" value={`${fmt(scenario.o2MolPct)} mol%`} />
              <Readout label="Pressure" value={`${fmt(scenario.pressureKPa, 1)} kPa`} sub={`${fmt(kPaToPsi(scenario.pressureKPa))} psi`} />
              <Readout label="O₂ partial pressure" value={`${fmt(pO2)} kPa`} sub="Computed" title={`Computed: ${O2_PARTIAL_FORMULA}`} solid />
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-[var(--g-muted)]">Source: {scenario.source}</p>
          </aside>
        </div>

        <div className="content-container relative z-10 pb-6">
          <EnvironmentSelector />
          <div className="mt-4 flex justify-end">
            <PhotoCredit scene={scene} className="hero-credit" />
          </div>
        </div>
      </section>

      <CoveragePreview />

      <div className="content-container space-y-20 py-20 sm:space-y-28 sm:py-28">
        <section aria-labelledby="flame-heading" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Buoyancy</p>
              <h2 id="flame-heading" className="section-title mt-2">
                See the flame change
              </h2>
            </div>
            <span className="text-xs italic text-[var(--text-muted)]">Illustrative, not a simulation</span>
          </div>
          <FlameInstrument />
        </section>

        {earthApplications.length > 0 && (
          <section aria-labelledby="earth-apps-heading" className="space-y-6">
            <div>
              <p className="eyebrow">Spinoffs</p>
              <h2 id="earth-apps-heading" className="section-title mt-2">
                From space to Earth
              </h2>
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
                      <h3 className="font-semibold tracking-tight text-xl text-[var(--text)]">{a.title}</h3>
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

        {dataset.fixture && (
          <p className="measure text-xs text-[var(--text-muted)]">Showing fixture data: fake values for development, not NASA data.</p>
        )}
      </div>
    </div>
  );
}

function Readout({ label, value, sub, title, solid = false }: { label: string; value: string; sub?: string; title?: string; solid?: boolean }) {
  return (
    <div title={title}>
      <dt className="text-[11px] text-[var(--g-muted)]">{label}</dt>
      <dd className="mt-1">
        <span
          className={`inline-block rounded-md px-1.5 py-0.5 font-mono text-sm text-[var(--g-text)] ${
            solid ? "border border-[var(--g-text)]" : "border border-dashed border-[var(--g-line)]"
          }`}
        >
          {value}
        </span>
        {sub && <span className="ml-1.5 whitespace-nowrap text-[11px] text-[var(--g-muted)]">{sub}</span>}
      </dd>
    </div>
  );
}

function Arrow() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" />
    </svg>
  );
}

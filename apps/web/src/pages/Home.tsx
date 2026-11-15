import { Link } from "react-router-dom";
import { O2_PARTIAL_FORMULA, kPaToPsi, o2PartialKPa } from "@flameatlas/engine";
import { dataset, earthApplications, invById, isPsiRecord } from "../lib/data";
import { FlameInstrument } from "../components/FlameInstrument";
import { investigationLabel } from "../lib/labels";
import { useScenario } from "../lib/scenario";
import { PhotoCredit, SceneBackdrop } from "../components/SceneBackdrop";
import { sceneFor } from "../lib/scenes";
import { EnvironmentSelector } from "../components/EnvironmentSelector";
import { CoveragePreview } from "../components/CoveragePreview";

const fmt = (x: number, digits = 1) => String(Number(x.toFixed(digits)));

export default function Home() {
  const { scenario } = useScenario();
  const scene = sceneFor(scenario);
  const pO2 = o2PartialKPa(scenario.o2MolPct, scenario.pressureKPa);

  return (
    <div>
      <section aria-labelledby="hero-title" className="home-hero relative isolate overflow-hidden">
        <SceneBackdrop scene={scene} variant="home" drift />

        <div className="content-container relative z-10 grid items-center gap-10 pb-10 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-14 lg:pt-24">
          <div>
            <h1 id="hero-title" className="page-title max-w-[14ch]">
              How does fire behave in space?
            </h1>
            <p className="page-lede max-w-[46ch]">
              Explore {dataset.investigations.filter(isPsiRecord).length} NASA combustion investigations, see which results can
              fairly be compared, and find where the evidence ends for each crew environment.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/ask" className="btn btn-primary">
                Ask about this scenario
              </Link>
              <Link to="/atlas" className="btn btn-secondary">
                Explore the atlas
              </Link>
            </div>
          </div>

          {/* Scenario inputs for the active environment: assumed values, never evidence */}
          <aside aria-label={`Scenario inputs for ${scenario.name}`} className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="panel-title">Scenario inputs</h2>
              <span className="chip chip-dashed">Assumed</span>
            </div>
            <p key={scenario.id} className="route-enter mt-2 text-xl font-semibold leading-snug tracking-tight text-[var(--text)]">
              {scenario.name}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border)] pt-4 text-sm">
              <Readout label="Gravity" value={`${fmt(scenario.gravityG, 3)} g`} />
              <Readout label="Oxygen" value={`${fmt(scenario.o2MolPct)} mol%`} />
              <Readout label="Pressure" value={`${fmt(scenario.pressureKPa, 1)} kPa`} sub={`${fmt(kPaToPsi(scenario.pressureKPa))} psi`} />
              <Readout label="O₂ partial pressure" value={`${fmt(pO2)} kPa`} title={`Computed: ${O2_PARTIAL_FORMULA}`} computed />
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-[var(--text-muted)]">
              Source: {scenario.source}. Dashed: assumed input. Solid: computed.
            </p>
          </aside>
        </div>

        <div className="content-container relative z-10 pb-10">
          <EnvironmentSelector />
          <div className="mt-3 flex justify-end">
            <PhotoCredit scene={scene} className="text-[var(--text-muted)]" />
          </div>
        </div>
      </section>

      <CoveragePreview />

      <div className="content-container space-y-20 py-20 sm:space-y-28 sm:py-28">
        <section aria-labelledby="flame-heading" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="flame-heading" className="section-title">
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
              <h2 id="earth-apps-heading" className="section-title">
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

function Readout({ label, value, sub, title, computed = false }: { label: string; value: string; sub?: string; title?: string; computed?: boolean }) {
  return (
    <div title={title ?? (computed ? undefined : "Assumed scenario input, not evidence")}>
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className={`value ${computed ? "value-computed" : "value-assumed"}`}>{value}</span>
        {sub && <span className="text-xs text-[var(--text-muted)]">{sub}</span>}
      </dd>
    </div>
  );
}

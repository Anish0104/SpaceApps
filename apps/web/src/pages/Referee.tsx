import { useState, type CSSProperties, type ReactNode } from "react";
import { referee, TRACKED, type Tracked } from "@flameatlas/engine";
import demoPairs from "../../../../data/demo-pairs.json";
import { dataset } from "../lib/data";
import { fieldLabel } from "../lib/labels";
import { ValueCell } from "../components/ValueCell";

type VerdictKey = ReturnType<typeof referee>["verdict"];

function verdictDetails(verdict: VerdictKey, target: Tracked, confounds: string[]) {
  switch (verdict) {
    case "CAN_ISOLATE":
      return {
        title: `Can isolate ${fieldLabel(target)}`,
        lightClass: "text-[var(--verdict-green)]",
        badgeBg: "bg-[var(--verdict-green)]",
        icon: (
          <svg aria-hidden="true" className="h-5 w-5 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
        ),
      };
    case "CANNOT_ISOLATE":
      return {
        title: confounds.length > 0
          ? `Cannot isolate: confounded by ${confounds.map(fieldLabel).join(", ")}`
          : "Cannot isolate",
        lightClass: "text-[var(--verdict-yellow)]",
        badgeBg: "bg-[var(--verdict-yellow)]",
        icon: (
          <svg aria-hidden="true" className="h-5 w-5 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        ),
      };
    case "CANT_CONFIRM":
      return {
        title: "Can't confirm: missing values",
        lightClass: "text-[var(--verdict-red)]",
        badgeBg: "bg-[var(--verdict-red)]",
        icon: (
          <svg aria-hidden="true" className="h-5 w-5 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        ),
      };
    case "NO_CONTRAST":
    default:
      return {
        title: "No contrast between runs",
        lightClass: "text-[var(--text-muted)]",
        badgeBg: "bg-[var(--border)]",
        icon: (
          <svg aria-hidden="true" className="h-5 w-5 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        ),
      };
  }
}

const isTracked = (f: string): f is Tracked => (TRACKED as readonly string[]).includes(f);

const QUICK_PAIRS = demoPairs.pairs.flatMap((p) => {
  const has = (id: string) => dataset.runs.some((r) => r.id === id);
  return has(p.a) && has(p.b) && isTracked(p.target)
    ? [{ id: p.id, label: p.label, a: p.a, b: p.b, target: p.target }]
    : [];
});

export default function Referee() {
  const runs = dataset.runs;
  const first = QUICK_PAIRS[0];

  const [a, setA] = useState(first?.a ?? runs[0]?.id ?? "");
  const [b, setB] = useState(first?.b ?? runs[1]?.id ?? "");
  const [target, setTarget] = useState<Tracked>(first?.target ?? "geometry");

  // Selection submitted for comparison
  const [compared, setCompared] = useState<{ a: string; b: string; target: Tracked }>({
    a: first?.a ?? runs[0]?.id ?? "",
    b: first?.b ?? runs[1]?.id ?? "",
    target: first?.target ?? "geometry",
  });

  const ra = runs.find((r) => r.id === compared.a);
  const rb = runs.find((r) => r.id === compared.b);
  const res = ra && rb ? referee(ra, rb, compared.target) : null;
  const verdict = res ? verdictDetails(res.verdict, compared.target, res.confounds) : null;

  function handleCompare() {
    setCompared({ a, b, target });
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="page-title">
          Referee
        </h1>
        <p className="page-lede">
          Compare two experimental runs to determine whether a single physical parameter is genuinely isolated or confounded by other shifting variables.
        </p>
      </div>

      {/* Quick comparison pairs */}
      {QUICK_PAIRS.length > 0 && (
        <div className="panel space-y-3 p-4 sm:p-5">
          <p className="eyebrow">
            Suggested comparisons
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PAIRS.map((p) => {
              const active = a === p.a && b === p.b && target === p.target;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setA(p.a);
                    setB(p.b);
                    setTarget(p.target);
                    setCompared({ a: p.a, b: p.b, target: p.target });
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? "border-[var(--accent)] bg-[var(--surface-2)] text-[var(--text)] font-medium"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  {p.label} ({fieldLabel(p.target)})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls: Two run selectors side-by-side + Target variable + Compare button */}
      <div className="panel p-6 sm:p-7">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Run A */}
          <div>
            <label htmlFor="run-a-select" className="block text-xs font-medium text-[var(--text-muted)]">
              Run A (baseline)
            </label>
            <select
              id="run-a-select"
              value={a}
              onChange={(e) => setA(e.target.value)}
              className="field mt-1.5 w-full text-sm text-[var(--text)]"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} ({r.material.value ?? "n/a"}, {r.gravityG.value ?? "n/a"}g)
                </option>
              ))}
            </select>
          </div>

          {/* Run B */}
          <div>
            <label htmlFor="run-b-select" className="block text-xs font-medium text-[var(--text-muted)]">
              Run B (comparison)
            </label>
            <select
              id="run-b-select"
              value={b}
              onChange={(e) => setB(e.target.value)}
              className="field mt-1.5 w-full text-sm text-[var(--text)]"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} ({r.material.value ?? "n/a"}, {r.gravityG.value ?? "n/a"}g)
                </option>
              ))}
            </select>
          </div>

          {/* Target variable */}
          <div>
            <label htmlFor="target-select" className="block text-xs font-medium text-[var(--text-muted)]">
              Variable to isolate
            </label>
            <select
              id="target-select"
              value={target}
              onChange={(e) => setTarget(e.target.value as Tracked)}
              className="field mt-1.5 w-full text-sm text-[var(--text)]"
            >
              {TRACKED.map((t) => (
                <option key={t} value={t}>
                  {fieldLabel(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleCompare}
            className="btn btn-primary min-w-[130px]"
          >
            Compare runs
          </button>
        </div>
      </div>

      {/* Comparison Verdict & Matrix */}
      {res && ra && rb && verdict && (
        <section aria-live="polite" key={`${compared.a}-${compared.b}-${compared.target}`} className="panel route-enter divide-y divide-[var(--border)] overflow-hidden">
          {/* Verdict Banner */}
          <div className="p-6 sm:p-7">
            <div className="flex items-start gap-3.5">
              <span className={`mt-0.5 shrink-0 ${verdict.lightClass}`}>
                {verdict.icon}
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
                  {verdict.title}
                </h2>
                <p className="measure mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
                  {res.explanation}
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium sm:pl-6">Condition</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5 font-mono font-medium text-[var(--text)]">{ra.id}</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5 font-mono font-medium text-[var(--text)]">{rb.id}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Role in comparison</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {TRACKED.map((f) => {
                  const isTarget = f === compared.target;
                  const isConfound = res.confounds.includes(f);
                  const isUndocumented = res.undocumented.includes(f);

                  return (
                    <tr
                      key={f}
                      className={`transition-colors ${
                        isTarget
                          ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] font-medium"
                          : isConfound
                          ? "bg-[color-mix(in_srgb,var(--verdict-red)_10%,transparent)]"
                          : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <th scope="row" className="whitespace-nowrap px-4 py-2.5 text-xs font-medium sm:pl-6 text-[var(--text)]">
                        {fieldLabel(f)}
                      </th>
                      <td className="px-4 py-2.5">
                        <ValueCell v={ra[f]} />
                      </td>
                      <td className="px-4 py-2.5">
                        <ValueCell v={rb[f]} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                        {isTarget ? (
                          <span className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--accent)] bg-[var(--surface)] px-2 py-0.5 font-medium text-[var(--text)]">
                            Target variable
                          </span>
                        ) : isConfound ? (
                          <span className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--verdict-red)] bg-[var(--surface)] px-2 py-0.5 font-medium text-[var(--verdict-red)]">
                            Confound
                          </span>
                        ) : isUndocumented ? (
                          <span className="hatch inline-block rounded px-2 py-0.5 text-[var(--text-muted)]">
                            Not documented
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">Constant</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-6 p-4 text-xs text-[var(--text-muted)] sm:px-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[var(--accent)]" />
              <span>Target variable to isolate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[var(--verdict-red)]" />
              <span>Confounding variable</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hatch inline-block h-3 w-5 rounded border border-[var(--border)]" />
              <span>Not documented</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

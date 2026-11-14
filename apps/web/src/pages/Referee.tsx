import { useState, type CSSProperties, type ReactNode } from "react";
import { referee, TRACKED, type Tracked } from "@flameatlas/engine";
import demoPairs from "../../../../data/demo-pairs.json";
import { dataset } from "../lib/data";
import { fieldLabel } from "../lib/labels";
import { VerdictLight, type Light } from "../components/Badge";
import { ValueCell } from "../components/ValueCell";

const VERDICT: Record<ReturnType<typeof referee>["verdict"], { words: string; light: Light }> = {
  CAN_ISOLATE: { words: "Can isolate", light: "green" },
  CANNOT_ISOLATE: { words: "Cannot isolate", light: "red" },
  CANT_CONFIRM: { words: "Cannot confirm", light: "yellow" },
  NO_CONTRAST: { words: "No contrast", light: "none" },
};

/** Row roles: the outline colour plus a word in the last column, never colour alone. */
const ROLE = {
  target: { words: "Target", mark: "var(--ch-blue)" },
  confound: { words: "Confound", mark: "var(--verdict-red)" },
} as const;

const isTracked = (f: string): f is Tracked => (TRACKED as readonly string[]).includes(f);

/**
 * The locked demo comparisons (data/demo-pairs.json). A pair is offered only if both runs are in
 * the loaded dataset. The verdict is whatever the engine returns; it is never read from the file.
 */
const QUICK_PAIRS = demoPairs.pairs.flatMap((p) => {
  const has = (id: string) => dataset.runs.some((r) => r.id === id);
  return has(p.a) && has(p.b) && isTracked(p.target) ? [{ id: p.id, label: p.label, a: p.a, b: p.b, target: p.target }] : [];
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink/70">{label}</span>
      {children}
    </label>
  );
}

export default function Referee() {
  const runs = dataset.runs;
  const first = QUICK_PAIRS[0];
  const [a, setA] = useState(first?.a ?? runs[0]?.id ?? "");
  const [b, setB] = useState(first?.b ?? runs[1]?.id ?? "");
  const [target, setTarget] = useState<Tracked>(first?.target ?? "geometry");
  const ra = runs.find((r) => r.id === a);
  const rb = runs.find((r) => r.id === b);
  const res = ra && rb ? referee(ra, rb, target) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl sm:text-3xl">Referee</h1>
        <p className="measure mt-2">Can a difference between two runs be attributed to one variable? The referee checks documented metadata only and never claims causal proof.</p>
      </div>

      {QUICK_PAIRS.length > 0 && (
        <div role="group" aria-labelledby="quick-pairs" className="space-y-2">
          <p id="quick-pairs" className="text-sm text-ink/70">Compare a demo pair</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {QUICK_PAIRS.map((p) => (
              <button key={p.id} type="button" className="btn btn-secondary btn-sm"
                aria-pressed={a === p.a && b === p.b && target === p.target}
                onClick={() => { setA(p.a); setB(p.b); setTarget(p.target); }}>
                {p.label}, {fieldLabel(p.target).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Field label="Run A">
          <select value={a} onChange={(e) => setA(e.target.value)} className="field text-base">{runs.map((r) => <option key={r.id}>{r.id}</option>)}</select>
        </Field>
        <Field label="Run B">
          <select value={b} onChange={(e) => setB(e.target.value)} className="field text-base">{runs.map((r) => <option key={r.id}>{r.id}</option>)}</select>
        </Field>
        <Field label="Variable to isolate">
          <select value={target} onChange={(e) => setTarget(e.target.value as Tracked)} className="field text-base">
            {TRACKED.map((t) => <option key={t} value={t}>{fieldLabel(t)}</option>)}
          </select>
        </Field>
      </div>

      {res && ra && rb && (
        <section aria-live="polite" className="panel">
          <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
            <span className="mt-1 flex"><VerdictLight light={VERDICT[res.verdict].light} /></span>
            <div>
              <h2 className="text-lg font-semibold">{VERDICT[res.verdict].words}</h2>
              <p className="measure">{res.explanation}</p>
            </div>
          </div>
          <div className="overflow-x-auto border-t border-rule">
            <table className="dense w-full text-left text-base">
              <thead className="text-sm text-ink/70">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold sm:pl-5">Field</th>
                  <th scope="col" className="whitespace-nowrap px-2 py-2 font-semibold sm:px-3">{ra.id}</th>
                  <th scope="col" className="whitespace-nowrap px-2 py-2 font-semibold sm:px-3">{rb.id}</th>
                  <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">Role in this comparison</th>
                </tr>
              </thead>
              <tbody>
                {TRACKED.map((f) => {
                  const role = f === target ? ROLE.target : res.confounds.includes(f) ? ROLE.confound : null;
                  const roleWords = [role?.words, res.undocumented.includes(f) && "Not documented"].filter(Boolean).join(", ");
                  return (
                    <tr key={f} className={role ? "row-mark" : "border-t border-rule"} style={role ? ({ "--mark": role.mark } as CSSProperties) : undefined}>
                      <th scope="row" className="whitespace-nowrap px-3 py-2 font-semibold sm:pl-5">
                        {fieldLabel(f)}
                        {/* On narrow screens the role sits under the field name so it never scrolls out of view */}
                        {roleWords && <span className="block text-sm font-normal sm:hidden">{roleWords}</span>}
                      </th>
                      <td className="px-2 py-2 sm:px-3"><ValueCell v={ra[f]} /></td>
                      <td className="px-2 py-2 sm:px-3"><ValueCell v={rb[f]} /></td>
                      <td className="hidden whitespace-nowrap px-3 py-2 sm:table-cell">{roleWords}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-rule px-4 py-3 text-sm text-ink/70 sm:px-5">
            <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-5 border-2 border-ch-blue" /> Blue outline: the variable to isolate</li>
            <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-5 border-2 border-verdict-red" /> Red outline: a confound, it also changed</li>
            <li className="flex items-center gap-2"><span aria-hidden="true" className="hatch h-3 w-5 border border-regolith" /> Hatch: not documented</li>
          </ul>
        </section>
      )}
    </div>
  );
}

import { useState } from "react";
import { referee, TRACKED, type Tracked } from "@flameatlas/engine";
import { dataset } from "../lib/data";

const LABEL = {
  CAN_ISOLATE: ["Can isolate", "text-match"],
  CANNOT_ISOLATE: ["Cannot isolate", "text-gap"],
  CANT_CONFIRM: ["Can't confirm", "text-assumed"],
  NO_CONTRAST: ["No contrast", "text-ink/60"],
} as const;

export default function Referee() {
  const runs = dataset.runs;
  const [a, setA] = useState(runs[0]?.id ?? "");
  const [b, setB] = useState(runs[1]?.id ?? "");
  const [target, setTarget] = useState<Tracked>("geometry");
  const ra = runs.find((r) => r.id === a);
  const rb = runs.find((r) => r.id === b);
  const res = ra && rb ? referee(ra, rb, target) : null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Referee</h1>
      <p className="text-sm text-ink/70">Can a difference between two runs be attributed to one variable? Checks documented metadata only; never claims causal proof.</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select value={a} onChange={(e) => setA(e.target.value)} className="rounded border border-line bg-white px-2 py-1">{runs.map((r) => <option key={r.id}>{r.id}</option>)}</select>
        vs
        <select value={b} onChange={(e) => setB(e.target.value)} className="rounded border border-line bg-white px-2 py-1">{runs.map((r) => <option key={r.id}>{r.id}</option>)}</select>
        target
        <select value={target} onChange={(e) => setTarget(e.target.value as Tracked)} className="rounded border border-line bg-white px-2 py-1">{TRACKED.map((t) => <option key={t}>{t}</option>)}</select>
      </div>

      {res && ra && rb && (
        <div className="rounded border border-line bg-white p-4">
          <div className={`font-display text-xl ${LABEL[res.verdict][1]}`}>{LABEL[res.verdict][0]}</div>
          <p className="text-sm">{res.explanation}</p>
          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-ink/60"><tr><th className="p-1">Field</th><th className="p-1">{ra.id}</th><th className="p-1">{rb.id}</th></tr></thead>
            <tbody>
              {TRACKED.map((f) => {
                const tone = f === target ? "bg-measured/10" : res.confounds.includes(f) ? "bg-gap/10" : res.undocumented.includes(f) ? "bg-assumed/10" : "";
                return (
                  <tr key={f} className={tone}>
                    <td className="p-1 font-semibold">{f}</td>
                    <td className="p-1 font-mono">{String(ra[f].value ?? "not documented")}</td>
                    <td className="p-1 font-mono">{String(rb[f].value ?? "not documented")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink/60">Blue = target · Coral = confound · Saffron = undocumented</p>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import type { AskResponse } from "@flameatlas/engine";
import { api } from "../lib/api";
import { useScenario } from "../lib/scenario";
import { Tag } from "../components/Badge";

const LIGHT = { green: "bg-match", yellow: "bg-assumed", red: "bg-gap" } as const;

export default function Ask() {
  const { scenario } = useScenario();
  const [q, setQ] = useState("Where is the biggest evidence gap for a lunar habitat?");
  const [a, setA] = useState<AskResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setErr(null);
    try { setA(await api.ask(q, scenario.id)); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Ask the archive</h1>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 rounded border border-line bg-white px-3 py-2 text-sm" />
        <button onClick={submit} disabled={busy} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white">{busy ? "…" : "Ask"}</button>
      </div>
      {err && <p className="text-sm text-gap">{err} (is the worker running? pnpm dev:worker)</p>}

      {a && (
        <div className="space-y-3 rounded border border-line bg-white p-4">
          {/* Beat 1: verdict (evidence strength, never safety) */}
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${LIGHT[a.verdict]}`} />
            <b>{a.status === "cannot_confirm" ? "Cannot confirm" : "Answer"}</b>
            <span className="text-xs text-ink/60">evidence strength, not a safety rating</span>
            <Tag>{a.source}</Tag>
          </div>
          {/* Beat 2: receipts */}
          <ul className="list-disc pl-5 text-sm">
            {a.sentences.map((s, i) => (
              <li key={i}>{s.text} {s.recordIds.map((id) => <Tag key={id} tone="measured">{id}</Tag>)}</li>
            ))}
          </ul>
          {/* Beat 3: what differs / missing */}
          {a.differs.length > 0 && <p className="text-sm"><b>Differs or missing:</b> {a.differs.join("; ")}</p>}
          {/* Beat 4: honest limit */}
          <p className="text-sm"><b>Limit:</b> {a.limit}</p>
          {/* Beat 5: bridge to action */}
          {a.next.kind !== "none" && <p className="text-sm text-measured">→ {a.next.kind === "missing_experiment" ? "The Missing Experiment" : "What the evidence supports now"}{a.next.target ? `: ${a.next.target}` : ""}</p>}
          {/* Beat 6: scope */}
          <p className="text-xs text-ink/60">{a.scope} · data {a.dataVersion}</p>
        </div>
      )}
    </div>
  );
}

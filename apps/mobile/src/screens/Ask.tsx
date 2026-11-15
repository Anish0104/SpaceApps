import { useState } from "react";
import type { AskResponse } from "@flameatlas/engine";
import { useStore } from "../store";
import { dataset, invById } from "../data";
import { useOffline } from "../useOffline";

const API_BASE = String(import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");
const EXAMPLES = ["What's the nearest tested condition for this habitat?", "Is there lunar-gravity flame-spread data?", "Compare BASS-II and Saffire on scale"];

type State = { kind: "idle" } | { kind: "loading" } | { kind: "answered"; env: string; a: AskResponse } | { kind: "error"; msg: string };

/** The PSI investigation a cited id belongs to (the id itself, or a run's parent). */
function linkFor(id: string): { label: string; url?: string } {
  if (id.startsWith("SCENARIO:")) return { label: id };
  const inv = invById(id) ?? invById(dataset.runs.find((r) => r.id === id)?.psiId ?? "");
  return inv ? { label: id, url: inv.url } : { label: id };
}

const VERDICT: Record<string, { dot: string; word: string }> = {
  green: { dot: "green", word: "Evidence: good" }, yellow: { dot: "amber", word: "Evidence: partial" }, red: { dot: "red", word: "Evidence: thin" },
};

export function Ask() {
  const { scenario: sc } = useStore();
  const offline = useOffline();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<State>({ kind: "idle" });

  async function send(question: string) {
    const text = question.trim();
    if (!text || offline) return;
    setSt({ kind: "loading" });
    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, scenarioId: sc.id, dataVersion: dataset.version }),
      });
      if (!res.ok) throw new Error(`Service responded ${res.status}`);
      setSt({ kind: "answered", env: sc.name, a: (await res.json()) as AskResponse });
    } catch {
      setSt({ kind: "error", msg: "The answer service is unavailable right now. The archive, Lab and Atlas still work offline." });
    }
  }

  return (
    <>
      <div className="row between">
        <div className="eyebrow">Ask the archive</div>
        <span className="ev computed">{sc.name.split(" (")[0]}</span>
      </div>
      <h1 className="h-xl">Ask a question</h1>
      <p className="small">Answers are built by the citation-validated engine and open their NASA sources. Every number traces to a record.</p>

      <div className="card" style={{ marginTop: 8 }}>
        <div className="compose">
          <textarea className="field" rows={2} placeholder={`Ask about ${sc.name.split(" (")[0]}…`} value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(q); }} />
          <button className="send" aria-label="Send" disabled={!q.trim() || offline} onClick={() => send(q)} style={{ opacity: !q.trim() || offline ? 0.5 : 1 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
        <div className="pills" style={{ marginTop: 10 }}>
          {EXAMPLES.map((e) => <button key={e} className="pill" onClick={() => { setQ(e); send(e); }}>{e}</button>)}
        </div>
        {offline && <p className="small faint" style={{ margin: "8px 0 0" }}>Offline — live answers need a connection. Browse the Atlas and Lab instead.</p>}
      </div>

      {st.kind === "loading" && <div className="card" style={{ marginTop: 12 }}><p className="small">Consulting the archive…</p></div>}
      {st.kind === "error" && <div className="note" style={{ marginTop: 12 }}>{st.msg}</div>}
      {st.kind === "answered" && <Answer env={st.env} a={st.a} />}

      <h2 className="sec">Text FlameAtlas</h2>
      <div className="card small">
        <p style={{ marginTop: 0 }}>Any phone can ask by SMS when a number is configured. Examples:</p>
        <div className="sms">
          <div className="bubble in mono">ISS: PMMA</div>
          <div className="bubble in mono">PMMA at 34% O2, 55 kPa on Moon</div>
        </div>
        <p className="small faint" style={{ marginBottom: 0 }}>
          The Worker verifies Twilio's signature, rate-limits by sender, and replies from the same engine — with assumed inputs,
          evidence strength, the archive limit and a citation. The number appears here once configured.
        </p>
      </div>

    </>
  );
}

function Answer({ env, a }: { env: string; a: AskResponse }) {
  const v = VERDICT[a.verdict] ?? VERDICT.yellow;
  return (
    <div className="card fade" style={{ marginTop: 12 }}>
      <div className="row between">
        <div className="row" style={{ gap: 8 }}><span className={`dot ${v.dot}`} /><b>{v.word}</b></div>
        <span className="ev computed">{env}</span>
      </div>
      {a.status === "cannot_confirm" && <p className="read">Cannot confirm from the curated archive — a data gap, not proof NASA never studied it.</p>}
      {a.sentences.map((s, i) => (
        <p key={i} className="read" style={{ marginTop: 8 }}>
          {s.text}{" "}
          {s.recordIds.map((id) => { const l = linkFor(id); return l.url
            ? <a key={id} className="src" href={l.url} target="_blank" rel="noreferrer">[{l.label}]</a>
            : <span key={id} className="tag">{l.label}</span>; })}
        </p>
      ))}
      {a.differs.length > 0 && <p className="small faint" style={{ marginTop: 8 }}>Differs: {a.differs.join("; ")}.</p>}
      <p className="small" style={{ marginTop: 8 }}><b>Limit.</b> {a.limit}</p>
      <p className="small faint">{a.scope} · {a.source}</p>
    </div>
  );
}

import { useEffect, useRef } from "react";
import type { AskResponse } from "@flameatlas/engine";
import { useStore } from "../store";
import { dataset, invById } from "../data";
import { useOffline } from "../useOffline";

const API_BASE = String(import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");
const EXAMPLES = ["Nearest tested condition for this habitat?", "Is there lunar-gravity flame-spread data?", "Compare BASS-II and Saffire on scale"];

export type ChatMsg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "bot"; status: "loading" }
  | { id: number; role: "bot"; status: "answer"; env: string; a: AskResponse }
  | { id: number; role: "bot"; status: "error"; msg: string };

let uid = 0;

function linkFor(id: string): { label: string; url?: string } {
  if (id.startsWith("SCENARIO:")) return { label: id };
  const inv = invById(id) ?? invById(dataset.runs.find((r) => r.id === id)?.psiId ?? "");
  return inv ? { label: id, url: inv.url } : { label: id };
}

const VERDICT: Record<string, { dot: string; word: string }> = {
  green: { dot: "green", word: "Evidence: good" }, yellow: { dot: "amber", word: "Evidence: partial" }, red: { dot: "red", word: "Evidence: thin" },
};

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export function Ask({ chat, setChat, draft, setDraft }: {
  chat: ChatMsg[]; setChat: (fn: (prev: ChatMsg[]) => ChatMsg[]) => void;
  draft: string; setDraft: (v: string) => void;
}) {
  const { scenario: sc } = useStore();
  const offline = useOffline();
  const endRef = useRef<HTMLDivElement>(null);
  const env = sc.name.split(" (")[0];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: chat.length ? "smooth" : "auto", block: "end" }); }, [chat]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || offline) return;
    setDraft("");
    const userId = ++uid, botId = ++uid;
    setChat((prev) => [...prev, { id: userId, role: "user", text }, { id: botId, role: "bot", status: "loading" }]);
    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, scenarioId: sc.id, dataVersion: dataset.version }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const a = (await res.json()) as AskResponse;
      setChat((prev) => prev.map((m) => (m.id === botId ? { id: botId, role: "bot", status: "answer", env: sc.name, a } : m)));
    } catch {
      setChat((prev) => prev.map((m) => (m.id === botId ? { id: botId, role: "bot", status: "error", msg: "The answer service is unavailable right now. The archive, Lab and Atlas still work offline." } : m)));
    }
  }

  return (
    <div className="page">
      <div className="row between">
        <h1 className="title">Ask</h1>
        <span className="tag accent">{env}</span>
      </div>

      {chat.length === 0 ? (
        <div className="chat-empty">
          <p className="subtitle">Ask about NASA's microgravity combustion evidence for {env}. Every answer opens its source.</p>
          {offline ? (
            <p className="caption">Offline — live answers need a connection. Browse the Atlas and Lab instead.</p>
          ) : (
            <>
              <div className="sec">Try asking</div>
              <div className="suggest">
                {EXAMPLES.map((e) => (
                  <button key={e} className="suggest-item" onClick={() => send(e)}>
                    <span>{e}</span>
                    <span className="arrow"><SendIcon /></span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="thread">
          {chat.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="msg-user"><div className="bubble user">{m.text}</div></div>
            ) : m.status === "loading" ? (
              <div key={m.id} className="msg-bot"><div className="typing" aria-label="Thinking"><span /><span /><span /></div></div>
            ) : m.status === "error" ? (
              <div key={m.id} className="msg-bot"><div className="note" style={{ width: "100%" }}>{m.msg}</div></div>
            ) : (
              <Answer key={m.id} env={m.env} a={m.a} />
            ),
          )}
        </div>
      )}
      <div ref={endRef} className="chat-spacer" />

      <div className="chatbar">
        <textarea className="field" rows={1} placeholder={offline ? "Offline — answers need a connection" : "Message Oxyflame…"} value={draft} disabled={offline}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }} />
        <button className="send" aria-label="Send" disabled={!draft.trim() || offline} onClick={() => send(draft)}><SendIcon /></button>
      </div>
    </div>
  );
}

function Answer({ env, a }: { env: string; a: AskResponse }) {
  const v = VERDICT[a.verdict] ?? VERDICT.yellow;
  return (
    <div className="card answer">
      <div className="row between">
        <div className="row" style={{ gap: 8 }}><span className={`dot ${v.dot}`} /><b style={{ fontSize: 15 }}>{v.word}</b></div>
        <span className="tag">{env}</span>
      </div>
      {a.status === "cannot_confirm" && <p className="body">Cannot confirm from the curated archive — a data gap, not proof NASA never studied it.</p>}
      {a.sentences.map((s, i) => (
        <p key={i} className="body">
          {s.text}{" "}
          {s.recordIds.map((id) => { const l = linkFor(id); return l.url
            ? <a key={id} className="src" href={l.url} target="_blank" rel="noreferrer">[{l.label}]</a>
            : <span key={id} className="tag">{l.label}</span>; })}
        </p>
      ))}
      {a.differs.length > 0 && <p className="caption">Differs: {a.differs.join("; ")}.</p>}
      <p className="caption" style={{ marginTop: 8 }}><b style={{ color: "var(--text)" }}>Limit.</b> {a.limit}</p>
      <p className="caption">{a.scope} · {a.source}</p>
    </div>
  );
}

import { useState } from "react";
import { rankInvestigations, matchPhrase, type Scenario } from "@flameatlas/engine";
import { dataset, scenarios, runsFor } from "../data";

/**
 * Preview of the SMS interface. The chat shows the SAME compact, cited format the Twilio webhook
 * (`apps/worker/src/sms.ts`) returns. Previews rank scenario-only prompts with the engine (no
 * question scoring), matching what the webhook sends for a bare environment word. Source of truth
 * for the exact wording is the worker; this is a faithful preview, never a safety claim.
 */
const VERDICT_WORD: Record<string, string> = { green: "Evidence: good", yellow: "Evidence: partial", red: "Evidence: thin" };

function findScenario(text: string): Scenario | null {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  const map: [string, string[]][] = [
    ["moon-fm2", ["fm2"]], ["moon-challenge", ["moon", "lunar"]], ["iss", ["iss", "station", "cabin"]],
    ["rover", ["rover"]], ["mars", ["mars"]], ["suit", ["suit", "spacesuit"]], ["earth", ["earth"]],
  ];
  for (const [id, words] of map) if (words.some((w) => t.includes(` ${w} `))) return scenarios.find((s) => s.id === id) ?? null;
  return null;
}

function reply(msg: string): string {
  if (!msg.trim() || /^help/i.test(msg)) {
    return "FlameAtlas: text a crew environment (MOON, ISS, MARS, ROVER, SUIT, FM2) and an optional question. Reply gives the top NASA investigation, what it matches, and the honest limit. We never rate a material safe.";
  }
  const sc = findScenario(msg);
  if (!sc) return 'Name a crew environment: MOON, ISS, MARS, ROVER, SUIT or FM2. E.g. "MOON fabric flammability".';
  const inputs = dataset.investigations.map((inv) => ({ investigation: inv, runs: runsFor(inv.psiId), questionScore: 0 }));
  const ranked = rankInvestigations(inputs, sc);
  const top = ranked.find((r) => r.score !== null);
  if (!top) return `${sc.name}: cannot confirm from our curated data. A dataset gap, not proof NASA never studied it. Not a safety rating.`;
  const inv = dataset.investigations.find((i) => i.psiId === top.psiId)!;
  const matches = [...new Set(top.reasons.map(matchPhrase).filter(Boolean))].join(", ");
  const gravityGap = ranked.filter((r) => r.score !== null).slice(0, 3).every((r) => r.reasons.includes("GRAVITY_DIFFERS"));
  const limit = gravityGap ? `No curated run matches ${sc.name} gravity; results are analogs.` : "Among tracked conditions only.";
  return `${sc.name} — ${VERDICT_WORD[gravityGap ? "yellow" : "green"]}. Top: ${inv.acronym} (${top.psiId})${matches ? `, matches on ${matches}` : ""}. Limit: ${limit} [${top.psiId}] Not a safety rating.`;
}

const SUGGESTIONS = ["MOON", "ISS", "MARS", "FM2", "SUIT", "HELP"];

export function Sms() {
  const [log, setLog] = useState<{ me: boolean; text: string }[]>([
    { me: true, text: "MOON" },
    { me: false, text: reply("MOON") },
  ]);
  const send = (text: string) => setLog((l) => [...l, { me: true, text }, { me: false, text: reply(text) }]);

  return (
    <>
      <h1>Text the archive</h1>
      <p className="small">Any phone can ask FlameAtlas by SMS — no app, no account. Tap a command to preview the reply.</p>

      <div className="card">
        <div className="row between">
          <span className="chip">+1 (xxx) FLAME-01</span>
          <span className="chip measured">Live engine · no AI</span>
        </div>
        <div className="sms">
          {log.map((m, i) => <div key={i} className={`bubble ${m.me ? "out" : "in"}`}>{m.text}</div>)}
        </div>
      </div>

      <div className="presets" role="group" aria-label="Example messages">
        {SUGGESTIONS.map((s) => <button key={s} className="pill" onClick={() => send(s)}>{s}</button>)}
      </div>

      <h2>How it works</h2>
      <div className="card small">
        <p style={{ marginTop: 0 }}>The Cloudflare Worker route <b>POST /api/sms</b> is a Twilio webhook. Every request is:</p>
        <div className="item"><span className="dot green" /><div><b>Verified</b> — the X-Twilio-Signature is checked (HMAC-SHA1) before any reply.</div></div>
        <div className="item"><span className="dot green" /><div><b>Rate-limited</b> — a per-sender sliding window stops floods.</div></div>
        <div className="item"><span className="dot green" /><div><b>Deterministic</b> — replies come from the citation-validated rules engine, not an LLM, so a number always traces to a NASA record.</div></div>
      </div>
      <p className="small faint" style={{ marginTop: 12 }}>
        Point your Twilio number's "A message comes in" webhook at <code>https://&lt;worker&gt;/api/sms</code> and set the
        <code> TWILIO_AUTH_TOKEN</code> secret. Replies are evidence coverage, never a safety rating.
      </p>
    </>
  );
}

/**
 * Twilio SMS webhook: text Oxyflame a crew environment (and optionally a question) and get a
 * short, source-cited answer built by the SAME deterministic, citation-validated engine the web app
 * uses. No Gemini call: SMS replies come only from the rules engine and template answer, so a reply
 * is reproducible and never invents a number or a safety claim.
 *
 * Security: every request is checked against Twilio's X-Twilio-Signature (HMAC-SHA1 over the exact
 * webhook URL plus the POST params). Unsigned or mis-signed requests are rejected. A per-sender rate
 * limit protects the endpoint. Nothing here promises a material is safe; it reports evidence coverage.
 */
import type { Dataset, RankedResult, Scenario } from "@flameatlas/engine";
import type MiniSearch from "minisearch";
import { SearchRequest, matchPhrase } from "@flameatlas/engine";
import { search } from "./search";
import { templateAnswer } from "./ask";

// ---------- Twilio signature (HMAC-SHA1, base64), via Web Crypto ----------

/**
 * Twilio signs the full webhook URL followed by each POST parameter, sorted by name and concatenated
 * as name+value, HMAC-SHA1 with the account auth token, base64. See Twilio "Validating requests".
 */
export async function twilioSignature(authToken: string, url: string, params: Record<string, string>): Promise<string> {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Constant-time string compare, so a wrong signature cannot be found a character at a time. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyTwilio(authToken: string, url: string, params: Record<string, string>, header: string | null): Promise<boolean> {
  if (!header) return false;
  return timingSafeEqual(await twilioSignature(authToken, url, params), header);
}

// ---------- rate limit (sliding window, in memory per isolate) ----------

export interface RateLimit { max: number; windowMs: number }
export const DEFAULT_RATE: RateLimit = { max: 8, windowMs: 60_000 };

/** A tiny sliding-window limiter. In memory per Worker isolate: fine for abuse protection, not a
 *  global guarantee. For strict cross-isolate limits, back it with KV or a Durable Object. */
export class SlidingWindow {
  private hits = new Map<string, number[]>();
  constructor(private limit: RateLimit = DEFAULT_RATE) {}
  /** Records a hit for `key` and returns whether it is allowed under the window. */
  allow(key: string, now = Date.now()): boolean {
    const cutoff = now - this.limit.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    recent.push(now);
    this.hits.set(key, recent);
    return recent.length <= this.limit.max;
  }
}

// ---------- scenario parsing ----------

/** Words a texter might use for each curated scenario id. First match wins, longest alias first. */
const SCENARIO_ALIASES: Record<string, string[]> = {
  "moon-fm2": ["fm2", "fm-2", "habitat air", "exploration atmosphere"],
  "moon-challenge": ["moon", "lunar", "moon base", "luna"],
  iss: ["iss", "station", "spacecraft", "cabin", "orbit"],
  rover: ["rover", "pressurized rover"],
  mars: ["mars", "martian"],
  suit: ["suit", "spacesuit", "eva"],
  earth: ["earth", "sea level", "ground"],
};

/** The scenario a message names, or null. Longer aliases are checked first so "moon base" beats "moon". */
export function parseScenario(body: string, scenarios: Scenario[]): Scenario | null {
  // punctuation to spaces, so "FM2?", "moon.", "iss," all match on whole words
  const text = ` ${body.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  const ids = Object.entries(SCENARIO_ALIASES)
    .flatMap(([id, aliases]) => aliases.map((a) => ({ id, a })))
    .sort((x, y) => y.a.length - x.a.length);
  for (const { id, a } of ids) {
    if (text.includes(` ${a} `)) return scenarios.find((s) => s.id === id) ?? null;
  }
  return null;
}

export interface SmsDeps { ds: Dataset; index: MiniSearch; scenarios: Scenario[] }

const VERDICT_WORD: Record<string, string> = { green: "Evidence: good", yellow: "Evidence: partial", red: "Evidence: thin" };
const HELP =
  "Oxyflame: text a crew environment (MOON, ISS, MARS, ROVER, SUIT, FM2) and an optional question. " +
  "Reply gives the top NASA investigation, what it matches, and the honest limit. We never rate a material safe. Reply HELP for this.";

/** Keeps an SMS within two 160-char segments, cutting on a sentence or space, never mid-word. */
export function clampSms(text: string, max = 300): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return (stop > max * 0.5 ? cut.slice(0, stop) : cut).trimEnd() + "…";
}

/**
 * Builds the SMS reply body for an incoming message. Deterministic: same text in, same text out.
 * Uses search() + templateAnswer() (citation-validated); the number in any sentence is traceable to
 * a cited NASA record. HELP and an unrecognised scenario get guidance, not a guess.
 */
export function smsReply(body: string, deps: SmsDeps): string {
  const trimmed = body.trim();
  if (!trimmed || /^\s*help\b/i.test(trimmed)) return HELP;

  const sc = parseScenario(trimmed, deps.scenarios);
  if (!sc) {
    return clampSms(
      "Name a crew environment so I can rank the evidence: MOON, ISS, MARS, ROVER, SUIT or FM2. " +
      'E.g. "MOON fabric flammability". Reply HELP for more.',
    );
  }

  const question = trimmed.replace(/[?.!]+$/, "");
  const ranked: RankedResult[] = search(deps.ds, deps.index, sc, SearchRequest.parse({ query: question, scenarioId: sc.id }));
  const answer = templateAnswer(deps.ds, sc, ranked);

  if (answer.status === "cannot_confirm" || !answer.sentences.length) {
    return clampSms(
      `${sc.name}: cannot confirm from our curated data. ${answer.limit} ` +
      "A dataset gap, not proof NASA never studied it. Not a safety rating.",
    );
  }

  // Compact reply built from the top scored result so the citation and the disclaimer always fit.
  // No raw numbers are quoted here, so nothing can be an untraceable claim.
  const top = ranked.find((r) => r.score !== null)!;
  const inv = deps.ds.investigations.find((i) => i.psiId === top.psiId)!;
  const matches = [...new Set(top.reasons.map(matchPhrase).filter(Boolean))].join(", ");
  const head = `${sc.name} — ${VERDICT_WORD[answer.verdict] ?? "Evidence"}.`;
  const line = `Top: ${inv.acronym} (${top.psiId})${matches ? `, matches on ${matches}` : ""}.`;
  const limit = `Limit: ${answer.limit}`;
  // assemble, then drop the match clause first if we are tight on length, keeping id + limit + disclaimer
  const tail = `[${top.psiId}] Not a safety rating.`;
  const full = `${head} ${line} ${limit} ${tail}`;
  if (full.length <= 320) return full;
  return `${head} Top: ${inv.acronym} (${top.psiId}). ${clampSms(limit, 180)} ${tail}`;
}

// ---------- TwiML ----------

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

export function twiml(message: string): Response {
  const body = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new Response(body, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

// ---------- handler ----------

/**
 * Handle POST /api/sms. Verifies the Twilio signature against TWILIO_AUTH_TOKEN, rate-limits per
 * sender, and replies with TwiML. Without the token configured it refuses (503) rather than
 * answering an unverifiable request.
 */
export async function handleSms(
  req: Request, url: string, env: { TWILIO_AUTH_TOKEN?: string }, deps: SmsDeps, limiter: SlidingWindow,
): Promise<Response> {
  if (!env.TWILIO_AUTH_TOKEN) {
    return new Response("SMS endpoint not configured", { status: 503 });
  }
  const form = new URLSearchParams(await req.text());
  const params: Record<string, string> = {};
  for (const [k, v] of form) params[k] = v;

  if (!(await verifyTwilio(env.TWILIO_AUTH_TOKEN, url, params, req.headers.get("X-Twilio-Signature")))) {
    return new Response("Invalid signature", { status: 403 });
  }
  const from = params.From ?? "unknown";
  if (!limiter.allow(from)) {
    return twiml("You are sending messages quickly. Please wait a minute and try again.");
  }
  return twiml(smsReply(params.Body ?? "", deps));
}

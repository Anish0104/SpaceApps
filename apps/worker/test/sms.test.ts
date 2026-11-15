/**
 * Twilio SMS webhook: signature verification, rate limiting, scenario parsing and the deterministic,
 * source-cited reply. No network and no Gemini: the reply comes from the engine + template answer.
 */
import { describe, it, expect } from "vitest";
import real from "../../../data/dataset.json";
import scenariosJson from "../../../data/scenarios.json";
import { Dataset, Scenario } from "@flameatlas/engine";
import { buildIndex } from "../src/search";
import {
  SlidingWindow, twilioSignature, verifyTwilio, parseScenario, smsReply, clampSms, twiml, handleSms,
  candidateUrls, type SmsDeps,
} from "../src/sms";

const ds = Dataset.parse(real);
const scenarios = scenariosJson.map((s) => Scenario.parse(s));
const deps: SmsDeps = { ds, index: buildIndex(ds), scenarios };
const TOKEN = "test_auth_token_1234567890";
const URL = "https://flameatlas-api.example.workers.dev/api/sms";

/** Build a signed Twilio-style request like Twilio would send. */
async function signedRequest(params: Record<string, string>, token = TOKEN): Promise<Request> {
  const sig = await twilioSignature(token, URL, params);
  return new Request(URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": sig },
    body: new URLSearchParams(params).toString(),
  });
}

describe("twilio signature", () => {
  it("accepts a correctly signed request and rejects a tampered one", async () => {
    const params = { From: "+15555550123", Body: "MOON" };
    const sig = await twilioSignature(TOKEN, URL, params);
    expect(await verifyTwilio(TOKEN, URL, params, sig)).toBe(true);
    // a changed body invalidates the signature
    expect(await verifyTwilio(TOKEN, URL, { ...params, Body: "MARS" }, sig)).toBe(false);
    // the wrong token invalidates it
    expect(await verifyTwilio("other_token", URL, params, sig)).toBe(false);
    // a missing header is rejected
    expect(await verifyTwilio(TOKEN, URL, params, null)).toBe(false);
  });
});

describe("rate limit", () => {
  it("allows up to the limit in a window, then blocks, and recovers after the window", () => {
    const w = new SlidingWindow({ max: 3, windowMs: 1000 });
    const t = 10_000;
    expect([0, 1, 2].map((i) => w.allow("+1", t + i))).toEqual([true, true, true]);
    expect(w.allow("+1", t + 3)).toBe(false);
    expect(w.allow("+2", t + 3)).toBe(true);        // a different sender is independent
    expect(w.allow("+1", t + 2000)).toBe(true);     // window has passed
  });
});

describe("scenario parsing", () => {
  it("maps common words to curated scenarios, longest alias first", () => {
    expect(parseScenario("moon base fabric", scenarios)?.id).toBe("moon-challenge");
    expect(parseScenario("what about FM2?", scenarios)?.id).toBe("moon-fm2");
    expect(parseScenario("ISS smoke detector", scenarios)?.id).toBe("iss");
    expect(parseScenario("mars habitat", scenarios)?.id).toBe("mars");
    expect(parseScenario("hello there", scenarios)).toBeNull();
  });
});

describe("reply content", () => {
  it("HELP and empty get guidance, never a guess", () => {
    expect(smsReply("help", deps)).toMatch(/text a crew environment/i);
    expect(smsReply("", deps)).toMatch(/text a crew environment/i);
  });
  it("an unrecognised message asks for a crew environment", () => {
    expect(smsReply("tell me everything", deps)).toMatch(/MOON, ISS, MARS/);
  });
  it("a scenario reply names the environment, cites a record, states a limit, and refuses a safety rating", () => {
    const r = smsReply("MOON fabric flammability", deps);
    expect(r).toContain("Moon Base");
    expect(r).toMatch(/\[(PSI-\d+|SAF[-A-Z0-9]*|SAFFIRE[-A-Z0-9]*)\]/); // a cited record id
    expect(r).toMatch(/Limit:/);
    expect(r).toContain("Not a safety rating");
    expect(r.toLowerCase()).not.toMatch(/\bis safe\b|\bunsafe\b/);
  });
  it("is deterministic", () => {
    expect(smsReply("ISS smoke", deps)).toBe(smsReply("ISS smoke", deps));
  });
  it("clampSms keeps within two segments without cutting mid-word", () => {
    const long = "word ".repeat(100);
    const out = clampSms(long, 300);
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor$/); // never a half word before the ellipsis
  });
});

describe("twiml + handler", () => {
  it("wraps a reply in valid TwiML and escapes XML", () => {
    const res = twiml("A & B <ok>");
    expect(res.headers.get("Content-Type")).toContain("text/xml");
  });
  it("end to end: signed request gets a 200 TwiML reply", async () => {
    const res = await handleSms(await signedRequest({ From: "+15555550000", Body: "MARS" }), URL, { TWILIO_AUTH_TOKEN: TOKEN }, deps, new SlidingWindow());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("<Response><Message>");
    expect(body).toContain("Mars habitat");
  });
  it("rejects an unsigned request with 403", async () => {
    const res = await handleSms(
      new Request(URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "From=%2B1&Body=MOON" }),
      URL, { TWILIO_AUTH_TOKEN: TOKEN }, deps, new SlidingWindow(),
    );
    expect(res.status).toBe(403);
  });
  it("refuses with 503 when no auth token is configured", async () => {
    const res = await handleSms(await signedRequest({ From: "+1", Body: "MOON" }), URL, {}, deps, new SlidingWindow());
    expect(res.status).toBe(503);
  });
  it("blocks a flood from one sender with a wait message", async () => {
    const limiter = new SlidingWindow({ max: 2, windowMs: 60_000 });
    const send = async () => (await handleSms(await signedRequest({ From: "+15555559999", Body: "MOON" }), URL, { TWILIO_AUTH_TOKEN: TOKEN }, deps, limiter)).text();
    await send(); await send();
    expect(await send()).toContain("sending messages quickly");
  });
});

describe("candidate urls", () => {
  it("tries the received URL and a pinned canonical URL, each with and without a trailing slash", () => {
    expect(candidateUrls("https://x.workers.dev/api/sms")).toEqual([
      "https://x.workers.dev/api/sms",
      "https://x.workers.dev/api/sms/",
    ]);
    // a pinned canonical URL is tried first, so a trailing-slash mismatch at the edge still verifies
    expect(candidateUrls("https://x.workers.dev/api/sms/", "https://x.workers.dev/api/sms")).toEqual([
      "https://x.workers.dev/api/sms",
      "https://x.workers.dev/api/sms/",
    ]);
  });
});

describe("whatsapp (Twilio WhatsApp sandbox)", () => {
  const WA_FROM = "whatsapp:+15555550123";
  const WA_TO = "whatsapp:+14155238886";

  it("a signed WhatsApp request, verified against the exact URL, returns 200 TwiML with a <Message>", async () => {
    // The signature is computed over the raw params INCLUDING the "whatsapp:" prefix on From/To.
    const params = { Body: "ISS smoke detector", From: WA_FROM, To: WA_TO, MessageSid: "SM" + "a".repeat(32) };
    const res = await handleSms(await signedRequest(params), URL, { TWILIO_AUTH_TOKEN: TOKEN }, deps, new SlidingWindow());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("<Response><Message>");
    expect(body).toContain("</Message></Response>");
  });

  it("a WhatsApp request with a bad signature returns 403", async () => {
    const params = { Body: "MOON", From: WA_FROM, To: WA_TO };
    const req = new Request(URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": "INVALID_SIGNATURE" },
      body: new URLSearchParams(params).toString(),
    });
    const res = await handleSms(req, URL, { TWILIO_AUTH_TOKEN: TOKEN }, deps, new SlidingWindow());
    expect(res.status).toBe(403);
  });

  it('"HELP" returns the help text', async () => {
    const res = await handleSms(await signedRequest({ Body: "HELP", From: WA_FROM, To: WA_TO }), URL, { TWILIO_AUTH_TOKEN: TOKEN }, deps, new SlidingWindow());
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/text a crew environment/i);
  });

  it('"MOON fabric flammability" returns a cited scenario reply with the safety disclaimer, under 1,600 chars', async () => {
    const res = await handleSms(await signedRequest({ Body: "MOON fabric flammability", From: WA_FROM, To: WA_TO }), URL, { TWILIO_AUTH_TOKEN: TOKEN }, deps, new SlidingWindow());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/\[(PSI-\d+|SAF[-A-Z0-9]*|SAFFIRE[-A-Z0-9]*)\]/); // a cited record id
    expect(body).toContain("Not a safety rating");
    expect(body.length).toBeLessThanOrEqual(1600);
  });
});

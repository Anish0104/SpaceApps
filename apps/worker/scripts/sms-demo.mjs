#!/usr/bin/env node
/**
 * sms:demo — send a Twilio-style (WhatsApp-compatible) request to the deployed /api/sms webhook,
 * signed exactly as Twilio signs it, and print the TwiML <Message> reply as plain text. This proves
 * the signed, deterministic, source-cited reply end to end — no live phone number required.
 *
 * Usage (run from apps/worker, or `pnpm sms:demo ...` from the repo root):
 *   TWILIO_AUTH_TOKEN=xxxx pnpm sms:demo "MOON fabric flammability"
 *   TWILIO_AUTH_TOKEN=xxxx pnpm sms:demo --bad-signature "MOON"
 *
 * The auth token is read from the environment and is NEVER written to disk or echoed. With
 * --bad-signature we send a deliberately wrong signature to show the endpoint returns 403, proving
 * only Twilio (holder of the auth token) can call it.
 */
import { createHmac, randomUUID } from "node:crypto";

// The exact public URL Twilio calls — https, no port, no trailing slash. Overridable for staging.
const WEBHOOK_URL = process.env.SMS_WEBHOOK_URL || "https://oxyflame.oxyflame.workers.dev/api/sms";
const WHATSAPP_TO = "whatsapp:+14155238886"; // Twilio WhatsApp sandbox number
const WHATSAPP_FROM = "whatsapp:+15555550123"; // demo sender

/**
 * Twilio signature: HMAC-SHA1 over (url + params sorted by name, concatenated as name+value), base64.
 * Mirrors twilioSignature() in src/sms.ts (which uses Web Crypto) with Node's crypto — byte-for-byte
 * the same, since both UTF-8 encode the data and base64 the digest.
 */
function twilioSignature(authToken, url, params) {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

function parseArgs(argv) {
  let bad = false;
  const words = [];
  for (const a of argv) {
    if (a === "--bad-signature") bad = true;
    else words.push(a);
  }
  return { bad, body: words.join(" ").trim() || "MOON fabric flammability" };
}

/** Pull the <Message> text out of a TwiML response and unescape XML entities for readable output. */
function twimlMessage(xml) {
  const m = xml.match(/<Message>([\s\S]*?)<\/Message>/i);
  const raw = m ? m[1] : xml;
  return raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

async function main() {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    console.error("Error: TWILIO_AUTH_TOKEN is not set.");
    console.error("Export your Twilio auth token (never commit it), then re-run:");
    console.error("  export TWILIO_AUTH_TOKEN=your_auth_token_here");
    console.error('  pnpm sms:demo "MOON fabric flammability"');
    process.exit(1);
  }

  const { bad, body } = parseArgs(process.argv.slice(2));
  const params = {
    Body: body,
    From: WHATSAPP_FROM,
    To: WHATSAPP_TO,
    MessageSid: "SM" + randomUUID().replace(/-/g, ""),
  };

  const good = twilioSignature(token, WEBHOOK_URL, params);
  const signature = bad ? "INVALID_SIGNATURE_FOR_DEMO" : good;

  console.log(`→ POST ${WEBHOOK_URL}`);
  console.log(`  From: ${params.From}   To: ${params.To}`);
  console.log(`  Body: ${JSON.stringify(body)}`);
  console.log(`  X-Twilio-Signature: ${signature}${bad ? "   (deliberately wrong)" : ""}`);

  let res;
  try {
    res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Twilio-Signature": signature,
      },
      body: new URLSearchParams(params).toString(),
    });
  } catch (err) {
    console.error(`\nRequest failed: ${err.message}`);
    process.exit(1);
  }

  const text = await res.text();
  console.log(`\n← ${res.status} ${res.statusText}`);
  if (res.status === 200) {
    console.log("\nReply:\n  " + twimlMessage(text).replace(/\n/g, "\n  "));
  } else {
    console.log("\nBody:\n  " + text.trim());
    if (bad && res.status === 403) {
      console.log("\n✓ Rejected as expected — only a valid Twilio signature is accepted.");
    }
  }

  // Non-zero exit when the call did not behave as expected, so humans and CI notice.
  if (bad ? res.status !== 403 : res.status !== 200) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * CORS for the API. Kept out of src/index.ts on purpose: the Workers runtime treats every named export of
 * the entry module as an entrypoint, so the entry must export only the fetch handler.
 */
export interface CorsEnv {
  /** The deployed web app's origin, allowed next to the local Vite server. Comma-separate several. */
  ALLOWED_ORIGIN?: string;
}

/** The local Vite dev server; always allowed so `pnpm dev:web` works against a local or deployed worker. */
export const DEV_ORIGIN = "http://localhost:5173";

/**
 * CORS headers for this request. Only the deployed web app (ALLOWED_ORIGIN) and the local Vite
 * server get an Access-Control-Allow-Origin header; any other browser origin is refused by the
 * browser. Requests without an Origin (curl, server to server) are unaffected.
 */
export function corsHeaders(origin: string | null, env: CorsEnv): Record<string, string> {
  const allowed = [DEV_ORIGIN, ...(env.ALLOWED_ORIGIN ?? "").split(",").map((o) => o.trim().replace(/\/+$/, ""))].filter(Boolean);
  const base = { "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
  return origin && allowed.includes(origin) ? { ...base, "Access-Control-Allow-Origin": origin } : base;
}

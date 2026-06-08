// Stateless, tamper-evident session tokens for the LLM API. The full session
// state (master seed + answered items) is serialised and HMAC-signed, so no
// database is needed and clients can't forge a higher score by editing the
// token. The pending question is always re-derived from the seed + index, never
// stored, so the token never leaks an unanswered item's correct option.

import crypto from "crypto";
import type { SessionState } from "./engine";

const SECRET = process.env.IQ_SECRET || "70iq-dev-secret-change-me";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signSession(state: SessionState): string {
  const payload = b64url(Buffer.from(JSON.stringify(state)));
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifySession(token: string): SessionState | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = b64url(crypto.createHmac("sha256", SECRET).update(payload).digest());
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const state = JSON.parse(unb64url(payload).toString("utf8")) as SessionState;
    if (!state || typeof state.masterSeed !== "number" || !Array.isArray(state.answers)) return null;
    return state;
  } catch {
    return null;
  }
}

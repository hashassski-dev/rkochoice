import crypto from "node:crypto";
import { ADMIN_LOGIN, PASSWORD_SALT, PASSWORD_HASH, AUTH_SECRET, COOKIE_NAME, SESSION_SECONDS, authConfigured } from "./config.js";

const b64 = (s) => Buffer.from(s).toString("base64url");
const unb64 = (s) => Buffer.from(s, "base64url").toString();
const hmac = (value) => {
  if (!authConfigured()) throw new Error("AUTH_SECRET is not configured");
  return crypto.createHmac("sha256", AUTH_SECRET).update(value).digest("base64url");
};

export function verifyPassword(login, password) {
  if (login !== ADMIN_LOGIN || typeof password !== "string" || password.length > 256) return false;
  if (!/^[a-f0-9]{32,}$/i.test(PASSWORD_SALT) || !/^[a-f0-9]{128}$/i.test(PASSWORD_HASH)) return false;
  const candidate = crypto.scryptSync(password, Buffer.from(PASSWORD_SALT, "hex"), 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(PASSWORD_HASH, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createSession(req) {
  const now = Math.floor(Date.now() / 1000);
  const ua = crypto.createHash("sha256").update(req?.headers?.get("user-agent") || "").digest("hex").slice(0, 24);
  const payload = JSON.stringify({ u: ADMIN_LOGIN, iat: now, exp: now + SESSION_SECONDS, ua, n: crypto.randomBytes(12).toString("hex") });
  const body = b64(payload);
  return `${body}.${hmac(body)}`;
}

export function parseCookies(req) {
  const raw = req.headers.get("cookie") || "";
  const out = {};
  for (const part of raw.split(";")) {
    const v = part.trim();
    if (!v) continue;
    const i = v.indexOf("=");
    if (i <= 0) continue;
    try { out[decodeURIComponent(v.slice(0, i))] = decodeURIComponent(v.slice(i + 1)); } catch {}
  }
  return out;
}

export function getSession(req) {
  if (!authConfigured()) return null;
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token || token.length > 4096) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra) return null;
  let expected;
  try { expected = hmac(body); } catch { return null; }
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(unb64(body));
    const now = Math.floor(Date.now() / 1000);
    if (data.u !== ADMIN_LOGIN || !Number.isFinite(data.exp) || data.exp < now || data.iat > now + 60) return null;
    const ua = crypto.createHash("sha256").update(req.headers.get("user-agent") || "").digest("hex").slice(0, 24);
    if (data.ua && data.ua !== ua) return null;
    return { ...data, token };
  } catch { return null; }
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}; Priority=High`;
}
export function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Priority=High`;
}
export function csrfFor(session) { try { return hmac(`csrf:${session.token}`); } catch { return ""; } }
export function verifyCsrf(req, session) {
  const sent = req.headers.get("x-csrf-token") || "";
  const expected = csrfFor(session);
  const a = Buffer.from(sent), b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

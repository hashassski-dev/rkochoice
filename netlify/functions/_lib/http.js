export const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff"
};

export function json(data, init = {}) {
  const headers = { ...JSON_HEADERS, ...(init.headers || {}) };
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return origin === new URL(req.url).origin; } catch { return false; }
}

export async function readJsonLimited(req, maxBytes) {
  const type = (req.headers.get("content-type") || "").toLowerCase();
  if (!type.startsWith("application/json")) throw Object.assign(new Error("Unsupported content type"), { status: 415 });
  const len = Number(req.headers.get("content-length") || 0);
  if (len && len > maxBytes) throw Object.assign(new Error("Request too large"), { status: 413 });
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw Object.assign(new Error("Request too large"), { status: 413 });
  try { return JSON.parse(text || "{}"); } catch { throw Object.assign(new Error("Bad JSON"), { status: 400 }); }
}

export function expectedPath(req, path) {
  try { return new URL(req.url).pathname === path; } catch { return false; }
}

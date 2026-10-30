import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import { getSession, verifyCsrf } from "./_lib/auth.js";
import { json, sameOrigin, expectedPath } from "./_lib/http.js";

const MAX_BYTES = 2_800_000;
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export default async (req) => {
  if (!expectedPath(req, "/api/admin/image")) return new Response("Not Found", { status: 404 });
  const session = getSession(req);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, { status: 403 });
  if (!verifyCsrf(req, session)) return json({ error: "CSRF" }, { status: 403 });

  const contentType = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!TYPES.has(contentType)) return json({ error: "Поддерживаются PNG, JPG/JPEG и WebP" }, { status: 415 });
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared && declared > MAX_BYTES) return json({ error: "Картинка слишком большая после сжатия. Максимум 2.8 МБ" }, { status: 413 });

  const buf = await req.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > MAX_BYTES) return json({ error: "Картинка слишком большая после сжатия. Максимум 2.8 МБ" }, { status: 413 });

  const id = crypto.randomUUID();
  const key = `card-images/${id}`;
  const store = getStore("rko-puls-card-images");
  await store.set(key, buf, {
    metadata: {
      contentType,
      size: buf.byteLength,
      createdAt: new Date().toISOString()
    }
  });

  return json({ ok: true, id, url: `/api/card-image?id=${id}`, contentType, size: buf.byteLength });
};

export const config = {
  path: "/api/admin/image",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] }
};

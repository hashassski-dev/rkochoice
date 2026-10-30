import { getStore } from "@netlify/blobs";
import { expectedPath } from "./_lib/http.js";

export default async (req) => {
  if (!expectedPath(req, "/api/card-image")) return new Response("Not Found", { status: 404 });
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method Not Allowed", { status: 405 });
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  if (!/^[a-f0-9-]{16,80}$/i.test(id)) return new Response("Not Found", { status: 404 });

  const store = getStore("rko-puls-card-images");
  const key = `card-images/${id}`;
  const item = await store.getWithMetadata(key, { type: "arrayBuffer", consistency: "strong" });
  if (!item) return new Response("Not Found", { status: 404 });
  const type = item.metadata?.contentType || "application/octet-stream";
  const headers = {
    "Content-Type": type,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff"
  };
  if (req.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(item.data, { status: 200, headers });
};

export const config = { path: "/api/card-image" };

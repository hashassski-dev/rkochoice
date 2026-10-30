import { json, expectedPath } from "./_lib/http.js";
export default async (req) => {
  if (!expectedPath(req, "/api/health")) return new Response("Not Found", { status:404 });
  if (req.method !== "GET") return new Response("Method Not Allowed", { status:405 });
  return json({ ok:true, service:"rko-showcase", time:new Date().toISOString() }, { headers:{"Cache-Control":"no-store"} });
};
export const config = { path: "/api/health" };

import { getSession, csrfFor } from "./_lib/auth.js";
import { json, expectedPath } from "./_lib/http.js";
export default async (req) => {
  if (!expectedPath(req, "/api/session")) return new Response("Not Found", { status:404 });
  if (req.method !== "GET") return new Response("Method Not Allowed", { status:405 });
  const session = getSession(req);
  if (!session) return json({ authenticated:false }, { status:401 });
  return json({ authenticated:true, user:session.u, csrf:csrfFor(session) });
};
export const config = { path: "/api/session" };

import { clearCookie, getSession, verifyCsrf } from "./_lib/auth.js";
import { json, sameOrigin, expectedPath } from "./_lib/http.js";
export default async (req) => {
  if (!expectedPath(req, "/api/logout")) return new Response("Not Found", { status:404 });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status:405 });
  if (!sameOrigin(req)) return json({error:"Forbidden"},{status:403});
  const session = getSession(req);
  if (session && !verifyCsrf(req, session)) return json({error:"CSRF"},{status:403});
  return json({ ok:true }, { headers:{ "Set-Cookie": clearCookie() } });
};
export const config = { path: "/api/logout" };

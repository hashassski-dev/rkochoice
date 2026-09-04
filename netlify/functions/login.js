import { verifyPassword, createSession, sessionCookie } from "./_lib/auth.js";
import { authConfigured, MAX_LOGIN_BODY } from "./_lib/config.js";
import { json, sameOrigin, readJsonLimited, expectedPath } from "./_lib/http.js";

export default async (req) => {
  if (!expectedPath(req, "/api/login")) return new Response("Not Found", { status:404 });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status:405, headers:{Allow:"POST"} });
  if (!authConfigured()) return json({ ok:false, error:"Панель не настроена: задайте AUTH_SECRET в Netlify" }, { status:503 });
  if (!sameOrigin(req)) return json({ ok:false, error:"Forbidden" }, { status:403 });
  let body; try { body = await readJsonLimited(req, MAX_LOGIN_BODY); } catch(e) { return json({ok:false,error:e.message},{status:e.status||400}); }
  if (!verifyPassword(body.login, body.password)) return json({ ok:false, error:"Неверный логин или пароль" }, { status:401 });
  const token = createSession(req);
  return json({ ok:true }, { headers:{ "Set-Cookie": sessionCookie(token) } });
};

export const config = {
  path: "/api/login",
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] }
};

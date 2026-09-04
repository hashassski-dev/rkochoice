import crypto from "node:crypto";
import { getSession, verifyCsrf } from "./_lib/auth.js";
import { MAX_ADMIN_BODY } from "./_lib/config.js";
import { loadCards, saveCards } from "./_lib/cards-store.js";
import { normalizeCard } from "./_lib/validation.js";
import { json, sameOrigin, readJsonLimited, expectedPath } from "./_lib/http.js";

export default async (req) => {
  if (!expectedPath(req, "/api/admin/cards")) return new Response("Not Found", { status:404 });
  const session = getSession(req);
  if (!session) return json({ error:"Unauthorized" }, { status:401 });
  if (req.method === "GET") return json(await loadCards());
  if (!["POST","PUT","DELETE"].includes(req.method)) return new Response("Method Not Allowed", { status:405 });
  if (!sameOrigin(req)) return json({ error:"Forbidden" }, { status:403 });
  if (!verifyCsrf(req, session)) return json({ error:"CSRF" }, { status:403 });
  let body; try { body = await readJsonLimited(req, MAX_ADMIN_BODY); } catch(e) { return json({error:e.message},{status:e.status||400}); }
  let cards = await loadCards();
  if (req.method === "DELETE") {
    const id = String(body.id || "").slice(0,120);
    cards = cards.filter(c => c.id !== id);
  } else {
    let card; try { card = normalizeCard(body, () => crypto.randomUUID()); } catch(e) { return json({error:e.message},{status:e.status||400}); }
    const i = cards.findIndex(c=>c.id===card.id);
    if (i>=0) cards[i]=card; else cards.push(card);
  }
  if (cards.length > 250) return json({error:"Слишком много карточек"},{status:400});
  await saveCards(cards);
  return json({ ok:true, cards });
};

export const config = {
  path: "/api/admin/cards",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] }
};

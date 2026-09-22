import { getSession, verifyCsrf } from "./_lib/auth.js";
import { MAX_ADMIN_BODY } from "./_lib/config.js";
import { loadCardsDocument } from "./_lib/cards-store.js";
import { loadLeadPagesDocument, saveLeadPages } from "./_lib/lead-pages-store.js";
import { json, sameOrigin, readJsonLimited, expectedPath } from "./_lib/http.js";

const clean = (v, max = 500) => String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const validHttpUrl = (v) => {
  const s = clean(v, 1200);
  if (!s) return "";
  try { const u = new URL(s); return ["http:", "https:"].includes(u.protocol) ? u.toString() : ""; } catch { return ""; }
};
const RESERVED = new Set(["api","panel","assets","data","legal","privacy","robots","sitemap","lead","index"]);
function normalizeSlug(v) {
  const s = clean(v, 64).replace(/\s+/g, "-");
  if (!s || RESERVED.has(s.toLowerCase())) throw Object.assign(new Error("Недопустимый ник/slug"), { status: 400 });
  if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,63}$/u.test(s)) throw Object.assign(new Error("В адресе можно использовать буквы, цифры, - и _"), { status: 400 });
  return s;
}

export default async (req) => {
  if (!expectedPath(req, "/api/admin/lead-pages")) return new Response("Not Found", { status: 404 });
  const session = getSession(req);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  if (req.method === "GET") {
    const [doc, cardsDoc] = await Promise.all([loadLeadPagesDocument(), loadCardsDocument()]);
    const cards = cardsDoc.offers.map(c => ({
      id: c.id, name: c.name, tariff: c.tariff, price: c.price, image: c.image,
      types: c.types, link: c.link, active: c.active !== false, sort: c.sort
    }));
    return json({ ...doc, cards });
  }

  if (!["POST", "PUT", "DELETE"].includes(req.method)) return new Response("Method Not Allowed", { status: 405 });
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, { status: 403 });
  if (!verifyCsrf(req, session)) return json({ error: "CSRF" }, { status: 403 });

  let body;
  try { body = await readJsonLimited(req, MAX_ADMIN_BODY); }
  catch (e) { return json({ error: e.message }, { status: e.status || 400 }); }

  const doc = await loadLeadPagesDocument();
  let pages = [...doc.pages];

  if (req.method === "DELETE") {
    let slug;
    try { slug = normalizeSlug(body.slug); } catch (e) { return json({ error: e.message }, { status: e.status || 400 }); }
    pages = pages.filter(p => p.slug !== slug);
    return json({ ok: true, document: await saveLeadPages(pages) });
  }

  let slug;
  try { slug = normalizeSlug(body.slug); } catch (e) { return json({ error: e.message }, { status: e.status || 400 }); }
  const title = clean(body.title, 140) || "Подборка банковских предложений";
  const subtitle = clean(body.subtitle, 360) || "Мы собрали предложения, которые подходят под вашу задачу.";
  const rawOffers = Array.isArray(body.offers) ? body.offers : [];
  if (!rawOffers.length) return json({ error: "Выберите хотя бы один оффер" }, { status: 400 });
  if (rawOffers.length > 30) return json({ error: "Слишком много офферов" }, { status: 400 });

  const cardsDoc = await loadCardsDocument();
  const validIds = new Set(cardsDoc.offers.map(c => c.id));
  const seen = new Set();
  const offers = [];
  for (const item of rawOffers) {
    const id = clean(item?.id, 120);
    if (!id || !validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    const rawLink = clean(item?.link, 1200);
    const link = validHttpUrl(rawLink);
    if (rawLink && !link) return json({ error: `Некорректная ссылка у оффера ${id}` }, { status: 400 });
    offers.push({ id, link, sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : offers.length * 10 });
  }
  if (!offers.length) return json({ error: "Выбранные офферы не найдены" }, { status: 400 });

  const now = new Date().toISOString();
  const old = pages.find(p => p.slug === slug);
  const page = {
    slug,
    title,
    subtitle,
    offers,
    created_at: old?.created_at || now,
    updated_at: now
  };
  const i = pages.findIndex(p => p.slug === slug);
  if (i >= 0) pages[i] = page; else pages.push(page);
  if (pages.length > 500) return json({ error: "Слишком много страниц" }, { status: 400 });
  const saved = await saveLeadPages(pages);
  return json({ ok: true, page, document: saved });
};

export const config = {
  path: "/api/admin/lead-pages",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] }
};

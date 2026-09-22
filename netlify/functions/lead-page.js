import { loadCardsDocument } from "./_lib/cards-store.js";
import { loadLeadPagesDocument } from "./_lib/lead-pages-store.js";
import { json, expectedPath } from "./_lib/http.js";

const publicOffer = (c, link, sort) => ({
  id: c.id, name: c.name, tariff: c.tariff, price: c.price,
  description: c.description, details: c.details,
  types: Array.isArray(c.types) ? c.types : [],
  price_mode: c.price_mode || "any",
  search_tags: Array.isArray(c.search_tags) ? c.search_tags : [],
  link: link || c.link || "", image: c.image,
  sort: Number.isFinite(Number(sort)) ? Number(sort) : c.sort,
  is_ad: c.is_ad === true,
  advertiser: c.is_ad ? c.advertiser || "" : "",
  erid: c.is_ad ? c.erid || "" : ""
});

export default async (req) => {
  if (!expectedPath(req, "/api/lead-page")) return new Response("Not Found", { status: 404 });
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim().slice(0, 64);
  if (!slug) return json({ error: "Not found" }, { status: 404 });

  const [pagesDoc, cardsDoc] = await Promise.all([loadLeadPagesDocument(), loadCardsDocument()]);
  const page = pagesDoc.pages.find(p => p.slug === slug);
  if (!page) return json({ error: "Not found" }, { status: 404 });
  const byId = new Map(cardsDoc.offers.filter(c => c.active !== false).map(c => [c.id, c]));
  const offers = page.offers
    .map(x => byId.has(x.id) ? publicOffer(byId.get(x.id), x.link, x.sort) : null)
    .filter(Boolean)
    .sort((a,b)=>(a.sort??100)-(b.sort??100));

  return json({ slug: page.slug, title: page.title, subtitle: page.subtitle, offers, updated_at: page.updated_at });
};

export const config = { path: "/api/lead-page" };

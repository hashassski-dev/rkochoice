import { loadCardsDocument } from "./_lib/cards-store.js";
import { expectedPath } from "./_lib/http.js";

// Only fields required by the public storefront are exposed here.
// partner/admin_note and other internal CRM fields never leave the admin API.
const publicOffer = (c) => ({
  id:c.id,
  name:c.name,
  tariff:c.tariff,
  price:c.price,
  description:c.description,
  details:c.details,
  types:Array.isArray(c.types)?c.types:[],
  price_mode:c.price_mode || "any",
  search_tags:Array.isArray(c.search_tags)?c.search_tags:[],
  link:c.link,
  image:c.image,
  sort:c.sort,
  is_ad:c.is_ad===true,
  advertiser:c.is_ad?c.advertiser||"":"",
  erid:c.is_ad?c.erid||"":""
});

export default async (req) => {
  if (!expectedPath(req, "/api/cards")) return new Response("Not Found", { status:404 });
  if (req.method !== "GET") return new Response("Method Not Allowed", { status:405 });
  const doc = await loadCardsDocument();
  const offers = doc.offers
    .filter(c => c.active !== false)
    .sort((a,b)=>(a.sort??100)-(b.sort??100))
    .map(publicOffer);
  return Response.json({ version:doc.version, updated_at:doc.updated_at, offers }, {
    headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
  });
};
export const config = { path: "/api/cards" };

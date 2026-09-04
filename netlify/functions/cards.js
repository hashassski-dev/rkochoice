import { loadCards } from "./_lib/cards-store.js";
import { expectedPath } from "./_lib/http.js";
const publicCard = (c) => ({
  id:c.id, name:c.name, tariff:c.tariff, price:c.price, description:c.description, details:c.details,
  types:Array.isArray(c.types)?c.types:[], link:c.link, image:c.image, sort:c.sort, active:c.active,
  is_ad:c.is_ad===true, advertiser:c.is_ad?c.advertiser||"":"", erid:c.is_ad?c.erid||"":""
});
export default async (req) => {
  if (!expectedPath(req, "/api/cards")) return new Response("Not Found", { status:404 });
  if (req.method !== "GET") return new Response("Method Not Allowed", { status:405 });
  const cards = (await loadCards()).filter(c => c.active !== false).sort((a,b)=>(a.sort??100)-(b.sort??100)).map(publicCard);
  return Response.json(cards, { headers:{"Cache-Control":"public, max-age=60, s-maxage=300, stale-while-revalidate=600","X-Content-Type-Options":"nosniff"} });
};
export const config = { path: "/api/cards" };

const clean = (v, max=5000) => String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0,max);
const validHttpUrl = (v) => {
  const s = clean(v, 1200);
  if (!s) return "";
  try { const u = new URL(s); return ["http:","https:"].includes(u.protocol) ? u.toString() : ""; } catch { return ""; }
};
const validImage = (v) => {
  const s = clean(v, 800000);
  if (!s) return "";
  if (/^\/assets\/[a-z0-9_./-]+$/i.test(s)) return s;
  if (/^data:image\/(?:webp|png|jpeg);base64,[a-z0-9+/=]+$/i.test(s)) return s;
  return "";
};

export function normalizeCard(c, idFactory) {
  const advertiser = clean(c.advertiser, 220);
  const isAd = c.is_ad === true;
  const erid = clean(c.erid, 160);
  const link = validHttpUrl(c.link);
  const card = {
    id: clean(c.id,120) || idFactory(),
    name: clean(c.name,120), tariff: clean(c.tariff,160), price: clean(c.price,80),
    description: clean(c.description,600), details: clean(c.details,2500),
    types: Array.isArray(c.types) ? [...new Set(c.types.filter(v=>["ИП","ООО"].includes(v)))] : [],
    link, image: validImage(c.image), partner: clean(c.partner,160),
    admin_note: clean(c.admin_note,1200), sort: Number.isFinite(Number(c.sort)) ? Math.max(-9999, Math.min(9999, Number(c.sort))) : 100,
    active: c.active !== false,
    is_ad: isAd,
    advertiser,
    erid
  };
  if (!card.name || !card.tariff) throw Object.assign(new Error("Укажите банк и тариф"), { status: 400 });
  if (c.link && !card.link) throw Object.assign(new Error("Партнерская ссылка должна начинаться с http:// или https://"), { status: 400 });
  if (c.image && !card.image) throw Object.assign(new Error("Допустимы только локальные изображения или PNG/JPEG/WebP"), { status: 400 });
  if (isAd && !advertiser) throw Object.assign(new Error("Для рекламной карточки укажите рекламодателя"), { status: 400 });
  return card;
}

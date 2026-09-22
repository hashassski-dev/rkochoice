const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
let offers = [];

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const safeHttpUrl = s => { try { const u = new URL(String(s || ''), location.origin); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const safeImage = s => { const v = String(s || ''); return /^\/assets\/[a-z0-9_./-]+$/i.test(v) || /^data:image\/(?:webp|png|jpeg);base64,/i.test(v) ? v : '/assets/bank-default.svg'; };
const textOf = c => [c.name, c.tariff, c.description, c.details, c.partner, ...(Array.isArray(c.search_tags) ? c.search_tags : [])].filter(Boolean).join(' ').toLowerCase();

function offerKind(c) {
  const source = [c.tariff, c.description, c.details, c.admin_note, ...(Array.isArray(c.search_tags) ? c.search_tags : [])].filter(Boolean).join(' ').toLowerCase();
  return /(регбизнес|регистрация бизнеса|регистрация ип|регистрация ооо)/.test(source) ? 'regbiz' : 'rko';
}

function typeLabel(c) {
  const kind = offerKind(c) === 'regbiz' ? 'Регбиз' : 'РКО';
  return `<span class="chip chip-accent">${kind}</span>`;
}

function parsePriceValue(str) {
  const nums = String(str || '').replace(/\s+/g, '').match(/\d+(?:[.,]\d+)?/g);
  if (!nums || !nums.length) return Number.POSITIVE_INFINITY;
  const normalized = nums.map(v => Number(v.replace(',', '.'))).filter(Number.isFinite);
  return normalized.length ? normalized[0] : Number.POSITIVE_INFINITY;
}

function getSelectedRadio(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || '';
}

function cardHtml(c) {
  const types = (c.types || []).map(t => `<span class="chip">${esc(t)}</span>`).join('');
  const image = safeImage(c.image), link = safeHttpUrl(c.link);
  const cta = link ? `<a class="cta" href="${esc(link)}" rel="nofollow sponsored noopener noreferrer" target="_blank">Перейти к оформлению</a>` : `<span class="cta disabled">Ссылка появится позже</span>`;
  return `<article class="card offer-card" data-id="${esc(c.id)}">
    <div class="card-top">
      <img class="bank-logo" loading="lazy" src="${esc(image)}" alt="${esc(c.name)}">
      <div>
        <div class="bank-name">${esc(c.name)}</div>
        <div class="tariff-name">${esc(c.tariff)}</div>
      </div>
    </div>
    <div class="price">${esc(c.price)}</div>
    <div class="price-note">условия и итоговая стоимость уточняются у банка</div>
    <p class="short">${esc(c.description)}</p>
    <div class="chips">${typeLabel(c)}${types}</div>
    <details>
      <summary>Подробнее</summary>
      <div class="details-copy">${esc(c.details).replace(/\n/g, '<br>')}</div>
    </details>
    ${cta}
  </article>`;
}

function sectionHtml(title, items) {
  if (!items.length) return '';
  return `<section class="type-section"><div class="type-head"><h3>${title}</h3><span>${items.length} офферов</span></div><div class="cards">${items.map(cardHtml).join('')}</div></section>`;
}

function sortOffers(list, mode) {
  const arr = [...list];
  if (mode === 'price-desc') {
    arr.sort((a, b) => parsePriceValue(b.price) - parsePriceValue(a.price) || (a.sort ?? 1000) - (b.sort ?? 1000));
  } else if (mode === 'price-asc') {
    arr.sort((a, b) => parsePriceValue(a.price) - parsePriceValue(b.price) || (a.sort ?? 1000) - (b.sort ?? 1000));
  } else if (mode === 'name-asc') {
    arr.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
  } else if (mode === 'name-desc') {
    arr.sort((a, b) => String(b.name || '').localeCompare(String(a.name || ''), 'ru'));
  } else {
    arr.sort((a, b) => (a.sort ?? 1000) - (b.sort ?? 1000));
  }
  return arr;
}

function apply() {
  const q = ($('#search')?.value || '').trim().toLowerCase();
  const type = getSelectedRadio('type');
  const product = getSelectedRadio('product');
  const price = getSelectedRadio('price');
  const sort = getSelectedRadio('sort') || 'default';

  const shown = offers.filter(c => {
    const kinds = offerKind(c);
    const mode = c.price_mode || 'any';
    const matchesQuery = !q || textOf(c).includes(q);
    const matchesType = !type || (c.types || []).includes(type);
    const matchesProduct = !product || kinds === product;
    const matchesPrice = !price || mode === price || mode === 'any';
    return matchesQuery && matchesType && matchesProduct && matchesPrice;
  });

  const sorted = sortOffers(shown, sort);
  const ip = sorted.filter(c => (c.types || []).includes('ИП'));
  const ooo = sorted.filter(c => (c.types || []).includes('ООО'));

  const html = sectionHtml('ИП', ip) + sectionHtml('ООО', ooo);
  $('#cards').innerHTML = html || '<div class="empty">По таким параметрам ничего не нашли.</div>';

  const headingsCount = (type ? sorted.length : ip.length + ooo.length);
  $('#resultCount').textContent = type ? `Найдено: ${sorted.length}` : `Показано карточек: ${headingsCount}`;
}

async function load() {
  try {
    const r = await fetch('/api/cards', { cache: 'no-store', credentials: 'same-origin' });
    if (!r.ok) throw new Error('api');
    const doc = await r.json();
    offers = (Array.isArray(doc) ? doc : (Array.isArray(doc?.offers) ? doc.offers : [])).filter(c => c && c.active !== false);
  } catch {
    try {
      const fr = await fetch('/data/offers.json', { cache: 'no-store' });
      if (!fr.ok) throw new Error('data');
      const doc = await fr.json();
      offers = (Array.isArray(doc) ? doc : (Array.isArray(doc?.offers) ? doc.offers : [])).filter(c => c && c.active !== false);
    } catch {
      offers = [];
    }
  }
  apply();
}

$('#search')?.addEventListener('input', apply);
['type', 'product', 'price', 'sort'].forEach(name => $$(`input[name="${name}"]`).forEach(el => el.addEventListener('change', apply)));

$('#reset')?.addEventListener('click', () => {
  $('#search').value = '';
  const defaults = [
    ['type', ''],
    ['product', ''],
    ['price', '']
  ];
  defaults.forEach(([name, value]) => {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  });
  const sortDefault = document.querySelector('input[name="sort"][value="default"]');
  if (sortDefault) sortDefault.checked = true;
  apply();
});

load();

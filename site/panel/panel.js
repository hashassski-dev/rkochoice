const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let csrf = '';
let cards = [];
let lastSavedAt = '';

const ASSET_IMAGES = [
  'bank-default.png',
  'alfa.png',
  'loko.png',
  'ozon.svg',
  'psb.png',
  'rshb.svg',
  'tochka.png',
  'ubrr.png',
  'uralsib.png',
  'vtb.png',
  'hero.svg',
  'rko-puls-logo.png'
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sortState = new Map();

async function api(url, opt = {}) {
  opt.credentials = 'same-origin';
  opt.headers = { ...(opt.headers || {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) };
  if (opt.body && !opt.headers['Content-Type']) opt.headers['Content-Type'] = 'application/json';
  let r;
  try { r = await fetch(url, opt); }
  catch {
    throw new Error('Нет связи с сервером. Проверь сеть или запусти сайт через netlify dev / опубликованный Netlify.');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 404) throw new Error('API панели не найден (404). Netlify не задеплоил Functions: проверь корень репозитория / Base directory, наличие netlify.toml и папки netlify/functions. Открой /api/health для проверки.');
    throw new Error(data.error || 'Ошибка запроса');
  }
  return data;
}

function assetPath(name) { return `/assets/${name}`; }
function assetNameFromPath(value) {
  const match = String(value || '').match(/^\/assets\/([^/?#]+\.(?:svg|png|jpe?g|webp))$/i);
  return match ? match[1] : '';
}
function cardSearchText(c) {
  return [
    c.id, c.name, c.tariff, c.price, c.partner, c.admin_note, c.description, c.details,
    ...(Array.isArray(c.search_tags) ? c.search_tags : []), ...(Array.isArray(c.types) ? c.types : [])
  ].filter(Boolean).join(' ').toLowerCase();
}
function compareAlpha(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), 'ru') ||
         String(a.tariff || '').localeCompare(String(b.tariff || ''), 'ru') ||
         String(a.id || '').localeCompare(String(b.id || ''), 'ru');
}
function showNotice(el, text, isError = false) {
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('error', isError);
  el.classList.remove('hidden');
}
function hideNotice(el) { if (el) el.classList.add('hidden'); }
function debounce(fn, delay = 160) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function renderAssetPicker() {
  const box = $('#assetPicker');
  if (!box) return;
  box.innerHTML = ASSET_IMAGES.map(name => `
    <button type="button" class="asset-option" data-asset="${esc(name)}" role="radio" aria-checked="false">
      <img src="${esc(assetPath(name))}" alt="">
      <span>${esc(name)}</span>
    </button>`).join('');
}
function selectAsset(name) {
  const f = $('#cardForm');
  const valid = ASSET_IMAGES.includes(name) ? name : 'bank-default.png';
  const path = assetPath(valid);
  f.elements.image.value = path;
  $('#imagePreview').src = path;
  $('#selectedAssetName').textContent = valid;
  $$('.asset-option').forEach(btn => {
    const active = btn.dataset.asset === valid;
    btn.classList.toggle('selected', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}
function clearAsset() {
  const f = $('#cardForm');
  f.elements.image.value = '';
  $('#imagePreview').src = '/assets/bank-default.png';
  $('#selectedAssetName').textContent = 'Без картинки';
  $$('.asset-option').forEach(btn => {
    btn.classList.remove('selected');
    btn.setAttribute('aria-checked', 'false');
  });
}

async function compressImageFile(file) {
  const allowed = ['image/png','image/jpeg','image/webp'];
  if (!allowed.includes(file.type)) throw new Error('Поддерживаются PNG, JPG/JPEG и WebP.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Исходный файл слишком большой. Максимум 12 МБ.');
  const bitmap = await createImageBitmap(file);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.84));
  if (!blob) blob = await new Promise(resolve => canvas.toBlob(resolve, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86));
  if (!blob) throw new Error('Не удалось обработать изображение в браузере.');
  if (blob.size > 2_800_000) {
    blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.68));
  }
  if (!blob || blob.size > 2_800_000) throw new Error('После сжатия файл все еще больше 2.8 МБ. Возьми картинку меньшего размера.');
  return blob;
}

async function uploadCardImage(file) {
  const message = $('#uploadMessage');
  const progress = $('#uploadProgress');
  const bar = progress?.querySelector('span');
  try {
    if (progress) progress.classList.remove('hidden');
    if (bar) bar.style.width = '18%';
    if (message) message.textContent = 'Сжимаю изображение...';
    const blob = await compressImageFile(file);
    if (bar) bar.style.width = '48%';
    if (message) message.textContent = `Отправляю ${(blob.size / 1024).toFixed(0)} КБ на сервер...`;
    const r = await fetch('/api/admin/image', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': csrf, 'Content-Type': blob.type || 'image/webp' },
      body: blob
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Ошибка загрузки (${r.status})`);
    if (bar) bar.style.width = '100%';
    const f = $('#cardForm');
    f.elements.image.value = data.url;
    $('#imagePreview').src = data.url;
    $('#selectedAssetName').textContent = 'Загружено на сервер';
    $$('.asset-option').forEach(btn => { btn.classList.remove('selected'); btn.setAttribute('aria-checked','false'); });
    if (message) message.textContent = `Готово · ${(data.size / 1024).toFixed(0)} КБ`;
    setTimeout(() => { if (progress) progress.classList.add('hidden'); if (bar) bar.style.width = '0'; }, 900);
  } catch (err) {
    if (message) message.textContent = err.message;
    if (progress) progress.classList.add('hidden');
    if (bar) bar.style.width = '0';
    throw err;
  }
}

$('#imageFile')?.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try { await uploadCardImage(file); }
  catch (err) { showNotice($('#formMessage'), err.message, true); }
  finally { e.target.value = ''; }
});

const uploadBox = $('#imageUploadBox');
['dragenter','dragover'].forEach(type => uploadBox?.addEventListener(type, e => { e.preventDefault(); uploadBox.classList.add('dragging'); }));
['dragleave','drop'].forEach(type => uploadBox?.addEventListener(type, e => { e.preventDefault(); uploadBox.classList.remove('dragging'); }));
uploadBox?.addEventListener('drop', async e => {
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  try { await uploadCardImage(file); }
  catch (err) { showNotice($('#formMessage'), err.message, true); }
});

async function check() {
  try {
    const s = await api('/api/session');
    csrf = s.csrf;
    $('#loginView').classList.add('hidden');
    $('#panelView').classList.remove('hidden');
    await loadCards();
  } catch (err) {
    $('#loginView').classList.remove('hidden');
    $('#panelView').classList.add('hidden');
    if (err?.message && /API панели не найден/.test(err.message)) showNotice($('#loginError'), err.message, true);
  }
}


$('#loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ login: f.get('login'), password: f.get('password') }) });
    hideNotice($('#loginError'));
    await check();
  } catch (err) {
    showNotice($('#loginError'), err.message, true);
  }
});
$('#logout')?.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  csrf = '';
  location.reload();
});

async function loadCards() {
  const doc = await api('/api/admin/cards');
  cards = Array.isArray(doc) ? doc : (doc.offers || []);
  lastSavedAt = doc.updated_at || '';
  sortState.clear();
  cards.forEach((c, i) => sortState.set(c.id, i));
  renderList();
  syncBulkEditorFromCards();
}

function matchesType(c, mode) {
  const types = Array.isArray(c.types) ? c.types : [];
  if (mode === 'ip') return types.length === 1 && types.includes('ИП');
  if (mode === 'ooo') return types.length === 1 && types.includes('ООО');
  if (mode === 'both') return types.includes('ИП') && types.includes('ООО');
  return true;
}
function matchesStatus(c, mode) {
  if (mode === 'active') return c.active !== false;
  if (mode === 'hidden') return c.active === false;
  return true;
}
function sortCards(list, mode) {
  const arr = [...list];
  if (mode === 'name-desc') arr.sort((a, b) => compareAlpha(b, a));
  else if (mode === 'updated') arr.sort((a, b) => (sortState.get(b.id) ?? 0) - (sortState.get(a.id) ?? 0));
  else arr.sort(compareAlpha);
  return arr;
}
function filteredCards() {
  const q = ($('#cardSearch')?.value || '').trim().toLowerCase();
  const type = $('#typeFilter')?.value || 'all';
  const status = $('#statusFilter')?.value || 'all';
  const sortMode = $('#sortMode')?.value || 'name-asc';
  return sortCards(cards.filter(c => (!q || cardSearchText(c).includes(q)) && matchesType(c, type) && matchesStatus(c, status)), sortMode);
}
function cardTypesLabel(c) {
  const types = Array.isArray(c.types) ? c.types : [];
  if (types.includes('ИП') && types.includes('ООО')) return 'ИП, ООО';
  if (types.includes('ИП')) return 'Только ИП';
  if (types.includes('ООО')) return 'Только ООО';
  return 'Без типа';
}
function renderList() {
  const list = filteredCards();
  $('#cardsSummary').textContent = `${list.length} карточек${lastSavedAt ? ` · обновлено ${new Date(lastSavedAt).toLocaleString('ru-RU')}` : ''}`;
  $('#adminList').innerHTML = list.map(c => `
    <div class="admin-item">
      <img loading="lazy" src="${esc(c.image || '/assets/bank-default.png')}" alt="">
      <div>
        <strong>${esc(c.name)} · ${esc(c.tariff)}</strong>
        <div class="admin-meta">${esc(c.price || 'Без цены')} · ${esc(cardTypesLabel(c))} · ${c.active === false ? 'скрыта' : 'активна'}${c.is_ad ? ' · реклама' : ''}</div>
        <div class="admin-meta">${esc(c.partner || 'Партнерка не указана')}</div>
        <div class="admin-meta">Ссылка: ${c.link ? esc(c.link) : 'не задана'}</div>
        <div class="admin-note">${esc(c.admin_note || '')}</div>
        ${c.is_ad ? `<div class="admin-meta">Рекламодатель: ${esc(c.advertiser || 'не указан')}${c.erid ? ` · erid: ${esc(c.erid)}` : ''}</div>` : ''}
      </div>
      <div class="admin-actions">
        <button class="btn btn-soft" data-edit="${esc(c.id)}">Изменить</button>
        <button class="btn btn-danger" data-del="${esc(c.id)}">Удалить</button>
      </div>
    </div>`).join('') || '<div class="empty">Ничего не найдено.</div>';
}

$('#adminList')?.addEventListener('click', async e => {
  const edit = e.target.dataset.edit;
  const del = e.target.dataset.del;
  if (edit) {
    const c = cards.find(x => x.id === edit);
    if (c) fill(c);
  }
  if (del && confirm('Удалить карточку?')) {
    try {
      await api('/api/admin/cards', { method: 'DELETE', body: JSON.stringify({ id: del }) });
      await loadCards();
    } catch (err) {
      showNotice($('#formMessage'), err.message, true);
    }
  }
});

function fill(c) {
  const f = $('#cardForm');
  ['id', 'name', 'tariff', 'price', 'description', 'details', 'link', 'partner', 'admin_note', 'image', 'advertiser', 'erid', 'price_mode', 'search_tags'].forEach(k => {
    if (f.elements[k]) f.elements[k].value = k === 'search_tags' ? (c.search_tags || []).join(', ') : (c[k] ?? '');
  });
  f.elements.type_ip.checked = (c.types || []).includes('ИП');
  f.elements.type_ooo.checked = (c.types || []).includes('ООО');
  f.elements.active.checked = c.active !== false;
  f.elements.is_ad.checked = c.is_ad === true;
  const asset = assetNameFromPath(c.image);
  if (asset && ASSET_IMAGES.includes(asset)) {
    selectAsset(asset);
  } else if (c.image) {
    f.elements.image.value = c.image;
    $('#imagePreview').src = c.image;
    $('#selectedAssetName').textContent = 'Текущая картинка';
  } else {
    clearAsset();
  }
  $('#formMode').textContent = `Редактирование · ${c.name}`;
  $('#cancelEdit').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function resetForm() {
  const f = $('#cardForm');
  f.reset();
  f.elements.id.value = '';
  f.elements.type_ip.checked = true;
  f.elements.type_ooo.checked = true;
  f.elements.active.checked = true;
  f.elements.is_ad.checked = false;
  f.elements.price_mode.value = 'any';
  selectAsset('bank-default.png');
  $('#formMode').textContent = 'Новая карточка';
  $('#cancelEdit').classList.add('hidden');
}

$('#cancelEdit')?.addEventListener('click', resetForm);
$('#clearImage')?.addEventListener('click', clearAsset);
$('#assetPicker')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-asset]');
  if (btn) selectAsset(btn.dataset.asset);
});

$('#cardForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.currentTarget;
  const submit = f.querySelector('button[type="submit"]');
  const d = Object.fromEntries(new FormData(f).entries());
  d.types = [f.elements.type_ip.checked ? 'ИП' : null, f.elements.type_ooo.checked ? 'ООО' : null].filter(Boolean);
  d.active = f.elements.active.checked;
  d.is_ad = f.elements.is_ad.checked;
  d.search_tags = String(d.search_tags || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!d.types.length) {
    showNotice($('#formMessage'), 'Выбери хотя бы один тип: ИП или ООО.', true);
    return;
  }
  const method = d.id ? 'PUT' : 'POST';
  submit.disabled = true;
  submit.textContent = 'Сохраняю...';
  hideNotice($('#formMessage'));
  try {
    const result = await api('/api/admin/cards', { method, body: JSON.stringify(d) });
    cards = result.document?.offers || cards;
    lastSavedAt = result.document?.updated_at || lastSavedAt;
    const savedCard = cards.find(x => x.id === (d.id || result.card?.id || '')) || cards.find(x => x.name === d.name && x.tariff === d.tariff);
    if (!savedCard) throw new Error('Сервер ответил, но карточка не нашлась после сохранения. Обнови список и проверь данные.');
    await loadCards();
    resetForm();
    showNotice($('#formMessage'), 'Сохранено и перепроверено на сервере.');
    setTimeout(() => hideNotice($('#formMessage')), 2200);
  } catch (err) {
    showNotice($('#formMessage'), err.message, true);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Сохранить';
  }
});

function serializeCardBlock(c) {
  const fields = [
    `id: ${c.id || ''}`,
    `name: ${c.name || ''}`,
    `tariff: ${c.tariff || ''}`,
    `price: ${c.price || ''}`,
    `types: ${(c.types || []).join(', ')}`,
    `active: ${c.active !== false}`,
    `is_ad: ${c.is_ad === true}`,
    `price_mode: ${c.price_mode || 'any'}`,
    `image: ${c.image || ''}`,
    `link: ${c.link || ''}`,
    `partner: ${c.partner || ''}`,
    `search_tags: ${(c.search_tags || []).join(', ')}`,
    `advertiser: ${c.advertiser || ''}`,
    `erid: ${c.erid || ''}`,
    `description:::\n${c.description || ''}\n:::`,
    `details:::\n${c.details || ''}\n:::`,
    `admin_note:::\n${c.admin_note || ''}\n:::`
  ];
  return fields.join('\n');
}
function syncBulkEditorFromCards() {
  const area = $('#bulkEditor');
  if (!area) return;
  const list = sortCards(cards, 'name-asc');
  area.value = list.map(serializeCardBlock).join('\n\n---\n\n');
}
function parseBoolean(v) {
  return /^(true|1|yes|да)$/i.test(String(v || '').trim());
}
function parseBulkEditor(text) {
  const blocks = String(text || '').split(/\n\s*---+\s*\n/g).map(s => s.trim()).filter(Boolean);
  if (!blocks.length) throw new Error('Список пустой.');
  return blocks.map((block, index) => {
    const obj = {};
    const lines = block.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.trim()) continue;
      const multi = line.match(/^([a-z_]+):::\s*$/i);
      if (multi) {
        const key = multi[1];
        const out = [];
        i += 1;
        while (i < lines.length && lines[i].trim() !== ':::') {
          out.push(lines[i]);
          i += 1;
        }
        if (i >= lines.length) throw new Error(`Карточка ${index + 1}: поле ${key} не закрыто строкой :::`);
        obj[key] = out.join('\n').trim();
        continue;
      }
      const single = line.match(/^([a-z_]+):\s*(.*)$/i);
      if (!single) throw new Error(`Карточка ${index + 1}: не удалось разобрать строку "${line}"`);
      obj[single[1]] = single[2];
    }
    if (!obj.name || !obj.tariff) throw new Error(`Карточка ${index + 1}: обязательно укажи name и tariff.`);
    const types = String(obj.types || '').split(',').map(s => s.trim()).filter(Boolean);
    return {
      id: obj.id || '',
      name: obj.name || '',
      tariff: obj.tariff || '',
      price: obj.price || '',
      types,
      active: parseBoolean(obj.active || 'true'),
      is_ad: parseBoolean(obj.is_ad || 'false'),
      price_mode: ['zero', 'paid', 'any'].includes(obj.price_mode) ? obj.price_mode : 'any',
      image: obj.image || '',
      link: obj.link || '',
      partner: obj.partner || '',
      search_tags: String(obj.search_tags || '').split(',').map(s => s.trim()).filter(Boolean),
      advertiser: obj.advertiser || '',
      erid: obj.erid || '',
      description: obj.description || '',
      details: obj.details || '',
      admin_note: obj.admin_note || ''
    };
  });
}

$('#toggleBulk')?.addEventListener('click', () => {
  const view = $('#bulkView');
  view.classList.toggle('hidden');
  const opened = !view.classList.contains('hidden');
  $('#toggleBulk').textContent = opened ? 'Скрыть список' : 'Режим списком';
  if (opened) syncBulkEditorFromCards();
});
$('#refreshBulk')?.addEventListener('click', syncBulkEditorFromCards);
$('#saveBulk')?.addEventListener('click', async () => {
  const btn = $('#saveBulk');
  btn.disabled = true;
  btn.textContent = 'Сохраняю все...';
  hideNotice($('#bulkMessage'));
  try {
    const parsed = parseBulkEditor($('#bulkEditor').value);
    const response = await api('/api/admin/cards', {
      method: 'PUT',
      body: JSON.stringify({ replace_all: true, offers: parsed })
    });
    cards = response.document?.offers || parsed;
    lastSavedAt = response.document?.updated_at || lastSavedAt;
    await loadCards();
    showNotice($('#bulkMessage'), `Сохранено ${parsed.length} карточек. Если какая-то запись не прошла бы, здесь появилась бы ошибка с номером карточки.`);
  } catch (err) {
    showNotice($('#bulkMessage'), err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Сохранить все';
  }
});

const rerender = debounce(renderList, 100);
$('#cardSearch')?.addEventListener('input', rerender);
$('#typeFilter')?.addEventListener('change', renderList);
$('#statusFilter')?.addEventListener('change', renderList);
$('#sortMode')?.addEventListener('change', renderList);

renderAssetPicker();
selectAsset('bank-default.png');
check();

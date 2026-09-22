const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
let offers = [];

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const safeHttpUrl = s => { try { const u = new URL(String(s || ''), location.origin); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const safeImage = s => { const v = String(s || ''); return /^\/assets\/[a-z0-9_./-]+$/i.test(v) || /^data:image\/(?:webp|png|jpeg);base64,/i.test(v) ? v : '/assets/bank-default.svg'; };
const textOf = c => [c.name,c.tariff,c.description,c.details,...(Array.isArray(c.search_tags)?c.search_tags:[])].filter(Boolean).join(' ').toLowerCase();

function offerKind(c){
  const source=[c.tariff,c.description,c.details,...(Array.isArray(c.search_tags)?c.search_tags:[])].filter(Boolean).join(' ').toLowerCase();
  return /(регбизнес|регистрация бизнеса|регистрация ип|регистрация ооо)/.test(source)?'regbiz':'rko';
}
function parsePriceValue(str){
  const nums=String(str||'').replace(/\s+/g,'').match(/\d+(?:[.,]\d+)?/g);
  if(!nums?.length)return Number.POSITIVE_INFINITY;
  return Number(nums[0].replace(',','.'));
}
function selected(name){return document.querySelector(`input[name="${name}"]:checked`)?.value||''}
function disclosure(c){return c.is_ad?`<div class="ad-disclosure">Реклама. ${esc(c.advertiser||'Рекламодатель')} ${c.erid?`· erid: ${esc(c.erid)}`:''}</div>`:''}

function cardHtml(c){
  const link=safeHttpUrl(c.link), image=safeImage(c.image), kind=offerKind(c)==='regbiz'?'РегБизнес':'РКО';
  const types=(c.types||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join('');
  return `<article class="offer-card card" data-id="${esc(c.id)}">
    <div class="offer-card-head">
      <div class="bank-identity"><div class="logo-box"><img class="bank-logo" loading="lazy" src="${esc(image)}" alt=""></div><div><div class="bank-name">${esc(c.name)}</div><div class="tariff-name">${esc(c.tariff)}</div></div></div>
      <span class="arrow-chip">↗</span>
    </div>
    <div class="offer-value"><div class="price">${esc(c.price||'Условия банка')}</div><span>базовое условие</span></div>
    <p class="short">${esc(c.description)}</p>
    <div class="chips"><span class="chip chip-accent">${kind}</span>${types}</div>
    ${disclosure(c)}
    <div class="card-actions">
      <button class="btn btn-soft detail-btn" type="button" data-detail="${esc(c.id)}">Подробнее</button>
      ${link?`<a class="btn btn-primary" href="${esc(link)}" rel="nofollow sponsored noopener noreferrer" target="_blank">Оформить</a>`:`<span class="btn btn-disabled">Ссылка позже</span>`}
    </div>
  </article>`;
}
function sectionHtml(title,items){
  if(!items.length)return '';
  return `<section class="type-section"><div class="type-head"><div><span class="type-index">${title==='ИП'?'01':'02'}</span><h3>${title}</h3></div><span>${items.length} ${items.length===1?'предложение':'предложений'}</span></div><div class="cards">${items.map(cardHtml).join('')}</div></section>`;
}
function sortOffers(list,mode){
  const arr=[...list];
  if(mode==='price-desc')arr.sort((a,b)=>parsePriceValue(b.price)-parsePriceValue(a.price)||(a.sort??1000)-(b.sort??1000));
  else if(mode==='price-asc')arr.sort((a,b)=>parsePriceValue(a.price)-parsePriceValue(b.price)||(a.sort??1000)-(b.sort??1000));
  else if(mode==='name-asc')arr.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ru'));
  else if(mode==='name-desc')arr.sort((a,b)=>String(b.name||'').localeCompare(String(a.name||''),'ru'));
  else arr.sort((a,b)=>(a.sort??1000)-(b.sort??1000));
  return arr;
}
function apply(){
  const q=($('#search')?.value||'').trim().toLowerCase(), type=selected('type'), product=selected('product'), price=selected('price'), sort=selected('sort')||'default';
  const shown=offers.filter(c=>{
    const mode=c.price_mode||'any';
    return (!q||textOf(c).includes(q))&&(!type||(c.types||[]).includes(type))&&(!product||offerKind(c)===product)&&(!price||mode===price||mode==='any');
  });
  const sorted=sortOffers(shown,sort), ip=sorted.filter(c=>(c.types||[]).includes('ИП')), ooo=sorted.filter(c=>(c.types||[]).includes('ООО'));
  $('#cards').innerHTML=sectionHtml('ИП',ip)+sectionHtml('ООО',ooo)||'<div class="empty">Ничего не нашли. Попробуйте сбросить фильтры.</div>';
  $('#resultCount').textContent=`${type?sorted.length:ip.length+ooo.length} предложений`;
}

function openSheet(id){
  const c=offers.find(x=>x.id===id); if(!c)return;
  const link=safeHttpUrl(c.link), image=safeImage(c.image);
  $('#sheetContent').innerHTML=`<div class="sheet-bank"><div class="logo-box large"><img src="${esc(image)}" alt=""></div><div><span>${esc(c.name)}</span><h2 id="sheetTitle">${esc(c.tariff)}</h2></div></div><div class="sheet-price">${esc(c.price||'Условия банка')}</div><p class="sheet-desc">${esc(c.description)}</p><div class="sheet-details">${esc(c.details).replace(/\n/g,'<br>')}</div>${disclosure(c)}${link?`<a class="btn btn-primary btn-large sheet-cta" href="${esc(link)}" rel="nofollow sponsored noopener noreferrer" target="_blank">Перейти к оформлению</a>`:''}`;
  $('#sheetBackdrop').classList.remove('hidden'); $('#detailSheet').classList.remove('hidden');
  requestAnimationFrame(()=>document.body.classList.add('sheet-open'));
}
function closeSheet(){document.body.classList.remove('sheet-open');setTimeout(()=>{$('#sheetBackdrop').classList.add('hidden');$('#detailSheet').classList.add('hidden')},180)}

async function load(){
  try{const r=await fetch('/api/cards',{cache:'no-store'});if(!r.ok)throw new Error();const doc=await r.json();offers=(doc.offers||[]).filter(Boolean)}
  catch{try{const r=await fetch('/data/offers.json',{cache:'no-store'});const doc=await r.json();offers=(doc.offers||doc||[]).filter(c=>c&&c.active!==false)}catch{offers=[]}}
  apply();
}

$('#search')?.addEventListener('input',apply);
['type','product','price','sort'].forEach(name=>$$(`input[name="${name}"]`).forEach(el=>el.addEventListener('change',apply)));
$('#reset')?.addEventListener('click',()=>{if($('#search'))$('#search').value='';[['type',''],['product',''],['price',''],['sort','default']].forEach(([n,v])=>{const el=document.querySelector(`input[name="${n}"][value="${v}"]`);if(el)el.checked=true});apply()});
$('#cards')?.addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(b)openSheet(b.dataset.detail)});
$('#sheetClose')?.addEventListener('click',closeSheet);$('#sheetBackdrop')?.addEventListener('click',closeSheet);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();if(e.key==='/'&&document.activeElement?.tagName!=='INPUT'){e.preventDefault();$('#search')?.focus()}});
load();

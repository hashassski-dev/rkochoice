const $ = s => document.querySelector(s);
let offers=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const safeHttpUrl=s=>{try{const u=new URL(String(s||''),location.origin);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}};
const safeImage=s=>{const v=String(s||'');return /^\/assets\/[a-z0-9_./-]+$/i.test(v)||/^data:image\/(?:webp|png|jpeg);base64,/i.test(v)?v:'/assets/bank-default.svg'};
function cardHtml(c){
  const types=(c.types||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join('');
  const image=safeImage(c.image), link=safeHttpUrl(c.link);
  const cta=link?`<a class="cta" href="${esc(link)}" rel="nofollow sponsored noopener noreferrer" target="_blank">Перейти к оформлению</a>`:`<span class="cta disabled">Ссылка появится позже</span>`;
  const disclosure=c.is_ad?`<div class="ad-disclosure"><strong>Реклама.</strong> ${esc(c.advertiser||c.name)}${c.erid?` · erid: ${esc(c.erid)}`:''}</div>`:(link?`<div class="ad-disclosure muted-disclosure">Партнерская ссылка</div>`:'');
  return `<article class="card offer-card" data-id="${esc(c.id)}"><div class="card-top"><img class="bank-logo" loading="lazy" src="${esc(image)}" alt="${esc(c.name)}"><div><div class="bank-name">${esc(c.name)}</div><div class="tariff-name">${esc(c.tariff)}</div></div></div><div class="price">${esc(c.price)}</div><div class="price-note">обслуживание по выбранному тарифу</div><p class="short">${esc(c.description)}</p><div class="chips">${types}</div><details><summary>Подробнее</summary><div class="details-copy">${esc(c.details).replace(/\n/g,'<br>')}</div></details>${disclosure}${cta}</article>`;
}
function apply(){
  const q=($('#search')?.value||'').trim().toLowerCase(), t=$('#type')?.value||'', p=$('#price')?.value||'';
  const shown=offers.filter(c=>{
    // search_tags and price_mode are filter-only JSON fields and are never rendered in a card.
    const hay=[c.name,c.tariff,c.description,...(c.search_tags||[])].join(' ').toLowerCase();
    const mode=c.price_mode || 'any';
    return (!q||hay.includes(q)) && (!t||(c.types||[]).includes(t)) && (!p||mode===p||mode==='any');
  });
  $('#cards').innerHTML=shown.map(cardHtml).join('')||'<div class="empty">По таким параметрам ничего не нашли.</div>';
  $('#resultCount').textContent=`Показано: ${shown.length}`;
}
async function load(){
  try{
    const r=await fetch('/api/cards',{cache:'no-store',credentials:'same-origin'}); if(!r.ok) throw 0;
    const doc=await r.json(); offers=Array.isArray(doc)?doc:(doc.offers||[]);
  } catch {
    try { const doc=await (await fetch('/data/offers.json',{cache:'no-store'})).json(); offers=doc.offers||[]; }
    catch { offers=[]; }
  }
  apply();
}
['#search','#type','#price'].forEach(s=>$(s)?.addEventListener('input',apply));
$('#reset')?.addEventListener('click',()=>{ $('#search').value='';$('#type').value='';$('#price').value='';apply(); });
load();

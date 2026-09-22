const $=s=>document.querySelector(s); let csrf='', cards=[];
const ASSET_IMAGES=[
  'bank-default.svg',
  'alfa.svg',
  'loko.svg',
  'ozon.svg',
  'psb.svg',
  'tochka.svg',
  'ubrr.svg',
  'uralsib.svg',
  'vtb.svg',
  'hero.svg'
];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
async function api(url,opt={}){
  opt.credentials='same-origin';
  opt.headers={...(opt.headers||{}),...(csrf?{'X-CSRF-Token':csrf}:{})};
  if(opt.body&&!opt.headers['Content-Type'])opt.headers['Content-Type']='application/json';
  let r; try{r=await fetch(url,opt)}catch{throw new Error('Backend не запущен. Для панели используй netlify dev или опубликованный сайт Netlify.')}
  const data=await r.json().catch(()=>({}));
  if(!r.ok){if(r.status===404)throw new Error('Netlify Functions не запущены. Live Server показывает витрину, но /panel работает через netlify dev или на Netlify.');throw new Error(data.error||'Ошибка запроса')}
  return data;
}
function assetPath(name){return `/assets/${name}`}
function assetNameFromPath(value){
  const v=String(value||'');
  const match=v.match(/^\/assets\/([^/?#]+\.svg)$/i);
  return match?match[1]:'';
}
function renderAssetPicker(){
  const box=$('#assetPicker');
  if(!box)return;
  box.innerHTML=ASSET_IMAGES.map(name=>`<button type="button" class="asset-option" data-asset="${esc(name)}" role="radio" aria-checked="false"><img src="${esc(assetPath(name))}" alt=""><span>${esc(name)}</span></button>`).join('');
}
function selectAsset(name){
  const f=$('#cardForm');
  const valid=ASSET_IMAGES.includes(name)?name:'bank-default.svg';
  const path=assetPath(valid);
  f.elements.image.value=path;
  $('#imagePreview').src=path;
  $('#selectedAssetName').textContent=valid;
  document.querySelectorAll('.asset-option').forEach(btn=>{
    const active=btn.dataset.asset===valid;
    btn.classList.toggle('selected',active);
    btn.setAttribute('aria-checked',active?'true':'false');
  });
}
function clearAsset(){
  const f=$('#cardForm');
  f.elements.image.value='';
  $('#imagePreview').src='/assets/bank-default.svg';
  $('#selectedAssetName').textContent='Без картинки';
  document.querySelectorAll('.asset-option').forEach(btn=>{btn.classList.remove('selected');btn.setAttribute('aria-checked','false')});
}
async function check(){try{const s=await api('/api/session');csrf=s.csrf;$('#loginView').classList.add('hidden');$('#panelView').classList.remove('hidden');await loadCards();}catch{$('#loginView').classList.remove('hidden');$('#panelView').classList.add('hidden')}}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api('/api/login',{method:'POST',body:JSON.stringify({login:f.get('login'),password:f.get('password')})});$('#loginError').classList.add('hidden');await check()}catch(err){$('#loginError').textContent=err.message;$('#loginError').classList.remove('hidden')}});
$('#logout').addEventListener('click',async()=>{await api('/api/logout',{method:'POST'}).catch(()=>{});csrf='';location.reload()});
async function loadCards(){const doc=await api('/api/admin/cards');cards=Array.isArray(doc)?doc:(doc.offers||[]);renderList()}
function renderList(){ $('#adminList').innerHTML=[...cards].sort((a,b)=>(a.sort??100)-(b.sort??100)).map(c=>`<div class="admin-item"><img loading="lazy" src="${esc(c.image||'/assets/bank-default.svg')}" alt=""><div><strong>${esc(c.name)} · ${esc(c.tariff)}</strong><div class="admin-meta">${esc(c.price)} · ${(c.types||[]).join(', ')} · ${c.active===false?'скрыта':'активна'}${c.is_ad?' · реклама':''}</div><div class="admin-meta">${esc(c.partner||'')}</div><div class="admin-meta">Ссылка: ${c.link?esc(c.link):'не задана'}</div><div class="admin-note">${esc(c.admin_note||'')}</div>${c.is_ad?`<div class="admin-meta">Рекламодатель: ${esc(c.advertiser||'не указан')} ${c.erid?`· erid: ${esc(c.erid)}`:''}</div>`:''}</div><div class="admin-actions"><button class="btn btn-soft" data-edit="${esc(c.id)}">Изменить</button><button class="btn btn-danger" data-del="${esc(c.id)}">Удалить</button></div></div>`).join('') }
$('#adminList').addEventListener('click',async e=>{const edit=e.target.dataset.edit,del=e.target.dataset.del;if(edit){const c=cards.find(x=>x.id===edit);fill(c)}if(del&&confirm('Удалить карточку?')){await api('/api/admin/cards',{method:'DELETE',body:JSON.stringify({id:del})});await loadCards()}});
function fill(c){const f=$('#cardForm');['id','name','tariff','price','description','details','link','partner','admin_note','sort','image','advertiser','erid','price_mode','search_tags'].forEach(k=>{if(f.elements[k])f.elements[k].value=k==='search_tags'?(c.search_tags||[]).join(', '):(c[k]??'')});f.elements.type_ip.checked=(c.types||[]).includes('ИП');f.elements.type_ooo.checked=(c.types||[]).includes('ООО');f.elements.active.checked=c.active!==false;f.elements.is_ad.checked=c.is_ad===true;const asset=assetNameFromPath(c.image);if(asset&&ASSET_IMAGES.includes(asset)){selectAsset(asset)}else if(c.image){f.elements.image.value=c.image;$('#imagePreview').src=c.image;$('#selectedAssetName').textContent='Текущая картинка'}else{clearAsset()}$('#formMode').textContent='Редактирование';$('#cancelEdit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
function resetForm(){const f=$('#cardForm');f.reset();f.elements.id.value='';f.elements.sort.value='100';f.elements.type_ip.checked=true;f.elements.type_ooo.checked=true;f.elements.active.checked=true;f.elements.is_ad.checked=false;f.elements.price_mode.value='any';selectAsset('bank-default.svg');$('#formMode').textContent='Новая карточка';$('#cancelEdit').classList.add('hidden')}
$('#cancelEdit').addEventListener('click',resetForm);$('#clearImage').addEventListener('click',clearAsset);$('#assetPicker').addEventListener('click',e=>{const btn=e.target.closest('[data-asset]');if(btn)selectAsset(btn.dataset.asset)});
$('#cardForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const f=e.currentTarget, submit=f.querySelector('button[type="submit"]');
  const d=Object.fromEntries(new FormData(f).entries());
  d.types=[f.elements.type_ip.checked?'ИП':null,f.elements.type_ooo.checked?'ООО':null].filter(Boolean);
  d.active=f.elements.active.checked; d.is_ad=f.elements.is_ad.checked; d.sort=Number(d.sort||100);
  d.search_tags=String(d.search_tags||'').split(',').map(s=>s.trim()).filter(Boolean);
  const method=d.id?'PUT':'POST';
  submit.disabled=true; submit.textContent='Сохраняю...';
  try{
    // Await the server write before reloading. This is intentionally asynchronous:
    // the complete object, including `link`, is persisted first, then the UI is refreshed.
    const result=await api('/api/admin/cards',{method,body:JSON.stringify(d)});
    cards=result.document?.offers || cards;
    $('#formMessage').textContent='Сохранено';$('#formMessage').classList.remove('hidden','error');
    resetForm(); renderList();
    setTimeout(()=>$('#formMessage').classList.add('hidden'),1800);
  }catch(err){$('#formMessage').textContent=err.message;$('#formMessage').classList.add('error');$('#formMessage').classList.remove('hidden')}
  finally{submit.disabled=false;submit.textContent='Сохранить'}
});
renderAssetPicker();selectAsset('bank-default.svg');check();

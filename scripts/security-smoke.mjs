import crypto from 'node:crypto';
const testPassword='TestPassword!12345';
const salt=crypto.randomBytes(16);
process.env.AUTH_SECRET='test-secret-0123456789-abcdefghijklmnopqrstuvwxyz';
process.env.ADMIN_PASSWORD_SALT=salt.toString('hex');
process.env.ADMIN_PASSWORD_HASH=crypto.scryptSync(testPassword,salt,64,{N:16384,r:8,p:1}).toString('hex');
const { verifyPassword, createSession, getSession, csrfFor, verifyCsrf } = await import('../netlify/functions/_lib/auth.js');
const { normalizeCard } = await import('../netlify/functions/_lib/validation.js');
function req(url='https://example.netlify.app/api/session', extra={}) {return new Request(url,{headers:{'user-agent':'SmokeTest/1.0',...extra}})}
function assert(cond,msg){if(!cond)throw new Error(msg)}
assert(verifyPassword('main_admin',testPassword)===true,'valid password failed');
assert(verifyPassword('main_admin','wrong')===false,'wrong password accepted');
const token=createSession(req());
const session=getSession(req('https://example.netlify.app/api/session',{'cookie':`rko_admin_session=${encodeURIComponent(token)}`}));
assert(session?.u==='main_admin','session parse failed');
const csrf=csrfFor(session);
assert(verifyCsrf(req('https://example.netlify.app/api/admin/cards',{'cookie':`rko_admin_session=${encodeURIComponent(token)}`,'x-csrf-token':csrf}),session),'csrf failed');
const good=normalizeCard({name:'Test',tariff:'Start',link:'https://bank.example/path',image:'/assets/test.png',types:['ИП','ИП','ООО'],is_ad:true,advertiser:'АО Банк'},()=> 'id1');
assert(good.link.startsWith('https://'),'https url rejected'); assert(good.types.length===2,'types not deduped');
let blocked=false;try{normalizeCard({name:'X',tariff:'Y',link:'javascript:alert(1)'},()=> 'id2')}catch{blocked=true}assert(blocked,'javascript url accepted');
blocked=false;try{normalizeCard({name:'X',tariff:'Y',image:'data:image/svg+xml;base64,PHN2Zz4='},()=> 'id3')}catch{blocked=true}assert(blocked,'svg data accepted');
blocked=false;try{normalizeCard({name:'X',tariff:'Y',is_ad:true},()=> 'id4')}catch{blocked=true}assert(blocked,'ad without advertiser accepted');
console.log('security-smoke: PASS');

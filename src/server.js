import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import webpush from 'web-push';
import WebSocket, { WebSocketServer } from 'ws';
import { createSession, appendSegment, analyze, classifyAct, reanalyze, evidencePack, familyView, intervention, languages, mergeGroundedFlags, sessionView } from './engine.js';
import { createGuardianStore } from './guardians.js';
import { createLimiter, clientKeyFor, limitsFromEnv } from './limits.js';
import { createSnapshotStore } from './persist.js';
import { createMetrics } from './telemetry.js';
import { createVerifier, channelFeatures, enrollmentQuality } from './acoustics.js';
import { createAttributor, decide } from './attribution.js';
import { createLiveBridge } from './live.js';
import { REGISTRY } from './languages.js';
import { createHash } from 'node:crypto';
import { AppError, createProviders, classifyWithLlm, validateWav } from './providers.js';
import {toPcmWav} from './media.js';

const publicDir=new URL('../public/',import.meta.url),distDir=new URL('../dist/',import.meta.url);
// Pages come from the built React app (dist/, made by `npm run build`); fixed-URL files (service worker, audio worklet,
// manifest, privacy page) are served from public/. Hashed bundles live under /assets/.
const pages={'/':'index.html','/family':'family.html'};
const files={'/pcm-worklet.js':'pcm-worklet.js','/privacy':'privacy.html','/privacy.css':'privacy.css','/sw.js':'sw.js','/manifest.webmanifest':'manifest.webmanifest','/icon.svg':'icon.svg'};
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml',woff2:'font/woff2'};
const UI_MISSING='The interface has not been built yet. Stop the server, run "npm run build", then start it again.';
// DPDP-style consent records: what was agreed, which notice version, when. Withdrawal = DELETE /api/profile.
export const NOTICE_VERSION='2026-11-10';
const recordConsent=(p,kind)=>{p.consents=(p.consents||[]).filter(c=>!(c.kind===kind&&c.version===NOTICE_VERSION)).concat({kind,version:NOTICE_VERSION,at:Date.now()}).slice(-20);};
const OUTCOME_LABELS=['scam','not_scam','was_family','unsure'];
const safeEqual=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
export function createApp(config={}) {
 const sessions=new Map(),pairs=new Map(),streams=new Map(),busy=new Set(),profiles=new Map(),setups=new Map();
 const providers=config.providers||createProviders(config);
 const guardians=config.guardians||createGuardianStore();
 const listeners=new Map();
 const llmConfigured=!!((config.llmKey??process.env.LLM_API_KEY)&&(config.llmModel??process.env.LLM_MODEL));
 const publicOrigin=config.publicOrigin||process.env.PUBLIC_ORIGIN||'';
 const secureCookies=publicOrigin.startsWith('https:')||(config.secureCookies??process.env.SECURE_COOKIES==='1');
 const COOKIE='sg_guardian';
 const verifier=config.verifier||createVerifier(config.voiceEmbedder?{embed:config.voiceEmbedder,...config.verifierThresholds}:{});
 // A voice print made by a different method cannot be compared: the senior must record again.
 const enrolledWith=p=>p?.enrollment&&p.enrollment.verifier===verifier.kind?p.enrollment:null;
 const metrics=config.metrics||createMetrics();
 const metricsToken=config.metricsToken??process.env.METRICS_TOKEN??'';
 const requireEnrollment=config.requireEnrollment??true; // decision 24: compulsory senior voice enrollment for live listening
 const limiter=config.limiter||createLimiter({rules:{...limitsFromEnv(config.env??process.env),...config.limits}});
 const trustProxyHops=Number(config.trustProxyHops??process.env.TRUST_PROXY_HOPS??0);
 const clientKey=config.clientKey||(req=>clientKeyFor(req,trustProxyHops));
 // Sliding session expiry (pending owner decision 12): idle timeout reset by real activity, plus an absolute cap.
 const sessionIdleMs=config.sessionIdleMs??5*60e3,sessionCapMs=config.sessionCapMs??60*60e3;
 const warningCache=new Map(); // `${language}:${risk}` → {wav, chunks}: fixed standard-voice warning audio
 const devices=new Map(); // sha256(device credential) → {profileId, createdAt, lastUsedAt}
 // Decision 8: optional on-disk snapshot of accounts, profiles and device credentials (never sessions or audio).
 const store=createSnapshotStore(config.dataDir??process.env.DATA_DIR);
 const persisted=store?.load();
 if(persisted){for(const p of persisted.profiles||[])profiles.set(p.token,p);for(const [k,d] of persisted.devices||[])devices.set(k,d);guardians.importAccounts(persisted.guardians);}
 const persistNow=()=>{if(!store)return;try{store.save({profiles:[...profiles.values()],devices:[...devices.entries()],guardians:guardians.exportAccounts()});}catch(e){console.error('State snapshot failed:',e.code||e.message);}};
 const DEVICE_IDLE_MS=30*24*3600e3,DEVICE_MAX_MS=90*24*3600e3;
 const hashToken=t=>createHash('sha256').update(String(t)).digest('hex');
 const vapidPublic=config.vapidPublic??process.env.VAPID_PUBLIC_KEY,vapidPrivate=config.vapidPrivate??process.env.VAPID_PRIVATE_KEY,vapidSubject=config.vapidSubject??process.env.VAPID_SUBJECT;
 const pushEnabled=!!(vapidPublic&&vapidPrivate&&vapidSubject&&(config.enablePush??process.env.ENABLE_PUSH==='1'));
 if(pushEnabled)webpush.setVapidDetails(vapidSubject,vapidPublic,vapidPrivate);
 const wss=new WebSocketServer({noServer:true,maxPayload:2048});
 const json=(res,status,value,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...headers});res.end(JSON.stringify(value));};
 function touch(s){const t=Date.now();s.lastActiveAt=t;s.expiresAt=Math.min(s.createdAt+sessionCapMs,t+sessionIdleMs);}
 // Every call to a paid provider counts against a process-wide daily cap, attempted calls included.
 function paid(){limiter.take('providerDaily','process','daily_cost_cap');}
function mintDevice(profileId){if(devices.size>=1000)throw new AppError(429,'Device capacity reached. Retry later.');const token=randomBytes(32).toString('hex');devices.set(hashToken(token),{profileId,createdAt:Date.now(),lastUsedAt:Date.now()});return token;}
 function deviceProfile(token){if(typeof token!=='string'||!token)return null;const key=hashToken(token),d=devices.get(key);if(!d)return null;const t=Date.now();if(d.lastUsedAt+DEVICE_IDLE_MS<t||d.createdAt+DEVICE_MAX_MS<t){devices.delete(key);return null;}const p=profiles.get(d.profileId);if(!p)return null;d.lastUsedAt=t;return p;}
 function find(id){const s=sessions.get(id);if(!s||s.expiresAt<Date.now()){drop(id);throw new AppError(404,'Session ended or expired. Start a new session.');}return s;}
 function drop(id){const s=sessions.get(id);streams.get(id)?.close();sessions.delete(id);for(const [token,p] of pairs)if(p.sessionId===id)pairs.delete(token);if(s){const p=profile(s);if(p&&!([...sessions.values()].some(other=>other.profileToken===s.profileToken))){delete p.embedding;p.voiceConsent=false;}}}
 function profile(s){return profiles.get(s.profileToken);}
 function bearer(req){return req.headers.authorization?.replace(/^Bearer /,'');}
 function cookieToken(req){for(const part of (req.headers.cookie||'').split(';')){const [k,...v]=part.trim().split('=');if(k===COOKIE)return v.join('=');}return null;}
 function setGuardianCookie(res,token,maxAge){res.setHeader('Set-Cookie',`${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secureCookies?'; Secure':''}`);}
 function signIn(res,g){setGuardianCookie(res,guardians.startSession(g),guardians.sessionTtlMs/1000);}
 function seniorProfile(req){const p=deviceProfile(bearer(req));if(!p)throw new AppError(404,'Profile expired.');return p;}
 // Cookie-authenticated writes must come from this origin (CSRF guard on top of SameSite=Strict).
 function sameOriginWrite(req){if(!req.headers.origin)throw new AppError(403,'This request must come from the family page.');}
 function invite(token){const pair=typeof token==='string'?pairs.get(token):null;
  // Standing family link (owner decision 10 Nov 2026): tied to the senior's profile, valid 24 h, while sharing is on.
  if(pair?.profileToken){const p=profiles.get(pair.profileToken);if(!p||!p.familySharing||pair.expiresAt<Date.now())throw new AppError(404,'This family invite was revoked or expired. Ask for a new link.');return {profileToken:p.token};}
  const s=pair&&sessions.get(pair.sessionId);if(!s||s.expiresAt<Date.now()||!s.sharing)throw new AppError(404,'This family invite was revoked or expired. Ask for a new link.');return s;}
 // A call is shared if the senior switched sharing on for it, or gave the standing "share every call" consent.
 function shares(s){return !!(s.sharing||profiles.get(s.profileToken)?.familySharing);}
 function activeShared(profileToken){let best=null;for(const s of sessions.values())if(s.profileToken===profileToken&&shares(s)&&s.expiresAt>=Date.now()&&(!best||s.createdAt>best.createdAt))best=s;return best;}
 // Family routes authenticate the Guardian account, never the senior's profile token or a pairing link.
 function family(req){const g=guardians.fromToken(cookieToken(req));if(!g)throw new AppError(401,'Sign in to your family account.');if(!g.profileToken)throw new AppError(403,'Your family member removed this link. Ask them for a new invite.');const p=profiles.get(g.profileToken);if(!p)throw new AppError(403,'Your family member\u2019s profile has expired. Ask them for a new invite.');return {guardian:g,profile:p,shared:activeShared(g.profileToken)};}
 function pushSubscriptionValid(sub){try{const u=new URL(sub.endpoint);return u.protocol==='https:'&&(/(^|\.)fcm\.googleapis\.com$|(^|\.)push\.services\.mozilla\.com$|^web\.push\.apple\.com$|(^|\.)notify\.windows\.com$/).test(u.hostname)&&typeof sub.keys?.p256dh==='string'&&typeof sub.keys?.auth==='string'&&JSON.stringify(sub).length<5000;}catch{return false;}}
 function alertFamily(s){if(s.risk==='safe')return;const p=profile(s);if(!p)return;const reasons=[...new Set(s.flags.map(f=>f.label))];const event={id:randomUUID().slice(0,12),at:Date.now(),risk:s.risk,uncertain:!!s.uncertain,reasons:reasons.slice(0,5),mode:s.mode,shared:shares(s)};metrics.inc('warnings',{risk:s.risk,mode:s.mode});p.timeline.push(event);p.timeline=p.timeline.slice(-30);if(!shares(s)||!pushEnabled)return;for(const g of guardians.linkedTo(s.profileToken)){if(!g.subscription)continue;const payload=JSON.stringify({title:'Scam Guardian warning',body:reasons.slice(0,2).join(' · ')||'Check on your family member',url:'/family'});Promise.resolve().then(()=>(config.pushSender||webpush.sendNotification)(g.subscription,payload,{TTL:60,timeout:5000})).then(()=>{g.pushStatus='accepted by push service; delivery unconfirmed';}).catch(()=>{g.pushStatus='delivery failed';});}}
 // Host allow-list guards DNS rebinding; Origin is required on every state-changing request and WebSocket upgrade
 // (browsers always send it there), and a literal "null" Origin is never trusted.
 function allowed(req,{requireOrigin=false}={}){const host=req.headers.host;const hosts=config.allowedHosts||['127.0.0.1','localhost','[::1]'];if(!hosts.some(h=>host===h||host?.startsWith(h+':')))return false;const origin=req.headers.origin;if(origin===undefined)return !requireOrigin;if(origin==='null')return false;try{const o=new URL(origin);return publicOrigin?o.origin===new URL(publicOrigin).origin:o.host===host;}catch{return false;}}
 async function body(req,max=12000){let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>max)throw new AppError(413,'Request is too large.');chunks.push(b);}return Buffer.concat(chunks);}
 async function data(req){try{return JSON.parse((await body(req)).toString()||'{}');}catch(e){if(e instanceof AppError)throw e;throw new AppError(400,'Send valid JSON.');}}
  async function ingest(s,text,id,at=Date.now(),audio=null){
  const before=s.risk;
  let meta={};
  if(s.attributor&&audio){
   // Attribute this turn before scoring it. The words vote uses this clause's own act and rule flags only.
   const pre=analyze([{id:'turn',text,at}]);
   const a=await s.attributor.attribute(audio,{act:classifyAct(text),flags:pre.flags});
   metrics.inc('attribution',{speaker:a.speaker,confidence:a.confidence});metrics.time('attribution',a.ms);
   meta={speaker:a.speaker,attribution:{confidence:a.confidence,hint:a.hint,basis:a.basis,spoofSuspect:!!a.spoofSuspect,evidence:a.evidence,ms:a.ms}};
  }
  appendSegment(s,text,at,id||undefined,meta);const seg=s.segments.at(-1);if(seg&&!seg.wallAt)seg.wallAt=Date.now();
  afterChange(s,before);
  classifyLater(s);
  return sessionView(s);
 }
 function afterChange(s,before){
  const cues=intervention(s);if(cues.coolingOff&&!s.coolingOffUntil)s.coolingOffUntil=Date.now()+600000;
  s.askCodeWord=cues.askCodeWord;
  if(s.risk!==before)alertFamily(s);
 }
 // The rule verdict is returned at once. The optional AI classifier runs afterwards, serialized per session so a
 // stale reply cannot override newer state, and can only add grounded evidence (engine.groundedFlags).
 function classifyLater(s){
  if(!llmConfigured)return;
  const recent=s.segments.filter(x=>Date.now()-x.at<=60000).slice(-20);
  // Budget: only windows the rules already find suspicious, or at most one unprompted check every 10 seconds.
  const suspicious=s.flags.some(f=>recent.some(seg=>seg.id===f.segmentId));
  if(!suspicious&&s._llmAt&&Date.now()-s._llmAt<10000)return;
  s._llmAt=Date.now();
  if(s.llmStatus==='not configured')s.llmStatus='pending';
  s._llm=(s._llm||Promise.resolve()).then(async()=>{
   if(!sessions.has(s.id))return;
   const llm=await classifyWithLlm(recent.map(x=>({id:x.id,text:x.text,...(x.speaker?{speaker:x.speaker}:{})})),{...config,summary:s.callSummary});s.llmStatus=llm.status;
   if(llm.status!=='available')return;
   s.classifier='rules + grounded LLM';
   if(llm.summary)s.callSummary=llm.summary; // decision 25: rolling context for the next call; never shown to family or logged
   const before=s.risk,count=s.flags.length;mergeGroundedFlags(s,llm.flags);
   // Decision 25: the LLM's caller/senior roles are a prior. They are re-combined with the stored acoustic evidence;
   // they can confirm "caller" or veto "senior", never create "senior" on their own (attribution.decide).
   let relabelled=false;
   for(const seg of recent){const role=llm.roles?.[seg.id];const ev=seg.attribution?.evidence;if(!role||!ev)continue;
    const next=decide({voice:ev.voice,channel:ev.channel,text:ev.text,llm:role,previous:ev.previous,voicedMs:ev.voicedMs});
    ev.llm=role;if(next.speaker!==seg.speaker){seg.speaker=next.speaker;Object.assign(seg.attribution,{confidence:next.confidence,basis:next.basis,hint:next.hint});relabelled=true;}}
   if(relabelled)reanalyze(s);
   if(s.risk!==before||s.flags.length!==count||relabelled){afterChange(s,before);listeners.get(s.id)?.(s);}
  }).catch(()=>{s.llmStatus='unavailable; rules remain active';});
 }
 async function exclusive(id,fn){if(busy.has(id))throw new AppError(429,'Analysis is already running. Please wait.');busy.add(id);try{return await fn();}finally{busy.delete(id);}}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self' blob:; img-src 'self' data:; worker-src 'self'; manifest-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");res.setHeader('Permissions-Policy','microphone=(self), camera=(), geolocation=(), payment=(), usb=()');res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');if(secureCookies)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  try{
   if(!allowed(req,{requireOrigin:!['GET','HEAD'].includes(req.method)}))throw new AppError(403,'This origin or host is not allowed.');
   const url=new URL(req.url,'http://localhost');const path=url.pathname;
   if(req.method==='GET'&&files[path]){const name=files[path];res.setHeader('Content-Type',name.endsWith('.webmanifest')?'application/manifest+json':types[name.split('.').at(-1)]);res.end(await readFile(new URL(name,publicDir)));return;}
   if(req.method==='GET'&&pages[path]){try{const html=await readFile(new URL(pages[path],distDir));res.setHeader('Content-Type',types.html);res.end(html);}catch{res.statusCode=503;res.setHeader('Content-Type','text/plain; charset=utf-8');res.end(UI_MISSING);}return;}
   if(req.method==='GET'&&/^\/assets\/[\w.-]+\.(js|css|woff2)$/.test(path)){try{const body=await readFile(new URL('.'+path,distDir));res.setHeader('Content-Type',types[path.split('.').at(-1)]);res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.end(body);}catch{throw new AppError(404,'Not found.');}return;}
   if(path==='/api/health'&&req.method==='GET')return json(res,200,{status:'ok',gnani:providers.configured?'configured, not verified':'not configured',llm:llmConfigured?'configured':'missing (required; rules only until configured)',push:pushEnabled?'configured, delivery unverified':'not configured'});
   if(path==='/api/languages'&&req.method==='GET')return json(res,200,{languages:REGISTRY.map(({code,name,status,codeMix})=>({code,name,status,codeMix}))});
   if(path==='/api/push-key'&&req.method==='GET')return json(res,200,{publicKey:pushEnabled?vapidPublic:null});
   if(path==='/api/sessions'&&req.method==='POST'){
    const d=await data(req);if(d.consent!==true)throw new AppError(403,'Consent is required before starting.');
    if(!languages.includes(d.language)||!['demo','live','upload','text'].includes(d.mode))throw new AppError(400,'Choose a supported language and mode.');
    if(sessions.size>=30)throw new AppError(429,'Session capacity reached. End an old session.');
    limiter.take('sessionCreate',clientKey(req)); // counted after validation
    // The device credential is the senior's bearer; the internal profile id never leaves the server.
    let p=deviceProfile(d.deviceToken),deviceToken;
    if(!p){if(profiles.size>=100)throw new AppError(429,'Profile capacity reached. Retry later.');const id=randomBytes(32).toString('hex');p={token:id,timeline:[],language:d.language,codeWordConfigured:false,lastUsedAt:Date.now()};profiles.set(id,p);deviceToken=mintDevice(id);}else p.lastUsedAt=Date.now();
    metrics.inc('sessions_requested',{mode:d.mode});recordConsent(p,d.mode==='live'?'live_listening':'demo');
    if(d.mode==='live'&&requireEnrollment&&!enrolledWith(p))return json(res,409,{error:'Record your voice once before live listening, so the app can tell your voice from the caller.',reason:'enrollment_required',...(deviceToken?{deviceToken}:{})});
    const s=createSession(d.language,d.mode);s.profileToken=p.token;s.codeWordConfigured=p.codeWordConfigured;s.coolingOffUntil=null;s.askCodeWord=false;s.trustedVoice=false;s.health={stt:d.mode==='live'?'idle':'not_applicable',tts:'unknown',llm:s.llmStatus};touch(s);sessions.set(s.id,s);return json(res,201,{id:s.id,...(deviceToken?{deviceToken}:{})});
   }
   // Decision 24: the senior's compulsory ~10 s voice enrollment. Raw 16-bit mono PCM in the body. Only derived
   // features (a voice print and the live-channel level) are kept; the audio itself is discarded at once.
   if(path==='/api/profile/enroll'&&req.method==='POST'){
    sameOriginWrite(req);const p=seniorProfile(req);limiter.take('enroll',clientKey(req));
    if(url.searchParams.get('consent')!=='1'||url.searchParams.get('adult')!=='1')throw Object.assign(new AppError(403,'Please confirm you are 18 or older and agree to store a voice measurement.'),{reason:'enrollment_consent'});
    const rate=Number(url.searchParams.get('rate'));if(![16000,44100,48000].includes(rate))throw new AppError(400,'Record at 16, 44.1 or 48 kHz.');
    const raw=await body(req,rate*2*45);if(raw.length%2)throw new AppError(400,'Send 16-bit PCM audio.');
    const pcm=new Int16Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.length));
    const q=enrollmentQuality(pcm,rate);
    const heard=` (The server received ${Math.round(q.seconds)} s of audio and found ${Math.round(q.voicedMs/100)/10} s of speech in it. Loudest point: ${Math.round(q.peak*100)}% of maximum.)`;
    if(!q.ok)throw Object.assign(new AppError(422,(q.problems.includes('too_short')?'Please read the whole text aloud, a little closer to the microphone.':q.problems.includes('too_quiet')?'That was too quiet. Hold the device closer and try again.':'That was too loud. Hold the device a little further away.')+heard),{reason:'enrollment_quality'});
    const print=await verifier.enroll(pcm,rate);if(!print)throw Object.assign(new AppError(422,'Please read the whole text aloud, a little closer to the microphone.'+heard),{reason:'enrollment_quality'});
    recordConsent(p,'voice_enrollment');p.enrollment={print,channel:(({highBandDb,topBandDb,nbEdgeDb,wbEdgeDb})=>({highBandDb,topBandDb,nbEdgeDb,wbEdgeDb}))(channelFeatures(pcm,rate)),rate,verifier:verifier.kind,at:Date.now()};p.lastUsedAt=Date.now();
    return json(res,200,{enrolled:true,voicedSeconds:Math.round(q.voicedMs/100)/10,verifier:verifier.kind});
   }
   if(path==='/api/profile/family'&&req.method==='POST'){sameOriginWrite(req);const p=seniorProfile(req);const d=await data(req);if(d.consent!==true)throw new AppError(403,'Allow family sharing explicitly.');
    p.familySharing=true;recordConsent(p,'family_sharing');for(const [t,x] of pairs)if(x.profileToken===p.token)pairs.delete(t);
    const token=randomBytes(32).toString('hex'),expiresAt=Date.now()+24*3600*1000;pairs.set(token,{profileToken:p.token,expiresAt});persistNow();return json(res,201,{token,expiresAt});}
   if(path==='/api/profile/family'&&req.method==='DELETE'){sameOriginWrite(req);const p=seniorProfile(req);p.familySharing=false;for(const [t,x] of pairs)if(x.profileToken===p.token)pairs.delete(t);
    for(const x of sessions.values())if(x.profileToken===p.token){x.sharing=false;for(const [t,y] of pairs)if(y.sessionId===x.id)pairs.delete(t);}persistNow();return json(res,200,{revoked:true});}
   if(path==='/api/profile/enroll'&&req.method==='DELETE'){sameOriginWrite(req);const p=seniorProfile(req);delete p.enrollment;return json(res,200,{removed:true});}
   // Batch 6: privacy-safe metrics, only when METRICS_TOKEN is configured (otherwise the route does not exist).
   if(path==='/api/metrics'&&req.method==='GET'){
    const auth=String(req.headers.authorization||'');if(!metricsToken||!safeEqual(auth,`Bearer ${metricsToken}`))throw new AppError(404,'Not found.');
    if(url.searchParams.get('format')==='prometheus'){res.writeHead(200,{'Content-Type':'text/plain; version=0.0.4'});return res.end(metrics.prometheus());}
    return json(res,200,metrics.snapshot());
   }
   // Batch 6: outcome labels. The senior or a linked family member marks a warning as a real scam, not a scam, a
   // family call, or unsure. Labels are calibration data for thresholds and evaluation; they never lower a live alert.
   if((path==='/api/timeline/label'||path==='/api/family/timeline/label')&&req.method==='POST'){
    sameOriginWrite(req);const d=await data(req);
    if(!OUTCOME_LABELS.includes(d.label))throw new AppError(400,'Choose scam, not_scam, was_family or unsure.');
    const familyRoute=path.startsWith('/api/family');const p=familyRoute?family(req).profile:seniorProfile(req);
    const event=p.timeline.find(e=>e.id===d.eventId&&(!familyRoute||e.shared));if(!event)throw new AppError(404,'No such warning.');
    event.outcome={label:d.label,by:familyRoute?'family':'senior',at:Date.now()};metrics.inc('outcome_labels',{label:d.label,risk:event.risk,by:event.outcome.by});
    return json(res,200,{id:event.id,outcome:event.outcome});
   }
   // Batch 6: data-principal rights. Export everything held about this senior profile; erase it entirely.
   if(path==='/api/profile/export'&&req.method==='GET'){
    const p=seniorProfile(req);res.setHeader('Content-Disposition','attachment; filename="scam-guardian-my-data.json"');
    return json(res,200,{exportedAt:new Date().toISOString(),profile:{language:p.language,createdAt:p.createdAt,timeline:p.timeline.map(({shared,...e})=>({...e,sharedWithFamily:!!shared})),codeWordConfigured:!!p.codeWordConfigured,trustedVoice:!!p.embedding,voiceEnrollment:p.enrollment?{recordedAt:new Date(p.enrollment.at).toISOString(),method:p.enrollment.verifier,tunedTurns:p.enrollment.tunedTurns||0,note:'Only derived voice measurements are stored, never the recording.'}:null},consents:(p.consents||[]).map(c=>({...c,at:new Date(c.at).toISOString()})),noticeVersion:NOTICE_VERSION,devices:[...devices.values()].filter(x=>x.profileId===p.token).map(x=>({createdAt:x.createdAt,lastUsedAt:x.lastUsedAt})),familyAccounts:guardians.linkedTo(p.token).map(g=>g.username)});
   }
   if(path==='/api/profile'&&req.method==='DELETE'){
    sameOriginWrite(req);const p=seniorProfile(req);
    for(const [id,s] of sessions)if(s.profileToken===p.token)drop(id);
    for(const [k,d] of devices)if(d.profileId===p.token)devices.delete(k);
    const unlinked=guardians.unlinkAll(p.token);profiles.delete(p.token);persistNow();metrics.inc('profile_erasures');
    return json(res,200,{erased:true,familyAccountsUnlinked:unlinked});
   }
   if(path==='/api/guardians/me'&&req.method==='DELETE'){
    sameOriginWrite(req);const g=guardians.fromToken(cookieToken(req));if(!g)throw new AppError(401,'Sign in to your family account.');
    guardians.deleteAccount(g.username);setGuardianCookie(res,'',0);persistNow();return json(res,200,{deleted:true});
   }
   if(path==='/api/timeline'&&req.method==='GET'){const p=seniorProfile(req);return json(res,200,{timeline:p.timeline.map(({shared:_,...e})=>e),codeWordConfigured:p.codeWordConfigured,enrolled:!!enrolledWith(p),enrolledAt:enrolledWith(p)?.at??null,familySharing:!!p.familySharing});}
   if(path==='/api/profile/guardians'&&req.method==='GET'){const p=seniorProfile(req);return json(res,200,{guardians:guardians.linkedTo(p.token).map(g=>({username:g.username,pushStatus:g.pushStatus}))});}
   const guardianMatch=path.match(/^\/api\/profile\/guardians\/([a-z0-9._-]{3,32})$/);
   if(path==='/api/profile/device'&&req.method==='DELETE'){seniorProfile(req);devices.delete(hashToken(bearer(req)));return json(res,200,{revoked:true});}
   if(guardianMatch&&req.method==='DELETE'){const p=seniorProfile(req);if(!guardians.unlink(p.token,guardianMatch[1]))throw new AppError(404,'No such linked family account.');return json(res,200,{removed:true});}
   if(path==='/api/guardians/register'&&req.method==='POST'){sameOriginWrite(req);const d=await data(req);const s=invite(d.invite);const g=await guardians.register(d.username,d.passphrase,s.profileToken);const p=profiles.get(s.profileToken);if(p)p.lastUsedAt=Date.now();signIn(res,g);return json(res,201,{username:g.username,linked:true});}
   if(path==='/api/guardians/login'&&req.method==='POST'){sameOriginWrite(req);const d=await data(req);const linkTo=d.invite?invite(d.invite):null;const g=await guardians.login(d.username,d.passphrase,req.socket.remoteAddress||'');if(linkTo)guardians.link(g,linkTo.profileToken);signIn(res,g);return json(res,200,{username:g.username,linked:!!g.profileToken});}
   if(path==='/api/guardians/logout'&&req.method==='POST'){sameOriginWrite(req);const token=cookieToken(req);if(token)guardians.endSession(token);setGuardianCookie(res,'',0);return json(res,200,{signedOut:true});}
   if(path==='/api/guardians/me'&&req.method==='GET'){const g=guardians.fromToken(cookieToken(req));if(!g)throw new AppError(401,'Sign in to your family account.');return json(res,200,{username:g.username,linked:!!(g.profileToken&&profiles.has(g.profileToken))});}
   if(path==='/api/family'&&req.method==='GET'){
    const {guardian,profile:p,shared}=family(req);const account={codeWordConfigured:p.codeWordConfigured,pushStatus:guardian.pushStatus,username:guardian.username,voiceEnrolled:!!p.embedding};
    // Reasons reach family only from sessions the senior shared, and only while a session is being shared (pending owner decision 6).
    const sharedTimeline=p.timeline.filter(e=>e.shared).map(({shared:_,...e})=>e);
    return json(res,200,shared?{...familyView(shared),sharing:true,timeline:sharedTimeline,...account}:{sharing:false,standing:!!p.familySharing,timeline:p.familySharing?sharedTimeline:[],...account});
   }
   if(path.startsWith('/api/family/')&&req.method!=='GET')sameOriginWrite(req);
   if(path==='/api/family/push'&&req.method==='POST'){const {guardian:g}=family(req);if(!pushEnabled)throw new AppError(503,'Push is not configured on the server.');const d=await data(req);if(!pushSubscriptionValid(d.subscription))throw new AppError(400,'Invalid push subscription.');g.subscription=d.subscription;g.pushStatus='subscribed; delivery unverified';return json(res,200,{subscribed:true});}
   if(path==='/api/family/push'&&req.method==='DELETE'){const {guardian:g}=family(req);g.subscription=null;g.pushStatus='unsubscribed';return json(res,200,{subscribed:false});}
   if(path==='/api/family/codeword'&&req.method==='POST'){const {profile:p}=family(req),d=await data(req);if(d.confirmedOffline!==true||typeof d.word!=='string'||d.word.trim().length<6||d.word.length>40)throw new AppError(400,'Choose a 6–40 character private word and confirm you shared it directly with the senior.');p.codeWordConfigured=true;for(const s of sessions.values())if(s.profileToken===p.token)s.codeWordConfigured=true;return json(res,200,{configured:true});}
   if(path==='/api/family/voice'&&req.method==='POST'){const {guardian:g,profile:p,shared:s}=family(req);if(!s)throw new AppError(409,'Voice enrollment needs an active shared session; the sample is deleted when sessions end.');if(req.headers['x-voice-consent']!=='true')throw new AppError(403,'Explicit family voice consent is required.');limiter.take('voice',g.username,'profile_budget');const bytes=await body(req,1200000);const meta=await toPcmWav(bytes,req.headers['content-type']);const {duration}=validateWav(meta);if(duration<5||duration>30)throw new AppError(400,'Voice sample must be 5–30 seconds.');paid();p.embedding=await providers.cloneVoice(meta);p.voiceConsent=true;return json(res,200,{enrolled:true});}
   if(path==='/api/family/voice'&&req.method==='DELETE'){const {profile:p}=family(req);delete p.embedding;p.voiceConsent=false;for(const s of sessions.values())if(s.profileToken===p.token)s.trustedVoice=false;return json(res,200,{enrolled:false});}
   if(path==='/api/family/setup/approve'&&req.method==='POST'){const {guardian:g}=family(req),d=await data(req);const code=String(d.code||'');
    // Approve a device claim only on links this family account minted, by the code shown on the senior's screen.
    const mine=[...setups.entries()].filter(([,x])=>x.guardian===g.username&&x.expiresAt>=Date.now());
    for(const [,x] of mine){const claim=x.claims.find(c=>c.code===code&&!c.approved);if(claim){claim.approved=true;return json(res,200,{approved:true});}}
    for(const [t,x] of mine){x.wrong=(x.wrong||0)+1;if(x.wrong>=5)setups.delete(t);}
    throw new AppError(404,'That code does not match a pending setup. Check the code on your family member\u2019s screen.');}
   if(path==='/api/family/setup'&&req.method==='POST'){const {guardian:g,profile:p}=family(req),d=await data(req);if(!languages.includes(d.language))throw new AppError(400,'Choose a supported language.');limiter.take('setupMint',g.username);if(setups.size>=100)throw new AppError(429,'Too many setup links. Retry later.');const token=randomBytes(24).toString('hex');setups.set(token,{profileToken:p.token,guardian:g.username,language:d.language,expiresAt:Date.now()+600000,claims:[]});const origin=publicOrigin||`http://${req.headers.host}`;const link=new URL(`/?setup=${token}`,origin).href;return json(res,201,{link,qr:await QRCode.toDataURL(link),expiresAt:Date.now()+600000});}
   const setupMatch=path.match(/^\/api\/setup\/([a-f0-9]{48})(?:\/(claim|complete))?$/);
   if(setupMatch){
    // Setup no longer hands the link holder the senior's credential: the opening device gets a code, the family
    // approves that code from their signed-in account, and only then is a new, revocable device credential issued once.
    const [,token,step]=setupMatch;const live=()=>{const x=setups.get(token);if(!x||x.expiresAt<Date.now())throw new AppError(404,'Setup link expired.');return x;};
    if(!step&&req.method==='GET')return json(res,200,{language:live().language});
    if(step==='claim'&&req.method==='POST'){limiter.take('setupClaim',clientKey(req));const d=await data(req);if(d.consent!==true||!languages.includes(d.language))throw new AppError(400,'Confirm setup and choose a language.');const x=live();if(x.claims.filter(c=>!c.approved).length>=3)throw new AppError(429,'Too many pending setup attempts for this link.');const claim={id:randomBytes(16).toString('hex'),code:String(100000+randomBytes(4).readUInt32BE()%900000),language:d.language,approved:false};x.claims.push(claim);return json(res,201,{claimId:claim.id,code:claim.code,expiresAt:x.expiresAt});}
    if(step==='complete'&&req.method==='POST'){const d=await data(req);const x=live();const claim=x.claims.find(c=>c.id===d.claimId);if(!claim)throw new AppError(404,'Setup attempt not found.');if(!claim.approved)throw new AppError(409,'Waiting for your family member to approve the code.');
     setups.delete(token); // consumed synchronously after the body is read: a second claim cannot also succeed
     const p=profiles.get(x.profileToken);if(!p)throw new AppError(404,'Profile expired.');p.language=claim.language;p.lastUsedAt=Date.now();return json(res,200,{deviceToken:mintDevice(p.token),language:p.language});}
    throw new AppError(405,'Method not allowed.');
   }
   const match=path.match(/^\/api\/sessions\/([a-f0-9-]{36})(?:\/(segments|evidence|pair|warning|warning-stream|upload|trusted-voice|drill))?$/);
   if(!match)throw new AppError(404,'Not found.');
   const [,id,action]=match,s=find(id);
   if(req.method!=='GET')touch(s);
   if(!action&&req.method==='GET')return json(res,200,sessionView(s));
   if(!action&&req.method==='DELETE'){drop(id);return json(res,200,{deleted:true});}
   if(action==='segments'&&req.method==='POST'){
    if(!['demo','text'].includes(s.mode))throw new AppError(400,'Manual transcript input is only available in synthetic modes.');
    const d=await data(req);if(typeof d.text!=='string'||!d.text.trim()||d.text.length>2000)throw new AppError(400,'Enter 1–2000 characters.');limiter.take('segments',id);
    return json(res,200,await exclusive(id,()=>ingest(s,d.text.trim())));
   }
   if(action==='upload'&&req.method==='POST'){
    if(s.mode!=='upload')throw new AppError(400,'Start an upload session first.');
    limiter.take('upload',clientKey(req));limiter.take('uploadSession',id,'session_budget');const b=await body(req,12000000),wav=await toPcmWav(b,req.headers['content-type']);paid();return json(res,200,await exclusive(id,async()=>ingest(s,await providers.transcribe(wav,s.language))));
   }
   if(action==='warning'&&req.method==='POST'){
    limiter.take('warning',id);limiter.take('warningSession',id,'session_budget');const p=profile(s);const cloned=!!(s.trustedVoice&&p?.voiceConsent&&p.embedding);
    // Fixed warning copy means the standard voice can be pre-rendered: cached audio plays at once, costs nothing and
    // still plays if the speech service is down (B-12). Cloned-voice audio is never cached across profiles.
    const key=`${s.language}:${s.risk}`,cached=!cloned&&warningCache.get(key)?.wav;
    let audio=cached;
    if(!audio){try{paid();audio=await exclusive(id,()=>cloned?providers.clonedWarning(s.language,s.risk,p.embedding):providers.warning(s.language,s.risk));s.health.tts='ok';if(!cloned)warningCache.set(key,{...warningCache.get(key),wav:audio});}catch(e){if(e.status!==429)s.health.tts='tts_down';const fallback=warningCache.get(key)?.wav;if(!fallback)throw e;audio=fallback;res.setHeader('X-Warning-Fallback',cloned?'standard-voice-cache':'cache');}}
    const source=audio===cached||res.getHeader('X-Warning-Fallback')?'cache':'provider';
    res.setHeader('Content-Type','audio/wav');res.setHeader('X-Warning-Source',source);return res.end(audio);
   }
   if(action==='warning-stream'&&req.method==='POST'){
    if(s.trustedVoice&&profile(s)?.embedding)throw new AppError(409,'Trusted voice uses the fixed warning endpoint.');
    limiter.take('warning',id);limiter.take('warningSession',id,'session_budget');
    const key=`${s.language}:${s.risk}`,sse=()=>{res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('X-Accel-Buffering','no');};
    const cachedChunks=warningCache.get(key)?.chunks;
    if(cachedChunks?.length){sse();res.setHeader('X-Warning-Source','cache');for(const audio of cachedChunks)res.write(`event: chunk\ndata: ${JSON.stringify({audio})}\n\n`);res.write('event: complete\ndata: {}\n\n');res.end();return;}
    paid();
    await exclusive(id,async()=>{const iterator=providers.warningStream(s.language,s.risk)[Symbol.asyncIterator]();let current;try{current=await iterator.next();s.health.tts='ok';}catch(e){s.health.tts='tts_down';throw e;}sse();res.setHeader('X-Warning-Source','provider');const chunks=[];let size=0;while(!current.done){chunks.push(current.value);size+=current.value.length;res.write(`event: chunk\ndata: ${JSON.stringify({audio:current.value})}\n\n`);current=await iterator.next();}res.write('event: complete\ndata: {}\n\n');res.end();if(size<4e6)warningCache.set(key,{...warningCache.get(key),chunks});});return;
   }
   if(action==='trusted-voice'&&req.method==='POST'){const d=await data(req);if(typeof d.consent!=='boolean')throw new AppError(400,'Choose whether to use the trusted voice.');s.trustedVoice=d.consent;return json(res,200,{enabled:s.trustedVoice,available:!!profile(s)?.embedding});}
   if(action==='drill'&&req.method==='POST'){if(s.mode!=='demo')throw new AppError(400,'Start a practice session first.');const scripts={'en-IN':'This is the cyber police. Your family member is in custody. You have five minutes. Do not tell anyone. Transfer money to release them.','hi-IN':'मैं साइबर पुलिस से बोल रहा हूँ। आपका बेटा हिरासत में है। किसी को मत बताना। तुरंत पैसे भेजिए।','ta-IN':'நான் காவல்துறையிலிருந்து பேசுகிறேன். உங்கள் மகன் கைது செய்யப்பட்டார். யாரிடமும் சொல்ல வேண்டாம். உடனே பணம் அனுப்புங்கள்.','ml-IN':'ഞാൻ സൈബർ പോലീസിൽ നിന്നാണ് വിളിക്കുന്നത്. നിങ്ങളുടെ മകൻ കസ്റ്റഡിയിലാണ്. ആരോടും പറയരുത്. ഉടനെ പണം അയക്കൂ.'};limiter.take('drill',clientKey(req));paid();const audio=await providers.drill(s.language,scripts[s.language]);res.setHeader('Content-Type','audio/wav');return res.end(audio);}
   if(action==='pair'&&req.method==='POST'){
    const d=await data(req);if(d.consent!==true)throw new AppError(403,'Allow family sharing explicitly.');
    for(const [t,p] of pairs)if(p.sessionId===id)pairs.delete(t);
    const token=randomBytes(32).toString('hex');pairs.set(token,{sessionId:id});s.sharing=true;return json(res,201,{token,expiresAt:s.expiresAt});
   }
   if(action==='pair'&&req.method==='DELETE'){for(const [t,p] of pairs)if(p.sessionId===id)pairs.delete(t);s.sharing=false;return json(res,200,{revoked:true});}
   if(action==='evidence'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="scam-guardian-evidence.json"');return json(res,200,evidencePack(s));}
   throw new AppError(405,'Method not allowed.');
  }catch(e){metrics.inc('errors',{status:e.status||500,...(e.reason?{reason:e.reason}:{})});if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Unexpected server error. Please retry.',...(e.reason?{reason:e.reason}:{})},e.retryAfter?{'Retry-After':String(e.retryAfter)}:e.status===429?{'Retry-After':'60'}:{});else res.end();}
 });
 server.requestTimeout=30000;server.headersTimeout=10000;
 server.on('upgrade',(req,socket,head)=>{
  const reject=(status,text,extra='')=>{socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n${extra}\r\n`);socket.destroy();};
  try{
   if(!allowed(req,{requireOrigin:true}))throw Error();const url=new URL(req.url,'http://localhost'),s=find(url.searchParams.get('session')),rate=Number(url.searchParams.get('rate'));
   if(url.pathname!=='/api/listen'||s.mode!=='live'||![8000,16000,44100,48000].includes(rate)||streams.has(s.id))throw Error();
   try{limiter.take('listen',clientKey(req));paid();}catch(e){return reject(429,'Too Many Requests',`Retry-After: ${e.retryAfter||60}\r\n`);}
   wss.handleUpgrade(req,socket,head,client=>{
    let pending=0,chain=Promise.resolve(),bridge;
    const snapshot=next=>{if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify({type:'snapshot',session:sessionView(next)}));};
    streams.set(s.id,client);listeners.set(s.id,snapshot);s.status='listening';
    {const p=profile(s);if(enrolledWith(p)&&!s.attributor)Object.defineProperty(s,'attributor',{value:createAttributor({verifier,enrollment:p.enrollment,rate}),enumerable:false,writable:true});}
    bridge=createLiveBridge({client,session:s,rate,connect:(language,r,opts)=>providers.connect(language,r,opts),options:config.liveOptions,touch:()=>touch(s),onHealth:snapshot,
     onClosed:()=>{streams.delete(s.id);listeners.delete(s.id);},
     onTranscript:(text,key,at,timing,audio)=>{
      if(text.length>2000||pending>=5){client.send(JSON.stringify({type:'error',message:'Transcription is falling behind. Please restart.'}));bridge.close();client.close();return;}
      pending++;
      chain=chain.then(async()=>{await ingest(s,text,`${s.id}:${key}`,at,audio);const seg=s.segments.find(x=>x.id===`${s.id}:${key}`);if(seg)seg.timing=timing;snapshot(s);}).catch(()=>{client.send(JSON.stringify({type:'error',message:'Analysis failed. Please restart.'}));bridge.close();client.close();}).finally(()=>pending--);
     }});
   });
  }catch{reject(403,'Forbidden');}
 });
 const sweep=setInterval(()=>{limiter.sweep();for(const [k,d] of devices)if(d.lastUsedAt+DEVICE_IDLE_MS<Date.now()||d.createdAt+DEVICE_MAX_MS<Date.now()||!profiles.has(d.profileId))devices.delete(k);for(const [id,s]of sessions)if(s.expiresAt<Date.now())drop(id);for(const [token,p] of profiles){const keep=guardians.linkedTo(token).length?30*24*3600000:3600000;if(p.lastUsedAt+keep<Date.now())profiles.delete(token);}guardians.sweep();for(const [token,setup] of setups)if(setup.expiresAt<Date.now())setups.delete(token);},30000);sweep.unref();
 // Optional prewarm (PREWARM_WARNINGS=1): render the six standard warnings once at startup, counted against the daily cap.
 if(config.prewarmWarnings??process.env.PREWARM_WARNINGS==='1')(async()=>{for(const language of languages)for(const risk of ['careful','danger']){try{paid();warningCache.set(`${language}:${risk}`,{wav:await providers.warning(language,risk)});}catch{}}})();
 const persistTimer=store?setInterval(persistNow,config.persistEveryMs??5000):null;persistTimer?.unref?.();
 return {server,warningCache,persistNow,settle:()=>Promise.all([...sessions.values()].map(s=>s._llm)),close(){clearInterval(sweep);clearInterval(persistTimer);persistNow();for(const client of wss.clients)client.terminate();for(const id of sessions.keys())drop(id);wss.close();server.close();server.closeAllConnections();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 // Optional neural voice print (src/voice/sherpa.js). The built-in spectral baseline is used otherwise.
 const startup={};
 if(process.env.VOICE_EMBEDDER==='sherpa'){const {loadSherpaEmbedder}=await import('./voice/sherpa.js');startup.voiceEmbedder=loadSherpaEmbedder({model:process.env.VOICE_MODEL,threads:Number(process.env.VOICE_THREADS||1)});startup.verifierThresholds={match:Number(process.env.VOICE_MATCH||0.6),nonmatch:Number(process.env.VOICE_NONMATCH||0.35)};}
 // Decision 25: the LLM is compulsory in a real deployment. ALLOW_RULES_ONLY=1 is for local development only.
 if(!(process.env.LLM_API_KEY&&process.env.LLM_MODEL)&&process.env.ALLOW_RULES_ONLY!=='1'){console.error('LLM_API_KEY and LLM_MODEL are required (owner decision 25). For local development only, set ALLOW_RULES_ONLY=1.');process.exit(1);}
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3000);
 const app=createApp({allowedHosts:process.env.ALLOWED_HOSTS?.split(','),...startup});
 app.server.listen(port,host,()=>console.log(`Scam Guardian: http://${host}:${port}`));
 // Graceful shutdown: stop accepting, end sessions, write the state snapshot, then exit (forced after 5 s).
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{console.log(`Scam Guardian: ${signal}, shutting down`);setTimeout(()=>process.exit(0),5000).unref();app.close();app.server.once('close',()=>process.exit(0));});
}

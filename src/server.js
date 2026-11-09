import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import webpush from 'web-push';
import WebSocket, { WebSocketServer } from 'ws';
import { createSession, appendSegment, evidencePack, familyView, intervention, languages, mergeGroundedFlags } from './engine.js';
import { AppError, createProviders, classifyWithLlm, validateWav } from './providers.js';
import {toPcmWav} from './media.js';

const publicDir=new URL('../public/',import.meta.url);
const files={'/':'index.html','/family':'family.html','/app.js':'app.js','/style.css':'style.css','/family.js':'family.js','/capture.js':'capture.js','/pcm-worklet.js':'pcm-worklet.js','/demos.js':'demos.js','/family-state.js':'family-state.js','/warning-queue.js':'warning-queue.js','/stream-audio.js':'stream-audio.js','/sw.js':'sw.js','/manifest.webmanifest':'manifest.webmanifest','/icon.svg':'icon.svg'};
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'};
export function createApp(config={}) {
 const sessions=new Map(),pairs=new Map(),streams=new Map(),busy=new Set(),profiles=new Map(),setups=new Map();
 const providers=config.providers||createProviders(config);
 const vapidPublic=config.vapidPublic??process.env.VAPID_PUBLIC_KEY,vapidPrivate=config.vapidPrivate??process.env.VAPID_PRIVATE_KEY,vapidSubject=config.vapidSubject??process.env.VAPID_SUBJECT;
 const pushEnabled=!!(vapidPublic&&vapidPrivate&&vapidSubject&&(config.enablePush??process.env.ENABLE_PUSH==='1'));
 if(pushEnabled)webpush.setVapidDetails(vapidSubject,vapidPublic,vapidPrivate);
 const wss=new WebSocketServer({noServer:true,maxPayload:2048});
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
 function find(id){const s=sessions.get(id);if(!s||s.expiresAt<Date.now()){drop(id);throw new AppError(404,'Session ended or expired. Start a new session.');}return s;}
 function drop(id){const s=sessions.get(id);streams.get(id)?.close();sessions.delete(id);for(const [token,p] of pairs)if(p.sessionId===id)pairs.delete(token);if(s){const p=profile(s);if(p&&!([...sessions.values()].some(other=>other.profileToken===s.profileToken))){delete p.embedding;p.voiceConsent=false;}}}
 function profile(s){return profiles.get(s.profileToken);}
 function paired(req){const token=req.headers.authorization?.replace(/^Bearer /,'');const p=pairs.get(token);if(!p)throw new AppError(404,'Pairing revoked or expired.');return {token,p,s:find(p.sessionId)};}
 function pushSubscriptionValid(sub){try{const u=new URL(sub.endpoint);return u.protocol==='https:'&&(/(^|\.)fcm\.googleapis\.com$|(^|\.)push\.services\.mozilla\.com$|^web\.push\.apple\.com$|(^|\.)notify\.windows\.com$/).test(u.hostname)&&typeof sub.keys?.p256dh==='string'&&typeof sub.keys?.auth==='string'&&JSON.stringify(sub).length<5000;}catch{return false;}}
 function alertFamily(s){if(s.risk==='safe')return;const p=profile(s);if(!p)return;const reasons=[...new Set(s.flags.map(f=>f.label))];const event={at:Date.now(),risk:s.risk,reasons:reasons.slice(0,5),mode:s.mode};p.timeline.push(event);p.timeline=p.timeline.slice(-30);for(const [token,pair] of pairs){if(pair.sessionId!==s.id||!pair.subscription||!pushEnabled)continue;const payload=JSON.stringify({title:'Scam Guardian warning',body:reasons.slice(0,2).join(' · ')||'Check on your family member',url:`/family#${token}`});Promise.resolve().then(()=>(config.pushSender||webpush.sendNotification)(pair.subscription,payload,{TTL:60,timeout:5000})).catch(()=>{pair.pushStatus='delivery failed';});}}
 function allowed(req){const host=req.headers.host;const hosts=config.allowedHosts||['127.0.0.1','localhost','[::1]'];if(!hosts.some(h=>host===h||host?.startsWith(h+':')))return false;if(!req.headers.origin)return true;try{return new URL(req.headers.origin).host===host;}catch{return false;}}
 async function body(req,max=12000){let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>max)throw new AppError(413,'Request is too large.');chunks.push(b);}return Buffer.concat(chunks);}
 async function data(req){try{return JSON.parse((await body(req)).toString()||'{}');}catch(e){if(e instanceof AppError)throw e;throw new AppError(400,'Send valid JSON.');}}
 async function ingest(s,text,id){
  const before=s.risk;
  appendSegment(s,text,Date.now(),id);
  // Serialize per-session classification to avoid stale model replies overriding newer state.
  const recent=s.segments.filter(x=>Date.now()-x.at<=60000).slice(-20);
  const llm=await classifyWithLlm(recent,config);s.llmStatus=llm.status;
  if(llm.status==='available') {s.classifier='rules + grounded LLM';mergeGroundedFlags(s,llm.flags);}
  const cues=intervention(s);if(cues.coolingOff&&!s.coolingOffUntil)s.coolingOffUntil=Date.now()+600000;
  s.askCodeWord=cues.askCodeWord;
  if(s.risk!==before)alertFamily(s);
  return s;
 }
 async function exclusive(id,fn){if(busy.has(id))throw new AppError(429,'Analysis is already running. Please wait.');busy.add(id);try{return await fn();}finally{busy.delete(id);}}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self' blob:; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try{
   if(!allowed(req))throw new AppError(403,'This origin or host is not allowed.');
   const url=new URL(req.url,'http://localhost');const path=url.pathname;
   if(req.method==='GET'&&files[path]){const name=files[path];res.setHeader('Content-Type',name.endsWith('.webmanifest')?'application/manifest+json':types[name.split('.').at(-1)]);res.end(await readFile(new URL(name,publicDir)));return;}
   if(path==='/api/health'&&req.method==='GET')return json(res,200,{status:'ok',gnani:providers.configured?'configured, not verified':'not configured',llm:(config.llmKey??process.env.LLM_API_KEY)&&(config.llmModel??process.env.LLM_MODEL)?'configured':'rules only',push:pushEnabled?'configured, delivery unverified':'not configured'});
   if(path==='/api/push-key'&&req.method==='GET')return json(res,200,{publicKey:pushEnabled?vapidPublic:null});
   if(path==='/api/sessions'&&req.method==='POST'){
    const d=await data(req);if(d.consent!==true)throw new AppError(403,'Consent is required before starting.');
    if(!languages.includes(d.language)||!['demo','live','upload','text'].includes(d.mode))throw new AppError(400,'Choose a supported language and mode.');
    if(sessions.size>=30)throw new AppError(429,'Session capacity reached. End an old session.');
    let p=typeof d.profileToken==='string'?profiles.get(d.profileToken):null;
    if(!p){if(profiles.size>=100)throw new AppError(429,'Profile capacity reached. Retry later.');const token=randomBytes(32).toString('hex');p={token,timeline:[],language:d.language,codeWordConfigured:false,lastUsedAt:Date.now()};profiles.set(token,p);}else p.lastUsedAt=Date.now();
    const s=createSession(d.language,d.mode);s.profileToken=p.token;s.codeWordConfigured=p.codeWordConfigured;s.coolingOffUntil=null;s.askCodeWord=false;s.trustedVoice=false;sessions.set(s.id,s);return json(res,201,{id:s.id,profileToken:p.token});
   }
   if(path==='/api/timeline'&&req.method==='GET'){const token=req.headers.authorization?.replace(/^Bearer /,'');const p=profiles.get(token);if(!p)throw new AppError(404,'Profile expired.');return json(res,200,{timeline:p.timeline,codeWordConfigured:p.codeWordConfigured});}
   if(path==='/api/family'&&req.method==='GET'){
    const {p,s}=paired(req);return json(res,200,{...familyView(s),timeline:profile(s)?.timeline||[],codeWordConfigured:profile(s)?.codeWordConfigured||false,pushStatus:p.pushStatus||'not subscribed'});
   }
   if(path==='/api/family/push'&&req.method==='POST'){const {p}=paired(req);if(!pushEnabled)throw new AppError(503,'Push is not configured on the server.');const d=await data(req);if(!pushSubscriptionValid(d.subscription))throw new AppError(400,'Invalid push subscription.');p.subscription=d.subscription;p.pushStatus='subscribed; delivery unverified';return json(res,200,{subscribed:true});}
   if(path==='/api/family/push'&&req.method==='DELETE'){const {p}=paired(req);delete p.subscription;p.pushStatus='unsubscribed';return json(res,200,{subscribed:false});}
   if(path==='/api/family/codeword'&&req.method==='POST'){const {s}=paired(req),d=await data(req);if(d.confirmedOffline!==true||typeof d.word!=='string'||d.word.trim().length<6||d.word.length>40)throw new AppError(400,'Choose a 6–40 character private word and confirm you shared it directly with the senior.');profile(s).codeWordConfigured=true;s.codeWordConfigured=true;return json(res,200,{configured:true});}
   if(path==='/api/family/voice'&&req.method==='POST'){const {p}=paired(req);if(req.headers['x-voice-consent']!=='true')throw new AppError(403,'Explicit family voice consent is required.');const bytes=await body(req,1200000);const meta=await toPcmWav(bytes,req.headers['content-type']);const {duration}=validateWav(meta);if(duration<5||duration>30)throw new AppError(400,'Voice sample must be 5–30 seconds.');p.embedding=await providers.cloneVoice(meta);p.voiceConsent=true;return json(res,200,{enrolled:true});}
   if(path==='/api/family/voice'&&req.method==='DELETE'){const {p,s}=paired(req);delete p.embedding;p.voiceConsent=false;s.trustedVoice=false;return json(res,200,{enrolled:false});}
   if(path==='/api/family/setup'&&req.method==='POST'){const {s}=paired(req),d=await data(req);if(!languages.includes(d.language))throw new AppError(400,'Choose a supported language.');if(setups.size>=100)throw new AppError(429,'Too many setup links. Retry later.');const token=randomBytes(24).toString('hex');setups.set(token,{profileToken:s.profileToken,language:d.language,expiresAt:Date.now()+600000});const origin=config.publicOrigin||process.env.PUBLIC_ORIGIN||`http://${req.headers.host}`;const link=new URL(`/?setup=${token}`,origin).href;return json(res,201,{link,qr:await QRCode.toDataURL(link),expiresAt:Date.now()+600000});}
   const setupMatch=path.match(/^\/api\/setup\/([a-f0-9]{48})$/);
   if(setupMatch){const setup=setups.get(setupMatch[1]);if(!setup||setup.expiresAt<Date.now())throw new AppError(404,'Setup link expired.');if(req.method==='GET')return json(res,200,{language:setup.language});if(req.method==='POST'){const d=await data(req);if(d.consent!==true||!languages.includes(d.language))throw new AppError(400,'Confirm setup and choose a language.');const p=profiles.get(setup.profileToken);if(!p)throw new AppError(404,'Profile expired.');p.language=d.language;setups.delete(setupMatch[1]);return json(res,200,{profileToken:p.token,language:p.language});}}
   const match=path.match(/^\/api\/sessions\/([a-f0-9-]{36})(?:\/(segments|evidence|pair|warning|warning-stream|upload|trusted-voice|drill))?$/);
   if(!match)throw new AppError(404,'Not found.');
   const [,id,action]=match,s=find(id);
   if(!action&&req.method==='GET')return json(res,200,s);
   if(!action&&req.method==='DELETE'){drop(id);return json(res,200,{deleted:true});}
   if(action==='segments'&&req.method==='POST'){
    if(!['demo','text'].includes(s.mode))throw new AppError(400,'Manual transcript input is only available in synthetic modes.');
    const d=await data(req);if(typeof d.text!=='string'||!d.text.trim()||d.text.length>2000)throw new AppError(400,'Enter 1–2000 characters.');
    return json(res,200,await exclusive(id,()=>ingest(s,d.text.trim())));
   }
   if(action==='upload'&&req.method==='POST'){
    if(s.mode!=='upload')throw new AppError(400,'Start an upload session first.');
    const b=await body(req,12000000),wav=await toPcmWav(b,req.headers['content-type']);return json(res,200,await exclusive(id,async()=>ingest(s,await providers.transcribe(wav,s.language))));
   }
   if(action==='warning'&&req.method==='POST'){
    const p=profile(s);const audio=await exclusive(id,()=>s.trustedVoice&&p?.voiceConsent&&p.embedding?providers.clonedWarning(s.language,s.risk,p.embedding):providers.warning(s.language,s.risk));res.setHeader('Content-Type','audio/wav');return res.end(audio);
   }
   if(action==='warning-stream'&&req.method==='POST'){
    if(s.trustedVoice&&profile(s)?.embedding)throw new AppError(409,'Trusted voice uses the fixed warning endpoint.');
    await exclusive(id,async()=>{const iterator=providers.warningStream(s.language,s.risk)[Symbol.asyncIterator]();let current=await iterator.next();res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('X-Accel-Buffering','no');while(!current.done){res.write(`event: chunk\ndata: ${JSON.stringify({audio:current.value})}\n\n`);current=await iterator.next();}res.write('event: complete\ndata: {}\n\n');res.end();});return;
   }
   if(action==='trusted-voice'&&req.method==='POST'){const d=await data(req);if(typeof d.consent!=='boolean')throw new AppError(400,'Choose whether to use the trusted voice.');s.trustedVoice=d.consent;return json(res,200,{enabled:s.trustedVoice,available:!!profile(s)?.embedding});}
   if(action==='drill'&&req.method==='POST'){if(s.mode!=='demo')throw new AppError(400,'Start a practice session first.');const scripts={'en-IN':'This is the cyber police. Your family member is in custody. You have five minutes. Do not tell anyone. Transfer money to release them.','hi-IN':'मैं साइबर पुलिस से बोल रहा हूँ। आपका बेटा हिरासत में है। किसी को मत बताना। तुरंत पैसे भेजिए।','ta-IN':'நான் காவல்துறையிலிருந்து பேசுகிறேன். உங்கள் மகன் கைது செய்யப்பட்டார். யாரிடமும் சொல்ல வேண்டாம். உடனே பணம் அனுப்புங்கள்.'};const audio=await providers.drill(s.language,scripts[s.language]);res.setHeader('Content-Type','audio/wav');return res.end(audio);}
   if(action==='pair'&&req.method==='POST'){
    const d=await data(req);if(d.consent!==true)throw new AppError(403,'Allow family sharing explicitly.');
    for(const [t,p] of pairs)if(p.sessionId===id)pairs.delete(t);
    const token=randomBytes(32).toString('hex');pairs.set(token,{sessionId:id});s.sharing=true;return json(res,201,{token,expiresAt:s.expiresAt});
   }
   if(action==='pair'&&req.method==='DELETE'){for(const [t,p] of pairs)if(p.sessionId===id)pairs.delete(t);s.sharing=false;return json(res,200,{revoked:true});}
   if(action==='evidence'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="scam-guardian-evidence.json"');return json(res,200,evidencePack(s));}
   throw new AppError(405,'Method not allowed.');
  }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Unexpected server error. Please retry.'});else res.end();}
 });
 server.requestTimeout=30000;server.headersTimeout=10000;
 server.on('upgrade',(req,socket,head)=>{
  try{
   if(!allowed(req))throw Error();const url=new URL(req.url,'http://localhost'),s=find(url.searchParams.get('session')),rate=Number(url.searchParams.get('rate'));
   if(url.pathname!=='/api/listen'||s.mode!=='live'||![8000,16000,44100,48000].includes(rate)||streams.has(s.id))throw Error();
   wss.handleUpgrade(req,socket,head,client=>{
    streams.set(s.id,client);let upstream,ready=false,ended=false,pending=0,chain=Promise.resolve();
    const send=v=>{if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify(v));};
    const cleanup=()=>{if(ended)return;ended=true;clearTimeout(timer);clearTimeout(expiry);streams.delete(s.id);upstream?.terminate();s.status='stopped';};
    const fail=message=>{send({type:'error',message});client.close();cleanup();};
    const timer=setTimeout(()=>fail('Speech service did not become ready. Retry.'),12000);
    const expiry=setTimeout(()=>fail('Session expired. Start a new session.'),Math.max(1,s.expiresAt-Date.now()));
    client.on('close',cleanup);client.on('error',cleanup);
    try{upstream=providers.connect(s.language,rate);}catch(e){fail(e.message);return;}
    upstream.on('error',()=>fail('Speech connection failed. Check server credentials and retry.'));
    upstream.on('close',()=>{if(!ended)fail('Speech connection ended. Start again to resume listening.');});
    upstream.on('message',raw=>{
     if(ended)return;
     let d;try{d=JSON.parse(raw.toString());}catch{fail('Unexpected speech service response.');return;}
     if(d.type==='connected'){ready=true;clearTimeout(timer);s.status='listening';send({type:'ready'});}
     if(d.type==='error')fail('Speech service reported an error. Please retry.');
     if(d.type==='transcript'&&typeof d.text==='string'&&d.text.trim()){
      if(d.text.length>2000||pending>=5){fail('Transcription is falling behind. Please restart.');return;}
      pending++;
      chain=chain.then(async()=>{if(!ended){await ingest(s,d.text,d.segment_id);if(!ended)send({type:'snapshot',session:s});}}).catch(()=>fail('Analysis failed. Please restart.')).finally(()=>pending--);
     }
    });
    client.on('message',(data,binary)=>{
     if(!ready||!binary||data.length!==1024){fail('Invalid audio stream. Restart the microphone.');return;}
     if(upstream.readyState!==WebSocket.OPEN||upstream.bufferedAmount>64000){fail('Audio connection is too slow. Please restart.');return;}
     upstream.send(data);
    });
   });
  }catch{socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();}
 });
 const sweep=setInterval(()=>{for(const [id,s]of sessions)if(s.expiresAt<Date.now())drop(id);for(const [token,p] of profiles)if(p.lastUsedAt+3600000<Date.now())profiles.delete(token);for(const [token,setup] of setups)if(setup.expiresAt<Date.now())setups.delete(token);},30000);sweep.unref();
 return {server,close(){clearInterval(sweep);for(const client of wss.clients)client.terminate();for(const id of sessions.keys())drop(id);wss.close();server.close();server.closeAllConnections();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3000);
 const app=createApp({allowedHosts:process.env.ALLOWED_HOSTS?.split(',')});
 app.server.listen(port,host,()=>console.log(`Scam Guardian: http://${host}:${port}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close());
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/server.js';
import {createSession,appendSegment,intervention} from '../src/engine.js';

test('family login shares only reasons and timeline; setup, code word, voice and push honor consent and revocation',async t=>{
 const pushes=[];
 const app=createApp({gnaniKey:'',vapidPublic:'BBkF9BqiIPWqnrFOv0pW-4nwdRjjIM_83AKhT95mShLqqSlI-ioHNhWdoF_Rr91iu9NTs-7QuTFk2j6m-8ePnbQ',vapidPrivate:'bYG_kCnTHldCB5jD4nRwjVZb-Qs7nw8T96TRprmXoBA',vapidSubject:'mailto:test@example.com',enablePush:true,pushSender:async(_sub,payload)=>{pushes.push(JSON.parse(payload));},providers:{configured:false,warning:async()=>Buffer.alloc(44),warningStream:async function*(){yield 'AAAA';},clonedWarning:async()=>{cloned++;return Buffer.alloc(44);},cloneVoice:async()=>({embedding:'fake'}),drill:async()=>Buffer.alloc(44),transcribe:async()=> 'Police officer. Transfer money now.'}});
 let cloned=0;
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>app.close());
 const base=`http://127.0.0.1:${app.server.address().port}`;let cookie='';
 const call=async(path,method='GET',body,token)=>{const r=await fetch(base+path,{method,headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:r.status,data:await r.json()};};
 const created=await call('/api/sessions','POST',{language:'en-IN',mode:'text',consent:true});assert.equal(created.status,201);const {id,deviceToken:profileToken}=created.data;
 const paired=await call(`/api/sessions/${id}/pair`,'POST',{consent:true});const invite=paired.data.token;
 assert.equal((await call('/api/guardians/register','POST',{username:'family.one',passphrase:'our family passphrase',invite})).status,201);
 assert.equal((await call('/api/family/codeword','POST',{})).status,400);
 assert.equal((await call('/api/family/codeword','POST',{confirmedOffline:true,word:'Silver Mango'})).status,200);
 const setup=await call('/api/family/setup','POST',{language:'ta-IN'});assert.equal(setup.status,201);assert.match(setup.data.qr,/^data:image\/png;base64,/);
 const setupToken=new URL(setup.data.link).searchParams.get('setup');assert.equal((await call(`/api/setup/${setupToken}`)).data.language,'ta-IN');
 assert.equal((await call(`/api/setup/${setupToken}/claim`,'POST',{language:'ta-IN',consent:false})).status,400);
 const claim=await call(`/api/setup/${setupToken}/claim`,'POST',{language:'ta-IN',consent:true});assert.match(claim.data.code,/^\d{6}$/);
 assert.equal((await call(`/api/setup/${setupToken}/complete`,'POST',{claimId:claim.data.claimId})).status,409,'the link alone never yields a credential');
 assert.equal((await call('/api/family/setup/approve','POST',{code:claim.data.code})).status,200);
 const done=await call(`/api/setup/${setupToken}/complete`,'POST',{claimId:claim.data.claimId});assert.equal(done.status,200);assert.notEqual(done.data.deviceToken,profileToken);
 assert.equal((await call('/api/timeline','GET',null,done.data.deviceToken)).status,200,'the new device credential works for the same senior');
 assert.equal((await call(`/api/setup/${setupToken}/complete`,'POST',{claimId:claim.data.claimId})).status,404,'one-time');
 assert.equal((await call(`/api/setup/${setupToken}`)).status,404);
 const sub={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',keys:{p256dh:'test',auth:'test'}};
 assert.equal((await call('/api/family/push','POST',{subscription:{...sub,endpoint:'https://evil.invalid/'}})).status,400);
 assert.equal((await call('/api/family/push','POST',{subscription:sub})).status,200);
 await call(`/api/sessions/${id}/segments`,'POST',{text:'I am a police officer. Do not tell your family. Transfer INR 1000 to a safe account.'});
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(pushes.length,1);assert.equal(pushes[0].title,'Scam Guardian warning');assert.equal(pushes[0].url,'/family');assert.ok(!JSON.stringify(pushes[0]).includes('INR 1000'));
 const family=await call('/api/family');assert.equal(family.data.risk,'danger');assert.equal(family.data.timeline.length,1);assert.equal(family.data.codeWordConfigured,true);assert.ok(!JSON.stringify(family.data).includes('police officer'));
 const streamed=await fetch(base+`/api/sessions/${id}/warning-stream`,{method:'POST',headers:{Origin:base}});assert.equal(streamed.status,200);assert.match(await streamed.text(),/event: complete/);
 const timeline=await call('/api/timeline','GET',null,profileToken);assert.deepEqual(timeline.data.timeline,family.data.timeline);
 assert.equal((await call('/api/family/push','DELETE')).status,200);
 const pcm=Buffer.alloc(16000*2*5),sample=Buffer.alloc(44+pcm.length);sample.write('RIFF',0);sample.writeUInt32LE(sample.length-8,4);sample.write('WAVEfmt ',8);sample.writeUInt32LE(16,16);sample.writeUInt16LE(1,20);sample.writeUInt16LE(1,22);sample.writeUInt32LE(16000,24);sample.writeUInt32LE(32000,28);sample.writeUInt16LE(2,32);sample.writeUInt16LE(16,34);sample.write('data',36);sample.writeUInt32LE(pcm.length,40);
 const voice=headers=>fetch(base+'/api/family/voice',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'audio/wav',...headers},body:sample});
 assert.equal((await voice({})).status,403);
 assert.equal((await voice({'X-Voice-Consent':'true'})).status,200);
 assert.equal((await call(`/api/sessions/${id}/trusted-voice`,'POST',{consent:true})).data.available,true);
 assert.equal((await fetch(base+`/api/sessions/${id}/warning`,{method:'POST',headers:{Origin:base}})).status,200);
 assert.equal(cloned,1,'the enrolled family voice is used for the warning');
 assert.equal((await call('/api/family/voice','DELETE')).status,200);
 await call(`/api/sessions/${id}/pair`,'DELETE');const revoked=await call('/api/family');assert.equal(revoked.data.sharing,false);assert.equal(revoked.data.risk,undefined);
});

test('family-emergency prompt and payment cooling-off are evidence based',()=>{
 const s=createSession('en-IN','text');appendSegment(s,'Your son is in custody. Transfer INR 1,250.50 now.');
 assert.deepEqual(intervention(s),{askCodeWord:true,coolingOff:true});
 const benign=createSession('en-IN','text');appendSegment(benign,'Never share your OTP. Your parcel is arriving.');assert.deepEqual(intervention(benign),{askCodeWord:false,coolingOff:false});
});

test('PWA resources and accessible alert markup are served',async t=>{
 const app=createApp({gnaniKey:''});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`;
 for(const path of ['/manifest.webmanifest','/sw.js','/icon.svg'])assert.equal((await fetch(base+path)).status,200);
 const html=await(await fetch(base)).text();assert.match(html,/role="alertdialog"/);assert.match(html,/id="read-consent"/);assert.match(html,/id="drill-hangup"/);
});

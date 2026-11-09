import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/server.js';
import {createSession,appendSegment,intervention} from '../src/engine.js';

test('family pairing shares only reasons and timeline; setup, code word, voice and push honor consent and revocation',async t=>{
 const pushes=[];
 const app=createApp({gnaniKey:'',vapidPublic:'BBkF9BqiIPWqnrFOv0pW-4nwdRjjIM_83AKhT95mShLqqSlI-ioHNhWdoF_Rr91iu9NTs-7QuTFk2j6m-8ePnbQ',vapidPrivate:'bYG_kCnTHldCB5jD4nRwjVZb-Qs7nw8T96TRprmXoBA',vapidSubject:'mailto:test@example.com',enablePush:true,pushSender:async(_sub,payload)=>{pushes.push(JSON.parse(payload));},providers:{configured:false,warning:async()=>Buffer.alloc(44),warningStream:async function*(){yield 'AAAA';},clonedWarning:async()=>Buffer.alloc(44),cloneVoice:async()=>({embedding:'fake'}),drill:async()=>Buffer.alloc(44),transcribe:async()=> 'Police officer. Transfer money now.'}});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>app.close());
 const base=`http://127.0.0.1:${app.server.address().port}`;
 const call=async(path,method='GET',body,token)=>{const r=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
 const created=await call('/api/sessions','POST',{language:'en-IN',mode:'text',consent:true});assert.equal(created.status,201);const {id,profileToken}=created.data;
 const paired=await call(`/api/sessions/${id}/pair`,'POST',{consent:true});const token=paired.data.token;
 assert.equal((await call('/api/family/codeword','POST',{},token)).status,400);
 assert.equal((await call('/api/family/codeword','POST',{confirmedOffline:true,word:'Silver Mango'},token)).status,200);
 const setup=await call('/api/family/setup','POST',{language:'ta-IN'},token);assert.equal(setup.status,201);assert.match(setup.data.qr,/^data:image\/png;base64,/);
 const setupToken=new URL(setup.data.link).searchParams.get('setup');assert.equal((await call(`/api/setup/${setupToken}`)).data.language,'ta-IN');
 assert.equal((await call(`/api/setup/${setupToken}`,'POST',{language:'ta-IN',consent:false})).status,400);
 assert.equal((await call(`/api/setup/${setupToken}`,'POST',{language:'ta-IN',consent:true})).data.profileToken,profileToken);
 assert.equal((await call(`/api/setup/${setupToken}`)).status,404);
 const sub={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',keys:{p256dh:'test',auth:'test'}};
 assert.equal((await call('/api/family/push','POST',{subscription:{...sub,endpoint:'https://evil.invalid/'}},token)).status,400);
 assert.equal((await call('/api/family/push','POST',{subscription:sub},token)).status,200);
 await call(`/api/sessions/${id}/segments`,'POST',{text:'I am a police officer. Do not tell your family. Transfer INR 1000 to a safe account.'});
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(pushes.length,1);assert.equal(pushes[0].title,'Scam Guardian warning');assert.ok(!JSON.stringify(pushes[0]).includes('INR 1000'));
 const family=await call('/api/family','GET',null,token);assert.equal(family.data.risk,'danger');assert.equal(family.data.timeline.length,1);assert.equal(family.data.codeWordConfigured,true);assert.ok(!JSON.stringify(family.data).includes('police officer'));
 const streamed=await fetch(base+`/api/sessions/${id}/warning-stream`,{method:'POST'});assert.equal(streamed.status,200);assert.match(await streamed.text(),/event: complete/);
 const timeline=await call('/api/timeline','GET',null,profileToken);assert.deepEqual(timeline.data.timeline,family.data.timeline);
 assert.equal((await call('/api/family/push','DELETE',null,token)).status,200);
 const pcm=Buffer.alloc(16000*2*5),sample=Buffer.alloc(44+pcm.length);sample.write('RIFF',0);sample.writeUInt32LE(sample.length-8,4);sample.write('WAVEfmt ',8);sample.writeUInt32LE(16,16);sample.writeUInt16LE(1,20);sample.writeUInt16LE(1,22);sample.writeUInt32LE(16000,24);sample.writeUInt32LE(32000,28);sample.writeUInt16LE(2,32);sample.writeUInt16LE(16,34);sample.write('data',36);sample.writeUInt32LE(pcm.length,40);
 assert.equal((await fetch(base+'/api/family/voice',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'audio/wav'},body:sample})).status,403);
 assert.equal((await fetch(base+'/api/family/voice',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'audio/wav','X-Voice-Consent':'true'},body:sample})).status,200);
 assert.equal((await call(`/api/sessions/${id}/trusted-voice`,'POST',{consent:true})).data.enabled,true);
 assert.equal((await fetch(base+`/api/sessions/${id}/warning`,{method:'POST'})).status,200);
 assert.equal((await call('/api/family/voice','DELETE',null,token)).status,200);
 await call(`/api/sessions/${id}/pair`,'DELETE');assert.equal((await call('/api/family','GET',null,token)).status,404);
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

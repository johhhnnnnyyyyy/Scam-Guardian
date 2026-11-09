// Explicit credentialed synthetic local-server check. No browser or family delivery.
import {readFile} from 'node:fs/promises';
import {createApp} from '../src/server.js';
import {audioChunks,pcmChunk} from '../public/stream-audio.js';
import {validateWav} from '../src/providers.js';

if(!process.env.GNANI_API_KEY)throw Error('GNANI_API_KEY is absent.');
const manifest=JSON.parse(await readFile('artifacts/audio/manifest.json','utf8'));
const item=manifest.find(x=>x.capture?.startsWith('direct synthetic TTS'));
if(!item)throw Error('Generate one synthetic clip first.');
const wav=await readFile(item.path);validateWav(wav);
const app=createApp({allowedHosts:['127.0.0.1']});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${app.server.address().port}`;
const request=async(path,method='GET',body,headers={})=>{const response=await fetch(base+path,{method,headers:{...headers,...(body&&!(body instanceof Buffer)?{'Content-Type':'application/json'}:{})},body:body instanceof Buffer?body:body?JSON.stringify(body):undefined});if(!response.ok)throw Error(`${method} ${path} returned ${response.status}`);return response;};
try{
 const created=await(await request('/api/sessions','POST',{language:item.language,mode:'upload',consent:true})).json(),id=created.id;
 const analyzed=await(await request(`/api/sessions/${id}/upload`,'POST',wav,{'Content-Type':'audio/wav'})).json();
 const evidence=await(await request(`/api/sessions/${id}/evidence`)).json();
 const pair=await(await request(`/api/sessions/${id}/pair`,'POST',{consent:true})).json();
 const family=await(await request('/api/family','GET',null,{Authorization:`Bearer ${pair.token}`})).json();
 let audioChunksCount=0,audioSamples=0;const streamed=await request(`/api/sessions/${id}/warning-stream`,'POST',{});
 for await(const bytes of audioChunks(streamed)){audioChunksCount++;audioSamples+=pcmChunk(bytes).samples.length;}
 const drillSession=await(await request('/api/sessions','POST',{language:item.language,mode:'demo',consent:true})).json();
 const drill=Buffer.from(await(await request(`/api/sessions/${drillSession.id}/drill`,'POST',{})).arrayBuffer());
 console.log(JSON.stringify({kind:'credentialed synthetic local-server integration',uploadRisk:analyzed.risk,flagCount:analyzed.flags.length,evidenceSegments:evidence.segments.length,familyReasonCount:family.reasons.length,familyContainsTranscript:JSON.stringify(family).includes(item.reference),streamChunks:audioChunksCount,streamSamples:audioSamples,drillSeconds:validateWav(drill).duration}));
 await request(`/api/sessions/${id}`,'DELETE');await request(`/api/sessions/${drillSession.id}`,'DELETE');
}finally{app.close();}

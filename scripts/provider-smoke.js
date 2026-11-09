// Explicit credentialed synthetic checks. Prints metrics and status only, never keys or transcript text.
import {readFile} from 'node:fs/promises';
import {createProviders,validateWav} from '../src/providers.js';
import {pcmChunk} from '../public/stream-audio.js';
import {analyze} from '../src/engine.js';
import {wordErrorRate} from '../src/metrics.js';

const [mode,manifestPath='artifacts/audio/manifest.json']=process.argv.slice(2);
if(!['warning','stream','realtime','languages'].includes(mode)){console.log('Usage: node --env-file=.env scripts/provider-smoke.js warning|stream|realtime|languages [synthetic-manifest.json]');process.exit(1);}
if(!process.env.GNANI_API_KEY)throw Error('GNANI_API_KEY is absent.');
const p=createProviders();
if(mode==='warning'){
 const start=performance.now(),wav=await p.warning('en-IN','careful'),info=validateWav(wav);
 console.log(JSON.stringify({mode,ok:true,bytes:wav.length,durationSeconds:info.duration,firstResultMs:Math.round(performance.now()-start)}));
}
if(mode==='stream'){
 const start=performance.now();let chunks=0,samples=0,firstChunkMs=null;
 for await(const encoded of p.warningStream('en-IN','careful')){if(firstChunkMs===null)firstChunkMs=Math.round(performance.now()-start);const bytes=Buffer.from(encoded,'base64'),pcm=pcmChunk(bytes);samples+=pcm.samples.length;chunks++;}
 if(!samples)throw Error('Gnani stream completed without PCM samples.');
 console.log(JSON.stringify({mode,ok:true,chunks,samples,firstChunkMs,totalMs:Math.round(performance.now()-start)}));
}
if(mode==='languages'){
 const scripts={'hi-IN':'मैं सीबीआई अधिकारी हूँ। परिवार को मत बताना। अभी पाँच हजार रुपये ट्रांसफर करो।','ta-IN':'நான் காவல்துறை அதிகாரி. யாரிடமும் சொல்ல வேண்டாம். உடனே ஐயாயிரம் ரூபாய் பணம் அனுப்புங்கள்.'};
 const results=[];
 for(const [language,text] of Object.entries(scripts)){const wav=await p.drill(language,text),info=validateWav(wav),start=performance.now(),transcript=await p.transcribe(wav,language),restMs=Math.round(performance.now()-start),risk=analyze([{id:'synthetic',text:transcript,at:Date.now()}]).risk;results.push({language,ttsSeconds:info.duration,sttMs:restMs,transcriptLength:transcript.length,wer:wordErrorRate(text,transcript).wer,risk});}
 console.log(JSON.stringify({mode,kind:'direct synthetic TTS to REST STT; not speaker captured',results}));
}
if(mode==='realtime'){
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));const item=manifest.find(x=>x.capture?.startsWith('direct synthetic TTS'));
 if(!item)throw Error('Provide a generated synthetic manifest.');
 const wav=await readFile(item.path),info=validateWav(wav);
 if(info.rate!==16000||info.channels!==1)throw Error('Realtime smoke needs 16 kHz mono synthetic WAV.');
 let dataStart=-1,dataSize=0;for(let pos=12;pos+8<=wav.length;){const size=wav.readUInt32LE(pos+4);if(wav.toString('ascii',pos,pos+4)==='data'){dataStart=pos+8;dataSize=size;break;}pos+=8+size+(size%2);}
 if(dataStart<0)throw Error('Synthetic WAV has no PCM data.');
 const socket=p.connect(item.language,16000),start=performance.now();let ready=false,segments=0,errors=0,finished=false,readyMs=null,audioEndMs=null,providerLatencyMs=null;
 const result=await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{socket.terminate();reject(Error('Realtime transcription timed out.'));},18000);
  const done=(error)=>{if(finished)return;finished=true;clearTimeout(timeout);socket.terminate();if(error)reject(error);else resolve({mode,ok:segments>0,ready,segments,errors,readyMs,audioEndMs,providerLatencyMs,elapsedMs:Math.round(performance.now()-start)});};
  socket.on('error',()=>done(Error('Realtime socket failed.')));
  socket.on('close',()=>{if(!finished)done(Error('Realtime socket closed before a transcript.'));});
  socket.on('message',raw=>{let event;try{event=JSON.parse(raw.toString());}catch{return done(Error('Malformed realtime provider event.'));}if(event.type==='error'){errors++;return done(Error('Realtime provider reported an error.'));}if(event.type==='transcript'&&event.text?.trim()){segments++;providerLatencyMs=typeof event.latency==='number'?event.latency:null;done();}if(event.type==='connected'&&!ready){ready=true;readyMs=Math.round(performance.now()-start);void (async()=>{for(let offset=0;offset<dataSize&&!finished;offset+=1024){const frame=Buffer.alloc(1024);wav.copy(frame,0,dataStart+offset,dataStart+Math.min(dataSize,offset+1024));socket.send(frame);await new Promise(r=>setTimeout(r,32));}audioEndMs=Math.round(performance.now()-start);for(let i=0;i<30&&!finished;i++){socket.send(Buffer.alloc(1024));await new Promise(r=>setTimeout(r,32));}})().catch(()=>done(Error('Audio send failed.')));}});
 });
 console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;
}

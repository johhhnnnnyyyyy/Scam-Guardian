// Explicit CLI only; no cloud calls occur on npm test or npm run evaluate.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {calls} from '../fixtures/calls.js';
import {createProviders,validateWav,normalizeProviderWav} from '../src/providers.js';
import {wordErrorRate} from '../src/metrics.js';
import {analyze} from '../src/engine.js';
const [command,arg]=process.argv.slice(2);
const voices={'en-IN':'Kaveri','hi-IN':'Chitra','ta-IN':'Trisha'};
if(!['generate','score'].includes(command)){
 console.log('Usage: node --env-file=.env scripts/audio-benchmark.js generate [count]\n       node --env-file=.env scripts/audio-benchmark.js score manifest.json\nCloud commands consume Gnani credits. generate defaults to ONE synthetic clip.');
}else{
 if(!process.env.GNANI_API_KEY)throw Error('GNANI_API_KEY is required; no cloud benchmark was run.');
 await mkdir('artifacts/audio',{recursive:true});
 if(command==='generate'){
  const count=Number(arg||1);if(!Number.isInteger(count)||count<1||count>100)throw Error('Count must be 1–100.');
  const manifest=[];
  for(const c of calls.slice(0,count)){
   const response=await fetch('https://api.vachana.ai/api/v1/tts/inference',{method:'POST',headers:{'Content-Type':'application/json','X-API-Key-ID':process.env.GNANI_API_KEY},signal:AbortSignal.timeout(30000),body:JSON.stringify({text:c.segments.join(' '),voice:voices[c.language],model:'timbre-v2.5',language:c.language,speed:1,audio_config:{sample_rate:16000,num_channels:1,sample_width:2,encoding:'linear_pcm',container:'wav'}})});
   if(!response.ok)throw Error(`Timbre failed: ${response.status}; completed clips remain on disk.`);
   const bytes=normalizeProviderWav(Buffer.from(await response.arrayBuffer()));const path=resolve(`artifacts/audio/${c.id}.wav`);await writeFile(path,bytes);manifest.push({id:c.id,path,language:c.language,reference:c.segments.join(' '),label:c.label,capture:'direct synthetic TTS; not speaker captured'});
   await writeFile('artifacts/audio/manifest.json',JSON.stringify(manifest,null,2));
  }
  console.log(`Generated ${manifest.length} synthetic clips. Manifest: artifacts/audio/manifest.json`);
 }else{
  const manifest=JSON.parse(await readFile(arg,'utf8'));if(!Array.isArray(manifest)||manifest.length>100)throw Error('Expected a manifest array of up to 100 synthetic recordings.');
  const provider=createProviders(),results=[];
  for(const item of manifest){if(!item.path||!item.reference||!voices[item.language])throw Error('Each manifest item needs path, reference and supported language.');const bytes=await readFile(item.path),format=validateWav(bytes),start=performance.now(),text=await provider.transcribe(bytes,item.language);const restWallMs=performance.now()-start,risk=analyze([{id:item.id,text,at:Date.now()}]).risk;results.push({...item,transcript:text,...wordErrorRate(item.reference,text),durationSeconds:format.duration,restWallMs,risk});await writeFile('artifacts/audio/results.json',JSON.stringify({kind:'REST clip evaluation; not live warning latency',results},null,2));}
  console.log(`Scored ${results.length} clips. Results: artifacts/audio/results.json`);
 }
}

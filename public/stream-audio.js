export async function* audioChunks(response,signal){
 if(!response.body)throw Error('Streaming audio is unavailable.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',complete=false;
 const cancel=()=>reader.cancel().catch(()=>{});signal?.addEventListener('abort',cancel,{once:true});
 try{for(;;){const {done,value}=await reader.read();if(done)break;pending=(pending+decoder.decode(value,{stream:true})).replace(/\r\n/g,'\n');if(pending.length>2000000)throw Error('Warning stream is too large.');let boundary;while((boundary=pending.indexOf('\n\n'))>=0){const frame=pending.slice(0,boundary);pending=pending.slice(boundary+2);const event=frame.split('\n').find(line=>line.startsWith('event:'))?.slice(6).trim();const data=frame.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim()).join('');if(event==='error')throw Error('Spoken warning interrupted. Read the screen and retry.');if(event==='complete'){complete=true;return;}if(event==='chunk'){let encoded;try{encoded=JSON.parse(data).audio;}catch{throw Error('Warning audio was malformed.');}if(typeof encoded!=='string'||encoded.length>1000000)throw Error('Warning audio was malformed.');yield Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));}}}}finally{signal?.removeEventListener('abort',cancel);reader.releaseLock();}
 if(!complete)throw Error('Spoken warning ended early. Read the screen and retry.');
}
export function pcmChunk(bytes,defaultRate=24000){
 let offset=0,rate=defaultRate,channels=1;
 if(bytes.length>=44&&String.fromCharCode(...bytes.subarray(0,4))==='RIFF'){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let found=false;
  for(let p=12;p+8<=bytes.length;){const kind=String.fromCharCode(...bytes.subarray(p,p+4)),size=view.getUint32(p+4,true);if(kind==='fmt '&&p+24<=bytes.length){channels=view.getUint16(p+10,true);rate=view.getUint32(p+12,true);if(view.getUint16(p+8,true)!==1||view.getUint16(p+22,true)!==16)throw Error('Unsupported warning audio.');}if(kind==='data'){offset=p+8;found=true;break;}p+=8+size+(size%2);}if(!found)throw Error('Warning WAV data missing.');
 }
 if(channels!==1||rate<8000||rate>48000||(bytes.length-offset)%2)throw Error('Unsupported warning audio.');
 const view=new DataView(bytes.buffer,bytes.byteOffset+offset,bytes.length-offset),samples=new Float32Array((bytes.length-offset)/2);for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;return {samples,rate};
}
export async function playWarningStream(response,context,onFirst,signal){
 let next=context.currentTime+0.05,heard=false;
 for await(const bytes of audioChunks(response,signal)){
  if(signal.aborted)throw Error('Warning cancelled.');const {samples,rate}=pcmChunk(bytes);if(!samples.length)continue;const buffer=context.createBuffer(1,samples.length,rate);buffer.copyToChannel(samples,0);const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start(next);next+=buffer.duration;if(!heard){heard=true;onFirst();}
 }
 if(!heard)throw Error('No warning audio was produced.');
 const remaining=Math.max(0,(next-context.currentTime)*1000);await new Promise(resolve=>setTimeout(resolve,remaining));
}

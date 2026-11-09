import {spawn} from 'node:child_process';
import {AppError,validateWav} from './providers.js';

const accepted=new Set(['audio/wav','audio/wave','audio/x-wav','audio/mpeg','audio/mp3','audio/ogg','audio/mp4','audio/x-m4a','audio/webm','audio/flac','audio/aac']);
export async function toPcmWav(bytes,mime){
 const type=String(mime||'').split(';')[0].toLowerCase();
 if(!accepted.has(type))throw new AppError(400,'Choose a WAV, MP3, OGG, M4A, WebM, FLAC, or AAC voice note.');
 if(bytes.length===0||bytes.length>12000000)throw new AppError(413,'Audio must be smaller than 12 MB.');
 if(['audio/wav','audio/wave','audio/x-wav'].includes(type)){validateWav(bytes);return bytes;}
 return new Promise((resolve,reject)=>{
  const child=spawn('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-i','pipe:0','-t','61','-ac','1','-ar','16000','-c:a','pcm_s16le','-f','s16le','pipe:1'],{stdio:['pipe','pipe','ignore']});
  const chunks=[];let size=0,settled=false;const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve(value);};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new AppError(504,'Audio conversion timed out.'));},15000);
  child.stdout.on('data',part=>{size+=part.length;if(size>2000000){child.kill('SIGKILL');finish(new AppError(413,'Audio must be no longer than 60 seconds.'));}else chunks.push(part);});
  child.on('error',()=>finish(new AppError(503,'Audio conversion is unavailable on this server. Install ffmpeg.')));
  child.on('close',code=>{if(settled)return;if(code!==0)return finish(new AppError(400,'This audio format could not be decoded.'));const pcm=Buffer.concat(chunks),wav=Buffer.alloc(44+pcm.length);wav.write('RIFF',0);wav.writeUInt32LE(36+pcm.length,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length,40);pcm.copy(wav,44);try{validateWav(wav);finish(null,wav);}catch(error){finish(error);}});
  child.stdin.on('error',()=>{});child.stdin.end(bytes);
 });
}

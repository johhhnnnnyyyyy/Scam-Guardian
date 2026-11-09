import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {toPcmWav} from '../src/media.js';
import {validateWav} from '../src/providers.js';

function wav(seconds=1){const pcm=Buffer.alloc(16000*2*seconds),b=Buffer.alloc(44+pcm.length);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(pcm.length,40);pcm.copy(b,44);return b;}
test('audio upload accepts bounded WAV and rejects unsupported or excessive input',async()=>{
 const source=wav();assert.equal(await toPcmWav(source,'audio/wav'),source);
 await assert.rejects(toPcmWav(source,'video/mp4'),/Choose a WAV/);
 await assert.rejects(toPcmWav(Buffer.alloc(12000001),'audio/mpeg'),/smaller than 12 MB/);
 await assert.rejects(toPcmWav(wav(61),'audio/wav'),/60 seconds/);
});
test('compressed voice-note conversion produces valid 16 kHz mono PCM',async t=>{
 if(spawnSync('ffmpeg',['-version']).status!==0){t.skip('ffmpeg unavailable');return;}
 const compressed=spawnSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','1','-codec:a','libmp3lame','-f','mp3','pipe:1'],{maxBuffer:1000000,timeout:5000});assert.equal(compressed.status,0);
 const decoded=await toPcmWav(compressed.stdout,'audio/mpeg');const info=validateWav(decoded);assert.equal(info.rate,16000);assert.equal(info.channels,1);assert.ok(info.duration>=0.9&&info.duration<=1.1);
});

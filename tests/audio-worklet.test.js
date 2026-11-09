import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('audio worklet emits exact 1024-byte clamped PCM frames across callbacks',async()=>{
 let Processor;const frames=[];
 const sandbox={AudioWorkletProcessor:class{constructor(){this.port={postMessage:buffer=>frames.push(buffer)};}},registerProcessor:(name,ctor)=>{assert.equal(name,'pcm-capture');Processor=ctor;},Int16Array,Math};
 vm.runInNewContext(await readFile(new URL('../public/pcm-worklet.js',import.meta.url),'utf8'),sandbox);
 const processor=new Processor();processor.process([[new Float32Array(128).fill(2)]]);assert.equal(frames.length,0);for(let i=0;i<3;i++)processor.process([[new Float32Array(128).fill(-2)]]);
 assert.equal(frames.length,1);assert.equal(frames[0].byteLength,1024);const pcm=new Int16Array(frames[0]);assert.equal(pcm[0],32767);assert.equal(pcm[511],-32768);assert.equal(processor.process([]),true);
});

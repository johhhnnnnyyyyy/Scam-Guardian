import test from 'node:test';
import assert from 'node:assert/strict';
import {createProviders} from '../src/providers.js';
import {audioChunks,pcmChunk} from '../ui/src/lib/stream-audio.js';

test('Gnani SSE audio chunks forward without waiting for the full warning',async()=>{
 const raw=Buffer.from([0,0,255,127]);
 const encoder=new TextEncoder();const frames=`event: start\r\ndata: {}\r\n\r\nevent: chunk\r\ndata: ${JSON.stringify({audio:raw.toString('base64')})}\r\n\r\nevent: complete\r\ndata: {}\r\n\r\n`;
 const calls=[];const p=createProviders({gnaniKey:'test',fetcher:async(url,options)=>{calls.push({url,options});return new Response(new ReadableStream({start(controller){controller.enqueue(encoder.encode(frames.slice(0,31)));controller.enqueue(encoder.encode(frames.slice(31)));controller.close();}}),{status:200});}});
 const values=[];for await(const audio of p.warningStream('hi-IN','danger'))values.push(audio);
 assert.deepEqual(values,[raw.toString('base64')]);assert.match(calls[0].url,/\/tts\/sse$/);assert.equal(calls[0].options.headers['X-API-Key-ID'],'test');
 const client=new Response(`event: chunk\ndata: ${JSON.stringify({audio:values[0]})}\n\nevent: complete\ndata: {}\n\n`);
 const chunks=[];for await(const bytes of audioChunks(client))chunks.push(bytes);assert.deepEqual([...chunks[0]],[...raw]);
 assert.deepEqual([...pcmChunk(chunks[0]).samples],[0,32767/32768]);
});
test('premature or malformed speech stream fails visibly',async()=>{
 const p=createProviders({gnaniKey:'test',fetcher:async()=>new Response('event: chunk\ndata: {"audio":"AA=="}\n\n',{status:200})});
 await assert.rejects(async()=>{for await(const _ of p.warningStream('en-IN','danger')){}},/ended early/);
 await assert.rejects(async()=>{for await(const _ of audioChunks(new Response('event: error\ndata: {}\n\n'))){}} ,/interrupted/);
});

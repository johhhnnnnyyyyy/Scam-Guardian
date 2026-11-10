import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter,once} from 'node:events';
import WebSocket from 'ws';
import {createApp} from '../src/server.js';
test('real local WebSocket forwards exact PCM, deduplicates transcripts and cleans up',async t=>{
 const upstream=new EventEmitter();upstream.readyState=WebSocket.OPEN;upstream.bufferedAmount=0;const frames=[];let terminated=false;
 upstream.send=b=>frames.push(Buffer.from(b));upstream.terminate=()=>{terminated=true;};
 const app=createApp({requireEnrollment:false,providers:{configured:true,connect(language,rate){assert.equal(language,'hi-IN');assert.equal(rate,16000);setTimeout(()=>upstream.emit('message',Buffer.from('{"type":"connected"}')),15);return upstream;}}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const port=app.server.address().port,base=`http://127.0.0.1:${port}`;
 const {id}=await(await fetch(base+'/api/sessions',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({language:'hi-IN',mode:'live',consent:true})})).json();
 const client=new WebSocket(`ws://127.0.0.1:${port}/api/listen?session=${id}&rate=16000`,{origin:base});const events=[];client.on('message',b=>events.push(JSON.parse(b)));t.after(()=>client.terminate());
 await once(client,'message');assert.equal(events[0].type,'ready');client.send(Buffer.alloc(1024));await new Promise(r=>setTimeout(r,20));assert.equal(frames[0].length,1024);
 const message={type:'transcript',text:'अपना ओटीपी बताइए।',segment_id:'one'};const next=once(client,'message');upstream.emit('message',Buffer.from(JSON.stringify(message)));await next;assert.equal(events.at(-1).session.risk,'danger');
 const duplicate=once(client,'message');upstream.emit('message',Buffer.from(JSON.stringify(message)));await duplicate;assert.equal(events.at(-1).session.segments.length,1);
 const closed=once(client,'close');client.send(Buffer.alloc(12));await closed;assert.match(events.at(-1).message,/Invalid audio/);assert.ok(terminated);
 const state=await(await fetch(base+`/api/sessions/${id}`)).json();assert.equal(state.status,'stopped');
});

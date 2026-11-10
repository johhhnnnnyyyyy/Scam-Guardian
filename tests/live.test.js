import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import WebSocket from 'ws';
import { createApp } from '../src/server.js';

// A fake Gnani realtime socket.
function fakeUpstream() {
 const ws = new EventEmitter();
 ws.readyState = WebSocket.OPEN; ws.bufferedAmount = 0; ws.frames = []; ws.texts = []; ws.terminated = false;
 ws.send = b => { if (typeof b === 'string') ws.texts.push(JSON.parse(b)); else ws.frames.push(Buffer.from(b)); };
 ws.terminate = () => { ws.terminated = true; ws.readyState = WebSocket.CLOSED; };
 ws.say = obj => ws.emit('message', Buffer.from(JSON.stringify(obj)));
 return ws;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(check, ms = 2000) { const end = Date.now() + ms; while (Date.now() < end) { if (check()) return; await wait(5); } assert.fail('condition not met in time'); }

async function start(t, liveOptions = {}) {
 const upstreams = [], connects = [];
 const app = createApp({ requireEnrollment: false, liveOptions: { random: () => 0, micSilentMs: 60000, tickMs: 20, ...liveOptions }, providers: { configured: true, connect(language, rate, opts) { connects.push(opts); const u = fakeUpstream(); upstreams.push(u); setTimeout(() => u.say({ type: 'connected' }), 5); return u; } } });
 await new Promise(r => app.server.listen(0, '127.0.0.1', r));
 t.after(() => app.close());
 const port = app.server.address().port, base = `http://127.0.0.1:${port}`;
 const { id } = await (await fetch(base + '/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ language: 'en-IN', mode: 'live', consent: true }) })).json();
 const client = new WebSocket(`ws://127.0.0.1:${port}/api/listen?session=${id}&rate=16000`, { origin: base });
 const events = [];
 client.on('message', b => events.push(JSON.parse(b)));
 t.after(() => client.terminate());
 await until(() => events.some(e => e.type === 'ready'));
 const state = async () => (await fetch(base + `/api/sessions/${id}`)).json();
 return { app, id, client, events, upstreams, connects, state };
}

test('F-13: an upstream drop reconnects, replays held audio and keeps the session', async t => {
 const { client, events, upstreams, connects, state } = await start(t);
 client.send(Buffer.alloc(1024, 1));
 await until(() => upstreams[0].frames.length === 1);
 upstreams[0].readyState = WebSocket.CLOSED;
 upstreams[0].emit('close', 1006);
 await until(() => events.some(e => e.type === 'health' && e.health.state === 'reconnecting'));
 client.send(Buffer.alloc(1024, 2)); // spoken while reconnecting: held in the buffer
 await until(() => upstreams.length === 2 && upstreams[1].frames.length === 1);
 assert.equal(upstreams[1].frames[0][0], 2, 'held audio was replayed, already-sent audio was not');
 assert.match(connects[1].requestId, /-c2$/);
 await until(() => events.some(e => e.type === 'health' && e.health.state === 'listening' && events.indexOf(e) > events.findIndex(x => x.health?.state === 'reconnecting')));
 upstreams[1].say({ type: 'transcript', text: 'Tell me your OTP.', segment_id: 'x-seg-1', segment_index: 1 });
 await until(() => events.some(e => e.type === 'snapshot' && e.session.risk === 'danger'));
 const s = await state();
 assert.equal(s.health.stt, 'listening');
 assert.equal(s.segments.length, 1);
});

test('F-13: rejected credentials stop listening honestly but keep the session and its evidence', async t => {
 const { client, events, upstreams, state } = await start(t);
 const closed = once(client, 'close');
 upstreams[0].say({ type: 'transcript', text: 'I am a CBI officer.', segment_index: 1 });
 await until(() => events.some(e => e.type === 'snapshot'));
 upstreams[0].emit('close', 1006);
 await until(() => upstreams.length === 2);
 upstreams[1].emit('unexpected-response', {}, { statusCode: 401 });
 await until(() => events.some(e => e.type === 'error'));
 await closed;
 const s = await state();
 assert.equal(s.health.stt, 'stt_down');
 assert.equal(s.segments.length, 1, 'evidence kept');
});

test('B-11: a single utterance error does not end the call; repeated errors mark it degraded', async t => {
 const { events, upstreams, state } = await start(t);
 upstreams[0].say({ type: 'error', message: 'utterance failed' });
 await wait(30);
 assert.equal((await state()).health.stt, 'listening');
 upstreams[0].say({ type: 'error', message: 'utterance failed' });
 await until(() => events.some(e => e.type === 'health' && e.health.state === 'stt_degraded'));
 assert.ok(!events.some(e => e.type === 'error'));
});

test('B-11: pause keeps the audio clock running with silence and reports paused', async t => {
 const { client, events, upstreams } = await start(t);
 client.send(JSON.stringify({ type: 'pause' }));
 await until(() => events.some(e => e.type === 'health' && e.health.state === 'paused'));
 await until(() => upstreams[0].frames.length >= 3);
 assert.ok(upstreams[0].frames.every(f => f.every(b => b === 0)), 'silence frames during the pause');
 client.send(JSON.stringify({ type: 'resume' }));
 await until(() => events.some(e => e.type === 'health' && e.health.state === 'listening' && events.indexOf(e) > events.findIndex(x => x.health?.state === 'paused')));
});

test('F-11: segments are timed from the audio clock, and empty segment ids never collide', async t => {
 const { client, events, upstreams, state } = await start(t);
 for (let i = 0; i < 50; i++) client.send(Buffer.alloc(1024));   // 50 frames × 32 ms = 1600 ms of audio
 await until(() => upstreams[0].frames.length === 50);
 upstreams[0].say({ type: 'processing' });
 upstreams[0].say({ type: 'transcript', text: 'Hello, how are you.', segment_id: '', audio_duration_ms: 900 });
 upstreams[0].say({ type: 'transcript', text: 'I am fine.', segment_id: '' });
 await until(() => events.filter(e => e.type === 'snapshot').length >= 2);
 const s = await state();
 assert.equal(s.segments.length, 2, 'two empty ids are two segments');
 const timing = s.segments[0].timing;
 assert.equal(timing.clock, 'audio');
 assert.equal(timing.audioEndMs, 1600 - 400);
 assert.equal(timing.audioStartMs, 1600 - 400 - 900);
 assert.equal(s.clock, 'audio');
});

test('F-13: rotation sends commit and reconnects before the provider limit without counting as a failure', async t => {
 const { upstreams, events } = await start(t, { rotateAfterMs: 60, rotateHardMs: 120, commitWaitMs: 20 });
 upstreams[0].close = () => upstreams[0].emit('close', 1000);
 await until(() => upstreams.length === 2, 3000);
 assert.deepEqual(upstreams[0].texts.at(-1), { type: 'commit' });
 assert.ok(!events.some(e => e.type === 'health' && e.health.state === 'reconnecting'), 'planned rotation is not shown as a drop');
});

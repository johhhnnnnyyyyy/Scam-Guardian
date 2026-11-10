import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { createApp } from '../src/server.js';
import { createVerifier, channelFeatures, enrollmentQuality } from '../src/acoustics.js';
import { createAttributor, decide } from '../src/attribution.js';
import { createSession, appendSegment } from '../src/engine.js';
import { voice, phoneLine, turnedAway, toInt16 } from './helpers/audio.js';

const RATE = 16000;
const SENIOR = { f0: 125, formants: [550, 1100, 2500] };
const SENIOR_LATER = { f0: 128, formants: [560, 1120, 2540] }; // same person, a little different on another turn
const CALLER = { f0: 190, formants: [750, 1700, 2900] };
const silence = ms => new Float32Array(Math.round((ms / 1000) * RATE));
const join = (...parts) => { const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

async function enrolled() {
 const verifier = createVerifier();
 const pcm = voice({ ...SENIOR, seconds: 10, seed: 3 });
 return { verifier, enrollment: { print: await verifier.enroll(pcm, RATE), channel: channelFeatures(pcm, RATE) } };
}

test('decision 24: the decision table — "senior" only when both acoustic tests agree; clones are never senior', () => {
 const long = 2500;
 assert.equal(decide({ voice: 'match', channel: 'live', voicedMs: long }).speaker, 'senior');
 assert.equal(decide({ voice: 'match', channel: 'live', text: 'caller', voicedMs: long }).speaker, 'unsure', 'words contradicting a senior label veto it');
 assert.equal(decide({ voice: 'match', channel: 'live', llm: 'caller', voicedMs: long }).speaker, 'unsure', 'so does the LLM');
 assert.equal(decide({ voice: 'match', channel: 'unknown', text: 'senior', llm: 'senior', voicedMs: long }).speaker, 'unsure', 'one acoustic test is not enough for senior');
 const clone = decide({ voice: 'match', channel: 'phone', voicedMs: long });
 assert.equal(clone.speaker, 'unsure'); assert.equal(clone.spoofSuspect, true);
 assert.equal(decide({ voice: 'nonmatch', channel: 'phone', voicedMs: long }).speaker, 'caller');
 assert.equal(decide({ voice: 'unknown', channel: 'phone', text: 'caller', voicedMs: long }).confidence, 'medium');
 assert.equal(decide({ voice: 'nonmatch', channel: 'unknown', llm: 'caller', voicedMs: long }).speaker, 'caller', 'wideband call: voice + words');
 assert.equal(decide({ voice: 'nonmatch', channel: 'unknown', voicedMs: long }).speaker, 'unsure');
 assert.equal(decide({ voice: 'match', channel: 'live', voicedMs: 900 }).speaker, 'unsure', 'turns under 1.5 s carry no voice evidence');
 assert.equal(decide({ text: 'senior', llm: 'senior', voicedMs: 0 }).speaker, 'unsure', 'words alone never make a turn senior');
});

test('decision 24: turn-taking — a phone-line turn right after a certain "You" turn is the caller', () => {
 const r = decide({ voice: 'unknown', channel: 'phone', previous: { speaker: 'senior', confidence: 'high' }, voicedMs: 2500 });
 assert.equal(r.speaker, 'caller');
 assert.equal(r.confidence, 'medium');
 assert.match(r.basis, /turn/);
});

test('decision 24: turn-taking never makes "You", never acts alone, and yields to the words', () => {
 const certainYou = { speaker: 'senior', confidence: 'high' }, certainCaller = { speaker: 'caller', confidence: 'high' };
 assert.equal(decide({ previous: certainYou, voicedMs: 2500 }).speaker, 'unsure', 'turn-taking alone is not enough');
 assert.equal(decide({ voice: 'unknown', channel: 'live', previous: certainCaller, voicedMs: 2500 }).speaker, 'unsure', 'after the caller does not mean "You"');
 assert.equal(decide({ voice: 'unknown', channel: 'phone', previous: { speaker: 'senior', confidence: 'medium' }, voicedMs: 2500 }).speaker, 'unsure', 'only a certain previous turn counts');
 assert.equal(decide({ voice: 'unknown', channel: 'phone', text: 'senior', previous: certainYou, voicedMs: 2500 }).speaker, 'unsure', 'words pointing at the senior block it');
 assert.equal(decide({ voice: 'unknown', channel: 'phone', previous: certainYou, voicedMs: 900 }).speaker, 'unsure', 'short turns stay unsure');
 assert.equal(decide({ voice: 'match', channel: 'live', previous: certainYou, voicedMs: 2500 }).speaker, 'senior', 'the senior can speak twice in a row');
});

test('decision 24: turn-taking — on a wideband call, a different voice right after a certain "You" turn is the caller', () => {
 const r = decide({ voice: 'nonmatch', channel: 'unknown', previous: { speaker: 'senior', confidence: 'high' }, voicedMs: 2500 });
 assert.equal(r.speaker, 'caller');
 assert.equal(r.confidence, 'medium');
});

test('decision 24: synthetic speakerphone turns are attributed, and fast', async () => {
 const { verifier, enrollment } = await enrolled();
 const a = createAttributor({ verifier, enrollment, rate: RATE });
 const senior = await a.attribute(toInt16(voice({ ...SENIOR_LATER, seconds: 2.5, seed: 9 })));
 assert.equal(senior.speaker, 'senior', JSON.stringify(senior.evidence));
 const caller = await a.attribute(toInt16(phoneLine(voice({ ...CALLER, seconds: 2.5, seed: 5 }))));
 assert.equal(caller.speaker, 'caller', JSON.stringify(caller.evidence));
 const clone = await a.attribute(toInt16(phoneLine(voice({ ...SENIOR, seconds: 2.5, seed: 11 }))));
 assert.equal(clone.speaker, 'unsure'); assert.equal(clone.spoofSuspect, true);
 const wideband = await a.attribute(toInt16(phoneLine(voice({ ...CALLER, seconds: 2.5, seed: 5 }), { lo: 50, hi: 7000 })), { llmRole: 'caller' });
 assert.equal(wideband.speaker, 'caller', 'wideband call: a different voice + the LLM role');
 const short = await a.attribute(toInt16(voice({ ...SENIOR, seconds: 0.8, seed: 2 })));
 assert.equal(short.speaker, 'unsure');
 assert.ok(caller.ms < 200, `attribution took ${caller.ms} ms`);
});

test('decision 24: enrollment quality gate', () => {
 assert.equal(enrollmentQuality(toInt16(voice({ ...SENIOR, seconds: 10 })), RATE).ok, true);
 assert.deepEqual(enrollmentQuality(toInt16(voice({ ...SENIOR, seconds: 4 })), RATE).problems, ['too_short']);
 assert.ok(enrollmentQuality(new Int16Array(RATE * 10), RATE).problems.includes('too_quiet'));
});

test('decision 24: the senior repeating a demand is weak (at most Be careful); the same words from the caller or an unsure turn still warn', () => {
 const words = 'Tell me the OTP. Send the money now and tell no one.';
 for (const [speaker, expected] of [['senior', 'careful'], ['caller', 'danger'], ['unsure', 'danger'], [undefined, 'danger']]) {
  const s = createSession('en-IN', 'live', 0);
  appendSegment(s, words, 1, 'a', speaker ? { speaker } : {});
  assert.equal(s.risk, expected, `speaker=${speaker}`);
 }
});

function fakeUpstream() {
 const ws = new EventEmitter();
 ws.readyState = WebSocket.OPEN; ws.bufferedAmount = 0; ws.frames = [];
 ws.send = b => { if (typeof b !== 'string') ws.frames.push(Buffer.from(b)); };
 ws.terminate = () => { ws.readyState = WebSocket.CLOSED; };
 ws.say = obj => ws.emit('message', Buffer.from(JSON.stringify(obj)));
 return ws;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(check, ms = 3000) { const end = Date.now() + ms; while (Date.now() < end) { if (await check()) return; await wait(10); } assert.fail('condition not met in time'); }

test('decision 24: live listening requires enrollment, then each transcript is attributed from its own audio', async t => {
 const upstreams = [];
 const app = createApp({ liveOptions: { random: () => 0, micSilentMs: 60000, tickMs: 20 }, providers: { configured: true, connect() { const u = fakeUpstream(); upstreams.push(u); setTimeout(() => u.say({ type: 'connected' }), 1); return u; } } });
 await new Promise(r => app.server.listen(0, '127.0.0.1', r));
 t.after(() => app.close());
 const port = app.server.address().port, base = `http://127.0.0.1:${port}`;
 const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { Origin: base, ...headers }, body });
 const demo = await (await post('/api/sessions', JSON.stringify({ language: 'en-IN', mode: 'demo', consent: true }), { 'Content-Type': 'application/json' })).json();
 const auth = { Authorization: `Bearer ${demo.deviceToken}` };
 const before = await (await fetch(base + '/api/timeline', { headers: auth })).json();
 assert.equal(before.enrolled, false, 'the page can tell that no voice measurement is saved yet');
 assert.equal(before.enrolledAt, null);
 const blocked = await post('/api/sessions', JSON.stringify({ language: 'en-IN', mode: 'live', consent: true, deviceToken: demo.deviceToken }), { 'Content-Type': 'application/json' });
 assert.equal(blocked.status, 409);
 assert.equal((await blocked.json()).reason, 'enrollment_required');
 assert.equal((await post(`/api/profile/enroll?rate=${RATE}`, Buffer.from(toInt16(voice({ ...SENIOR, seconds: 10 })).buffer), auth)).status, 403, 'consent and adult confirmation are required');
 const tooShort = await post(`/api/profile/enroll?rate=${RATE}&consent=1&adult=1`, Buffer.from(toInt16(voice({ ...SENIOR, seconds: 3 })).buffer), auth);
 assert.equal(tooShort.status, 422);
 const ok = await post(`/api/profile/enroll?rate=${RATE}&consent=1&adult=1`, Buffer.from(toInt16(voice({ ...SENIOR, seconds: 10, seed: 3 })).buffer), auth);
 assert.equal(ok.status, 200);
 const after = await (await fetch(base + '/api/timeline', { headers: auth })).json();
 assert.equal(after.enrolled, true);
 assert.ok(Math.abs(after.enrolledAt - Date.now()) < 10000, 'and when it was recorded');
 assert.ok(!JSON.stringify(after).includes('print'), 'only the fact and the time, never the measurement itself');

 const { id } = await (await post('/api/sessions', JSON.stringify({ language: 'en-IN', mode: 'live', consent: true, deviceToken: demo.deviceToken }), { 'Content-Type': 'application/json' })).json();
 const client = new WebSocket(`ws://127.0.0.1:${port}/api/listen?session=${id}&rate=${RATE}`, { origin: base });
 const events = []; client.on('message', b => events.push(JSON.parse(b)));
 t.after(() => client.terminate());
 await until(() => events.some(e => e.type === 'ready'));
 const sendAudio = async x => { const pcm = Buffer.from(toInt16(x).buffer); for (let i = 0; i + 1024 <= pcm.length; i += 1024) client.send(pcm.subarray(i, i + 1024)); };
 const turn = async (x, text, n) => {
  const before = upstreams[0].frames.length, frames = Math.floor((x.length * 2) / 1024);
  await sendAudio(x);
  await until(() => upstreams[0].frames.length >= before + frames);
  upstreams[0].say({ type: 'processing' });
  upstreams[0].say({ type: 'transcript', text, segment_index: n, audio_duration_ms: Math.round(((x.length - 0.4 * RATE) / RATE) * 1000) });
  await until(async () => (await (await fetch(base + `/api/sessions/${id}`)).json()).segments.length === n);
 };
 await turn(join(phoneLine(voice({ ...CALLER, seconds: 2.5, seed: 5 })), silence(400)), 'This is the police. Tell me the OTP now.', 1);
 await turn(join(voice({ ...SENIOR_LATER, seconds: 2.5, seed: 9 }), silence(400)), 'No, I will not tell you the OTP.', 2);
 const s = await (await fetch(base + `/api/sessions/${id}`)).json();
 assert.equal(s.segments[0].speaker, 'caller', JSON.stringify(s.segments[0].attribution));
 assert.equal(s.segments[1].speaker, 'senior', JSON.stringify(s.segments[1].attribution));
 assert.equal(s.risk, 'danger', "the caller's demand still warns");
 assert.ok(s.flags.filter(f => f.segmentId === s.segments[1].id).every(f => f.grade === 'weak'), "the senior's refusal is weak evidence");
});

test('batch 5: per-user tuning learns only from certain turns and can never be taught a caller is the senior', async () => {
 const { verifier, enrollment } = await enrolled();
 const a = createAttributor({ verifier, enrollment, rate: RATE });
 // Confident senior turns re-centre the print a little; drift stays within the cap.
 for (let i = 0; i < 5; i++) assert.equal((await a.attribute(toInt16(voice({ ...SENIOR_LATER, seconds: 2.5, seed: 20 + i })))).speaker, 'senior');
 assert.ok(enrollment.tuned && enrollment.tunedTurns === 5);
 assert.ok(verifier.drift(enrollment.print, enrollment.tuned) <= verifier.maxDrift);
 // A caller heard through the room (no phone-line cue: e.g. a scammer in the room) talking for a long time.
 for (let i = 0; i < 30; i++) {
  const r = await a.attribute(toInt16(voice({ ...CALLER, seconds: 2.5, seed: 40 + i })));
  assert.notEqual(r.speaker, 'senior', `turn ${i}`);
 }
 assert.equal(enrollment.tunedTurns, 5, 'non-senior turns never tuned the senior print');
});

test('batch 5: the per-call caller print and learned phone sound rescue unclear caller turns, never senior ones', async () => {
 const { verifier, enrollment } = await enrolled();
 const a = createAttributor({ verifier, enrollment, rate: RATE });
 for (let i = 0; i < 3; i++) assert.equal((await a.attribute(toInt16(phoneLine(voice({ ...CALLER, seconds: 2.5, seed: 60 + i }))))).speaker, 'caller');
 assert.ok(enrollment.phoneChannel, 'the device phone sound was learned');
 // A wideband turn from the same caller: no channel cue; voice alone is enough via the caller print + words.
 const r = await a.attribute(toInt16(phoneLine(voice({ ...CALLER, seconds: 2.5, seed: 70 }), { lo: 50, hi: 7000 })), { act: 'demand', flags: [{ tactic: 'credential', grade: 'strong' }] });
 assert.equal(r.speaker, 'caller');
 assert.equal((await a.attribute(toInt16(voice({ ...SENIOR_LATER, seconds: 2.5, seed: 71 })))).speaker, 'senior', 'the senior is still recognised');
});


// A stand-in voice checker so each turn's voice result is fixed: worst case, the senior's own voice print never
// matches (a weak spectral print, a different room). Prints learned during the call are marked so the test can see them.
const weakPrint = () => ({
 kind: 'stand-in', maxDrift: 1, drift: () => 0, adapt: async p => p,
 enroll: async () => ({ learned: true }),
 score: async print => print.learned ? { score: -6, decision: 'unknown' } : { score: -13, decision: 'nonmatch' },
});

test('channel: the senior turned towards the phone (smooth high-frequency fade) is never labelled Caller', async () => {
 const enrollPcm = toInt16(voice({ ...SENIOR, seconds: 10, seed: 3 }));
 const a = createAttributor({ verifier: weakPrint(), enrollment: { print: {}, channel: channelFeatures(enrollPcm, RATE) }, rate: RATE });
 const away = toInt16(turnedAway(voice({ ...SENIOR_LATER, seconds: 3, seed: 5 })));
 const r = await a.attribute(away, {});
 assert.ok(r.evidence.highBandDb < channelFeatures(enrollPcm, RATE).highBandDb - 12, 'the fade is as strong as a phone line\'s');
 assert.notEqual(r.speaker, 'caller', `got ${r.speaker} (${r.basis})`);
});

test('channel: a real phone line (sharp cut at 3.4 kHz) with a different voice is still the caller', async () => {
 const enrollPcm = toInt16(voice({ ...SENIOR, seconds: 10, seed: 3 }));
 const a = createAttributor({ verifier: weakPrint(), enrollment: { print: {}, channel: channelFeatures(enrollPcm, RATE) }, rate: RATE });
 const r = await a.attribute(toInt16(phoneLine(voice({ ...CALLER, seconds: 3, seed: 6 }))), {});
 assert.equal(r.speaker, 'caller'); assert.equal(r.confidence, 'high');
});

test('channel: an HD/VoLTE phone line (sharp cut at 7 kHz) with a different voice is still the caller', async () => {
 const enrollPcm = toInt16(voice({ ...SENIOR, seconds: 10, seed: 3 }));
 const a = createAttributor({ verifier: weakPrint(), enrollment: { print: {}, channel: channelFeatures(enrollPcm, RATE) }, rate: RATE });
 const r = await a.attribute(toInt16(phoneLine(voice({ ...CALLER, seconds: 3, seed: 6 }), { lo: 50, hi: 7000 })), {});
 assert.equal(r.speaker, 'caller', r.basis);
});

test('learning: a caller print that fits the senior about as well as the senior\'s own print cannot relabel the senior', async () => {
 // The per-call caller print is meant to rescue unclear CALLER turns. If it was learned from the wrong audio, it fits
 // the senior too; it must then be ignored, or one early mistake would turn every later senior line into "Caller".
 const enrollPcm = toInt16(voice({ ...SENIOR, seconds: 10, seed: 3 }));
 let own = 0; // the senior's own print: a clear non-match on the first (caller) turn, unclear afterwards
 const verifier = { ...weakPrint(), score: async print => print.learned ? { score: -5, decision: 'match' } : own++ === 0 ? { score: -13, decision: 'nonmatch' } : { score: -6, decision: 'unknown' } };
 const a = createAttributor({ verifier, enrollment: { print: {}, channel: channelFeatures(enrollPcm, RATE) }, rate: RATE });
 // A real caller turn first, so a caller print is learned.
 const first = await a.attribute(toInt16(phoneLine(voice({ ...CALLER, seconds: 9, seed: 6 }))), {});
 assert.equal(first.confidence, 'high');
 const later = await a.attribute(toInt16(phoneLine(voice({ ...SENIOR_LATER, seconds: 3, seed: 8 }))), {});
 assert.equal(later.evidence.callerMatch, false, 'a 1-point edge over the senior\'s own print is not evidence');
});

#!/usr/bin/env node
// Full live-path test without a browser or a phone: enrolls a voice, then streams a recorded call through the same
// WebSocket the companion device uses (Gnani realtime speech → speaker labels → detection → warnings).
//
//   node scripts/live-audio.mjs --enroll my-voice.m4a                      # caller audio = Gnani practice call
//   node scripts/live-audio.mjs --enroll my-voice.m4a --call scam-call.wav --language hi-IN
//   node scripts/live-audio.mjs ... --base https://your-name.trycloudflare.com --expect danger
//
// --enroll  about 12 s of YOUR voice reading normally (record it on your phone). Required: live listening needs it.
// --call    the call to play. Default: the server's synthetic practice call for --language (needs GNANI_API_KEY).
// --expect  danger | careful | safe — exit code 1 if the final level differs. Default: danger.
// Needs ffmpeg on PATH (any audio format is converted to 16 kHz mono). Uses paid Gnani minutes.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

const opt = name => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const BASE = (opt('base') || process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const ORIGIN = process.env.ORIGIN || BASE;
const language = opt('language') || 'en-IN';
const expect = opt('expect') || 'danger';
const enrollFile = opt('enroll'), callFile = opt('call');
const RATE = 16000;
if (!enrollFile) { console.error('Give --enroll <file>: about 12 seconds of your own voice reading aloud.'); process.exit(2); }

const tmp = mkdtempSync(join(tmpdir(), 'sg-live-'));
const toPcm = file => {
 const out = join(tmp, `${Math.random().toString(36).slice(2)}.pcm`);
 const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 's16le', out]);
 if (r.status !== 0) throw new Error(`ffmpeg could not read ${file}: ${r.stderr}`);
 return readFileSync(out);
};
async function call(path, { method = 'GET', body, token, raw, type } = {}) {
 const headers = { ...(method !== 'GET' ? { Origin: ORIGIN } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': type || 'application/json' } : {}) };
 const r = await fetch(BASE + path, { method, headers, body: raw ? body : body === undefined ? undefined : JSON.stringify(body) });
 return { status: r.status, r };
}
const json = async res => res.r.json().catch(() => ({}));
const label = seg => (seg.speaker === 'senior' ? 'YOU   ' : seg.speaker === 'caller' ? 'CALLER' : 'UNSURE');

try {
 // 1. Device profile: a demo session issues the device credential.
 const first = await call('/api/sessions', { method: 'POST', body: { language, mode: 'demo', consent: true } });
 const demo = await json(first);
 if (first.status >= 300) throw new Error(`Could not start: ${first.status} ${demo.error || ''}`);
 const token = demo.deviceToken;

 // 2. Enroll the voice (only measurements are kept by the server).
 const voice = toPcm(enrollFile);
 const en = await call(`/api/profile/enroll?rate=${RATE}&consent=1&adult=1`, { method: 'POST', token, raw: true, body: voice, type: 'application/octet-stream' });
 const enrolled = await json(en);
 if (en.status !== 200) throw new Error(`Enrollment refused: ${enrolled.error || en.status}`);
 console.log(`Enrolled: ${enrolled.voicedSeconds} s of voice measured.`);

 // 3. Caller audio: a file, or the server's synthetic practice call.
 let caller;
 if (callFile) caller = toPcm(callFile);
 else {
  const d = await call(`/api/sessions/${demo.id}/drill`, { method: 'POST', body: {} });
  if (d.status !== 200) throw new Error(`Practice-call audio unavailable (${d.status}). Give --call <file> or set GNANI_API_KEY on the server.`);
  const wav = join(tmp, 'drill.wav'); writeFileSync(wav, Buffer.from(await d.r.arrayBuffer())); caller = toPcm(wav);
 }
 await call(`/api/sessions/${demo.id}`, { method: 'DELETE' });

 // 4. Live session over the WebSocket, streamed in real time (32 ms frames), then 3 s of silence to flush.
 const live = await call('/api/sessions', { method: 'POST', body: { language, mode: 'live', consent: true, deviceToken: token } });
 const s = await json(live);
 if (live.status >= 300) throw new Error(`Live session refused: ${s.error || live.status}`);
 const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}/api/listen?session=${s.id}&rate=${RATE}`, { origin: ORIGIN });
 let last = null; const started = Date.now(); let firstDanger = null; const seen = new Set();
 ws.on('message', m => {
  const d = JSON.parse(m);
  if (d.type === 'error') console.log(`server error: ${d.message}`);
  if (d.type === 'health') console.log(`[speech] ${d.health.text}`);
  if (d.type === 'snapshot') {
   last = d.session;
   for (const seg of last.segments) if (!seen.has(seg.id)) { seen.add(seg.id); console.log(`${label(seg)}  ${seg.text}`); }
   if (last.risk === 'danger' && !firstDanger) { firstDanger = Date.now() - started; console.log(`>>> HANG UP NOW after ${(firstDanger / 1000).toFixed(1)} s`); }
  }
 });
 await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('speech service did not become ready in 15 s')), 15000);
  ws.on('message', m => { const d = JSON.parse(m); if (d.type === 'ready') { clearTimeout(t); resolve(); } else if (d.type === 'error') { clearTimeout(t); reject(new Error(d.message)); } });
  ws.on('error', e => { clearTimeout(t); reject(e); });
 });
 console.log(`Streaming ${(caller.length / 2 / RATE).toFixed(1)} s of call audio in real time…\n`);
 const frame = 1024, padded = Buffer.concat([caller, Buffer.alloc(RATE * 2 * 3)]);
 for (let o = 0; o < padded.length && ws.readyState === WebSocket.OPEN; o += frame) {
  ws.send(padded.subarray(o, o + frame));
  await new Promise(r => setTimeout(r, (frame / 2 / RATE) * 1000));
 }
 ws.send(JSON.stringify({ type: 'stop' }));
 await new Promise(r => setTimeout(r, 2500));
 ws.close();
 await call(`/api/profile`, { method: 'DELETE', token });

 const risk = last?.risk || 'none';
 const reasons = [...new Set((last?.flags || []).map(f => f.label))];
 console.log(`\nFinal level: ${risk}${reasons.length ? ` · reasons: ${reasons.join(', ')}` : ''}`);
 const counts = (last?.segments || []).reduce((a, x) => ({ ...a, [x.speaker || 'none']: (a[x.speaker || 'none'] || 0) + 1 }), {});
 console.log(`Speaker labels: ${JSON.stringify(counts)} — with only the caller's audio, "senior" should be 0.`);
 if (counts.senior) console.log('WARNING: caller speech was labelled as you. Record the conditions.');
 console.log(risk === expect ? 'PASS' : `FAIL (expected ${expect})`);
 process.exitCode = risk === expect && !counts.senior ? 0 : 1;
} catch (e) {
 console.error(`FAIL: ${e.message}`);
 process.exitCode = 1;
} finally { rmSync(tmp, { recursive: true, force: true }); }

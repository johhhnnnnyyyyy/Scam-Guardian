import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createApp } from '../src/server.js';
import { panelFor, engineStatus } from '../ui/src/lib/view.js';
import { speakerLabel, LANGUAGES, healthCopy, coverageCopy, consentCopy, uncertainCopy, extraCopy } from '../ui/src/lib/copy.js';
import { copy } from '../ui/src/lib/demos.js';
import { OUTCOMES, riskText } from '../ui/src/lib/outcomes.js';

const snap = (over = {}) => ({ language: 'en-IN', risk: 'safe', mode: 'live', segments: [], flags: [], ...over });

test('the status card never shows a calm result when nothing is really being checked', () => {
 assert.equal(panelFor(snap()).risk, 'safe');
 const reconnecting = panelFor(snap({ health: { stt: 'reconnecting' } }));
 assert.equal(reconnecting.risk, 'idle'); assert.equal(reconnecting.title, healthCopy.reconnecting.title);
 for (const stt of ['stt_down', 'paused', 'stt_degraded', 'connecting']) assert.equal(panelFor(snap({ health: { stt } })).risk, 'idle', stt);
 assert.equal(panelFor(snap({ health: { stt: 'listening' } })).risk, 'safe');
 const unknown = panelFor(snap({ coverage: 'unknown_language' }));
 assert.equal(unknown.risk, 'idle'); assert.equal(unknown.title, coverageCopy['en-IN'].unknown_language.title);
 assert.equal(panelFor(snap({ coverage: 'partial' })).risk, 'idle');
 assert.equal(panelFor(snap({ coverage: 'supported' })).risk, 'safe');
});

test('a warning is never hidden by a health or coverage notice', () => {
 for (const risk of ['careful', 'danger']) {
  const p = panelFor(snap({ risk, health: { stt: 'reconnecting' }, coverage: 'unknown_language' }));
  assert.equal(p.risk, risk); assert.equal(p.title, copy['en-IN'][risk]);
 }
 const close = panelFor(snap({ risk: 'careful', uncertain: true }));
 assert.equal(close.message, uncertainCopy['en-IN']);
 assert.equal(panelFor(snap({ risk: 'careful' })).message, copy['en-IN'].carefulText);
});

test('every language has complete interface copy', () => {
 for (const { value } of LANGUAGES) {
  assert.ok(copy[value], `warning copy for ${value}`);
  for (const k of ['safe', 'careful', 'danger']) assert.ok(copy[value][k] && copy[value][k + 'Text'], `${value} ${k}`);
  assert.ok(consentCopy[value] && uncertainCopy[value] && extraCopy[value].code && extraCopy[value].pause, `${value} copy`);
  assert.ok(coverageCopy[value].unknown_language.title && coverageCopy[value].partial.text, `${value} coverage`);
  const p = panelFor(snap({ language: value, risk: 'danger' }));
  assert.equal(p.lang, value); assert.ok(p.title && p.message);
 }
 assert.deepEqual(LANGUAGES.map(l => l.value), ['en-IN', 'hi-IN', 'ta-IN', 'ml-IN']);
});

test('speaker labels never call a doubtful turn "You"', () => {
 assert.equal(speakerLabel({}), null);
 assert.deepEqual(speakerLabel({ speaker: 'senior' }), { kind: 'senior', text: 'You' });
 assert.deepEqual(speakerLabel({ speaker: 'caller' }), { kind: 'caller', text: 'Caller' });
 assert.equal(speakerLabel({ speaker: 'unsure', attribution: { spoofSuspect: true } }).kind, 'unsure');
 assert.equal(speakerLabel({ speaker: 'unsure', attribution: { hint: 'caller' } }).text, 'Probably caller');
 assert.equal(speakerLabel({ speaker: 'unsure' }).text, 'Unsure who');
});

test('engine status and timeline wording', () => {
 assert.match(engineStatus(snap({ classifier: 'rules', llmStatus: 'ok', gaps: [{ startMs: 0, endMs: 2500 }], health: { stt: 'stt_degraded' } })), /stt degraded.*2\.5 s of audio not checked/);
 assert.deepEqual(OUTCOMES.map(o => o[0]), ['scam', 'not_scam', 'was_family', 'unsure']);
 assert.equal(riskText({ risk: 'danger' }), 'Hang up now');
 assert.match(riskText({ risk: 'careful', uncertain: true }), /close to a scam pattern/);
});

test('page shells mount the React app and carry no inline script or style (CSP is script-src and style-src self)', async () => {
 for (const [page, entry] of [['index.html', '/src/senior/main.jsx'], ['family.html', '/src/family/main.jsx']]) {
  const html = await readFile(new URL(`../ui/${page}`, import.meta.url), 'utf8');
  assert.match(html, /<div id="root"><\/div>/); assert.ok(html.includes(`src="${entry}"`));
  assert.ok(!/<style|style="|<script(?![^>]*\bsrc=)/i.test(html), `${page} has inline code`);
 }
});

test('source files stay free of inline-HTML injection and browser automation', async () => {
 const walk = async dir => (await readdir(dir, { withFileTypes: true })).flatMap(e => e.isDirectory() ? [] : [`${dir}/${e.name}`]);
 const files = [];
 for (const dir of ['ui/src/senior', 'ui/src/family', 'ui/src/components', 'ui/src/lib']) files.push(...await walk(new URL(`../${dir}`, import.meta.url).pathname));
 for (const f of files) {
  const code = await readFile(f, 'utf8');
  assert.ok(!/dangerouslySetInnerHTML|\.innerHTML\s*=|eval\(|new Function\(/.test(code), `${f} injects HTML`);
 }
});

test('server serves the built pages, and /assets cannot escape dist/', async t => {
 const app = createApp({ gnaniKey: '', requireEnrollment: false });
 await new Promise(r => app.server.listen(0, '127.0.0.1', r)); t.after(() => app.close());
 const base = `http://127.0.0.1:${app.server.address().port}`;
 for (const path of ['/', '/family']) {
  const r = await fetch(base + path);
  if (r.status === 200) { assert.match(await r.text(), /id="root"/); assert.match(r.headers.get('content-type'), /text\/html/); }
  else { assert.equal(r.status, 503); assert.match(await r.text(), /npm run build/); }
 }
 for (const bad of ['/assets/../src/server.js', '/assets/%2e%2e/src/server.js', '/assets/x.html', '/assets/']) assert.notEqual((await fetch(base + bad)).status, 200, bad);
 assert.equal((await fetch(base + '/assets/missing-abc.js')).status, 404);
 for (const fixed of ['/pcm-worklet.js', '/sw.js', '/manifest.webmanifest', '/icon.svg', '/privacy', '/privacy.css']) assert.equal((await fetch(base + fixed)).status, 200, fixed);
 assert.equal((await fetch(base + '/app.js')).status, 404);
});

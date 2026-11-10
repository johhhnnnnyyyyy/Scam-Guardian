#!/usr/bin/env node
// End-to-end smoke test against a RUNNING Scam Guardian server (local or through your HTTPS tunnel).
// It uses only the public HTTP API, with synthetic text, exactly as the browser does. No browser, no microphone.
//
//   node scripts/smoke.mjs                                   # http://127.0.0.1:3000
//   node scripts/smoke.mjs https://your-name.trycloudflare.com
//   node scripts/smoke.mjs --live                            # also open a live WebSocket (needs GNANI_API_KEY on the server)
//
// Creates about 10 sessions per run. The default limit is 20 new sessions per hour per client, so for repeated runs
// start the server with LIMIT_SESSION_CREATE=200/3600. Everything the script creates is deleted at the end.
import { randomBytes } from 'node:crypto';
import { demos } from '../ui/src/lib/demos.js';

const args = process.argv.slice(2);
const BASE = (args.find(a => /^https?:\/\//.test(a)) || process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const ORIGIN = process.env.ORIGIN || BASE;
const LIVE = args.includes('--live');
const results = [];
const cleanup = [];

const color = (c, s) => (process.stdout.isTTY ? `\x1b[${c}m${s}\x1b[0m` : s);
function record(name, ok, detail = '') { results.push({ name, ok, detail }); console.log(`${ok === null ? color(33, detail.startsWith('WARNING') ? 'WARN' : 'SKIP') : ok ? color(32, 'PASS') : color(31, 'FAIL')}  ${name}${detail ? color(90, `  — ${detail}`) : ''}`); }
async function check(name, fn) { try { const d = await fn(); record(name, d !== 'skip', typeof d === 'string' && d !== 'skip' ? d : d === 'skip' ? 'skipped' : ''); if (d === 'skip') results.at(-1).ok = null; } catch (e) { record(name, false, e.message); } }
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function call(path, { method = 'GET', body, token, cookie, headers = {}, raw } = {}) {
 const h = { ...headers };
 if (method !== 'GET') h.Origin = ORIGIN;
 if (body !== undefined && !raw) h['Content-Type'] = 'application/json';
 if (token) h.Authorization = `Bearer ${token}`;
 if (cookie) h.Cookie = cookie;
 const r = await fetch(BASE + path, { method, headers: h, body: raw ? body : body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
 const text = await r.text();
 let data = null; try { data = JSON.parse(text); } catch { /* not JSON */ }
 return { status: r.status, data, text, headers: r.headers };
}
const hint = r => (r.status === 403 && /origin or host/i.test(r.text) ? ' (host not allowed: add this host to ALLOWED_HOSTS and set PUBLIC_ORIGIN to this URL, then restart)' : '');

// The same scripted conversations the app's practice mode uses, in all four MVP languages.
const SCAM = Object.fromEntries(Object.entries(demos).map(([l, d]) => [l, d.arrest]));
const BENIGN = Object.fromEntries(Object.entries(demos).map(([l, d]) => [l, d.benign]));

async function newSession(language, mode = 'demo', deviceToken) {
 const r = await call('/api/sessions', { method: 'POST', body: { language, mode, consent: true, ...(deviceToken ? { deviceToken } : {}) } });
 if (r.status === 201 || r.status === 200) cleanup.push(() => call(`/api/sessions/${r.data.id}`, { method: 'DELETE' }));
 return r;
}
async function say(id, lines) { let s; for (const text of lines) { const r = await call(`/api/sessions/${id}/segments`, { method: 'POST', body: { text } }); assert(r.status === 200, `segment → ${r.status} ${r.data?.error || ''}`); s = r.data; } return s; }

console.log(`Scam Guardian smoke test → ${BASE}\n`);
let health = null, deviceToken = null, scamSession = null;

// 1. Server and pages
await check('server is reachable and healthy (/api/health)', async () => {
 const r = await call('/api/health');
 assert(r.status === 200, `status ${r.status}${hint(r)}`);
 health = r.data;
 return `speech: ${health.gnani} · LLM: ${health.llm} · push: ${health.push}`;
});
if (!health) { console.log(color(31, '\nThe server is not reachable. Start it with "npm start" (and the tunnel, if you used a tunnel URL).')); process.exit(1); }
if (health.llm === 'configured') record('LLM is configured (required for real use)', true);
else { record('LLM is configured (required for real use)', null, 'WARNING: rules-only; set LLM_API_KEY and LLM_MODEL before real use'); results.at(-1).ok = null; }

for (const [path, name] of [['/', 'senior page'], ['/family', 'family page']]) {
 await check(`${name} loads the built interface (${path})`, async () => {
  const r = await call(path);
  assert(r.status === 200, r.status === 503 ? 'interface not built: run "npm run build" (npm start does it for you)' : `status ${r.status}${hint(r)}`);
  assert(/id="root"/.test(r.text), 'no React root in the page');
  const assets = [...r.text.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]);
  assert(assets.length >= 2, 'page does not reference its script and stylesheet');
  for (const a of assets) { const x = await fetch(BASE + a); assert(x.status === 200, `${a} → ${x.status}`); }
  return `${assets.length} assets OK`;
 });
}
await check('fixed files: worklet, service worker, manifest, icon, privacy notice', async () => {
 for (const p of ['/pcm-worklet.js', '/sw.js', '/manifest.webmanifest', '/icon.svg', '/privacy', '/privacy.css']) { const r = await call(p); assert(r.status === 200, `${p} → ${r.status}`); }
});
await check('security headers (CSP, nosniff, frame, referrer, permissions)', async () => {
 const r = await call('/');
 const h = r.headers;
 assert(/script-src 'self'/.test(h.get('content-security-policy') || ''), 'CSP missing or weak');
 assert(h.get('x-content-type-options') === 'nosniff', 'nosniff missing');
 assert(h.get('x-frame-options') === 'DENY', 'X-Frame-Options missing');
 assert(h.get('referrer-policy') === 'no-referrer', 'Referrer-Policy missing');
 assert(/microphone=\(self\)/.test(h.get('permissions-policy') || ''), 'Permissions-Policy missing');
 if (BASE.startsWith('https:')) assert(h.get('strict-transport-security'), 'HSTS missing on HTTPS (set SECURE_COOKIES=1)');
});
await check('requests from another website are refused', async () => {
 const r = await fetch(BASE + '/api/sessions', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'en-IN', mode: 'demo', consent: true }) });
 assert(r.status === 403, `expected 403, got ${r.status}`);
});
await check('consent is required before a session starts', async () => {
 const r = await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'demo' } });
 assert(r.status === 403, `expected 403, got ${r.status}`);
});

// 2. Detection in every MVP language
for (const language of Object.keys(SCAM)) {
 await check(`${language}: scam conversation reaches "Hang up now"`, async () => {
  const r = await newSession(language, 'demo', deviceToken);
  assert(r.status === 201 || r.status === 200, `session → ${r.status} ${r.data?.error || ''}${hint(r)}`);
  deviceToken ||= r.data.deviceToken;
  const s = await say(r.data.id, SCAM[language]);
  if (language === 'en-IN') scamSession = r.data.id;
  assert(s.risk === 'danger', `risk ${s.risk} (reasons: ${[...new Set(s.flags.map(f => f.label))].join(', ') || 'none'})`);
  return [...new Set(s.flags.map(f => f.label))].slice(0, 3).join(', ');
 });
 await check(`${language}: genuine call does not reach "Hang up now"`, async () => {
  const r = await newSession(language, 'demo', deviceToken);
  assert(r.status === 201 || r.status === 200, `session → ${r.status}${hint(r)}`);
  const s = await say(r.data.id, BENIGN[language]);
  assert(s.risk !== 'danger', `false alarm: ${s.risk}`);
  return `risk ${s.risk}`;
 });
}

// 3. Live listening rules
await check('live listening needs the one-time voice recording', async () => {
 if (!deviceToken) return 'skip';
 const r = await newSession('en-IN', 'live', deviceToken);
 if (r.status === 201 || r.status === 200) return 'this device is already enrolled, so live listening is allowed';
 assert(r.status === 409, `expected 409, got ${r.status}`);
});

// 4. Family: pairing, separate login, reason-only view, outcome labels
let cookie = null;
const username = `smoke${randomBytes(3).toString('hex')}`;
await check('family: senior shares a call through a private invite and the family registers', async () => {
 // As in the app: the senior shares a call first, then the warning arrives while the family is linked.
 const fam = await newSession('en-IN', 'demo', deviceToken);
 assert(fam.status === 201 || fam.status === 200, `session → ${fam.status}`);
 const r = await call(`/api/sessions/${fam.data.id}/pair`, { method: 'POST', body: { consent: true } });
 assert(r.status === 200 || r.status === 201, `pair → ${r.status} ${r.data?.error || ''}`);
 const reg = await call('/api/guardians/register', { method: 'POST', body: { username, passphrase: 'smoke-test-passphrase', invite: r.data.token } });
 assert(reg.status === 201, `register → ${reg.status} ${reg.data?.error || ''}`);
 cookie = (reg.headers.get('set-cookie') || '').split(';')[0];
 assert(cookie, 'no session cookie');
 cleanup.push(() => call('/api/guardians/me', { method: 'DELETE', cookie }));
 await say(fam.data.id, SCAM['en-IN']);
 return `family account ${username}`;
});
await check('family: the invite link alone is not a login', async () => {
 const r = await call('/api/family');
 assert(r.status === 401, `expected 401 without a family login, got ${r.status}`);
});
let familyView = null;
await check('family: sees the warning and its reasons', async () => {
 if (!cookie) return 'skip';
 const r = await call('/api/family', { cookie });
 assert(r.status === 200, `family → ${r.status}`);
 familyView = r.data;
 assert(r.data.sharing && r.data.risk === 'danger', `sharing ${r.data.sharing}, risk ${r.data.risk}`);
 assert(r.data.reasons?.length, 'no reasons');
 return r.data.reasons.join(', ');
});
await check('family: never receives what was said', async () => {
 if (!familyView) return 'skip';
 const json = JSON.stringify(familyView);
 for (const line of SCAM['en-IN']) assert(!json.includes(line.slice(0, 25)), 'transcript text leaked to the family view');
 assert(!/"segments"|"transcript"/.test(json), 'transcript fields present');
});
await check('family and senior can mark what a warning really was', async () => {
 if (!cookie) return 'skip';
 const t = await call('/api/timeline', { token: deviceToken });
 assert(t.status === 200 && t.data.timeline?.length, `senior timeline → ${t.status}, ${t.data?.timeline?.length || 0} events`);
 const shared = familyView?.timeline?.at(-1);
 assert(shared?.id, 'the family timeline has no shared warning');
 const r = await call('/api/family/timeline/label', { method: 'POST', cookie, body: { eventId: shared.id, label: 'scam' } });
 assert(r.status === 200, `family label → ${r.status} ${r.data?.error || ''}`);
 const other = t.data.timeline.find(e => e.id !== shared.id && !e.outcome);
 if (other) { const s2 = await call('/api/timeline/label', { method: 'POST', token: deviceToken, body: { eventId: other.id, label: 'not_scam' } }); assert(s2.status === 200, `senior label → ${s2.status} ${s2.data?.error || ''}`); }
});
await check('senior can see and remove linked family accounts', async () => {
 const r = await call('/api/profile/guardians', { token: deviceToken });
 assert(r.status === 200 && r.data.guardians.some(g => g.username === username), 'family account not listed');
});

// 5. Data rights
await check('senior can download their data (no credentials or transcripts inside)', async () => {
 const r = await call('/api/profile/export', { token: deviceToken });
 assert(r.status === 200, `export → ${r.status}`);
 assert(!/passphrase|deviceToken|"segments"/.test(r.text), 'export contains credentials or transcripts');
 for (const line of SCAM['en-IN']) assert(!r.text.includes(line.slice(0, 25)), 'export contains transcript text');
});
await check('evidence pack and reporting data are available for a session', async () => {
 const r = await call(`/api/sessions/${scamSession}/evidence`);
 assert(r.status === 200 && r.data.flags?.length, `evidence → ${r.status}`);
});

// 6. Optional live WebSocket handshake
if (LIVE) {
 await check('live: WebSocket connects to the speech service', async () => {
  const { default: WebSocket } = await import('ws');
  if (!health.gnani.startsWith('configured')) return 'skip';
  const r = await newSession('en-IN', 'live', deviceToken);
  if (r.status === 409) return 'skip';
  assert(r.status === 201 || r.status === 200, `session → ${r.status}`);
  const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}/api/listen?session=${r.data.id}&rate=16000`, { origin: ORIGIN });
  const msg = await new Promise((resolve, reject) => {
   const t = setTimeout(() => reject(new Error('no answer within 15 s')), 15000);
   ws.on('message', m => { const d = JSON.parse(m); if (d.type === 'ready' || d.type === 'error') { clearTimeout(t); resolve(d); } });
   ws.on('error', e => { clearTimeout(t); reject(e); });
  });
  ws.close();
  assert(msg.type === 'ready', msg.message || 'not ready');
 });
} else record('live WebSocket (run with --live)', null);

// 7. Clean up: delete the family account, the sessions and the device profile
for (const f of cleanup.reverse()) await f().catch(() => {});
await check('senior can delete everything (cleanup)', async () => {
 if (!deviceToken) return 'skip';
 const r = await call('/api/profile', { method: 'DELETE', token: deviceToken });
 assert(r.status === 200, `erase → ${r.status}`);
 const again = await call('/api/profile/export', { token: deviceToken });
 assert(again.status !== 200, 'profile still exists after erase');
});

const failed = results.filter(r => r.ok === false).length, passed = results.filter(r => r.ok).length, skipped = results.filter(r => r.ok === null).length;
console.log(`\n${failed ? color(31, `${failed} failed`) : color(32, 'All checks passed')} · ${passed} passed · ${skipped} skipped`);
process.exit(failed ? 1 : 0);

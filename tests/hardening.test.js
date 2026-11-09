import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createApp } from '../src/server.js';

async function start(t, config = {}) {
 const app = createApp({ gnaniKey: '', ...config });
 await new Promise(r => app.server.listen(0, '127.0.0.1', r));
 t.after(() => app.close());
 const port = app.server.address().port, base = `http://127.0.0.1:${port}`;
 const call = async (path, { method = 'GET', body, token, origin = base, headers = {} } = {}) => {
  const r = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(origin ? { Origin: origin } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = JSON.parse(await r.text()); } catch {}
  return { status: r.status, data, headers: r.headers };
 };
 return { app, port, base, call };
}
const newSession = (call, extra = {}) => call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'demo', consent: true, ...extra } });

test('F-16: state-changing requests and WebSocket upgrades need a same-origin Origin', async t => {
 const { port, base, call } = await start(t, { providers: { configured: true, connect() { throw Error('not reached'); } } });
 assert.equal((await newSession(call, {}, )).status, 201);
 assert.equal((await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'demo', consent: true }, origin: null })).status, 403);
 assert.equal((await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'demo', consent: true }, origin: 'null' })).status, 403);
 assert.equal((await call('/api/health', { origin: null })).status, 200, 'reads still work without Origin');
 const { id } = (await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'live', consent: true } })).data;
 const bare = new WebSocket(`ws://127.0.0.1:${port}/api/listen?session=${id}&rate=16000`);
 const [err] = await once(bare, 'error');
 assert.match(String(err.message), /403/);
 void base;
});

test('F-17: per-client limits return 429 with Retry-After and a reason, other clients unaffected', async t => {
 const { call } = await start(t, { limits: { sessionCreate: { capacity: 2, perMs: 3600e3 } }, clientKey: req => req.headers['x-test-client'] || 'default' });
 const as = client => call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'demo', consent: true }, headers: { 'x-test-client': client } });
 assert.equal((await as('a')).status, 201);
 assert.equal((await as('a')).status, 201);
 const third = await as('a');
 assert.equal(third.status, 429);
 assert.equal(third.data.reason, 'client_rate_limit');
 assert.ok(Number(third.headers.get('retry-after')) >= 1);
 assert.equal((await as('b')).status, 201, 'a different client still succeeds');
});

test('F-17: the daily provider-call cap stops paid calls with daily_cost_cap', async t => {
 const providers = { configured: true, warning: async () => Buffer.alloc(44), warningStream: async function* () { yield 'AAAA'; } };
 const { call } = await start(t, { providers, limits: { providerDaily: { capacity: 1, perMs: 24 * 3600e3 } } });
 const { id } = (await newSession(call)).data;
 assert.equal((await call(`/api/sessions/${id}/warning`, { method: 'POST' })).status, 200);
 const cached = await call(`/api/sessions/${id}/warning`, { method: 'POST' });
 assert.equal(cached.status, 200, 'B-12: the pre-rendered warning costs nothing');
 assert.equal(cached.headers.get('x-warning-source'), 'cache');
 const second = await call(`/api/sessions/${id}/warning-stream`, { method: 'POST' });
 assert.equal(second.status, 429);
 assert.equal(second.data.reason, 'daily_cost_cap');
});

test('B-12: cached warning audio still plays when the speech service fails', async t => {
 let fail = false;
 const providers = { configured: true, warning: async () => { if (fail) throw Object.assign(new Error('down'), { status: 502 }); return Buffer.from('RIFFcached'); } };
 const { call } = await start(t, { providers });
 const { id } = (await newSession(call)).data;
 assert.equal((await call(`/api/sessions/${id}/warning`, { method: 'POST' })).status, 200);
 fail = true;
 const second = (await newSession(call)).data.id;
 const r = await call(`/api/sessions/${second}/warning`, { method: 'POST' });
 assert.equal(r.status, 200);
 assert.equal(r.headers.get('x-warning-source'), 'cache');
});

test('F-15: a setup link alone never yields the senior credential; codes are approved by the family and used once', async t => {
 const { call } = await start(t);
 const created = await newSession(call);
 const { id, deviceToken } = created.data;
 assert.match(deviceToken, /^[a-f0-9]{64}$/);
 assert.equal(created.data.profileToken, undefined, 'the internal profile id is never returned');
 const invite = (await call(`/api/sessions/${id}/pair`, { method: 'POST', body: { consent: true } })).data.token;
 const reg = await call('/api/guardians/register', { method: 'POST', body: { username: 'setup.family', passphrase: 'setup family phrase', invite } });
 const cookie = reg.headers.get('set-cookie').split(';')[0];
 const fam = (path, body) => call(path, { method: 'POST', body, headers: { Cookie: cookie } });
 const link = (await fam('/api/family/setup', { language: 'hi-IN' })).data.link;
 const token = new URL(link).searchParams.get('setup');

 const claim = (await call(`/api/setup/${token}/claim`, { method: 'POST', body: { language: 'hi-IN', consent: true } })).data;
 assert.equal((await call(`/api/setup/${token}/complete`, { method: 'POST', body: { claimId: claim.claimId } })).status, 409);
 assert.equal((await call(`/api/setup/${token}`, { method: 'POST', body: { language: 'hi-IN', consent: true } })).status, 405, 'the old one-step setup is gone');
 assert.equal((await fam('/api/family/setup/approve', { code: '000000' === claim.code ? '111111' : '000000' })).status, 404);
 assert.equal((await fam('/api/family/setup/approve', { code: claim.code })).status, 200);
 const [first, second] = await Promise.all([0, 1].map(() => call(`/api/setup/${token}/complete`, { method: 'POST', body: { claimId: claim.claimId } })));
 assert.deepEqual([first.status, second.status].sort(), [200, 404], 'exactly one concurrent completion succeeds');
 const newDevice = (first.status === 200 ? first : second).data.deviceToken;
 assert.notEqual(newDevice, deviceToken);
 assert.equal((await call('/api/timeline', { token: newDevice })).status, 200);
 assert.equal((await call('/api/timeline', { token: id })).status, 404, 'a session id is not a credential');

 // Each device credential is revocable on its own.
 assert.equal((await call('/api/profile/device', { method: 'DELETE', token: newDevice })).status, 200);
 assert.equal((await call('/api/timeline', { token: newDevice })).status, 404);
 assert.equal((await call('/api/timeline', { token: deviceToken })).status, 200);
});

test('F-15: five wrong approval codes burn the setup link', async t => {
 const { call } = await start(t);
 const { id } = (await newSession(call)).data;
 const invite = (await call(`/api/sessions/${id}/pair`, { method: 'POST', body: { consent: true } })).data.token;
 const reg = await call('/api/guardians/register', { method: 'POST', body: { username: 'burn.family', passphrase: 'burn family phrase', invite } });
 const cookie = reg.headers.get('set-cookie').split(';')[0];
 const link = (await call('/api/family/setup', { method: 'POST', body: { language: 'en-IN' }, headers: { Cookie: cookie } })).data.link;
 const token = new URL(link).searchParams.get('setup');
 const claim = (await call(`/api/setup/${token}/claim`, { method: 'POST', body: { language: 'en-IN', consent: true } })).data;
 const wrong = claim.code === '123456' ? '654321' : '123456';
 for (let i = 0; i < 5; i++) await call('/api/family/setup/approve', { method: 'POST', body: { code: wrong }, headers: { Cookie: cookie } });
 assert.equal((await call(`/api/setup/${token}`)).status, 404);
});

test('F-12: sessions end after inactivity, and activity extends them up to the cap', async t => {
 const { call } = await start(t, { sessionIdleMs: 150, sessionCapMs: 400 });
 const { id } = (await newSession(call)).data;
 for (let i = 0; i < 3; i++) { await new Promise(r => setTimeout(r, 80)); assert.equal((await call(`/api/sessions/${id}/segments`, { method: 'POST', body: { text: 'Hello there.' } })).status, 200); }
 await new Promise(r => setTimeout(r, 200));
 assert.equal((await call(`/api/sessions/${id}`)).status, 404, 'idle timeout ended it');
 const capped = (await newSession(call)).data.id;
 for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 80)); await call(`/api/sessions/${capped}/segments`, { method: 'POST', body: { text: 'Hello.' } }); }
 assert.equal((await call(`/api/sessions/${capped}`)).status, 404, 'the absolute cap ends it even with activity');
});

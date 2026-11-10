import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

async function start(t, config = {}) {
 const app = createApp({ gnaniKey: '', requireEnrollment: false, ...config });
 await new Promise(r => app.server.listen(0, '127.0.0.1', r));
 t.after(() => app.close());
 const base = `http://127.0.0.1:${app.server.address().port}`;
 const call = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
  const r = await fetch(base + path, { method, headers: { Origin: base, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let data = {}; try { data = JSON.parse(text); } catch { data = { text }; }
  return { status: r.status, data, headers: r.headers };
 };
 return { app, call };
}
async function scamSession(call, sharing = false) {
 const { id, deviceToken } = (await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'demo', consent: true } })).data;
 let cookie = null;
 if (sharing) {
  const invite = (await call(`/api/sessions/${id}/pair`, { method: 'POST', body: { consent: true } })).data.token;
  cookie = (await call('/api/guardians/register', { method: 'POST', body: { username: 'b6.family', passphrase: 'batch six family phrase', invite } })).headers.get('set-cookie').split(';')[0];
 }
 await call(`/api/sessions/${id}/segments`, { method: 'POST', body: { text: 'This is the CBI. Tell me your OTP now and tell no one.' } });
 return { id, deviceToken, cookie };
}

test('batch 6: security headers on every response', async t => {
 const { call } = await start(t);
 const h = (await call('/api/health')).headers;
 assert.match(h.get('content-security-policy'), /object-src 'none'/);
 assert.match(h.get('permissions-policy'), /microphone=\(self\)/);
 assert.equal(h.get('x-frame-options'), 'DENY');
 assert.equal(h.get('cross-origin-opener-policy'), 'same-origin');
 assert.equal(h.get('strict-transport-security'), null, 'HSTS only when served securely');
 assert.equal((await call('/privacy')).status, 200);
});

test('batch 6: metrics exist only with a token, and hold no content', async t => {
 const off = await start(t);
 assert.equal((await off.call('/api/metrics')).status, 404);
 const { call } = await start(t, { metricsToken: 'm-secret' });
 await scamSession(call);
 assert.equal((await call('/api/metrics', { token: 'wrong' })).status, 404);
 const m = await call('/api/metrics', { token: 'm-secret' });
 assert.equal(m.status, 200);
 assert.ok(m.data.counters.some(c => c.name === 'warnings' && c.labels.risk === 'danger'));
 assert.ok(!JSON.stringify(m.data).includes('OTP'), 'no transcript content in metrics');
 const prom = await call('/api/metrics?format=prometheus', { token: 'm-secret' });
 assert.match(prom.data.text, /scam_guardian_warnings_total\{mode="demo",risk="danger"\} 1/);
});

test('batch 6: senior and family label warnings; family only sees shared ones', async t => {
 const { call } = await start(t);
 const { deviceToken, cookie } = await scamSession(call, true); // paired session: its warning is shared
 const shared = (await call('/api/timeline', { token: deviceToken })).data.timeline.at(-1);
 // a second, unshared session on the same device raises a private warning
 const { id: privateId } = (await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'demo', consent: true, deviceToken } })).data;
 await call(`/api/sessions/${privateId}/segments`, { method: 'POST', body: { text: 'This is the CBI. Tell me your OTP now and tell no one.' } });
 const timeline = (await call('/api/timeline', { token: deviceToken })).data.timeline;
 const unshared = timeline.at(-1);
 assert.notEqual(unshared.id, shared.id);
 assert.equal((await call('/api/timeline/label', { method: 'POST', token: deviceToken, body: { eventId: unshared.id, label: 'nonsense' } })).status, 400);
 assert.equal((await call('/api/family/timeline/label', { method: 'POST', headers: { Cookie: cookie }, body: { eventId: unshared.id, label: 'scam' } })).status, 404, 'not shared with family');
 const fam = await call('/api/family/timeline/label', { method: 'POST', headers: { Cookie: cookie }, body: { eventId: shared.id, label: 'scam' } });
 assert.equal(fam.status, 200); assert.equal(fam.data.outcome.by, 'family');
 const own = await call('/api/timeline/label', { method: 'POST', token: deviceToken, body: { eventId: unshared.id, label: 'not_scam' } });
 assert.equal(own.status, 200); assert.equal(own.data.outcome.by, 'senior');
});

test('batch 6: export everything held, then erase it; family accounts are unlinked', async t => {
 const { call } = await start(t);
 const { deviceToken, cookie } = await scamSession(call, true);
 const exp = await call('/api/profile/export', { token: deviceToken });
 assert.equal(exp.status, 200);
 assert.match(exp.headers.get('content-disposition'), /attachment/);
 assert.ok(exp.data.profile.timeline.length >= 1);
 assert.deepEqual(exp.data.familyAccounts, ['b6.family']);
 assert.ok(exp.data.consents.some(c => c.kind === 'demo'));
 assert.ok(!JSON.stringify(exp.data).includes(deviceToken), 'credentials are never exported');
 const del = await call('/api/profile', { method: 'DELETE', token: deviceToken });
 assert.equal(del.status, 200); assert.equal(del.data.familyAccountsUnlinked, 1);
 assert.equal((await call('/api/timeline', { token: deviceToken })).status, 404, 'device credential is gone');
 assert.equal((await call('/api/family', { headers: { Cookie: cookie } })).status, 403, 'family account is unlinked');
});

test('batch 6: a family member deletes their own account', async t => {
 const { call } = await start(t);
 const { cookie } = await scamSession(call, true);
 assert.equal((await call('/api/guardians/me', { method: 'DELETE', headers: { Cookie: cookie } })).status, 200);
 assert.equal((await call('/api/guardians/login', { method: 'POST', body: { username: 'b6.family', passphrase: 'batch six family phrase' } })).status, 401);
});

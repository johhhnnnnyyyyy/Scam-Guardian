import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

// Owner decision (10 November 2026): "link once, share every call". The senior can invite a family member at any
// time, not only during a call; with that one standing consent every later call shares warnings automatically, until
// the senior withdraws it.
async function start(t) {
 const app = createApp({ gnaniKey: '' });
 await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
 t.after(() => app.close());
 const base = `http://127.0.0.1:${app.server.address().port}`;
 const call = async (path, { method = 'GET', body, token, cookie } = {}) => {
  const headers = { Origin: base, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}) };
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = JSON.parse(await r.text()); } catch {}
  return { status: r.status, data, setCookie: r.headers.get('set-cookie') };
 };
 return { call };
}
const cookieOf = h => h?.split(';')[0];
const SCAM = ['This is the cyber police. A case is registered against you.', 'Tell me the OTP you just received, do not tell your family.'];

test('family link without a call: a later call is shared automatically, until consent is withdrawn', async t => {
 const { call } = await start(t);
 // The device exists from an earlier session, which has ended: no call is running now.
 const first = await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'text', consent: true } });
 const device = first.data.deviceToken;
 await call(`/api/sessions/${first.data.id}`, { method: 'DELETE' });

 assert.equal((await call('/api/profile/family', { method: 'POST', token: device, body: {} })).status, 403, 'needs explicit consent');
 const linked = await call('/api/profile/family', { method: 'POST', token: device, body: { consent: true } });
 assert.equal(linked.status, 201, JSON.stringify(linked.data));
 assert.match(linked.data.token, /^[a-f0-9]{64}$/);

 const reg = await call('/api/guardians/register', { method: 'POST', body: { username: 'asha_family', passphrase: 'correct horse battery', invite: linked.data.token } });
 assert.equal(reg.status, 201, JSON.stringify(reg.data));
 const family = cookieOf(reg.setCookie);
 assert.equal((await call('/api/timeline', { token: device })).data.familySharing, true, 'the senior\'s page can show that sharing is on');

 // A new call, days later in real life: nothing to switch on.
 const later = await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'text', consent: true, deviceToken: device } });
 for (const text of SCAM) await call(`/api/sessions/${later.data.id}/segments`, { method: 'POST', body: { text } });
 const view = (await call('/api/family', { cookie: family })).data;
 assert.equal(view.sharing, true);
 assert.equal(view.risk, 'danger');

 // Withdrawn: the family account stays, but nothing from calls is shared any more, and the old invite is dead.
 assert.equal((await call('/api/profile/family', { method: 'DELETE', token: device })).status, 200);
 assert.equal((await call('/api/family', { cookie: family })).data.sharing, false);
 assert.equal((await call('/api/guardians/register', { method: 'POST', body: { username: 'second_one', passphrase: 'correct horse battery', invite: linked.data.token } })).status, 404);
 assert.equal((await call('/api/timeline', { token: device })).data.familySharing, false);
});

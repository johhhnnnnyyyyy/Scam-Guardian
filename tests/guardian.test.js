import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

async function start(t, config = {}) {
 const app = createApp({ gnaniKey: '', ...config });
 await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
 t.after(() => app.close());
 const base = `http://127.0.0.1:${app.server.address().port}`;
 const call = async (path, { method = 'GET', body, token, cookie, origin = base } = {}) => {
  const headers = { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) };
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data = {}; try { data = JSON.parse(text); } catch {}
  return { status: r.status, data, setCookie: r.headers.get('set-cookie') };
 };
 return { app, base, call };
}
const cookieOf = header => header?.split(';')[0];

async function seniorWithInvite(call) {
 const created = await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'text', consent: true } });
 const { id, deviceToken: profileToken } = created.data;
 const paired = await call(`/api/sessions/${id}/pair`, { method: 'POST', body: { consent: true } });
 return { id, profileToken, invite: paired.data.token };
}

test('family members register with their own login, separate from the senior', async t => {
 const { call } = await start(t);
 const { id, profileToken, invite } = await seniorWithInvite(call);

 assert.equal((await call('/api/family')).status, 401, 'family view requires a family login');
 assert.equal((await call('/api/guardians/register', { method: 'POST', body: { username: 'asha', passphrase: 'short', invite } })).status, 400);
 assert.equal((await call('/api/guardians/register', { method: 'POST', body: { username: 'asha', passphrase: 'correct horse battery', invite: 'f'.repeat(64) } })).status, 404);
 assert.equal((await call('/api/guardians/register', { method: 'POST', body: { username: 'asha', passphrase: 'correct horse battery', invite }, origin: null })).status, 403, 'cookie-auth writes need an Origin');

 const reg = await call('/api/guardians/register', { method: 'POST', body: { username: 'Asha', passphrase: 'correct horse battery', invite } });
 assert.equal(reg.status, 201);
 assert.match(reg.setCookie, /HttpOnly/);
 assert.match(reg.setCookie, /SameSite=Strict/);
 const cookie = cookieOf(reg.setCookie);
 assert.equal((await call('/api/guardians/register', { method: 'POST', body: { username: 'asha', passphrase: 'another passphrase', invite } })).status, 409);

 const me = await call('/api/guardians/me', { cookie });
 assert.deepEqual([me.data.username, me.data.linked], ['asha', true]);

 // The senior's profile token is not a family login, and the invite alone is not a login.
 assert.equal((await call('/api/family', { token: profileToken })).status, 401);
 assert.equal((await call('/api/family', { token: invite })).status, 401);

 await call(`/api/sessions/${id}/segments`, { method: 'POST', body: { text: 'I am a police officer. Do not tell your family. Transfer INR 1000 to a safe account.' } });
 const family = await call('/api/family', { cookie });
 assert.equal(family.status, 200);
 assert.equal(family.data.sharing, true);
 assert.equal(family.data.risk, 'danger');
 assert.ok(!JSON.stringify(family.data).includes('police officer'));

 // Senior revokes this session's sharing: live state, reasons and timeline all disappear.
 await call(`/api/sessions/${id}/pair`, { method: 'DELETE' });
 const after = await call('/api/family', { cookie });
 assert.equal(after.data.sharing, false);
 assert.equal(after.data.risk, undefined);
 assert.equal(after.data.timeline.length, 0);
 assert.equal(after.data.reasons, undefined);

 // Logout ends the family session.
 assert.equal((await call('/api/guardians/logout', { method: 'POST', cookie })).status, 200);
 assert.equal((await call('/api/family', { cookie })).status, 401);
});

test('family login rejects wrong passphrases and locks out repeated guessing', async t => {
 const { call } = await start(t);
 const { invite } = await seniorWithInvite(call);
 await call('/api/guardians/register', { method: 'POST', body: { username: 'ravi', passphrase: 'a long family passphrase', invite } });
 assert.equal((await call('/api/guardians/login', { method: 'POST', body: { username: 'ravi', passphrase: 'wrong passphrase!!' } })).status, 401);
 assert.equal((await call('/api/guardians/login', { method: 'POST', body: { username: 'nobody', passphrase: 'wrong passphrase!!' } })).status, 401);
 const ok = await call('/api/guardians/login', { method: 'POST', body: { username: 'RAVI', passphrase: 'a long family passphrase' } });
 assert.equal(ok.status, 200);
 assert.ok(cookieOf(ok.setCookie));
 for (let i = 0; i < 5; i++) await call('/api/guardians/login', { method: 'POST', body: { username: 'ravi', passphrase: 'wrong passphrase!!' } });
 assert.equal((await call('/api/guardians/login', { method: 'POST', body: { username: 'ravi', passphrase: 'a long family passphrase' } })).status, 429);
});

test('the senior can see and remove linked family accounts', async t => {
 const { call } = await start(t);
 const { profileToken, invite } = await seniorWithInvite(call);
 const reg = await call('/api/guardians/register', { method: 'POST', body: { username: 'meena', passphrase: 'meena family phrase', invite } });
 const cookie = cookieOf(reg.setCookie);
 const list = await call('/api/profile/guardians', { token: profileToken });
 assert.deepEqual(list.data.guardians.map(g => g.username), ['meena']);
 assert.equal((await call('/api/profile/guardians/meena', { method: 'DELETE', token: profileToken })).status, 200);
 assert.equal((await call('/api/family', { cookie })).status, 403);
 assert.equal((await call('/api/profile/guardians', { token: profileToken })).data.guardians.length, 0);
});

test('a family account cannot see another senior or unshared sessions, and a foreign Origin cannot write', async t => {
 const { call } = await start(t);
 const a = await seniorWithInvite(call), b = await seniorWithInvite(call);
 const reg = await call('/api/guardians/register', { method: 'POST', body: { username: 'only.a', passphrase: 'senior a family phrase', invite: a.invite } });
 const cookie = cookieOf(reg.setCookie);
 await call(`/api/sessions/${b.id}/segments`, { method: 'POST', body: { text: 'Tell me your OTP.' } });
 assert.equal((await call('/api/family', { cookie })).data.risk, 'safe', 'senior B never reaches senior A family');
 // Senior A starts a second, unshared session that turns red: its reasons must not reach the family timeline.
 const unshared = await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'text', consent: true, deviceToken: a.profileToken } });
 await call(`/api/sessions/${unshared.data.id}/segments`, { method: 'POST', body: { text: 'Tell me your OTP.' } });
 assert.equal((await call('/api/family', { cookie })).data.timeline.length, 0);
 assert.equal((await call('/api/timeline', { token: a.profileToken })).data.timeline.length, 1, 'the senior still sees their own timeline');
 assert.equal((await call('/api/profile/guardians', { token: b.profileToken })).data.guardians.length, 0);
 assert.equal((await call('/api/guardians/logout', { method: 'POST', cookie, origin: 'https://evil.invalid' })).status, 403);
 assert.equal((await call('/api/guardians/login', { method: 'POST', body: { username: '../../etc', passphrase: 'whatever passphrase' } })).status, 401);
});

test('concurrent registrations of one username create exactly one account', async t => {
 const { call } = await start(t);
 const { invite } = await seniorWithInvite(call);
 const results = await Promise.all([0, 1, 2].map(() => call('/api/guardians/register', { method: 'POST', body: { username: 'same.name', passphrase: 'same family phrase', invite } })));
 assert.deepEqual(results.map(r => r.status).sort(), [201, 409, 409]);
});

test('a logged-in family member can link to a senior with a new invite', async t => {
 const { call } = await start(t);
 const first = await seniorWithInvite(call);
 const reg = await call('/api/guardians/register', { method: 'POST', body: { username: 'kiran', passphrase: 'kiran family phrase', invite: first.invite } });
 await call(`/api/profile/guardians/kiran`, { method: 'DELETE', token: first.profileToken });
 const second = await seniorWithInvite(call);
 const relinked = await call('/api/guardians/login', { method: 'POST', body: { username: 'kiran', passphrase: 'kiran family phrase', invite: second.invite } });
 assert.equal(relinked.status, 200);
 const family = await call('/api/family', { cookie: cookieOf(relinked.setCookie) });
 assert.equal(family.status, 200);
 assert.equal(family.data.sharing, true);
 assert.ok(reg.status === 201);
});

test('GET session never returns the profile capability', async t => {
 const { call } = await start(t);
 const { id } = await seniorWithInvite(call);
 const s = await call(`/api/sessions/${id}`);
 assert.equal(s.status, 200);
 assert.equal(s.data.profileToken, undefined);
});

test('the AI classifier runs after the rule verdict is returned', async t => {
 let release;
 const gate = new Promise(r => { release = r; });
 const fetcher = async (_url, init) => {
  await gate;
  const { segments } = JSON.parse(JSON.parse(init.body).messages[1].content);
  const seg = segments.at(-1);
  return Response.json({ choices: [{ message: { content: JSON.stringify({ flags: [{ tactic: 'payment', segmentId: seg.id, quote: 'Move the funds to the holding account' }] }) } }] });
 };
 const { app, call } = await start(t, { llmKey: 'fake', llmModel: 'test', fetcher });
 const created = await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'text', consent: true } });
 const id = created.data.id;
 await call(`/api/sessions/${id}/segments`, { method: 'POST', body: { text: 'I am a CBI officer. Keep this secret.' } });
 release();
 await app.settle();
 const started = Date.now();
 const r = await call(`/api/sessions/${id}/segments`, { method: 'POST', body: { text: 'Move the funds to the holding account.' } });
 assert.ok(Date.now() - started < 1000, 'snapshot did not wait for the classifier');
 assert.equal(r.data.risk, 'careful');
 await app.settle();
 const s = await call(`/api/sessions/${id}`);
 assert.equal(s.data.risk, 'danger');
 assert.equal(s.data.llmStatus, 'available');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server.js';

async function boot(t, dataDir) {
 const app = createApp({ gnaniKey: '', dataDir, persistEveryMs: 60000 });
 await new Promise(r => app.server.listen(0, '127.0.0.1', r));
 const base = `http://127.0.0.1:${app.server.address().port}`;
 const call = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
  const r = await fetch(base + path, { method, headers: { Origin: base, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = JSON.parse(await r.text()); } catch {}
  return { status: r.status, data, headers: r.headers };
 };
 return { app, call };
}

test('decision 8: accounts, profiles and device credentials survive a restart; sessions do not', async t => {
 const dir = mkdtempSync(join(tmpdir(), 'sg-state-'));
 const first = await boot(t, dir);
 const created = await first.call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'demo', consent: true } });
 const { id, deviceToken } = created.data;
 await first.call(`/api/sessions/${id}/segments`, { method: 'POST', body: { text: 'This is CBI, send money now and tell no one.' } });
 const invite = (await first.call(`/api/sessions/${id}/pair`, { method: 'POST', body: { consent: true } })).data.token;
 assert.equal((await first.call('/api/guardians/register', { method: 'POST', body: { username: 'persist.fam', passphrase: 'a long family phrase', invite } })).status, 201);
 first.app.close();
 const file = join(dir, 'state.json');
 assert.equal(statSync(file).mode & 0o777, 0o600, 'state file is owner-only');
 const raw = readFileSync(file, 'utf8');
 assert.ok(!raw.includes('send money'), 'no transcript text is written to disk');
 assert.ok(!raw.includes(deviceToken), 'device credentials are stored only as hashes');

 const second = await boot(t, dir);
 t.after(() => second.app.close());
 assert.equal((await second.call('/api/timeline', { token: deviceToken })).status, 200, 'device credential still works');
 assert.equal((await second.call('/api/guardians/login', { method: 'POST', body: { username: 'persist.fam', passphrase: 'a long family phrase' } })).status, 200);
 assert.equal((await second.call(`/api/sessions/${id}`)).status, 404, 'live sessions are not restored');
});

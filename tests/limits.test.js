import test from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter, clientKeyFor } from '../src/limits.js';

test('F-17: the daily provider cap is a fixed window, not a rolling refill', () => {
 let t = 0;
 const l = createLimiter({ rules: { providerDaily: { capacity: 2, perMs: 1000, window: true } }, now: () => t });
 l.take('providerDaily', 'process'); l.take('providerDaily', 'process');
 t = 600;
 assert.throws(() => l.take('providerDaily', 'process'), e => e.status === 429 && e.reason === 'client_rate_limit' || e.status === 429);
 t = 1000;
 l.take('providerDaily', 'process');
});

test('F-17: refilled buckets are swept, a full table evicts the oldest instead of locking everyone out, proxy headers need configuration', () => {
 let t = 0;
 const l = createLimiter({ rules: { a: { capacity: 1, perMs: 100 } }, maxKeys: 2, now: () => t });
 l.take('a', 'x'); l.take('a', 'y');
 l.take('a', 'z'); // evicts the oldest entry; the new key still has a limited bucket
 assert.throws(() => l.take('a', 'z'), e => e.status === 429);
 assert.ok(l.size() <= 2);
 t = 200; l.sweep();
 assert.equal(l.size(), 0);
 const req = { headers: { 'x-forwarded-for': '1.1.1.1, 9.9.9.9' }, socket: { remoteAddress: '127.0.0.1' } };
 assert.equal(clientKeyFor(req), '127.0.0.1', 'ignored by default');
 assert.equal(clientKeyFor(req, 1), '9.9.9.9', 'rightmost entry with one trusted hop');
 assert.equal(clientKeyFor({ headers: {}, socket: { remoteAddress: '2001:db8:1:2:3:4:5:6' } }), '2001:db8:1:2::/64');
});

test('decision 11: limits are configurable from the environment', async () => {
 const { limitsFromEnv } = await import('../src/limits.js');
 assert.deepEqual(limitsFromEnv({}), {});
 const l = limitsFromEnv({ PROVIDER_DAILY_CAP: '200', LIMIT_SESSION_CREATE: '40/60' });
 assert.equal(l.providerDaily.capacity, 200);
 assert.equal(l.providerDaily.window, true);
 assert.deepEqual(l.sessionCreate, { capacity: 40, perMs: 60000 });
 assert.throws(() => limitsFromEnv({ LIMIT_NOPE: '3' }), /unknown limit/);
 assert.throws(() => limitsFromEnv({ PROVIDER_DAILY_CAP: 'lots' }), /positive integer/);
});

import { AppError } from './providers.js';

// In-process token buckets with lazy refill and a bounded key table. Owner decision 11: every rule is configurable
// from the environment (limitsFromEnv); the defaults below apply otherwise. Code can still pass createApp({ limits }).
export const DEFAULT_LIMITS = {
 sessionCreate: { capacity: 20, perMs: 3600e3 },           // per client
 listen: { capacity: 10, perMs: 60e3 },                    // WebSocket upgrades per client
 upload: { capacity: 6, perMs: 60e3 },                     // per client
 uploadSession: { capacity: 10, perMs: 3600e3 },           // per session (sessions last at most an hour)
 warning: { capacity: 10, perMs: 60e3 },                   // per session
 warningSession: { capacity: 40, perMs: 3600e3 },          // per session
 segments: { capacity: 120, perMs: 60e3 },                 // per session
 drill: { capacity: 10, perMs: 3600e3 },                   // per client
 voice: { capacity: 3, perMs: 24 * 3600e3 },               // per family account
 setupMint: { capacity: 10, perMs: 3600e3 },               // per family account
 setupClaim: { capacity: 10, perMs: 600e3 },               // per client
 enroll: { capacity: 6, perMs: 3600e3 },                    // voice enrollments per client
 providerDaily: { capacity: 500, perMs: 24 * 3600e3, window: true }, // whole process: fixed daily window, not a rolling refill
};

// PROVIDER_DAILY_CAP=500 sets the paid-call cap; LIMIT_<RULE>=capacity or capacity/perSeconds overrides any rule,
// e.g. LIMIT_SESSION_CREATE=40/3600. Malformed values are rejected at start-up rather than silently ignored.
export function limitsFromEnv(env = process.env) {
 const out = {};
 const camel = k => k.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
 const parse = (name, raw, base) => {
  const m = /^(\d+)(?:\/(\d+))?$/.exec(String(raw).trim());
  if (!m || Number(m[1]) < 1) throw new Error(`${name} must be a positive integer or capacity/perSeconds`);
  return { ...base, capacity: Number(m[1]), ...(m[2] ? { perMs: Number(m[2]) * 1000 } : {}) };
 };
 for (const [k, v] of Object.entries(env)) {
  if (!k.startsWith('LIMIT_')) continue;
  const rule = camel(k.slice(6));
  if (!DEFAULT_LIMITS[rule]) throw new Error(`${k}: unknown limit ${rule}`);
  out[rule] = parse(k, v, DEFAULT_LIMITS[rule]);
 }
 if (env.PROVIDER_DAILY_CAP !== undefined) out.providerDaily = parse('PROVIDER_DAILY_CAP', env.PROVIDER_DAILY_CAP, DEFAULT_LIMITS.providerDaily);
 return out;
}

export function createLimiter({ rules = {}, maxKeys = 5000, now = () => Date.now() } = {}) {
 const config = { ...DEFAULT_LIMITS, ...rules };
 const buckets = new Map();
 function take(rule, key, reason = 'client_rate_limit') {
  const r = config[rule];
  if (!r) throw new Error(`Unknown limit ${rule}`);
  const id = `${rule}|${key}`, t = now();
  let b = buckets.get(id);
  if (!b) {
   // Bounded memory. A full table first drops refilled buckets, then the oldest ones (never the daily cap), so it
   // can neither grow without limit nor lock everyone out; only if nothing can be dropped does it refuse with 429.
   if (buckets.size >= maxKeys) sweep(true);
   if (buckets.size >= maxKeys) throw limited(60, 'limiter_full', 'The service is busy. Please retry in a minute.');
   b = { tokens: r.capacity, at: t };
   buckets.set(id, b);
  } else if (r.window) {
   if (t - b.at >= r.perMs) { b.tokens = r.capacity; b.at = t; } // a fresh window starts; no gradual refill
  } else if (Number.isFinite(r.perMs)) {
   b.tokens = Math.min(r.capacity, b.tokens + ((t - b.at) / r.perMs) * r.capacity);
   b.at = t;
  }
  if (b.tokens < 1) {
   const wait = Number.isFinite(r.perMs) ? Math.ceil(((1 - b.tokens) * r.perMs) / r.capacity / 1000) : 3600;
   throw limited(wait, reason, reason === 'daily_cost_cap' ? 'The daily speech-service budget is used up. Please try again later.' : reason === 'session_budget' ? 'This session has reached its limit. Start a new session.' : 'Too many requests. Please wait and try again.');
  }
  b.tokens -= 1;
 }
 // Drop buckets that have fully refilled (they carry no state); under pressure also drop the least recently used.
 function sweep(pressure = false) {
  const t = now();
  for (const [k, b] of buckets) { const r = config[k.split('|')[0]]; if (t - b.at >= r.perMs) buckets.delete(k); }
  if (pressure) for (const [k] of buckets) { if (buckets.size < maxKeys * 0.9) break; if (!k.startsWith('providerDaily|')) buckets.delete(k); }
 }
 return { take, sweep, size: () => buckets.size };
}

function limited(retryAfter, reason, message) {
 const e = new AppError(429, message);
 e.retryAfter = Math.max(1, retryAfter);
 e.reason = reason;
 return e;
}

// Client identity for limits. Proxy headers are trusted only when TRUST_PROXY_HOPS is configured, and then only the
// entry the last trusted proxy appended (the leftmost X-Forwarded-For values are client-controlled).
export function clientKeyFor(req, trustProxyHops = 0) {
 if (trustProxyHops > 0) {
  const parts = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean);
  const candidate = parts[parts.length - trustProxyHops];
  if (candidate) return groupAddress(candidate);
 }
 return groupAddress(req.socket?.remoteAddress || 'unknown');
}
// IPv6 clients usually control a whole /64, so group by it.
function groupAddress(address) {
 const a = address.replace(/^::ffff:/, '');
 return a.includes(':') ? a.split(':').slice(0, 4).join(':') + '::/64' : a;
}

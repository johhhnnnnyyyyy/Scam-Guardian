import { createHash } from 'node:crypto';

// Wilson score interval for k successes out of n (95% by default). Report k/n with this, never a bare rate.
export function wilson(k, n, z = 1.959964) {
 if (!n) return { k, n, low: null, high: null };
 const p = k / n, z2 = z * z, denom = 1 + z2 / n;
 const centre = (p + z2 / (2 * n)) / denom, half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
 return { k, n, low: k === 0 ? 0 : Math.max(0, centre - half), high: k === n ? 1 : Math.min(1, centre + half) };
}
export const formatInterval = ({ k, n, low, high }) => (n ? `${k}/${n} (95% CI ${(low * 100).toFixed(1)}–${(high * 100).toFixed(1)}%)` : `${k}/0 (no data)`);

// Deterministic held-out assignment by group (a scam template with its benign twins and variants stays together).
export function splitOf(groupId, heldOutShare = 0.3) {
 const bucket = parseInt(createHash('sha256').update(String(groupId)).digest('hex').slice(0, 8), 16) % 100;
 return bucket < heldOutShare * 100 ? 'heldout' : 'tuning';
}

// Code-Mixing Index (Das & Gambäck 2014): 100 × (1 − max_i w_i / (n − u)), 0 when every token is language-independent.
export function cmi(tags) {
 const n = tags.length, u = tags.filter(t => !t.lang || t.lang === 'univ').length;
 if (n === u) return 0;
 const counts = {};
 for (const t of tags) if (t.lang && t.lang !== 'univ') counts[t.lang] = (counts[t.lang] || 0) + 1;
 return 100 * (1 - Math.max(...Object.values(counts)) / (n - u));
}

// A slice gets a pass/fail label only when it has enough items to mean something (owner decision 17).
export const MIN_SLICE_FOR_CLAIM = 30;

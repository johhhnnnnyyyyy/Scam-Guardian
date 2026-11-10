// Privacy-safe operational metrics (batch 6). Counters and small latency summaries only: no transcript text, no
// audio, no identifiers, no IP addresses. Exposed at GET /api/metrics only when METRICS_TOKEN is set, as JSON or in
// Prometheus text format (?format=prometheus).
export function createMetrics({ now = () => Date.now() } = {}) {
 const startedAt = now();
 const counters = new Map(), timings = new Map();
 const key = (name, labels = {}) => name + JSON.stringify(Object.entries(labels).sort());
 function inc(name, labels = {}, by = 1) {
  const k = key(name, labels);
  const c = counters.get(k) || { name, labels, value: 0 };
  c.value += by; counters.set(k, c);
 }
 // Keeps the last 500 samples per timing; enough for p50/p95 on a single instance.
 function time(name, ms) {
  const t = timings.get(name) || [];
  t.push(ms); if (t.length > 500) t.shift();
  timings.set(name, t);
 }
 const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] * 10) / 10; };
 function snapshot() {
  return {
   uptimeSeconds: Math.round((now() - startedAt) / 1000),
   counters: [...counters.values()].map(c => ({ ...c, labels: { ...c.labels } })),
   timings: Object.fromEntries([...timings].map(([n, t]) => [n, { count: t.length, p50: pct(t, 50), p95: pct(t, 95) }])),
  };
 }
 function prometheus() {
  const lines = [`scam_guardian_uptime_seconds ${snapshot().uptimeSeconds}`];
  for (const c of counters.values()) {
   const l = Object.entries(c.labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}="${String(v).replace(/["\\\n]/g, '_')}"`).join(',');
   lines.push(`scam_guardian_${c.name}_total${l ? `{${l}}` : ''} ${c.value}`);
  }
  for (const [n, t] of timings) { lines.push(`scam_guardian_${n}_ms{quantile="0.5"} ${pct(t, 50) ?? 0}`); lines.push(`scam_guardian_${n}_ms{quantile="0.95"} ${pct(t, 95) ?? 0}`); }
  return lines.join('\n') + '\n';
 }
 return { inc, time, snapshot, prometheus };
}

// Synthetic voices for attribution tests: harmonic sources shaped by formant envelopes. Not speech; deterministic.
export function voice({ f0 = 130, formants = [600, 1200, 2600], seconds = 3, rate = 16000, seed = 1, vibrato = 4 } = {}) {
 const n = Math.round(seconds * rate), out = new Float32Array(n);
 let r = seed; const rand = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
 const env = f => formants.reduce((a, F, i) => a + 1 / (1 + ((f - F) / (80 + 40 * i)) ** 2), 0.02) / (1 + f / 4000);
 const phases = Array.from({ length: 80 }, () => rand() * 6.28);
 let phase = 0; // integrated phase, so the pitch wobble does not smear the spectrum over time
 for (let i = 0; i < n; i++) {
  const t = i / rate, syll = 0.55 + 0.45 * Math.sin(2 * Math.PI * 3 * t) ** 2; // syllable-like amplitude
  const f = f0 * (1 + 0.03 * Math.sin(2 * Math.PI * vibrato * t));
  phase += (2 * Math.PI * f) / rate;
  let v = 0;
  for (let h = 1; h * f0 < rate / 2 - 100 && h <= 80; h++) v += env(h * f) * Math.sin(h * phase + phases[h - 1]);
  out[i] = v * syll;
 }
 let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
 for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * 0.5 + (rand() - 0.5) * 0.002;
 return out;
}

// A phone line + small loudspeaker: keep only lo..hi Hz (brick-wall in the frequency domain), plus a little noise.
export function phoneLine(x, { rate = 16000, lo = 300, hi = 3400 } = {}) {
 let n = 1; while (n < x.length) n <<= 1;
 const re = new Float64Array(n), im = new Float64Array(n); re.set(x);
 const fft = (re, im, inv) => {
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = ((inv ? 2 : -2) * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr; re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
 };
 fft(re, im, false);
 for (let k = 0; k < n; k++) { const f = (Math.min(k, n - k) * rate) / n; if (f < lo || f > hi) { re[k] = 0; im[k] = 0; } }
 fft(re, im, true);
 const out = new Float32Array(x.length); let peak = 0;
 for (let i = 0; i < x.length; i++) { out[i] = re[i] / n; peak = Math.max(peak, Math.abs(out[i])); }
 for (let i = 0; i < x.length; i++) out[i] = (out[i] / peak) * 0.4 + (((i * 7919) % 1000) / 1000 - 0.5) * 0.001;
 return out;
}
export const toInt16 = x => Int16Array.from(x, v => Math.max(-32768, Math.min(32767, Math.round(v * 32767))));

// The senior speaking towards the phone, turned away from the Guardian device: high frequencies fade smoothly with
// direction and distance (no sharp edge), unlike a phone line's brick-wall cut. Two one-pole low-pass stages.
export function turnedAway(x, { rate = 16000, cornerHz = 1200 } = {}) {
 const a = Math.exp((-2 * Math.PI * cornerHz) / rate), out = new Float32Array(x.length);
 let y1 = 0, y2 = 0, peak = 0;
 for (let i = 0; i < x.length; i++) { y1 = (1 - a) * x[i] + a * y1; y2 = (1 - a) * y1 + a * y2; out[i] = y2; peak = Math.max(peak, Math.abs(y2)); }
 for (let i = 0; i < x.length; i++) out[i] = (out[i] / peak) * 0.3 + (((i * 7919) % 1000) / 1000 - 0.5) * 0.001;
 return out;
}

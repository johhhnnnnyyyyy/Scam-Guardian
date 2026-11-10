// Acoustic evidence for caller-vs-senior attribution (owner decision 24). Pure JS, no dependencies, runs in a few
// milliseconds per turn. Two independent measurements per speech turn:
//  1. Channel: a voice that reached the microphone through a phone call and the phone's loudspeaker has lost the band
//     above ~3.4 kHz (narrowband AMR-NB, the inter-operator default in India) and some of the band below ~250 Hz
//     (small loudspeaker). The senior's own voice reaches the companion device through the air, full-band.
//  2. Voice print: how close the turn's voice is to the senior's compulsory enrollment. The built-in print uses only
//     the 300–3400 Hz band, which survives a phone line, so the two measurements do not share the channel cue.
// The built-in voice print is a transparent spectral baseline, NOT a neural speaker model. A neural embedder (for
// example CAM++ or ECAPA-TDNN through sherpa-onnx) can be plugged in through createVerifier({ embed }). Every
// threshold here is a starting value that must be calibrated on real speakerphone recordings (docs/DECISIONS.md 24).

export const MIN_VOICED_MS = 1500; // below this, short-segment speaker evidence is unreliable: report "unknown"

function fft(re, im) {
 const n = re.length;
 for (let i = 1, j = 0; i < n; i++) {
  let bit = n >> 1;
  for (; j & bit; bit >>= 1) j ^= bit;
  j ^= bit;
  if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
 }
 for (let len = 2; len <= n; len <<= 1) {
  const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
  for (let i = 0; i < n; i += len) {
   let cr = 1, ci = 0;
   for (let k = 0; k < len / 2; k++) {
    const a = i + k, b = a + len / 2;
    const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
    re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
    const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
   }
  }
 }
}

const toFloat = pcm => {
 if (pcm instanceof Float32Array) return pcm;
 const i16 = pcm instanceof Int16Array ? pcm : new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
 const out = new Float32Array(i16.length);
 for (let i = 0; i < i16.length; i++) out[i] = i16[i] / 32768;
 return out;
};

// Power spectra of the voiced frames only (energy gate relative to the loudest frames).
export function voicedSpectra(pcm, rate, gateRatio = 0.03) {
 const x = toFloat(pcm);
 let size = 256; while (size < rate * 0.032) size <<= 1;
 const hop = size >> 1, win = new Float32Array(size).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
 const frames = [];
 for (let start = 0; start + size <= x.length; start += hop) {
  const re = new Float32Array(size), im = new Float32Array(size);
  let energy = 0;
  for (let i = 0; i < size; i++) { const v = x[start + i]; energy += v * v; re[i] = v * win[i]; }
  frames.push({ start, energy: energy / size, re, im });
 }
 if (!frames.length) return { spectra: [], size, hop, voicedMs: 0 };
 const sorted = frames.map(f => f.energy).sort((a, b) => b - a);
 const loud = sorted[Math.floor(sorted.length * 0.1)] || sorted[0];
 const gate = Math.max(loud * gateRatio, 1e-7); // −15 dB below the loud frames, and an absolute floor for silence
 const spectra = [];
 for (const f of frames) {
  if (f.energy < gate) continue;
  fft(f.re, f.im);
  const p = new Float32Array(size / 2 + 1);
  for (let k = 0; k <= size / 2; k++) p[k] = f.re[k] * f.re[k] + f.im[k] * f.im[k];
  spectra.push(p);
 }
 return { spectra, size, hop, voicedMs: (spectra.length * hop * 1000) / rate };
}

const bandEnergy = (p, size, rate, lo, hi) => {
 const k0 = Math.max(1, Math.ceil((lo * size) / rate)), k1 = Math.min(p.length - 1, Math.floor((hi * size) / rate));
 let e = 0; for (let k = k0; k <= k1; k++) e += p[k];
 return e / Math.max(1, k1 - k0 + 1);
};
const db = v => 10 * Math.log10(v + 1e-12);

// Channel features (dB), each relative to the 300–3400 Hz voice band:
//  highBandDb 3.6–7.6 kHz — empty on a narrowband (AMR-NB) call;
//  topBandDb  7.1–7.8 kHz — empty on a wideband (AMR-WB/VoLTE, ≤7 kHz) call too;
//  lowBandDb  80–250 Hz   — reduced by a small phone loudspeaker.
export function channelFeatures(pcm, rate) {
 const { spectra, size, voicedMs } = voicedSpectra(pcm, rate);
 if (!spectra.length) return { voicedMs: 0, highBandDb: null, topBandDb: null, lowBandDb: null };
 const nyq = rate / 2 - 100;
 let hi = 0, top = 0, lo = 0, mid = 0, nbIn = 0, nbOut = 0, wbIn = 0, wbOut = 0;
 for (const p of spectra) {
  mid += bandEnergy(p, size, rate, 300, 3400); hi += bandEnergy(p, size, rate, 3600, Math.min(7600, nyq));
  if (nyq >= 7500) top += bandEnergy(p, size, rate, 7100, Math.min(7800, nyq));
  lo += bandEnergy(p, size, rate, 80, 250);
  // Band edges of phone audio: narrowband calls stop at ~3.4 kHz, VoLTE/HD calls at ~7 kHz. A phone line cuts there
  // like a cliff; distance or facing away only fades the highs smoothly. edge = how sharply energy falls at the edge.
  nbIn += bandEnergy(p, size, rate, 2900, 3300); nbOut += bandEnergy(p, size, rate, 3600, 4000);
  if (nyq >= 7500) { wbIn += bandEnergy(p, size, rate, 6200, 6800); wbOut += bandEnergy(p, size, rate, 7100, 7600); }
 }
 return { voicedMs, highBandDb: db(hi) - db(mid), topBandDb: nyq >= 7500 ? db(top) - db(mid) : null, lowBandDb: db(lo) - db(mid),
  nbEdgeDb: db(nbIn) - db(nbOut), wbEdgeDb: nyq >= 7500 ? db(wbIn) - db(wbOut) : null };
}

// Built-in voice print: per-band mean and spread of log energy on a mel-like scale within 300–3400 Hz.
const BANDS = 24;
const edges = Array.from({ length: BANDS + 2 }, (_, i) => { const m0 = 2595 * Math.log10(1 + 300 / 700), m1 = 2595 * Math.log10(1 + 3400 / 700); return 700 * (10 ** ((m0 + ((m1 - m0) * i) / (BANDS + 1)) / 2595) - 1); });
function bandFrames(spectra, size, rate) {
 return spectra.map(p => {
  const v = new Float32Array(BANDS), mean = db(bandEnergy(p, size, rate, 300, 3400));
  for (let b = 0; b < BANDS; b++) v[b] = db(bandEnergy(p, size, rate, edges[b], edges[b + 2])) - mean; // level-normalised shape
  return v;
 });
}
const stats = frames => {
 const mean = new Float64Array(BANDS), sd = new Float64Array(BANDS);
 for (const f of frames) for (let b = 0; b < BANDS; b++) mean[b] += f[b] / frames.length;
 for (const f of frames) for (let b = 0; b < BANDS; b++) sd[b] += (f[b] - mean[b]) ** 2 / frames.length;
 for (let b = 0; b < BANDS; b++) sd[b] = Math.sqrt(sd[b]);
 return { mean: [...mean], sd: [...sd] };
};

// Pitch (Hz) of each voiced frame by autocorrelation over 70–400 Hz; median and spread are speaker cues.
function pitchTrack(pcm, rate) {
 const x = toFloat(pcm), size = Math.round(rate * 0.04), hop = Math.round(rate * 0.02), lagMin = Math.floor(rate / 400), lagMax = Math.ceil(rate / 70);
 const out = [];
 for (let start = 0; start + size + lagMax <= x.length; start += hop) {
  let e = 0; for (let i = 0; i < size; i++) e += x[start + i] ** 2;
  if (e / size < 1e-4) continue;
  let best = 0, bestLag = 0;
  for (let lag = lagMin; lag <= lagMax; lag++) {
   let c = 0, e2 = 0; for (let i = 0; i < size; i++) { c += x[start + i] * x[start + i + lag]; e2 += x[start + i + lag] ** 2; }
   const r = c / Math.sqrt(e * e2 || 1);
   if (r > best) { best = r; bestLag = lag; }
  }
  if (best > 0.6) out.push(rate / bestLag);
 }
 return out;
}
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// Turn-level descriptor: band-shape means (dB) + log pitch (semitones). Compared with the enrollment's own
// variability across 2-second chunks, which is how much the senior's voice is expected to wander between turns.
function describe(pcm, rate) {
 const { spectra, size } = voicedSpectra(pcm, rate);
 if (!spectra.length) return null;
 const { mean } = stats(bandFrames(spectra, size, rate));
 const f0 = median(pitchTrack(pcm, rate));
 return { bands: mean, pitch: f0 ? 12 * Math.log2(f0 / 100) : null };
}

// A verifier enrolls the senior and scores later turns. Scores: higher = more like the senior.
export function createVerifier({ embed = null, match = 0.6, nonmatch = 0.35 } = {}) {
 if (embed) {
  // Plug-in neural embedder: embed(Float32Array, rate) → Float32Array. Cosine similarity, thresholds to calibrate.
  const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; } return d / Math.sqrt(na * nb || 1); };
  return {
   kind: 'neural',
   async enroll(pcm, rate) { return { kind: 'neural', vector: [...(await embed(toFloat(pcm), rate))] }; },
   async score(print, pcm, rate) { const s = cos(print.vector, await embed(toFloat(pcm), rate)); return { score: s, decision: s >= match ? 'match' : s <= nonmatch ? 'nonmatch' : 'unknown' }; },
   async adapt(print, pcm, rate, alpha) { const v = await embed(toFloat(pcm), rate); return { ...print, vector: print.vector.map((x, i) => (1 - alpha) * x + alpha * v[i]) }; },
   drift(original, adapted) { return 1 - cos(original.vector, adapted.vector); },
   maxDrift: 0.1,
  };
 }
 // Spectral baseline. score = −(mean squared z-distance), pitch weighted like 4 bands. Uncalibrated thresholds.
 const MATCH = -4, NONMATCH = -12, PITCH_WEIGHT = 4;
 return {
  kind: 'spectral-baseline',
  async enroll(pcm, rate) {
   const x = toFloat(pcm), chunk = rate * 2, parts = [];
   for (let i = 0; i + chunk <= x.length; i += chunk) { const d = describe(x.subarray(i, i + chunk), rate); if (d) parts.push(d); }
   const all = describe(x, rate);
   if (!all || parts.length < 2) return null;
   const sd = all.bands.map((_, b) => Math.max(0.75, Math.sqrt(parts.reduce((a, p) => a + (p.bands[b] - all.bands[b]) ** 2, 0) / parts.length)));
   const pitches = parts.map(p => p.pitch).filter(v => v !== null);
   const pitchSd = Math.max(0.75, Math.sqrt(pitches.reduce((a, v) => a + (v - all.pitch) ** 2, 0) / Math.max(1, pitches.length)));
   return { kind: 'spectral-baseline', voicedMs: voicedSpectra(x, rate).voicedMs, bands: all.bands, sd, pitch: all.pitch, pitchSd };
  },
  async score(print, pcm, rate) {
   const d = describe(pcm, rate);
   if (!d || !print) return { score: null, decision: 'unknown' };
   let sum = 0; for (let b = 0; b < BANDS; b++) sum += ((d.bands[b] - print.bands[b]) / print.sd[b]) ** 2;
   let weight = BANDS;
   if (d.pitch !== null && print.pitch !== null) { sum += PITCH_WEIGHT * ((d.pitch - print.pitch) / print.pitchSd) ** 2; weight += PITCH_WEIGHT; }
   const score = -sum / weight;
   return { score, decision: score >= MATCH ? 'match' : score <= NONMATCH ? 'nonmatch' : 'unknown' };
  },
  // Per-user tuning (batch 5): move the print a small step toward a confirmed senior turn. The spread (sd) never
  // changes, so tuning re-centres the match test without making it looser.
  async adapt(print, pcm, rate, alpha) {
   const d = describe(pcm, rate);
   if (!d || !print) return print;
   return { ...print, bands: print.bands.map((v, b) => (1 - alpha) * v + alpha * d.bands[b]), pitch: d.pitch !== null && print.pitch !== null ? (1 - alpha) * print.pitch + alpha * d.pitch : print.pitch };
  },
  // How far a tuned print has moved from the enrollment, in the same z² units as the score.
  drift(original, adapted) {
   let sum = 0; for (let b = 0; b < BANDS; b++) sum += ((adapted.bands[b] - original.bands[b]) / original.sd[b]) ** 2;
   if (original.pitch !== null && adapted.pitch !== null) sum += PITCH_WEIGHT * ((adapted.pitch - original.pitch) / original.pitchSd) ** 2;
   return sum / (BANDS + PITCH_WEIGHT);
  },
  maxDrift: 2,
 };
}

// Enrollment quality gate: enough voiced speech, not clipped, not near-silent.
export function enrollmentQuality(pcm, rate) {
 const x = toFloat(pcm);
 let clipped = 0, peak = 0;
 for (const v of x) { const a = Math.abs(v); if (a > 0.99) clipped++; if (a > peak) peak = a; }
 // Natural reading has pauses and soft syllables: with the live-call gate (−15 dB) a 12 s reading counted only ~6–7 s
 // as voiced and real people were refused. Enrollment uses a gentler gate (−20 dB) and a 6 s minimum.
 const { voicedMs } = voicedSpectra(pcm, rate, 0.01);
 const problems = [];
 if (voicedMs < 5000) problems.push('too_short');
 if (peak < 0.02) problems.push('too_quiet');
 if (clipped / Math.max(1, x.length) > 0.01) problems.push('clipped');
 return { voicedMs, seconds: x.length / rate, peak, ok: problems.length === 0, problems };
}

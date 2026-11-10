// Live microphone check (docs/STT_AUDIO_RESEARCH.md). Transcription suffers most from a bad signal, not
// from a missing "clean-up" step: denoising before speech-to-text usually makes it worse. So Guardian watches for the
// two things a person can fix (the phone too loud and clipping, or the device too far away) and reports each once
// per call, in plain words. Thresholds are starting values, not calibrated on real devices.
const CLIP = 32000;                 // |sample| at or above this counts as clipped
const CLIP_SHARE = 0.005;           // 0.5% clipped samples in a window is audible distortion
const QUIET_PEAK = 0.03 * 32767;    // loudest sound in 10 s below 3% of full scale: too far away or muted

export function createMicCheck({ rate = 16000, windowSeconds = 3, quietSeconds = 10 } = {}) {
 let windowSamples = 0, windowClipped = 0, quietSamples = 0, quietPeak = 0;
 const told = new Set();
 const tell = kind => { if (told.has(kind)) return null; told.add(kind); return { kind }; };
 return {
  // Feed each Int16Array frame as it is captured. Returns { kind: 'too_loud' | 'too_quiet' } the first time, else null.
  push(frame) {
   let clipped = 0, peak = 0;
   for (const s of frame) { const a = Math.abs(s); if (a >= CLIP) clipped++; if (a > peak) peak = a; }
   windowSamples += frame.length; windowClipped += clipped;
   quietSamples += frame.length; quietPeak = Math.max(quietPeak, peak);
   let said = null;
   if (windowSamples >= rate * windowSeconds) {
    if (windowClipped / windowSamples >= CLIP_SHARE) said = tell('too_loud');
    windowSamples = 0; windowClipped = 0;
   }
   if (quietSamples >= rate * quietSeconds) {
    if (quietPeak < QUIET_PEAK) said = said || tell('too_quiet');
    quietSamples = 0; quietPeak = 0;
   }
   return said;
  },
 };
}

// What the browser actually applied (track.getSettings()). Guardian asks for all processing off, but browsers treat
// that as a request, not a guarantee.
export function processingLeftOn(settings = {}) {
 return [['echoCancellation', 'echo cancellation'], ['noiseSuppression', 'noise suppression'], ['autoGainControl', 'automatic volume']]
  .filter(([key]) => settings[key] === true).map(([, name]) => name);
}

export const MIC_ADVICE = {
 too_loud: 'The sound is too loud and is breaking up, so words may be misheard. Turn the phone’s speaker volume down a little, or move this device a little further from the phone.',
 too_quiet: 'Guardian can hardly hear anything. Move this device closer to the phone’s speaker, and check the call is on speaker.',
 processing: names => `Your browser is changing the microphone sound (${names.join(', ')}), which can blur words. Guardian still works, but a different browser may hear more clearly.`,
};

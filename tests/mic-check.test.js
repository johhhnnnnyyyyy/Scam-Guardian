import test from 'node:test';
import assert from 'node:assert/strict';
import { createMicCheck, processingLeftOn } from '../ui/src/lib/mic-check.js';

// Speech-to-text accuracy depends most on the signal itself (docs/STT_AUDIO_RESEARCH.md): no clipping, a
// usable level, and no browser processing. The microphone check watches the live frames and says what to change.
const RATE = 16000, FRAME = 512;
const frames = (seconds, fill) => Array.from({ length: Math.round((seconds * RATE) / FRAME) }, (_, n) => Int16Array.from({ length: FRAME }, (_, i) => fill(n * FRAME + i)));
const speech = amp => i => Math.round(amp * 32767 * Math.sin(i / 7) * (0.6 + 0.4 * Math.sin(i / 3000)));

test('a speakerphone that overloads the microphone is reported as too loud, once', () => {
 const check = createMicCheck({ rate: RATE });
 const said = frames(4, i => Math.max(-32768, Math.min(32767, speech(1.6)(i)))).map(f => check.push(f)).filter(Boolean);
 assert.deepEqual(said.map(w => w.kind), ['too_loud']);
});

test('ordinary speech at a good level raises nothing', () => {
 const check = createMicCheck({ rate: RATE });
 assert.deepEqual(frames(15, speech(0.35)).map(f => check.push(f)).filter(Boolean), []);
});

test('ten seconds with almost no sound is reported as too quiet', () => {
 const check = createMicCheck({ rate: RATE });
 const said = frames(12, speech(0.01)).map(f => check.push(f)).filter(Boolean);
 assert.deepEqual(said.map(w => w.kind), ['too_quiet']);
});

test('browser sound processing that stayed on despite the request is named', () => {
 assert.deepEqual(processingLeftOn({ echoCancellation: false, noiseSuppression: false, autoGainControl: false }), []);
 assert.deepEqual(processingLeftOn({ echoCancellation: true, noiseSuppression: true, autoGainControl: false }), ['echo cancellation', 'noise suppression']);
 assert.deepEqual(processingLeftOn({}), [], 'a browser that reports nothing is not accused');
});

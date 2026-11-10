import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

// Supervises one live listening session: the browser socket, the upstream Gnani Prisma realtime socket, reconnects,
// a bounded audio buffer, an audio clock, and honest health states. Gnani documents no resume, so short blips are
// healed from the buffer and longer outages are recorded as gaps rather than hidden.
//
// Vendor facts (docs.gnani.ai/api/STT/stt-websocket.md): 1024-byte PCM16 frames at real-time cadence; messages
// connected, speech_start, processing, transcript, error; a per-utterance error keeps the session open; the
// server closes at 15 minutes with code 1001; client may send {"type":"commit"}. Timings below are judgement
// values recorded as pending owner decisions.
export const FRAME_BYTES = 1024;
const SAMPLES_PER_FRAME = FRAME_BYTES / 2;

export const DEFAULT_LIVE_OPTIONS = {
 maxAttempts: 5,
 ringSeconds: 5,
 firstHandshakeMs: 12000,
 retryHandshakeMs: 5000,
 budgetResetMs: 10000,
 rotateAfterMs: 13 * 60e3,
 rotateHardMs: 14.5 * 60e3,
 commitWaitMs: 1500,
 micSilentMs: 2000,
 degradedClearMs: 30000,
 pauseMaxMs: 20000,
 minSilenceMs: 400,
 maxGaps: 50,
 tickMs: 1000,
 random: Math.random,
};

export const HEALTH_TEXT = {
 connecting: 'Connecting to the speech service.',
 listening: 'Listening.',
 reconnecting: 'Reconnecting to the speech service. Not checking speech right now.',
 stt_degraded: 'The speech service is struggling. Warnings may be delayed.',
 paused: 'Paused while the warning plays. The caller is not being checked.',
 stt_down: 'Speech service unavailable. Not listening.',
 stopped: 'Listening stopped.',
};

export function createLiveBridge({ client, connect, session, rate, onTranscript, onHealth = () => {}, touch = () => {}, onClosed = () => {}, now = () => Date.now(), options = {} }) {
 const o = { ...DEFAULT_LIVE_OPTIONS, ...options };
 const frameMs = (SAMPLES_PER_FRAME / rate) * 1000;
 const ringMax = Math.ceil((o.ringSeconds * 1000) / frameMs);
 const backlogBytes = rate * 2 * 2; // two seconds of audio waiting in the upstream socket
 const wallBase = now();
 const timers = new Set();
 const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
 const cancel = t => { if (t) { clearTimeout(t); clearInterval(t); timers.delete(t); } };

 let upstream = null, conn = 0, ready = false, everReady = false, ended = false;
 let attempts = 0, concurrencyRetried = false, readySince = 0;
 let queue = [], clockSamples = 0, lastSentPos = null, replayTimer = null;
 let processing = [], openSpeech = 0, errorsAt = [], lastClientFrameAt = now();
 let paused = false, pauseTimer = null, pauseStarted = 0, pauseSilenceSamples = 0;
 let rotating = false, committing = false, plannedRotation = false, rotateTimer = null, rotateDeadline = null, commitTimer = null, handshakeTimer = null;
 let endingNotified = false, degradedAt = 0;
 const gaps = [];
 // Decision 24: the last 30 s of audio, so each transcript's own audio can be attributed to caller or senior.
 // Kept in memory only, never logged or written.
 const pcmRing = [], pcmRingMax = Math.ceil(30000 / frameMs);
 const audioBetween = (startMs, endMs) => {
  const from = Math.floor((startMs / 1000) * rate), to = Math.ceil((Math.min(endMs, startMs + 10000) / 1000) * rate);
  const parts = pcmRing.filter(f => f.pos + SAMPLES_PER_FRAME > from && f.pos < to);
  if (!parts.length) return null;
  const all = new Int16Array(parts.length * SAMPLES_PER_FRAME);
  parts.forEach((f, i) => all.set(new Int16Array(f.buf.buffer.slice(f.buf.byteOffset, f.buf.byteOffset + SAMPLES_PER_FRAME * 2)), i * SAMPLES_PER_FRAME));
  const off = Math.max(0, from - parts[0].pos);
  return all.subarray(off, off + (to - from));
 };
 const health = { state: 'connecting', reason: null, attempt: 0 };
 session.gaps = gaps;
 session.clock = 'audio';
 session.health = { ...(session.health || {}), stt: 'connecting', sttReason: null };

 const send = v => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(v)); };
 const upstreamOpen = () => upstream && upstream.readyState === WebSocket.OPEN;
 const msOf = samples => (samples / rate) * 1000;

 function setHealth(state, reason = null, attempt = 0) {
  if (health.state === state && health.reason === reason && health.attempt === attempt) return;
  Object.assign(health, { state, reason, attempt });
  if (state === 'stt_degraded') degradedAt = now();
  session.health.stt = state;
  session.health.sttReason = reason;
  send({ type: 'health', health: { ...health, text: HEALTH_TEXT[state], gaps: gaps.length } });
  onHealth(session);
 }

 function addGap(pos) {
  const startMs = Math.round(msOf(pos)), endMs = Math.round(msOf(pos + SAMPLES_PER_FRAME));
  const last = gaps.at(-1);
  if (last && Math.abs(last.endMs - startMs) <= 1) last.endMs = endMs;
  else if (gaps.length < o.maxGaps) gaps.push({ startMs, endMs });
  else gaps.at(-1).endMs = endMs;
 }

 function sendUp(frame) {
  upstream.send(frame.buf);
  lastSentPos = frame.pos;
 }

 function pump() {
  if (replayTimer || !queue.length) return;
  // Catch up at up to twice real time: Gnani warns that bursting degrades voice-activity detection.
  replayTimer = setInterval(() => {
   if (ended || !ready || !upstreamOpen()) { cancel(replayTimer); replayTimer = null; return; }
   for (let i = 0; i < 2 && queue.length && upstream.bufferedAmount <= backlogBytes; i++) sendUp(queue.shift());
   if (!queue.length) { cancel(replayTimer); replayTimer = null; if (health.state === 'stt_degraded' && health.reason === 'catching_up') setHealth('listening'); }
  }, frameMs);
  timers.add(replayTimer);
  if (queue.length > ringMax / 2 && health.state === 'listening') setHealth('stt_degraded', 'catching_up');
 }

 function accept(buf) {
  const frame = { buf, pos: clockSamples };
  pcmRing.push(frame); if (pcmRing.length > pcmRingMax) pcmRing.shift();
  clockSamples += SAMPLES_PER_FRAME;
  if (ready && !queue.length && upstreamOpen() && upstream.bufferedAmount <= backlogBytes) { sendUp(frame); return; }
  queue.push(frame);
  if (queue.length > ringMax) addGap(queue.shift().pos); // oldest held audio is lost and disclosed as a gap
  if (ready) pump();
 }

 function open() {
  if (ended) return;
  const myConn = ++conn;
  ready = false; processing = []; openSpeech = 0; committing = false; rotating = false;
  let ws;
  try { ws = connect(session.language, rate, { requestId: `${session.id}-c${myConn}` }); } catch (e) { fatal(e.message || 'Speech service is not configured.'); return; }
  upstream = ws;
  const handshake = handshakeTimer = later(() => { if (upstream === ws && !ready) { ws.terminate?.(); dropped(ws, 'timeout'); } }, everReady ? o.retryHandshakeMs : o.firstHandshakeMs);
  ws.on('unexpected-response', (_req, res) => {
   if (upstream !== ws) return;
   cancel(handshake);
   if ([401, 402, 403].includes(res?.statusCode)) { fatal('The speech service rejected the server credentials. Listening has stopped; the transcript so far is kept.'); return; }
   dropped(ws, `http_${res?.statusCode}`);
  });
  ws.on('error', () => { if (upstream === ws) { cancel(handshake); dropped(ws, 'error'); } });
  ws.on('close', code => {
   if (upstream !== ws) return;
   cancel(handshake);
   if (plannedRotation) { plannedRotation = false; upstream = null; open(); return; }
   dropped(ws, code === 1008 ? 'concurrency' : code === 1001 ? 'provider_session_limit' : 'closed');
  });
  ws.on('message', raw => {
   if (upstream !== ws || ended) return;
   let d;
   try { d = JSON.parse(raw.toString()); } catch { return; }
   handle(d, myConn);
  });
 }

 function dropped(ws, reason) {
  if (ended || upstream !== ws) return;
  upstream = null; ready = false; plannedRotation = false; rotating = false; committing = false;
  cancel(rotateTimer); cancel(rotateDeadline); cancel(commitTimer); cancel(replayTimer); replayTimer = null;
  ws.terminate?.();
  attempts++;
  if (attempts > o.maxAttempts || (reason === 'concurrency' && concurrencyRetried)) { fatal('The speech service is unavailable. Listening has stopped; the transcript so far is kept.'); return; }
  let delay = o.random() * Math.min(4000, 500 * 2 ** (attempts - 1)); // full jitter
  if (reason === 'concurrency') { concurrencyRetried = true; delay = 30000; }
  if (reason === 'provider_session_limit') delay = 0;
  setHealth('reconnecting', reason, attempts);
  later(open, delay);
 }

 function handle(d, myConn) {
  if (d.type === 'connected') {
   ready = true; readySince = now(); cancel(handshakeTimer);
   if (!everReady) { everReady = true; send({ type: 'ready' }); }
   setHealth(paused ? 'paused' : 'listening');
   cancel(rotateTimer);
   rotateTimer = later(beginRotation, o.rotateAfterMs);
   pump();
   return;
  }
  if (d.type === 'speech_start') { openSpeech++; return; }
  if (d.type === 'processing') {
   // End of speech ≈ last audio sent minus the configured silence that triggered the end (x-min-silence-ms).
   if (processing.length >= 20) processing.shift();
   processing.push(lastSentPos === null ? clockSamples : Math.max(0, lastSentPos + SAMPLES_PER_FRAME - (o.minSilenceMs / 1000) * rate));
   return;
  }
  if (d.type === 'error') {
   // One failed utterance keeps the Gnani session open; repeated failures mean degraded, not over.
   const t = now();
   errorsAt = errorsAt.filter(x => t - x < 60000).concat(t);
   openSpeech = Math.max(0, openSpeech - 1); processing.shift(); // the failed utterance will not produce a transcript
   if (errorsAt.length >= 2) setHealth('stt_degraded', 'utterance_errors');
   if (rotating && openSpeech === 0) commitNow();
   return;
  }
  if (d.type === 'transcript') {
   openSpeech = Math.max(0, openSpeech - 1);
   if (Number(d.latency) > 3000) setHealth('stt_degraded', 'slow_transcripts');
   const text = typeof d.text === 'string' ? d.text.trim() : '';
   const endSamples = processing.shift();
   if (text) {
    const part = d.segment_index ?? (d.segment_id || randomUUID()); // an empty segment_id must not collide
    const key = `${myConn}:${part}`;
    let timing = { clock: 'audio', estimated: true };
    let at;
    if (endSamples === undefined) { at = now(); timing = { clock: 'unknown', estimated: true }; } // no speech-end event to pair with
    else {
     const audioEndMs = Math.round(msOf(endSamples)), audioStartMs = Math.max(0, audioEndMs - (Number(d.audio_duration_ms) || 0));
     at = wallBase + audioEndMs;
     timing = { clock: 'audio', estimated: true, audioStartMs, audioEndMs };
    }
    onTranscript(text, key, at, timing, timing.audioEndMs !== undefined ? audioBetween(timing.audioStartMs, timing.audioEndMs) : null);
   }
   if (rotating && openSpeech === 0) commitNow();
  }
 }

 // Rotate before Gnani's 15-minute cap, at a quiet point, without overlapping connections.
 function beginRotation() {
  if (ended || !ready) return;
  rotating = true;
  rotateDeadline = later(commitNow, Math.max(0, o.rotateHardMs - o.rotateAfterMs));
  if (openSpeech === 0) commitNow();
 }
 function commitNow() {
  if (committing || ended || !upstreamOpen()) return;
  committing = true;
  cancel(rotateDeadline);
  try { upstream.send(JSON.stringify({ type: 'commit' })); } catch {}
  const ws = upstream;
  commitTimer = later(() => {
   if (ended || upstream !== ws) return; // a drop and reconnect in the meantime owns the new socket
   plannedRotation = true; ready = false;
   setHealth('stt_degraded', 'rotating'); // audio is held, not checked, until the next connection is ready
   if (ws.close) ws.close(1000); else { ws.terminate?.(); plannedRotation = false; upstream = null; open(); }
  }, o.commitWaitMs);
 }

 function pause() {
  if (paused) return;
  paused = true; pauseStarted = now(); pauseSilenceSamples = 0;
  setHealth('paused', 'warning_playing');
  // Keep the audio clock and upstream timeline moving with silence while the browser microphone is paused.
  pauseTimer = setInterval(() => {
   if (ended) return;
   if (now() - pauseStarted > o.pauseMaxMs) { cancel(pauseTimer); pauseTimer = null; return; }
   accept(Buffer.alloc(FRAME_BYTES)); pauseSilenceSamples += SAMPLES_PER_FRAME;
  }, frameMs);
  timers.add(pauseTimer);
 }
 function resume() {
  if (!paused) return;
  paused = false; cancel(pauseTimer); pauseTimer = null;
  // A pause longer than the silence we sent still happened in real time: advance the clock and disclose it as a gap.
  const missing = Math.round(((now() - pauseStarted) / 1000) * rate) - pauseSilenceSamples;
  if (missing > SAMPLES_PER_FRAME) { for (let p = clockSamples; p < clockSamples + missing; p += SAMPLES_PER_FRAME) addGap(p); clockSamples += missing; }
  lastClientFrameAt = now();
  setHealth(ready ? 'listening' : upstream ? 'connecting' : 'reconnecting', null, ready ? 0 : attempts);
 }

 const tick = setInterval(() => {
  if (ended) return;
  const t = now();
  if (ready && attempts && t - readySince >= o.budgetResetMs && t - lastClientFrameAt < o.micSilentMs) { attempts = 0; concurrencyRetried = false; }
  if (ready && upstream && upstream.bufferedAmount > rate * 2 * 3) setHealth('stt_degraded', 'backpressure');
  else if (health.state === 'stt_degraded' && health.reason === 'backpressure') setHealth('listening');
  if (ready && !paused && t - lastClientFrameAt > o.micSilentMs) setHealth('stt_degraded', 'mic_silent');
  else if (health.state === 'stt_degraded' && health.reason === 'mic_silent' && t - lastClientFrameAt <= o.micSilentMs) setHealth('listening');
  if (health.state === 'stt_degraded' && health.reason === 'utterance_errors' && t - degradedAt > o.degradedClearMs) setHealth('listening');
  if (session.expiresAt - t <= 60000 && !endingNotified) { endingNotified = true; send({ type: 'session_ending', at: session.expiresAt }); }
  if (session.expiresAt <= t) fatal('Session expired. Start a new session.', 'stopped');
 }, o.tickMs);
 timers.add(tick);

 function fatal(message, state = 'stt_down') {
  if (ended) return;
  if (state === 'stt_down') setHealth('stt_down', 'unrecoverable');
  send({ type: 'error', message });
  cleanup();
  client.close();
 }
 function invalid(message = 'Invalid audio stream. Restart the microphone.') { send({ type: 'error', message }); cleanup(); client.close(); }

 let lastTouch = 0;
 client.on('message', (data, binary) => {
  if (ended) return;
  if (!binary) {
   let m;
   try { m = JSON.parse(data.toString()); } catch { invalid(); return; }
   if (m?.type === 'pause') pause();
   else if (m?.type === 'resume') resume();
   else if (m?.type === 'stop') { if (upstreamOpen()) try { upstream.send(JSON.stringify({ type: 'commit' })); } catch {} later(() => { cleanup(); client.close(); }, o.commitWaitMs); }
   else invalid();
   return;
  }
  if (data.length !== FRAME_BYTES) { invalid(); return; }
  if (paused) resume();
  const t = now();
  lastClientFrameAt = t;
  if (t - lastTouch >= 1000) { lastTouch = t; touch(); }
  accept(Buffer.from(data));
 });
 client.on('close', () => cleanup());
 client.on('error', () => cleanup());

 function cleanup() {
  if (ended) return;
  ended = true;
  for (const t of timers) { clearTimeout(t); clearInterval(t); }
  timers.clear();
  const ws = upstream; upstream = null;
  ws?.terminate?.();
  session.status = 'stopped';
  if (session.health.stt !== 'stt_down') session.health.stt = 'stopped';
  onClosed();
 }

 open();
 return { close: cleanup, state: () => ({ ...health, conn, queued: queue.length, clockMs: msOf(clockSamples), gaps: [...gaps] }) };
}

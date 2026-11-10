// Decision 24: compulsory one-time voice enrollment. Records 30 seconds of the senior reading aloud, with
// browser audio processing turned off so the voice print and the live-channel level are measured on raw audio.
// Only derived features are kept on the server; the recording is discarded after enrollment.
export async function recordEnrollment(deviceToken, { seconds = 30, onProgress = () => {} } = {}) {
 if (!navigator.mediaDevices?.getUserMedia) throw Error('Microphone access requires localhost or HTTPS.');
 const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
 const context = new AudioContext({ sampleRate: 16000 });
 try {
  await context.resume();
  await context.audioWorklet.addModule('/pcm-worklet.js');
  const node = new AudioWorkletNode(context, 'pcm-capture'), source = context.createMediaStreamSource(stream);
  const chunks = [], target = context.sampleRate * seconds;
  let total = 0;
  await new Promise(resolve => {
   node.port.onmessage = event => { const frame = new Int16Array(event.data); chunks.push(frame); total += frame.length; onProgress(Math.min(1, total / target)); if (total >= target) resolve(); };
   source.connect(node); node.connect(context.destination);
  });
  source.disconnect(); node.disconnect();
  const pcm = new Int16Array(total); let offset = 0; for (const c of chunks) { pcm.set(c, offset); offset += c.length; }
  const r = await fetch(`/api/profile/enroll?rate=${context.sampleRate}&consent=1&adult=1`, { method: 'POST', headers: { Authorization: `Bearer ${deviceToken}`, 'Content-Type': 'application/octet-stream' }, body: pcm.buffer });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || 'Voice recording failed. Please try again.');
  return d;
 } finally { stream.getTracks().forEach(t => t.stop()); context.close().catch(() => {}); }
}

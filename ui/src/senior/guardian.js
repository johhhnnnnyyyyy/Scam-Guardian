import { demos, copy } from '../lib/demos.js';
import { startCapture } from '../lib/capture.js';
import { MIC_ADVICE } from '../lib/mic-check.js';
import { warningQueue } from '../lib/warning-queue.js';
import { playWarningStream } from '../lib/stream-audio.js';
import { recordEnrollment } from '../lib/enroll.js';
import { panelFor, engineStatus } from '../lib/view.js';
import { consentCopy } from '../lib/copy.js';

// Controller for the senior's screen. It is plain JavaScript (no React) so the listening, warning and family logic
// stays in one place; React only renders `state` and calls the actions below. Behaviour is a port of the earlier
// app.js: same endpoints, same ordering, same safety copy.
const profileKey = 'scam-guardian-profile', languageKey = 'scam-guardian-language';
const READY = { risk: 'idle', title: 'Ready when you are.', message: 'Press “Start listening”, then put this device next to your phone and call on speaker.', lang: 'en-IN' };

const store = {
 get(key) { try { return localStorage.getItem(key); } catch { return null; } },
 set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode: the device simply re-registers */ } },
 remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

export function createGuardian() {
 const savedLanguage = store.get(languageKey);
 let state = {
  language: copy[savedLanguage] ? savedLanguage : 'en-IN', consent: false,
  session: null, panel: READY, connection: 'Not listening', notice: '', voiceStatus: '', engineStatus: '',
  busy: false, listening: false, gnani: false, providerStatus: 'Checking speech service…',
  urgent: null, timeline: [], guardians: [], trustedVoice: false,
  enroll: { open: false, consent: false, busy: false, progress: 0, status: '', saved: null },
  family: { consent: false, link: '', sharing: false, status: 'Not shared. Your family member signs in with their own family account.' },
  setup: { active: false, code: '', status: '' },
  drill: { playing: false, result: 'No practice call is playing.' },
 };
 const listeners = new Set();
 const set = patch => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; listeners.forEach(l => l()); };
 const subscribe = l => { listeners.add(l); return () => listeners.delete(l); };

 let session = null, capture = null, timer = null, epoch = 0, working = false, audio = null, audioUrl = null;
 let streamController = null, streamContext = null, lastSpoken = 'safe', lastAlertRisk = 'safe', drillStarted = 0, drillAudio = null;
 let setupToken = null;

 const notice = message => set({ notice: message });
 async function api(path, method = 'GET', body) {
  const r = await fetch(path, { method, headers: body instanceof Blob ? { 'Content-Type': body.type || 'application/octet-stream' } : { 'Content-Type': 'application/json' }, body: body instanceof Blob ? body : body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) {
   const d = await r.json().catch(() => ({}));
   if (d.deviceToken) store.set(profileKey, d.deviceToken);
   throw Object.assign(Error(d.error || 'Request failed. Please retry.'), { reason: d.reason });
  }
  return r;
 }
 const authed = () => { const token = store.get(profileKey); return token ? { Authorization: `Bearer ${token}` } : null; };
 // Make sure this device is known to the server (its memory is cleared on restart unless DATA_DIR is set). A
 // practice session creates the device if needed and is removed straight away; it never uses the microphone.
 async function ensureDevice() {
  const made = await (await api('/api/sessions', 'POST', { language: state.language, mode: 'demo', consent: true, deviceToken: store.get(profileKey) })).json();
  if (made.deviceToken) store.set(profileKey, made.deviceToken);
  if (made.id) api(`/api/sessions/${made.id}`, 'DELETE').catch(() => {});
  if (!store.get(profileKey)) throw Error('This device could not be set up. Reload the page and try again.');
 }
 const controls = () => set({ busy: !!capture || working || !!timer, listening: !!capture });
 const closeUrgent = () => set({ urgent: null });

 function stopAudio() {
  streamController?.abort(); streamController = null;
  streamContext?.close().catch(() => {}); streamContext = null;
  if (audio) { audio.pause(); audio = null; }
  if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
  capture?.pause(false);
 }

 function reset() {
  set({ panel: { ...READY, lang: state.language }, session: null, voiceStatus: '', connection: 'Not listening', engineStatus: '' });
  controls();
 }

 async function clearSession() {
  epoch++; warnings.cancel(); clearTimeout(timer); timer = null;
  capture?.stop(); capture = null; stopAudio();
  drillAudio?.pause(); drillAudio = null;
  const old = session; session = null; working = false; lastSpoken = 'safe'; lastAlertRisk = 'safe';
  if (old) await api(`/api/sessions/${old.id}`, 'DELETE').catch(() => {});
  set(s => ({ family: s.family.sharing ? s.family : { ...s.family, link: '', consent: false, status: 'Not shared. Your family member signs in with their own family account.' }, urgent: null, drill: { ...s.drill, playing: false } }));
  reset();
 }

 async function begin(mode) {
  if (!state.consent) throw Error('Please tick the box to agree before starting.');
  await clearSession();
  const ticket = epoch;
  working = true; controls();
  const { id, deviceToken } = await (await api('/api/sessions', 'POST', { language: state.language, mode, consent: true, deviceToken: store.get(profileKey) })).json();
  if (ticket !== epoch) { await api(`/api/sessions/${id}`, 'DELETE'); throw Error('Session cancelled.'); }
  if (deviceToken) store.set(profileKey, deviceToken);
  session = { id, mode, language: state.language, segments: [], flags: [], risk: 'safe' };
  if (state.trustedVoice) await api(`/api/sessions/${id}/trusted-voice`, 'POST', { consent: true });
  refreshTimeline();
  return ticket;
 }

 function render(s) {
  session = s;
  const c = copy[s.language];
  const urgent = s.risk === 'danger' && lastAlertRisk !== 'danger';
  set({ session: s, panel: panelFor(s), engineStatus: engineStatus(s) });
  if (urgent) {
   set({ urgent: { title: c.danger, text: c.dangerText, lang: s.language } });
   if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
  }
  lastAlertRisk = s.risk;
  refreshTimeline(); controls();
  if (s.risk !== 'safe' && lastSpoken !== s.risk) {
   if (state.gnani && s.mode !== 'demo') playWarning().catch(e => set({ voiceStatus: e.message }));
   else set({ voiceStatus: state.gnani ? 'Press “Play spoken warning” to hear it.' : 'Text warning active. Spoken audio needs a server API key.' });
  }
 }

 const warnings = warningQueue({
  prepare: async item => {
   if (item.epoch !== epoch) return null;
   set({ voiceStatus: 'Preparing spoken warning…' });
   if (!session?.trustedVoice && (window.AudioContext || window.webkitAudioContext)) {
    try { return { stream: await api(`/api/sessions/${item.id}/warning-stream`, 'POST', {}) }; } catch { set({ voiceStatus: 'Streaming unavailable. Trying a fixed warning…' }); }
   }
   return { blob: await (await api(`/api/sessions/${item.id}/warning`, 'POST', {})).blob() };
  },
  play: async (result, item) => {
   if (!result || item.epoch !== epoch || session?.risk !== item.risk) return;
   stopAudio(); capture?.pause(true);
   set({ voiceStatus: capture ? 'Playing warning · microphone paused to avoid echo.' : 'Playing spoken warning.' });
   if (result.stream) {
    streamController = new AbortController();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    streamContext = new AudioContextClass();
    try {
     await streamContext.resume();
     await playWarningStream(result.stream, streamContext, () => { lastSpoken = item.risk; }, streamController.signal);
     if (item.epoch === epoch) set({ voiceStatus: 'Warning finished.' });
    } catch (e) { lastSpoken = 'safe'; set({ voiceStatus: e.message }); throw e; } finally { stopAudio(); }
    return;
   }
   audioUrl = URL.createObjectURL(result.blob);
   audio = new Audio(audioUrl);
   audio.onended = () => { stopAudio(); set({ voiceStatus: 'Warning finished.' }); };
   audio.onerror = () => { stopAudio(); lastSpoken = 'safe'; set({ voiceStatus: 'Audio failed. Read the warning and tap to retry.' }); };
   try { await audio.play(); lastSpoken = item.risk; } catch { stopAudio(); throw Error('Tap “Play spoken warning” to allow audio playback.'); }
  },
  onError: e => set({ voiceStatus: e.message }),
 });

 async function playWarning() {
  if (!session || session.risk === 'safe') return undefined;
  stopAudio();
  return warnings.enqueue({ id: session.id, risk: session.risk, epoch });
 }

 async function run(action) {
  notice('');
  try { await action(); } catch (e) {
   notice(e.message);
   if (!session?.segments?.length) set(s => ({ panel: { risk: 'error', title: 'That did not work.', message: 'Read the message below, then try again.', lang: s.language } }));
   if (!capture && !timer) set({ connection: 'Not listening' });
  } finally { working = false; controls(); }
 }

 async function refreshTimeline() {
  const h = authed(); if (!h) return;
  try { const r = await fetch('/api/timeline', { headers: h }); if (r.ok) { const d = await r.json(); set(st => ({ timeline: d.timeline, enroll: { ...st.enroll, saved: d.enrolled ? { at: d.enrolledAt } : false }, family: d.familySharing && !st.family.sharing ? { ...st.family, sharing: true, status: 'Sharing is on for every call.' } : !d.familySharing && st.family.sharing ? { ...st.family, sharing: false, link: '' } : st.family })); } } catch { /* the timeline is a convenience */ }
 }
 async function refreshGuardians() {
  const h = authed(); if (!h) return;
  try { const r = await fetch('/api/profile/guardians', { headers: h }); if (r.ok) set({ guardians: (await r.json()).guardians }); } catch { /* ignore */ }
 }

 function stop() {
  epoch++; warnings.cancel(); clearTimeout(timer); timer = null;
  capture?.stop(); capture = null; stopAudio(); working = false;
  set(s => ({ connection: 'Stopped · no longer listening', panel: session?.segments?.length ? s.panel : { risk: 'idle', title: 'Listening stopped.', message: 'No speech was analyzed.', lang: s.language } }));
  controls();
 }

 function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
 }

 const actions = {
  setLanguage(language) { store.set(languageKey, language); set({ language, panel: state.session ? state.panel : { ...READY, lang: language } }); },
  setConsent(consent) { set({ consent }); },
  closeUrgent,
  clearNotice() { notice(''); },
  clear: () => run(async () => { await clearSession(); notice('Cleared. Anything you already downloaded is not affected.'); }),
  stop,
  hangup() { stop(); closeUrgent(); notice('Use the red end-call button on the phone that has the call. Guardian has stopped listening, but it cannot end the call for you.'); },
  playWarning: () => run(playWarning),

  listen: () => run(async () => {
   let ticket;
   try { ticket = await begin('live'); } catch (e) {
    // Not an error: a first-time step. Keep the status card calm and point to the recording card.
    if (e.reason === 'enrollment_required') { working = false; controls(); set(s => ({ enroll: { ...s.enroll, open: true }, panel: { risk: 'idle', title: 'One more step', message: 'Record your voice once below, so Guardian can tell your voice from the caller’s.', lang: s.language } })); return; }
    throw e;
   }
   set({ connection: 'Connecting…', panel: { risk: 'idle', title: 'Connecting to the speech service…', message: 'Allow the microphone when your browser asks.', lang: state.language } });
   const c = await startCapture(session.id, d => {
    if (ticket !== epoch) return;
    if (d.type === 'snapshot') render(d.session);
    else if (d.type === 'health') { set({ connection: d.health.text }); if (session) { session.health = { ...(session.health || {}), stt: d.health.state }; render(session); } }
    else if (d.type === 'session_ending') notice('This listening session ends in about a minute. Start again to keep listening.');
    else if (d.type === 'mic') notice(d.kind === 'processing' ? MIC_ADVICE.processing(d.names) : MIC_ADVICE[d.kind]);
   }, message => {
    if (ticket !== epoch) return;
    capture = null; notice(message);
    set(s => ({ connection: 'Disconnected · not listening', panel: { risk: 'error', title: 'Listening was interrupted.', message: 'The last transcript may be incomplete. Press “Start listening” to resume.', lang: s.language } }));
    controls();
   });
   if (ticket !== epoch) { c.stop(); return; }
   capture = c;
   set(s => ({ connection: 'Listening · this device’s microphone', panel: { risk: 'safe', title: 'Listening for the call…', message: 'Keep this page open, close to the phone’s speaker.', lang: s.language } }));
   controls();
  }),

  demo: scenario => run(async () => {
   const ticket = await begin('demo');
   set({ connection: 'Practice conversation · no microphone' });
   let index = 0;
   const lines = demos[session.language][scenario];
   const step = async () => {
    if (ticket !== epoch) return;
    try {
     const s = await (await api(`/api/sessions/${session.id}/segments`, 'POST', { text: lines[index++] })).json();
     if (ticket !== epoch) return;
     render(s);
     if (index < lines.length) timer = setTimeout(step, 1700);
     else { timer = null; working = false; set({ connection: 'Practice conversation finished' }); controls(); }
    } catch (e) { notice(e.message); working = false; timer = null; controls(); }
   };
   await step();
  }),

  analyzeText: text => run(async () => {
   text = text.trim();
   if (!text) throw Error('Type or paste some conversation text first.');
   const ticket = await begin('text');
   const s = await (await api(`/api/sessions/${session.id}/segments`, 'POST', { text })).json();
   if (ticket !== epoch) return;
   render(s); set({ connection: 'Text analyzed' });
  }),

  upload: file => run(async () => {
   if (!file) throw Error('Choose a voice note first.');
   if (file.size > 12000000) throw Error('Choose a file smaller than 12 MB and up to 60 seconds.');
   const ticket = await begin('upload');
   set(s => ({ connection: 'Transcribing the clip…', panel: { risk: 'idle', title: 'Checking your clip…', message: 'This takes a few seconds.', lang: s.language } }));
   const s = await (await api(`/api/sessions/${session.id}/upload`, 'POST', file)).json();
   if (ticket !== epoch) return;
   render(s); set({ connection: 'Audio checked · microphone off' });
  }),

  setTrustedVoice: checked => { set({ trustedVoice: checked }); return run(async () => {
   if (session) {
    const d = await (await api(`/api/sessions/${session.id}/trusted-voice`, 'POST', { consent: checked })).json();
    set({ voiceStatus: d.enabled ? (d.available ? 'Your family member’s voice is selected.' : 'No family voice recorded yet; the standard voice will play.') : 'The standard voice is selected.' });
   }
  }); },

  // ---- family sharing ----
  setFamilyConsent: consent => set(s => ({ family: { ...s.family, consent } })),
  pair: () => run(async () => {
   if (!state.family.consent) throw Error('Tick the box to allow sharing first.');
   await ensureDevice();
   const r = await fetch('/api/profile/family', { method: 'POST', headers: { ...authed(), 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: true }) });
   const d = await r.json().catch(() => ({}));
   if (!r.ok) throw Error(d.error || 'The family link could not be made. Try again.');
   set(s => ({ family: { ...s.family, sharing: true, link: `${location.origin}/family#${d.token}`, status: 'Sharing is on for every call. Send this link only to the person you trust; it works for 24 hours. They make their own family account, and the link alone lets no one in.' } }));
   refreshGuardians();
  }),
  revoke: () => run(async () => {
   const h = authed();
   if (h) { const r = await fetch('/api/profile/family', { method: 'DELETE', headers: h }); if (!r.ok) throw Error('Sharing could not be switched off. Try again.'); }
   set(s => ({ family: { ...s.family, sharing: false, link: '', consent: false, status: 'Sharing is off. Linked family accounts stay listed, but they no longer see your calls.' } }));
  }),
  refreshGuardians,
  removeGuardian: username => run(async () => {
   const h = authed(); if (!h) return;
   const d = await fetch(`/api/profile/guardians/${encodeURIComponent(username)}`, { method: 'DELETE', headers: h });
   if (!d.ok) throw Error('Could not remove this family account.');
   await refreshGuardians();
  }),
  labelOutcome: async (eventId, label) => {
   const h = authed();
   const r = await fetch('/api/timeline/label', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(h || {}) }, body: JSON.stringify({ eventId, label }) });
   if (!r.ok) throw Error('Could not save');
   refreshTimeline();
  },

  // ---- voice enrollment ----
  setEnrollConsent: consent => set(s => ({ enroll: { ...s.enroll, consent } })),
  openEnroll: () => set(s => ({ enroll: { ...s.enroll, open: true } })),
  enrollVoice: () => run(async () => {
   if (!state.enroll.consent) throw Error('Please tick the box to agree first.');
   set(s => ({ enroll: { ...s.enroll, busy: true, progress: 0, status: 'Getting ready…' } }));
   try {
    // Make sure this device is known to the server (its memory is cleared on restart unless DATA_DIR is set).
    // A practice session creates the device if needed, and is removed straight away. It never uses the microphone.
    await ensureDevice();
    const token = store.get(profileKey);
    set(s => ({ enroll: { ...s.enroll, status: 'Recording… please read the text aloud.' } }));
    const d = await recordEnrollment(token, { onProgress: v => set(s => ({ enroll: { ...s.enroll, progress: v } })) });
    set(s => ({ enroll: { ...s.enroll, open: false, saved: { at: Date.now() }, status: `Done. ${d.voicedSeconds} seconds of your voice measured. You can now start listening.` } }));
    set(s => ({ panel: { ...READY, lang: s.language } }));
    notice('Your voice is recorded. Press “Start listening”.');
   } catch (e) {
    const friendly = e.name === 'NotAllowedError' || e.name === 'SecurityError' ? Object.assign(Error('The microphone is blocked. Allow the microphone for this page in the browser settings, then try again.'), { cause: e })
     : e.name === 'NotFoundError' ? Object.assign(Error('No microphone was found on this device.'), { cause: e })
     : e.name === 'NotReadableError' ? Object.assign(Error('The microphone is being used by another app. Close it and try again.'), { cause: e }) : e;
    set(s => ({ enroll: { ...s.enroll, status: friendly.message } })); throw friendly;
   } finally { set(s => ({ enroll: { ...s.enroll, busy: false } })); }
  }),

  // ---- your data ----
  exportData: () => run(async () => {
   const h = authed(); if (!h) throw Error('Nothing is stored for this device yet.');
   const r = await fetch('/api/profile/export', { headers: h });
   if (!r.ok) throw Error('Download failed. Please retry.');
   download(await r.blob(), 'scam-guardian-my-data.json');
  }),
  eraseData: confirmText => run(async () => {
   const h = authed(); if (!h) throw Error('Nothing is stored for this device yet.');
   if (confirmText.trim().toUpperCase() !== 'DELETE') throw Error('Type DELETE in the box to confirm.');
   const r = await fetch('/api/profile', { method: 'DELETE', headers: h });
   if (!r.ok) throw Error('Could not delete. Please retry.');
   store.remove(profileKey);
   set({ timeline: [], guardians: [], enroll: { open: false, consent: false, busy: false, progress: 0, status: '', saved: false } });
   notice('Everything stored for this device was deleted, including your voice measurement. Family accounts were unlinked.');
  }),
  exportEvidence: () => run(async () => download(await (await api(`/api/sessions/${session.id}/evidence`)).blob(), 'scam-guardian-evidence.json')),
  reportDraft: () => run(async () => {
   const d = await (await api(`/api/sessions/${session.id}/evidence`)).json();
   const draft = `USER-REVIEW DRAFT — NOT SUBMITTED\nScam Guardian research prototype\nProvenance: ${d.provenance}\nSession: ${d.createdAt}\nLanguage: ${d.language}\n\nObserved tactics (unverified):\n${d.flags.map(f => `${f.label}: ${f.quote}`).join('\n')}\n\nAdd and verify the incident date, contact details, any transaction details, and what happened. Do not invent missing information.\nFor cyber fraud assistance call 1930 or visit https://cybercrime.gov.in/\nThis draft is not an official complaint or verified evidence.\n`;
   download(new Blob([draft], { type: 'text/plain' }), 'reporting-draft.txt');
  }),

  // ---- practice call ----
  drillStart: () => run(async () => {
   if (!state.gnani) throw Error('The speech service is needed for the practice call.');
   const ticket = await begin('demo');
   const blob = await (await api(`/api/sessions/${session.id}/drill`, 'POST', {})).blob();
   if (ticket !== epoch) return;
   drillAudio = new Audio(URL.createObjectURL(blob)); drillStarted = Date.now();
   set({ drill: { playing: true, result: 'The practice call is playing. Press “End practice call” as soon as you hear pressure.' } });
   drillAudio.onended = () => set({ drill: { playing: false, result: 'The practice call finished. Try again and hang up earlier.' } });
   await drillAudio.play();
  }),
  drillHangup() {
   if (!drillAudio) return;
   drillAudio.pause(); URL.revokeObjectURL(drillAudio.src); drillAudio = null;
   set({ drill: { playing: false, result: `You ended the practice call after ${Math.round((Date.now() - drillStarted) / 1000)} seconds. Well done. On a real call, use your phone’s end-call button.` } });
  },

  // ---- language setup suggested by a family member ----
  chooseLanguageByVoice() {
   const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
   if (!Recognition) { set(s => ({ setup: { ...s.setup, status: 'Choosing by voice is not available here. Use the language menu.' } })); return; }
   const r = new Recognition(); r.lang = 'en-IN';
   r.onresult = e => {
    const spoken = e.results[0][0].transcript.toLowerCase();
    const language = /tamil|தமிழ்/.test(spoken) ? 'ta-IN' : /malayalam|മലയാളം/.test(spoken) ? 'ml-IN' : /hindi|हिन्दी/.test(spoken) ? 'hi-IN' : 'en-IN';
    actions.setLanguage(language);
    set(s => ({ setup: { ...s.setup, status: `Heard “${spoken}”. Check the language shown before you confirm.` } }));
   };
   r.onerror = () => set(s => ({ setup: { ...s.setup, status: 'Could not hear a language. Use the menu.' } }));
   r.start();
  },
  confirmSetup: () => run(async () => {
   if (!state.consent) throw Error('Please tick the box to agree first.');
   const claim = await (await api(`/api/setup/${setupToken}/claim`, 'POST', { language: state.language, consent: true })).json();
   set(s => ({ setup: { ...s.setup, code: claim.code, status: `Ask your family member to type this code on their family page: ${claim.code}. Waiting for approval…` } }));
   for (;;) {
    if (Date.now() > claim.expiresAt) throw Error('The setup link expired. Ask your family member for a new one.');
    await new Promise(r => setTimeout(r, 2000));
    const r = await fetch(`/api/setup/${setupToken}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimId: claim.claimId }) });
    if (r.status === 409) continue;
    const d = await r.json();
    if (!r.ok) throw Error(d.error || 'Setup failed. Ask for a new link.');
    store.set(profileKey, d.deviceToken); store.set(languageKey, d.language);
    set({ setup: { active: false, code: '', status: '' }, language: d.language });
    history.replaceState(null, '', '/');
    notice('Setup approved and confirmed on this device.');
    refreshTimeline(); refreshGuardians();
    return;
   }
  }),
  readConsentAloud() {
   if (!('speechSynthesis' in window)) { notice('Reading aloud is not available on this device. Please read the text.'); return; }
   speechSynthesis.cancel();
   const u = new SpeechSynthesisUtterance(consentCopy[state.language]); u.lang = state.language; u.rate = 0.85;
   speechSynthesis.speak(u);
  },
 };

 function init() {
  api('/api/health').then(r => r.json()).then(d => set({ gnani: d.gnani.startsWith('configured'), providerStatus: `Speech: ${d.gnani} · AI model: ${d.llm}` })).catch(() => set({ providerStatus: 'The server is not reachable. Start it and reload.' }));
  refreshTimeline(); refreshGuardians();
  const token = new URLSearchParams(location.search).get('setup');
  if (/^[a-f0-9]{48}$/.test(token || '')) {
   setupToken = token;
   api(`/api/setup/${token}`).then(r => r.json()).then(d => { set({ setup: { active: true, code: '', status: '' } }); actions.setLanguage(d.language); }).catch(e => notice(e.message));
  }
  const onHide = () => { capture?.stop(); stopAudio(); if (session) fetch(`/api/sessions/${session.id}`, { method: 'DELETE', keepalive: true }).catch(() => {}); };
  window.addEventListener('pagehide', onHide);
  return () => window.removeEventListener('pagehide', onHide);
 }

 return { subscribe, getState: () => state, actions, init };
}

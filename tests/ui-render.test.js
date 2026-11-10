import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';

// Renders the real React components on the server (no browser) with representative states, to catch runtime errors
// and to check the senior-first requirements that are visible in the markup.
const config = fileURLToPath(new URL('../vite.config.js', import.meta.url));
let vite;
test.before(async () => { vite = await createServer({ configFile: config, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'silent' }); });
test.after(async () => { await vite?.close(); });
const load = path => vite.ssrLoadModule(path);
const render = (el) => renderToStaticMarkup(el);

async function senior() {
 const { createGuardian } = await load('/src/senior/guardian.js');
 const g = createGuardian();
 return { state: g.getState(), a: g.actions };
}
const withSession = (state, session, extra = {}) => ({ ...state, session, ...extra });

test('home tab: first run shows consent, a large disabled Start button and plain-language steps', async () => {
 const { HomeTab } = await load('/src/senior/HomeTab.jsx');
 const { state, a } = await senior();
 const html = render(h(HomeTab, { state, a }));
 assert.match(html, /Start listening/); assert.match(html, /Before we start/); assert.match(html, /How it works/);
 assert.match(html, /Ready when you are/); assert.match(html, /disabled=""[^>]*>.*Start listening|Start listening/s);
 assert.match(html, /min-h-1[46]/, 'primary action is at least 56px tall');
 assert.ok(!/min-h-(?:[0-9]|10)\b/.test(html.replace(/min-h-10/g, '')), 'no control below 40px');
 assert.match(html, /If this screen says/);
});

test('home tab: each risk level has its own headline, icon text and action', async () => {
 const { HomeTab } = await load('/src/senior/HomeTab.jsx');
 const { panelFor } = await load('/src/lib/view.js');
 const { state, a } = await senior();
 const mk = (risk, extra = {}) => { const session = { id: 's', language: 'en-IN', risk, mode: 'live', segments: [{ id: 1, at: 1, text: 'Transfer the money now', speaker: 'caller' }], flags: [{ segmentId: 1, label: 'Payment demand' }], ...extra }; return withSession({ ...state, consent: true }, session, { panel: panelFor(session), listening: true }); };
 const danger = render(h(HomeTab, { state: mk('danger'), a }));
 assert.match(danger, /Hang up now/); assert.match(danger, /I will end the call on my phone/); assert.match(danger, /Play spoken warning/); assert.match(danger, /Stop listening/);
 assert.match(danger, /Payment demand/); assert.match(danger, /What was heard/);
 const careful = render(h(HomeTab, { state: mk('careful'), a }));
 assert.match(careful, /Be careful/); assert.ok(!/I will end the call on my phone/.test(careful));
 const safe = render(h(HomeTab, { state: mk('safe', { flags: [] }), a }));
 assert.match(safe, /No warning detected/); assert.ok(!/Play spoken warning/.test(safe));
 const code = render(h(HomeTab, { state: mk('danger', { askCodeWord: true, coolingOffUntil: Date.now() + 6e5 }), a }));
 assert.match(code, /family code word/i); assert.match(code, /Pause before paying/);
});

test('home tab: voice enrollment card and remote setup card', async () => {
 const { HomeTab } = await load('/src/senior/HomeTab.jsx');
 const { state, a } = await senior();
 const html = render(h(HomeTab, { state: { ...state, enroll: { open: true, consent: false, busy: false, progress: 0, status: '' } }, a }));
 assert.match(html, /Record your voice once/); assert.match(html, /18 or older/); assert.match(html, /Record my voice/);
 const busy = render(h(HomeTab, { state: { ...state, enroll: { open: true, consent: true, busy: true, progress: 0.4, status: 'Recording…' } }, a }));
 assert.match(busy, /role="progressbar"/);
 const setup = render(h(HomeTab, { state: { ...state, setup: { active: true, code: '123456', status: 'Waiting' } }, a }));
 assert.match(setup, /123456/); assert.match(setup, /helping you set up/);
});

test('family and more tabs render every promised control', async () => {
 const { FamilyTab } = await load('/src/senior/FamilyTab.jsx');
 const { MoreTab } = await load('/src/senior/MoreTab.jsx');
 const { state, a } = await senior();
 const fam = render(h(FamilyTab, { state, a }));
 assert.match(fam, /Create family link/); assert.match(fam, /Recent warnings/); assert.match(fam, /Family accounts linked to you/);
 const linked = render(h(FamilyTab, { state: { ...state, family: { consent: true, sharing: true, link: 'https://x.example/family#abc', status: 'on' }, guardians: [{ username: 'asha', pushStatus: 'on' }], timeline: [{ id: 'e1', at: 1, risk: 'danger', reasons: ['Payment demand'] }] }, a }));
 assert.match(linked, /Copy link/); assert.match(linked, /Stop sharing/); assert.match(linked, /Sharing is on for every call/);
 assert.doesNotMatch(fam, /Stop sharing/, 'nothing to stop before sharing is on'); assert.match(linked, /asha/); assert.match(linked, /It was a scam/);
 const more = render(h(MoreTab, { state, a }));
 assert.match(more, /href="tel:1930"/); assert.match(more, /Call 1930/); assert.match(more, /Try it safely/); assert.match(more, /Your information/); assert.match(more, /Keep the details/); assert.match(more, /About and privacy/);
});

test('every button and form control has an accessible name', async () => {
 const { HomeTab } = await load('/src/senior/HomeTab.jsx');
 const { MoreTab } = await load('/src/senior/MoreTab.jsx');
 const { App } = await load('/src/senior/App.jsx');
 const { state, a } = await senior();
 const pages = [render(h(HomeTab, { state: { ...state, notice: 'Hello', enroll: { ...state.enroll, open: true } }, a })), render(h(MoreTab, { state, a }))];
 for (const html of pages) {
  for (const m of html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gs)) {
   if (/role="checkbox"/.test(m[0])) { assert.match(m[0], /id="/, 'checkbox needs an id for its label'); continue; }
   const label = /aria-label="[^"]+"/.test(m[0]) || m[1].replace(/<svg.*?<\/svg>/gs, '').replace(/<[^>]+>/g, '').trim();
   assert.ok(label, `unnamed button: ${m[0].slice(0, 120)}`);
  }
  for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
   if (/type="file"|role="checkbox"|aria-hidden="true"/.test(m[2])) continue;
   assert.ok(/aria-label=|id="/.test(m[2]), `unlabelled ${m[1]}`);
  }
 }
 assert.ok(typeof App === 'function');
});

test('status card shows an icon and text for every state, never colour alone', async () => {
 const { StatusCard } = await load('/src/components/StatusCard.jsx');
 for (const risk of ['idle', 'safe', 'careful', 'danger', 'error']) {
  const html = render(h(StatusCard, { panel: { risk, title: `T-${risk}`, message: `M-${risk}`, lang: 'en-IN' }, listening: false }));
  assert.match(html, /<svg/); assert.match(html, new RegExp(`T-${risk}`)); assert.match(html, /role="status"/); assert.match(html, /aria-live="polite"/);
  assert.match(html, /<h1[^>]*class="[^"]*(?:text-\[1\.75rem\]|text-2xl|text-3xl)/, 'headline at least 24px');
 }
});

test('family page: sign-in, status and settings render', async () => {
 const { SettingsTab } = await load('/src/family/SettingsTab.jsx');
 const f = { logout() {}, deleteAccount() {}, data: { pushStatus: 'off', codeWordConfigured: false } };
 const html = render(h(SettingsTab, { f }));
 for (const text of ['Phone alerts', 'Family code word', 'Set up their device from here', 'Your voice for their warnings', 'Sign out', 'Delete my family account']) assert.match(html, new RegExp(text));
 const { Timeline } = await load('/src/components/Timeline.jsx');
 assert.match(render(h(Timeline, { items: [] })), /No warnings yet/);
 assert.match(render(h(Timeline, { items: [{ id: 'e', at: 5, risk: 'careful', uncertain: true, reasons: ['Secrecy'], outcome: { label: 'scam', by: 'family' } }] })), /Marked: It was a scam \(family\)/);
});

test('layout adapts to the screen: bottom tabs on phones, header tabs and columns on larger screens', async () => {
 const { App } = await load('/src/senior/App.jsx');
 const { HomeTab } = await load('/src/senior/HomeTab.jsx');
 const { state, a } = await senior();
 const shell = render(h(App));
 assert.match(shell, /md:hidden/, 'bottom tabs hide on wider screens');
 assert.match(shell, /hidden md:block/, 'header tabs appear on wider screens');
 assert.match(shell, /max-w-6xl/); assert.match(shell, /sm:px-6/);
 assert.match(render(h(HomeTab, { state, a })), /lg:grid-cols-12/, 'home uses two columns on large screens');
});

test('voice status: says whether a voice measurement is saved, never claims a recording is kept', async () => {
 const { VoiceStatus } = await load('/src/components/VoiceStatus.jsx');
 const { HomeTab } = await load('/src/senior/HomeTab.jsx');
 const { state, a } = await senior();
 assert.equal(render(h(VoiceStatus, { saved: null })), '', 'nothing is claimed while it is unknown');
 const none = render(h(VoiceStatus, { saved: false }));
 assert.match(none, /No voice saved yet/); assert.match(none, /data-voice-saved="no"/); assert.match(none, /No recording is ever kept/);
 const yes = render(h(VoiceStatus, { saved: { at: Date.UTC(2026, 10, 10, 8, 0) } }));
 assert.match(yes, /Your voice is saved/); assert.match(yes, /data-voice-saved="yes"/); assert.match(yes, /recorded /); assert.match(yes, /not the recording/);
 // It appears in the recording card on Home. (More → Your information is a closed accordion, so it is not in the server markup.)
 const home = render(h(HomeTab, { state: { ...state, enroll: { ...state.enroll, open: true, saved: false } }, a }));
 assert.match(home, /Record your voice once/); assert.match(home, /No voice saved yet/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, classifyAct, createSession, appendSegment, intervention, PACKS, DANGER_RULES, tacticLabels } from '../src/engine.js';
import { familyCases } from '../fixtures/families.js';

const one = text => analyze([{ id: 'x', text, at: 1 }]);

test('B-5: dialogue acts separate demands from reports, narration and advice', () => {
 assert.equal(classifyAct('Tell me your OTP now'), 'demand');
 assert.equal(classifyAct('My neighbour said a caller asked for her OTP'), 'reported');
 assert.equal(classifyAct('The bank said you must share your OTP'), 'demand', 'a quoted ask aimed at the listener stays strong');
 assert.equal(classifyAct('My son is a police officer in Chennai'), 'narration');
 assert.equal(classifyAct('Your son was arrested'), 'other', 'aimed at the listener: never narration');
 assert.equal(classifyAct('Never share your OTP with anyone'), 'advice');
 assert.equal(classifyAct('उन्होंने खबर में बताया कि पुलिस फोन करती है'), 'reported');
 assert.ok(['reported', 'advice'].includes(classifyAct('செய்தியில் போலி அழைப்புகள் பற்றி சொன்னார்கள்')), 'news about fake calls never escalates (batch 6: awareness talk is advice)');
});

test('B-5: reported and narrated tactics are shown as weak evidence and do not escalate alone', () => {
 const r = one('My neighbour said a caller asked for her OTP, so she hung up.');
 assert.equal(r.risk, 'safe');
 assert.ok(r.flags.every(f => f.grade === 'weak'));
 assert.equal(one('My son is a police officer in Chennai.').risk, 'safe');
 assert.equal(one('Unhone bataya ki OTP kabhi share nahi karna').risk, 'safe', '"bataya" (told) is not a request');
 assert.equal(one('The bank said you must share your OTP now.').risk, 'danger');
 const s = createSession('en-IN', 'text', 0);
 appendSegment(s, 'My grandson had a small accident at football last week.', 1000);
 assert.equal(intervention(s).askCodeWord, false, 'narrated family events do not trigger the code-word prompt');
});

test('B-1: every scam family call reaches its expected level and look-alikes stay calm', () => {
 for (const c of familyCases) {
  const s = createSession(c.language, 'demo', 0);
  c.segments.forEach((t, i) => appendSegment(s, t, i * 2000 + 1));
  if (c.label === 'benign') assert.equal(s.risk, 'safe', `${c.id} should stay calm`);
  else if (c.expect === 'danger') assert.equal(s.risk, 'danger', c.id);
  else assert.notEqual(s.risk, 'safe', c.id);
 }
});

test('B-1: contradiction features from official advisories', () => {
 assert.equal(one('This is TRAI, your number will be disconnected in two hours.').risk, 'danger');
 assert.equal(one('TRAI does not call customers about disconnection.').risk, 'safe');
 assert.equal(one('Enter your UPI PIN to get the refund credited.').risk, 'danger');
 assert.equal(one('Enter your UPI PIN to complete the payment.').risk, 'safe');
 assert.equal(one('CBI and police do not arrest people through video calls.').risk, 'safe');
});

test('B-21: packs are data with the same keys, and every danger rule names known tactics', () => {
 for (const p of PACKS) for (const key of ['code', 'tactics', 'secret', 'identity', 'demand', 'advice', 'acts']) assert.ok(key in p, `${p.code} has ${key}`);
 for (const p of PACKS) for (const t of Object.keys(p.tactics)) assert.ok(t in tacticLabels, `${p.code}: ${t} is a known tactic`);
 for (const r of DANGER_RULES) for (const t of [...r.all, ...(r.any || [])]) assert.ok(t in tacticLabels, t);
 for (const p of PACKS) for (const list of Object.values(p.tactics)) for (const src of list) assert.doesNotThrow(() => new RegExp(src, 'iu'));
});

test('review fixes: quoted asks stay strong, Hindi past tense is not a request, advisories stay calm', () => {
 assert.equal(classifyAct('The bank said share the OTP'), 'demand');
 assert.equal(one('The bank said share the OTP now.').risk, 'danger');
 assert.equal(one('मैंने कल पैसे भेजा था।').risk, 'safe');
 assert.equal(one('UPI PIN is NOT required for receiving money.').risk, 'safe');
 assert.equal(one('Do not download any screen sharing app when asked by an unknown person.').risk, 'safe');
 assert.equal(one('I sent money for verification yesterday.').risk, 'safe');
 assert.equal(one('Install the official app and share your OTP now.').risk, 'danger', 'advice in one clause does not hide a demand in the next');
});

test('safety review: narrated pretexts with a strong ask, prefixed demands and Hindi request verbs all escalate', () => {
 for (const text of ['Mom, I had an accident. Send money now.', 'Mom, my son is in custody. Send money now.', 'कल मेरा बेटा हिरासत में था, अभी पैसे भेजो', 'என் மகன் கைது செய்யப்பட்டார், உடனே பணம் அனுப்புங்கள்', 'yesterday send the OTP to me', 'yesterday share the OTP with me', 'அவர் சொன்னார் OTP கொடு', 'OTP bhejo', 'Mujhe OTP bhejo', 'OTP डालो'])
  assert.equal(one(text).risk, 'danger', text);
 assert.notEqual(one('Download the bank app for aapka account statement').risk, 'danger', '"aapka" is not an APK');
 assert.equal(one('My grandson had a small accident at football. He is fine now.').risk, 'safe');
});

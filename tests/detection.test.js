import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, createSession, appendSegment, mergeGroundedFlags, familyView, sessionView, coverageOf, evidencePack } from '../src/engine.js';
import { normalize } from '../src/normalize.js';

const one = text => analyze([{ id: 'x', text, at: 1 }]);
const tactics = text => new Set(one(text).flags.map(f => f.tactic));

test('F-01: benign nouns and identity statements never reach danger on their own', () => {
 for (const text of ['Give me the pan.', 'Send the card to the printer shop.', 'Please share your Aadhaar at the bank counter tomorrow.', 'Tell me your pin code for delivery.', 'Transfer the photos to verify the backup.'])
  assert.notEqual(one(text).risk, 'danger', text);
});

test('F-01: secret demands stay danger; identity requests combine with pressure', () => {
 for (const text of ['Tell me your OTP.', 'Tell me your CVV.', 'Confirm your CVV.', 'I need your OTP right now.', 'Read the code you received.', 'Send your card details to me.', 'Enter your UPI PIN to receive the refund.'])
  assert.equal(one(text).risk, 'danger', text);
 assert.equal(one('Tell me your Aadhaar number.').risk, 'careful');
 assert.equal(one('I am a police officer. Tell me your Aadhaar number immediately.').risk, 'danger');
});

test('F-02: negation only suppresses its own clause, with or without punctuation', () => {
 for (const text of ['Never share your OTP with anyone, just tell me the OTP now.', 'police will never ask for your otp tell me your otp', 'Never share your PIN, just send me the OTP now.', 'मुझे ओटीपी बताओ किसी को मत बताना'])
  assert.equal(one(text).risk, 'danger', text);
 assert.ok(tactics('पैसे जमा करें परिवार को मत बताना').has('secrecy'));
 assert.ok(tactics('पैसे जमा करें परिवार को मत बताना').has('payment'));
 for (const text of ['Never share your OTP with anyone.', 'अपना ओटीपी किसी को मत बताना।', 'Police will never ask you to transfer money.'])
  assert.notEqual(one(text).risk, 'danger', text);
 assert.equal(one('Never share your OTP with anyone.').flags.length, 0);
});

test('F-03: missing authority, secrecy and confinement vocabulary is recognised', () => {
 assert.ok(tactics('ED officer here.').has('authority'));
 assert.ok(tactics('I am calling from the crime branch.').has('authority'));
 assert.ok(tactics('Dont tell anyone.').has('secrecy'));
 assert.ok(tactics('Keep this between us.').has('secrecy'));
 assert.ok(tactics('Stay on video call.').has('camera'));
 assert.equal(one('I am police. You will be arrested. Stay on video call and do not tell anyone.').risk, 'danger');
});

test('F-04 and F-05: spoken amounts, payment stems and wider family relations', () => {
 assert.ok(tactics('Send ₹50,000 now.').has('payment'));
 assert.ok(tactics('Pay fifty thousand rupees now.').has('payment'));
 assert.ok(tactics('Main police se bol raha hoon, abhi paise bhejo.').has('payment'));
 assert.equal(one('Your grandson is in an accident, send money.').risk, 'danger');
 const s = createSession('en-IN', 'text');
 appendSegment(s, 'Your son is in custody. Send 50,000 rupees now.', 1000);
 assert.equal(s.risk, 'danger');
});

test('F-29 and B-2: code-mixed, spaced and nukta variants are matched', () => {
 for (const text of ['मुझे OTP बताइए', 'ओटीपी बता दो', 'உங்கள் OTP சொல்லுங்கள்', 'Ungal OTP anuppunga.', 'tell me your O T P', 'mpin bataiye', 'Unga password kudunga'])
  assert.equal(one(text).risk, 'danger', text);
 assert.equal(normalize('गिरफ़्तार'), normalize('गिरफ्तार'));
 assert.equal(normalize('O T P'), 'OTP');
 assert.ok(tactics('सी बी आई अधिकारी बोल रहा हूँ').has('authority'));
});

test('existing benign probes stay safe', () => {
 for (const line of ['Tell me your pancake recipe.', 'Give me your cardigan size.', 'You are not under digital arrest.', 'दुकान बंद कर दी है।'])
  assert.equal(one(line).risk, 'safe', line);
});

test('F-09: escalation evidence persists after the window moves on', () => {
 const s = createSession('en-IN', 'text', 0);
 appendSegment(s, 'I am a CBI officer, keep this secret, transfer money to our safe account.', 0, 'a');
 appendSegment(s, 'Tell me your OTP.', 50000, 'b');
 appendSegment(s, 'Now share your PIN.', 75000, 'c');
 assert.equal(s.risk, 'danger');
 const kinds = new Set(s.flags.map(f => f.tactic));
 for (const t of ['authority', 'secrecy', 'payment', 'credential']) assert.ok(kinds.has(t), t);
 assert.ok(familyView(s).reasons.includes('Authority claim'));
});

test('F-10: evidence quotes the matching clause, not the whole segment', () => {
 const { flags } = one('Hello, this is the bank. Tell me your OTP.');
 const quote = flags.find(f => f.tactic === 'credential').quote;
 assert.match(quote, /OTP/);
 assert.doesNotMatch(quote, /Hello/);
});

test('F-06 and B-3: uncovered languages are marked, never silently safe', () => {
 assert.equal(coverageOf('আমি পুলিশ থেকে বলছি, আপনাকে গ্রেফতার করা হবে'), 'unknown_language');
 assert.equal(coverageOf('నేను పోలీసు, మిమ్మల్ని అరెస్ట్ చేస్తారు'), 'unknown_language');
 assert.equal(coverageOf('मी पोलीस बोलतोय, तुमची अटक होईल'), 'partial');
 assert.equal(coverageOf('Tell me your OTP'), 'supported');
 assert.equal(coverageOf('मुझे OTP बताइए'), 'supported');
 const s = createSession('hi-IN', 'text', 0);
 appendSegment(s, 'আমি পুলিশ থেকে বলছি', 1000);
 assert.equal(s.coverage, 'unknown_language');
 assert.equal(familyView(s).coverage, 'unknown_language');
});

test('F-07: LLM-only flags cannot latch danger and advice quotes are rejected', () => {
 const s = createSession('en-IN', 'text', 0);
 appendSegment(s, 'Your Aadhaar was updated last week.', 1000, 'a');
 mergeGroundedFlags(s, [{ tactic: 'credential', label: 'x', segmentId: 'a', quote: 'Aadhaar was updated', source: 'llm' }], 1001);
 assert.equal(s.risk, 'careful');
 const advice = createSession('en-IN', 'text', 0);
 appendSegment(advice, 'Never share your OTP with anyone.', 1000, 'b');
 mergeGroundedFlags(advice, [{ tactic: 'credential', label: 'x', segmentId: 'b', quote: 'Never share your OTP with anyone', source: 'llm' }], 1001);
 assert.equal(advice.risk, 'safe');
 const combo = createSession('en-IN', 'text', 0);
 appendSegment(combo, 'I am a CBI officer. Keep this secret.', 1000, 'c');
 appendSegment(combo, 'Move the funds to the holding account.', 2000, 'd');
 mergeGroundedFlags(combo, [{ tactic: 'payment', label: 'x', segmentId: 'd', quote: 'Move the funds to the holding account', source: 'llm' }], 2001);
 assert.equal(combo.risk, 'danger');
});

test('F-14: the senior session projection hides the profile capability and internals', () => {
 const s = createSession('en-IN', 'text');
 s.profileToken = 'secret-profile';
 s._llm = Promise.resolve();
 const view = sessionView(s);
 assert.equal(view.profileToken, undefined);
 assert.equal(view._llm, undefined);
 assert.equal(view.id, s.id);
});

test('Tamil "tell no one" stays a secrecy tactic, not safety advice', () => {
 assert.ok(tactics('யாரிடமும் சொல்ல வேண்டாம்.').has('secrecy'));
 assert.equal(tactics('உங்கள் OTP யாருடனும் பகிர வேண்டாம்.').size, 0);
});

test('review fixes: unpunctuated demand after advice, model-only secret flags, card number, coverage latch, amounts', () => {
 assert.ok(tactics('never share your otp with anyone transfer money now').has('payment'));
 assert.equal(one('Police will never ask you to transfer money.').flags.length, 0);
 assert.equal(one('Tell me your card number.').risk, 'careful');
 const s = createSession('en-IN', 'text', 0);
 appendSegment(s, 'I am a police officer. You will be arrested.', 1000, 'a');
 mergeGroundedFlags(s, [{ tactic: 'credential', label: 'x', segmentId: 'a', quote: 'You will be arrested', source: 'llm' }], 1001);
 assert.equal(s.risk, 'careful', 'a model-only secret-code flag cannot decide danger');
 const c = createSession('hi-IN', 'text', 0);
 appendSegment(c, 'আমি পুলিশ থেকে বলছি', 1000);
 appendSegment(c, 'Hello', 90000);
 assert.equal(c.coverage, 'unknown_language');
 const e = createSession('en-IN', 'text', 0);
 appendSegment(e, 'Send 50,000 rupees now.', 1000);
 assert.ok(evidencePack(e).entities.amounts.some(a => a.includes('50,000')));
});

test('twin false alarms: education about digital arrest and Hindi negated police statements stay calm', () => {
 assert.equal(one('There is no such thing as digital arrest.').risk, 'safe');
 assert.equal(one('पुलिस वीडियो कॉल पर किसी को गिरफ्तार नहीं करती।').risk, 'safe');
 assert.equal(one('पुलिस वाला बोल रहा हूँ, तुम गिरफ्तार होगे।').risk, 'careful', 'a real Hindi threat still flags');
});

import { randomUUID } from 'node:crypto';
import { normalize, forDetection, coverageOf, worstCoverage } from './normalize.js';
import { REGISTRY, supportedLanguages } from './languages.js';
import en from './packs/en.js';
import hi from './packs/hi.js';
import ta from './packs/ta.js';
import ml from './packs/ml.js';

export { coverageOf } from './normalize.js';
export { supportedLanguages as languages } from './languages.js';
export const rank = { safe: 0, careful: 1, danger: 2 };
const WINDOW_MS = 60000;
const LEDGER_LIMIT = 200;

// Language packs are data (src/packs). Detection runs over the UNION of every supported pack on every clause, so
// code-mixed speech is matched whichever language each word is in; a pack never needs a language tag to apply.
export const PACKS = [en, hi, ta, ml];
const union = (lists, flags = 'iu') => new RegExp(lists.flat().map(s => `(?:${s})`).join('|') || '(?!)', flags);
const gather = key => PACKS.flatMap(p => p[key] || []);
const gatherAct = key => PACKS.flatMap(p => p.acts?.[key] || []);

export const tacticLabels = {
 authority: 'Authority claim', threat: 'Arrest, block or disconnection threat', urgency: 'Pressure to act quickly', secrecy: 'Asked to keep it secret',
 payment: 'Money transfer request', credential: 'Secret code request', identity: 'Identity document request', remote: 'App, link or screen-sharing request',
 camera: 'Asked to stay on camera or on the line', impossible: 'Something no real institution asks for', advance_fee: 'Fee demanded before you receive money',
 prize: 'Unexpected prize or lottery win', investment_bait: 'Guaranteed returns or paid tasks', extortion: 'Threat to shame you into paying', family_emergency: 'Claimed family emergency',
};

// Spoken or written amounts: ₹50,000 · Rs 500 · 50,000 rupees · fifty thousand rupees · 2 lakh · ५० हज़ार (digits normalised first).
// Decision 19: assembled from pack data (amount.prefix / units / unitsNative / words).
const amountPart = key => PACKS.flatMap(p => p.amount?.[key] || []);
const NUM = '\\d[\\d,]*(?:\\.\\d+)?';
export const AMOUNT = new RegExp([
 `(?:${amountPart('prefix').join('|')})\\s*\\d[\\d,]*(?:\\.\\d{1,2})?`,
 `\\b${NUM}\\s*(?:${amountPart('units').join('|')})\\b`,
 `${NUM}\\s*(?:${amountPart('unitsNative').join('|')})`,
 ...amountPart('words'),
].join('|'), 'iu');
const SECRET = union(gather('secret'), 'giu'), IDENTITY = union(gather('identity'), 'giu'), PAN_UPPER = /\bPAN\b/gu, DEMAND = union(gather('demand'), 'giu');
const PAYMENT_WORD = union(PACKS.map(p => p.tactics.payment || []));
const AMOUNT_VERB = union(gather('amountVerbs'));
// Entering a UPI PIN to complete a payment you started is normal; only other secret requests count.
const OWN_PAYMENT = union(gather('ownPayment'));

function near(text, a, b, distance = 45) {
 const pa = [...text.matchAll(a)].map(m => m.index), pb = [...text.matchAll(b)].map(m => m.index);
 return pa.some(i => pb.some(j => Math.abs(i - j) <= distance));
}
const compiled = Object.keys(tacticLabels).map(tactic => {
 if (tactic === 'credential') return { tactic, test: t => !OWN_PAYMENT.test(t) && near(t, SECRET, DEMAND) };
 if (tactic === 'identity') return { tactic, test: t => near(t, IDENTITY, DEMAND) || near(t, PAN_UPPER, DEMAND) };
 if (tactic === 'payment') return { tactic, test: t => PAYMENT_WORD.test(t) || (AMOUNT.test(t) && AMOUNT_VERB.test(t)) };
 const re = union(PACKS.map(p => p.tactics[tactic] || []));
 return { tactic, test: t => re.test(t) };
});

// Decision 21: weak-only patterns (a bare institution name). They never become strong evidence.
const weakCompiled = Object.keys(tacticLabels).map(tactic => ({ tactic, re: union(PACKS.map(p => p.weakTactics?.[tactic] || [])) })).filter(x => x.re.source !== '(?:)' && x.re.source !== '(?!)');

// Clause boundaries: punctuation, conjunctions, and the point where a new request starts. Speech recognition
// output is often unpunctuated, so a negated safety line must not swallow the demand that follows it.
const SEPARATORS = new RegExp(`(?<!\\brs)\\.(?!\\d)|[!?।|\\n;:]+|,(?!\\d)|${gather('separators').join('|')}`, 'giu');
const BEFORE_DEMAND = new RegExp(`(?<!\\b(?:never|not|don'?t|dont|to|you|will|the|a|an|your|my|our|this|that|for|of|any|no)\\s*)\\s(?=${gather('demandStart').join('|') || '(?!)'})`, 'giu');
const AFTER_IMPERATIVE = new RegExp(`(?<=(?:${gather('imperativeEnds').join('|')}))\\s+(?=\\S)`, 'giu');

export function splitClauses(text) {
 return String(text).split(SEPARATORS).flatMap(part => (part || '').split(BEFORE_DEMAND)).flatMap(part => part.split(AFTER_IMPERATIVE)).map(x => x.trim()).filter(Boolean);
}

const ADVICE = union(gather('advice')), ADVICE_EXCEPT = union(gather('adviceExceptions'));
// Narrow educational, negated or official-channel clauses are excluded clause by clause, never whole transcripts.
export function advice(clause) {
 const t = forDetection(clause);
 return !ADVICE_EXCEPT.test(t) && ADVICE.test(t);
}

// Dialogue act of a clause (B-5). Reported and narrated clauses produce WEAK evidence: shown, but unable to escalate
// on their own. A clause aimed at the listener ("you", "aap", "unga", imperative forms) is never reported or narration.
const REPORTED = union(gatherAct('reported')), NARRATION = union(gatherAct('narration')), DEMAND_ACT = union(gatherAct('demand')), SECOND_PERSON = union(gatherAct('secondPerson'));
export function classifyAct(clause) {
 const t = forDetection(clause).trim();
 if (advice(t)) return 'advice';
 const toListener = SECOND_PERSON.test(t) || DEMAND_ACT.test(t);
 if (REPORTED.test(t) && !toListener) return 'reported';
 if (DEMAND_ACT.test(t)) return 'demand';
 if (NARRATION.test(t) && !toListener) return 'narration';
 if (/\?\s*$/.test(t)) return 'question';
 return 'other';
}
const WEAK_ACTS = new Set(['reported', 'narration']);

export function analyze(segments) {
 const flags = [];
 const add = f => { if (!flags.some(x => x.tactic === f.tactic && x.segmentId === f.segmentId && x.grade === f.grade)) flags.push(f); };
 const scan = (text, segment, quote, related) => {
  if (advice(text)) return;
  // Decision 24: speech confidently attributed to the SENIOR (both acoustic tests agree) is weak evidence: the
  // senior repeating or refusing a demand is not the demand. Caller and unsure speech are scored as before.
  const senior = segment.speaker === 'senior';
  const act = classifyAct(text), grade = senior || WEAK_ACTS.has(act) ? 'weak' : 'strong', n = forDetection(text);
  for (const { tactic, test } of compiled) if (test(n)) add({ tactic, label: tacticLabels[tactic], segmentId: segment.id, quote, source: 'rule', act, grade, ...(senior ? { speaker: 'senior' } : {}), ...(related ? { relatedSegmentIds: related } : {}) });
  for (const { tactic, re } of weakCompiled) if (re.test(n) && !flags.some(x => x.tactic === tactic && x.segmentId === segment.id)) add({ tactic, label: tacticLabels[tactic], segmentId: segment.id, quote, source: 'rule', act, grade: 'weak', evidence: 'mention' });
 };
 for (const s of segments) {
  const clauses = splitClauses(s.text);
  clauses.forEach(clause => scan(clause, s, clauses.length === 1 ? s.text : clause));
  // A comma or conjunction can separate the parts of one request ("Mom, I had an accident"; "the OTP that came, tell
  // me"): adjacent clause pairs are also checked, for tactics neither half shows alone.
  for (let i = 1; i < clauses.length; i++) {
   const a = clauses[i - 1], b = clauses[i];
   if (advice(a) || advice(b)) continue;
   const pair = `${a} ${b}`, na = forDetection(a), nb = forDetection(b), np = forDetection(pair);
   const act = classifyAct(pair), grade = s.speaker === 'senior' || WEAK_ACTS.has(act) ? 'weak' : 'strong';
   for (const { tactic, test } of compiled) if (!test(na) && !test(nb) && test(np)) add({ tactic, label: tacticLabels[tactic], segmentId: s.id, quote: pair, source: 'rule', act, grade });
  }
 }
 // A speech boundary can cut a request in half. Match only adjacent, unfinished utterances within ten seconds.
 for (let i = 1; i < segments.length; i++) {
  const a = segments[i - 1], b = segments[i];
  if (b.at - a.at > 10000 || /[.!?।]$/.test(a.text.trim())) continue;
  if (a.speaker && b.speaker && a.speaker !== 'unsure' && b.speaker !== 'unsure' && a.speaker !== b.speaker) continue; // two people, not one request
  const joined = `${a.text} ${b.text}`;
  if (advice(joined)) continue;
  const na = forDetection(a.text), nb = forDetection(b.text), nj = forDetection(joined);
  const act = classifyAct(joined), grade = a.speaker === 'senior' && b.speaker === 'senior' || WEAK_ACTS.has(act) ? 'weak' : 'strong';
  for (const { tactic, test } of compiled) {
   if (test(na) || test(nb) || !test(nj)) continue;
   for (const s of [a, b]) add({ tactic, label: tacticLabels[tactic], segmentId: s.id, quote: s.text, source: 'rule', act, grade, relatedSegmentIds: [a.id, b.id] });
  }
 }
 return { risk: riskFor(flags), flags };
}

// Risk combinations as data (B-4). Each rule: every tactic in `all`, plus at least one of `any` when given.
// Only STRONG evidence counts. Contradiction features come from official advisories: TRAI does not call about
// disconnection; police and agencies do not arrest on video calls; a UPI PIN or QR scan is never needed to receive.
export const DANGER_RULES = [
 { all: ['impossible'] }, { all: ['credential'] }, { all: ['advance_fee'] }, { all: ['extortion'] },
 { all: ['remote', 'payment'] }, { all: ['remote', 'threat'] }, { all: ['remote', 'credential'] },
 { all: ['authority', 'payment'], any: ['secrecy', 'threat'] },
 { all: ['authority', 'threat'], any: ['secrecy', 'camera'] },
 { all: ['identity'], any: ['authority', 'urgency', 'payment', 'secrecy', 'threat', 'prize'] },
 { all: ['family_emergency', 'payment'] }, { all: ['family_emergency', 'secrecy'] },
 { all: ['prize'], any: ['payment', 'credential', 'identity'] },
 { all: ['investment_bait', 'payment'] },
 { all: ['threat', 'credential'] },
];
const remoteToolQuote = union(gather('remoteTools'));
const NEVER_CALLS = union(gather('neverCalls'));
const LAW_ENFORCEMENT = union(gather('lawEnforcement'));
// Batch 6: tactics too common in ordinary calls to ask for care on their own.
const NOT_ALONE = new Set(['payment', 'urgency', 'camera']);
const traiDisconnect = f => f.tactic === 'authority' && NEVER_CALLS.test(normalize(f.quote));

// Decision 22: weighted evidence alongside the precise patterns. The patterns above stay the main route to Hang up;
// the score lets a pile of strong evidence that no single pattern names still reach Hang up (at least three
// different strong tactics), and marks "Be careful" as UNCERTAIN when it sits close to Hang up. Contradiction
// features (an official body doing what it publicly says it never does) add weight. Weights are judgement calls.
export const WEIGHTS = { credential: 6, impossible: 6, advance_fee: 6, extortion: 6, remote: 3, payment: 2, identity: 2, authority: 2, threat: 2, secrecy: 2, family_emergency: 2, prize: 2, investment_bait: 2, urgency: 1, camera: 1 };
export const SCORE = { danger: 7, minTacticsForScoreDanger: 3, uncertain: 4, contradiction: 3, remoteTool: 3 };

export function assess(flags) {
 // A reported or narrated PRETEXT ("Mom, I had an accident", "my son is in custody") becomes decisive as soon as the
 // same window holds a strong ASK for money, a secret, an app or an identity document. Narration alone stays calm.
 const STRONG_ASK = new Set(['payment', 'credential', 'remote', 'identity', 'advance_fee']), PRETEXT = new Set(['family_emergency', 'authority', 'threat', 'prize', 'investment_bait', 'secrecy', 'urgency', 'camera']);
 const hasAsk = flags.some(f => f.grade !== 'weak' && STRONG_ASK.has(f.tactic));
 const strong = flags.filter(f => f.grade !== 'weak' || (hasAsk && PRETEXT.has(f.tactic) && f.evidence !== 'mention'));
 const t = new Set(strong.map(f => f.tactic)), has = x => t.has(x);
 const contributions = [...t].map(tactic => ({ tactic, weight: WEIGHTS[tactic] || 1 }));
 const tool = has('remote') && strong.some(f => f.tactic === 'remote' && remoteToolQuote.test(f.quote));
 const trai = has('threat') && strong.some(traiDisconnect);
 if (tool) contributions.push({ tactic: 'remote_tool', weight: SCORE.remoteTool });
 if (trai) contributions.push({ tactic: 'contradiction_trai', weight: SCORE.contradiction });
 const score = contributions.reduce((a, c) => a + c.weight, 0);
 const pattern = DANGER_RULES.some(r => r.all.every(has) && (!r.any || r.any.some(has))) || tool || trai;
 let risk;
 if (pattern || (score >= SCORE.danger && t.size >= SCORE.minTacticsForScoreDanger)) risk = 'danger';
 else if ([...t].some(x => !NOT_ALONE.has(x)) && !(t.size === 1 && has('authority') && !strong.some(f => f.tactic === 'authority' && LAW_ENFORCEMENT.test(normalize(f.quote))))) risk = 'careful';
 else if (t.size >= 2) risk = 'careful';
 else {
  // Weak evidence alone is shown but only asks for care when it adds up to two different tactics.
  const weak = new Set(flags.filter(f => f.grade === 'weak' && f.tactic !== 'payment').map(f => f.tactic));
  risk = weak.size >= 2 ? 'careful' : 'safe';
 }
 return { risk, score, uncertain: risk === 'careful' && score >= SCORE.uncertain, route: risk === 'danger' ? (pattern ? 'pattern' : 'score') : null, contributions };
}
export const riskFor = flags => assess(flags).risk;

export function createSession(language, mode, now = Date.now()) {
 return { id: randomUUID(), createdAt: now, expiresAt: now + 900000, language, mode, risk: 'safe', status: 'waiting', segments: [], flags: [], coverage: 'supported', firstWarningAt: null, sharing: false, classifier: 'rules', llmStatus: 'not configured' };
}

// Append-only evidence ledger: what justified an escalation stays visible after the 60-second window moves on.
function record(s, flags, at) {
 for (const f of flags) if (!s.flags.some(x => x.tactic === f.tactic && x.segmentId === f.segmentId && x.source === f.source)) s.flags.push({ ...f, at });
 if (s.flags.length > LEDGER_LIMIT) s.flags = s.flags.slice(-LEDGER_LIMIT);
}
const recentOf = (s, now) => s.segments.filter(x => now - x.at <= WINDOW_MS);
// "Be careful" close to Hang up. Shown while the current window supports it; meaningless once Hang up is shown.
function noteUncertain(s, flags) { const a = assess(flags); s.uncertain = s.risk === 'careful' && a.uncertain; s.score = a.score; }
function raise(s, risk, at) {
 if (rank[risk] > rank[s.risk]) s.risk = risk;
 if (s.risk !== 'safe' && !s.firstWarningAt) s.firstWarningAt = at;
}

export function appendSegment(s, text, at = Date.now(), id = randomUUID(), meta = {}) {
 if (s.segments.some(x => x.id === id)) return s;
 s.segments.push({ id, text, at, coverage: coverageOf(text), ...(meta.speaker ? { speaker: meta.speaker, attribution: meta.attribution } : {}) });
 s.segments = s.segments.slice(-200);
 const recent = recentOf(s, at);
 const result = analyze(recent);
 record(s, result.flags, at);
 raise(s, result.risk, at);
 noteUncertain(s, result.flags);
 // Latches for the session, like risk; the window text is checked too so markers spread over several lines still count.
 s.coverage = worstCoverage([s.coverage || 'supported', s.segments.at(-1).coverage, coverageOf(recent.map(x => x.text).join(' '))]);
 s.status = 'analyzed';
 return s;
}

// Re-run the window after a segment's speaker changed (for example the LLM contradicted a "senior" label). Risk
// still only rises: a later relabel can add evidence but never withdraw an escalation already shown.
export function reanalyze(s, now = s.segments.at(-1)?.at ?? Date.now()) {
 const result = analyze(recentOf(s, now));
 record(s, result.flags, now);
 raise(s, result.risk, now);
 noteUncertain(s, result.flags);
 return s;
}

export function intervention(s) {
 const latest = s.segments.at(-1)?.at ?? Date.now(), recent = recentOf(s, latest), currentFlags = analyze(recent).flags;
 const text = normalize(recent.map(x => x.text).join(' '));
 const payment = currentFlags.some(f => f.tactic === 'payment');
 return { askCodeWord: currentFlags.some(f => f.tactic === 'family_emergency' && f.grade !== 'weak'), coolingOff: payment && AMOUNT.test(text) };
}

// The single grounding validator for model-proposed evidence. A model flag must quote the transcript exactly,
// must not sit in a negated or advice clause, and cannot create danger without rule corroboration.
export function groundedFlags(segments, flags) {
 return flags.filter(f => {
  const seg = segments.find(x => x.id === f.segmentId);
  if (!seg || typeof f.quote !== 'string' || f.quote.trim().length < 5 || !seg.text.includes(f.quote) || !Object.hasOwn(tacticLabels, f.tactic)) return false;
  const clauses = splitClauses(seg.text).filter(c => c.includes(f.quote) || f.quote.includes(c));
  return !advice(f.quote) && !clauses.some(advice);
 }).map(f => ({ tactic: f.tactic, label: tacticLabels[f.tactic], segmentId: f.segmentId, quote: f.quote, source: 'llm' }));
}

const SINGLE_TRIGGER = new Set(['credential', 'impossible']);
// A lure is not an ask: a prize, guaranteed returns or a bare "I am from X" only matter once the caller also wants
// something (money, a code, a document, an app, secrecy, a threat). Until then a model-only lure flag is dropped, so a
// friendly announcement ("a bonus for pensioners") does not warn before the request arrives (role-play C24).
const LURE_ONLY = new Set(['prize', 'investment_bait', 'authority']);

export function mergeGroundedFlags(s, flags, now = Date.now()) {
 const recent = recentOf(s, now);
 const ruleFlags = analyze(recent).flags;
 const checked = groundedFlags(recent, flags);
 const hasAsk = [...ruleFlags, ...checked].some(f => !LURE_ONLY.has(f.tactic));
 const grounded = hasAsk ? checked : checked.filter(f => !LURE_ONLY.has(f.tactic));
 // A model-only secret-code or digital-arrest flag needs the same tactic from the rules before it can decide risk.
 const decisive = grounded.filter(f => !SINGLE_TRIGGER.has(f.tactic) || ruleFlags.some(r => r.tactic === f.tactic));
 let risk = riskFor([...ruleFlags, ...decisive]);
 if (grounded.length && risk === 'safe') risk = 'careful'; // grounded model evidence still asks for caution
 if (risk === 'danger' && riskFor(ruleFlags) !== 'danger' && new Set(ruleFlags.map(f => f.tactic)).size < 2) risk = 'careful';
 record(s, grounded, now);
 raise(s, risk, now);
}

// Explicit allow-list: the profile capability and internal state never leave the server.
const SESSION_FIELDS = ['id', 'createdAt', 'expiresAt', 'language', 'mode', 'risk', 'status', 'segments', 'flags', 'coverage', 'firstWarningAt', 'sharing', 'classifier', 'llmStatus', 'codeWordConfigured', 'coolingOffUntil', 'askCodeWord', 'trustedVoice', 'health', 'gaps', 'clock', 'uncertain', 'score'];
export function sessionView(s) {
 const view = Object.fromEntries(SESSION_FIELDS.filter(key => key in s).map(key => [key, s[key]]));
 if (s.health) view.health = { ...s.health, llm: s.llmStatus };
 return view;
}

export function familyView(s) {
 return { risk: s.risk, uncertain: !!s.uncertain, status: s.status, hasSpeech: s.segments.length > 0, language: s.language, coverage: s.coverage || 'supported', health: s.health?.stt || null, gapCount: s.gaps?.length || 0, gapSeconds: Math.round((s.gaps || []).reduce((a, g) => a + g.endMs - g.startMs, 0) / 100) / 10, reasons: [...new Set(s.flags.filter(f => f.grade !== 'weak').map(f => f.label))], updatedAt: s.segments.at(-1)?.at || s.createdAt, expiresAt: s.expiresAt, mode: s.mode };
}

export function evidencePack(s) {
 const text = s.segments.map(x => x.text).join('\n');
 const upiIds = [...text.matchAll(/[\w.-]+@[a-z][a-z0-9]*/gi)].filter(match => !/\.[a-z]{2,}\b/i.test(text.slice(match.index + match[0].length, match.index + match[0].length + 8))).map(match => match[0]);
 return { schemaVersion: 3, clock: s.clock || 'arrival', gaps: s.gaps || [], sessionId: s.id, createdAt: new Date(s.createdAt).toISOString(), exportedAt: new Date().toISOString(), language: s.language, risk: s.risk, coverage: s.coverage || 'supported', provenance: ['demo', 'text'].includes(s.mode) ? 'synthetic transcript' : 'Gnani Prisma transcript', classifier: s.classifier, flags: s.flags, segments: s.segments, entities: { unverified: true, amounts: [...normalize(text).matchAll(new RegExp(AMOUNT.source, 'giu'))].map(m => m[0]), upiIds, numericIdentifiers: text.match(/\b\d{6,16}\b/g) || [] }, limitations: ['Not a verified caller identity or official complaint.', 'Transcription and tactic detection may be wrong.', `Detection rules cover ${supportedLanguages.map(c => REGISTRY.find(l => l.code === c).name).join(', ')}; other languages are marked, not assessed.`, ...(s.gaps?.length ? ['Some audio was not transcribed during connection problems; see gaps.'] : []), 'No audio retained by this application.'] };
}

import { randomUUID } from 'node:crypto';
import { normalize, coverageOf, worstCoverage } from './normalize.js';
import { REGISTRY, supportedLanguages } from './languages.js';
import en from './packs/en.js';
import hi from './packs/hi.js';
import ta from './packs/ta.js';

export { coverageOf } from './normalize.js';
export { supportedLanguages as languages } from './languages.js';
export const rank = { safe: 0, careful: 1, danger: 2 };
const WINDOW_MS = 60000;
const LEDGER_LIMIT = 200;

// Language packs are data (src/packs). Detection runs over the UNION of every supported pack on every clause, so
// code-mixed speech is matched whichever language each word is in; a pack never needs a language tag to apply.
export const PACKS = [en, hi, ta];
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
export const AMOUNT = /(?:₹|\brs\.?|\binr\b|रु\.?|ரூ\.?)\s*\d[\d,]*(?:\.\d{1,2})?|\b\d[\d,]*(?:\.\d+)?\s*(?:rupees?|rupaye|rupay|rs|lakhs?|crores?|thousand|hazaa?r)\b|\d[\d,]*\s*(?:रुपये|रुपए|हजार|लाख|करोड|ரூபாய்|லட்சம்|ஆயிரம்)|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twenty|fifty|hundred)\s+(?:thousand|lakh|crore)(?:\s+rupees?)?\b/iu;
const SECRET = union(gather('secret'), 'giu'), IDENTITY = union(gather('identity'), 'giu'), PAN_UPPER = /\bPAN\b/gu, DEMAND = union(gather('demand'), 'giu');
const PAYMENT_WORD = union(PACKS.map(p => p.tactics.payment || []));
const AMOUNT_VERB = /\b(?:send|pay|transfer|deposit|bhej\w*)\b|भेज|जमा|அனுப்ப|கட்ட|செலுத்த/iu;
// Entering a UPI PIN to complete a payment you started is normal; only other secret requests count.
const OWN_PAYMENT = /\bto (?:complete|make|confirm) (?:the |your |this )?payment\b/iu;

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
 const t = normalize(clause);
 return !ADVICE_EXCEPT.test(t) && ADVICE.test(t);
}

// Dialogue act of a clause (B-5). Reported and narrated clauses produce WEAK evidence: shown, but unable to escalate
// on their own. A clause aimed at the listener ("you", "aap", "unga", imperative forms) is never reported or narration.
const REPORTED = union(gatherAct('reported')), NARRATION = union(gatherAct('narration')), DEMAND_ACT = union(gatherAct('demand')), SECOND_PERSON = union(gatherAct('secondPerson'));
export function classifyAct(clause) {
 const t = normalize(clause).trim();
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
  const act = classifyAct(text), grade = WEAK_ACTS.has(act) ? 'weak' : 'strong', n = normalize(text);
  for (const { tactic, test } of compiled) if (test(n)) add({ tactic, label: tacticLabels[tactic], segmentId: segment.id, quote, source: 'rule', act, grade, ...(related ? { relatedSegmentIds: related } : {}) });
 };
 for (const s of segments) {
  const clauses = splitClauses(s.text);
  clauses.forEach(clause => scan(clause, s, clauses.length === 1 ? s.text : clause));
  // A comma or conjunction can separate the parts of one request ("Mom, I had an accident"; "the OTP that came, tell
  // me"): adjacent clause pairs are also checked, for tactics neither half shows alone.
  for (let i = 1; i < clauses.length; i++) {
   const a = clauses[i - 1], b = clauses[i];
   if (advice(a) || advice(b)) continue;
   const pair = `${a} ${b}`, na = normalize(a), nb = normalize(b), np = normalize(pair);
   const act = classifyAct(pair), grade = WEAK_ACTS.has(act) ? 'weak' : 'strong';
   for (const { tactic, test } of compiled) if (!test(na) && !test(nb) && test(np)) add({ tactic, label: tacticLabels[tactic], segmentId: s.id, quote: pair, source: 'rule', act, grade });
  }
 }
 // A speech boundary can cut a request in half. Match only adjacent, unfinished utterances within ten seconds.
 for (let i = 1; i < segments.length; i++) {
  const a = segments[i - 1], b = segments[i];
  if (b.at - a.at > 10000 || /[.!?।]$/.test(a.text.trim())) continue;
  const joined = `${a.text} ${b.text}`;
  if (advice(joined)) continue;
  const na = normalize(a.text), nb = normalize(b.text), nj = normalize(joined);
  const act = classifyAct(joined), grade = WEAK_ACTS.has(act) ? 'weak' : 'strong';
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
const remoteToolQuote = /\b(?:apk|anydesk|teamviewer|rustdesk|quick ?support)\b/i;
const traiDisconnect = f => f.tactic === 'authority' && /\b(?:trai|dot)\b/i.test(f.quote);

export function riskFor(flags) {
 // A reported or narrated PRETEXT ("Mom, I had an accident", "my son is in custody") becomes decisive as soon as the
 // same window holds a strong ASK for money, a secret, an app or an identity document. Narration alone stays calm.
 const STRONG_ASK = new Set(['payment', 'credential', 'remote', 'identity', 'advance_fee']), PRETEXT = new Set(['family_emergency', 'authority', 'threat', 'prize', 'investment_bait', 'secrecy', 'urgency', 'camera']);
 const hasAsk = flags.some(f => f.grade !== 'weak' && STRONG_ASK.has(f.tactic));
 const strong = flags.filter(f => f.grade !== 'weak' || (hasAsk && PRETEXT.has(f.tactic)));
 const t = new Set(strong.map(f => f.tactic)), has = x => t.has(x);
 if (DANGER_RULES.some(r => r.all.every(has) && (!r.any || r.any.some(has)))) return 'danger';
 if (has('remote') && strong.some(f => f.tactic === 'remote' && remoteToolQuote.test(f.quote))) return 'danger';
 if (has('threat') && strong.some(traiDisconnect)) return 'danger';
 if ([...t].some(x => x !== 'payment')) return 'careful';
 // Weak evidence alone is shown but only asks for care when it adds up to two different tactics.
 const weak = new Set(flags.filter(f => f.grade === 'weak' && f.tactic !== 'payment').map(f => f.tactic));
 return weak.size >= 2 ? 'careful' : 'safe';
}

export function createSession(language, mode, now = Date.now()) {
 return { id: randomUUID(), createdAt: now, expiresAt: now + 900000, language, mode, risk: 'safe', status: 'waiting', segments: [], flags: [], coverage: 'supported', firstWarningAt: null, sharing: false, classifier: 'rules', llmStatus: 'not configured' };
}

// Append-only evidence ledger: what justified an escalation stays visible after the 60-second window moves on.
function record(s, flags, at) {
 for (const f of flags) if (!s.flags.some(x => x.tactic === f.tactic && x.segmentId === f.segmentId && x.source === f.source)) s.flags.push({ ...f, at });
 if (s.flags.length > LEDGER_LIMIT) s.flags = s.flags.slice(-LEDGER_LIMIT);
}
const recentOf = (s, now) => s.segments.filter(x => now - x.at <= WINDOW_MS);
function raise(s, risk, at) {
 if (rank[risk] > rank[s.risk]) s.risk = risk;
 if (s.risk !== 'safe' && !s.firstWarningAt) s.firstWarningAt = at;
}

export function appendSegment(s, text, at = Date.now(), id = randomUUID()) {
 if (s.segments.some(x => x.id === id)) return s;
 s.segments.push({ id, text, at, coverage: coverageOf(text) });
 s.segments = s.segments.slice(-200);
 const recent = recentOf(s, at);
 const result = analyze(recent);
 record(s, result.flags, at);
 raise(s, result.risk, at);
 // Latches for the session, like risk; the window text is checked too so markers spread over several lines still count.
 s.coverage = worstCoverage([s.coverage || 'supported', s.segments.at(-1).coverage, coverageOf(recent.map(x => x.text).join(' '))]);
 s.status = 'analyzed';
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
export function mergeGroundedFlags(s, flags, now = Date.now()) {
 const recent = recentOf(s, now);
 const ruleFlags = analyze(recent).flags, grounded = groundedFlags(recent, flags);
 // A model-only secret-code or digital-arrest flag needs the same tactic from the rules before it can decide risk.
 const decisive = grounded.filter(f => !SINGLE_TRIGGER.has(f.tactic) || ruleFlags.some(r => r.tactic === f.tactic));
 let risk = riskFor([...ruleFlags, ...decisive]);
 if (grounded.length && risk === 'safe') risk = 'careful'; // grounded model evidence still asks for caution
 if (risk === 'danger' && riskFor(ruleFlags) !== 'danger' && new Set(ruleFlags.map(f => f.tactic)).size < 2) risk = 'careful';
 record(s, grounded, now);
 raise(s, risk, now);
}

// Explicit allow-list: the profile capability and internal state never leave the server.
const SESSION_FIELDS = ['id', 'createdAt', 'expiresAt', 'language', 'mode', 'risk', 'status', 'segments', 'flags', 'coverage', 'firstWarningAt', 'sharing', 'classifier', 'llmStatus', 'codeWordConfigured', 'coolingOffUntil', 'askCodeWord', 'trustedVoice', 'health', 'gaps', 'clock'];
export function sessionView(s) {
 const view = Object.fromEntries(SESSION_FIELDS.filter(key => key in s).map(key => [key, s[key]]));
 if (s.health) view.health = { ...s.health, llm: s.llmStatus };
 return view;
}

export function familyView(s) {
 return { risk: s.risk, status: s.status, hasSpeech: s.segments.length > 0, language: s.language, coverage: s.coverage || 'supported', health: s.health?.stt || null, gapCount: s.gaps?.length || 0, gapSeconds: Math.round((s.gaps || []).reduce((a, g) => a + g.endMs - g.startMs, 0) / 100) / 10, reasons: [...new Set(s.flags.filter(f => f.grade !== 'weak').map(f => f.label))], updatedAt: s.segments.at(-1)?.at || s.createdAt, expiresAt: s.expiresAt, mode: s.mode };
}

export function evidencePack(s) {
 const text = s.segments.map(x => x.text).join('\n');
 const upiIds = [...text.matchAll(/[\w.-]+@[a-z][a-z0-9]*/gi)].filter(match => !/\.[a-z]{2,}\b/i.test(text.slice(match.index + match[0].length, match.index + match[0].length + 8))).map(match => match[0]);
 return { schemaVersion: 3, clock: s.clock || 'arrival', gaps: s.gaps || [], sessionId: s.id, createdAt: new Date(s.createdAt).toISOString(), exportedAt: new Date().toISOString(), language: s.language, risk: s.risk, coverage: s.coverage || 'supported', provenance: ['demo', 'text'].includes(s.mode) ? 'synthetic transcript' : 'Gnani Prisma transcript', classifier: s.classifier, flags: s.flags, segments: s.segments, entities: { unverified: true, amounts: [...normalize(text).matchAll(new RegExp(AMOUNT.source, 'giu'))].map(m => m[0]), upiIds, numericIdentifiers: text.match(/\b\d{6,16}\b/g) || [] }, limitations: ['Not a verified caller identity or official complaint.', 'Transcription and tactic detection may be wrong.', `Detection rules cover ${supportedLanguages.map(c => REGISTRY.find(l => l.code === c).name).join(', ')}; other languages are marked, not assessed.`, ...(s.gaps?.length ? ['Some audio was not transcribed during connection problems; see gaps.'] : []), 'No audio retained by this application.'] };
}

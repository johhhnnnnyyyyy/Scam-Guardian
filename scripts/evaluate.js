// Text evaluation. Reports k/n with Wilson 95% intervals, never a bare rate. The authored fixtures are tuning data;
// the twins are development hard negatives; an independent held-out set is read only with --heldout.
import { calls } from '../fixtures/calls.js';
import { twins } from '../fixtures/twins.js';
import { familyCases } from '../fixtures/families.js';
import { malayalamCases } from '../fixtures/malayalam.js';
import { calls as round1 } from '../fixtures/heldout/round1.js';
import { createSession, appendSegment } from '../src/engine.js';
import { tagTokens } from '../src/languages.js';
import { wilson, formatInterval, cmi, MIN_SLICE_FOR_CLAIM } from '../src/evaluation.js';
import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const run = c => {
 const s = createSession(c.language, 'demo', 0);
 let firstRed = null;
 const begin = performance.now();
 c.segments.forEach((text, i) => { appendSegment(s, text, i * 2000 + 1); if (s.risk === 'danger' && firstRed === null) firstRed = i; });
 const tags = c.segments.flatMap(text => tagTokens(text, c.language));
 return { id: c.id, group: c.group, type: c.type, language: c.language, label: c.label, risk: s.risk, uncertain: !!s.uncertain, score: s.score, coverage: s.coverage, firstRedSegment: firstRed, cmi: Number(cmi(tags).toFixed(1)), ruleRuntimeMs: performance.now() - begin };
};
const slice = rows => {
 const scams = rows.filter(r => r.label === 'scam'), benign = rows.filter(r => r.label === 'benign');
 const recall = wilson(scams.filter(r => r.risk === 'danger').length, scams.length);
 const red = wilson(benign.filter(r => r.risk === 'danger').length, benign.length);
 const amberOrRed = wilson(benign.filter(r => r.risk !== 'safe').length, benign.length);
 return { scamsRed: formatInterval(recall), benignRed: formatInterval(red), benignAmberOrRed: formatInterval(amberOrRed), claimable: scams.length >= MIN_SLICE_FOR_CLAIM && benign.length >= MIN_SLICE_FOR_CLAIM };
};

const tuning = calls.map(run);
const twinRows = twins.map(run);
const familyRows = familyCases.map(c => ({ ...run(c), family: c.family, expect: c.expect }));
const round1Rows = round1.map(run);
const malayalamRows = malayalamCases.map(c => ({ ...run({ ...c, language: 'ml-IN' }), expect: c.expect }));
const famHit = r => (r.expect === 'danger' ? r.risk === 'danger' : r.risk !== 'safe');
const report = {
 generatedAt: new Date().toISOString(),
 kind: 'text evaluation',
 limitations: ['Tuning fixtures were used to write the rules: they show regressions, not generalisation.', 'Twins were written by the same author after tuning: development hard negatives, not independent.', 'Scam-family cases (batch 3) are development data: the rules were tuned on them (before tuning: 15/59 scams at the expected level, 5/24 look-alikes alarmed).', 'Malayalam/Manglish set (batch 5) is development data written by the same author, not native-reviewed: the pack was tuned on it (before tuning: 11/14 scams at the expected level, 3/10 look-alikes alarmed).', 'No audio, STT, noise, WER or end-to-end timing measured.', `A slice is marked claimable only with at least ${MIN_SLICE_FOR_CLAIM} scams and ${MIN_SLICE_FOR_CLAIM} benign items.`],
 tuning: Object.fromEntries(['all', 'en-IN', 'hi-IN', 'ta-IN'].map(l => [l, slice(tuning.filter(r => l === 'all' || r.language === l))])),
 twins: { all: slice(twinRows), ...Object.fromEntries([...new Set(twins.map(x => x.type))].map(type => [type, slice(twinRows.filter(r => r.type === type))])) },
 families: { all: { scamsAtExpectedLevel: formatInterval(wilson(familyRows.filter(r => r.label === 'scam' && famHit(r)).length, familyRows.filter(r => r.label === 'scam').length)), benignAmberOrRed: formatInterval(wilson(familyRows.filter(r => r.label === 'benign' && r.risk !== 'safe').length, familyRows.filter(r => r.label === 'benign').length)) }, misses: familyRows.filter(r => (r.label === 'scam' && !famHit(r)) || (r.label === 'benign' && r.risk !== 'safe')).map(({ id, risk }) => ({ id, risk })) },
 malayalam: { scamsAtExpectedLevel: formatInterval(wilson(malayalamRows.filter(r => r.label === 'scam' && famHit(r)).length, malayalamRows.filter(r => r.label === 'scam').length)), benignAmberOrRed: formatInterval(wilson(malayalamRows.filter(r => r.label === 'benign' && r.risk !== 'safe').length, malayalamRows.filter(r => r.label === 'benign').length)), misses: malayalamRows.filter(r => (r.label === 'scam' && !famHit(r)) || (r.label === 'benign' && r.risk !== 'safe')).map(({ id, risk }) => ({ id, risk })) },
 heldoutRound1: { note: 'Written blind, measured once with the batch 5 rules (19/60 scams red, 39/60 at least careful, 13/60 benign careful, 0/60 benign red), then used to find batch 6 gaps: now development data.', ...Object.fromEntries(['all', 'en-IN', 'hi-IN', 'ta-IN', 'ml-IN'].map(l => [l, slice(round1Rows.filter(r => l === 'all' || r.language === l))])) },
 twinFalseAlarms: twinRows.filter(r => r.risk !== 'safe').map(({ id, type, risk }) => ({ id, type, risk })),
 misses: tuning.filter(r => r.label === 'scam' && r.risk !== 'danger').map(({ id, risk, uncertain }) => ({ id, risk, uncertain })),
 uncertain: { scams: [...tuning, ...familyRows].filter(r => r.label === 'scam' && r.uncertain).length, benign: [...tuning, ...twinRows, ...familyRows].filter(r => r.label === 'benign' && r.uncertain).length },
};

// Held-out data is read only when explicitly requested, and every run prints the manifest hash it used.
if (process.argv.includes('--heldout')) {
 const path = new URL('../fixtures/heldout/calls.js', import.meta.url);
 try {
  await access(path);
  const source = await readFile(path);
  const { calls: heldout } = await import(path.href);
  const rows = heldout.map(run);
  report.heldout = { manifestSha256: createHash('sha256').update(source).digest('hex'), ...Object.fromEntries(['all', 'en-IN', 'hi-IN', 'ta-IN', 'ml-IN'].map(l => [l, { ...slice(rows.filter(r => l === 'all' || r.language === l)), scamsAtLeastCareful: formatInterval(wilson(rows.filter(r => (l === 'all' || r.language === l) && r.label === 'scam' && r.risk !== 'safe').length, rows.filter(r => (l === 'all' || r.language === l) && r.label === 'scam').length)) }])), misses: rows.filter(r => (r.label === 'scam' && r.risk === 'safe') || (r.label === 'benign' && r.risk !== 'safe')).map(({ id, risk }) => ({ id, risk })) };
 } catch { report.heldout = { note: 'No independent held-out set exists yet (fixtures/heldout/calls.js). It must be written after the rules are frozen, by someone who did not tune them, and native-reviewed.' }; }
}

const results = [...tuning, ...twinRows, ...familyRows, ...malayalamRows, ...round1Rows];
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/text-evaluation.json', JSON.stringify({ ...report, results }, null, 2));
console.log(JSON.stringify({ ...report, report: 'artifacts/text-evaluation.json' }, null, 2));

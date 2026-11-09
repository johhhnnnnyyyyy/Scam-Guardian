// Text evaluation. Reports k/n with Wilson 95% intervals, never a bare rate. The authored fixtures are tuning data;
// the twins are development hard negatives; an independent held-out set is read only with --heldout.
import { calls } from '../fixtures/calls.js';
import { twins } from '../fixtures/twins.js';
import { familyCases } from '../fixtures/families.js';
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
 return { id: c.id, group: c.group, type: c.type, language: c.language, label: c.label, risk: s.risk, coverage: s.coverage, firstRedSegment: firstRed, cmi: Number(cmi(tags).toFixed(1)), ruleRuntimeMs: performance.now() - begin };
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
const famHit = r => (r.expect === 'danger' ? r.risk === 'danger' : r.risk !== 'safe');
const report = {
 generatedAt: new Date().toISOString(),
 kind: 'text evaluation',
 limitations: ['Tuning fixtures were used to write the rules: they show regressions, not generalisation.', 'Twins were written by the same author after tuning: development hard negatives, not independent.', 'Scam-family cases (batch 3) are development data: the rules were tuned on them (before tuning: 15/59 scams at the expected level, 5/24 look-alikes alarmed).', 'No audio, STT, noise, WER or end-to-end timing measured.', `A slice is marked claimable only with at least ${MIN_SLICE_FOR_CLAIM} scams and ${MIN_SLICE_FOR_CLAIM} benign items.`],
 tuning: Object.fromEntries(['all', 'en-IN', 'hi-IN', 'ta-IN'].map(l => [l, slice(tuning.filter(r => l === 'all' || r.language === l))])),
 twins: { all: slice(twinRows), ...Object.fromEntries([...new Set(twins.map(x => x.type))].map(type => [type, slice(twinRows.filter(r => r.type === type))])) },
 families: { all: { scamsAtExpectedLevel: formatInterval(wilson(familyRows.filter(r => r.label === 'scam' && famHit(r)).length, familyRows.filter(r => r.label === 'scam').length)), benignAmberOrRed: formatInterval(wilson(familyRows.filter(r => r.label === 'benign' && r.risk !== 'safe').length, familyRows.filter(r => r.label === 'benign').length)) }, misses: familyRows.filter(r => (r.label === 'scam' && !famHit(r)) || (r.label === 'benign' && r.risk !== 'safe')).map(({ id, risk }) => ({ id, risk })) },
 twinFalseAlarms: twinRows.filter(r => r.risk !== 'safe').map(({ id, type, risk }) => ({ id, type, risk })),
 misses: tuning.filter(r => r.label === 'scam' && r.risk !== 'danger').map(({ id, risk }) => ({ id, risk })),
};

// Held-out data is read only when explicitly requested, and every run prints the manifest hash it used.
if (process.argv.includes('--heldout')) {
 const path = new URL('../fixtures/heldout/calls.js', import.meta.url);
 try {
  await access(path);
  const source = await readFile(path);
  const { calls: heldout } = await import(path.href);
  report.heldout = { manifestSha256: createHash('sha256').update(source).digest('hex'), ...slice(heldout.map(run)) };
 } catch { report.heldout = { note: 'No independent held-out set exists yet (fixtures/heldout/calls.js). It must be written after the rules are frozen, by someone who did not tune them, and native-reviewed.' }; }
}

const results = [...tuning, ...twinRows, ...familyRows];
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/text-evaluation.json', JSON.stringify({ ...report, results }, null, 2));
console.log(JSON.stringify({ ...report, report: 'artifacts/text-evaluation.json' }, null, 2));

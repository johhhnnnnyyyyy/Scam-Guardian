import test from 'node:test';
import assert from 'node:assert/strict';
import { malayalamCases } from '../fixtures/malayalam.js';
import { createSession, appendSegment } from '../src/engine.js';
import { normalize, coverageOf } from '../src/normalize.js';
import { supportedLanguages } from '../src/languages.js';

const run = c => { const s = createSession('ml-IN', 'demo', 0); c.segments.forEach((t, i) => appendSegment(s, t, i * 2000 + 1)); return s; };

test('batch 5: Malayalam is a supported language and Malayalam script counts as covered', () => {
 assert.ok(supportedLanguages.includes('ml-IN'));
 assert.equal(coverageOf('നിങ്ങൾ ഡിജിറ്റൽ അറസ്റ്റിലാണ്'), 'supported');
});

test('batch 5: Malayalam chillu letters in the older ZWJ encoding normalise to atomic letters', () => {
 assert.equal(normalize('നിങ്ങള്‍ ഡിജിറ്റല്‍'), 'നിങ്ങൾ ഡിജിറ്റൽ');
 assert.equal(normalize('ഒ ടി പി'), 'ഒടിപി');
 assert.equal(normalize('൫൦൦'), '500');
});

test('batch 5: Malayalam and Manglish scams reach their expected level; look-alikes stay calm', () => {
 for (const c of malayalamCases) {
  const s = run(c);
  if (c.label === 'benign') assert.equal(s.risk, 'safe', c.id);
  else if (c.expect === 'danger') assert.equal(s.risk, 'danger', c.id);
  else assert.notEqual(s.risk, 'safe', c.id);
 }
});

test('batch 5: Manglish code-mix — an English secret word with a Malayalam or Manglish demand verb', () => {
 for (const line of ['Ningalude OTP parayu.', 'OTP പറയൂ.', 'ഫോണിൽ വന്ന OTP പറഞ്ഞു തരൂ.']) {
  const s = createSession('ml-IN', 'demo', 0); appendSegment(s, line, 1);
  assert.equal(s.risk, 'danger', line);
 }
 for (const line of ['OTP aarkkum share cheyyaruthu.', 'ബാങ്ക് ഒരിക്കലും ഒടിപി ചോദിക്കില്ല.']) {
  const s = createSession('ml-IN', 'demo', 0); appendSegment(s, line, 1);
  assert.equal(s.risk, 'safe', line);
 }
});

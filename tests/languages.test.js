import test from 'node:test';
import assert from 'node:assert/strict';
import { REGISTRY, supportedLanguages, tagTokens, uncoveredLanguages } from '../src/languages.js';
import { coverageOf } from '../src/normalize.js';
import { wilson, splitOf, cmi } from '../src/evaluation.js';
import { twins } from '../fixtures/twins.js';

test('B-21: the registry lists Gnani\'s ten STT languages, only tested ones are supported, Odia is not offered', () => {
 assert.equal(REGISTRY.filter(l => l.status !== 'not_offered').length, 10);
 assert.deepEqual(supportedLanguages, ['en-IN', 'hi-IN', 'ta-IN']);
 assert.equal(REGISTRY.find(l => l.code === 'or-IN').status, 'not_offered');
});

test('B-3: word-level tags separate scripts, Hinglish, Tanglish and Marathi', () => {
 const tags = tagTokens('Main police se bol raha hoon, abhi paise bhejo').map(t => t.lang);
 assert.ok(tags.filter(l => l === 'hi-IN').length >= 4);
 assert.deepEqual(tagTokens('মুই').map(t => t.lang), ['bn-IN']);
 assert.equal(tagTokens('मी पोलीस बोलतोय')[0].lang, 'mr-IN');
 assert.equal(tagTokens('naan police')[0].lang, 'ta-IN');
});

test('B-3: coverage marks romanised uncovered languages as partial, one stray word does not', () => {
 assert.equal(coverageOf('ami police theke bolchi, apni arrest hobe'), 'partial');
 assert.equal(coverageOf('nenu police, meeru arrest avutaru'), 'partial');
 assert.equal(coverageOf('Ani is my friend from school'), 'supported');
 assert.equal(coverageOf('Main police se bol raha hoon'), 'supported');
 assert.deepEqual(uncoveredLanguages('मी पोलीस बोलतोय'), ['mr-IN']);
});

test('F-19: Wilson intervals, deterministic group split and the code-mixing index', () => {
 const w = wilson(50, 50);
 assert.ok(Math.abs(w.low - 0.9287) < 0.001);
 assert.equal(w.high, 1);
 assert.ok(Math.abs(wilson(0, 50).high - 0.0713) < 0.001);
 assert.equal(splitOf('digital_arrest'), splitOf('digital_arrest'));
 assert.equal(cmi([{ lang: 'en-IN' }, { lang: 'en-IN' }]), 0);
 assert.equal(cmi([{ lang: 'en-IN' }, { lang: 'hi-IN' }]), 50);
 assert.ok(twins.every(x => x.label === 'benign' && x.group && x.type));
});

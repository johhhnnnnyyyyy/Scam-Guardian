import { uncoveredLanguages } from './languages.js';

// Text normalisation for detection only. Evidence quotes always come from the original text.

const ACRONYMS = new Set(['otp', 'cvv', 'pin', 'upi', 'cbi', 'atm', 'kyc', 'ncb', 'rbi', 'apk', 'trai', 'mpin', 'nia']);
const DEVANAGARI_SPACED = [[/ओ\s+टी\s+पी/gu, 'ओटीपी'], [/सी\s+बी\s+आई/gu, 'सीबीआई'], [/सी\s+वी\s+वी/gu, 'सीवीवी'], [/यू\s+पी\s+आई/gu, 'यूपीआई']];
const TAMIL_SPACED = [[/ஓ\s+டி\s+பி/gu, 'ஓடிபி']];

export function normalize(text) {
 let t = String(text).normalize('NFC');
 t = t.replace(/[​-‍⁠﻿]/g, '');          // zero-width joiners and spaces
 t = t.replace(/़/g, '');                                // Devanagari nukta: गिरफ़्तार → गिरफ्तार
 t = t.replace(/[‘’ʼ]/g, "'");                 // curly apostrophes
 t = t.replace(/[०-९]/gu, d => String(d.charCodeAt(0) - 0x966));
 t = t.replace(/[௦-௯]/gu, d => String(d.charCodeAt(0) - 0xBE6));
 // Letters spelled out by speech recognition: "O T P", "o.t.p", "c-v-v".
 t = t.replace(/\b[a-z](?:[\s.\-][a-z]){1,3}\b\.?/giu, m => {
  const joined = m.replace(/[\s.\-]/g, '');
  return ACRONYMS.has(joined.toLowerCase()) ? joined : m;
 });
 for (const [re, value] of [...DEVANAGARI_SPACED, ...TAMIL_SPACED]) t = t.replace(re, value);
 return t.replace(/\s+/g, ' ');
}

const SCRIPTS = {
 latin: /\p{Script=Latin}/u,
 devanagari: /\p{Script=Devanagari}/u,
 tamil: /\p{Script=Tamil}/u,
 bengali: /\p{Script=Bengali}/u,
 telugu: /\p{Script=Telugu}/u,
 kannada: /\p{Script=Kannada}/u,
 malayalam: /\p{Script=Malayalam}/u,
 gujarati: /\p{Script=Gujarati}/u,
 gurmukhi: /\p{Script=Gurmukhi}/u,
 odia: /\p{Script=Oriya}/u,
};
const COVERED_SCRIPTS = new Set(['latin', 'devanagari', 'tamil']);

export function scriptCounts(text) {
 const counts = {};
 for (const ch of String(text)) {
  if (!/\p{L}|\p{M}/u.test(ch)) continue;
  for (const [name, re] of Object.entries(SCRIPTS)) if (re.test(ch)) { counts[name] = (counts[name] || 0) + 1; break; }
 }
 return counts;
}

// supported: every script and language here has rules. partial: a covered script carrying an uncovered language.
// unknown_language: a meaningful share of letters is in a script the rules do not cover.
export function coverageOf(text) {
 const counts = scriptCounts(text);
 const total = Object.values(counts).reduce((a, b) => a + b, 0);
 if (!total) return 'supported';
 const uncovered = Object.entries(counts).filter(([name]) => !COVERED_SCRIPTS.has(name)).reduce((a, [, n]) => a + n, 0);
 if (uncovered / total >= 0.2) return 'unknown_language';
 // A covered script can carry an uncovered language (Marathi in Devanagari, romanised Bengali in Latin letters).
 if (uncoveredLanguages(text).length) return 'partial';
 return 'supported';
}

const ORDER = { supported: 0, partial: 1, unknown_language: 2 };
export function worstCoverage(values) {
 return values.reduce((worst, v) => (ORDER[v] > ORDER[worst] ? v : worst), 'supported');
}

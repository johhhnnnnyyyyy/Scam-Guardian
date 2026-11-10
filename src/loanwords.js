// English loanwords as speech-to-text writes them in Indian scripts. Spoken Manglish comes back from ml-IN speech
// recognition in Malayalam script ("ബാങ്കിൽ", "കെവൈസി") or mixed with Latin ("KYC update ചെയ്തിട്ടില്ല"), while the
// rules were written partly in script and partly in romanised form. For DETECTION ONLY, src/normalize.js adds two
// extra renderings of each clause on their own lines: script loanwords in Latin, and Latin loanwords in script.
// Patterns never span lines, so the renderings cannot be stitched together. Quotes always use the original text.
//
// Each entry: [Latin, script stem, ...more script stems]. A script stem is matched at the start of a word, so the
// inflected forms (ബാങ്കിൽ = "in the bank") are covered; the Latin rendering keeps the case ending in script.
// Composed from common transliterations; NEEDS NATIVE REVIEW (pending decision 29).
export const MALAYALAM = [
 ['bank', 'ബാങ്ക'], ['account', 'അക്കൗണ്ട', 'അക്കൌണ്ട', 'എക്കൗണ്ട'], ['block', 'ബ്ലോക്ക'], ['update', 'അപ്ഡേറ്റ', 'അപ്ഡേറ്റ്'],
 ['kyc', 'കെവൈസി', 'കെ വൈ സി', 'കെ.വൈ.സി'], ['otp', 'ഒടിപി', 'ഓടിപി', 'ഒ.ടി.പി'], ['pin', 'പിൻ'], ['password', 'പാസ്‌വേഡ', 'പാസ്വേഡ', 'പാസ്സ്‌വേഡ'],
 ['upi', 'യുപിഐ', 'യു.പി.ഐ'], ['cvv', 'സിവിവി'], ['atm', 'എടിഎം'], ['police', 'പോലീസ', 'പൊലീസ'], ['arrest', 'അറസ്റ്റ'], ['cbi', 'സിബിഐ'],
 ['customs', 'കസ്റ്റംസ'], ['officer', 'ഓഫീസർ', 'ഓഫിസർ'], ['transfer', 'ട്രാൻസ്ഫർ', 'ട്രാൻസ്‌ഫർ'], ['app', 'ആപ്പ'], ['link', 'ലിങ്ക'],
 ['download', 'ഡൗൺലോഡ', 'ഡൌൺലോഡ'], ['install', 'ഇൻസ്റ്റാൾ', 'ഇൻസ്റ്റോൾ'], ['click', 'ക്ലിക്ക'], ['lottery', 'ലോട്ടറി'], ['prize', 'പ്രൈസ'],
 ['fee', 'ഫീസ', 'ഫീ'], ['deposit', 'ഡെപ്പോസിറ്റ', 'ഡിപ്പോസിറ്റ'], ['gift card', 'ഗിഫ്റ്റ് കാർഡ'], ['card', 'കാർഡ'], ['video call', 'വീഡിയോ കോൾ'],
 ['camera', 'ക്യാമറ'], ['aadhaar', 'ആധാർ'], ['parcel', 'പാഴ്സൽ', 'പാർസൽ'], ['courier', 'കൊറിയർ', 'കുറിയർ'], ['sim', 'സിം'],
 ['number', 'നമ്പർ'], ['thousand', 'തൗസൻഡ', 'തൗസന്റ'], ['congratulations', 'കൺഗ്രാജുലേഷൻസ', 'കോൺഗ്രാജുലേഷൻസ'], ['processing', 'പ്രോസസിംഗ', 'പ്രോസസ്സിംഗ'],
 ['screen share', 'സ്ക്രീൻ ഷെയർ'], ['share', 'ഷെയർ'], ['digital arrest', 'ഡിജിറ്റൽ അറസ്റ്റ'], ['money', 'മണി'], ['cash', 'ക്യാഷ'],
 ['urgent', 'അർജന്റ'], ['fine', 'ഫൈൻ'], ['penalty', 'പെനാൽറ്റി'], ['court', 'കോടതി'], ['warrant', 'വാറന്റ'], ['case', 'കേസ'],
];

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byLength = (a, b) => b.length - a.length;

function compile(table) {
 const toLatin = table.flatMap(([latin, ...stems]) => stems.map(stem => [stem, latin])).sort((a, b) => byLength(a[0], b[0]));
 const toScript = table.map(([latin, stem]) => [latin, stem]).sort((a, b) => byLength(a[0], b[0]));
 const scriptRe = new RegExp(`(?<![\\p{L}\\p{M}])(?:${toLatin.map(([s]) => escape(s)).join('|')})`, 'gu');
 const latinRe = new RegExp(`\\b(?:${toScript.map(([l]) => escape(l).replace(/ /g, '\\s+')).join('|')})\\b`, 'giu');
 const latinOf = new Map(toLatin), scriptOf = new Map(toScript.map(([l, s]) => [l, s]));
 // A script stem is a word start; add the virama-closed form back when the stem ends a word ("ബാങ്ക" → "ബാങ്ക്").
 return {
  latin: t => t.replace(scriptRe, m => ` ${latinOf.get(m)}`).replace(/ {2,}/g, ' ').trim(),
  script: t => t.replace(latinRe, m => { const s = scriptOf.get(m.toLowerCase().replace(/\s+/g, ' ')); return /[ക-ഹ]$/u.test(s) ? `${s}്` : s; }),
 };
}

const ML = compile(MALAYALAM);
const MALAYALAM_LETTER = /\p{Script=Malayalam}/u;

// Extra renderings for detection, or [] when a clause has nothing to convert. Only clauses containing Malayalam are
// converted, so English, Hindi and Tamil text is untouched.
export function renderings(t) {
 if (!MALAYALAM_LETTER.test(t)) return [];
 const out = [ML.latin(t), ML.script(t)].filter(x => x && x !== t);
 return [...new Set(out)];
}

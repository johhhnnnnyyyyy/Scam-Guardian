// Language registry for Gnani's ten STT codes, and a word-level tagger. Data only: adding a language means
// adding an entry here, not editing detector code. Word lists are proposals that need native-speaker review
// before any language moves to 'supported' (status changes are owner decisions; see docs/DECISIONS.md).
//
// status: supported = detection rules, warning copy and voices exist and are tested;
//         planned   = Gnani transcribes it, but the detector has no rules yet, so sessions show "not covered";
//         not_offered = not in Gnani's documented STT list.

export const REGISTRY = [
 { code: 'en-IN', name: 'English', status: 'supported', scripts: ['latin'], codeMix: null },
 { code: 'hi-IN', name: 'Hindi', status: 'supported', scripts: ['devanagari', 'latin'], codeMix: 'Hinglish' },
 { code: 'ta-IN', name: 'Tamil', status: 'supported', scripts: ['tamil', 'latin'], codeMix: 'Tanglish' },
 { code: 'bn-IN', name: 'Bengali', status: 'planned', scripts: ['bengali', 'latin'], codeMix: 'Benglish' },
 { code: 'te-IN', name: 'Telugu', status: 'planned', scripts: ['telugu', 'latin'], codeMix: 'Tenglish' },
 { code: 'kn-IN', name: 'Kannada', status: 'planned', scripts: ['kannada', 'latin'], codeMix: 'Kanglish' },
 { code: 'ml-IN', name: 'Malayalam', status: 'planned', scripts: ['malayalam', 'latin'], codeMix: 'Manglish' },
 { code: 'mr-IN', name: 'Marathi', status: 'planned', scripts: ['devanagari', 'latin'], codeMix: 'Minglish' },
 { code: 'gu-IN', name: 'Gujarati', status: 'planned', scripts: ['gujarati', 'latin'], codeMix: 'Gujlish' },
 { code: 'pa-IN', name: 'Punjabi', status: 'planned', scripts: ['gurmukhi', 'latin'], codeMix: 'Punglish' },
 { code: 'or-IN', name: 'Odia', status: 'not_offered', scripts: ['odia'], codeMix: null },
];
export const supportedLanguages = REGISTRY.filter(l => l.status === 'supported').map(l => l.code);
const byScript = {};
for (const l of REGISTRY) for (const s of l.scripts) if (s !== 'latin' && s !== 'devanagari') byScript[s] = l.code;

// Distinctive function words [native review]. Romanised entries exclude tokens that collide with English or
// with another language's common words (to, the, me, no, ne, ki, ke, hi, ho, da, te, pan, che, ate ...).
const MARKERS = {
 'mr-IN': { native: ['आहे', 'आहेत', 'आणि', 'मी', 'तुम्ही', 'तुम्हाला', 'म्हणून', 'त्या', 'काय', 'मला', 'सांगा', 'होईल', 'बोलतोय', 'तुमचा', 'तुमची', 'तुमचे', 'पाठवा', 'नाहीतर', 'सांगू'], roman: ['ahe', 'aahe', 'ani', 'mhanun', 'tumhi', 'tumhala', 'mala', 'tya', 'madhye', 'sanga', 'pathva'] },
 'gu-IN': { roman: ['chhe', 'nathi', 'hato', 'hati', 'shu', 'kem', 'tame', 'tamne', 'ketlu', 'mokalo'] },
 'bn-IN': { roman: ['ami', 'tumi', 'apni', 'ache', 'kore', 'ebong', 'theke', 'jonno', 'nei', 'keno', 'hobe', 'pathan'] },
 'te-IN': { roman: ['nenu', 'meeru', 'mariyu', 'undi', 'kaadu', 'ledu', 'nundi', 'cheppandi', 'ekkada', 'pampandi'] },
 'kn-IN': { roman: ['naanu', 'neevu', 'mattu', 'agide', 'endu', 'hege', 'elli', 'helu', 'maadi', 'kalisi'] },
 'ml-IN': { roman: ['njan', 'ningal', 'ithu', 'athu', 'pinne', 'aanu', 'aayi', 'enthu', 'engane', 'evide', 'ningalude', 'ayakku'] },
 'pa-IN': { roman: ['tusi', 'vich', 'saade', 'tuhaada', 'tuhanu', 'karo ji'] },
 'hi-IN': { roman: ['hai', 'hain', 'mein', 'aur', 'nahi', 'nahin', 'kya', 'aap', 'mujhe', 'aapko', 'abhi', 'kaise', 'bhejo', 'batao', 'bataiye', 'paise', 'karo', 'kijiye', 'raha', 'rahe', 'hoon', 'kisi'] },
 'ta-IN': { roman: ['naan', 'neenga', 'illai', 'idhu', 'adhu', 'ungal', 'unga', 'panam', 'anuppunga', 'sollunga', 'kudunga', 'enna', 'eppadi', 'indha', 'andha', 'romba'] },
};
const ENGLISH = new Set('a an the is are was were be been am i me my mine we us our you your yours he she it its they them their this that these those to of in on at for with from by and or but not no yes do does did have has had will would can could should must may please now just here there what why how when where who which tell give send share call sir madam ok okay hello'.split(' '));
const roman = {};
for (const [code, m] of Object.entries(MARKERS)) for (const w of m.roman || []) roman[w] = code;
const marathiNative = new Set(MARKERS['mr-IN'].native);

const SCRIPT_RE = { latin: /\p{Script=Latin}/u, devanagari: /\p{Script=Devanagari}/u, tamil: /\p{Script=Tamil}/u, bengali: /\p{Script=Bengali}/u, telugu: /\p{Script=Telugu}/u, kannada: /\p{Script=Kannada}/u, malayalam: /\p{Script=Malayalam}/u, gujarati: /\p{Script=Gujarati}/u, gurmukhi: /\p{Script=Gurmukhi}/u, odia: /\p{Script=Oriya}/u };
export function scriptOf(token) {
 for (const [name, re] of Object.entries(SCRIPT_RE)) if (re.test(token)) return name;
 return null;
}

// Tag every token with a script and a language guess. Tags never gate detection rules: they drive coverage,
// evaluation slices and the code-mixing index only, so a tagging error cannot silence a warning.
export function tagTokens(text, prior = null) {
 const tokens = String(text).split(/[\s,.;:!?।|"'()\[\]{}]+/u).filter(Boolean);
 const tags = tokens.map(token => {
  const script = scriptOf(token);
  if (!script) return { token, script: null, lang: 'univ' };
  if (script === 'latin') {
   const w = token.toLowerCase();
   if (roman[w]) return { token, script, lang: roman[w] };
   if (ENGLISH.has(w)) return { token, script, lang: 'en-IN' };
   return { token, script, lang: 'unknown' };
  }
  if (script === 'devanagari') return { token, script, lang: marathiNative.has(token) ? 'mr-IN' : 'hi-IN' };
  return { token, script, lang: byScript[script] || 'unknown' };
 });
 // Unknown Latin words (usually English content words or rarer romanised words) take the nearest known
 // neighbour within two tokens, else the session prior, and stay marked uncertain.
 tags.forEach((t, i) => {
  if (t.lang !== 'unknown') return;
  const near = [tags[i - 1], tags[i + 1], tags[i - 2], tags[i + 2]].find(n => n && !['unknown', 'univ'].includes(n.lang));
  t.lang = near?.lang || prior || 'en-IN';
  t.uncertain = true;
 });
 return tags;
}

const status = Object.fromEntries(REGISTRY.map(l => [l.code, l.status]));
// Languages present in the text that the detector does not cover. Native-script markers count once;
// romanised markers need two distinct hits so a single name or loanword does not trigger "partial".
export function uncoveredLanguages(text) {
 const tags = tagTokens(text).filter(t => !t.uncertain);
 const found = new Set();
 const romanHits = {};
 for (const t of tags) {
  if (status[t.lang] === 'supported' || t.lang === 'univ') continue;
  if (t.script !== 'latin') found.add(t.lang);
  else (romanHits[t.lang] ||= new Set()).add(t.token.toLowerCase());
 }
 for (const [code, words] of Object.entries(romanHits)) if (words.size >= 2) found.add(code);
 return [...found];
}

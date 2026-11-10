import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, appendSegment } from '../src/engine.js';

// Spoken Manglish comes back from speech-to-text (language ml-IN) in Malayalam script, with English words such as
// bank, KYC, OTP or lottery written phonetically in Malayalam letters, or mixed with Latin. The role-play scenarios
// C22 and C23 are spoken in Manglish; these are the same calls as speech recognition would write them.
function play(language, lines) {
 const s = createSession(language, 'demo', 0);
 lines.forEach((text, i) => appendSegment(s, text, i * 4000 + 1, `l${i}`, { speaker: 'caller' }));
 return s;
}

test('C22 KYC + OTP, as speech-to-text writes it in Malayalam script, is Hang up now', () => {
 const s = play('ml-IN', [
  'ഹലോ ചേച്ചി, ഞാൻ ബാങ്കിൽ നിന്നാണ് വിളിക്കുന്നത്.',
  'നിങ്ങളുടെ കെവൈസി അപ്ഡേറ്റ് ചെയ്തിട്ടില്ല, ഇന്ന് അക്കൗണ്ട് ബ്ലോക്ക് ആകും.',
  'ഫോണിൽ ഒരു ഒടിപി വന്നിട്ടുണ്ട്, അത് ഉടനെ ഒന്ന് പറഞ്ഞു താ.',
 ]);
 assert.equal(s.risk, 'danger');
});

test('C22 with mixed script (Malayalam letters + Latin English words) is Hang up now', () => {
 const s = play('ml-IN', [
  'ഹലോ ചേച്ചി, ഞാൻ bank-ൽ നിന്നാണ് വിളിക്കുന്നത്.',
  'നിങ്ങളുടെ KYC update ചെയ്തിട്ടില്ല, ഇന്ന് account block ആകും.',
  'ഫോണിൽ ഒരു OTP വന്നിട്ടുണ്ട്, അത് ഉടനെ ഒന്ന് പറഞ്ഞു താ.',
 ]);
 assert.equal(s.risk, 'danger');
});

test('C23 lottery fee, as speech-to-text writes it in Malayalam script, is at least Be careful', () => {
 const s = play('ml-IN', [
  'കൺഗ്രാജുലേഷൻസ്! നിങ്ങൾക്ക് ഇരുപത്തഞ്ച് ലക്ഷം രൂപ ലോട്ടറി അടിച്ചു.',
  'പ്രൈസ് കിട്ടാൻ പ്രോസസിംഗ് ഫീ ആയി അഞ്ചു തൗസൻഡ് രൂപ ഇപ്പോൾ തന്നെ അയക്കണം.',
 ]);
 assert.notEqual(s.risk, 'safe');
});

test('a genuine Malayalam-script bank reminder that warns against sharing the OTP stays calm', () => {
 const s = play('ml-IN', [
  'ഇത് നിങ്ങളുടെ ബാങ്കിൽ നിന്നുള്ള ഒരു ഓർമ്മപ്പെടുത്തൽ ആണ്.',
  'ബാങ്ക് ഒരിക്കലും ഫോണിൽ ഒടിപി ചോദിക്കില്ല. ആരോടും ഒടിപി പറയരുത്.',
 ]);
 assert.equal(s.risk, 'safe');
});

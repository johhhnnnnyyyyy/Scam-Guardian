// Malayalam language pack (Malayalam script and romanised Manglish): data only. Malayalam script has no \b in
// JavaScript, so native terms are plain substrings; chillu letters are normalised to their atomic forms first
// (src/normalize.js). Sourced wording comes from Kerala Police / bank advisories and news reports of digital-arrest
// and courier scams (research_notes/Malayalam pack and batch 5); everything else is composed and NEEDS NATIVE REVIEW.
export default {
 code: 'ml-IN',
 tactics: {
  authority: [
   '(?:പോലീസ|സിബിഐ|ഇഡി|കസ്റ്റംസ|ട്രായ|സൈബർ സെൽ|കെഎസ്ഇബി|ഫെഡെക്സ|റിസർവ് ബാങ്ക|ആദായ നികുതി)\\S*.{0,25}(?:നിന്നാണ്|നിന്ന്|ഓഫീസർ|ഉദ്യോഗസ്ഥ|ആണ് വിളിക്കുന്നത്|സ്റ്റേഷൻ)',
   'ഞാൻ.{0,25}(?:പോലീസ|സിബിഐ|കസ്റ്റംസ|ഓഫീസർ|ഉദ്യോഗസ്ഥ)',
   '\\b(?:police|cbi|customs|kseb|fedex|trai|cyber cell)\\b.{0,20}\\b(?:ninnu|ninnanu|ninnaanu|officer aanu)\\b',
   '\\b(?:njan|nyan)\\b.{0,25}\\b(?:police|cbi|customs|officer)\\b',
  ],
  threat: ['അറസ്റ്റ', 'വാറന്റ', 'കേസ്.{0,20}(?:രജിസ്റ്റർ|എടുത്തു|ഉണ്ട്)', 'കറന്റ്.{0,15}കട്ട്', '(?:അക്കൗണ്ട്|സിം|നമ്പർ).{0,20}(?:ബ്ലോക്ക്|മരവിപ്പി|റദ്ദാക്ക)', 'മയക്കുമരുന്ന്',
   '\\b(?:arrest cheyy\\w*|arrest aak\\w*|current cut|block aak\\w*|case und\\w*|case edukk\\w*)\\b'],
  urgency: ['ഉടനെ', 'ഉടൻ', 'ഇപ്പോൾ തന്നെ', 'ഇന്ന് രാത്രി', '\\b(?:udane|ippo thanne|ippol thanne|vegam)\\b'],
  secrecy: ['ആരോടും.{0,15}(?:പറയരുത്|പറയണ്ട|പറയേണ്ട)', '(?:വീട്ടുകാരോട്|കുടുംബത്തോട്).{0,15}(?:പറയരുത്|പറയണ്ട)', 'രഹസ്യമായി', '\\b(?:aarodum parayaruth\\w*|aarodum parayanda|veettil parayanda|rahasyam(?:aay\\w*)?)\\b'],
  payment: ['പണം.{0,15}(?:അയക്ക|അയച്ചു തര|ട്രാൻസ്ഫർ)', 'സേഫ് അക്കൗണ്ട്', 'തുക.{0,15}അടയ്ക്ക', '\\b(?:panam|cash|paisa)\\s+ayakk\\w*', '\\btransfer cheyy\\w*'],
  remote: ['ആപ്പ്.{0,15}(?:ഇൻസ്റ്റാൾ|ഡൗൺലോഡ്)', 'ലിങ്കിൽ ക്ലിക്ക് ചെയ്യ(?:ൂ|ണം|ുക)', 'സ്ക്രീൻ ഷെയർ', '\\b(?:app install cheyy\\w*|download cheyy\\w*|link(?:il)? click cheyy\\w*)\\b'],
  camera: ['വീഡിയോ കോളിൽ.{0,20}(?:തുടര|ഇരിക്ക)', 'ക്യാമറ.{0,15}ഓൺ', 'കോൾ കട്ട് ചെയ്യരുത്', '\\b(?:call cut cheyyaruth\\w*|camera on aakk\\w*|video call(?:il)? thudar\\w*)\\b'],
  impossible: ['UPI PIN.{0,40}(?:ക്രെഡിറ്റ്|ലഭിക്ക|കിട്ട|credit)', 'ഡിജിറ്റൽ അറസ്റ്റ', 'വെർച്ച?്വ?ലി അറസ്റ്റ', '(?:ക്യുആർ|QR).{0,30}സ്കാൻ.{0,30}(?:കിട്ടാൻ|ലഭിക്കാൻ)'],
  advance_fee: ['(?:തുറക്കാൻ|unlock|withdraw).{0,40}(?:ഡെപ്പോസിറ്റ്|deposit)', '(?:ആദ്യം|first).{0,30}(?:ഡെപ്പോസിറ്റ്|deposit)', '(?:സമ്മാനം|ലോട്ടറി|ലോൺ|ലാഭം).{0,30}(?:ഫീസ്|ടാക്സ്|നികുതി).{0,20}(?:അടയ്ക്ക|അടച്ച|തരണം)', '\\b(?:prize|lottery|loan)\\b.{0,30}\\b(?:fee|tax)\\s+adakk\\w*'],
  prize: ['ലോട്ടറി.{0,20}(?:അടിച്ചു|ലഭിച്ചു|കിട്ടി)', 'സമ്മാനം.{0,15}(?:അടിച്ചു|ലഭിച്ചു|കിട്ടി)', '\\blottery adichu\\b'],
  investment_bait: ['ഉറപ്പായ.{0,10}(?:ലാഭം|വരുമാനം)', 'ഇരട്ടി.{0,10}(?:ലാഭം|പണം)', 'പാർട്ട് ടൈം ജോലി', 'ടാസ്ക', '\\b(?:percent|%)\\s*return', '\\bpart time (?:job|joli)\\b', 'ടെലിഗ്രാം.{0,40}(?:നിക്ഷേപ|invest)'],
  extortion: ['(?:ഫോട്ടോ|വീഡിയോ).{0,30}(?:എല്ലാവർക്കും|കോൺടാക്ടുകൾക്ക്).{0,15}അയക്കും', '(?:വീഡിയോ|ഫോട്ടോ).{0,60}(?:ഓഫീസ്|കുടുംബ|കോൺടാക്ട|ഗ്രൂപ്പ).{0,30}(?:പോകും|അയക്കും|ഷെയർ ചെയ്യും)', '(?:വീഡിയോ|ഫോട്ടോ).{0,40}റെക്കോർഡ് ചെയ്തി', '\\b(?:photo|video)s?\\b.{0,40}\\b(?:office|family|contacts|group)\\b.{0,30}\\b(?:pokum|ayakkum)\\b'],
  family_emergency: ['\\baccident (?:aayi|patti|undaayi)\\b', '\\bhospital(?:il)? aanu\\b', 'എനിക്ക്.{0,20}(?:അപകട|ആക്സിഡന്റ്)', 'ആശുപത്രിയിലാണ്', '(?:മകൻ|മകൾ|കൊച്ചുമകൻ|കൊച്ചുമകൾ).{0,30}(?:അപകട|അറസ്റ്റ|കസ്റ്റഡി)', '(?:മകൻ|മകൾ|കൊച്ചുമകൻ|കൊച്ചുമകൾ).{0,30}ആശുപത്രി.{0,40}(?:പണം|അയക്ക|ഉടനെ)', '\\b(?:makan|makal)\\b.{0,30}\\b(?:accident|arrest)'],
 },
 weakTactics: {
  authority: ['പോലീസ|സിബിഐ|കസ്റ്റംസ|സൈബർ സെൽ|കെഎസ്ഇബി'],
 },
 secret: ['\\b(?:aaru|6|naalu|4) digit\\b', '\\b(?:phone|screen) ?il (?:vanna|varunna)\\b.{0,15}\\b(?:code|number)\\b', 'ഫോണിൽ വന്ന.{0,10}(?:കോഡ|നമ്പർ)', 'ഒടിപി', 'ഓടിപി', 'പിൻ നമ്പർ', 'പാസ്‌?വേഡ്'],
 identity: ['ആധാർ', 'പാൻ കാർഡ്'],
 demand: ['വായിച്ച് പറയ', '\\bvaayichu parayu\\b', 'പറയ(?:ൂ|ണം|ുക)', 'പറഞ്ഞു തര', 'പറഞ്ഞു താ', 'അയച്ചു താ', 'ഒന്ന് പറഞ്ഞേ', '\\b(?:paranju tha|ayachu tha)\\b', 'തര(?:ൂ|ണം|ുക)', 'അയക്ക(?:ൂ|ണം|ുക)', 'ഷെയർ ചെയ്യ(?:ൂ|ണം|ുക)', '\\b(?:parayu|parayoo|paranju tharu|tharu|tharoo|ayakku|ayakkoo|share cheyy(?:u|oo|anam))\\b', '\\b(?:paranju thar(?:amo|aamo|anam)|parayamo|parayanam)\\b'],
 // Negated safety advice: "never reveal the OTP", "the bank will not ask". A demand verb after it is not advice.
 advice: [
  '\\b(?:otp|password|pin|cvv)\\b.{0,15}\\b(?:chodikkilla|chodikkukayilla|aavashyapedilla)\\b', '(?:ഒടിപി|പാസ്‌?വേഡ്|പിൻ).{0,15}(?:ചോദിക്കില്ല|ആവശ്യപ്പെടില്ല)',
  'വ്യാജ\\s*(?:പോലീസ|കോൾ|ഉദ്യോഗസ്ഥ|ബാങ്ക)', 'വാർത്തയിൽ\\s*(?:കണ്ട|വായിച്ച)', '\\b(?:fake|vyaja)\\s+(?:police|call)\\b',
  '(?:ഒടിപി|ഓടിപി|\\botp\\b|പിൻ|പാസ്‌?വേഡ്|പണം|ലിങ്ക്)(?:(?!പറയൂ|തരൂ|അയക്കൂ).){0,25}(?:രുത്|ല്ലേ|ണ്ട(?:\\s|$|\\.))',
  '(?:പോലീസ|ബാങ്ക|സിബിഐ)\\S*.{0,40}(?:ചോദിക്കില്ല|ആവശ്യപ്പെടില്ല|വിളിക്കില്ല)',
  // "there is no such thing as digital arrest"
  'എന്നൊന്നില്ല', '\\b(?:ennonnilla|angane onnilla)\\b',
  '\\b(?:otp|pin|password)\\b.{0,25}\\b(?:parayaruth\\w*|share cheyyaruth\\w*|kodukkaruth\\w*)',
  '\\b(?:bank|police|cbi)\\b.{0,30}\\b(?:chodikkilla|vilikkilla)\\b',
 ],
 // A conditional ("... ഇല്ലെങ്കിൽ", "illenkil") is a threat, not advice.
 adviceExceptions: ['എങ്കിൽ', '\\b(?:illenkil|enkil)\\b'],
 acts: {
  reported: ['എന്നു? .{0,25}പറഞ്ഞു', 'എന്ന് പറഞ്ഞു', 'അറിയിച്ചു', '\\bennu paranju\\b'],
  narration: ['എന്റെ (?:മകൻ|മകൾ|കൊച്ചുമകൻ|കൊച്ചുമകൾ)', '\\bente (?:makan|makal)\\b'],
  demand: ['(?:ക്കൂ|യൂ|രൂ|ണം)(?:[.!\\s]|$)', '\\sതാ(?:[.!\\s]|$)', '\\b(?:cheyyu|parayu|tharu|ayakku|cheyyanam|tharanam)\\b'],
  secondPerson: ['നിങ്ങൾ', 'നിങ്ങളുടെ', 'താങ്കൾ', '\\b(?:ningal|ningalude|ninte|thangal)\\b'],
 },
 separators: ['\\s(?:പക്ഷേ|എന്നാൽ)\\s'],
 demandStart: [],
 imperativeEnds: [],
 // Decision 19: amounts and payment verbs are pack data too.
 amount: { unitsNative: ['രൂപ', 'ലക്ഷം', 'കോടി', 'ആയിരം'] },
 amountVerbs: ['അയക്ക', 'അടയ്ക്ക', 'ട്രാൻസ്ഫർ'],
 neverCalls: ['ട്രായ്'],
 lawEnforcement: ['പോലീസ|സിബിഐ|കസ്റ്റംസ|സൈബർ|ഇൻസ്പെക്ടർ|ഉദ്യോഗസ്ഥ|കോടതി'],
};

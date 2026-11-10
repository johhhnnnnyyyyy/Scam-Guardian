// Malayalam and Manglish development set (batch 5). Synthetic, composed by the author, NOT native-reviewed: every
// line needs a native speaker's check. Development data: the ml pack was written against it, so results show
// regressions, not generalisation. expect: the level a scam should reach; benign items should stay "safe".
export const malayalamCases = [
 // Digital arrest / courier (script; wording follows Kerala advisories)
 { id: 'ml-arrest-1', label: 'scam', expect: 'danger', segments: ['ഞാൻ മുംബൈ പോലീസിൽ നിന്നാണ് വിളിക്കുന്നത്.', 'നിങ്ങളുടെ പേരിലുള്ള ഫെഡെക്സ് പാഴ്സലിൽ മയക്കുമരുന്ന് കണ്ടെത്തി.', 'ആരോടും പറയരുത്. വീഡിയോ കോളിൽ തുടരണം.'] },
 { id: 'ml-arrest-2', label: 'scam', expect: 'danger', segments: ['നിങ്ങൾ ഡിജിറ്റൽ അറസ്റ്റിലാണ്.', 'വെരിഫിക്കേഷന് വേണ്ടി സേഫ് അക്കൗണ്ടിലേക്ക് പണം അയക്കൂ.'] },
 { id: 'ml-arrest-3', label: 'scam', expect: 'danger', segments: ['സിബിഐ ഓഫീസർ ആണ് സംസാരിക്കുന്നത്. നിങ്ങളുടെ പേരിൽ കേസ് രജിസ്റ്റർ ചെയ്തിട്ടുണ്ട്.', 'വീട്ടുകാരോട് പറയരുത്, ക്യാമറ ഓൺ ആക്കി വെക്കൂ.'] },
 // Chillu in the older encoding (consonant + virama + ZWJ)
 { id: 'ml-arrest-zwj', label: 'scam', expect: 'danger', segments: ['നിങ്ങള്‍ ഡിജിറ്റല്‍ അറസ്റ്റിലാണ്. ഉടനെ പണം അയക്കൂ.'] },
 // KYC / OTP (Manglish, code-mixed)
 { id: 'ml-kyc-1', label: 'scam', expect: 'danger', segments: ['Sir, njan bank-il ninnanu vilikkunnathu.', 'Ningalude phone-il vanna OTP parayu, KYC udane update cheyyanam.'] },
 { id: 'ml-kyc-2', label: 'scam', expect: 'danger', segments: ['ഒടിപി പറയൂ, ഇല്ലെങ്കിൽ അക്കൗണ്ട് ബ്ലോക്ക് ആകും.'] },
 { id: 'ml-kyc-3', label: 'scam', expect: 'danger', segments: ['Ee AnyDesk app install cheyyu, njan screen share cheythu sheriyaakkam.', 'Ningalude account block aakum.'] },
 // KSEB / TRAI
 { id: 'ml-kseb', label: 'scam', expect: 'danger', segments: ['കെഎസ്ഇബി ഓഫീസിൽ നിന്നാണ്. ബിൽ അടച്ചില്ലെങ്കിൽ ഇന്ന് രാത്രി കറന്റ് കട്ട് ചെയ്യും.', 'ഉടനെ ഈ ലിങ്കിൽ ക്ലിക്ക് ചെയ്യൂ, 500 രൂപ അടയ്ക്കണം.'] },
 { id: 'ml-trai', label: 'scam', expect: 'danger', segments: ['TRAI-il ninnanu vilikkunnathu. Ningalude SIM block aakum.', 'Udane Aadhaar number parayu.'] },
 // Lottery / advance fee
 { id: 'ml-lottery', label: 'scam', expect: 'danger', segments: ['അഭിനന്ദനങ്ങൾ! നിങ്ങൾക്ക് 25 ലക്ഷം രൂപയുടെ ലോട്ടറി അടിച്ചു.', 'സമ്മാനം കിട്ടാൻ ടാക്സ് ഫീസ് അടയ്ക്കണം.'] },
 // Family emergency (Manglish)
 { id: 'ml-family', label: 'scam', expect: 'danger', segments: ['Ningalude makan accident-il pettu hospital-il aanu.', 'Udane 50000 rupees ayakku, aarodum parayanda.'] },
 // Investment bait
 { id: 'ml-invest', label: 'scam', expect: 'danger', segments: ['ഉറപ്പായ ലാഭം, ഒരു മാസത്തിൽ ഇരട്ടി പണം.', 'ഇന്ന് തന്നെ പണം ട്രാൻസ്ഫർ ചെയ്യൂ.'] },
 // Careful-level
 { id: 'ml-aadhaar', label: 'scam', expect: 'careful', segments: ['നിങ്ങളുടെ ആധാർ നമ്പർ പറയൂ.'] },
 { id: 'ml-urgent', label: 'scam', expect: 'careful', segments: ['Police station-il ninnanu, ningal udane station-il varanam.'] },

 // Look-alikes (should stay calm)
 { id: 'ml-benign-delivery', label: 'benign', segments: ['നമസ്കാരം. നിങ്ങളുടെ പലചരക്ക് ഇന്ന് ഉച്ചയ്ക്ക് എത്തും.', 'സാധനം കിട്ടുമ്പോൾ പണം കൊടുത്താൽ മതി.'] },
 { id: 'ml-benign-advice', label: 'benign', segments: ['ബാങ്ക് ഒരിക്കലും ഒടിപി ചോദിക്കില്ല.', 'ഒടിപി ആരോടും പറയരുത്. ലിങ്കിൽ ക്ലിക്കല്ലേ.'] },
 { id: 'ml-benign-advice-manglish', label: 'benign', segments: ['Bank orikkalum OTP chodikkilla.', 'OTP aarkkum share cheyyaruthu.'] },
 { id: 'ml-benign-police-news', label: 'benign', segments: ['Innu police station-inte aduthu oru function undu.', 'Njan pinne vilikkaam.'] },
 { id: 'ml-benign-son', label: 'benign', segments: ['എന്റെ മകൻ ഇന്നലെ ആശുപത്രിയിൽ പോയി, ഇപ്പോൾ സുഖമാണ്.'] },
 { id: 'ml-benign-lottery-chat', label: 'benign', segments: ['ഇന്നലത്തെ ലോട്ടറി ഫലം പത്രത്തിൽ കണ്ടോ?'] },
 { id: 'ml-benign-kseb', label: 'benign', segments: ['നാളെ രാവിലെ അറ്റകുറ്റപ്പണി കാരണം കറന്റ് ഉണ്ടാകില്ല എന്ന് കെഎസ്ഇബി അറിയിച്ചു.'] },
 { id: 'ml-benign-family-pay', label: 'benign', segments: ['Amma, njan veetil ethi. Rent-inte panam naale ayakkam.'] },
 { id: 'ml-benign-doctor', label: 'benign', segments: ['ഡോക്ടറുടെ അപ്പോയിന്റ്മെന്റ് നാളെ പത്തു മണിക്കാണ്. മരുന്ന് മറക്കരുത്.'] },
 { id: 'ml-benign-scam-talk', label: 'benign', segments: ['ഡിജിറ്റൽ അറസ്റ്റ് എന്നൊന്നില്ല എന്ന് പോലീസ് പറഞ്ഞു.'] },
];

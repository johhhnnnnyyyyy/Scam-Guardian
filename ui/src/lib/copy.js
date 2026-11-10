// Interface copy that is not part of the warning wording in demos.js. Hindi, Tamil and Malayalam text needs native review.
export const LANGUAGES = [
 { value: 'en-IN', label: 'English' },
 { value: 'hi-IN', label: 'हिन्दी · Hindi / Hinglish' },
 { value: 'ta-IN', label: 'தமிழ் · Tamil' },
 { value: 'ml-IN', label: 'മലയാളം · Malayalam / Manglish' },
];

// Live listening health. A calm "no warning" is only shown while the speech service is actually listening.
export const healthCopy = {
 connecting: { title: 'Connecting…', text: 'Connecting to the speech service. Nothing is being checked yet.' },
 reconnecting: { title: 'Reconnecting…', text: 'The speech connection dropped. Reconnecting now; speech is not being checked until it returns.' },
 stt_degraded: { title: 'Checking may be delayed', text: 'The speech service is struggling. Warnings may arrive late. Stay cautious.' },
 paused: { title: 'Paused for the warning', text: 'Listening is paused while the warning plays. The caller is not being checked.' },
 stt_down: { title: 'Not listening', text: 'The speech service is unavailable. Nothing is being checked. Verify the caller another way.' },
 stopped: { title: 'Listening stopped', text: 'Nothing is being checked now.' },
};

// Shown instead of "No warning detected" when speech is in a language the rules do not cover.
export const coverageCopy = {
 'en-IN': { unknown_language: { title: 'Language not covered', text: 'This speech is in a language Guardian cannot check yet. No safety assessment is available. Verify the caller another way.' }, partial: { title: 'Partly covered', text: 'Part of this speech is in a language Guardian only partly understands. No warning found, but this is not a full check.' } },
 'hi-IN': { unknown_language: { title: 'भाषा समर्थित नहीं', text: 'यह बातचीत ऐसी भाषा में है जिसे गार्डियन अभी जाँच नहीं सकता। कोई सुरक्षा आकलन उपलब्ध नहीं है।' }, partial: { title: 'आंशिक जाँच', text: 'इस बातचीत का कुछ हिस्सा ऐसी भाषा में है जिसे गार्डियन पूरी तरह नहीं समझता। यह पूरी जाँच नहीं है।' } },
 'ta-IN': { unknown_language: { title: 'மொழி ஆதரிக்கப்படவில்லை', text: 'இந்த உரையாடல் கார்டியன் இன்னும் சரிபார்க்க முடியாத மொழியில் உள்ளது. பாதுகாப்பு மதிப்பீடு இல்லை.' }, partial: { title: 'பகுதி சரிபார்ப்பு', text: 'இந்த உரையாடலின் ஒரு பகுதியை கார்டியன் முழுமையாகப் புரிந்துகொள்ளவில்லை. இது முழுச் சரிபார்ப்பு அல்ல.' } },
 'ml-IN': { unknown_language: { title: 'ഭാഷ പിന്തുണയ്ക്കുന്നില്ല', text: 'ഈ സംസാരം ഗാർഡിയന് ഇതുവരെ പരിശോധിക്കാൻ കഴിയാത്ത ഭാഷയിലാണ്. സുരക്ഷാ വിലയിരുത്തൽ ലഭ്യമല്ല.' }, partial: { title: 'ഭാഗികമായി പരിശോധിച്ചു', text: 'ഈ സംസാരത്തിന്റെ ഒരു ഭാഗം ഗാർഡിയന് പൂർണ്ണമായി മനസ്സിലായില്ല. ഇത് പൂർണ്ണ പരിശോധനയല്ല.' } },
};

export const consentCopy = {
 'en-IN': 'I am using synthetic or consented test speech. Live and uploaded audio goes to Gnani. Transcript excerpts may go to a configured AI classifier. This app can miss scams.',
 'hi-IN': 'मैं कृत्रिम या सहमति से ली गई परीक्षण आवाज़ इस्तेमाल कर रहा/रही हूँ। लाइव और अपलोड की गई आवाज़ Gnani को जाती है। बातचीत का पाठ AI जाँच को जा सकता है। यह ऐप धोखाधड़ी चूक सकता है।',
 'ta-IN': 'நான் செயற்கை அல்லது ஒப்புதல் பெற்ற சோதனைப் பேச்சைப் பயன்படுத்துகிறேன். நேரடி மற்றும் பதிவேற்றிய ஒலி Gnani-க்கு செல்கிறது. உரை AI ஆய்வுக்குச் செல்லலாம். இந்தச் செயலி சில மோசடிகளைத் தவறவிடலாம்.',
 'ml-IN': 'ഞാൻ കൃത്രിമമോ സമ്മതം ലഭിച്ചതോ ആയ ടെസ്റ്റ് സംസാരമാണ് ഉപയോഗിക്കുന്നത്. തത്സമയവും അപ്‌ലോഡ് ചെയ്തതുമായ ശബ്ദം Gnani-യിലേക്ക് പോകും. എഴുത്ത് AI പരിശോധനയ്ക്ക് പോയേക്കാം. ഈ ആപ്പ് ചില തട്ടിപ്പുകൾ കണ്ടെത്താതിരിക്കാം.',
};

export const extraCopy = {
 'en-IN': { code: 'Ask the caller for your private family code word. Verify through a number you already trust. Never say the word first.', pause: 'Pause for 10 minutes before any payment. Call someone you trust.' },
 'hi-IN': { code: 'कॉल करने वाले से परिवार का गुप्त शब्द पूछें। पहले खुद शब्द न बताएं। भरोसेमंद नंबर पर खुद कॉल करके जाँच करें।', pause: 'भुगतान से पहले 10 मिनट रुकें। किसी भरोसेमंद व्यक्ति को कॉल करें।' },
 'ta-IN': { code: 'அழைப்பவரிடம் குடும்ப ரகசியச் சொல்லைக் கேளுங்கள். முதலில் நீங்களே சொல்ல வேண்டாம். நம்பகமான எண்ணை அழைத்து சரிபார்க்கவும்.', pause: 'பணம் செலுத்துவதற்கு முன் 10 நிமிடம் காத்திருங்கள். நம்பகமான ஒருவரை அழைக்கவும்.' },
 'ml-IN': { code: 'വിളിക്കുന്നയാളോട് കുടുംബത്തിന്റെ രഹസ്യ വാക്ക് ചോദിക്കുക. ആദ്യം നിങ്ങൾ പറയരുത്. വിശ്വാസമുള്ള നമ്പറിൽ വിളിച്ച് ഉറപ്പാക്കുക.', pause: 'പണം അയക്കുന്നതിന് മുമ്പ് 10 മിനിറ്റ് കാത്തിരിക്കുക. വിശ്വാസമുള്ള ഒരാളെ വിളിക്കുക.' },
};

// "Be careful" that is close to Hang up (decision 22).
export const uncertainCopy = {
 'en-IN': 'This is close to a known scam pattern. Do not pay or share anything. Hang up and call back on a number you already trust.',
 'hi-IN': 'यह किसी जाने-पहचाने धोखे जैसा लग रहा है। कुछ भी न भेजें, न बताएं। फ़ोन रखें और भरोसेमंद नंबर पर वापस कॉल करें।',
 'ta-IN': 'இது தெரிந்த மோசடி முறைக்கு அருகில் உள்ளது. எதையும் அனுப்பவோ சொல்லவோ வேண்டாம். அழைப்பைத் துண்டித்து நம்பகமான எண்ணில் திரும்ப அழைக்கவும்.',
 'ml-IN': 'ഇത് അറിയപ്പെടുന്ന ഒരു തട്ടിപ്പ് രീതിയോട് വളരെ അടുത്താണ്. ഒന്നും അയക്കുകയോ പറയുകയോ ചെയ്യരുത്. കോൾ കട്ട് ചെയ്ത് വിശ്വാസമുള്ള നമ്പറിൽ തിരിച്ചു വിളിക്കുക.',
};

// Decision 24: who said it. "Unsure" turns are still checked in full; the label only explains the transcript.
export function speakerLabel(seg) {
 if (!seg.speaker) return null;
 if (seg.speaker === 'senior') return { kind: 'senior', text: 'You' };
 if (seg.speaker === 'caller') return { kind: 'caller', text: 'Caller' };
 if (seg.attribution?.spoofSuspect) return { kind: 'unsure', text: 'Sounds like you, but came through the phone' };
 return { kind: 'unsure', text: seg.attribution?.hint === 'caller' ? 'Probably caller' : 'Unsure who' };
}

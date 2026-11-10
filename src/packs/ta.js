// Tamil language pack (Tamil script and romanised Tanglish): data only. Tamil script has no \b in JavaScript, so
// native terms are plain substrings. All lists need native-speaker review.
export default {
 code: 'ta-IN',
 tactics: {
  authority: ['காவல்', 'போலீஸ', 'போலீச', 'சிபிஐ', 'மின்சார வாரியம்', 'TRAI-?யில்'],
  threat: ['கைது', 'துண்டிக்க', 'சட்டவிரோத', 'முடக்க', '\\b(?:arrest pannuvom|cut aagum)\\b'],
  urgency: ['உடனே', 'உடனடியாக', 'இன்று இரவு', 'இப்போதே', '\\b(?:udane|ippove)\\b'],
  secrecy: ['யாரிடமும்.*(?:சொல்ல|பேசா)', 'குடும்பத்தினரிடம் பேசா', '\\b(?:yaar kittayum solla vendam)\\b'],
  payment: ['பணம்.*அனுப்ப', 'பணத்தை.*அனுப்ப', 'பணம் கட்ட', 'பணம் செலுத்த', 'செலுத்துங்கள்', '\\b(?:panam anuppunga|pay pannunga)\\b'],
  remote: ['செயலி.*நிறுவ', 'ஆப்.{0,10}(?:நிறுவ|பதிவிறக்க)', 'திரையை.*பகிர', '\\b(?:app install pannunga|download pannunga)\\b'],
  camera: ['கேமரா.*இரு', 'வீடியோ கால.*இரு', 'வீடியோ அழைப்ப.{0,10}இரு', 'இணைப்பை துண்டிக்காதீர்கள்', 'துண்டிக்காதீர்கள்'],
  impossible: ['UPI PIN.{0,40}(?:வரவு|பெற|credit)', 'டிஜிட்டல் கைது', '(?:QR|பின்).{0,40}ஸ்கேன்.{0,30}பெற', 'பணத்திருப்பம்.{0,60}(?:QR|ஸ்கேன்)'],
  advance_fee: ['(?:திறக்க|unlock|withdraw).{0,40}(?:டெபாசிட்|deposit)', '(?:முதலில்|first).{0,30}(?:டெபாசிட்|deposit)', '(?:பரிசு|கடன்|லாபம்|பணத்தை எடுக்க).{0,40}(?:கட்டணம்|வரி).{0,30}(?:செலுத்துங்கள்|கட்டுங்கள்|செலுத்த வேண்டும்)'],
  prize: ['(?:லக்கி டிரா|லாட்டரி|பரிசு).{0,30}(?:வென்ற|விழுந்த|கிடைத்த|அடித்த)', 'வென்றுள்ளது', '\\b(?:lottery|prize|lucky draw)\\b.{0,30}\\b(?:vizhundh\\w*|kidaich\\w*|adichi\\w*|won)\\b'],
  investment_bait: ['உத்தரவாத', 'பார்ட் டைம் வேலை', 'டாஸ்க்', '\\b(?:percent|%)\\s*return', '\\bpart time (?:job|velai)\\b', 'டெலிகிராம்.{0,40}(?:முதலீடு|invest)'],
  extortion: ['(?:வீடியோ|புகைப்பட|போட்டோ).{0,60}(?:ஆபீஸ்|குடும்ப|தொடர்பு|குரூப்).{0,30}(?:அனுப்புவோம்|போகும்|பகிர்வோம்|போய்விடும்)', '(?:வீடியோ|போட்டோ).{0,40}பதிவு செய்திருக்கிறோம்', '\\b(?:photo|video)s?\\b.{0,40}\\b(?:office|family|contacts|group)\\b.{0,30}\\b(?:anuppuvom|poyidum|pogum)\\b', 'புகைப்படத்தை.{0,30}(?:தொடர்புகளுக்கும்|எல்லோருக்கும்)'],
  family_emergency: ['\\baccident (?:aagiduchu|aayiduchu|aachu)\\b', '\\bhospital(?:\\s*la)? irukk?en\\b', '(?:எனக்கு|நான்).{0,20}(?:விபத்து|ஆக்சிடென்ட்)', 'மருத்துவமனையில் இருக்கிறேன்', '(?:மகன்|மகள்|பேரன்|பேத்தி|குடும்பம்).{0,40}(?:கைது|விபத்து)', '(?:மகன்|மகள்|பேரன்|பேத்தி).{0,40}மருத்துவமனை.{0,40}(?:பணம்|அனுப்ப|உடனே)', '(?:அம்மா|அப்பா|பாட்டி|தாத்தா).{0,60}(?:விபத்து|சிக்கல்|மருத்துவமனை)'],
 },
 weakTactics: {
  authority: ['போலீஸ்|காவல்துறை|சிபிஐ|சுங்க|சைபர் க்ரைம்|police|cbi|customs'],
 },
 secret: ['\\b(?:aaru|6|naalu|4) digit\\b', '\\b(?:phone|screen) ?(?:ku|la) (?:vandha|varra|varum)\\b.{0,15}\\b(?:code|number)\\b', 'போனில் வந்த.{0,10}(?:கோட்|எண்)', 'ஓடிபி', 'கடவுச்சொல்'],
 identity: ['ஆதார்'],
 demand: ['\\b(?:padichu sollu\\w*|sollu\\w*|chollu\\w*|kodu\\w*|kudu\\w*|anuppu\\w*)\\b', 'சொல்', 'தர(?:வும்|ுங்க)?', 'கொடு', 'அனுப்ப', 'பகிர'],
 advice: [
  '\\b(?:otp|password|pin|cvv)\\b.{0,15}\\b(?:kekka|ketka|kekkave)\\s*maat\\w*', '(?:ஓடிபி|கடவுச்சொல்|பாஸ்வேர்ட்).{0,15}(?:கேட்க மாட்டோம்|கேட்கமாட்டோம்|கேட்க மாட்டார்கள்)',
  'போலி\\s*(?:போலீஸ்|அழைப்பு|அதிகாரி|வங்கி)', 'செய்தியில்\\s*(?:பார்த்த|படித்த)', '\\b(?:fake|poli)\\s+(?:police|call)\\b','(?:பகிர|அனுப்ப).*வேண்டாம்'],
 adviceExceptions: ['விட்டால்'],
 acts: {
  reported: ['சொன்னார்', 'சொன்னார்கள்', 'செய்தியில்', 'என்று கூறினார்'],
  narration: ['என் (?:மகன்|மகள்|பேரன்|பேத்தி)', '(?:தேன்|னேன்|ான்|ாள்)[.\\s]*$'],
  demand: ['(?:ுங்கள்|ுங்க|ாதீர்கள்)(?:[.\\s]|$)', '(?:கொடு|சொல்லு|அனுப்பு)(?:[.\\s]|$)', '\\b(?:pannunga|kudunga|anuppunga|sollunga)\\b'],
  secondPerson: ['உங்கள்', 'நீங்கள்', '\\b(?:unga|ungal|neenga)\\b'],
 },
 separators: ['\\s(?:ஆனால்|மற்றும்)\\s'],
 demandStart: [],
 imperativeEnds: ['ுங்கள்', '\\bsollunga', '\\bkudunga', '\\banuppunga'],
 // Decision 19: amounts and payment verbs are pack data.
 amount: { prefix: ['ரூ\\.?'], unitsNative: ['ரூபாய்', 'லட்சம்', 'ஆயிரம்'] },
 amountVerbs: ['அனுப்ப', 'கட்ட', 'செலுத்த'],
 lawEnforcement: ['போலீஸ்|காவல்|சிபிஐ|சுங்க|சைபர்|இன்ஸ்பெக்டர்|அதிகாரி|நீதிமன்ற'],
};

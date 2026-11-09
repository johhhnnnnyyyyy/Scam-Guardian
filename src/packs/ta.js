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
  impossible: ['டிஜிட்டல் கைது', '(?:QR|பின்).{0,40}ஸ்கேன்.{0,30}பெற', 'பணத்திருப்பம்.{0,60}(?:QR|ஸ்கேன்)'],
  advance_fee: ['(?:பரிசு|கடன்|லாபம்|பணத்தை எடுக்க).{0,40}(?:கட்டணம்|வரி).{0,30}(?:செலுத்துங்கள்|கட்டுங்கள்|செலுத்த வேண்டும்)'],
  prize: ['லக்கி டிரா', 'லாட்டரி', 'வென்றுள்ளது', 'பரிசு'],
  investment_bait: ['உத்தரவாத'],
  extortion: ['புகைப்படத்தை.{0,30}(?:தொடர்புகளுக்கும்|எல்லோருக்கும்)'],
  family_emergency: ['(?:மகன்|மகள்|பேரன்|பேத்தி|குடும்பம்).{0,40}(?:கைது|மருத்துவமனை|விபத்து)', '(?:அம்மா|அப்பா|பாட்டி|தாத்தா).{0,60}(?:விபத்து|சிக்கல்|மருத்துவமனை)'],
 },
 secret: ['ஓடிபி', 'கடவுச்சொல்'],
 identity: ['ஆதார்'],
 demand: ['\\b(?:sollu\\w*|chollu\\w*|kodu\\w*|kudu\\w*|anuppu\\w*)\\b', 'சொல்', 'தர(?:வும்|ுங்க)?', 'கொடு', 'அனுப்ப', 'பகிர'],
 advice: ['(?:பகிர|அனுப்ப).*வேண்டாம்'],
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
};

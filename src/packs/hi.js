// Hindi language pack (Devanagari and romanised Hinglish): data only. Devanagari has no \b in JavaScript, so native
// terms are plain substrings. All lists need native-speaker review.
export default {
 code: 'hi-IN',
 tactics: {
  authority: ['पुलिस', 'पोलीस', 'सीबीआई', 'सीबीआय', 'बैंक अधिकारी', 'क्राइम ब्रांच', 'ईडी अधिकारी', 'इनकम टैक्स', 'आरबीआई', 'बिजली विभाग', '(?:TRAI|ट्राई|ट्राय) से', '\\b(?:bijli vibhag|police wala|police se|trai se|cbi se|customs se)\\b'],
  threat: [
   'गिरफ्तार', 'अटक होईल', 'वारंट', 'जेल', 'केस दर्ज', '(?:सिम|नंबर|खाता|अकाउंट|बिजली|कनेक्शन)\\S*\\s(?:\\S+\\s)?(?:बंद (?:कर|हो)|कट)', 'अवैध गतिविधि',
   '\\b(?:giraftar|arrest ho|freeze ho jayega|band ho jayega|bijli kat|illegal activity)\\b', '\\bparcel\\b.{0,40}\\b(?:narcotics|drugs|ganja|passport)', 'पार्सल.{0,40}(?:ड्रग्स|नशीले)',
  ],
  urgency: ['अभी', 'तुरंत', 'जल्दी', 'आज रात', '\\b(?:abhi|turant|jaldi|aaj raat)\\b'],
  secrecy: ['किसी को मत', 'किसी को न बत', 'परिवार को मत', 'घर पर मत', 'किसी से बात (?:न|मत)', 'परिवार से बात (?:न|मत)', '\\b(?:kisi ko (?:mat|na)|family ko (?:mat|na)|ghar (?:pe|par|mein) mat|kisi se baat mat)\\b'],
  payment: ['पैसे भेज', 'पैसा भेज', 'पैसे जमा', 'रुपये भेज', 'ट्रांसफर', 'भुगतान', '\\b(?:paise? bhej\\w*|paisa bhej\\w*|paise jama|paise do)\\b'],
  remote: ['ऐप इंस्टॉल', 'इंस्टॉल कर', 'स्क्रीन शेयर', 'ऐप डाउनलोड', '\\b(?:app install|install kijiye|download kijiye)\\b'],
  camera: ['कैमरा चालू', 'वीडियो कॉल पर (?:रह|बने)', 'कॉल (?:मत काट|काटिए मत)', '\\b(?:video call (?:pe|par) rah\\w*|disconnect mat|call mat kaat\\w*)\\b'],
  impossible: ['डिजिटल अरेस्ट', 'गिरफ्तारी से बचने.*पैसे', '(?:रिफंड|पैसा पाएँ|पैसे पाने).{0,60}(?:QR|पिन|स्कैन)', '(?:QR|पिन).{0,40}(?:स्कैन|डाल).{0,40}(?:पाएँ|पाने|रिफंड)', '\\b(?:refund|paisa|paise)\\b.{0,30}\\b(?:upi pin|pin|qr)\\b.{0,20}\\b(?:daal\\w*|scan)', '\\b(?:pin|qr)\\b.{0,20}\\b(?:daal\\w*|scan)\\b.{0,30}\\brefund'],
  advance_fee: ['प्रोसेसिंग फीस', '\\b(?:processing fee|fee|tax)\\b.{0,20}\\b(?:bhej\\w*|jama|de do|dijiye|pay)\\b', '\\brelease ke liye\\b.{0,30}\\bfee\\b'],
  prize: ['लकी ड्रॉ', 'लॉटरी', '(?:जीत गया|जीत गए|इनाम)', '\\b(?:lucky draw|lottery|inaam|jeet gaye)\\b'],
  investment_bait: ['गारंटीड', '\\bguaranteed\\b', '\\bvip group\\b'],
  extortion: ['फोटो.{0,30}(?:कॉन्टैक्ट|सबको|सबके|रिश्तेदारों)', '\\bphoto\\b.{0,30}\\b(?:contacts|sabko|sabke)\\b'],
  family_emergency: [
   '(?:बेटा|बेटी|पोता|पोती|भाई|बहन|परिवार).{0,40}(?:गिरफ्तार|अस्पताल|दुर्घटना|हिरासत|जेल)', '(?:माँ|मां|मम्मी|पापा|दादी|नानी|दादा|नाना).{0,60}(?:एक्सीडेंट|दुर्घटना|मुसीबत|अस्पताल|हिरासत)',
   '\\b(?:beta|beti|amma|appa|pota|poti|bhai|behen).{0,40}(?:arrest|giraftar|hospital|accident|jail)', '\\b(?:maa|mummy|papa|dadi|nani)\\b.{0,60}\\b(?:accident|musibat|hospital|phas)',
  ],
 },
 secret: ['ओटीपी', 'पिन(?!\\s*कोड)', 'पासवर्ड', 'सीवीवी'],
 identity: ['आधार', 'पैन कार्ड'],
 // Request verbs. "bataya" (told) is a report, not a request, so only imperative or infinitive forms count.
 demand: ['\\b(?:bata(?:o|iye|ie|iyega|na|ana|do|dijiye)|bol(?:o|iye|ie)|de\\s?do|dijiye|dena|daal(?:o|iye|ie|na|do)|bhej(?:o|iye|ie|na|do|dijiye)|share (?:karo|kijiye|kar do))\\b', 'डालो', 'डाल दो', 'बता(?:ओ|इए|इये|ना|दो|दीजिए| दो)', 'बोलिए', 'बोलो', 'दीजिए', 'दे दो', '(?:^|\\s)दो(?=\\s|$|।)', 'भेज(?:ो|िए|ें|ना|दो|दीजिए)', 'शेयर (?:कर|करें|कीजिए)', 'डालिए', 'डालें'],
 advice: [
  '(?:ओटीपी|पैसे|पासवर्ड|पिन)(?:(?!बताओ|बताइ|भेजो|भेजिए|दीजिए).){0,25}(?:^|\\s)(?:मत|नहीं|न)(?:\\s|$)',
  '(?:पुलिस|बैंक|सीबीआई)\\S*\\s.{0,40}(?:कभी\\s+)?(?<=\\s)(?:नहीं|न)\\s+(?:करती|करता|करते|माँगता|मांगता|माँगती|मांगती|माँगते|मांगते)',
 ],
 // A conditional ("... नहीं दिए तो ...", "nahi kiya to") is a threat, not advice.
 adviceExceptions: ['(?:^|\\s)तो(?:\\s|$)', '\\bnahi\\s+\\S+\\s+to\\b', '\\bagar\\b', 'अगर'],
 acts: {
  reported: ['ने कहा', 'बताया कि', 'बोला कि', 'कहा कि', 'खबर में', 'समाचार में', '\\b(?:ne kaha|ne bataya|bataya ki|news mein|khabar mein)\\b'],
  narration: ['मैंने', 'गया था', 'गई थी', 'गए थे', '(?:^|\\s)कल(?:\\s|$)', 'पिछले', 'भर दिया', '\\b(?:maine|kal|pichhle)\\b'],
  // Imperative verbs, listed as words: suffix matching would also hit ordinary words such as में or उन्होंने.
  demand: ['(?:बताइए|बताइये|बताओ|भेजिए|भेजो|भेजें|कीजिए|करें|करो|दीजिए|डालिए|डालें|डालो|रहिए|दिखाइए|बोलिए|बोलो|जाइए|खोलिए|स्कैन करें|इंस्टॉल करें)(?:[।\\s,]|$)', '\\b(?:bhejo|bhejiye|kijiye|karo|daaliye|batao|bataiye|dijiye|rahiye|lo|karna hoga|karna padega)\\b'],
  secondPerson: ['आप', 'तुम', 'तुम्हारा', '\\b(?:aap|aapka|aapke|tum|tumhara)\\b'],
 },
 separators: ['\\s(?:लेकिन|और|फिर)\\s', '\\s(?:lekin|aur|phir)\\s'],
 demandStart: [],
 imperativeEnds: ['बताओ', 'बताइए', 'बताइये', 'भेजो', 'भेजिए', 'भेजें', 'दीजिए', 'करें', 'करो', 'कीजिए', '\\bbatao', '\\bbataiye', '\\bbhejo', '\\bbhejiye', '\\bdijiye', '\\bkaro', '\\bkijiye'],
};

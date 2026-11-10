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
  advance_fee: ['(?:पहले|pehle).{0,30}(?:deposit|डिपॉजिट|जमा|pay|recharge).{0,60}(?:unlock|अनलॉक|withdraw|विड्रॉ)', 'प्रोसेसिंग फीस', '\\b(?:processing fee|fee|tax)\\b.{0,20}\\b(?:bhej\\w*|jama|de do|dijiye|pay)\\b', '\\brelease ke liye\\b.{0,30}\\bfee\\b'],
  prize: ['(?:लकी ड्रॉ|लॉटरी|इनाम).{0,30}(?:जीत|लगी|लगा|निकला|निकली)', '(?:जीत गया|जीत गए|जीत गई)', '\\b(?:lucky draw|lottery|inaam)\\b.{0,30}\\b(?:jeet\\w*|lagi|laga|nikla|nikli|won)\\b', '\\bjeet gaye\\b'],
  investment_bait: ['गारंटीड', '\\bguaranteed\\b', '\\bvip group\\b', 'प्रतिशत रिटर्न', 'रिटर्न.{0,15}हर (?:हफ्ते|दिन|महीने)', 'पार्ट टाइम (?:जॉब|काम)', '\\b(?:part time job|ghar baithe (?:kamai|job|kaam))\\b', '\\b(?:percent|%)\\s*return', 'टेलीग्राम.{0,40}(?:invest|इन्वेस्ट|ट्रेडिंग)'],
  extortion: ['(?:फोटो|वीडियो).{0,60}(?:ऑफिस|परिवार|कॉन्टैक्ट|सबको|ग्रुप).{0,30}(?:चला जाएगा|चली जाएगी|भेज देंगे|भेजेंगे|डाल देंगे)', '(?:वीडियो|फोटो).{0,30}रिकॉर्ड की', '\\b(?:photo|video)s?\\b.{0,40}\\b(?:office|family|contacts|group|sabko)\\b.{0,30}\\b(?:chala jayega|chali jayegi|bhej denge|daal denge)\\b', 'फोटो.{0,30}(?:कॉन्टैक्ट|सबको|सबके|रिश्तेदारों)', '\\bphoto\\b.{0,30}\\b(?:contacts|sabko|sabke)\\b'],
  family_emergency: [
   '\\b(?:mera|meri)\\s+accident\\b', '\\baccident ho gaya\\b', '\\bhospital (?:mein|me) (?:hoon|hun|hu)\\b', '(?:मेरा|मेरी)\\s*(?:एक्सीडेंट|दुर्घटना)', 'अस्पताल में (?:हूँ|हूं)',
   '(?:बेटा|बेटी|पोता|पोती|भाई|बहन|परिवार).{0,40}(?:गिरफ्तार|अस्पताल|दुर्घटना|हिरासत|जेल)', '(?:माँ|मां|मम्मी|पापा|दादी|नानी|दादा|नाना).{0,60}(?:एक्सीडेंट|दुर्घटना|मुसीबत|अस्पताल|हिरासत)',
   '\\b(?:beta|beti|amma|appa|pota|poti|bhai|behen).{0,40}(?:arrest|giraftar|hospital|accident|jail)', '\\b(?:maa|mummy|papa|dadi|nani)\\b.{0,60}\\b(?:accident|musibat|hospital|phas)',
  ],
 },
 weakTactics: {
  authority: ['पुलिस|सीबीआई|कस्टम्स?|साइबर (?:सेल|क्राइम)|आरबीआई|इनकम टैक्स|crime branch|police|cbi|customs'],
 },
 secret: ['स्क्रीन पर.{0,20}(?:नंबर|कोड)', '(?:फोन|मोबाइल) पर आया.{0,10}(?:कोड|नंबर)', '\\b(?:chhe|chhah|6|chaar|4) digit\\b', '\\b(?:phone|mobile|screen) (?:pe|par) (?:aaya|jo).{0,20}\\b(?:code|number)\\b', 'ओटीपी', 'पिन(?!\\s*कोड)', 'पासवर्ड', 'सीवीवी'],
 identity: ['आधार', 'पैन कार्ड'],
 // Request verbs. "bataya" (told) is a report, not a request, so only imperative or infinitive forms count.
 demand: ['\\b(?:sunao|suna do|padh(?:\\s*kar)?\\s*sunao|bata(?:o|iye|ie|iyega|na|ana|do|dijiye)|bol(?:o|iye|ie)|de\\s?do|dijiye|dena|daal(?:o|iye|ie|na|do)|bhej(?:o|iye|ie|na|do|dijiye)|share (?:karo|kijiye|kar do))\\b', 'डालो', 'डाल दो', 'बता(?:ओ|इए|इये|ना|दो|दीजिए| दो)', 'बोलिए', 'बोलो', 'दीजिए', 'दे दो', '(?:^|\\s)दो(?=\\s|$|।)', 'भेज(?:ो|िए|ें|ना|दो|दीजिए)', 'शेयर (?:कर|करें|कीजिए)', 'डालिए', 'डालें'],
 advice: [
  '\\b(?:otp|password|pin|cvv|paise)\\b(?:(?!\\b(?:batao|bataiye|bhejo|bhejiye|dijiye)\\b).){0,30}\\bmat\\s+(?:dena|do|dijiye|batana|batao|bataiye|bhejna)\\b', '\\b(?:news|khabar)\\s+(?:mein|me)\\s+aaya\\b',
  '\\b(?:otp|password|pin|cvv)\\b.{0,15}\\b(?:nahi|nahin|kabhi nahi)\\s+(?:maang\\w*|puch\\w*|lenge|lete)\\b', '(?:ओटीपी|पासवर्ड|पिन).{0,15}(?:नहीं|कभी नहीं)\\s*(?:माँग|मांग|पूछ)',
  '(?:फर्जी|नकली)\\s*(?:पुलिस|कॉल|अधिकारी|बैंक)', '(?:न्यूज़|न्यूज|खबर|अखबार)\\s*में\\s*(?:देखा|पढ़ा|आया)', '\\b(?:news|khabar)\\s+(?:mein|me)\\s+(?:dekha|padha)\\b',
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
 // Decision 19: amounts and payment verbs are pack data.
 amount: { prefix: ['रु\\.?'], unitsNative: ['रुपये', 'रुपए', 'हजार', 'लाख', 'करोड'] },
 amountVerbs: ['भेज', 'जमा'],
 neverCalls: ['ट्राई'],
 lawEnforcement: ['पुलिस|सीबीआई|कस्टम|ईडी|साइबर|क्राइम ब्रांच|इंस्पेक्टर|अधिकारी|अदालत|कोर्ट'],
};

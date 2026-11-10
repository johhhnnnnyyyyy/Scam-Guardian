// English language pack: data only. Patterns are regular-expression sources compiled case-insensitively with the
// Unicode flag; Latin words may use \b. Every list is a proposal open to review; changes need a test and an
// evaluation run (npm run evaluate).
export default {
 code: 'en-IN',
 tactics: {
  // An authority is a CLAIM ("this is", "I am from", "connecting you to", "... officer/department"), not a mention:
  // "customs duty on your item" or "CBI and police do not arrest" must not count.
  authority: [
   "\\b(?:i am|i'm|this is|we are|calling from|speaking from|from|connecting you to|transferring you to|on behalf of)\\b.{0,30}\\b(?:cbi|police|customs|trai|dot|cyber cell|cyber crime|crime branch|enforcement directorate|narcotics|ncb|income tax|reserve bank|rbi|ed|nia|court|electricity board|kyc (?:department|team)|fedex|dhl)\\b",
   '\\b(?:cbi|police|customs|trai|cyber|narcotics|ncb|income tax|rbi|ed|nia|crime branch)\\s+(?:officer|officers|official|department|dept|here|speaking|calling|team|inspector)\\b',
   '\\b(?:bank officer|crime branch|enforcement directorate|court order|judge)\\b',
  ],
  threat: [
   '\\b(?:arrest(?:ed)?|warrant|jail|legal action|block your sim|cut off|disconnect(?:ed|ion)?)\\b',
   '\\bcase\\b.{0,40}\\b(?:registered|filed|against you)\\b', '\\bfir\\b',
   '\\b(?:money.?laundering|drug trafficking|illegal activit(?:y|ies))\\b',
   '\\b(?:parcel|package|courier)\\b.{0,50}\\b(?:narcotics|drugs|passports?|contraband)\\b', '\\bdrugs in.*parcel',
   '\\baccount\\b.{0,25}\\b(?:frozen|freeze|blocked|suspended|locked|deactivated)\\b.{0,30}(?:\\b(?:tonight|today|now|hours?|minutes)\\b|if you don.?t)',
   '\\b(?:suspend(?:ed)?|block(?:ed)?|lock(?:ed)?)\\s+your\\s+(?:account|sim|number)\\b',
   '\\b(?:power|electricity|connection|meter)\\b.{0,30}\\b(?:cut|disconnected)\\b',
  ],
  urgency: ['\\b(?:right now|immediately|within.*minutes|in (?:\\d+|ten|five|two) (?:minutes|hours)|(?:one|two|three|four|five|ten|\\d+) minutes? (?:left|remaining)|urgent|last chance|before (?:midnight|tonight)|(?:closes|ends|expires) (?:tonight|today)|only \\d+ slots)\\b'],
  secrecy: ["\\b(?:don'?t tell|dont tell|do not tell|never tell|tell no ?one|nobody (?:should|must) know|keep (?:this|it) (?:a )?(?:secret|confidential|between us)|keep.{0,20}secret|between (?:us|you and me)|(?:do not|don'?t) talk to (?:anyone|anybody|your family)|confidential case)\\b"],
  payment: ['\\b(?:transfer|send money|pay|payment|safe account|deposit|upi transfer|gpay|phonepe|paytm)\\b'],
  remote: [
   '\\b(?:anydesk|teamviewer|rustdesk|quick ?support|remote access)\\b', '\\binstall.*\\b(?:apk|app)\\b', '\\bshare.*screen\\b', '\\bscreen.?shar',
   '\\bdownload\\b.{0,20}\\b(?:apk|app)\\b', '\\b(?:through|via|click(?: on)?|open) (?:this|the) link\\b', '\\bgive (?:us )?access to your (?:phone|device|computer)\\b',
  ],
  camera: ["\\b(?:stay on (?:the |this )?(?:camera|video(?: call)?|line|call)|keep.{0,20}(?:camera|video) on|turn on your camera|do not disconnect|don'?t (?:disconnect|cut|end|hang up)(?: the call)?)\\b"],
  impossible: [
   '\\b(?:digital arrest|pay to avoid arrest|money for verification|bail amount|pay (?:a |the )?bail)\\b', '\\barrest(?:ed)?.{0,20}video call',
   '\\b(?:transfer|send|pay)\\b.{0,25}\\b(?:money|funds|amount|rupees|savings|balance)\\b.{0,40}\\b(?:verify|verification|safe account)\\b',
   '\\b(?:rbi|bank) (?:safe|verification) account\\b', '\\bsafe account\\b.{0,40}\\breturned\\b',
   // NPCI: a UPI PIN or a QR scan is never needed to receive money.
   '\\b(?:scan|enter|approve|type)\\b.{0,40}\\b(?:to (?:receive|get)|refund|credited|cashback)\\b', '\\b(?:pin|qr|collect request)\\b.{0,40}\\bto (?:receive|get) (?:it|the money|the refund|money)\\b',
  ],
  advance_fee: [
   '\\b(?:first|pehle)\\b.{0,30}\\b(?:deposit|pay|recharge|top[- ]?up)\\b.{0,60}\\b(?:unlock|withdraw|activate|release|higher commission)\\b', '\\bunlock\\b.{0,40}\\b(?:deposit|pay)\\b',
   '\\b(?:pay|deposit|send)\\b.{0,40}\\b(?:processing fee|fee|tax|charges)\\b.{0,40}\\b(?:release|prize|loan|withdraw|unlock|claim|disbursal)\\b',
   '\\b(?:release|withdraw|unlock|claim)\\b.{0,40}\\b(?:pay|deposit)\\b.{0,30}\\b(?:fee|tax|charges)\\b', '\\bdeposit first to unlock\\b',
  ],
  prize: ['\\b(?:won|winner of|you have been selected)\\b.{0,40}\\b(?:lucky draw|lottery|prize|kbc|jackpot|lakh|crore)\\b', '\\bkbc lucky draw\\b'],
  investment_bait: ['\\bguaranteed\\b.{0,30}\\b(?:returns?|profit|percent|%)\\b', '\\b\\d+\\s*(?:percent|%)\\s*(?:returns?|profit)\\b', '\\b(?:returns?|profit)\\b.{0,20}\\b(?:every|per|each)\\s+(?:day|week|month)\\b', '\\b(?:part[- ]time|work from home|online)\\s+(?:job|work)\\b.{0,80}\\b(?:tasks?|likes?|ratings?|reviews?|commission)\\b', '\\btelegram (?:group|channel)\\b.{0,60}\\b(?:invest\\w*|trading|returns?)\\b', '\\bvip (?:group|channel)\\b', '\\b(?:unlock tasks|task commission|earn commission)\\b', '\\bwithdraw your profit\\b'],
  extortion: ['\\byour (?:edited|morphed|private) (?:photos?|pictures?|videos?)\\b', '\\b(?:photos?|pictures?|videos?)\\b.{0,40}\\b(?:will be|gets?|goes|go)\\s+(?:sent|shared|posted|leaked|to)\\b.{0,30}\\b(?:contacts|family|friends|office|everyone|group)\\b', '\\brecorded (?:your|a) (?:video|video chat|call)\\b', '\\b(?:send|share|post|leak)\\b.{0,20}\\byour (?:photos?|pictures?|videos?)\\b.{0,30}\\b(?:contacts|family|friends|everyone)\\b', '\\bcontacts will (?:get|receive) messages\\b', '\\bmorphed\\b'],
  family_emergency: [
   '\\bi (?:had|met with|have had) (?:an|a bad|a serious) accident\\b', "\\bi(?:'m| am) (?:in|at) (?:the )?hospital\\b", '\\bi (?:have been|got|was) (?:arrested|detained)\\b',
   '\\b(?:your|my) (?:son|daughter|husband|wife|father|mother|child|grandson|granddaughter|grandchild|grandfather|grandmother|friend|nephew|niece|brother|sister|family member).{0,50}(?:arrested|custody|jail|police station|hospital|accident|emergency|kidnapped|trouble)',
   "\\b(?:mom|mum|mummy|dad|papa|grandma|grandpa|granny|nani|dadi)\\b.{0,60}\\b(?:accident|trouble|hospital|arrested|custody|police)\\b",
   "\\b(?:new number|my phone (?:broke|is broken|was stolen|got lost))\\b", '\\bhospital\\b.{0,40}\\b(?:deposit|money|amount)\\b.{0,50}\\b(?:send|transfer|pay)\\b',
  ],
 },
 // Decision 21: a bare institution name with no claim is WEAK evidence: shown in the ledger, never in family reasons,
 // never promoted by a strong ask, and never enough alone. Negated advice ("CBI does not call") is still skipped.
 weakTactics: {
  authority: ['\\b(?:cbi|police|customs|trai|cyber cell|cyber crime|crime branch|enforcement directorate|narcotics|ncb|income tax department|reserve bank|rbi|nia|fedex|dhl)\\b'],
 },
 secret: ['\\b(?:six|6|four|4)[- ]digit (?:code|number|otp)\\b', '\\bcode (?:that )?(?:came|come|arrived) on (?:your|the) (?:phone|mobile)\\b', '\\bnumber (?:on|showing on) (?:your|the) screen\\b', '\\b(?:otp|one[- ]time password|cvv|m-?pin|upi pin|atm pin|pin(?!\\s*code)|password|passcode|verification code|security code|card details)\\b', '\\bcode (?:you|that) (?:received|got|came)', '\\bnumber that came on your phone', '\\b(?:the )?code (?:shown|on (?:the|your) screen)'],
 identity: ['\\b(?:aadha?a?r|pan (?:card|number|details)|date of birth|bank account (?:number|details)|bank details|account number|card number|kyc details)\\b'],
 demand: ['\\b(?:tell|share|give|send|read|confirm|enter|type|(?:i|we) need|provide|say|spell|forward|verify)\\b'],
 // Negated or educational lines, and redirections to an official channel, are not demands.
 advice: [
  '\\b(?:fake|fraud|farzi|nakli)\\s+(?:police|cbi|officers?|calls?|bank calls?)\\b', '\\b(?:saw|read|heard)\\b.{0,30}\\b(?:news|paper|tv)\\b',
  "\\b(?:never (?:share|send|pay|install|ask|asks|need)|will never|will not ask|won'?t ask|do not need|don'?t need|(?:does|do) not (?:call|ask|charge|arrest|need)|(?:is|are) not (?:required|needed)|not required (?:for|to)|do not download|don'?t download|never tell (?:anyone|anybody|strangers) (?:your )?(?:otp|pin|password|cvv)|(?:no|not under|no such thing as(?: a)?) digital arrest|don'?t (?:share|send|pay|install)|do not (?:share|send|pay|install))\\b",
  '\\b(?:only (?:on|through|from) (?:the )?official|install only from)\\b', '\\bofficial\\b.{0,30}\\b(?:website|portal|app|counter|notice)\\b', '\\b(?:otp|pin) only (?:to|for)\\b',
 ],
 adviceExceptions: ['\\bif you\\b', "\\bif you don.?t\\b"],
 acts: {
  // Quoting or describing what someone else said (the speaker is not making the request).
  reported: ['\\b(?:said|says|told (?:me|her|him|us|them)|asked (?:her|him|them)|according to|the news|in the news|news said|reported|apparently|warned (?:us|people)|a caller asked)\\b'],
  // The speaker describing their own or a third person's ordinary past events.
  narration: ['\\b(?:i|we) (?:paid|gave|changed|went|bought|had|visited|sent|met|called|told)\\b', '\\bmy (?:son|daughter|grandson|granddaughter|husband|wife|neighbour|neighbor|friend|brother|sister)\\b (?:is|was|had|has|works|visits|called|went)\\b', '\\b(?:yesterday|last (?:week|month|year)|this morning)\\b'],
  // A request or instruction aimed at the listener.
  demand: ['\\b(?:send|share|give|tell|read|enter|forward|transfer|pay)\\b.{0,30}\\b(?:to me|with me|to us|with us)\\b', '\\b(?:said|told (?:me|us)|asked (?:me|us))\\b.{0,20}\\b(?:share|send|pay|tell|give|enter|install|download|transfer|scan|approve)\\b', '^(?:please\\s+)?(?:send|pay|transfer|tell|share|give|install|download|enter|scan|approve|stay|keep|turn|press|join|deposit|complete|click|open|read|confirm|verify|do not|don\'?t)\\b', '\\byou (?:must|have to|need to|should)\\b', '\\b(?:share|tell|give|send) (?:me|us) your\\b', '\\byour\\b.{0,40}\\b(?:now|immediately|today)\\b'],
  secondPerson: ['\\b(?:you|your)\\b'],
 },
 separators: ['\\s(?:but|and|then|so)\\s'],
 demandStart: ["(?:just\\s+|now\\s+)?(?:(?:tell|give|send|share|read|confirm|enter|type|say)\\s+(?:me|us)\\b|(?:transfer|pay|deposit|install|download)\\b)"],
 imperativeEnds: [],
 // Decision 19: amounts, payment verbs, remote-access tool names and bodies that publicly never call are pack data.
 amount: { prefix: ['₹', '\\brs\\.?', '\\binr\\b'], units: ['rupees?', 'rupaye', 'rupay', 'rs', 'lakhs?', 'crores?', 'thousand', 'hazaa?r'], words: ['\\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twenty|fifty|hundred)\\s+(?:thousand|lakh|crore)(?:\\s+rupees?)?\\b'] },
 amountVerbs: ['\\b(?:send|pay|transfer|deposit|bhej\\w*)\\b'],
 ownPayment: ['\\bto (?:complete|make|confirm) (?:the |your |this )?payment\\b'],
 remoteTools: ['\\b(?:apk|anydesk|teamviewer|rustdesk|quick ?support)\\b'],
 neverCalls: ['\\b(?:trai|dot)\\b'],
 // Batch 6: an authority claim ALONE asks for care only for law-enforcement or investigative bodies; a utility or
 // service claim alone ("this is the electricity board") is not enough.
 lawEnforcement: ['\\b(?:police|cbi|ed|enforcement directorate|customs|narcotics|ncb|nia|cyber (?:cell|crime|police)|crime branch|inspector|officer|court|judge|trai|dot)\\b'],
};

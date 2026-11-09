import { randomUUID } from 'node:crypto';

export const languages = ['en-IN','hi-IN','ta-IN'];
export const rank = {safe:0,careful:1,danger:2};
const rules = [
 ['authority','Authority claim', /\b(cbi|police|customs|trai|bank officer|cyber cell|enforcement directorate)\b|पुलिस|सीबीआई|बैंक अधिकारी|காவல்|போலீஸ்/iu],
 ['threat','Arrest or disconnection threat', /\b(arrest(?:ed)?|disconnect|block your sim|cut off|drugs in.*parcel)\b|गिरफ्तार|गिरफ़्तार|बंद कर|கைது|துண்டிக்க/iu],
 ['urgency','Pressure to act quickly', /\b(right now|immediately|within.*minutes|(?:one|two|three|four|five|ten|\d+) minutes? (?:left|remaining)|urgent|abhi|turant)\b|अभी|तुरंत|உடனே|உடனடியாக/iu],
 ['secrecy','Asked to keep it secret', /\b(don.t tell|do not tell|never tell|tell no one|keep.*secret|kisi ko mat|family ko mat)\b|किसी को मत|परिवार को मत|யாரிடமும்.*சொல்ல/iu],
 ['payment','Money transfer request', /\b(transfer|send money|pay|payment|safe account|paise bhej|paisa bhej)\b|पैसे भेज|पैसे जमा|ट्रांसफर|பணம்.*அனுப்ப|பணத்தை.*அனுப்ப/iu],
 ['credential','Secret or identity request', /\b(?:tell|share|give|send|bata|batao)\b.{0,35}\b(?:otp|pin|password|aadhaar|pan|card)\b|\b(?:otp|pin|password)\b.{0,25}\b(?:batao|bataiye|sollunga|sollu|kodu)\b|(?:ओटीपी|पिन|पासवर्ड).{0,20}(?:बताइ|बताओ|दीजिए)|(?:ஓடிபி|கடவுச்சொல்).{0,25}(?:சொல்ல|தர)/iu],
 ['remote','App installation or screen sharing', /\b(install.*(?:apk|anydesk|app)|share.*screen|screen.?shar|download.*apk)\b|ऐप इंस्टॉल|स्क्रीन शेयर|செயலி.*நிறுவ|திரையை.*பகிர/iu],
 ['camera','Asked to stay on camera', /\b(stay on camera|keep.*camera on|do not disconnect)\b|कैमरा चालू|கேமரா.*இரு/iu],
 ['impossible','Digital arrest or payment to avoid arrest', /\b(digital arrest|arrest.*video call|pay to avoid arrest|transfer.*to verify|transfer.*for verification)\b|डिजिटल अरेस्ट|गिरफ्तारी से बचने.*पैसे|டிஜிட்டல் கைது/iu],
 ['family_emergency','Claimed family emergency', /\b(?:your|my) (?:son|daughter|husband|wife|father|mother|child|family member).{0,50}(?:arrested|custody|hospital|accident|emergency)|\b(?:beta|beti|amma|appa).{0,40}(?:arrest|hospital|accident)|(?:बेटा|बेटी|परिवार).{0,40}(?:गिरफ्तार|अस्पताल|दुर्घटना)|(?:மகன்|மகள்|குடும்பம்).{0,40}(?:கைது|மருத்துவமனை|விபத்து)/iu],
];
// Narrow educational/negative clauses are excluded, not arbitrary whole transcripts.
function advice(clause) {
 if(/\bif you\b/iu.test(clause)) return false;
 return /\b(never (?:share|send|pay|install|ask)|will never|will not ask|won.t ask|do not need|(?:no|not under) digital arrest|don.t (?:share|send|pay|install)|do not (?:share|send|pay|install))\b|(?:ओटीपी|पैसे|पासवर्ड|पिन).*मत|(?:பகிர|அனுப்ப).*வேண்டாம்/iu.test(clause);
}
export function analyze(segments) {
 const flags=[];
 for(const s of segments) {
  for(const clause of s.text.split(/[.!?।\n]+|\bbut\b|\band\b/iu).filter(Boolean)) {
   if(advice(clause)) continue;
   for(const [tactic,label,re] of rules) if(re.test(clause) && !flags.some(f=>f.tactic===tactic && f.segmentId===s.id)) flags.push({tactic,label,segmentId:s.id,quote:s.text,source:'rule'});
  }
 }
 // A speech boundary can cut a request in half. Match only adjacent, unfinished
 // utterances within ten seconds; attach each original fragment as evidence.
 for(let i=1;i<segments.length;i++){
  const a=segments[i-1],b=segments[i];
  if(b.at-a.at>10000||/[.!?।]$/.test(a.text.trim()))continue;
  const joined=`${a.text} ${b.text}`;
  if(advice(joined))continue;
  for(const [tactic,label,re] of rules){
   if(!['credential','impossible','remote'].includes(tactic)||re.test(a.text)||re.test(b.text)||!re.test(joined))continue;
   for(const s of [a,b])if(!flags.some(f=>f.tactic===tactic&&f.segmentId===s.id))flags.push({tactic,label,segmentId:s.id,quote:s.text,source:'rule',relatedSegmentIds:[a.id,b.id]});
  }
 }
 return {risk:riskFor(flags),flags};
}
export function riskFor(flags) {
 const t=new Set(flags.map(f=>f.tactic));
 if(t.has('impossible')||t.has('credential')||(t.has('remote')&&(t.has('payment')||flags.some(f=>/apk|anydesk/i.test(f.quote))))||(t.has('authority')&&t.has('payment')&&(t.has('secrecy')||t.has('threat')))) return 'danger';
 return [...t].some(x=>x!=='payment')?'careful':'safe';
}
export function createSession(language,mode,now=Date.now()) {
 return {id:randomUUID(),createdAt:now,expiresAt:now+900000,language,mode,risk:'safe',status:'waiting',segments:[],flags:[],firstWarningAt:null,sharing:false,classifier:'rules',llmStatus:'not configured'};
}
export function appendSegment(s,text,at=Date.now(),id=randomUUID()) {
 if(s.segments.some(x=>x.id===id)) return s;
 s.segments.push({id,text,at}); s.segments=s.segments.slice(-200);
 const result=analyze(s.segments.filter(x=>at-x.at<=60000));
 if(rank[result.risk]>=rank[s.risk]) {s.risk=result.risk;s.flags=result.flags;}
 if(s.risk!=='safe'&&!s.firstWarningAt) s.firstWarningAt=at;
 s.status='analyzed'; return s;
}
export function intervention(s) {
 const latest=s.segments.at(-1)?.at??Date.now(),recent=s.segments.filter(x=>latest-x.at<=60000),currentFlags=analyze(recent).flags;
 const text=recent.map(x=>x.text).join(' ');
 const payment=currentFlags.some(f=>f.tactic==='payment');
 const amount=/(?:₹|INR|Rs\.?)\s*[\d,]+(?:\.\d{1,2})?/iu.test(text);
 return {askCodeWord:currentFlags.some(f=>f.tactic==='family_emergency'),coolingOff:payment&&amount};
}
export function mergeGroundedFlags(s,flags,now=Date.now()){
 const recent=s.segments.filter(x=>now-x.at<=60000);
 const grounded=flags.filter(f=>recent.some(seg=>seg.id===f.segmentId&&seg.text.includes(f.quote)));
 const combined=[...analyze(recent).flags,...grounded],risk=riskFor(combined);
 if(rank[risk]>=rank[s.risk]){s.risk=risk;s.flags=combined.slice(-40);if(risk!=='safe'&&!s.firstWarningAt)s.firstWarningAt=now;}
}
export function familyView(s) { return {risk:s.risk,status:s.status,hasSpeech:s.segments.length>0,language:s.language,reasons:[...new Set(s.flags.map(f=>f.label))],updatedAt:s.segments.at(-1)?.at||s.createdAt,expiresAt:s.expiresAt,mode:s.mode}; }
export function evidencePack(s) {
 const text=s.segments.map(x=>x.text).join('\n');
 const upiIds=[...text.matchAll(/[\w.-]+@[a-z][a-z0-9]*/gi)].filter(match=>!/\.[a-z]{2,}\b/i.test(text.slice(match.index+match[0].length,match.index+match[0].length+8))).map(match=>match[0]);
 return {schemaVersion:1,sessionId:s.id,createdAt:new Date(s.createdAt).toISOString(),exportedAt:new Date().toISOString(),language:s.language,risk:s.risk,provenance:['demo','text'].includes(s.mode)?'synthetic transcript':'Gnani Prisma transcript',classifier:s.classifier,flags:s.flags,segments:s.segments,entities:{unverified:true,amounts:text.match(/(?:₹|INR|Rs\.?)\s*[\d,]+(?:\.\d{1,2})?/gi)||[],upiIds,numericIdentifiers:text.match(/\b\d{6,16}\b/g)||[]},limitations:['Not a verified caller identity or official complaint.','Transcription and tactic detection may be wrong.','No audio retained by this application.']};
}
export const tacticLabels=Object.fromEntries(rules.map(([key,label])=>[key,label]));

import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, createSession, appendSegment, evidencePack, familyView, mergeGroundedFlags } from '../src/engine.js';

test('combines tactics across recent segments and retains exact evidence', () => {
 const s=createSession('en-IN','demo');
 appendSegment(s,'I am a CBI officer.',1000);
 assert.equal(s.risk,'careful');
 appendSegment(s,'Do not tell your family.',2000);
 appendSegment(s,'Transfer money to this account.',3000);
 assert.equal(s.risk,'danger');
 assert.ok(s.flags.some(f=>f.quote==='Do not tell your family.'));
});
test('payment alone does not declare scam; advice and negation stay clear',()=>{
 for(const text of ['Please pay for your delivery.','Never share your OTP.','Police will never ask you to transfer money.','There is no digital arrest.','Do not install an APK.','You do not need to pay to avoid arrest.']) assert.notEqual(analyze([{id:'x',text,at:1}]).risk,'danger',text);
 assert.equal(analyze([{id:'x',text:'Never share your OTP.',at:1}]).flags.length,0);
});
test('hard claims and sensitive requests escalate',()=>{
 for(const text of ['You are under digital arrest.','Pay to avoid arrest.','Tell me your OTP.','Install this APK and share your screen.']) assert.equal(analyze([{id:'x',text,at:1}]).risk,'danger',text);
});
test('Hindi, Hinglish and Tamil risky scripts',()=>{
 for(const text of ['आप डिजिटल अरेस्ट में हैं।','Aap digital arrest mein hain.','உங்களை டிஜிட்டல் கைது செய்கிறோம்.','अपना ओटीपी बताइए।']) assert.equal(analyze([{id:'x',text,at:1}]).risk,'danger',text);
});
test('expired segments do not combine and risk latches once raised',()=>{
 const s=createSession('en-IN','demo'); appendSegment(s,'I am a police officer.',1000); appendSegment(s,'Do not tell family. Transfer money.',70000);
 assert.notEqual(s.risk,'danger');
 appendSegment(s,'You are under digital arrest.',71000); appendSegment(s,'Hello.',150000); assert.equal(s.risk,'danger');
});
test('sessions isolate, deduplicate, bound memory; family excludes transcript',()=>{
 const a=createSession('en-IN','demo'), b=createSession('en-IN','demo');
 appendSegment(a,'Tell me your OTP.',1000,'same'); appendSegment(a,'Tell me your OTP.',1001,'same');
 assert.equal(a.segments.length,1); assert.equal(b.risk,'safe');
 const f=JSON.stringify(familyView(a)); assert.ok(!f.includes('Tell me')); assert.ok(!f.includes('segments'));
 assert.equal(evidencePack(a).provenance,'synthetic transcript');
 for(let i=0;i<210;i++) appendSegment(a,'Hello',2000+i); assert.ok(a.segments.length<=200);
});
test('conditional threats and secrecy are not mistaken for negative safety advice',()=>{
 for(const text of ['I am a police officer and will not arrest you if you transfer money now.','I am a CBI officer. Never tell your family and send money to this safe account.']) assert.equal(analyze([{id:'x',text,at:1}]).risk,'danger',text);
});
test('split sensitive requests retain the exact source fragments',()=>{
 const s=createSession('en-IN','demo');appendSegment(s,'Tell me your',1000);appendSegment(s,'OTP',2000);assert.equal(s.risk,'danger');assert.ok(s.flags.some(f=>f.quote==='Tell me your'));assert.ok(s.flags.some(f=>f.quote==='OTP'));
});
test('family projection distinguishes listening without speech',()=>{const s=createSession('en-IN','live');s.status='listening';assert.equal(familyView(s).hasSpeech,false);appendSegment(s,'Hello');assert.equal(familyView(s).hasSpeech,true);});
test('inflected arrest and Hindi secrecy survive segmentation',()=>{
 for(const lines of [['Police department here.','You will be arrested.','Send money now.'],['मैं पुलिस अधिकारी हूँ।','परिवार को मत बताना।','पैसे भेजें।']]){const s=createSession('en-IN','demo');lines.forEach((line,i)=>appendSegment(s,line,1000+i));assert.equal(s.risk,'danger');}
});
test('LLM payment cannot combine with expired latched authority and secrecy',()=>{
 const s=createSession('en-IN','demo',0);appendSegment(s,'I am a CBI officer. Keep this secret.',1,'old');appendSegment(s,'Please transfer money.',61002,'new');
 mergeGroundedFlags(s,[{tactic:'payment',label:'Money transfer request',segmentId:'new',quote:'transfer money',source:'llm'}],61003);
 assert.equal(s.risk,'careful');
});

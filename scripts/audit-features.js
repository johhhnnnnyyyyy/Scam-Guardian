// Non-browser diagnostic audit. Failing results expose known implementation gaps;
// this is deliberately separate from the existing regression-test suite.
import { analyze, createSession, appendSegment, evidencePack } from '../src/engine.js';
import { mkdir, writeFile } from 'node:fs/promises';
const inspect=text=>analyze([{id:'audit',text,at:1}]);
const probes=[];
for(const text of ['Tell me your pancake recipe.','Give me your cardigan size.','You are not under digital arrest.']){
 const actual=inspect(text).risk;
 probes.push({requirement:'2/4: avoid obvious benign false alarms',input:text,expected:'safe',actual,pass:actual==='safe'});
}
const urgency=inspect('You have five minutes left.').flags.map(f=>f.tactic);
probes.push({requirement:'2: countdown urgency tactic',input:'You have five minutes left.',expected:'urgency tactic (not proof of scam by itself)',actual:urgency,pass:urgency.includes('urgency')});
const tamil=inspect('Ungal OTP sollunga.');
probes.push({requirement:'7: romanized Tamil request coverage',input:'Ungal OTP sollunga.',expected:'credential tactic',actual:tamil.flags.map(f=>f.tactic),pass:tamil.flags.some(f=>f.tactic==='credential')});
const session=createSession('en-IN','text');
appendSegment(session,'Invoice amount is INR 1,250.50. Contact help@example.com.');
const entities=evidencePack(session).entities;
probes.push({requirement:'4/13: preserve decimal amounts',input:'INR 1,250.50',expected:['INR 1,250.50'],actual:entities.amounts,pass:entities.amounts.includes('INR 1,250.50')});
probes.push({requirement:'4/13: distinguish email from UPI',input:'help@example.com',expected:[],actual:entities.upiIds,pass:entities.upiIds.length===0});
const report={kind:'targeted feature-gap diagnostics; not an accuracy benchmark',generatedAt:new Date().toISOString(),passed:probes.filter(p=>p.pass).length,failed:probes.filter(p=>!p.pass).length,probes};
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/feature-audit-probes.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
process.exitCode=report.failed?1:0;

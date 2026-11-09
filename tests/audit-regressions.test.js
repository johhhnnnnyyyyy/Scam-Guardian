import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,appendSegment,createSession,evidencePack} from '../src/engine.js';

test('benign substrings and negated digital arrest do not trigger red',()=>{
 for(const line of ['Tell me your pancake recipe.','Give me your cardigan size.','You are not under digital arrest.']) assert.equal(analyze([{id:'x',text:line,at:1}]).risk,'safe',line);
});
test('countdown and romanized Tamil requests are recognized',()=>{
 assert.ok(analyze([{id:'x',text:'You have five minutes left.',at:1}]).flags.some(f=>f.tactic==='urgency'));
 assert.ok(analyze([{id:'x',text:'Ungal OTP sollunga.',at:1}]).flags.some(f=>f.tactic==='credential'));
});
test('entity extraction preserves decimal amounts and rejects email as UPI',()=>{
 const s=createSession('en-IN','text');appendSegment(s,'Invoice INR 1,250.50. Mail help@example.com. Transfer to person@okicici.');const e=evidencePack(s).entities;
 assert.ok(e.amounts.includes('INR 1,250.50'));assert.deepEqual(e.upiIds,['person@okicici']);
});

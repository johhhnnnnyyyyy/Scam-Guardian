import test from 'node:test';
import assert from 'node:assert/strict';
import {familyState} from '../public/family-state.js';
import {warningQueue} from '../public/warning-queue.js';
test('family silence and stopped capture never show live Safe',()=>{
 for(const status of ['waiting','listening','stopped']){const result=familyState({status,hasSpeech:false,risk:'safe',language:'en-IN'});assert.equal(result.risk,'idle');assert.match(result.message,/No speech/);}
 assert.equal(familyState({status:'stopped',hasSpeech:true,risk:'safe',language:'en-IN'}).title,'Listening stopped');
});
test('pending amber is discarded and red is prepared sequentially',async()=>{
 let release;const gate=new Promise(r=>release=r),prepared=[],played=[],errors=[];
 const q=warningQueue({prepare:async item=>{prepared.push(item);if(item==='careful')await gate;return item;},play:async value=>played.push(value),onError:e=>errors.push(e)});
 const task=q.enqueue('careful');q.enqueue('danger');release();await task;assert.deepEqual(prepared,['careful','danger']);assert.deepEqual(played,['danger']);assert.deepEqual(errors,[]);
});
test('cancelled session cannot play late audio; failed speech can retry',async()=>{
 let release;const gate=new Promise(r=>release=r),played=[];const q=warningQueue({prepare:()=>gate,play:async v=>played.push(v),onError:()=>{}});const task=q.enqueue('danger');q.cancel();release('audio');await task;assert.deepEqual(played,[]);
 let attempts=0,errors=0;const retry=warningQueue({prepare:async()=>{if(!attempts++)throw Error();return 'audio';},play:async v=>played.push(v),onError:()=>errors++});await retry.enqueue('danger');await retry.enqueue('danger');assert.equal(errors,1);assert.deepEqual(played,['audio']);
});

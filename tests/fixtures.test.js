import test from 'node:test';
import assert from 'node:assert/strict';
import {calls} from '../fixtures/calls.js';
test('evaluation corpus has 50 scam and 50 benign unique synthetic scripts',()=>{
 assert.equal(calls.filter(c=>c.label==='scam').length,50);assert.equal(calls.filter(c=>c.label==='benign').length,50);assert.equal(new Set(calls.map(c=>c.id)).size,100);assert.equal(new Set(calls.map(c=>c.segments.join('\n'))).size,100);
 for(const c of calls){assert.ok(['en-IN','hi-IN','ta-IN'].includes(c.language));assert.ok(c.segments.every(x=>typeof x==='string'&&x.length<=2000));}
});

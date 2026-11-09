import test from 'node:test';
import assert from 'node:assert/strict';
import {wordErrorRate} from '../src/metrics.js';
test('WER counts insertion deletion substitution and empty reference explicitly',()=>{
 assert.equal(wordErrorRate('send money now','send cash now').wer,1/3);
 assert.equal(wordErrorRate('send money now','send now').errors,1);
 assert.equal(wordErrorRate('send money','please send money').errors,1);
 assert.equal(wordErrorRate('','noise').wer,null);
 assert.equal(wordErrorRate('अपना ओटीपी बताइए','अपना ओटीपी बताइए').wer,0);
});

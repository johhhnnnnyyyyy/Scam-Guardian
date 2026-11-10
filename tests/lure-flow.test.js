import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

// Role-play C24: friendly lure first, the real ask only in the next line. Guardian must stay calm on the lure and
// warn on the ask. The stand-in model is deliberately jumpy: it flags the bonus announcement as an unexpected prize.
async function start(t, config) {
 const app = createApp({ gnaniKey: '', ...config });
 await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
 t.after(() => app.close());
 const base = `http://127.0.0.1:${app.server.address().port}`;
 const call = async (path, { method = 'GET', body } = {}) => {
  const r = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Origin: base }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
 };
 return { app, call };
}

const LURE = 'Very good. The government has announced a bonus of ten thousand rupees for pensioners this year.';
const ASK = 'To credit the bonus I need to verify your account. Please tell me the OTP you will receive now.';

const jumpyModel = async (_url, init) => {
 const { segments } = JSON.parse(JSON.parse(init.body).messages[1].content);
 const flags = [];
 for (const s of segments) {
  if (s.text.includes('bonus of ten thousand rupees')) flags.push({ tactic: 'prize', segmentId: s.id, quote: 'bonus of ten thousand rupees' });
  if (s.text.includes('tell me the OTP')) flags.push({ tactic: 'credential', segmentId: s.id, quote: 'tell me the OTP' });
 }
 return Response.json({ choices: [{ message: { content: JSON.stringify({ flags }) } }] });
};

test('C24: a lure with no ask stays calm even when the AI model flags it; the ask next line still warns', async t => {
 const { app, call } = await start(t, { llmKey: 'fake', llmModel: 'test', fetcher: jumpyModel });
 const { id } = (await call('/api/sessions', { method: 'POST', body: { language: 'en-IN', mode: 'text', consent: true } })).data;

 await call(`/api/sessions/${id}/segments`, { method: 'POST', body: { text: LURE } });
 await app.settle();
 const afterLure = (await call(`/api/sessions/${id}`)).data;
 assert.equal(afterLure.risk, 'safe', 'an announcement alone is not a warning');
 assert.deepEqual(afterLure.flags, [], 'and no clue is listed yet');

 await call(`/api/sessions/${id}/segments`, { method: 'POST', body: { text: ASK } });
 await app.settle();
 const afterAsk = (await call(`/api/sessions/${id}`)).data;
 assert.equal(afterAsk.risk, 'danger', 'the OTP request is what triggers the warning');
});

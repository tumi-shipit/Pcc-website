const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const secretBytes = Buffer.from('local-test-secret-not-production');
const orderId = '11111111-1111-4111-8111-111111111111';

function setup({ completion = true, delivery = true } = {}) {
  const calls = [];
  const db = { rpc: async (name, args) => { calls.push({ type: 'complete', name, args }); return { data: completion }; }, from: name => ({ update: value => ({ eq: () => ({ neq: async () => { calls.push({ type: 'failed', name, value }); return {}; } }) }) }) };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/api/yoco/webhook/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, Buffer, Response, Date, console: { error() {} }, process: { env: { YOCO_WEBHOOK_SECRET: `whsec_${secretBytes.toString('base64')}` } }, require: name => {
    if (name === 'node:crypto') return crypto;
    if (name.includes('serverSupabase')) return { createServerSupabase: () => db };
    if (name.includes('telegramPayments')) return { notifyTelegramPayment: async (...args) => { calls.push({ type: 'alert', args }); return delivery; } };
    throw new Error(name);
  } };
  vm.runInNewContext(code, context);
  return { post: context.exports.POST, calls };
}
function request(kind = 'registration', { invalid = false, stale = false, type = 'payment.succeeded' } = {}) {
  const body = JSON.stringify({ id: 'event-test', type, payload: { id: 'payment-test', mode: 'live', amount: 10000, currency: 'ZAR', metadata: { orderId, orderKind: kind } } });
  const timestamp = String(Math.floor(Date.now() / 1000) - (stale ? 600 : 0));
  const signature = crypto.createHmac('sha256', secretBytes).update(`test-event.${timestamp}.${body}`).digest('base64');
  return new Request('http://localhost/api/yoco/webhook', { method: 'POST', body, headers: { 'webhook-id': 'test-event', 'webhook-timestamp': timestamp, 'webhook-signature': `v1,${invalid ? 'bad' : signature}` } });
}
for (const [kind, name] of [['registration', 'complete_registration_payment_order'], ['store', 'complete_store_order'], ['membership', 'complete_membership_order']]) {
  test(`${kind}: signed confirmation records payment before requesting alert`, async () => {
    const s = setup(); assert.equal((await s.post(request(kind))).status, 200);
    assert.equal(s.calls[0].type, 'complete'); assert.equal(s.calls[0].name, name);
    assert.equal(s.calls[1].type, 'alert'); assert.equal(s.calls[1].args[0], kind);
    assert.equal(s.calls[1].args[2], 10000);
  });
}
test('invalid signature changes nothing and sends no alert', async () => {
  const s = setup(); assert.equal((await s.post(request('store', { invalid: true }))).status, 403); assert.equal(s.calls.length, 0);
});
test('stale signed request is rejected', async () => {
  const s = setup(); assert.equal((await s.post(request('store', { stale: true }))).status, 403); assert.equal(s.calls.length, 0);
});
test('rejected payment validation sends no alert', async () => {
  const s = setup({ completion: false }); assert.equal((await s.post(request())).status, 409); assert.equal(s.calls.length, 1);
});
test('notification failure requests retry only after payment completion', async () => {
  const s = setup({ delivery: false }); assert.equal((await s.post(request())).status, 503); assert.equal(s.calls[0].type, 'complete'); assert.equal(s.calls[1].type, 'alert');
});
test('failed payment never sends a received-payment alert', async () => {
  const s = setup(); assert.equal((await s.post(request('registration', { type: 'payment.failed' }))).status, 200); assert.equal(s.calls.length, 1); assert.equal(s.calls[0].type, 'failed');
});

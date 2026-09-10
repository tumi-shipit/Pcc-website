const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load({ db, fetch = async () => { throw new Error('Unexpected network call'); }, token = 'test-secret' } = {}) {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/telegramPayments.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: () => ({ createServerSupabase: () => { assert.ok(db, 'Unexpected database call'); return db; } }), process: { env: { TELEGRAM_BOT_TOKEN: token } }, fetch, AbortSignal, Date, Error };
  vm.runInNewContext(js, context);
  return context.exports;
}

test('sandbox payments never send a real-payment alert', async () => {
  assert.equal(await load().notifyTelegramPayment('store', 'id', 1000, 'ZAR', 'test'), true);
});
test('unconfigured token leaves payment flow unchanged', async () => {
  assert.equal(await load({ token: '' }).notifyTelegramPayment('registration', 'id', 1000, 'ZAR', 'live'), true);
});
test('Telegram errors never reveal the token or request URL', async () => {
  await assert.rejects(load({ fetch: async () => { throw new Error('https://api.telegram.org/bottest-secret/sendMessage'); } }).telegramCall('sendMessage'), error => !error.message.includes('test-secret') && error.message.includes('Telegram'));
});
test('already delivered alert is not sent again', async () => {
  const db = { rpc: async () => ({ data: [] }), from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { status: 'sent' } }) }) }) }) };
  assert.equal(await load({ db }).deliverTelegramAlert('id', 'chat'), true);
});
test('claimed alert sends with notification enabled and records success', async () => {
  let saved;
  const db = { rpc: async () => ({ data: [{ id: 'id', message: 'PCC payment' }] }), from: () => ({ update: value => { saved = value; return { eq: async () => ({ error: null }) }; } }) };
  const fn = load({ db, fetch: async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.chat_id, 'chat'); assert.equal(body.disable_notification, false);
    assert.equal(body.text, 'PCC payment');
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 1 } }) };
  } });
  assert.equal(await fn.deliverTelegramAlert('id', 'chat'), true);
  assert.equal(saved.status, 'sent');
});
test('failed send leaves the alert pending for retry', async () => {
  let saved;
  const db = { rpc: async () => ({ data: [{ id: 'id', message: 'PCC payment' }] }), from: () => ({ update: value => { saved = value; return { eq: () => ({ neq: async () => ({}) }) }; } }) };
  assert.equal(await load({ db }).deliverTelegramAlert('id', 'chat'), false);
  assert.equal(saved.status, 'pending');
});

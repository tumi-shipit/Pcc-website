const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const context={exports:{},setTimeout,clearTimeout,AbortController,Intl,Date,Map,Promise,Error};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/paymentDesk.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {paymentSource,paymentDate,confirmedYocoPayment,paymentRequest,attachPaymentOrders,paymentCsv}=context.exports;
const base={registration_id:'entry-1',payment_status:'Paid',proof_of_payment_url:null};
const order={id:'order-1',registration_id:'entry-1',status:'paid',amount:50,currency:'ZAR',yoco_mode:'live',yoco_payment_id:'payment-1',yoco_checkout_id:'checkout-1',paid_at:'2026-09-23T22:30:00Z'};
test('Yoco source, references and confirmation date use the actual stored order',()=>{
 const row={...base,order};assert.equal(paymentSource(row),'Yoco online payment');assert.equal(confirmedYocoPayment(row),true);
 assert.match(paymentDate(row),/24 Sept? 2026/);assert.match(paymentDate(row),/00:30/);
});
test('manual paid entries and registration dates cannot invent a payment source or date',()=>{
 assert.match(paymentSource(base),/method not recorded/);assert.equal(paymentDate({...base,created_at:'2026-09-23'}),'Not recorded');
 assert.equal(confirmedYocoPayment(base),false);
});
test('proof and pending checkout are not described as confirmed Yoco payments',()=>{
 assert.equal(paymentSource({...base,proof_of_payment_url:'proof.pdf'}),'Uploaded payment proof');
 for(const change of [{status:'failed'},{status:'payment_pending'},{yoco_mode:'test'},{yoco_payment_id:null}])assert.equal(confirmedYocoPayment({...base,order:{...order,...change}}),false);
 assert.equal(paymentDate({...base,order:{...order,status:'failed'}}),'Not recorded');
});
test('reference lookup errors stay explicitly unknown',()=>{
 const row={...base,order,orderLookupFailed:true};assert.equal(paymentSource(row),'Source unavailable');assert.equal(paymentDate(row),'Unavailable');assert.equal(confirmedYocoPayment(row),false);
});
test('stalled requests time out instead of leaving the page loading forever',async()=>{
 await assert.rejects(paymentRequest(new Promise(()=>{}),undefined,5),/timed out/);
});
test('superseded requests can be cancelled and successful requests resolve normally',async()=>{
 const controller=new AbortController();const request=paymentRequest(new Promise(()=>{}),controller.signal,100);controller.abort();await assert.rejects(request,/cancelled/);
 assert.equal(await paymentRequest(Promise.resolve(42),undefined,100),42);
 await assert.rejects(paymentRequest(Promise.reject(new Error('offline')),undefined,100),/offline/);
});
function database(orders,error=null){const batches=[];return {batches,from(table){assert.equal(table,'registration_payment_orders');let ids;return {select(columns){assert.match(columns,/paid_at/);return this;},in(column,values){assert.equal(column,'registration_id');ids=values;batches.push(values);return this;},abortSignal(){return Promise.resolve({data:orders.filter(o=>ids.includes(o.registration_id)),error});}};}};}
test('references join by registration ID and preserve event labels across batches',async()=>{
 const rows=Array.from({length:205},(_,i)=>({...base,registration_id:'entry-'+i,tournament_name:'Event '+i,orderLookupFailed:true}));
 const db=database([order]);const result=await attachPaymentOrders(db,rows,new AbortController().signal);
 assert.equal(db.batches.length,3);assert.equal(result[1].order.id,'order-1');assert.equal(result[1].tournament_name,'Event 1');assert.equal(result[0].order,null);assert.equal(result[1].orderLookupFailed,false);assert.equal(rows[1].orderLookupFailed,true);
});
test('reference lookup failure aborts an export rather than producing incomplete payments',async()=>{
 await assert.rejects(attachPaymentOrders(database([],{message:'access denied'}),[base],new AbortController().signal),/access denied/);
});
test('CSV keeps reference text and dates, quotes commas, and neutralizes formulas',()=>{
 const csv=paymentCsv([['Event','Payment reference'],['Name, "Open"','000123'],['=HYPERLINK("url")','2026-09-24 00:30']]);
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"Name, ""Open"""'));assert.ok(csv.includes('"000123"'));assert.ok(csv.includes('"\'=HYPERLINK'));assert.ok(csv.includes('2026-09-24 00:30'));
});

function exportHarness({ failOrders = false, empty = false } = {}) {
  const source = fs.readFileSync('app/admin/payments/page.tsx', 'utf8');
  const start = source.indexOf('  async function exportYocoCsv()');
  const end = source.indexOf('  async function exportUnpaidCsv()', start);
  const code = ts.transpileModule('export ' + source.slice(start, end).trim(), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const rows = Array.from({ length: empty ? 0 : 505 }, (_, i) => ({ ...base, registration_id: 'entry-' + i, tournament_name: 'Selected Event', section_name: 'Open', full_name: 'Player ' + i, email: 'player@example.com' }));
  const result = { messages: [], busy: [], filters: 0, clicks: 0, blob: null };
  const runtime = { exports: {}, AbortSignal, Blob, Number, Error, paymentCsv, paymentDate, paymentSource, confirmedYocoPayment, paymentRequest,
    activeTab: 'Paid', tournamentFilter: 'Selected Event',
    setExportingYoco: v => result.busy.push(v), setMessage: v => result.messages.push(v),
    applyBaseFilters: query => { result.filters++; return query; },
    applyPaymentTab: (query, tab) => { assert.equal(tab, 'Paid'); return query; },
    supabase: { from: table => { assert.equal(table, 'registration_details'); let offset, last; const query = {
      select: () => query, order: () => query, range: (a, b) => { offset=a;last=b;return query; },
      abortSignal: () => Promise.resolve({ data: rows.slice(offset,last+1), error:null })
    }; return query; } },
    attachPaymentOrders: async (_db, batch) => {
      if (failOrders) throw new Error('References unavailable');
      return batch.map(row => ({ ...row, order: { ...order, registration_id:row.registration_id, yoco_mode: row.registration_id === 'entry-2' ? 'test' : 'live' } }));
    },
    URL: { createObjectURL: blob => { result.blob=blob;return 'blob:test'; }, revokeObjectURL: () => {} },
    document: { createElement: () => ({ click: () => { result.clicks++; } }) }
  };
  vm.runInNewContext(code, runtime);
  return { run: runtime.exports.exportYocoCsv, result };
}
test('filtered Yoco export includes the last page, excludes test orders, and applies filters to every batch', async () => {
  const h=exportHarness();await h.run();assert.equal(h.result.filters,2);assert.equal(h.result.clicks,1);
  const csv=await h.result.blob.text();assert.match(csv,/Player 504/);assert.ok(!csv.includes('"Player 2"'));assert.match(csv,/Yoco payment reference/);
  assert.equal(h.result.busy.at(-1),false);assert.match(h.result.messages.at(-1),/504 confirmed/);
});
test('failed reference lookup produces no partial export and resets the export button',async()=>{
  const h=exportHarness({failOrders:true});await h.run();assert.equal(h.result.clicks,0);assert.equal(h.result.busy.at(-1),false);assert.match(h.result.messages.at(-1),/export failed/);
});
test('no matching confirmed payments shows a useful message instead of an empty download',async()=>{
  const h=exportHarness({empty:true});await h.run();assert.equal(h.result.clicks,0);assert.match(h.result.messages.at(-1),/No confirmed live Yoco/);
});

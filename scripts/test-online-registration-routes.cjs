const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const id='10000000-0000-4000-8000-000000000001';
const token='a'.repeat(64);
function setup({ online=true, authorized=true, paid=false, existingOrder=null, required=false }={}) {
  const calls=[];
  const entry={ id, tournament_id:'event', section_id:'section', first_name:'Test',surname:'Player',payment_status:paid?'Paid':'Pending',registration_status:'Pending', players:{ full_name:'Standard Player' }, tournaments:{ tournament_name:'Online event', entry_fee:50, online_payment_enabled:true, registration_payment_required:required, registration_status:'Open' }, tournament_sections:{section_name:'Open',entry_fee_override:null} };
  const db={ from(table){
    let operation='select', value;
    const query={ select(){return query;},eq(column,v){calls.push({table,column,value:v});return query;},neq(){return query;},insert(v){operation='insert';value=v;calls.push({table,operation,value});return query;},update(v){operation='update';value=v;calls.push({table,operation,value});return query;},single(){return query;},maybeSingle(){return query;},then(resolve,reject){
      let data=null;
      if(table==='registrations' && !online) data=entry;
      if(table==='online_registrations' && online) data=entry;
      if(table==='registration_payment_orders') data=operation==='insert'?{id:'order',status:'created',amount:50}:existingOrder;
      return Promise.resolve({data,error:null}).then(resolve,reject);
    }};return query;
  }};
  function load(file){
    const context={exports:{},Response,Request,FormData,File,crypto,console,process:{env:{YOCO_SECRET_KEY:'test-key'}},fetch:async(url,options)=>{calls.push({checkout:JSON.parse(options.body)});return Response.json({id:'checkout',redirectUrl:'https://payments.example/checkout',processingMode:'live'});},require(name){
      if(name.includes('serverSupabase'))return {createServerSupabase:()=>db};
      if(name.includes('serverRateLimit'))return {allowRequest:async()=>true};
      if(name.includes('registrationRecovery'))return {authorizeRegistrationRecovery:async()=>authorized};
      if(name.includes('registrationSchedule'))return {registrationStatusAt:t=>t.registration_status};
      throw Error(name);
    }};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
    return context.exports.POST;
  }
  return {calls,checkout:load('app/api/registration/checkout/route.ts'),recovery:load('app/api/registration/recovery/route.ts')};
}
const checkoutRequest=()=>new Request('http://localhost/api/registration/checkout',{method:'POST',body:JSON.stringify({registrationId:id,recoveryToken:token})});
function recoveryRequest(action='status'){const form=new FormData();form.set('registrationId',id);form.set('recoveryToken',token);form.set('action',action);return new Request('http://localhost/api/registration/recovery',{method:'POST',body:form});}
for(const online of [true,false]) test(`${online?'online':'standard'} checkout links the correct entry and uses server fee`,async()=>{
  const s=setup({online});const response=await s.checkout(checkoutRequest());assert.equal(response.status,200);
  const insert=s.calls.find(c=>c.operation==='insert');assert.equal(insert.value[online?'online_registration_id':'registration_id'],id);
  assert.equal(insert.value[online?'registration_id':'online_registration_id'],undefined);
  const request=s.calls.find(c=>c.checkout).checkout;assert.equal(request.amount,5000);assert.equal(request.metadata.orderKind,'registration');
  assert.match(request.lineItems[0].description,online?/Test Player/:/Standard Player/);
  assert.ok(!s.calls.some(c=>c.table==='players'));
});
test('invalid recovery authorization makes no database or payment calls',async()=>{const s=setup({authorized:false});assert.equal((await s.checkout(checkoutRequest())).status,403);assert.equal(s.calls.length,0);});
test('paid online entry cannot start checkout again',async()=>{const s=setup({paid:true});assert.equal((await s.checkout(checkoutRequest())).status,409);assert.ok(!s.calls.some(c=>c.checkout));});
test('changed fee does not reuse or charge the old order',async()=>{const s=setup({existingOrder:{id:'old',amount:20,status:'created'}});assert.equal((await s.checkout(checkoutRequest())).status,409);assert.ok(!s.calls.some(c=>c.checkout));});
test('online recovery reads separate entries and blocks proof writes',async()=>{const s=setup();const result=await (await s.recovery(recoveryRequest())).json();assert.equal(result.paymentStatus,'Pending');assert.equal(result.onlineOnly,false);assert.equal(result.allowsProof,false);assert.equal((await s.recovery(recoveryRequest('proof'))).status,403);assert.ok(!s.calls.some(c=>c.operation==='update'));});
test('standard recovery retains optional proof and required payment settings',async()=>{for(const required of [true,false]){const s=setup({online:false,required});const result=await (await s.recovery(recoveryRequest())).json();assert.equal(result.onlineOnly,required);assert.equal(result.allowsProof,!required);}});

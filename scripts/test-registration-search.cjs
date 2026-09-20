const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../lib/registrationSearch.ts'),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const unique = context.exports.uniqueLookupPlayers;
const p = (values={}) => ({ pcc_id:'PCC-1',chess_sa_id:'00123',full_name:'Basetsana Sedibe',date_of_birth:'2012-01-03',...values });
test('PCC and two rating sources become one selection with existing PCC identity',()=>{
 const result=unique([p({pcc_id:null,full_name:'Sedibe, Basetsana',rating:1200}),p({email:'parent@example.test'}),p({pcc_id:null})]);
 assert.equal(result.length,1);assert.equal(result[0].pcc_id,'PCC-1');assert.equal(result[0].email,'parent@example.test');assert.equal(result[0].rating,1200);
});
test('DOB conflict is not hidden',()=>assert.equal(unique([p(),p({pcc_id:null,date_of_birth:'2013-01-03'})]).length,2));
test('same name with distinct CHESSA IDs is not combined',()=>assert.equal(unique([p(),p({pcc_id:null,chess_sa_id:'456'})]).length,2));
test('distinct PCC records are not arbitrarily combined',()=>assert.equal(unique([p(),p({pcc_id:'PCC-2'}),p({pcc_id:null})]).length,3));
test('same ID but unrelated name is not combined',()=>assert.equal(unique([p(),p({pcc_id:null,full_name:'Another Child'})]).length,2));
test('no-ID same-name children are not combined',()=>assert.equal(unique([p({pcc_id:null,chess_sa_id:null}),p({pcc_id:null,chess_sa_id:null})]).length,2));
test('zero ratings and input records are preserved',()=>{const input=p({rating:0});const result=unique([input,p({pcc_id:null,rating:123})]);assert.equal(result[0].rating,0);assert.equal(input.rating,0);});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const scope = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/registrationSearch.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, scope);
const matches = scope.exports.matchesNewPlayerIdentity;
const player = {first_names:'Mogau',surname:'Mosomane',date_of_birth:'2017-12-07'};
test('reported false match does not block Mogau Mosomane',()=>assert.equal(matches({full_name:'Mokgehle Mogau',date_of_birth:null},player),false));
test('shared first name with same DOB is not enough',()=>assert.equal(matches({full_name:'Mokgehle Mogau',date_of_birth:player.date_of_birth},player),false));
test('full name with missing or different DOB is not a confirmed match',()=>{
  for(const date_of_birth of [null,'2017-07-12']) assert.equal(matches({full_name:'Mogau Mosomane',date_of_birth},player),false);
});
test('full name and exact DOB blocks duplicate creation',()=>assert.equal(matches({full_name:'Mogau Mosomane',date_of_birth:player.date_of_birth},player),true));
test('surname-first formatting and case remain recognised',()=>assert.equal(matches({full_name:' MOSOMANE,  MOGAU ',date_of_birth:player.date_of_birth},player),true));

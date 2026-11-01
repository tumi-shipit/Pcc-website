const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const context = { exports: {}, require, Date };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/bulkRegistration.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {parseBulkRows,resolveBulkSection,bulkDate} = context.exports;
test('shared download includes Section, instructions and event rules without sample players',()=>{
  const XLSX = require('xlsx');
  const book = context.exports.createBulkWorkbook([section('U14',2013,2016)],'Test event');
  const read = XLSX.read(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
  assert.deepEqual(read.SheetNames,['Players','Instructions','Sections']);
  const rows = XLSX.utils.sheet_to_json(read.Sheets.Players,{header:1});
  assert.equal(rows.length,1);
  assert.equal(rows[0][6],'Section');
  assert.equal(XLSX.utils.sheet_to_json(read.Sheets.Sections,{header:1})[1][0],'U14');
});
const headers = ['First names','Surname','Date of birth','Gender','Rating','Club/City','Section'];
const row = ['Test','Player','2014-04-05','F','','School','U14'];
const entry = () => parseBulkRows([headers,row]).entries[0];
const section = (id,min,max,extra={}) => ({id,section_name:id,minimum_birth_year:min,maximum_birth_year:max,minimum_rating:null,maximum_rating:null,gender_restriction:'All',...extra});

test('archive importer preserves structured names, IDs and requested eligibility',()=>{
  const source=ts.createSourceFile('archive.tsx',fs.readFileSync('app/admin/tournaments/[id]/archive/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const names=['parseStartingRankRows','chooseStartingRankSection','normalizeHeaderName','getFlexibleColumnIndex','cleanImportedId'];
  const code=source.statements.filter(s=>ts.isFunctionDeclaration(s)&&names.includes(s.name?.text)).map(s=>s.getText(source)).join('\n');
  const scope={parseBulkRows,resolveBulkSection};
  vm.createContext(scope);
  vm.runInContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);
  const parsed=scope.parseStartingRankRows([[...headers,'Chess SA ID'],[...row,'12345']]);
  assert.equal(parsed[0].name,'Test Player');
  assert.equal(parsed[0].chess_sa_id,'12345');
  assert.equal(scope.chooseStartingRankSection(parsed[0],[section('U14',2013,2016),section('Open',null,null)],'Open').section.id,'U14');
  assert.throws(()=>scope.parseStartingRankRows([['Name','Section'],['Test Player','U14']]),/separate/);
});
test('valid requested section is preserved even when others qualify',()=>{
  assert.equal(resolveBulkSection(entry(),[section('U14',2013,2016),section('Open',null,null)]).section.id,'U14');
});
test('ineligible requested section is overridden when only one qualifies',()=>{
  const result=resolveBulkSection({...entry(),requestedSection:'U10'},[section('U10',2017,2020),section('U14',2013,2016)]);
  assert.equal(result.section.id,'U14');assert.match(result.reason,/reassigned/);
});
test('ambiguous eligibility needs review instead of arbitrary placement',()=>{
  assert.equal(resolveBulkSection({...entry(),requestedSection:'U10'},[section('U14',2013,2016),section('Open',null,null)]).section,null);
});
test('gender restriction and no eligible section are respected',()=>{
  assert.equal(resolveBulkSection(entry(),[section('U14',2013,2016,{gender_restriction:'Male'})]).section,null);
});
test('unknown rating is not zero and cannot qualify for a rating band',()=>{
  assert.equal(entry().rating,null);
  assert.equal(resolveBulkSection(entry(),[section('U14',2013,2016,{maximum_rating:1200})]).section,null);
  assert.equal(resolveBulkSection({...entry(),rating:0},[section('U14',2013,2016,{maximum_rating:1200})]).section.id,'U14');
});
test('dates reject impossible days and Excel leap-year error',()=>{
  assert.equal(bulkDate('31/02/2014'),'');assert.equal(bulkDate(60),'');
  assert.equal(bulkDate('29/02/2012'),'2012-02-29');assert.equal(bulkDate('29/02/2013'),'');
});
test('duplicate file rows are flagged',()=>{
  const result=parseBulkRows([headers,row,row]);assert.equal(result.entries.length,1);assert.match(result.issues[0],/duplicate/);
});
test('invalid rating and comma names are rejected',()=>{
  assert.equal(parseBulkRows([headers,[...row.slice(0,4),'abc',...row.slice(5)]]).entries.length,0);
  assert.equal(parseBulkRows([headers,['Test,',...row.slice(1)]]).entries.length,0);
});
test('oversized file is not silently truncated',()=>{
  const rows=Array.from({length:201},(_,i)=>['Test '+i,...row.slice(1)]);
  const result=parseBulkRows([headers,...rows]);assert.equal(result.entries.length,0);assert.match(result.issues[0],/200/);
});
test('xlsx round trip keeps requested section and separate names',()=>{
  const xlsx=require('xlsx');const book=xlsx.utils.book_new();xlsx.utils.book_append_sheet(book,xlsx.utils.aoa_to_sheet([headers,row]),'Players');
  const result=xlsx.read(xlsx.write(book,{type:'buffer',bookType:'xlsx'}));
  const parsed=parseBulkRows(xlsx.utils.sheet_to_json(result.Sheets.Players,{header:1,defval:''}));
  assert.equal(parsed.entries[0].requestedSection,'U14');assert.equal(parsed.entries[0].surname,'Player');assert.equal(parsed.issues.length,0);
});

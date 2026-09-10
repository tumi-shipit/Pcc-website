const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = {};
function load(name) {
  if (cache[name]) return cache[name];
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib', name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: value => load(value.split('/').at(-1)), Date, Set, Map, setTimeout };
  vm.runInNewContext(code, context); return cache[name] = context.exports;
}
const identity = load('identityResolver');
const sync = load('chessSaSync');
const player = (changes = {}) => ({ id: 'pcc-existing-child', full_name: 'Thabo Mokoena', date_of_birth: '2012-04-05', chess_sa_id: null, fide_id: null, club: null, province: null, ...changes });
const row = (changes = {}) => ({ row_number: 2, full_name: 'Mokoena Thabo', date_of_birth: '2012-04-05', chess_sa_id: '123456', fide_id: null, rating: 1000, province: null, club: null, gender: null, title: null, raw: {}, ...changes });
test('exact name and DOB links the existing PCC record despite name order', () => {
  const result = sync.analyseChessSaRows([row()], [player()])[0];
  assert.equal(result.action, 'update_existing'); assert.equal(result.matched_player_id, 'pcc-existing-child');
});
test('same name without DOB is not an automatic link', () => assert.notEqual(sync.analyseChessSaRows([row({ date_of_birth: null })], [player()])[0].action, 'update_existing'));
test('siblings sharing contacts are not an exact identity match', () => assert.ok(identity.calculateIdentityScore(player({ email: 'parent@example.com', phone: '0720000000' }), player({ id: 'sibling', full_name: 'Lebo Mokoena', date_of_birth: '2014-03-01', email: 'parent@example.com', phone: '0720000000' })).score < 100));
test('partial names with the same DOB are not automatic matches', () => assert.notEqual(sync.analyseChessSaRows([row({ full_name: 'Thabo John Mokoena' })], [player()])[0].action, 'update_existing'));
test('exact ID with conflicting DOB requires review', () => assert.equal(sync.analyseChessSaRows([row()], [player({ chess_sa_id: '123456', date_of_birth: '2013-04-05' })])[0].action, 'review'));
test('exact ID with a very different name requires review', () => assert.equal(sync.analyseChessSaRows([row()], [player({ chess_sa_id: '123456', full_name: 'Jane Smith' })])[0].action, 'review'));
test('different FIDE IDs cannot auto-link', () => assert.notEqual(sync.analyseChessSaRows([row({ fide_id: '111' })], [player({ fide_id: '222' })])[0].action, 'update_existing'));
test('two identical PCC identities require review, not arbitrary selection', () => assert.equal(sync.analyseChessSaRows([row()], [player(), player({ id: 'other-child' })])[0].action, 'review'));
test('two CHESSA IDs targeting one PCC child both require review', () => {
  const results = sync.analyseChessSaRows([row(), row({ row_number: 3, chess_sa_id: '654321' })], [player()]);
  assert.ok(results.every(result => result.action === 'review'));
});
test('duplicate CHESSA IDs in the file require review', () => assert.ok(sync.analyseChessSaRows([row(), row({ row_number: 3 })], [player()]).every(result => result.action === 'review')));
test('separate Names and Surname columns preserve full name', () => assert.equal(sync.parseChessSaCsv('Names,Surname,CHESSA ID,DOB\nThabo,Mokoena,123456,05/04/2012')[0].full_name, 'Thabo Mokoena'));
test('quoted surname-first names parse correctly', () => assert.equal(sync.parseChessSaCsv('Full Name,CHESSA ID,DOB\n"Mokoena, Thabo",123456,2012-04-05')[0].full_name, 'Mokoena, Thabo'));
test('impossible February date is rejected', () => assert.equal(sync.parseChessSaCsv('Full Name,CHESSA ID,DOB\nThabo Mokoena,123456,2012-02-31')[0].date_of_birth, null));
test('valid leap day is retained', () => assert.equal(sync.parseChessSaCsv('Full Name,CHESSA ID,DOB\nThabo Mokoena,123456,2012-02-29')[0].date_of_birth, '2012-02-29'));
test('repeated input rows never create self-pairs or repeat the same pair', () => {
  const a = player(); const b = player({ id: 'other-profile' });
  const results = identity.buildDuplicateMatches([a, a, b, b], new Set(), 70);
  assert.equal(results.length, 1);
  assert.notEqual(results[0].playerA.id, results[0].playerB.id);
});
test('three same-name profiles are three distinct pairs, not repeated pair IDs', () => {
  const results = identity.buildDuplicateMatches([player(), player({ id: 'b' }), player({ id: 'c' })], new Set(), 70);
  assert.equal(results.length, 3);
  assert.equal(new Set(results.map(r => identity.makePairKey(r.playerA.id, r.playerB.id))).size, 3);
});
test('batched duplicate scanning agrees with synchronous scanning', async () => {
  const players = [player(), player(), player({ id: 'b' })];
  const result = await identity.buildDuplicateMatchesInBatches(players, new Set(), 70, new AbortController().signal);
  assert.equal(result.length, 1);
});

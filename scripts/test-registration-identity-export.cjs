const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');

function load(name, overrides = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib', name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const context = { exports: {}, Date, Set, Map, setTimeout, AbortSignal,
    require: id => overrides[id] || (id === 'xlsx' ? XLSX : load(id.split('/').at(-1), overrides)) };
  vm.runInNewContext(code, context);
  return context.exports;
}
const exporter = load('tournamentExports');
const sync = load('chessSaSync');
const child = { id: 'child', full_name: 'Van der Merwe Thabo James', first_names: 'Thabo James', surname: 'Van der Merwe', date_of_birth: '2012-04-05', chess_sa_id: null, fide_id: null };
function exportedRows(player) {
  // Exercise the application's actual workbook builder and serialization engine.
  const workbook = exporter.buildTournamentWorkbook([player], 'swiss');
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const reopened = XLSX.read(bytes, { type: 'buffer' });
  return XLSX.utils.sheet_to_json(reopened.Sheets.Exp, { header: 1 });
}
test('Swiss keeps multi-word surname and first names despite surname-first display', () => {
  const [headers, row] = exportedRows(child);
  assert.equal(row[headers.indexOf('First Name')], 'Thabo James');
  assert.equal(row[headers.indexOf('Surname')], 'Van der Merwe');
  assert.equal(row[headers.indexOf('surname')], 'Van der Merwe');
  assert.equal(row[headers.indexOf('first name')], 'Thabo James');
});
test('missing legacy name parts stop Swiss export rather than guess', () => {
  assert.throws(() => exportedRows({ full_name: 'Sedibe Basetsana' }), /Confirm first names and surname/);
  assert.throws(() => exporter.buildSwissTeamTieBreakTextFiles([{ full_name: 'Sedibe Basetsana' }], 'test'), /Confirm first names and surname/);
});
test('Sedibe comma Basetsana exports confirmed names in the right fields without commas', () => {
  const player = { full_name: 'Sedibe, Basetsana', first_names: 'Basetsana,', surname: 'Sedibe,' };
  const [headers, row] = exportedRows(player);
  assert.equal(row[headers.indexOf('First Name')], 'Basetsana');
  assert.equal(row[headers.indexOf('Surname')], 'Sedibe');
  assert.equal(row[headers.indexOf('first name')], 'Basetsana');
  assert.equal(row[headers.indexOf('surname')], 'Sedibe');
  assert.equal(exporter.exportFullName(player), 'Basetsana Sedibe');
  assert.equal(player.full_name, 'Sedibe, Basetsana');
  const [teamHeaders, teamRow] = exporter.buildSwissTeamTieBreakTextFiles([player], 'test')[0].content.split('\r\n').map(line => line.split(';'));
  assert.equal(teamRow[teamHeaders.indexOf('Name')], 'Basetsana Sedibe');
  assert.equal(teamRow[teamHeaders.indexOf('first name')], 'Basetsana');
  assert.equal(teamRow[teamHeaders.indexOf('surname')], 'Sedibe');
  const workbook = exporter.buildTournamentWorkbook([player], 'round-robin');
  assert.equal(XLSX.utils.sheet_to_json(workbook.Sheets.Exp, { header: 1 })[1][1], 'Basetsana Sedibe');
});
test('comma-only name parts cannot bypass review and meaningful punctuation is preserved', () => {
  assert.throws(() => exportedRows({ first_names: ',', surname: 'Sedibe' }), /Confirm first names/);
  assert.equal(exporter.cleanExportName("  Anne-Marie, O'Neil  "), "Anne-Marie O'Neil");
  assert.equal(exporter.exportFullName({ full_name: 'Sedibe, Basetsana' }), 'Sedibe Basetsana');
  assert.throws(() => exportedRows({ full_name: 'Sedibe, Basetsana' }), /Confirm first names/);
});
test('team text uses confirmed name parts', () => {
  const text = exporter.buildSwissTeamTieBreakTextFiles([child], 'test')[0].content;
  const [headers, row] = text.split('\r\n').map(line => line.split(';'));
  assert.equal(row[headers.indexOf('surname')], child.surname);
  assert.equal(row[headers.indexOf('first name')], child.first_names);
});
test('CHESSA parser preserves separate name columns and leading-zero IDs', () => {
  const row = sync.parseChessSaCsv('First Names,Surname,CHESSA ID,DOB\nThabo James,Van der Merwe,00123456,2012-04-05')[0];
  assert.equal(row.first_names, child.first_names);
  assert.equal(row.surname, child.surname);
  assert.equal(row.chess_sa_id, '00123456');
  const decision = sync.analyseChessSaRows([row], [child])[0];
  assert.equal(decision.action, 'update_existing');
  assert.equal(decision.matched_player_id, child.id);
  const [headers, exported] = exportedRows({ ...child, chess_sa_id: row.chess_sa_id });
  assert.equal(exported[headers.indexOf('ID no')], '00123456');
});
test('CHESSA conflicting structured names require review', () => {
  const row = sync.parseChessSaCsv('First Names,Surname,CHESSA ID,DOB\nVan der Merwe,Thabo James,00123456,2012-04-05')[0];
  assert.equal(sync.analyseChessSaRows([row], [child])[0].action, 'review');
});
test('an already verified profile with missing name parts is updated from explicit columns', () => {
  const row = sync.parseChessSaCsv('Names,Surname,CHESSA ID,DOB\nThabo James,Van der Merwe,00123456,2012-04-05')[0];
  const decision = sync.analyseChessSaRows([row], [{ ...child, first_names: null, surname: null, chess_sa_id: row.chess_sa_id, verification_status: 'Verified' }])[0];
  assert.equal(decision.action, 'update_existing');
  assert.ok(decision.reasons.includes('Missing structured export name'));
});

function refreshModule(respond) {
  return load('registrationExportIdentity', { '@/lib/supabase': { supabase: { from(table) {
    assert.equal(table, 'registration_details');
    return { select() { return this; }, in(column, ids) { this.ids = ids; return this; }, abortSignal() { return Promise.resolve(respond(this.ids)); } };
  } } } });
}
test('registration opened before sync exports fresh ID and name parts by registration ID', async () => {
  const entries = [{ registration_id: 'entry-1', ...child, chess_sa_id: '00123456' }, { registration_id: 'entry-2', ...child, chess_sa_id: '00123456' }];
  const refresh = refreshModule(ids => ({ data: entries.filter(row => ids.includes(row.registration_id)).reverse(), error: null }));
  const rows = await refresh.refreshRegistrationExportRows(entries.map(row => ({ ...row, chess_sa_id: null })));
  assert.equal(rows[0].registration_id, 'entry-1');
  for (const row of rows) {
    const [headers, values] = exportedRows(row);
    assert.equal(values[headers.indexOf('ID no')], '00123456');
  }
});
test('refresh batches all entries and never exports stale IDs after a read error', async () => {
  const rows = Array.from({ length: 205 }, (_, index) => ({ registration_id: String(index) }));
  let calls = 0;
  const refresh = refreshModule(ids => { calls++; return { data: ids.map(id => ({ registration_id: id })), error: null }; });
  assert.equal((await refresh.refreshRegistrationExportRows(rows)).length, 205);
  assert.equal(calls, 3);
  await assert.rejects(refreshModule(() => ({ error: { message: 'connection failed' } })).refreshRegistrationExportRows(rows), /Cannot refresh/);
  await assert.rejects(refreshModule(() => ({ data: [], error: null })).refreshRegistrationExportRows(rows), /no longer accessible/);
});

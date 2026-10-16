const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function compile(source, context = {}) {
  const scope = { exports: {}, ...context };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return scope.exports;
}
const organisations = compile(fs.readFileSync('lib/organisationNames.ts', 'utf8'));
const standings = compile(fs.readFileSync('lib/tournamentStandings.ts', 'utf8'), {
  require: (id) => { assert.equal(id, './organisationNames'); return organisations; },
});
const { calculateTeamPoints } = standings;
const row = (fed, type, club, points) => ({ federation: fed, result_type: type, imported_club: club, points });

test('Auto prioritises multiple FED values over TYPE and clubs', () => {
  const actual = calculateTeamPoints([row('LIM', 'D1', 'A', 2), row('GAU', 'D2', 'B', 4), row(' lim ', 'D2', 'B', 3)], 'Auto');
  assert.equal(actual.grouping, 'FED');
  assert.equal(actual.standings[0].name, 'LIM');
  assert.equal(actual.standings[0].points, 5);
  assert.equal(actual.standings[0].playerCount, 2);
});
test('one FED falls back to arbitrary TYPE labels', () => {
  for (const labels of [['U10', 'S50'], ['DC35', 'DC36']]) {
    const actual = calculateTeamPoints([row('RSA', labels[0], 'A', 2), row('rsa', labels[1], 'B', 4)], 'Auto');
    assert.equal(actual.grouping, 'TYPE');
    assert.equal(actual.standings[0].name, labels[1]);
  }
});
test('empty FED and one TYPE fall back to clubs and combine known aliases', () => {
  const actual = calculateTeamPoints([row('-', 'U12', 'UL Chess', 2), row(null, 'u12', 'University of Limpopo', 3), row('N/A', '', 'PCC', 4)], 'Auto');
  assert.equal(actual.grouping, 'Club / Team');
  assert.equal(actual.standings[0].name, 'University of Limpopo');
  assert.equal(actual.standings[0].points, 5);
});
test('explicit choice overrides Auto even with only one group', () => {
  const rows = [row('RSA', 'U10', 'A', 2), row('RSA', 'U12', 'B', 4)];
  const actual = calculateTeamPoints(rows, 'FED');
  assert.equal(actual.grouping, 'FED');
  assert.equal(actual.standings.length, 1);
  assert.equal(actual.standings[0].points, 6);
  assert.equal(calculateTeamPoints(rows, 'Club / Team').grouping, 'Club / Team');
  assert.equal(calculateTeamPoints(rows, 'TYPE').grouping, 'TYPE');
});
test('missing group labels are counted and do not become fake teams', () => {
  const actual = calculateTeamPoints([row('LIM', null, null, 2), row('', null, null, 9)], 'FED');
  assert.equal(actual.unassignedCount, 1);
  assert.equal(actual.standings[0].points, 2);
  assert.equal(calculateTeamPoints([], 'Auto').standings.length, 0);
});
test('club import snapshot takes precedence over profile; old results can use profile club', () => {
  const actual = calculateTeamPoints([{ ...row(null, null, 'Original club', 2), player: {club:'New club'} }, { points: 3, player: {club:'Original club'} }], 'Club / Team');
  assert.equal(actual.standings.length, 1);
  assert.equal(actual.standings[0].points, 5);
});
test('re-upload uses replacement scores, with no cached or accumulated old totals', () => {
  const first = calculateTeamPoints([row('A', '', '', 2), row('B', '', '', 4)], 'Auto');
  const next = calculateTeamPoints([row('A', '', '', 7), row('B', '', '', 1)], 'Auto');
  assert.equal(first.standings[0].name, 'B');
  assert.equal(next.standings[0].name, 'A');
  assert.equal(next.standings[0].points, 7);
  assert.equal(next.standings[1].points, 1);
});
test('equal totals use best individual score, then group name', () => {
  const actual = calculateTeamPoints([row('B', '', '', 3), row('B', '', '', 1), row('A', '', '', 4), row('C', '', '', 4)], 'FED');
  assert.equal(actual.standings.map(x => x.name).join(','), 'A,C,B');
});

// Exercise the real spreadsheet parser rather than a second implementation.
const archive = fs.readFileSync('app/admin/tournaments/[id]/archive/page.tsx', 'utf8');
const ast = ts.createSourceFile('archive.tsx', archive, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const parserEnd = archive.indexOf('function reportResultName(');
const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.getStart(ast) < parserEnd).map(node => node.getText(ast)).join('\n');
const parser = compile('const UPSET_RATING_DIFFERENCE = 200;\n' + functions + '\nexports.parseFinalRankingRows = parseFinalRankingRows;', { cleanTeamGroup: standings.cleanTeamGroup });
test('final ranking import preserves FED, arbitrary TYPE and Team columns and changed scores', () => {
  const headers = ['Rk.', 'SNo.', 'Name', 'FED', 'Type', 'Team', 'Pts.'];
  const parsed = parser.parseFinalRankingRows([headers, [1, 2, 'Player One', 'RSA', 'DC35', 'District Club', '4.5']], [], [], []);
  assert.equal(parsed[0].federation, 'RSA');
  assert.equal(parsed[0].result_type, 'DC35');
  assert.equal(parsed[0].imported_club, 'District Club');
  assert.equal(parsed[0].points, 4.5);
  const replacement = parser.parseFinalRankingRows([headers, [1, 2, 'Player One', 'RSA', 'S50', 'Other Club', '5.5']], [], [], []);
  assert.equal(replacement[0].result_type, 'S50');
  assert.equal(calculateTeamPoints(replacement, 'Club / Team').standings[0].points, 5.5);
});
test('older ranking spreadsheets still parse without TYPE or Club', () => {
  const parsed = parser.parseFinalRankingRows([['Rk.', 'Name', 'Pts.'], [1, 'Player One', 3]], [], [], []);
  assert.equal(parsed[0].result_type, null);
  assert.equal(parsed[0].imported_club, null);
});

function findFunction(node, name) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === name) return node;
  return ts.forEachChild(node, (child) => findFunction(child, name));
}
const importFunction = findFunction(ast, 'importRankingsForSection').getText(ast);
function importerContext(schemaError = null) {
  const stored = [
    {tournament_id:'T', section_id:'S', federation:'RSA', result_type:'DC35', imported_club:'A', points:99},
    {tournament_id:'T', section_id:'OTHER', federation:'RSA', result_type:'DC36', imported_club:'B', points:2},
  ];
  let deletes = 0;
  const supabase = { from(table) {
    assert.equal(table, 'tournament_results');
    let operation = 'select';
    const filters = {};
    const query = {
      select() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      limit() { return query; },
      delete() { operation = 'delete'; return query; },
      async insert(value) { stored.push(value); return {error:null}; },
      then(resolve, reject) {
        if (operation === 'delete') {
          deletes++;
          for (let i = stored.length - 1; i >= 0; i--) if (Object.entries(filters).every(([key,value]) => stored[i][key] === value)) stored.splice(i,1);
        }
        return Promise.resolve({data:[],error:operation === 'select' ? schemaError : null}).then(resolve,reject);
      },
    };
    return query;
  }};
  const rankingRows = parser.parseFinalRankingRows([
    ['Rk.', 'Name', 'FED', 'Type', 'Club', 'Pts.'], [1, 'Player One', 'RSA', 'DC35', 'A', 5],
  ], [], [], []).map(row => ({...row, player_id:'P'}));
  const noop = () => {};
  const run = compile(importFunction + '\nexports.run = importRankingsForSection;', {
    tournament:{id:'T'}, selectedSectionId:'S', rankingRows, rankingFileName:'replacement.xlsx', supabase,
    window:{confirm:()=>true}, console, normalizeName:(s)=>s.toLowerCase(),
    setMessage:noop, setImportingRankings:noop, setRankingRows:noop, setLastImportSummary:noop,
    loadStandingStartNumbers:async()=>new Map(), startNumberForStanding:()=>null,
    ensureFinalRankingRegistration:async()=>({registrationId:'R',sectionName:'Open',createdLate:false,moved:false}),
    publishFinalRankingStandings:async()=>false, createImportSession:async()=>({id:'I'}), createImportSessionRows:async()=>{},
    loadSectionPlayers:async()=>[], loadTournamentPlayers:async()=>[],
  }).run;
  return {run, stored, getDeletes:()=>deletes};
}
test('actual re-import replaces section scores and persists grouping values without changing other sections', async () => {
  const importer = importerContext();
  await importer.run();
  assert.equal(importer.getDeletes(), 1);
  assert.equal(importer.stored.length, 2);
  const current = importer.stored.find(row => row.section_id === 'S');
  assert.equal(current.points, 5);
  assert.equal(current.result_type, 'DC35');
  assert.equal(current.imported_club, 'A');
  const total = calculateTeamPoints(importer.stored, 'Auto');
  assert.equal(total.grouping, 'TYPE');
  assert.equal(total.standings[0].points, 5);
  assert.equal(total.standings[1].points, 2);
});
test('missing grouping columns stop the actual importer before existing results are deleted', async () => {
  const importer = importerContext({message:'column result_type does not exist'});
  await importer.run();
  assert.equal(importer.getDeletes(), 0);
  assert.equal(importer.stored[0].points, 99);
});

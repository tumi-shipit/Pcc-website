// Run with a path to an installed @electric-sql/pglite; uses an in-memory database.
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create table tournaments(id uuid primary key, entry_fee numeric, online_payment_enabled boolean default false);
      create table tournament_sections(id uuid primary key,tournament_id uuid,entry_fee_override numeric);
      create table registrations(id uuid primary key,tournament_id uuid,registration_status text,payment_status text);
      create table registration_payment_orders(registration_id uuid,tournament_id uuid,status text,yoco_mode text,yoco_payment_id text);
      create function can_operate_tournament_entries(uuid) returns boolean language sql as $$ select coalesce(current_setting('test.allowed',true),'yes')='yes' $$;
    `);
    await db.exec(fs.readFileSync('database/tournament_payment_required.sql','utf8'));
    // Repeat installation also has to succeed.
    await db.exec(fs.readFileSync('database/tournament_payment_required.sql','utf8'));
    const event='00000000-0000-0000-0000-000000000001';
    const entry='00000000-0000-0000-0000-000000000002';
    await db.query('insert into tournaments(id,entry_fee) values($1,50)',[event]);
    await db.query('select set_tournament_payment_required($1,true)',[event]);
    assert.equal((await db.query('select online_payment_enabled from tournaments')).rows[0].online_payment_enabled,true);
    await db.query("insert into registrations values($1,$2,'Pending','Pending')",[entry,event]);
    for(const sql of ["update registrations set payment_status='Proof Submitted'", "update registrations set payment_status='Paid'", "update registrations set registration_status='Approved'", "update tournaments set online_payment_enabled=false", "update tournaments set entry_fee=0"]) {
      await assert.rejects(db.exec(sql));
    }
    await db.query("insert into registration_payment_orders values($1,$2,'paid','test','payment-id')",[entry,event]);
    await assert.rejects(db.exec("update registrations set payment_status='Paid'"));
    await db.exec("update registration_payment_orders set yoco_mode='live'");
    await db.exec("update registrations set payment_status='Paid'; update registrations set registration_status='Approved'");
    assert.equal((await db.query('select registration_status from registrations')).rows[0].registration_status,'Approved');
    await assert.rejects(db.exec("update registrations set payment_status='Pending'"));
    await db.query('select set_tournament_payment_required($1,false)',[event]);
    await db.exec("update registrations set payment_status='Pending'");
    await assert.rejects(db.query('select set_tournament_payment_required($1,true)',[event]));
    await db.exec("set test.allowed='no'");
    await assert.rejects(db.query('select set_tournament_payment_required($1,false)',[event]));
    console.log('PASS: migration/reinstall, permissions, pending checkout, proof/manual/test-payment rejection, live-payment approval, optional events and existing-entry protection');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });

import { createDatabase, applyMigrations } from './database-engine.mjs';

// Local, disposable database only. No remote credentials or writes.
const db = createDatabase();
try {
  await applyMigrations(db);
  const queries = {
    coverage: `select (select count(*) from escen.students) students,
      (select count(*) from escen.financial_contracts) contracts,
      (select count(*) from escen.scholarship_awards) awards`,
    contractParity: `select v.id, sum(l.amount) as gross,
      (select coalesce(sum(d.amount),0) from escen.contract_discounts d where d.version_id=v.id) discounts,
      (select coalesce(sum(i.amount),0) from escen.installments i where i.version_id=v.id) scheduled
      from escen.contract_versions v join escen.contract_lines l on l.version_id=v.id
      where v.status='APPROVED' group by v.id
      having sum(l.amount) - (select coalesce(sum(d.amount),0) from escen.contract_discounts d where d.version_id=v.id)
        <> (select coalesce(sum(i.amount),0) from escen.installments i where i.version_id=v.id)`,
    scholarshipTriggers: `select tgname, pg_get_triggerdef(oid) definition from pg_trigger
      where tgrelid='escen.scholarship_awards'::regclass and not tgisinternal`,
    targetStudents: `select matricule from escen.students where matricule in ('018-ESC-2025','171-ESC-2026')`,
  };
  for (const [name, sql] of Object.entries(queries)) {
    console.log(JSON.stringify({ check: name, rows: (await db.query(sql)).rows }));
  }
  console.log('Une cible absente ne valide pas sa régularisation. Les migrations conditionnelles peuvent être ignorées sur une base vide.');
} finally {
  await db.close();
}

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export async function verifyFinanceRegularization(db, check, { offering, account }) {
  const insert = async (table, record) => {
    const keys = Object.keys(record);
    assert.match(table, /^[a-z_]+$/);
    keys.forEach(key => assert.match(key, /^[a-z_]+$/));
    return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
  };
  const seed = async (matricule, tuition) => {
    const person = await insert('people', { firstname: 'Finance', lastname: 'Recette' });
    const student = await insert('students', { person_id: person.id, matricule });
    const enrollment = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'INSCRIT' });
    const contract = await insert('financial_contracts', { enrollment_id: enrollment.id, reference: randomUUID() });
    const version = await insert('contract_versions', { contract_id: contract.id, version: 1, reason: 'Recette des régularisations historiques' });
    for (const [position, category, amount, description] of [[1, 'INSCRIPTION', 50000, 'Inscription'], [2, 'SCOLARITE', tuition, 'Scolarité']]) {
      const fee = await insert('fee_types', { code: randomUUID(), name: description, category });
      await insert('contract_lines', { contract_id: contract.id, version_id: version.id, fee_type_id: fee.id, amount, description });
      await insert('installments', { version_id: version.id, position, amount, description, due_on: '2026-10-01' });
    }
    await db.query("update escen.contract_versions set status='APPROVED', approved_by=$1, approved_at=now() where id=$2", [account.id, version.id]);
    return { enrollment, version };
  };
  await check('Régularisation 080 : le cas peuplé révèle le refus de modifier un contrat approuvé', async () => {
    await db.exec('begin');
    try {
      await seed('018-ESC-2025', 550000);
      const sql = await readFile(new URL('../supabase/migrations/202611020080_seed_finance_catalog_and_regularize_contracts.sql', import.meta.url), 'utf8');
      await db.exec('savepoint migration_probe');
      await assert.rejects(db.exec(sql), /Contrat approuvé immuable/);
      await db.exec('rollback to savepoint migration_probe');
    } finally { await db.exec('rollback'); }
  });
  await check('Régularisation 081 : attribution seule, montant net de Gnele inchangé', async () => {
    await db.exec('begin');
    try {
      const fixture = await seed('171-ESC-2026', 408000);
      await db.exec(await readFile(new URL('../supabase/migrations/202611020081_regularize_all_scholarships_and_discounts.sql', import.meta.url), 'utf8'));
      const awards = (await db.query('select * from escen.scholarship_awards where enrollment_id=$1', [fixture.enrollment.id])).rows;
      assert.equal(awards.length, 1);
      assert.equal(Number(awards[0].terms_snapshot.percent), 15);
      const total = (await db.query('select sum(amount) total from escen.contract_lines where version_id=$1', [fixture.version.id])).rows[0];
      assert.equal(Number(total.total), 458000);
      assert.equal((await db.query('select * from escen.contract_discounts where version_id=$1', [fixture.version.id])).rows.length, 0);
    } finally { await db.exec('rollback'); }
  });
}

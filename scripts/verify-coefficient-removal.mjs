import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDatabase, applyMigrations } from './database-engine.mjs';

// Disposable PostgreSQL only: exercise the migration on populated data.
const db = createDatabase();
const migration = '202611180113_remove_subject_coefficients.sql';
const insert = async (table, record) => {
  const columns = Object.keys(record);
  return (await db.query(`insert into escen.${table} (${columns.join(',')}) values (${columns.map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
};
try {
  await applyMigrations(db, { before: migration });
  const year = await insert('academic_years', { code: 'NO-COEFFICIENT', name: 'Année de recette', starts_on: '2040-09-01', ends_on: '2041-07-01' });
  const cycle = await insert('cycles', { code: 'NO-COEFFICIENT', name: 'Licence' });
  const level = await insert('levels', { cycle_id: cycle.id, code: 'L1-NC', name: 'Licence 1', position: 1 });
  const program = await insert('programs', { code: 'NO-COEFFICIENT', name: 'Programme de recette' });
  const curriculum = await insert('curricula', { program_id: program.id, level_id: level.id, version: 1 });
  const semester = await insert('curriculum_semesters', { curriculum_id: curriculum.id, position: 1, name: 'Semestre', target_credits: 30 });
  const unit = await insert('teaching_units', { curriculum_id: curriculum.id, semester_id: semester.id, code: 'UE-NC', name: 'Unité', credits: 30 });
  const subject = await insert('subjects', { code: 'NO-COEFFICIENT', name: 'Matière de recette', academic_year_id: year.id });
  const component = await insert('curriculum_components', { curriculum_id: curriculum.id, unit_id: unit.id, subject_id: subject.id, code: 'EC-NC', credits: 3.75, coefficient: 0.625, reason: 'Valeurs antérieures à la suppression' });
  const auditsBefore = (await db.query('select * from escen_private.audit_events where entity_id=$1 order by id', [component.id])).rows;
  const sql = await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8');
  await db.exec(sql);
  const saved = (await db.query('select * from escen.curriculum_components where id=$1', [component.id])).rows[0];
  assert.equal('coefficient' in saved, false);
  assert.equal(Number(saved.credits), 3.75);
  assert.equal(saved.subject_id, subject.id);
  assert.equal(saved.unit_id, unit.id);
  assert.deepEqual((await db.query('select * from escen_private.audit_events where entity_id=$1 order by id', [component.id])).rows, auditsBefore);
  const metadata = (await db.query("select definition from escen_private.history_catalog where table_name='unite_valeurs'")).rows[0].definition;
  assert.equal('coefficient' in metadata.fields, false);
  const created = await insert('curriculum_components', { curriculum_id: curriculum.id, unit_id: unit.id, subject_id: subject.id, code: 'EC-NC-NEW', credits: 2.25, reason: 'Création sans coefficient' });
  assert.equal(Number(created.credits), 2.25);
  assert.equal('coefficient' in created, false);
  await assert.rejects(db.query('update escen.curriculum_components set credits=-1 where id=$1', [created.id]), /check|constraint/i);
  console.log('Coefficients : colonne retirée sur base peuplée, crédits et rattachements conservés, audits antérieurs intacts, création sans coefficient et contraintes de crédits vérifiées.');
} finally { await db.close(); }

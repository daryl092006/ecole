import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDatabase, applyMigrations } from './database-engine.mjs';

const migration = '202611190117_restore_siavi_enrollment_and_group.sql';
const db = createDatabase();
const insert = async (table, record) => {
  const columns = Object.keys(record);
  return (await db.query(`insert into escen.${table} (${columns.join(',')}) values (${columns.map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
};
try {
  await applyMigrations(db, { before: migration });
  const year = await insert('academic_years', { code: 'SIAVI-TEST', name: 'Recette', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-08-31' });
  const cycle = await insert('cycles', { code: 'SIAVI-TEST', name: 'Master' });
  const level = await insert('levels', { cycle_id: cycle.id, code: 'SIAVI-M2', name: 'Master 2', position: 2 });
  const program = await insert('programs', { code: 'SIAVI-TEST', name: 'Finance Digitale' });
  const curriculum = await insert('curricula', { program_id: program.id, level_id: level.id, version: 1 });
  const site = await insert('sites', { code: 'SIAVI-TEST', name: 'Recette' });
  const offering = await insert('academic_offerings', { curriculum_id: curriculum.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  const group = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: 'Master 2 FD' });
  await insert('group_offerings', { group_id: group.id, offering_id: offering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  const person = await insert('people', { firstname: 'Recette', lastname: 'SIAVI' });
  const actor = await insert('accounts', { person_id: person.id });
  const student = await insert('students', { person_id: person.id, matricule: '054-ESC-2025' });
  const enrollment = await insert('enrollments', { id: '83118f8e-86ce-4c51-8a77-958dcce2d9df', student_id: student.id, offering_id: offering.id, status: 'ABANDON', created_by: actor.id });
  const membership = await insert('enrollment_groups', { id: '2a3ab8fd-d147-4982-930a-772833201694', enrollment_id: enrollment.id, offering_id: offering.id, group_id: group.id, valid_from: '2026-10-29', valid_until: '2026-11-10', changed_by: actor.id, reason: 'Inscription Master 2 annulée pour l’année 2026-2027' });
  const otherPerson = await insert('people', { firstname: 'Autre', lastname: 'Étudiant' });
  const otherStudent = await insert('students', { person_id: otherPerson.id, matricule: 'SIAVI-CONTROL' });
  const other = await insert('enrollments', { student_id: otherStudent.id, offering_id: offering.id, status: 'ABANDON' });
  const sql = await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8');
  await db.exec(sql);
  const restored = (await db.query('select * from escen.enrollments where id=$1', [enrollment.id])).rows[0];
  assert.deepEqual(restored, { ...enrollment, status: 'REINSCRIT' });
  const savedGroup = (await db.query('select * from escen.enrollment_groups where id=$1', [membership.id])).rows[0];
  assert.deepEqual(savedGroup, { ...membership, valid_until: null, reason: 'Correction de la migration 098 : aucun abandon, rétablissement du groupe Master 2 FD' });
  assert.deepEqual((await db.query('select * from escen.enrollments where id=$1', [other.id])).rows[0], other);
  const audits = (await db.query("select * from escen_private.audit_events where action='UPDATE' and entity_id in ($1,$2) order by happened_at", [enrollment.id, membership.id])).rows;
  assert.equal(audits.length, 2);
  assert.equal(audits[0].old_value.status, 'ABANDON');
  assert.equal(audits[0].new_value.status, 'REINSCRIT');
  assert.equal(audits[1].new_value.valid_until, null);
  await db.exec(sql);
  assert.equal((await db.query("select count(*)::int as count from escen_private.audit_events where action='UPDATE' and entity_id in ($1,$2)", [enrollment.id, membership.id])).rows[0].count, 2);
  console.log('SIAVI : réinscription et groupe restaurés, autres inscriptions préservées, audit et idempotence vérifiés.');
} finally { await db.close(); }

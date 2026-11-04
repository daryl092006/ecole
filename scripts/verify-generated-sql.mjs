import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createDatabase, applyMigrations } from './database-engine.mjs';

console.log('--- Test d’exécution du script SQL sur une base vierge avec migrations 001 à 087 ---');

const db = createDatabase();
await db.exec('create schema auth; create table auth.users(id uuid primary key);');
await applyMigrations(db);

const snapshot = JSON.parse(fs.readFileSync('tmp/integration-planning-2026-11-04/snapshot.json', 'utf8'));

const targetYearId = 'cbd8ee33-b322-43b2-9876-99636e5891d8';

// 1. Années académiques avec leur statut réel
for (const y of snapshot.tables.academic_years) {
  await db.query(`
    insert into escen.academic_years (id, code, name, starts_on, ends_on, status, reason)
    values ($1, $2, $3, $4, $5, $6, $7)
    on conflict (id) do nothing
  `, [y.id, y.code, y.name, y.starts_on, y.ends_on, y.status, y.reason]);
}

// 2. Cycles
for (const cy of snapshot.tables.cycles) {
  await db.query(`
    insert into escen.cycles (id, code, name, reason)
    values ($1, $2, $3, $4)
    on conflict (id) do nothing
  `, [cy.id, cy.code, cy.name, cy.reason]);
}

// 3. Niveaux
for (const l of snapshot.tables.levels) {
  await db.query(`
    insert into escen.levels (id, code, name, position, cycle_id, reason)
    values ($1, $2, $3, $4, $5, $6)
    on conflict (id) do nothing
  `, [l.id, l.code, l.name, l.position, l.cycle_id, l.reason]);
}

// 4. Programmes
for (const p of snapshot.tables.programs) {
  await db.query(`
    insert into escen.programs (id, code, name, reason)
    values ($1, $2, $3, $4)
    on conflict (id) do nothing
  `, [p.id, p.code, p.name, p.reason]);
}

// 5. Maquettes
for (const c of snapshot.tables.curricula) {
  await db.query(`
    insert into escen.curricula (id, program_id, level_id, version, status, reason)
    values ($1, $2, $3, $4, $5, $6)
    on conflict (id) do nothing
  `, [c.id, c.program_id, c.level_id, c.version, 'DRAFT', c.reason]);
}

// 6. Offres pour 2026-2027
for (const o of snapshot.tables.academic_offerings.filter(o => o.academic_year_id === targetYearId)) {
  await db.query(`
    insert into escen.academic_offerings (id, curriculum_id, academic_year_id, level_id, delivery_mode, archived_at, reason)
    values ($1, $2, $3, $4, $5, $6, $7)
    on conflict (id) do nothing
  `, [o.id, o.curriculum_id, o.academic_year_id, o.level_id, o.delivery_mode, o.archived_at, o.reason]);
}

// 7. Groupes pour 2026-2027
for (const g of snapshot.tables.groups.filter(g => g.academic_year_id === targetYearId)) {
  await db.query(`
    insert into escen.groups (id, name, academic_year_id, level_id, reason)
    values ($1, $2, $3, $4, $5)
    on conflict (id) do nothing
  `, [g.id, g.name, g.academic_year_id, g.level_id, g.reason]);
}

// 8. Groupes-Offres pour 2026-2027
for (const go of snapshot.tables.group_offerings.filter(go => go.academic_year_id === targetYearId)) {
  await db.query(`
    insert into escen.group_offerings (id, group_id, offering_id, academic_year_id, level_id, reason)
    values ($1, $2, $3, $4, $5, $6)
    on conflict (id) do nothing
  `, [go.id, go.group_id, go.offering_id, go.academic_year_id, go.level_id, go.reason]);
}

console.log('✓ Données de base de snapshot.json insérées avec succès');

// Maintenant, exécution de docs/sql-proposals/20261104_october_timetables_import.sql
const sql = fs.readFileSync('docs/sql-proposals/20261104_october_timetables_import.sql', 'utf8');

try {
  await db.exec(sql);
} catch (e) {
  console.error('Error in SQL proposal execution:', e.message);
  console.error('Detail:', e.detail);
  console.error('Hint:', e.hint);
  console.error('Where:', e.where);
  console.error('Query snippet:', e.query ? e.query.slice(0, 300) : '');
  process.exit(1);
}

console.log('✓ Script SQL exécuté sans aucune erreur !');

const sessionCount = (await db.query("select count(*)::int as c from escen.sessions where starts_at >= '2026-10-01' and starts_at <= '2026-10-31'")).rows[0].c;
console.log('Nombre de séances créées en octobre :', sessionCount);
assert.equal(sessionCount, 114, 'Doit contenir exactement 114 séances physiques');

const participantCount = (await db.query(`
  select count(*)::int as c from escen.session_participants sp
  join escen.sessions s on s.id = sp.session_id
  where s.starts_at >= '2026-10-01' and s.starts_at <= '2026-10-31'
`)).rows[0].c;
console.log('Nombre de participations créées en octobre :', participantCount);
assert.equal(participantCount, 138, 'Doit contenir exactement 138 participations');

const roomCount = (await db.query("select count(*)::int as c from escen.rooms where name in ('Salle des L1', 'Salle IA 1', 'Salle des L2', 'Salle IA 2')")).rows[0].c;
assert.equal(roomCount, 4, 'Les 4 salles doivent être créées');

const teacherCount = (await db.query(`
  select count(*)::int as c from escen.teachers t
  join escen.staff s on s.id = t.staff_id
  join escen.people p on p.id = s.person_id
  where p.email like '%.coach@escen.university' or p.email = 'a.eric@escen.university'
`)).rows[0].c;
console.log('Enseignants impliqués :', teacherCount);
assert.equal(teacherCount, 15, '15 enseignants doivent être présents');

console.log('=== SUCCÈS TOTAL : LE FICHIER SQL EST VALIDE ET CONFORME ===');
process.exit(0);

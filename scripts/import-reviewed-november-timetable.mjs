// One-off reviewed import. The personal-email exception was approved by the user
// for these 48 occurrences only; ordinary scheduling validation is unchanged.
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const root = 'tmp/timetables-november-2026';
const plan = JSON.parse(fs.readFileSync(`${root}/review/plan.json`, 'utf8'));
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const actor = '43ce07c4-bb38-5c56-85e6-70e2ffa5b909';
const roomNames = { 'L1 TC': 'Salle des L1', 'L1 IA & GL': 'Salle IA 1', 'L2 TC': 'Salle des L2', 'L2 IA & GL': 'Salle IA 2' };
const reason = 'Import PDF novembre 2026 relu ; exception e-mail personnel approuvée pour cet import ; aucun compte ou notification.';
const must = (condition, message) => { if (!condition) throw new Error(message); };
const active = row => !['ANNULE', 'REPORTE'].includes(row.status);
const overlaps = (a, b) => Date.parse(a.starts_at) < Date.parse(b.ends_at) && Date.parse(a.ends_at) > Date.parse(b.starts_at);
async function snapshot() {
  const result = await client.rpc('escen_backend_snapshot');
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
const before = await snapshot();
const tables = before.tables;
const find = (table, id) => (tables[table] || []).find(row => row.id === id);
const selected = plan.candidates.filter(row => row.kind === 'COURS' && row.assignment_id);
must(selected.length === 48, 'Le périmètre approuvé doit rester limité aux 48 occurrences relues.');
must(plan.academic_year_id === 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Année inattendue.');
must(find('academic_years', plan.academic_year_id)?.status === 'OUVERTE', 'Année non ouverte.');
for (const source of plan.sources) {
  const hash = createHash('sha256').update(fs.readFileSync(`/Users/gdenis/Downloads/${source.file}`)).digest('hex');
  must(hash === source.sha256, `Source modifiée : ${source.file}`);
}
const bundles = new Map();
for (const row of selected) {
  must(!row.date_mismatch && row.date.startsWith('2026-11-'), 'Date non approuvée.');
  const assignment = find('teaching_assignments', row.assignment_id);
  const offering = find('academic_offerings', assignment?.offering_id);
  const component = find('curriculum_components', assignment?.component_id);
  must(assignment && !assignment.archived_at && assignment.teacher_id === row.teacher_id && assignment.group_id === row.group_id, 'Affectation modifiée.');
  must(offering && !offering.archived_at && offering.academic_year_id === plan.academic_year_id && component && !component.archived_at, 'Offre ou matière inactive.');
  must(find('teachers', row.teacher_id)?.active && !find('groups', row.group_id)?.archived_at, 'Enseignant ou groupe inactif.');
  must(row.date >= assignment.valid_from && (!assignment.valid_until || row.date <= assignment.valid_until), 'Date hors affectation.');
  const key = [row.date, row.start, row.end, row.teacher_id, component.subject_id, offering.site_id].join('|');
  if (!bundles.has(key)) bundles.set(key, []);
  bundles.get(key).push({ ...row, assignment });
}
// Do not merge different subject IDs or schedule the teacher twice. Leave all
// competing bundles pending rather than choosing a class arbitrarily.
const incompatible = new Set();
const entries = [...bundles.entries()];
for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
  const a = entries[i][1][0], b = entries[j][1][0];
  if (a.teacher_id === b.teacher_id && a.date === b.date && a.start < b.end && a.end > b.start) {
    incompatible.add(entries[i][0]); incompatible.add(entries[j][0]);
  }
}
const pending = [...incompatible].flatMap(key => bundles.get(key)).map(row => ({
  group: row.group, date: row.date, start: row.start, subject: row.subject,
  reason: 'Enseignant simultané, matières distinctes : regroupement pédagogique à résoudre.',
}));
for (const key of incompatible) bundles.delete(key);
const changes = [], sessions = [], expected = [], reused = [];
for (const rows of bundles.values()) {
  const first = rows[0];
  const starts_at = `${first.date}T${first.start}:00+00:00`, ends_at = `${first.date}T${first.end}:00+00:00`;
  const assignmentIds = rows.map(row => row.assignment_id).sort();
  const existing = (tables.sessions || []).filter(s => active(s) && Date.parse(s.starts_at) === Date.parse(starts_at) && Date.parse(s.ends_at) === Date.parse(ends_at)
    && s.teacher_id === first.teacher_id && s.mode === 'COURS' && !s.replacement_teacher_id);
  const exact = existing.find(s => {
    const ids = tables.session_participants.filter(p => p.session_id === s.id && p.active).map(p => p.assignment_id).sort();
    return JSON.stringify(ids) === JSON.stringify(assignmentIds);
  });
  if (exact) { reused.push(exact.id); expected.push({ id: exact.id, assignmentIds }); continue; }
  const roomName = rows.length > 1 ? 'Salle des L1' : roomNames[first.group];
  const room = tables.rooms.find(r => r.name === roomName && r.status === 'AVAILABLE' && !r.archived_at);
  must(room, `Salle indisponible : ${roomName}`);
  must(rows.every(r => !room.site_id || room.site_id === find('academic_offerings', r.assignment.offering_id).site_id), 'Salle hors site.');
  const session = { id: randomUUID(), assignment_id: first.assignment_id, offering_id: first.assignment.offering_id,
    group_id: first.group_id, teacher_id: first.teacher_id, room_id: room.id, starts_at, ends_at, mode: 'COURS', status: 'PLANIFIE', reason };
  const groups = rows.map(r => r.group_id);
  for (const other of [...tables.sessions, ...sessions].filter(s => active(s) && overlaps(s, session))) {
    const otherGroups = [...tables.session_participants.filter(p => p.session_id === other.id && p.active).map(p => p.group_id), other.group_id,
      ...(expected.find(e => e.id === other.id)?.groupIds || [])];
    must(!groups.some(g => otherGroups.includes(g)), `Conflit groupe ${first.date} ${first.start}`);
    must((other.replacement_teacher_id || other.teacher_id) !== session.teacher_id, `Conflit enseignant ${first.date} ${first.start}`);
    must((other.actual_room_id || other.room_id) !== session.room_id, `Conflit salle ${first.date} ${first.start}`);
  }
  const site = find('academic_offerings', first.assignment.offering_id).site_id;
  must(!tables.blocked_periods.some(p => (!p.academic_year_id || p.academic_year_id === plan.academic_year_id) && (!p.site_id || p.site_id === site) && overlaps(p, session)), 'Période bloquée.');
  must(!(tables.exam_rooms || []).some(r => r.room_id === room.id && (tables.exam_deliveries || []).some(d => d.id === r.delivery_id && tables.sessions.some(s => s.id === d.session_id && active(s)) && overlaps({ starts_at: d.access_opens_at, ends_at: d.access_closes_at }, session))), 'Salle réservée pour examen.');
  changes.push({ table: 'sessions', operation: 'insert', record: session });
  // The session trigger creates the first participant; only add other groups.
  for (const row of rows.slice(1)) changes.push({ table: 'session_participants', operation: 'insert', record: {
    id: randomUUID(), session_id: session.id, assignment_id: row.assignment_id, offering_id: row.assignment.offering_id,
    group_id: row.group_id, teacher_id: row.teacher_id, starts_at, ends_at, active: true, reason,
  } });
  sessions.push(session); expected.push({ id: session.id, assignmentIds, groupIds: groups });
}
const report = { revisionBefore: before.revision, reviewedOccurrences: selected.length,
  occurrences: selected.length - pending.length, pending, newSessions: sessions.length,
  sharedSessions: expected.filter(e => e.assignmentIds.length > 1).length, reusedSessions: reused.length,
  operations: changes.length, expected, changes };
must(changes.length <= 100, 'Lot transactionnel trop grand.');
fs.writeFileSync(`${root}/review/import-preview.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ ...report, changes: undefined, expected: undefined }));
if (!process.argv.includes('--apply')) process.exit(0);
if (changes.length) {
  const result = await client.rpc('escen_backend_transaction', { p_actor_id: actor, p_expected_revision: before.revision, p_changes: changes });
  if (result.error) throw new Error(`Transaction refusée, lot annulé : ${result.error.message}`);
  report.revisionAfter = result.data;
  // Preserve the applied IDs before readback, including if verification fails.
  fs.writeFileSync(`${root}/import-applied.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
}
const after = await snapshot();
for (const session of sessions) {
  const saved = after.tables.sessions.find(s => s.id === session.id);
  for (const field of ['assignment_id', 'offering_id', 'group_id', 'teacher_id', 'room_id', 'mode', 'status', 'reason']) {
    must(saved?.[field] === session[field], `Champ incorrect après insertion : ${field}`);
  }
  for (const field of ['starts_at', 'ends_at']) must(Date.parse(saved?.[field]) === Date.parse(session[field]), 'Horaire incorrect après insertion.');
}
for (const item of expected) {
  must(after.tables.sessions.some(s => s.id === item.id && active(s)), 'Séance absente après insertion.');
  const ids = after.tables.session_participants.filter(p => p.session_id === item.id && p.active).map(p => p.assignment_id).sort();
  must(JSON.stringify(ids) === JSON.stringify(item.assignmentIds), 'Participants incorrects après insertion.');
}
fs.writeFileSync(`${root}/live-after.json`, JSON.stringify(after), { mode: 0o600 });
console.log(JSON.stringify({ verified: true, revision: after.revision, sessions: expected.length, occurrences: report.occurrences, pending: pending.length, notifications: 0, accountsCreated: 0 }));

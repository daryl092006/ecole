import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const adminId = '43ce07c4-bb38-5c56-85e6-70e2ffa5b909'; // Denis GANGNITO (IT)
const targetYearId = 'cbd8ee33-b322-43b2-9876-99636e5891d8'; // 2026-2027

const data = JSON.parse(fs.readFileSync('tmp/integration-planning-2026-11-04/relecture-v5/cours-regroupes.json', 'utf8'));

console.log('--- Injection des cours d’octobre 2026 dans Supabase ---');

async function getLatestSnapshot() {
  const { data, error } = await supabase.rpc('escen_backend_snapshot');
  if (error) throw new Error('Impossible de charger le snapshot Supabase: ' + error.message);
  return data;
}

async function runTransaction(changes, label) {
  if (changes.length === 0) {
    console.log(`[${label}] Aucun changement à appliquer.`);
    return;
  }
  const snapshot = await getLatestSnapshot();
  console.log(`[${label}] Envoi de ${changes.length} opérations (révision actuelle: ${snapshot.revision})...`);
  const res = await supabase.rpc('escen_backend_transaction', {
    p_actor_id: adminId,
    p_expected_revision: snapshot.revision,
    p_changes: changes
  });
  if (res.error) {
    console.error(`[${label}] ERREUR:`, res.error);
    throw new Error(`Échec transaction [${label}]: ${res.error.message || JSON.stringify(res.error)}`);
  }
  console.log(`[${label}] ✓ Succès ! Nouvelle révision: ${res.data}`);
  return res.data;
}

// ==========================================
// Étape 1 : Salles (déjà créées ou idempotentes)
// ==========================================
let snapshot = await getLatestSnapshot();
const roomMap = new Map();
for (const name of ['Salle des L1', 'Salle IA 1', 'Salle des L2', 'Salle IA 2']) {
  const room = (snapshot.tables.rooms || []).find(r => r.name === name);
  if (room) roomMap.set(name, room);
}
console.log(`✓ Salles disponibles : ${[...roomMap.keys()].join(', ')}`);

// ==========================================
// Étape 2 : Enseignants & Adresses Coach
// ==========================================
const teacherDefinitions = [
  { sourceName: 'M. AGBODJAN', email: 'a.eric@escen.university', lastname: 'AGBODJAN', firstname: 'Eric' },
  { sourceName: 'M. GBADAMASSI', email: 'g.akim.coach@escen.university', lastname: 'GBADAMASSI', firstname: 'Abdou Akim' },
  { sourceName: 'Dr. DOUSSIMELE', email: 'd.doussimele.coach@escen.university', lastname: 'DOUSSIMELE', firstname: 'Dr.' },
  { sourceName: 'M. NYARKO', email: 'n.kokou.coach@escen.university', lastname: 'NYARKO', firstname: 'Kokou Adjiwonu' },
  { sourceName: 'M. ALITI', email: 'a.ruphin.coach@escen.university', lastname: 'ALITI', firstname: 'Ruphin' },
  { sourceName: 'M. AYAKPONOU', email: 'a.kodjovi.coach@escen.university', lastname: 'AYAKPONOU', firstname: 'Kodjovi' },
  { sourceName: 'M. Elod Messanh', email: 'm.elod.coach@escen.university', lastname: 'MESSANH', firstname: 'Elod' },
  { sourceName: 'M. AGBETOGLO', email: 'ag.kodjo.coach@escen.university', lastname: 'AGBETOGLO', firstname: 'Kodjo' },
  { sourceName: 'M. GAOU', email: 'g.gaou.coach@escen.university', lastname: 'GAOU', firstname: 'M.' },
  { sourceName: 'M. TETE', email: 't.tete.coach@escen.university', lastname: 'TETE', firstname: 'M.' },
  { sourceName: 'M. FIOKLOU', email: 'f.amevi.coach@escen.university', lastname: 'FIOKLOU', firstname: 'Amévi' },
  { sourceName: 'M. POTOKOYE', email: 'p.potokoye.coach@escen.university', lastname: 'POTOKOYE', firstname: 'M.' },
  { sourceName: 'M. DEGLA', email: 'd.degla.coach@escen.university', lastname: 'DEGLA', firstname: 'M.' },
  { sourceName: 'M. MODEDZI', email: 'm.modedzi.coach@escen.university', lastname: 'MODEDZI', firstname: 'M.' },
  { sourceName: 'M. AZIATI', email: 'a.aziati.coach@escen.university', lastname: 'AZIATI', firstname: 'M.' },
];

snapshot = await getLatestSnapshot();
const teacherChanges = [];
const teacherIds = {};

for (const def of teacherDefinitions) {
  let person = (snapshot.tables.people || []).find(p => (p.email || '').toLowerCase() === def.email.toLowerCase());
  let personId = person ? person.id : null;
  if (!person) {
    personId = randomUUID();
    teacherChanges.push({
      table: 'people',
      operation: 'insert',
      record: { id: personId, firstname: def.firstname, lastname: def.lastname, email: def.email }
    });
  }

  let staff = personId ? (snapshot.tables.staff || []).find(s => s.person_id === personId) : null;
  let staffId = staff ? staff.id : null;
  if (!staff) {
    staffId = randomUUID();
    teacherChanges.push({
      table: 'staff',
      operation: 'insert',
      record: { id: staffId, person_id: personId, employee_number: `ENS-${staffId.slice(0, 8).toUpperCase()}`, reason: 'Enseignant planning octobre 2026' }
    });
  }

  let teacher = staffId ? (snapshot.tables.teachers || []).find(t => t.staff_id === staffId) : null;
  let teacherId = teacher ? teacher.id : null;
  if (!teacher) {
    teacherId = randomUUID();
    teacherChanges.push({
      table: 'teachers',
      operation: 'insert',
      record: { id: teacherId, staff_id: staffId, active: true, reason: 'Enseignant planning octobre 2026' }
    });
  }
  teacherIds[def.sourceName] = teacherId;
}

if (teacherChanges.length > 0) {
  await runTransaction(teacherChanges, 'Enseignants & Profils');
}
console.log('✓ Enseignants vérifiés et prêts.');

// ==========================================
// Étape 3 : Matières, UE, Composants, Affectations (par phases séquentielles)
// ==========================================
snapshot = await getLatestSnapshot();
// Re-map teacherIds from updated snapshot
for (const def of teacherDefinitions) {
  const p = (snapshot.tables.people || []).find(p => (p.email || '').toLowerCase() === def.email.toLowerCase());
  const s = p ? (snapshot.tables.staff || []).find(st => st.person_id === p.id) : null;
  const t = s ? (snapshot.tables.teachers || []).find(th => th.staff_id === s.id) : null;
  if (t) teacherIds[def.sourceName] = t.id;
}

const groupDefinitions = {
  'L1 TC': { id: 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c', name: 'L1 TRONC COMMUN' },
  'L1 IA & GL': { id: 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2', name: 'L1 IA' },
  'L2 TC': { id: '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a', name: 'L2 TRONC COMMUN' },
  'L2 IA & GL': { id: '90e081d0-1e56-4e10-9dc7-7854f155f5ea', name: 'Licence 2 IA' },
};

// Phase 3.1 : Semestres de maquette & Offre-semestres
const semesterChanges = [];
for (const [gSource, gDef] of Object.entries(groupDefinitions)) {
  const groupOffering = (snapshot.tables.group_offerings || []).find(go => go.group_id === gDef.id && !go.archived_at);
  const offeringId = groupOffering ? groupOffering.offering_id : null;
  const offering = (snapshot.tables.academic_offerings || []).find(o => o.id === offeringId);
  const curriculumId = offering ? offering.curriculum_id : null;
  const position = gSource.startsWith('L2') ? 3 : 1;

  let sem = (snapshot.tables.curriculum_semesters || []).find(cs => cs.curriculum_id === curriculumId && cs.position === position);
  let semId = sem ? sem.id : null;
  if (!sem) {
    semId = randomUUID();
    semesterChanges.push({
      table: 'curriculum_semesters',
      operation: 'insert',
      record: { id: semId, curriculum_id: curriculumId, position, name: gSource.startsWith('L2') ? 'Semestre 3' : 'Semestre 1', target_credits: 30, reason: 'Semestre planning' }
    });
  }
}
if (semesterChanges.length > 0) await runTransaction(semesterChanges, 'Semestres de maquette');

snapshot = await getLatestSnapshot();
const offeringSemChanges = [];
for (const [gSource, gDef] of Object.entries(groupDefinitions)) {
  const groupOffering = (snapshot.tables.group_offerings || []).find(go => go.group_id === gDef.id && !go.archived_at);
  const offeringId = groupOffering ? groupOffering.offering_id : null;
  const offering = (snapshot.tables.academic_offerings || []).find(o => o.id === offeringId);
  const curriculumId = offering ? offering.curriculum_id : null;
  const position = gSource.startsWith('L2') ? 3 : 1;

  const sem = (snapshot.tables.curriculum_semesters || []).find(cs => cs.curriculum_id === curriculumId && cs.position === position);
  if (sem && !(snapshot.tables.offering_semesters || []).some(os => os.offering_id === offeringId && os.curriculum_semester_id === sem.id)) {
    offeringSemChanges.push({
      table: 'offering_semesters',
      operation: 'insert',
      record: { id: randomUUID(), offering_id: offeringId, curriculum_id: curriculumId, curriculum_semester_id: sem.id, starts_on: '2026-10-12', ends_on: '2027-06-30' }
    });
  }
}
if (offeringSemChanges.length > 0) await runTransaction(offeringSemChanges, 'Offres-Semestres');

// Phase 3.2 : UE
snapshot = await getLatestSnapshot();
const ueChanges = [];
for (const [gSource, gDef] of Object.entries(groupDefinitions)) {
  const groupOffering = (snapshot.tables.group_offerings || []).find(go => go.group_id === gDef.id && !go.archived_at);
  const offeringId = groupOffering ? groupOffering.offering_id : null;
  const offering = (snapshot.tables.academic_offerings || []).find(o => o.id === offeringId);
  const curriculumId = offering ? offering.curriculum_id : null;
  const position = gSource.startsWith('L2') ? 3 : 1;
  const sem = (snapshot.tables.curriculum_semesters || []).find(cs => cs.curriculum_id === curriculumId && cs.position === position);
  const ueCode = `UE-${gSource.replace(/[^A-Z0-9]/g, '')}`;

  if (sem && !(snapshot.tables.teaching_units || []).some(u => u.curriculum_id === curriculumId && u.code === ueCode)) {
    ueChanges.push({
      table: 'teaching_units',
      operation: 'insert',
      record: { id: randomUUID(), curriculum_id: curriculumId, semester_id: sem.id, code: ueCode, name: `UE Enseignements ${gSource}`, credits: 30, reason: 'UE planning' }
    });
  }
}
if (ueChanges.length > 0) await runTransaction(ueChanges, 'Unités d’enseignement');

// Phase 3.3 : Matières
snapshot = await getLatestSnapshot();
const subjectChanges = [];
const subjectNames = [...new Set(data.map(c => c.subject.trim()))];
for (const name of subjectNames) {
  if (!(snapshot.tables.subjects || []).some(s => s.academic_year_id === targetYearId && s.name.toUpperCase() === name.toUpperCase())) {
    const subjId = randomUUID();
    subjectChanges.push({
      table: 'subjects',
      operation: 'insert',
      record: { id: subjId, code: `SUBJ-${subjId.slice(0, 8).toUpperCase()}`, name, academic_year_id: targetYearId, reason: 'Matière planning' }
    });
  }
}
if (subjectChanges.length > 0) await runTransaction(subjectChanges, 'Matières');

// Phase 3.4 : Composants
snapshot = await getLatestSnapshot();
const componentChanges = [];
for (const course of data) {
  for (const gSource of course.groups) {
    const gDef = groupDefinitions[gSource];
    const groupOffering = (snapshot.tables.group_offerings || []).find(go => go.group_id === gDef.id && !go.archived_at);
    const offeringId = groupOffering ? groupOffering.offering_id : null;
    const offering = (snapshot.tables.academic_offerings || []).find(o => o.id === offeringId);
    const curriculumId = offering ? offering.curriculum_id : null;
    const position = gSource.startsWith('L2') ? 3 : 1;
    const sem = (snapshot.tables.curriculum_semesters || []).find(cs => cs.curriculum_id === curriculumId && cs.position === position);
    const ue = (snapshot.tables.teaching_units || []).find(u => u.curriculum_id === curriculumId && u.semester_id === sem?.id);
    const subj = (snapshot.tables.subjects || []).find(s => s.academic_year_id === targetYearId && s.name.toUpperCase() === course.subject.trim().toUpperCase());

    if (curriculumId && ue && subj && !(snapshot.tables.curriculum_components || []).some(c => c.curriculum_id === curriculumId && c.subject_id === subj.id)) {
      if (!componentChanges.some(ch => ch.record.curriculum_id === curriculumId && ch.record.subject_id === subj.id)) {
        componentChanges.push({
          table: 'curriculum_components',
          operation: 'insert',
          record: { id: randomUUID(), curriculum_id: curriculumId, unit_id: ue.id, subject_id: subj.id, code: course.subject.trim().slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, ''), coefficient: 1, credits: 3, reason: 'Composant planning' }
        });
      }
    }
  }
}
if (componentChanges.length > 0) await runTransaction(componentChanges, 'Composants de maquette');

// Phase 3.5 : Affectations
snapshot = await getLatestSnapshot();
const assignmentChanges = [];
const assignmentMap = {};

for (const course of data) {
  for (const gSource of course.groups) {
    const key = `${gSource}::${course.subject}::${course.teacher}`;
    if (assignmentMap[key]) continue;

    const gDef = groupDefinitions[gSource];
    const teacherId = teacherIds[course.teacher];
    const groupOffering = (snapshot.tables.group_offerings || []).find(go => go.group_id === gDef.id && !go.archived_at);
    const offeringId = groupOffering ? groupOffering.offering_id : null;
    const offering = (snapshot.tables.academic_offerings || []).find(o => o.id === offeringId);
    const curriculumId = offering ? offering.curriculum_id : null;
    const subj = (snapshot.tables.subjects || []).find(s => s.academic_year_id === targetYearId && s.name.toUpperCase() === course.subject.trim().toUpperCase());
    const comp = (snapshot.tables.curriculum_components || []).find(c => c.curriculum_id === curriculumId && c.subject_id === subj?.id);

    let assign = (snapshot.tables.teaching_assignments || []).find(a =>
      a.offering_id === offeringId && a.group_id === gDef.id && a.teacher_id === teacherId && a.component_id === comp?.id
    );

    let assignId = assign ? assign.id : null;
    if (!assign && offeringId && teacherId && comp) {
      assignId = randomUUID();
      assignmentChanges.push({
        table: 'teaching_assignments',
        operation: 'insert',
        record: { id: assignId, offering_id: offeringId, curriculum_id: curriculumId, group_id: gDef.id, teacher_id: teacherId, component_id: comp.id, valid_from: '2026-10-12', valid_until: '2027-06-30', reason: 'Affectation planning' }
      });
    }
    assignmentMap[key] = { assignId, offeringId, groupId: gDef.id, teacherId };
  }
}
if (assignmentChanges.length > 0) await runTransaction(assignmentChanges, 'Affectations d’enseignement');

// Re-read assignments into map after transaction
snapshot = await getLatestSnapshot();
for (const course of data) {
  for (const gSource of course.groups) {
    const key = `${gSource}::${course.subject}::${course.teacher}`;
    const gDef = groupDefinitions[gSource];
    const teacherId = teacherIds[course.teacher];
    const groupOffering = (snapshot.tables.group_offerings || []).find(go => go.group_id === gDef.id && !go.archived_at);
    const offeringId = groupOffering ? groupOffering.offering_id : null;
    const offering = (snapshot.tables.academic_offerings || []).find(o => o.id === offeringId);
    const curriculumId = offering ? offering.curriculum_id : null;
    const subj = (snapshot.tables.subjects || []).find(s => s.academic_year_id === targetYearId && s.name.toUpperCase() === course.subject.trim().toUpperCase());
    const comp = (snapshot.tables.curriculum_components || []).find(c => c.curriculum_id === curriculumId && c.subject_id === subj?.id);
    const assign = (snapshot.tables.teaching_assignments || []).find(a =>
      a.offering_id === offeringId && a.group_id === gDef.id && a.teacher_id === teacherId && a.component_id === comp?.id
    );
    if (assign) assignmentMap[key] = { assignId: assign.id, offeringId, groupId: gDef.id, teacherId };
  }
}
console.log(`✓ 25 affectations d'enseignement prêtes : ${Object.keys(assignmentMap).length} correspondances établies.`);

// ==========================================
// Étape 4 : Injection des 114 séances
// ==========================================
snapshot = await getLatestSnapshot();
const existingSessions = snapshot.tables.sessions || [];

const sessionChanges = [];
let skippedCount = 0;

for (const course of data) {
  const room = roomMap.get(course.room_name);
  const roomId = room ? room.id : null;
  const startsAt = `${course.date}T${course.start}:00Z`;
  const endsAt = `${course.date}T${course.end}:00Z`;

  const firstG = course.groups[0];
  const firstKey = `${firstG}::${course.subject}::${course.teacher}`;
  const firstAssign = assignmentMap[firstKey];

  if (!firstAssign || !firstAssign.assignId) {
    console.error(`Affectation introuvable pour ${firstKey}`);
    continue;
  }

  // Vérifier si la séance existe déjà
  const exists = existingSessions.some(s =>
    s.starts_at === startsAt &&
    s.room_id === roomId &&
    s.teacher_id === firstAssign.teacherId &&
    s.status !== 'ANNULE'
  );

  if (exists) {
    skippedCount++;
    continue;
  }

  const sessionId = randomUUID();
  sessionChanges.push({
    table: 'sessions',
    operation: 'insert',
    record: {
      id: sessionId,
      assignment_id: firstAssign.assignId,
      offering_id: firstAssign.offeringId,
      group_id: firstAssign.groupId,
      teacher_id: firstAssign.teacherId,
      room_id: roomId,
      starts_at: startsAt,
      ends_at: endsAt,
      mode: 'COURS',
      status: 'PLANIFIE',
      reason: 'Cours emploi du temps octobre 2026'
    }
  });
}

console.log(`Séances à insérer : ${sessionChanges.length} (déjà existantes : ${skippedCount})`);

if (sessionChanges.length > 0) {
  for (let i = 0; i < sessionChanges.length; i += 50) {
    const chunk = sessionChanges.slice(i, i + 50);
    await runTransaction(chunk, `Séances lot ${Math.floor(i / 50) + 1}`);
  }
}

// Vérification finale
const finalSnapshot = await getLatestSnapshot();
const octoberSessions = (finalSnapshot.tables.sessions || []).filter(s => s.starts_at && s.starts_at.startsWith('2026-10'));
console.log(`=== INJECTION TERMINÉE AVEC SUCCÈS ===`);
console.log(`Nombre total de séances en octobre 2026 dans Supabase : ${octoberSessions.length}`);

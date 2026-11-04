import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const snapshot = JSON.parse(fs.readFileSync('tmp/integration-planning-2026-11-04/snapshot.json', 'utf8'));
const data = JSON.parse(fs.readFileSync('tmp/integration-planning-2026-11-04/relecture-v5/cours-regroupes.json', 'utf8'));

const year = snapshot.tables.academic_years.find(y => y.code === '2026-2027');
const yearId = year.id;

// 1. Salles
const roomNames = ['Salle des L1', 'Salle IA 1', 'Salle des L2', 'Salle IA 2'];
const roomSql = [];
const roomIds = {};

for (const name of roomNames) {
  const existing = (snapshot.tables.rooms || []).find(r => r.name === name);
  const id = existing ? existing.id : randomUUID();
  roomIds[name] = id;
  const code = name.replace(/\s+/g, '-').toUpperCase();
  roomSql.push(`
insert into escen.rooms (id, name, code, status, reason)
select '${id}', '${name}', '${code}', 'AVAILABLE', 'Salle de cours planning octobre 2026'
where not exists (select 1 from escen.rooms where name = '${name}');`);
}

// 2. Enseignants
const teacherDefinitions = [
  { sourceName: 'M. AGBODJAN', email: 'a.eric@escen.university', lastname: 'AGBODJAN', firstname: 'Eric', title: 'M.' },
  { sourceName: 'M. GBADAMASSI', email: 'g.akim.coach@escen.university', lastname: 'GBADAMASSI', firstname: 'Abdou Akim', title: 'M.' },
  { sourceName: 'Dr. DOUSSIMELE', email: 'd.doussimele.coach@escen.university', lastname: 'DOUSSIMELE', firstname: 'Dr.', title: 'Dr.' },
  { sourceName: 'M. NYARKO', email: 'n.kokou.coach@escen.university', lastname: 'NYARKO', firstname: 'Kokou Adjiwonu', title: 'M.' },
  { sourceName: 'M. ALITI', email: 'a.ruphin.coach@escen.university', lastname: 'ALITI', firstname: 'Ruphin', title: 'M.' },
  { sourceName: 'M. AYAKPONOU', email: 'a.kodjovi.coach@escen.university', lastname: 'AYAKPONOU', firstname: 'Kodjovi', title: 'M.' },
  { sourceName: 'M. Elod Messanh', email: 'm.elod.coach@escen.university', lastname: 'MESSANH', firstname: 'Elod', title: 'M.' },
  { sourceName: 'M. AGBETOGLO', email: 'ag.kodjo.coach@escen.university', lastname: 'AGBETOGLO', firstname: 'Kodjo', title: 'M.' },
  { sourceName: 'M. GAOU', email: 'g.gaou.coach@escen.university', lastname: 'GAOU', firstname: 'M.', title: 'M.' },
  { sourceName: 'M. TETE', email: 't.tete.coach@escen.university', lastname: 'TETE', firstname: 'M.', title: 'M.' },
  { sourceName: 'M. FIOKLOU', email: 'f.amevi.coach@escen.university', lastname: 'FIOKLOU', firstname: 'Amévi', title: 'M.' },
  { sourceName: 'M. POTOKOYE', email: 'p.potokoye.coach@escen.university', lastname: 'POTOKOYE', firstname: 'M.', title: 'M.' },
  { sourceName: 'M. DEGLA', email: 'd.degla.coach@escen.university', lastname: 'DEGLA', firstname: 'M.', title: 'M.' },
  { sourceName: 'M. MODEDZI', email: 'm.modedzi.coach@escen.university', lastname: 'MODEDZI', firstname: 'M.', title: 'M.' },
  { sourceName: 'M. AZIATI', email: 'a.aziati.coach@escen.university', lastname: 'AZIATI', firstname: 'M.', title: 'M.' },
];

const teacherSql = [];
const teacherIds = {};

for (const def of teacherDefinitions) {
  const existingPerson = (snapshot.tables.people || []).find(p => (p.email || '').toLowerCase() === def.email.toLowerCase());
  const personId = existingPerson ? existingPerson.id : randomUUID();

  teacherSql.push(`
insert into escen.people (id, firstname, lastname, email)
select '${personId}', '${def.firstname.replace(/'/g, "''")}', '${def.lastname.replace(/'/g, "''")}', '${def.email}'
where not exists (select 1 from escen.people where lower(email) = lower('${def.email}'));`);

  const existingStaff = (snapshot.tables.staff || []).find(s => s.person_id === personId);
  const staffId = existingStaff ? existingStaff.id : randomUUID();
  teacherSql.push(`
insert into escen.staff (id, person_id, employee_number, reason)
select '${staffId}', p.id, 'ENS-${staffId.slice(0, 8).toUpperCase()}', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('${def.email}')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);`);

  const existingTeacher = (snapshot.tables.teachers || []).find(t => t.staff_id === staffId);
  const teacherId = existingTeacher ? existingTeacher.id : randomUUID();
  teacherIds[def.sourceName] = teacherId;

  teacherSql.push(`
insert into escen.teachers (id, staff_id, active, reason)
select '${teacherId}', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('${def.email}')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);`);
}

// 3. Groupes cibles & offres
const groupDefinitions = {
  'L1 TC': { id: 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c', name: 'L1 TRONC COMMUN', levelId: '64408331-08f6-5093-b894-a29af2419ef3' },
  'L1 IA & GL': { id: 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2', name: 'L1 IA', levelId: '64408331-08f6-5093-b894-a29af2419ef3' },
  'L2 TC': { id: '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a', name: 'L2 TRONC COMMUN', levelId: '40c41169-91c5-54d5-b3de-6654e4b2c6e3' },
  'L2 IA & GL': { id: '90e081d0-1e56-4e10-9dc7-7854f155f5ea', name: 'Licence 2 IA', levelId: '40c41169-91c5-54d5-b3de-6654e4b2c6e3' },
};

// 4. Matières, UE, Composants, Affectations
const academicSql = [];
const assignmentMap = {};

for (const course of data) {
  for (const gSource of course.groups) {
    const key = `${gSource}::${course.subject}::${course.teacher}`;
    if (assignmentMap[key]) continue;

    const gDef = groupDefinitions[gSource];
    const teacherId = teacherIds[course.teacher];
    const groupOffering = snapshot.tables.group_offerings.find(go => go.group_id === gDef.id && !go.archived_at);
    let offeringId = groupOffering ? groupOffering.offering_id : null;
    let offering = snapshot.tables.academic_offerings.find(o => o.id === offeringId);

    let curriculumId = offering ? offering.curriculum_id : null;
    if (!curriculumId) {
      curriculumId = randomUUID();
      offeringId = randomUUID();
      const progCode = `PRG-${gSource.replace(/[^A-Z0-9]/g, '')}`;
      const progId = randomUUID();
      academicSql.push(`
insert into escen.programs (id, code, name) values ('${progId}', '${progCode}', 'Formation ${gDef.name}') on conflict (code) do nothing;
insert into escen.curricula (id, program_id, level_id, version, status, reason)
values ('${curriculumId}', '${progId}', '${gDef.levelId}', 1, 'DRAFT', 'Maquette pour planning 2026-2027') on conflict (id) do nothing;
insert into escen.academic_offerings (id, curriculum_id, academic_year_id, level_id, reason)
values ('${offeringId}', '${curriculumId}', '${yearId}', '${gDef.levelId}', 'Offre académique 2026-2027') on conflict (id) do nothing;
insert into escen.group_offerings (id, group_id, offering_id, academic_year_id, level_id, reason)
values ('${randomUUID()}', '${gDef.id}', '${offeringId}', '${yearId}', '${gDef.levelId}', 'Rattachement groupe offre') on conflict (group_id, offering_id) do nothing;
`);
    }

    // Semestre de maquette
    const semesterId = randomUUID();
    academicSql.push(`
insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '${semesterId}', '${curriculumId}', ${gSource.startsWith('L2') ? 3 : 1}, '${gSource.startsWith('L2') ? 'Semestre 3' : 'Semestre 1'}', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '${curriculumId}' and position = ${gSource.startsWith('L2') ? 3 : 1});

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '${randomUUID()}', '${offeringId}', '${curriculumId}', cs.id, '${year.starts_on}', '${year.ends_on}'
from escen.curriculum_semesters cs
where cs.curriculum_id = '${curriculumId}' and cs.position = ${gSource.startsWith('L2') ? 3 : 1}
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '${offeringId}' and os.curriculum_semester_id = cs.id);
`);

    // UE & Matière
    const unitId = randomUUID();
    const subjectId = randomUUID();
    const compId = randomUUID();
    const assignId = randomUUID();
    const cleanSubj = course.subject.replace(/'/g, "''");
    const subjCode = `SUBJ-${randomUUID().slice(0, 8).toUpperCase()}`;

    academicSql.push(`
insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '${unitId}', '${curriculumId}', cs.id, 'UE-${gSource.replace(/[^A-Z0-9]/g, '')}', 'UE Enseignements ${gSource}', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '${curriculumId}' and cs.position = ${gSource.startsWith('L2') ? 3 : 1}
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-${gSource.replace(/[^A-Z0-9]/g, '')}');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '${subjectId}', '${subjCode}', '${cleanSubj}', '${yearId}', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = '${yearId}' and upper(name) = upper('${cleanSubj}'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '${compId}', '${curriculumId}', u.id, s.id, '${cleanSubj.slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '')}', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '${curriculumId}' and cs.position = ${gSource.startsWith('L2') ? 3 : 1}
  and s.academic_year_id = '${yearId}' and upper(s.name) = upper('${cleanSubj}')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '${curriculumId}' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '${assignId}', '${offeringId}', '${curriculumId}', '${gDef.id}', '${teacherId}', c.id, '${year.starts_on}', '${year.ends_on}', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '${curriculumId}' and s.academic_year_id = '${yearId}' and upper(s.name) = upper('${cleanSubj}')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '${offeringId}' and ta.group_id = '${gDef.id}' and ta.teacher_id = '${teacherId}' and ta.component_id = c.id);
`);

    assignmentMap[key] = { assignId, offeringId, groupId: gDef.id, teacherId, cleanSubj, curriculumId };
  }
}

// 5. Séances & Participations
const sessionSql = [];
for (const course of data) {
  const startsAt = `${course.date}T${course.start}:00Z`;
  const endsAt = `${course.date}T${course.end}:00Z`;
  const firstG = course.groups[0];
  const firstKey = `${firstG}::${course.subject}::${course.teacher}`;
  const firstAssign = assignmentMap[firstKey];
  const sessionId = randomUUID();
  const reason = course.shared ? `Cours commun ${course.groups.join(' + ')}` : `Cours ${firstG}`;

  sessionSql.push(`
insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '${sessionId}', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = '${course.room_name}'), '${startsAt}', '${endsAt}', 'COURS', 'PLANIFIE', '${reason.replace(/'/g, "''")}'
from escen.teaching_assignments a
where a.offering_id = '${firstAssign.offeringId}' and a.group_id = '${firstAssign.groupId}' and a.teacher_id = '${firstAssign.teacherId}'
limit 1;
`);

  for (const extraG of course.groups.slice(1)) {
    const extraKey = `${extraG}::${course.subject}::${course.teacher}`;
    const extraAssign = assignmentMap[extraKey];
    sessionSql.push(`
insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '${randomUUID()}', '${sessionId}', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '${extraAssign.offeringId}' and a.group_id = '${extraAssign.groupId}' and a.teacher_id = '${extraAssign.teacherId}'
limit 1;
`);
  }
}

const fullSql = `-- ====================================================================
-- MIGRATION: Import des 114 cours d'octobre 2026 (138 participations)
-- Salles, Enseignants, Matières et Affectations pour L1 TC, L1 IA, L2 TC, L2 IA
-- ====================================================================

-- 1. SALLES
${roomSql.join('\n')}

-- 2. ENSEIGNANTS & PROFILS
${teacherSql.join('\n')}

-- 3. STRUCTURE ACADÉMIQUE, MATIÈRES, AFFECTATIONS ET SÉANCES
-- Exécuté uniquement si l'année académique 2026-2027 et les groupes cibles existent
do $$
begin
  if not exists (select 1 from escen.academic_years where id = '${yearId}')
     or not exists (select 1 from escen.groups where name = 'L1 TRONC COMMUN') then
    return;
  end if;

${academicSql.join('\n')}

${sessionSql.join('\n')}
end $$;
`;

fs.writeFileSync('docs/sql-proposals/20261104_october_timetables_import.sql', fullSql);
console.log('✓ Fichier SQL généré : docs/sql-proposals/20261104_october_timetables_import.sql');
console.log(`✓ Taille : ${(fullSql.length / 1024).toFixed(1)} Ko`);

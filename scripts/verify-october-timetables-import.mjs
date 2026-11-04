import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { localBusinessFixture } from '../tests/ui/local-business-fixture.mjs';

console.log('--- Test de préparation et d’injection des 114 cours d’octobre 2026 ---');

const local = await localBusinessFixture();
const { db, insert } = local;

const data = JSON.parse(fs.readFileSync('tmp/integration-planning-2026-11-04/relecture-v5/cours-regroupes.json', 'utf8'));
console.log(`✓ Données sources chargées : ${data.length} cours regroupés`);

// 1. Les 4 Salles
const roomNames = ['Salle des L1', 'Salle IA 1', 'Salle des L2', 'Salle IA 2'];
const roomMap = new Map();
for (const name of roomNames) {
  let room = (await db.query('select * from escen.rooms where name = $1', [name])).rows[0];
  if (!room) {
    room = await insert('rooms', { name, code: name.replace(/\s+/g, '-').toUpperCase() });
  }
  roomMap.set(name, room);
}
console.log(`✓ 4 salles vérifiées / créées : ${[...roomMap.keys()].join(', ')}`);

// 2. Les 15 Enseignants
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

const teacherMap = new Map();

for (const def of teacherDefinitions) {
  let person = (await db.query('select * from escen.people where lower(email) = lower($1)', [def.email])).rows[0];
  if (!person) {
    person = await insert('people', {
      firstname: def.firstname,
      lastname: def.lastname,
      email: def.email,
    });
  }

  let staff = (await db.query('select * from escen.staff where person_id = $1', [person.id])).rows[0];
  if (!staff) {
    const staffId = randomUUID();
    staff = await insert('staff', {
      id: staffId,
      person_id: person.id,
      employee_number: `ENS-${staffId.slice(0, 8).toUpperCase()}`,
      reason: 'Enseignant planning octobre 2026',
    });
  }

  let teacher = (await db.query('select * from escen.teachers where staff_id = $1', [staff.id])).rows[0];
  if (!teacher) {
    teacher = await insert('teachers', {
      staff_id: staff.id,
      active: true,
      reason: 'Enseignant planning octobre 2026',
    });
  }

  teacherMap.set(def.sourceName, teacher);
}
console.log(`✓ 15 enseignants prêts : ${teacherMap.size} profils enseignants rattachés`);

// 3. Niveaux et Groupes cibles
const licenceCycle = await insert('cycles', { code: 'LIC', name: 'Cycle Licence' });

const levelL1 = (await db.query("select * from escen.levels where name = 'Licence 1'")).rows[0]
  || await insert('levels', { id: '64408331-08f6-5093-b894-a29af2419ef3', code: 'L1', name: 'Licence 1', position: 1, cycle_id: licenceCycle.id });
const levelL2 = (await db.query("select * from escen.levels where name = 'Licence 2'")).rows[0]
  || await insert('levels', { id: '40c41169-91c5-54d5-b3de-6654e4b2c6e3', code: 'L2', name: 'Licence 2', position: 2, cycle_id: licenceCycle.id });

const groupNameTargets = {
  'L1 TC': { id: 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c', name: 'L1 TRONC COMMUN', level: levelL1 },
  'L1 IA & GL': { id: 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2', name: 'L1 IA', level: levelL1 },
  'L2 TC': { id: '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a', name: 'L2 TRONC COMMUN', level: levelL2 },
  'L2 IA & GL': { id: '90e081d0-1e56-4e10-9dc7-7854f155f5ea', name: 'Licence 2 IA', level: levelL2 },
};

const groupMap = new Map();
for (const [source, def] of Object.entries(groupNameTargets)) {
  let group = (await db.query('select * from escen.groups where id = $1', [def.id])).rows[0];
  if (!group) {
    group = await insert('groups', {
      id: def.id,
      name: def.name,
      academic_year_id: year.id,
      level_id: def.level.id,
      reason: `Groupe ${def.name} pour 2026-2027`,
    });
  }

  // Trouver ou créer l'offre de formation
  let offerings = (await db.query(`
    select o.* from escen.group_offerings go
    join escen.academic_offerings o on o.id = go.offering_id
    where go.group_id = $1 and go.archived_at is null
  `, [group.id])).rows;

  if (offerings.length === 0) {
    // Créer un programme et une offre de formation
    const progCode = source.replace(/[^A-Z0-9]/g, '');
    let prog = (await db.query('select * from escen.programs where code = $1', [progCode])).rows[0];
    if (!prog) {
      prog = await insert('programs', { code: progCode, name: `Formation ${def.name}` });
    }
    const curId = randomUUID();
    const cur = await insert('curricula', {
      id: curId,
      program_id: prog.id,
      level_id: def.level.id,
      version: 1,
      status: 'DRAFT',
      reason: 'Maquette pour planning 2026-2027',
    });
    const offering = await insert('academic_offerings', {
      curriculum_id: cur.id,
      academic_year_id: year.id,
      level_id: def.level.id,
      reason: 'Offre académique 2026-2027',
    });
    await insert('group_offerings', {
      group_id: group.id,
      offering_id: offering.id,
      academic_year_id: year.id,
      level_id: def.level.id,
      reason: 'Rattachement groupe offre',
    });
    offerings = [offering];
  }

  groupMap.set(source, { group, offerings });
}
console.log(`✓ 4 groupes de cours réconciliés avec leurs offres de formation`);

// 4. Matières, Composants de maquette et Affectations d'enseignement
const assignmentMap = new Map(); // key: `${sourceGroup}::${subject}::${teacherSourceName}`

for (const course of data) {
  for (const sourceGroup of course.groups) {
    const key = `${sourceGroup}::${course.subject}::${course.teacher}`;
    if (assignmentMap.has(key)) continue;

    const { group, offerings } = groupMap.get(sourceGroup);
    const teacher = teacherMap.get(course.teacher);
    assert(teacher, `Enseignant inconnu : ${course.teacher}`);

    // On utilise la première offre de formation rattachée au groupe
    const offering = offerings[0];
    const curriculumId = offering.curriculum_id;

    // Récupérer le premier semestre de la maquette
    let semester = (await db.query('select * from escen.curriculum_semesters where curriculum_id = $1 order by position limit 1', [curriculumId])).rows[0];
    if (!semester) {
      semester = await insert('curriculum_semesters', {
        curriculum_id: curriculumId,
        position: sourceGroup.startsWith('L2') ? 3 : 1,
        name: sourceGroup.startsWith('L2') ? 'Semestre 3' : 'Semestre 1',
        target_credits: 30,
        reason: 'Semestre de maquette pour planning',
      });
    }

    let offeringSemester = (await db.query('select * from escen.offering_semesters where offering_id = $1 and curriculum_semester_id = $2', [offering.id, semester.id])).rows[0];
    if (!offeringSemester) {
      offeringSemester = await insert('offering_semesters', {
        offering_id: offering.id,
        curriculum_id: curriculumId,
        curriculum_semester_id: semester.id,
        starts_on: '2026-10-01',
        ends_on: '2027-07-01',
      });
    }

    // Récupérer ou créer l'UE
    let unit = (await db.query('select * from escen.teaching_units where curriculum_id = $1 and semester_id = $2 limit 1', [curriculumId, semester.id])).rows[0];
    if (!unit) {
      unit = await insert('teaching_units', {
        curriculum_id: curriculumId,
        semester_id: semester.id,
        code: `UE-${sourceGroup.replace(/[^A-Z0-9]/g, '')}`,
        name: `UE Enseignements ${sourceGroup}`,
        credits: 30,
        reason: 'UE de maquette pour planning',
      });
    }

    // Récupérer ou créer la matière (subject)
    let subject = (await db.query('select * from escen.subjects where upper(name) = upper($1) and academic_year_id = $2', [course.subject, year.id])).rows[0];
    if (!subject) {
      const codeSuffix = randomUUID().slice(0, 6).toUpperCase();
      subject = await insert('subjects', {
        code: `SUBJ-${codeSuffix}`,
        name: course.subject,
        academic_year_id: year.id,
        reason: 'Matière import planning octobre 2026',
      });
    }

    // Récupérer ou créer le composant de maquette
    let component = (await db.query('select * from escen.curriculum_components where curriculum_id = $1 and subject_id = $2', [curriculumId, subject.id])).rows[0];
    if (!component) {
      component = await insert('curriculum_components', {
        curriculum_id: curriculumId,
        unit_id: unit.id,
        subject_id: subject.id,
        code: course.subject.slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, ''),
        coefficient: 1,
        credits: 3,
        reason: 'Composant matière de maquette pour planning',
      });
    }

    // Récupérer ou créer l'affectation d'enseignement
    let assignment = (await db.query(`
      select * from escen.teaching_assignments
      where offering_id = $1 and group_id = $2 and teacher_id = $3 and component_id = $4
    `, [offering.id, group.id, teacher.id, component.id])).rows[0];

    if (!assignment) {
      assignment = await insert('teaching_assignments', {
        offering_id: offering.id,
        curriculum_id: curriculumId,
        group_id: group.id,
        teacher_id: teacher.id,
        component_id: component.id,
        valid_from: '2026-10-01',
        valid_until: '2027-07-01',
        reason: 'Affectation d’enseignement planning octobre 2026',
      });
    }

    assignmentMap.set(key, { assignment, offering, group, teacher, component });
  }
}
console.log(`✓ ${assignmentMap.size} affectations d’enseignement générées et liées`);

// 5. Insertion des 114 séances physiques et de leurs participations
let sessionsInserted = 0;
let participantsInserted = 0;

for (const course of data) {
  const room = roomMap.get(course.room_name);
  assert(room, `Salle inconnue : ${course.room_name}`);

  const startsAt = new Date(`${course.date}T${course.start}:00Z`).toISOString();
  const endsAt = new Date(`${course.date}T${course.end}:00Z`).toISOString();

  // Premier groupe porteur
  const firstGroupSource = course.groups[0];
  const firstKey = `${firstGroupSource}::${course.subject}::${course.teacher}`;
  const firstAssignData = assignmentMap.get(firstKey);
  assert(firstAssignData, `Affectation manquante pour ${firstKey}`);

  const sessionId = randomUUID();
  await insert('sessions', {
    id: sessionId,
    assignment_id: firstAssignData.assignment.id,
    offering_id: firstAssignData.offering.id,
    group_id: firstAssignData.group.id,
    teacher_id: firstAssignData.teacher.id,
    room_id: room.id,
    starts_at: startsAt,
    ends_at: endsAt,
    mode: 'COURS',
    status: 'PLANIFIE',
    reason: course.shared ? `Cours commun ${course.groups.join(' + ')}` : `Cours ${firstGroupSource}`,
  });
  sessionsInserted++;

  // Participations additionnelles pour les cours partagés (le premier groupe est inséré par trigger automatique)
  for (const gSource of course.groups.slice(1)) {
    const aKey = `${gSource}::${course.subject}::${course.teacher}`;
    const aData = assignmentMap.get(aKey);
    assert(aData, `Affectation manquante pour participant ${aKey}`);

    await insert('session_participants', {
      id: randomUUID(),
      session_id: sessionId,
      assignment_id: aData.assignment.id,
      offering_id: aData.offering.id,
      group_id: aData.group.id,
      teacher_id: aData.teacher.id,
      reason: 'Participation de groupe au cours commun',
    });
    participantsInserted++;
  }
}

console.log(`✓ Succès de l'import : ${sessionsInserted} séances insérées, ${participantsInserted} participations créées`);

// 6. Vérifications d’intégrité
const totalInDb = await value('select count(*)::int as value from escen.sessions where starts_at >= $1 and starts_at <= $2', ['2026-10-01', '2026-10-31']);
assert.equal(totalInDb, 114, 'Le nombre de séances d’octobre en base doit être exactement 114');

const totalParticipants = await value(`
  select count(*)::int as value from escen.session_participants sp
  join escen.sessions s on s.id = sp.session_id
  where s.starts_at >= $1 and s.starts_at <= $2
`, ['2026-10-01', '2026-10-31']);
assert.equal(totalParticipants, 138, 'Le nombre total de participations de groupes doit être exactement 138');

console.log('--- TOUS LES CONTRÔLES SONT VALIDÉS SANS ERREUR (114 séances, 138 participations) ---');
process.exit(0);

-- ====================================================================
-- MIGRATION: Import des 114 cours d'octobre 2026 (138 participations)
-- Salles, Enseignants, Matières et Affectations pour L1 TC, L1 IA, L2 TC, L2 IA
-- ====================================================================

-- 1. SALLES

insert into escen.rooms (id, name, code, status, reason)
select 'df876841-a1d8-4ac2-acdc-0af81ac0c45d', 'Salle des L1', 'SALLE-DES-L1', 'AVAILABLE', 'Salle de cours planning octobre 2026'
where not exists (select 1 from escen.rooms where name = 'Salle des L1');

insert into escen.rooms (id, name, code, status, reason)
select '7a39b38d-6826-4821-89ea-84b2ac0c59ff', 'Salle IA 1', 'SALLE-IA-1', 'AVAILABLE', 'Salle de cours planning octobre 2026'
where not exists (select 1 from escen.rooms where name = 'Salle IA 1');

insert into escen.rooms (id, name, code, status, reason)
select 'aac2b7d9-e51e-42bc-8b80-489bbde9e551', 'Salle des L2', 'SALLE-DES-L2', 'AVAILABLE', 'Salle de cours planning octobre 2026'
where not exists (select 1 from escen.rooms where name = 'Salle des L2');

insert into escen.rooms (id, name, code, status, reason)
select '18f172ac-1a5d-44b5-95f7-b7510e70dc14', 'Salle IA 2', 'SALLE-IA-2', 'AVAILABLE', 'Salle de cours planning octobre 2026'
where not exists (select 1 from escen.rooms where name = 'Salle IA 2');

-- 2. ENSEIGNANTS & PROFILS

insert into escen.people (id, firstname, lastname, email)
select 'e14c7a64-f499-5eb2-8a06-319568b7b6e3', 'Eric', 'AGBODJAN', 'a.eric@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('a.eric@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select '8bdf648a-44ad-4a04-8dee-88a0b2a3b444', p.id, 'ENS-8BDF648A', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('a.eric@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select 'f9309e77-9a9a-4d78-971e-e655cdbb2f17', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('a.eric@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select '76dad7ab-2ce6-5ef5-b302-b2a19312ea8c', 'Abdou Akim', 'GBADAMASSI', 'g.akim.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('g.akim.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select 'bfbe75ee-ac01-44b6-9954-dd7cc613855a', p.id, 'ENS-BFBE75EE', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('g.akim.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select '5fe7e914-310a-4884-8db6-213b08fffc74', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('g.akim.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select '83705b27-28dc-4a5b-809f-f0fee2cbd2b9', 'Dr.', 'DOUSSIMELE', 'd.doussimele.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('d.doussimele.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select 'ae088c37-4be6-4b13-ae36-61fddd913f4f', p.id, 'ENS-AE088C37', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('d.doussimele.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('d.doussimele.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select '093a410b-2469-4e11-a747-312acdb38b2e', 'Kokou Adjiwonu', 'NYARKO', 'n.kokou.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('n.kokou.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select 'f7f3c11e-d933-489a-a95c-acebe91b9b1a', p.id, 'ENS-F7F3C11E', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('n.kokou.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select 'd18207a7-785f-4e98-bb58-eb3904c8bf96', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('n.kokou.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select 'c525997d-0139-40c3-8551-71be36bbfb44', 'Ruphin', 'ALITI', 'a.ruphin.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('a.ruphin.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select 'b37a6791-2c02-4711-a4c3-c721198137bc', p.id, 'ENS-B37A6791', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('a.ruphin.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select 'b206a2a4-5eee-43bc-9167-e45f044c9be7', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('a.ruphin.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select '032e4351-0684-44d7-a9a3-5b8725ad8e70', 'Kodjovi', 'AYAKPONOU', 'a.kodjovi.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('a.kodjovi.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select '9b229012-d21c-4841-8004-5919b6961281', p.id, 'ENS-9B229012', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('a.kodjovi.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select '63db263a-fc62-4c68-84c1-6d9a3ef9d160', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('a.kodjovi.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select 'c6e449c0-74f6-4b73-b543-7d14f1795f5f', 'Elod', 'MESSANH', 'm.elod.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('m.elod.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select '2254eec5-f30e-4de8-8280-fe3a9b0481c3', p.id, 'ENS-2254EEC5', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('m.elod.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select 'a57723b6-675a-4644-879c-35ca2ec34fb4', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('m.elod.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select '2c7fcd86-3326-49a4-bc3c-74cfe9258565', 'Kodjo', 'AGBETOGLO', 'ag.kodjo.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('ag.kodjo.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select '22ccc848-40de-4f53-824c-e8eb9ac8853a', p.id, 'ENS-22CCC848', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('ag.kodjo.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select '0273ddb3-2671-4dc8-b2ef-eefba8c5e98e', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('ag.kodjo.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select '08592ab6-321e-4306-ab65-fd51ebe80b3f', 'M.', 'GAOU', 'g.gaou.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('g.gaou.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select '3e3a0ac7-00b1-48f6-869a-414137a4e5af', p.id, 'ENS-3E3A0AC7', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('g.gaou.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select 'b9d07b94-d806-476e-9f7b-ffb3cfb79ada', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('g.gaou.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select '377cb440-0e25-4a58-9efd-a2893c238c1b', 'M.', 'TETE', 't.tete.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('t.tete.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select '7ad393ef-b117-4cfd-80c1-84315a3bdd82', p.id, 'ENS-7AD393EF', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('t.tete.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select 'c2162ac7-de41-405b-855d-1857d2635920', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('t.tete.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select 'bd301b6e-eb1a-417f-aa73-db6e4e386d58', 'Amévi', 'FIOKLOU', 'f.amevi.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('f.amevi.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select 'cebe5e22-3a09-4aa5-8ea4-a65f61360708', p.id, 'ENS-CEBE5E22', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('f.amevi.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select 'bc99ed78-d94b-471b-853a-316b8ba7bba9', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('f.amevi.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select '4728565f-8d7a-4625-860d-338944b39d98', 'M.', 'POTOKOYE', 'p.potokoye.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('p.potokoye.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select '2055690e-5d86-4178-a171-85c76f163fba', p.id, 'ENS-2055690E', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('p.potokoye.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select '5c166ca4-2df9-4d9a-96f9-7a788bc7de95', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('p.potokoye.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select 'a23ceb37-3d88-4330-88c2-7d0a703d792a', 'M.', 'DEGLA', 'd.degla.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('d.degla.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select '3df92388-c0b8-4a3b-8667-19460c2583cd', p.id, 'ENS-3DF92388', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('d.degla.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select '41a56262-2a82-480a-8303-2baf69b64342', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('d.degla.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select '5a5eaa18-d537-4e1e-af89-69200bc49b3f', 'M.', 'MODEDZI', 'm.modedzi.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('m.modedzi.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select '9ea08bd1-98f6-44ee-bb9c-411a9a9c5d5a', p.id, 'ENS-9EA08BD1', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('m.modedzi.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('m.modedzi.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

insert into escen.people (id, firstname, lastname, email)
select 'df2fdb40-60d1-4d8a-9aec-12b696128035', 'M.', 'AZIATI', 'a.aziati.coach@escen.university'
where not exists (select 1 from escen.people where lower(email) = lower('a.aziati.coach@escen.university'));

insert into escen.staff (id, person_id, employee_number, reason)
select '0f57f565-dfe2-4854-97b9-fad345453a22', p.id, 'ENS-0F57F565', 'Enseignant planning octobre 2026'
from escen.people p
where lower(p.email) = lower('a.aziati.coach@escen.university')
  and not exists (select 1 from escen.staff s where s.person_id = p.id);

insert into escen.teachers (id, staff_id, active, reason)
select 'a4b248f5-85cb-46d7-85b7-b6f1a979ce12', s.id, true, 'Enseignant planning octobre 2026'
from escen.staff s
join escen.people p on p.id = s.person_id
where lower(p.email) = lower('a.aziati.coach@escen.university')
  and not exists (select 1 from escen.teachers t where t.staff_id = s.id);

-- 3. STRUCTURE ACADÉMIQUE, MATIÈRES, AFFECTATIONS ET SÉANCES
-- Exécuté uniquement si l'année académique 2026-2027 et les groupes cibles existent
do $$
begin
  if not exists (select 1 from escen.academic_years where id = 'cbd8ee33-b322-43b2-9876-99636e5891d8')
     or not exists (select 1 from escen.groups where name = 'L1 TRONC COMMUN') then
    return;
  end if;


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '4c8cf53b-d43a-4de7-abfe-b61021638952', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '7b734fe9-e907-41c3-a4bd-08e6bef5e2a3', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select 'eb22f304-81b4-4317-8bfa-c27d87658d3c', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, 'UE-L1IAGL', 'UE Enseignements L1 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'ac1c99fb-07ec-42a3-8220-f3c93662daf0', 'SUBJ-F1AA25A4', 'Statistiques Descriptives', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Statistiques Descriptives'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '45010af8-0ac0-4e68-8ded-3617b25c0cb3', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', u.id, s.id, 'STATISTIQU', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Statistiques Descriptives')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '394c4fab-7779-4b17-885e-be64dd72436b', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2', 'f9309e77-9a9a-4d78-971e-e655cdbb2f17', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Statistiques Descriptives')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and ta.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and ta.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '9056e4bd-527f-4fc2-8b7b-516668309495', '93391309-ca65-466d-9e50-7cd4278dabe0', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'c0066516-9546-4ce6-82af-6a1b4e58228d', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select 'd881e81d-797b-412c-a14f-16c9ed22d78a', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, 'UE-L1TC', 'UE Enseignements L1 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '8aa72b31-b9ac-4e89-be51-ed2e0cb943f3', 'SUBJ-3B57E0BD', 'Statistiques Descriptives', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Statistiques Descriptives'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '2100b397-45e9-47fb-9fed-cdbd5875aa92', '93391309-ca65-466d-9e50-7cd4278dabe0', u.id, s.id, 'STATISTIQU', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Statistiques Descriptives')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '68d60707-2b85-48da-9495-5b27260f8d65', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c', 'f9309e77-9a9a-4d78-971e-e655cdbb2f17', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Statistiques Descriptives')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and ta.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and ta.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '99ca26fb-0cbd-4219-ac71-4be23520a832', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'ca32eb0c-a91b-4f1f-9e01-54538463f7c0', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '9b748cef-d1d4-4aba-aa3a-c8e16727db14', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, 'UE-L1IAGL', 'UE Enseignements L1 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '12d87b39-e879-4e57-9472-7155dfa9c3e6', 'SUBJ-33F8F1B5', 'T.E.E.O.', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('T.E.E.O.'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '1ab3eb3f-c092-428f-a8d9-a03b0157b4c8', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', u.id, s.id, 'TEEO', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('T.E.E.O.')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'bb6f48d5-e506-403e-8caa-a807faf5eaa2', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2', 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('T.E.E.O.')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and ta.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and ta.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '9a54ed57-bf63-4935-8103-4ac44713f3bc', '93391309-ca65-466d-9e50-7cd4278dabe0', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '0b043837-965d-4283-9da5-aba8777ea50a', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '046de414-9c8d-49b1-95a4-4d1a52991579', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, 'UE-L1TC', 'UE Enseignements L1 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '2674461a-f677-4349-9699-e637954c22e7', 'SUBJ-E878B86D', 'T.E.E.O.', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('T.E.E.O.'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '71572658-4241-4f79-8837-b682cf39847c', '93391309-ca65-466d-9e50-7cd4278dabe0', u.id, s.id, 'TEEO', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('T.E.E.O.')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '1cb49a11-ed1f-4b29-b4b2-ea34f89be2e8', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c', 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('T.E.E.O.')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and ta.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and ta.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '7fdc7032-8acb-471e-9425-a26d51e89f6d', '93391309-ca65-466d-9e50-7cd4278dabe0', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'a4c12b2d-aaf8-4de6-a0d8-50d9d8a316b2', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '07a35a04-6fcf-4a43-a9bb-8b1e14d41d34', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, 'UE-L1TC', 'UE Enseignements L1 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '8e205856-9592-4b3a-9247-598f29fcbe29', 'SUBJ-AD84B2D1', 'Les Principes Marketing', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Les Principes Marketing'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '7b051ccc-ad25-4844-84e9-4ccee735446d', '93391309-ca65-466d-9e50-7cd4278dabe0', u.id, s.id, 'LESPRINCI', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Les Principes Marketing')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'b4e5727b-14a6-4ff7-ac78-25f3cd3acf1f', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c', 'd18207a7-785f-4e98-bb58-eb3904c8bf96', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Les Principes Marketing')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and ta.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and ta.teacher_id = 'd18207a7-785f-4e98-bb58-eb3904c8bf96' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '9d96f8e8-045f-4d6a-8f98-ff5f021cbea7', '93391309-ca65-466d-9e50-7cd4278dabe0', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '0f161f38-62d0-4df3-b7a1-e1a257c7ec80', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select 'f5fab469-9283-4213-b620-5fadea9a9da9', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, 'UE-L1TC', 'UE Enseignements L1 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'b080e6cb-79fd-4768-8d51-80a20f5d0e33', 'SUBJ-31609DC5', 'Généralités sur l’Economie Numérique', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Généralités sur l’Economie Numérique'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select 'edef75a5-0c9d-455f-9fb4-08870d76ae37', '93391309-ca65-466d-9e50-7cd4278dabe0', u.id, s.id, 'GNRALIT', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Généralités sur l’Economie Numérique')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'cfd6109f-cdc1-4bbb-bc34-d0ab67e56cac', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c', 'b206a2a4-5eee-43bc-9167-e45f044c9be7', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Généralités sur l’Economie Numérique')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and ta.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and ta.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '29372b90-068b-4449-a670-6499951c6867', '93391309-ca65-466d-9e50-7cd4278dabe0', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '033e8e46-0cf9-44b9-92f4-9d790621bc54', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '999d139d-ae15-472f-97d5-e6fd593306e2', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, 'UE-L1TC', 'UE Enseignements L1 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'abc474b7-4e7c-4481-8af5-f1c0d2c451fb', 'SUBJ-356E0729', 'Economie Générale', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Economie Générale'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '1924b957-a780-4adb-860d-2e609178bf0b', '93391309-ca65-466d-9e50-7cd4278dabe0', u.id, s.id, 'ECONOMIEG', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Economie Générale')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'a59c90f7-cffb-4b73-882b-38fefc376ff2', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c', '63db263a-fc62-4c68-84c1-6d9a3ef9d160', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Economie Générale')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and ta.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and ta.teacher_id = '63db263a-fc62-4c68-84c1-6d9a3ef9d160' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '39b276e2-162c-4146-8536-66be38b94209', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'e63994db-d880-4482-b4b7-0dd1380d7fa6', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '66ccb2f7-9b80-48a1-8bc6-8361a05e784a', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, 'UE-L1IAGL', 'UE Enseignements L1 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '1a57f5da-cd07-4606-abb1-e7d1a0a4fd3f', 'SUBJ-D10A6D6A', 'Coaching en Anglais', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Coaching en Anglais'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select 'df6391f8-3b0e-4128-9d4d-7f87e2d38ce9', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', u.id, s.id, 'COACHINGE', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Coaching en Anglais')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '23c9f83f-d91d-46ff-8538-ba528058a881', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2', 'a57723b6-675a-4644-879c-35ca2ec34fb4', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Coaching en Anglais')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and ta.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and ta.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '874ade8e-d220-4c58-a68d-01dfe6ba1352', '93391309-ca65-466d-9e50-7cd4278dabe0', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'f0c3730e-c51c-4728-a4f3-8f98092020d9', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '46ba936c-67f9-4b91-b97f-b3ba6556612e', '93391309-ca65-466d-9e50-7cd4278dabe0', cs.id, 'UE-L1TC', 'UE Enseignements L1 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'e3941319-b2bd-494a-ba4d-edde05883c23', 'SUBJ-D80FA9B8', 'Coaching en Anglais', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Coaching en Anglais'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '41988a46-dad3-4611-bd6d-2d2b8bc95413', '93391309-ca65-466d-9e50-7cd4278dabe0', u.id, s.id, 'COACHINGE', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Coaching en Anglais')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '7d3f1d28-da6a-4bdf-a7f7-30cd8d2abb62', '530d7a73-4967-4715-a19d-42297d187bf0', '93391309-ca65-466d-9e50-7cd4278dabe0', 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c', 'a57723b6-675a-4644-879c-35ca2ec34fb4', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '93391309-ca65-466d-9e50-7cd4278dabe0' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Coaching en Anglais')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and ta.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and ta.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '4f3f6aae-a647-4ed8-9456-a6127dcbe143', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'defa8f48-d71c-4da8-9a33-92da945a3a98', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '3720bfc8-fc5a-410f-bd7c-f149281c6289', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, 'UE-L2IAGL', 'UE Enseignements L2 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '3e12c056-dd21-45fc-8134-300e37b31fca', 'SUBJ-60C22860', 'Coaching en Anglais', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Coaching en Anglais'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '3c7a4e3c-8b10-465f-91e7-219ae7887444', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', u.id, s.id, 'COACHINGE', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Coaching en Anglais')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'c6f9a5c1-bc94-4a09-92e8-d86fa4913228', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', '90e081d0-1e56-4e10-9dc7-7854f155f5ea', 'a57723b6-675a-4644-879c-35ca2ec34fb4', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Coaching en Anglais')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and ta.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and ta.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '13caebbb-a4be-4942-a189-5e545463498a', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '7b9f40f1-521a-4aaa-bea1-7dbbc5d285e0', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select 'd64bd41e-27c1-453f-9199-2fe31d9efe9c', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, 'UE-L2TC', 'UE Enseignements L2 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'df252dfe-a94c-431a-ae7a-48fce72d9fcb', 'SUBJ-73A063FA', 'Coaching en Anglais', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Coaching en Anglais'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '3f692bb3-5807-4ddd-bd71-bdd3f3a798ed', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', u.id, s.id, 'COACHINGE', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Coaching en Anglais')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'b981b259-2c6a-4cce-9b1d-c0234dc4cd4c', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a', 'a57723b6-675a-4644-879c-35ca2ec34fb4', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Coaching en Anglais')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and ta.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and ta.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '7f51580c-431e-4fcb-b212-28f40da10795', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'b72b12bc-5c38-4e5e-9ea7-6d7837435bd9', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select 'fb9eeb16-4cda-488f-8ce9-d1942df2d8a5', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, 'UE-L2TC', 'UE Enseignements L2 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'b0f6e3d1-94b0-4238-bb72-0093295d0b83', 'SUBJ-E6BF4793', 'E-commerce et référencement', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('E-commerce et référencement'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '6b1f6cd3-05f9-4114-b6f2-60d1adf009c9', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', u.id, s.id, 'ECOMMERCE', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('E-commerce et référencement')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '311381d4-5c0d-4164-83ad-a0d1e4c4d01a', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a', 'b206a2a4-5eee-43bc-9167-e45f044c9be7', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('E-commerce et référencement')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and ta.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and ta.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select 'e921038f-8b50-4ada-913c-a76736397df5', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '5fd83471-003f-4fd1-9a15-42a190c1c817', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '7b97e9ee-4bb5-4c1b-a5bd-b1370eee72b4', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, 'UE-L2TC', 'UE Enseignements L2 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'fa21a540-9039-4e12-a14b-999b155899fe', 'SUBJ-74688315', 'Technologie digital avancée', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Technologie digital avancée'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select 'fc7dc434-eac4-4c73-aaab-b89fa5563b0b', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', u.id, s.id, 'TECHNOLOGI', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Technologie digital avancée')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '45954fae-2455-4407-a162-73aaee79469d', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a', '5fe7e914-310a-4884-8db6-213b08fffc74', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Technologie digital avancée')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and ta.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and ta.teacher_id = '5fe7e914-310a-4884-8db6-213b08fffc74' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '44aeaccf-5027-43f2-9233-6d369da41b39', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '40cb7b43-77d7-424c-a581-1fc17c51a2ec', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select 'b31ea537-febc-4cb6-a56f-74eb1e48a1ac', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, 'UE-L2TC', 'UE Enseignements L2 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'ec47aedd-3818-4b71-a1c3-5df582e2f645', 'SUBJ-33D2E7E8', 'Digitalisation dans les secteurs clés du numérique', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Digitalisation dans les secteurs clés du numérique'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '242081af-2bf9-417c-9078-29b95f9184f0', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', u.id, s.id, 'DIGITALISA', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Digitalisation dans les secteurs clés du numérique')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'd47e72fe-c1bb-4ed5-91a6-f802d6331736', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a', 'b206a2a4-5eee-43bc-9167-e45f044c9be7', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Digitalisation dans les secteurs clés du numérique')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and ta.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and ta.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '69ad11f8-6e01-457e-ada7-dd4ebae60f95', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'a10d2575-4c08-425a-be51-7b5fcfa67076', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '6663ec2e-cc52-440f-ab98-04541853a3c4', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, 'UE-L2TC', 'UE Enseignements L2 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '38e8992d-7ca9-4e84-b7a0-a466f00a2eb1', 'SUBJ-D2075589', 'Analyse des coûts', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Analyse des coûts'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '63c4714f-a883-433e-82b5-d8e7027ed447', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', u.id, s.id, 'ANALYSEDE', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Analyse des coûts')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'c68ef42f-3bc2-43b4-95f4-a0e761a02a51', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a', '0273ddb3-2671-4dc8-b2ef-eefba8c5e98e', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Analyse des coûts')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and ta.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and ta.teacher_id = '0273ddb3-2671-4dc8-b2ef-eefba8c5e98e' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select 'fb0ae39d-196e-4c37-9f68-90c2e99e066c', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '20168840-5037-4516-96b2-558cb0974784', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '627a974b-f4a0-4fd8-8b7f-1f2e7b9d635e', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', cs.id, 'UE-L2TC', 'UE Enseignements L2 TC', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2TC');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'a651d73a-f1f3-48b9-aad3-63e0a61d58e1', 'SUBJ-01291E9F', 'Introduction au Management des Projets', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Introduction au Management des Projets'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select 'e963176c-8ebd-46ca-be09-1d94f4db2baf', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', u.id, s.id, 'INTRODUCTI', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Introduction au Management des Projets')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '8d4fa62a-2924-4100-95fb-a56e7f434b60', '76ee20bd-70b3-41e8-9dee-2caa965a7719', '84617c9c-feed-4cee-aa98-f1ae460cd6ab', '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a', 'b9d07b94-d806-476e-9f7b-ffb3cfb79ada', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '84617c9c-feed-4cee-aa98-f1ae460cd6ab' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Introduction au Management des Projets')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and ta.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and ta.teacher_id = 'b9d07b94-d806-476e-9f7b-ffb3cfb79ada' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select 'c233b6b1-ad4c-46f4-8e3f-a8a9edc47061', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'c21672d9-784e-4874-8b2d-d8804edfaa51', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '337ef3a3-bf5b-48e3-ad7d-981edd60e5f3', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, 'UE-L1IAGL', 'UE Enseignements L1 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '555c5c31-179a-4dea-babf-cda52bf48836', 'SUBJ-861A5957', 'Architecture & Technologie des Ordinateurs', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Architecture & Technologie des Ordinateurs'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '39647608-e985-4538-a8e4-0ff9c6371dff', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', u.id, s.id, 'ARCHITECTU', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Architecture & Technologie des Ordinateurs')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '82589f80-1398-4717-8879-800dae5ff838', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2', 'c2162ac7-de41-405b-855d-1857d2635920', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Architecture & Technologie des Ordinateurs')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and ta.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and ta.teacher_id = 'c2162ac7-de41-405b-855d-1857d2635920' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '0b68b893-d78e-4a9b-bdc2-c45320c23eb5', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '66ff50ed-e935-4e83-aeeb-4c21550f5b6b', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '014e7eb5-6a1d-477f-b672-570b03527319', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, 'UE-L1IAGL', 'UE Enseignements L1 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'e02cfa52-ffa1-45ec-9a77-e6a4c20717c6', 'SUBJ-06E4DC68', 'Théorie des Systèmes d’Exploitation', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Théorie des Systèmes d’Exploitation'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select 'c0f6b26d-b46c-43de-b87d-7f69ad219187', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', u.id, s.id, 'THORIEDE', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Théorie des Systèmes d’Exploitation')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'f8c572d5-c98f-48e4-9289-24b709aab5df', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2', 'bc99ed78-d94b-471b-853a-316b8ba7bba9', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Théorie des Systèmes d’Exploitation')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and ta.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and ta.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '72602f24-16bb-464a-bbbf-d4bd2e9430a0', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 1, 'Semestre 1', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and position = 1);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '20b8679d-5e08-4029-a9b6-fcb006122e36', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select 'ab82c3ec-6af6-47e5-acb5-4009c1af4984', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', cs.id, 'UE-L1IAGL', 'UE Enseignements L1 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L1IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '8fe1ac32-9b3d-49b0-a7f3-8efdc9f49b35', 'SUBJ-8A7B14F3', 'Calcul différentiel dans IR', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Calcul différentiel dans IR'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '4a044bdd-f648-486a-b33e-62ce5e05e59a', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', u.id, s.id, 'CALCULDIF', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cs.position = 1
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Calcul différentiel dans IR')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'eff19a1b-9f86-42ae-b168-bc6426835f54', '061c059b-0b18-42c4-bbe8-dd2094e16d09', 'fe20cf76-b8ba-4cd1-bd85-874b6a771158', 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2', '5c166ca4-2df9-4d9a-96f9-7a788bc7de95', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = 'fe20cf76-b8ba-4cd1-bd85-874b6a771158' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Calcul différentiel dans IR')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and ta.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and ta.teacher_id = '5c166ca4-2df9-4d9a-96f9-7a788bc7de95' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '1f15f07c-4133-43a4-b638-9c3dae4ec6be', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'b8d0e66c-c70b-4475-bde7-f78e2dec53b7', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select 'd5737a74-ef94-4114-9275-9fdf3acba1b5', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, 'UE-L2IAGL', 'UE Enseignements L2 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '7c616b92-91d8-467e-9c62-c415cbb859f0', 'SUBJ-F327D524', 'Administration Système : Windows & Linux', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Administration Système : Windows & Linux'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '9bddfccd-e412-46dc-af20-918517d24325', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', u.id, s.id, 'ADMINISTRA', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Administration Système : Windows & Linux')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '3e189d64-334c-4f71-91f5-bfc2ca43c094', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', '90e081d0-1e56-4e10-9dc7-7854f155f5ea', 'bc99ed78-d94b-471b-853a-316b8ba7bba9', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Administration Système : Windows & Linux')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and ta.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and ta.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '62c2cfdd-6c42-4b41-b791-c92f6a33d34e', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '30abc10a-4391-4617-b1c8-ced5e155580c', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '8c287960-9b28-47fb-a121-f746cdc1d0ac', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, 'UE-L2IAGL', 'UE Enseignements L2 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '2ff7a9db-a8e4-48a4-aa88-dd04e1ecbf65', 'SUBJ-97F076EB', 'Economie d’Entreprise', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Economie d’Entreprise'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '5d008c83-53bc-4140-9b80-62f3622761a8', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', u.id, s.id, 'ECONOMIED', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Economie d’Entreprise')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'acdc0cb2-d431-4d6f-a3da-ea42e581565a', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', '90e081d0-1e56-4e10-9dc7-7854f155f5ea', '41a56262-2a82-480a-8303-2baf69b64342', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Economie d’Entreprise')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and ta.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and ta.teacher_id = '41a56262-2a82-480a-8303-2baf69b64342' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select 'c2d6c613-6b53-4a83-9165-7340cf55a170', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '0cf79398-347b-41ea-b263-cf82f1040462', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select 'e74bec29-aeb5-4878-bf1a-d8d0feec59e2', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, 'UE-L2IAGL', 'UE Enseignements L2 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select 'c679d00d-13fe-458d-bbe4-4a6b6378df83', 'SUBJ-B26F286C', 'Théorie des Systèmes d’exploitation', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Théorie des Systèmes d’exploitation'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '1644682f-20d2-435b-bf10-27a07868388e', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', u.id, s.id, 'THORIEDE', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Théorie des Systèmes d’exploitation')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'b536c8c0-01d9-4fb7-888a-ebadd257acfa', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', '90e081d0-1e56-4e10-9dc7-7854f155f5ea', 'bc99ed78-d94b-471b-853a-316b8ba7bba9', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Théorie des Systèmes d’exploitation')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and ta.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and ta.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select 'adc6b1e1-00dc-4dee-856a-8a5dcbadb5de', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'f0a71622-f8ad-4339-b282-5c8f14090890', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '028c3478-de4b-40ce-a83b-70dea7d4b700', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, 'UE-L2IAGL', 'UE Enseignements L2 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '5aa66f43-16fc-4ca5-91ce-8e34f6ef54a3', 'SUBJ-45462E97', 'Statistiques Inférentielles (Décisionnelle)', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Statistiques Inférentielles (Décisionnelle)'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '639306a0-bd1c-469b-810b-5bda47dea889', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', u.id, s.id, 'STATISTIQU', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Statistiques Inférentielles (Décisionnelle)')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select 'b690254f-0d2d-467e-be6f-f986d8a96d3a', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', '90e081d0-1e56-4e10-9dc7-7854f155f5ea', 'f9309e77-9a9a-4d78-971e-e655cdbb2f17', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Statistiques Inférentielles (Décisionnelle)')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and ta.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and ta.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '0432617d-2652-48bc-8282-b8d011d13924', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select '6d834c63-dc02-4dc9-96e1-801920ccf761', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select '9fe86983-f6a6-4e12-a326-375112ae9301', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, 'UE-L2IAGL', 'UE Enseignements L2 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '15f7563f-8fe7-4675-9b38-88435d3b876b', 'SUBJ-0CB9AE65', 'Architecture & Fonctionnement des Réseaux Informatiques', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Architecture & Fonctionnement des Réseaux Informatiques'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '9d3695bd-dc7b-4674-9e13-55cfa328e52f', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', u.id, s.id, 'ARCHITECTU', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Architecture & Fonctionnement des Réseaux Informatiques')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '0186f2fd-e2de-44b7-a555-badeb2f0a340', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', '90e081d0-1e56-4e10-9dc7-7854f155f5ea', 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Architecture & Fonctionnement des Réseaux Informatiques')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and ta.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and ta.teacher_id = 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1' and ta.component_id = c.id);


insert into escen.curriculum_semesters (id, curriculum_id, position, name, target_credits, reason)
select '9ba345eb-f297-4081-ac87-7fed996e73cc', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', 3, 'Semestre 3', 30, 'Semestre planning'
where not exists (select 1 from escen.curriculum_semesters where curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and position = 3);

insert into escen.offering_semesters (id, offering_id, curriculum_id, curriculum_semester_id, starts_on, ends_on)
select 'a2825da3-2e12-44b0-ab90-e3e674cca3ae', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, '2026-10-12', '2027-06-30'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.offering_semesters os where os.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and os.curriculum_semester_id = cs.id);


insert into escen.teaching_units (id, curriculum_id, semester_id, code, name, credits, reason)
select 'd7410006-8b98-4001-8f93-7a1cc0d61066', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', cs.id, 'UE-L2IAGL', 'UE Enseignements L2 IA & GL', 30, 'UE planning'
from escen.curriculum_semesters cs
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and not exists (select 1 from escen.teaching_units u where u.semester_id = cs.id and u.code = 'UE-L2IAGL');

insert into escen.subjects (id, code, name, academic_year_id, reason)
select '0d9455e3-480c-4180-8a73-57884a07bdf2', 'SUBJ-D3BC8C98', 'Modélisation UML', 'cbd8ee33-b322-43b2-9876-99636e5891d8', 'Matière planning'
where not exists (select 1 from escen.subjects where academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(name) = upper('Modélisation UML'));

insert into escen.curriculum_components (id, curriculum_id, unit_id, subject_id, code, coefficient, credits, reason)
select '76ae2a17-2212-4f4c-bdeb-df256e390fdf', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', u.id, s.id, 'MODLISATI', 1, 3, 'Composant planning'
from escen.teaching_units u
join escen.curriculum_semesters cs on cs.id = u.semester_id
cross join escen.subjects s
where cs.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cs.position = 3
  and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Modélisation UML')
  and not exists (select 1 from escen.curriculum_components cc where cc.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and cc.subject_id = s.id);

insert into escen.teaching_assignments (id, offering_id, curriculum_id, group_id, teacher_id, component_id, valid_from, valid_until, reason)
select '4c5b03b3-c8b1-477c-b09a-d2ba8c59369e', 'fd516b84-9f6c-4115-88ce-541e9892d457', '217d1a1d-83f0-4aa4-ae58-af7ccced1776', '90e081d0-1e56-4e10-9dc7-7854f155f5ea', 'a4b248f5-85cb-46d7-85b7-b6f1a979ce12', c.id, '2026-10-12', '2027-06-30', 'Affectation planning'
from escen.curriculum_components c
join escen.subjects s on s.id = c.subject_id
where c.curriculum_id = '217d1a1d-83f0-4aa4-ae58-af7ccced1776' and s.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8' and upper(s.name) = upper('Modélisation UML')
  and not exists (select 1 from escen.teaching_assignments ta where ta.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and ta.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and ta.teacher_id = 'a4b248f5-85cb-46d7-85b7-b6f1a979ce12' and ta.component_id = c.id);



insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '3972c55a-eb32-4fee-801a-addfdd4b8989', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-19T07:30:00Z', '2026-10-19T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select 'a2475366-d81e-4221-9c64-22271dcfc5a8', '3972c55a-eb32-4fee-801a-addfdd4b8989', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '27f019ef-c77b-4bcd-8f0d-7f4da3229172', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-26T07:30:00Z', '2026-10-26T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select 'b09dd8e6-e10e-4690-a749-00df6553ed2e', '27f019ef-c77b-4bcd-8f0d-7f4da3229172', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '672e5243-e94e-45f1-901c-f31cb566e068', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-20T07:30:00Z', '2026-10-20T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '6454481f-e273-42d0-8b02-b1af3c84a4b6', '672e5243-e94e-45f1-901c-f31cb566e068', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '45aa4bb0-e95c-4b94-805b-43591cde4996', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-27T07:30:00Z', '2026-10-27T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '3d48dbd1-8134-406a-a1a2-a752ec050b10', '45aa4bb0-e95c-4b94-805b-43591cde4996', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'c4390ba9-d772-49be-a6b9-13ab290d0365', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-21T07:30:00Z', '2026-10-21T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'd18207a7-785f-4e98-bb58-eb3904c8bf96'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'd665b7ea-4436-4f5c-bb54-efdf5d03dd37', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-28T07:30:00Z', '2026-10-28T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'd18207a7-785f-4e98-bb58-eb3904c8bf96'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '0577e4d9-70a6-486b-9976-b9f8b22acb06', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-22T07:30:00Z', '2026-10-22T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '28dc6fc9-a832-486e-86ed-cffd7e534296', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-29T07:30:00Z', '2026-10-29T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'a365411e-638c-451d-a233-c4fbd1cdea13', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-23T07:30:00Z', '2026-10-23T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '11c38de3-4015-48d1-a85a-5403a55b8927', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-30T07:30:00Z', '2026-10-30T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '200c8c21-db64-489b-938c-ed467bc88c27', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-19T09:45:00Z', '2026-10-19T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '2cee7282-b8b0-41a2-9e1e-f53aee586145', '200c8c21-db64-489b-938c-ed467bc88c27', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'd6978ebb-f6a1-4ade-9cad-f770cd10f2bb', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-26T09:45:00Z', '2026-10-26T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select 'af762a0c-5279-429b-8524-c1d27935bf21', 'd6978ebb-f6a1-4ade-9cad-f770cd10f2bb', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '08c1d102-7d08-4228-b69f-ff88fc26e92a', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-20T09:45:00Z', '2026-10-20T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select 'a9225dfd-ff5a-4e8d-a75b-a8fa822df98b', '08c1d102-7d08-4228-b69f-ff88fc26e92a', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'b3e2e37e-9247-4d3a-9618-be77faa45e62', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-27T09:45:00Z', '2026-10-27T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '4b7d4692-83c7-40ad-8701-09e1dcb75ff4', 'b3e2e37e-9247-4d3a-9618-be77faa45e62', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'cfb0a0fd-6941-4d66-aa02-e418841776d0', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-21T09:45:00Z', '2026-10-21T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'd18207a7-785f-4e98-bb58-eb3904c8bf96'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '2253b682-532e-4a02-aff2-3f3b6ed56ed7', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-28T09:45:00Z', '2026-10-28T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'd18207a7-785f-4e98-bb58-eb3904c8bf96'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'be8288e2-748c-4310-b1c2-8d0c811ba592', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-22T09:45:00Z', '2026-10-22T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '2026e986-c6cf-44cc-bf94-4cea932708d5', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-29T09:45:00Z', '2026-10-29T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '9e29563d-8d24-4081-b069-5e4cc1071fe1', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-23T09:45:00Z', '2026-10-23T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '4946a926-6b18-4fe9-a31a-3f2681016b25', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-30T09:45:00Z', '2026-10-30T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '0d531c5f-d72a-4547-ae3e-958d1118fe4e', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-19T12:30:00Z', '2026-10-19T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '6dadbcfd-c785-4734-bddd-acd1b6092b1d', '0d531c5f-d72a-4547-ae3e-958d1118fe4e', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '9aaa9dd9-6843-4a32-a111-93b770f3cc18', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-26T12:30:00Z', '2026-10-26T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '95017274-6eee-41a2-980f-ca9dfecd85bd', '9aaa9dd9-6843-4a32-a111-93b770f3cc18', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'e1f26bd2-3b11-406c-9709-e96b64f4b8c0'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'cb091382-17e2-434a-bec1-cfe8c594f9c4', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-20T12:30:00Z', '2026-10-20T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = '63db263a-fc62-4c68-84c1-6d9a3ef9d160'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'b8e4bf01-d62d-446a-9aa8-d96df4e1011b', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-27T12:30:00Z', '2026-10-27T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = '63db263a-fc62-4c68-84c1-6d9a3ef9d160'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '975f414a-8c70-4cfe-a9e0-d87be955177b', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-21T12:30:00Z', '2026-10-21T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select 'bf0381b2-a4c4-4e45-b673-d3a1ad0737a8', '975f414a-8c70-4cfe-a9e0-d87be955177b', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'c7bbcc19-54b9-4020-83a1-f27b7e6d2b91', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-28T12:30:00Z', '2026-10-28T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '5e657914-5222-450c-aea6-ae611dd9da48', 'c7bbcc19-54b9-4020-83a1-f27b7e6d2b91', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '00c67e2d-5c7d-482f-b96b-32e1793b48fd', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-22T12:30:00Z', '2026-10-22T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '0cbb7a87-db08-4f87-b267-c60b3eedd81e', '00c67e2d-5c7d-482f-b96b-32e1793b48fd', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'e6f4152f-4c51-4990-a207-624c58228d3b', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-29T12:30:00Z', '2026-10-29T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '82efeff3-0615-4849-88e9-42eff3195943', 'e6f4152f-4c51-4990-a207-624c58228d3b', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '1548c5c3-a9ef-4b2e-855e-aa40594acb83', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-23T12:30:00Z', '2026-10-23T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = '63db263a-fc62-4c68-84c1-6d9a3ef9d160'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ab89b0da-bb40-4191-a70f-e79c2133d688', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-30T12:30:00Z', '2026-10-30T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 TC'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = '63db263a-fc62-4c68-84c1-6d9a3ef9d160'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '4366486e-f497-4efd-8b9f-a8a7a92e55d8', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-19T15:00:00Z', '2026-10-19T17:00:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC + L2 IA & GL + L2 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select 'cdb4837b-caed-479f-8061-6a05b3eb56e2', '4366486e-f497-4efd-8b9f-a8a7a92e55d8', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '7d93eacc-df7b-4063-b128-0c7cf2939314', '4366486e-f497-4efd-8b9f-a8a7a92e55d8', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '00e1da0a-1774-4847-984a-9d2e5a3ffa22', '4366486e-f497-4efd-8b9f-a8a7a92e55d8', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'e0718396-ae0f-4de6-b914-b78216ee1ac3', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-26T15:00:00Z', '2026-10-26T17:00:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '4e47e66d-95e0-4d9a-a8e6-9bf3ef5713eb', 'e0718396-ae0f-4de6-b914-b78216ee1ac3', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ec0d1c54-878f-4391-ad91-32980c292f96', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-20T15:00:00Z', '2026-10-20T17:00:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC + L2 IA & GL + L2 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '692fe31b-8075-4a2c-8f41-a77cf17fa6e9', 'ec0d1c54-878f-4391-ad91-32980c292f96', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select 'aba1ac73-b9cd-4c33-80b7-71e40f93698e', 'ec0d1c54-878f-4391-ad91-32980c292f96', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '7deb0f8c-a50b-4147-b1b4-dfab3fd4b878', 'ec0d1c54-878f-4391-ad91-32980c292f96', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '533ff2ec-084c-4038-ba42-1aa0216e4655', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-27T15:00:00Z', '2026-10-27T17:00:00Z', 'COURS', 'PLANIFIE', 'Cours commun L1 IA & GL + L1 TC'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select 'e4599065-6faf-4faf-9ee6-8b27c65bfbce', '533ff2ec-084c-4038-ba42-1aa0216e4655', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '530d7a73-4967-4715-a19d-42297d187bf0' and a.group_id = 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'b3d2670a-6973-4744-8165-07832b1a87f1', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-12T07:30:00Z', '2026-10-12T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'd75da582-feaf-4d23-8c03-a2684aee50de', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-19T07:30:00Z', '2026-10-19T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'a7a4c418-325b-4c27-ae3c-12e9a34bddca', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-13T07:30:00Z', '2026-10-13T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '00b4cfec-2b16-4973-9139-295ebdd80ca0', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-20T07:30:00Z', '2026-10-20T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '05359ffb-829f-4e48-ab45-3f6a9521f5f7', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-14T07:30:00Z', '2026-10-14T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '0bb589b7-cecd-44aa-adee-7fd8a295b01b', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-21T07:30:00Z', '2026-10-21T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'c49630ed-c11a-4a95-870c-2e830df2a7f8', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-15T07:30:00Z', '2026-10-15T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = '5fe7e914-310a-4884-8db6-213b08fffc74'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '71bb2d35-99cf-4f5f-99a3-6ed7da31e69a', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-22T07:30:00Z', '2026-10-22T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = '5fe7e914-310a-4884-8db6-213b08fffc74'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '99b8161f-1a3a-4810-8f63-ab5e18345d90', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-16T07:30:00Z', '2026-10-16T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = '5fe7e914-310a-4884-8db6-213b08fffc74'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ba58f9d1-9788-4396-9d12-0f6ee2a1e9af', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-23T07:30:00Z', '2026-10-23T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = '5fe7e914-310a-4884-8db6-213b08fffc74'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '2de3d42e-3647-4047-87dd-94b9730f6fb9', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-17T07:30:00Z', '2026-10-17T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'c1aaca4d-44c3-4366-b821-ccad9f9ea941', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-24T07:30:00Z', '2026-10-24T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'c4fbc2a2-5cbd-4b14-8380-b488567fd710', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-12T10:00:00Z', '2026-10-12T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '065c947d-c597-4b4d-8748-50bcdcdde236', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-19T10:00:00Z', '2026-10-19T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ce7fa381-8f25-47a0-88ea-a89cd8df464e', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-13T10:00:00Z', '2026-10-13T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'bdb63219-4ab9-480c-9895-8acd5385deac', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-20T10:00:00Z', '2026-10-20T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'dc6bd650-b745-4a55-a110-bb745b54776a', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-14T10:00:00Z', '2026-10-14T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'b03a996d-0b9f-4593-a445-8c64401afc23', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-21T10:00:00Z', '2026-10-21T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '85360888-32a5-491a-8e68-d0192e32445a', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-15T10:00:00Z', '2026-10-15T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = '5fe7e914-310a-4884-8db6-213b08fffc74'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '9050838e-41b6-4e4b-b7aa-2ec0b7587ded', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-22T10:00:00Z', '2026-10-22T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = '5fe7e914-310a-4884-8db6-213b08fffc74'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '153df676-9804-4590-a012-345bacd9b8c5', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-16T10:00:00Z', '2026-10-16T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = '5fe7e914-310a-4884-8db6-213b08fffc74'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'f08c7af0-044f-462d-b64e-cbc0530c369e', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-23T10:00:00Z', '2026-10-23T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = '5fe7e914-310a-4884-8db6-213b08fffc74'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '8172764e-0b50-44bf-ad6d-d662b4abe1a8', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-17T10:00:00Z', '2026-10-17T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '83aee2d3-ab55-4df3-93d1-b305b29d776c', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-24T10:00:00Z', '2026-10-24T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b206a2a4-5eee-43bc-9167-e45f044c9be7'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '973961eb-a490-42a4-b0cf-6d8f0c12df6b', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-13T12:30:00Z', '2026-10-13T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = '0273ddb3-2671-4dc8-b2ef-eefba8c5e98e'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '9d0d07c4-8ed1-47a8-9bfe-083c0fb68a19', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-20T12:30:00Z', '2026-10-20T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = '0273ddb3-2671-4dc8-b2ef-eefba8c5e98e'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '4613a6b7-b5c9-4b72-bd20-af5052271898', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-14T12:30:00Z', '2026-10-14T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b9d07b94-d806-476e-9f7b-ffb3cfb79ada'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ab0ea806-d083-470d-8df0-735de0aeac24', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-21T12:30:00Z', '2026-10-21T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b9d07b94-d806-476e-9f7b-ffb3cfb79ada'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '203bec8c-0cb2-455f-84fd-f024ecb7c1df', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-15T12:30:00Z', '2026-10-15T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b9d07b94-d806-476e-9f7b-ffb3cfb79ada'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ed6caf10-c8ea-464c-bf6d-5a66ffe7ff38', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-22T12:30:00Z', '2026-10-22T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b9d07b94-d806-476e-9f7b-ffb3cfb79ada'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '178b2328-dc5e-433a-9777-45e05071e0d8', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-16T12:30:00Z', '2026-10-16T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b9d07b94-d806-476e-9f7b-ffb3cfb79ada'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'c51891a0-02b5-4f0c-aee3-dc3af31b4be9', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L2'), '2026-10-23T12:30:00Z', '2026-10-23T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 TC'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'b9d07b94-d806-476e-9f7b-ffb3cfb79ada'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '480bc5d1-9943-4953-bfea-f55f1b9a619b', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-12T15:00:00Z', '2026-10-12T17:00:00Z', 'COURS', 'PLANIFIE', 'Cours commun L2 IA & GL + L2 TC'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '9268f4da-32e7-45d7-83b8-3cf1e984eff0', '480bc5d1-9943-4953-bfea-f55f1b9a619b', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '6c28d86f-2279-42eb-8e4b-10bbd50ca9c0', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle des L1'), '2026-10-13T15:00:00Z', '2026-10-13T17:00:00Z', 'COURS', 'PLANIFIE', 'Cours commun L2 IA & GL + L2 TC'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.session_participants (id, session_id, assignment_id, offering_id, group_id, teacher_id, reason)
select '35ef33d3-d77d-41e2-849c-c1cefcd5d1b5', '6c28d86f-2279-42eb-8e4b-10bbd50ca9c0', a.id, a.offering_id, a.group_id, a.teacher_id, 'Participation cours commun'
from escen.teaching_assignments a
where a.offering_id = '76ee20bd-70b3-41e8-9dee-2caa965a7719' and a.group_id = '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a' and a.teacher_id = 'a57723b6-675a-4644-879c-35ca2ec34fb4'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '8bae652c-efe9-4d3c-9aac-b8c0f3c13354', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-21T07:30:00Z', '2026-10-21T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'c2162ac7-de41-405b-855d-1857d2635920'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '8645c91f-6046-4e76-9acd-cce0e59e73df', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-28T07:30:00Z', '2026-10-28T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'c2162ac7-de41-405b-855d-1857d2635920'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '9b5b7d04-b1ae-4d00-8695-6be41327290c', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-22T07:30:00Z', '2026-10-22T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '074e25ef-b6a3-4dba-aefe-99ed379bf3b7', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-29T07:30:00Z', '2026-10-29T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'cb00a2cf-9c4a-425e-a514-c5b3edfdb64a', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-21T09:45:00Z', '2026-10-21T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'c2162ac7-de41-405b-855d-1857d2635920'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '56ed64dc-f1eb-4c6f-ad3d-c501f8160b6e', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-28T09:45:00Z', '2026-10-28T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'c2162ac7-de41-405b-855d-1857d2635920'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ee982abd-aaab-4866-828e-fe04c2d62a04', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-22T09:45:00Z', '2026-10-22T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '810da0fa-0f0c-4c6d-9038-7d8017e37841', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-29T09:45:00Z', '2026-10-29T11:45:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '48ae8dc6-3b69-4221-9f23-a91898dfbffb', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-20T12:30:00Z', '2026-10-20T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = '5c166ca4-2df9-4d9a-96f9-7a788bc7de95'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '8f623bf6-c5c0-4aa6-b9d6-39af445e69bc', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-27T12:30:00Z', '2026-10-27T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = '5c166ca4-2df9-4d9a-96f9-7a788bc7de95'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'd9cbaac8-b7c3-4e16-bb46-3a8cc3c2c6e2', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-23T12:30:00Z', '2026-10-23T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = '5c166ca4-2df9-4d9a-96f9-7a788bc7de95'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '8788b934-4e56-4596-95a4-560e9135c0aa', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 1'), '2026-10-30T12:30:00Z', '2026-10-30T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L1 IA & GL'
from escen.teaching_assignments a
where a.offering_id = '061c059b-0b18-42c4-bbe8-dd2094e16d09' and a.group_id = 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2' and a.teacher_id = '5c166ca4-2df9-4d9a-96f9-7a788bc7de95'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '9d8640fb-859f-4f3b-9b42-80aedcf81bb8', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-12T07:30:00Z', '2026-10-12T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '93fe95e9-845f-4549-8b2b-cc27c509df2a', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-19T07:30:00Z', '2026-10-19T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '5add0971-b788-45fc-bbc5-e322c2c4c314', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-13T07:30:00Z', '2026-10-13T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = '41a56262-2a82-480a-8303-2baf69b64342'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '132b730d-f81e-46ff-8143-78e62476df06', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-20T07:30:00Z', '2026-10-20T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = '41a56262-2a82-480a-8303-2baf69b64342'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '6e787f9a-1417-4c38-940f-6c6c281f5cc3', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-14T07:30:00Z', '2026-10-14T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '5470c264-b5ab-4532-a0f2-ae7064f4d1c4', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-21T07:30:00Z', '2026-10-21T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '29630c49-7ee4-4748-a4a4-d2cc2bf4ac85', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-15T07:30:00Z', '2026-10-15T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = '41a56262-2a82-480a-8303-2baf69b64342'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ffaa05d8-dc4e-4ebc-bf5c-a38dec4775c1', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-22T07:30:00Z', '2026-10-22T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = '41a56262-2a82-480a-8303-2baf69b64342'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'e9ca0f0b-0eb5-4a44-8268-49c3e3225365', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-16T07:30:00Z', '2026-10-16T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '68e9391c-ca06-4bcd-9676-19b53ece2638', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-23T07:30:00Z', '2026-10-23T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '3cb63085-cf8d-45c3-860f-2a30f3a1731e', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-17T07:30:00Z', '2026-10-17T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '1c0e9a3c-0172-4f56-8756-461f69c53eb8', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-24T07:30:00Z', '2026-10-24T09:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'eaf1d865-47b2-44ef-845e-dfe7e1bb023a', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-12T10:00:00Z', '2026-10-12T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'f29b4208-b5e4-4349-80e5-9cad47d6cba5', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-19T10:00:00Z', '2026-10-19T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '5c2b836b-4d35-4fdc-b584-92c8e77f6726', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-13T10:00:00Z', '2026-10-13T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '0e85effa-c883-4662-a451-49c4aaef76a1', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-20T10:00:00Z', '2026-10-20T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ae543d17-92b3-45e9-9e16-0539dc2bb5c9', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-14T10:00:00Z', '2026-10-14T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '896352ff-6be3-4cf7-a1f3-3cf03c16bfcb', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-21T10:00:00Z', '2026-10-21T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'adfc44bc-3b57-44c8-ae80-2617dadd8c98', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-15T10:00:00Z', '2026-10-15T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '848cb1e1-6bc1-4c6f-8ca0-0113e7fb14b6', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-22T10:00:00Z', '2026-10-22T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '91cfda55-402a-4ed4-99c1-bbf1abd896cf', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-16T10:00:00Z', '2026-10-16T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'a4360e34-bd01-4cb3-bb4d-6d99a931719e', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-23T10:00:00Z', '2026-10-23T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'bc99ed78-d94b-471b-853a-316b8ba7bba9'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ba9d76fc-e69f-452f-8948-8bffd4b11a59', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-17T10:00:00Z', '2026-10-17T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '70c2bc9e-c5c7-49b7-899f-d7a2f63dd892', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-24T10:00:00Z', '2026-10-24T12:00:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'f9309e77-9a9a-4d78-971e-e655cdbb2f17'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '4092a30c-f801-4c28-84e5-cd54968345dd', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-12T12:30:00Z', '2026-10-12T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'a4b248f5-85cb-46d7-85b7-b6f1a979ce12'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'b223bf3b-7b33-4eed-a69f-2d9a10d88e8e', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-19T12:30:00Z', '2026-10-19T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'a4b248f5-85cb-46d7-85b7-b6f1a979ce12'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '1027befe-4e38-438a-95fa-915a309e9677', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-13T12:30:00Z', '2026-10-13T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '6cfaa2f4-8183-4688-9898-04db7558c71c', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-20T12:30:00Z', '2026-10-20T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '35edfdf7-c2a8-48cb-81a2-20e6f34209a0', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-14T12:30:00Z', '2026-10-14T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'a4b248f5-85cb-46d7-85b7-b6f1a979ce12'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ef080fa2-741e-47e8-921e-8efb78efb393', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-21T12:30:00Z', '2026-10-21T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'a4b248f5-85cb-46d7-85b7-b6f1a979ce12'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'e314db00-f197-4a71-93c4-d4d2840ac945', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-15T12:30:00Z', '2026-10-15T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select '40cad8c5-1775-4c34-8378-e680b76b03d9', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-22T12:30:00Z', '2026-10-22T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'e0da09ed-324a-4f6c-9a5c-65f56786d1b1'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ce56d590-3f57-43fa-afb1-434b691c5518', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-16T12:30:00Z', '2026-10-16T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'a4b248f5-85cb-46d7-85b7-b6f1a979ce12'
limit 1;


insert into escen.sessions (id, assignment_id, offering_id, group_id, teacher_id, room_id, starts_at, ends_at, mode, status, reason)
select 'ea685635-5a9d-4a2a-b265-f05a3cb4540a', a.id, a.offering_id, a.group_id, a.teacher_id, (select id from escen.rooms where name = 'Salle IA 2'), '2026-10-23T12:30:00Z', '2026-10-23T14:30:00Z', 'COURS', 'PLANIFIE', 'Cours L2 IA & GL'
from escen.teaching_assignments a
where a.offering_id = 'fd516b84-9f6c-4115-88ce-541e9892d457' and a.group_id = '90e081d0-1e56-4e10-9dc7-7854f155f5ea' and a.teacher_id = 'a4b248f5-85cb-46d7-85b7-b6f1a979ce12'
limit 1;

end $$;

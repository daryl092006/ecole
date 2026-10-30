-- Migration : Suppression des étudiants de test 147-ESC-2026 et 148-ESC-2026
alter table escen.online_applications disable trigger no_delete;
alter table escen.enrollments disable trigger no_delete;
alter table escen.enrollment_groups disable trigger no_delete;
alter table escen.students disable trigger no_delete;
alter table escen.people disable trigger no_delete;

select set_config('escen.application_command', '1', true);

-- 1. Supprimer les affectations de groupe
delete from escen.enrollment_groups
where enrollment_id in (
  select e.id from escen.enrollments e
  join escen.students s on s.id = e.student_id
  where s.matricule in ('147-ESC-2026', '148-ESC-2026')
);

-- 2. Supprimer les inscriptions
delete from escen.enrollments
where student_id in (
  select id from escen.students where matricule in ('147-ESC-2026', '148-ESC-2026')
);

-- 3. Supprimer les candidatures associées si existantes
delete from escen.online_applications
where student_id in (
  select id from escen.students where matricule in ('147-ESC-2026', '148-ESC-2026')
);

-- 4. Supprimer les étudiants
delete from escen.students
where matricule in ('147-ESC-2026', '148-ESC-2026');

-- 5. Supprimer les personnes de test
delete from escen.people
where email in ('testeurdeux@test.com', 'testdeux@gmail.com')
   or (firstname in ('Utilisateurdeux', 'testteurDEUX') and lastname in ('Test', 'Testeur Tes'));

-- Réactiver les triggers
alter table escen.people enable trigger no_delete;
alter table escen.students enable trigger no_delete;
alter table escen.enrollment_groups enable trigger no_delete;
alter table escen.enrollments enable trigger no_delete;
alter table escen.online_applications enable trigger no_delete;

-- Migration 202610300069_delete_duplicate_bolouvi_155.sql
-- Suppression du doublon 155-ESC-2026 (Emmanuel Yanis Alvin BOLOUVI, alvinbolouvi3@gmail.com)
-- Conservation du dossier officiel 152-ESC-2026 (alvinbolouvi4@icloud.com)

alter table escen.online_applications disable trigger no_delete;
alter table escen.application_documents disable trigger no_delete;
alter table escen.enrollment_groups disable trigger no_delete;
alter table escen.enrollments disable trigger no_delete;
alter table escen.role_grants disable trigger no_delete;
alter table escen.accounts disable trigger no_delete;
alter table escen.students disable trigger no_delete;
alter table escen.people disable trigger no_delete;

select set_config('escen.application_command', '1', true);

-- 1. Supprimer l'affectation de groupe du doublon 155-ESC-2026
delete from escen.enrollment_groups
where enrollment_id in (
  select e.id from escen.enrollments e
  join escen.students s on s.id = e.student_id
  where s.matricule = '155-ESC-2026'
);

-- 2. Supprimer l'inscription du doublon 155-ESC-2026
delete from escen.enrollments
where student_id in (
  select id from escen.students where matricule = '155-ESC-2026'
);

-- 3. Supprimer les documents et accès de la candidature doublon
delete from escen.application_documents
where application_id in (
  select id from escen.online_applications
  where student_id in (select id from escen.students where matricule = '155-ESC-2026')
);

delete from escen_private.application_access
where id in (
  select id from escen.online_applications
  where student_id in (select id from escen.students where matricule = '155-ESC-2026')
);

-- 4. Supprimer la candidature doublon (LEGACY-2026-2027-150)
delete from escen.online_applications
where student_id in (
  select id from escen.students where matricule = '155-ESC-2026'
);

-- 5. Supprimer les rôles accordés au compte doublon
delete from escen.role_grants
where account_id in (
  select a.id from escen.accounts a
  join escen.people p on p.id = a.person_id
  join escen.students s on s.person_id = p.id
  where s.matricule = '155-ESC-2026'
);

-- 6. Supprimer le compte portail doublon
delete from escen.accounts
where person_id in (
  select person_id from escen.students where matricule = '155-ESC-2026'
);

-- 7. Supprimer l'étudiant doublon
delete from escen.students
where matricule = '155-ESC-2026';

-- 8. Supprimer l'identité personne doublon (alvinbolouvi3@gmail.com)
delete from escen.people
where email = 'alvinbolouvi3@gmail.com';

-- Réactiver les triggers
alter table escen.people enable trigger no_delete;
alter table escen.students enable trigger no_delete;
alter table escen.accounts enable trigger no_delete;
alter table escen.role_grants enable trigger no_delete;
alter table escen.enrollments enable trigger no_delete;
alter table escen.enrollment_groups enable trigger no_delete;
alter table escen.application_documents enable trigger no_delete;
alter table escen.online_applications enable trigger no_delete;

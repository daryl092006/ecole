-- Migration : Suppression des étudiants et candidatures de test 149-ESC-2026 et 144-ESC-2026
alter table escen.online_applications disable trigger no_delete;
alter table escen.enrollments disable trigger no_delete;
alter table escen.role_grants disable trigger no_delete;
alter table escen.accounts disable trigger no_delete;
alter table escen.students disable trigger no_delete;
alter table escen.people disable trigger no_delete;

-- 1. Autoriser les mutations sur online_applications
select set_config('escen.application_command', '1', true);

-- 2. Supprimer les candidatures de test associées
delete from escen.online_applications
where reference in ('LEGACY-2026-2027-114', 'LEGACY-2026-2027-121')
   or student_id in ('329c98d8-49df-453a-8e9b-14309408dde6', '0ddee1ea-f753-5c17-9935-32b75e3d062a')
   or legacy_student_id in ('329c98d8-49df-453a-8e9b-14309408dde6', '0ddee1ea-f753-5c17-9935-32b75e3d062a');

-- 3. Supprimer les inscriptions 2026-2027
delete from escen.enrollments
where student_id in ('329c98d8-49df-453a-8e9b-14309408dde6', '0ddee1ea-f753-5c17-9935-32b75e3d062a');

-- 4. Supprimer les rôles et comptes de test
delete from escen.role_grants
where account_id = '924933ca-aca2-59d3-ad2e-5176af641b12';

delete from escen.accounts
where id = '924933ca-aca2-59d3-ad2e-5176af641b12'
   or person_id in ('e1988277-7fc1-4298-963c-bee625004b18', '0ddee1ea-f753-5c17-9935-32b75e3d062a');

-- 5. Supprimer les fiches étudiants
delete from escen.students
where matricule in ('149-ESC-2026', '144-ESC-2026')
   or id in ('329c98d8-49df-453a-8e9b-14309408dde6', '0ddee1ea-f753-5c17-9935-32b75e3d062a');

-- 6. Supprimer les personnes de test
delete from escen.people
where id in ('e1988277-7fc1-4298-963c-bee625004b18', '0ddee1ea-f753-5c17-9935-32b75e3d062a')
   or email in ('afantsaoiebenenezer@gmail.com', 'denis.gangnito@escen.university');

-- Réactiver les triggers no_delete
alter table escen.people enable trigger no_delete;
alter table escen.students enable trigger no_delete;
alter table escen.accounts enable trigger no_delete;
alter table escen.role_grants enable trigger no_delete;
alter table escen.enrollments enable trigger no_delete;
alter table escen.online_applications enable trigger no_delete;

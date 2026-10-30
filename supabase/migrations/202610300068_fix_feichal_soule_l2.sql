-- Migration 202610300068_fix_feichal_soule_l2.sql
-- Rectification Feïchal SOULE (145-ESC-2026) :
-- Maintient son inscription officielle en Licence 2 (L2 TRONC COMMUN)
-- et supprime l'inscription doublon en Licence 1 (L1 TRONC COMMUN)

alter table escen.enrollment_groups disable trigger no_delete;
alter table escen.enrollments disable trigger no_delete;

-- 1. Supprimer le rattachement de groupe L1 doublon
delete from escen.enrollment_groups
where enrollment_id = 'be96f3ec-f7c4-4f2c-93f8-236759438d86'::uuid;

-- 2. Supprimer l'inscription doublon L1
delete from escen.enrollments
where id = 'be96f3ec-f7c4-4f2c-93f8-236759438d86'::uuid;

alter table escen.enrollments enable trigger no_delete;
alter table escen.enrollment_groups enable trigger no_delete;

-- 3. Aligner sa candidature sur la formation réelle Licence 2 Marketing Digital (année 2026-2027)
do $$
begin
  perform set_config('escen.application_command', '1', true);
  update escen.online_applications
  set intake_id = 'bbb4a93a-0243-41f5-b505-988d9b932fd1'::uuid
  where id = 'c8cf97f6-4977-5690-a96e-4903cae5c692'::uuid;
end $$;

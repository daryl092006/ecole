-- Migration 202611020075_fix_gaba_adama_m365_email.sql
-- Rectification compte Microsoft 365 et email personnel pour Adama Jean-Pierre GABA (015-ESC-2024) :
-- 1. Son compte Microsoft 365 réel et actif sur le tenant ESCEN est g.jeanpierre.etudiant@escen.university
-- 2. Nettoyage de la coquille legacy d.jeanpierre.etudiant@escen.university dans escen.people (laissé null car pas d'email personnel civil renseigné pour l'instant)

update escen.students
set m365_email = 'g.jeanpierre.etudiant@escen.university',
    m365_status = 'ACTIVE'
where matricule = '015-ESC-2024';

update escen.people
set email = null
where id = (select person_id from escen.students where matricule = '015-ESC-2024')
  and email = 'd.jeanpierre.etudiant@escen.university';

do $$
begin
  if to_regclass('auth.users') is not null and exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'email'
  ) then
    execute 'update auth.users set email = ''g.jeanpierre.etudiant@escen.university'' where lower(email) in (''g.adama.etudiant@escen.university'', ''d.jeanpierre.etudiant@escen.university'')';
  end if;
end $$;

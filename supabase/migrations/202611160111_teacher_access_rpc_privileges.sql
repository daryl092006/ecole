-- Correctif identique aux REVOKE autorisés et appliqués lors de la publication.
-- Les privilèges par défaut de Supabase peuvent accorder explicitement EXECUTE
-- à anon/authenticated : REVOKE FROM PUBLIC ne retire pas ces droits explicites.
-- Ne pas modifier la migration 110 déjà appliquée.
begin;
do $$
declare browser_role text;
begin
  foreach browser_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = browser_role) then
      execute format('revoke all on function public.escen_backend_snapshot() from %I', browser_role);
      execute format('revoke all on function public.escen_teacher_digital_access_request(uuid,uuid,text) from %I', browser_role);
      execute format('revoke all on function escen.request_teacher_digital_access(uuid,uuid,text) from %I', browser_role);
      execute format('revoke all on function escen_private.require_teacher_personal_email() from %I', browser_role);
      execute format('revoke all on escen.teacher_digital_access from %I', browser_role);
    end if;
  end loop;
end $$;
commit;

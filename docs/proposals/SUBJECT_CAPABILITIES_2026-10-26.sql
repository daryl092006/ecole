-- Proposition uniquement : accord requis avant création d’une nouvelle migration.
-- Dépend de 050, qui doit être présente avant d’annoncer le protocole enrichi.
begin;
do $$ begin
  if position('requiresJustification' in pg_get_functiondef('escen_private.exam_attempt_view(uuid)'::regprocedure))=0
    or position('requiresJustification' in pg_get_functiondef('public.escen_online_exam(uuid,text,text,uuid,uuid,uuid,bigint,uuid,jsonb)'::regprocedure))=0 then
    raise exception 'Le protocole étudiant enrichi doit être installé avant activation';
  end if;
end $$;
create function public.escen_subject_features() returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
  select jsonb_build_object('qcmJustification',true);
$$;
revoke all on function public.escen_subject_features() from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then revoke all on function public.escen_subject_features() from anon; end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on function public.escen_subject_features() from authenticated; end if;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_subject_features() to service_role; end if;
end $$;
commit;

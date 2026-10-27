-- Proposition : ne pas appliquer à distance sans accord explicite.
-- Permet de conserver les candidatures historiques dont la filière a disparu,
-- les décisions historiques et le lien exact vers un étudiant existant.
begin;
alter table escen.online_applications
  add column legacy_source_row_id uuid unique references escen_private.legacy_rows(id) on delete restrict,
  add column legacy_state jsonb check (legacy_state is null or jsonb_typeof(legacy_state) = 'object'),
  add column legacy_student_id uuid references escen.students(id) on delete restrict;
create index application_legacy_student_fk on escen.online_applications(legacy_student_id);
alter table escen.online_applications drop constraint online_applications_check;
alter table escen.online_applications add constraint application_submission_origin check (
  status = 'BROUILLON' or
  (submitted_at is not null and (intake_id is not null or legacy_source_row_id is not null))
);

-- L'ancien contrôle des permissions reste exécuté avant toute lecture.
-- Seuls les brouillons explicitement repris rejoignent les dossiers visibles.
alter function public.escen_website_manage(uuid,text,text,jsonb)
  rename to escen_website_manage_before_application_recovery;
create function public.escen_website_manage(p_actor_id uuid, p_role_code text,
  p_action text, p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare result jsonb;
begin
  result := public.escen_website_manage_before_application_recovery(p_actor_id,p_role_code,p_action,p_data);
  if p_action = 'admissions' then
    result := jsonb_set(result, '{applications}', coalesce(result->'applications','[]'::jsonb) ||
      coalesce((select jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'intake_label',i.label,'documents',coalesce((select jsonb_agg(to_jsonb(d)-'bucket'-'object_path'-'sha256')
          from escen.application_documents d where d.application_id=a.id),'[]'::jsonb)) order by a.created_at desc)
        from escen.online_applications a left join escen.website_intakes i on i.id=a.intake_id
        where a.status='BROUILLON' and a.legacy_source_row_id is not null),'[]'::jsonb));
  elsif p_action = 'document' and result is null then
    select to_jsonb(d)||jsonb_build_object('academic_year_id',a.academic_year_id) into result
      from escen.application_documents d join escen.online_applications a on a.id=d.application_id
      where d.id=(p_data->>'id')::uuid and a.status='BROUILLON' and a.legacy_source_row_id is not null;
  end if;
  return result;
end $$;
revoke all on function public.escen_website_manage_before_application_recovery(uuid,text,text,jsonb) from public;
revoke all on function public.escen_website_manage(uuid,text,text,jsonb) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then
    revoke all on function public.escen_website_manage_before_application_recovery(uuid,text,text,jsonb) from anon;
    revoke all on function public.escen_website_manage(uuid,text,text,jsonb) from anon;
  end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    revoke all on function public.escen_website_manage_before_application_recovery(uuid,text,text,jsonb) from authenticated;
    revoke all on function public.escen_website_manage(uuid,text,text,jsonb) from authenticated;
  end if;
  if exists(select 1 from pg_roles where rolname='service_role') then
    revoke all on function public.escen_website_manage_before_application_recovery(uuid,text,text,jsonb) from service_role;
    grant execute on function public.escen_website_manage(uuid,text,text,jsonb) to service_role;
  end if;
end $$;
commit;

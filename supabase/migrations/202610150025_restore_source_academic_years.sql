begin;
-- Restore the existing institution's years, not years inferred from today's date.
-- Duplicate legacy codes stay untouched in legacy_rows; the exact year label is the new unique code.
create function escen_private.restore_source_academic_years() returns jsonb
language plpgsql set search_path=pg_catalog as $$
declare src escen_private.legacy_rows; batch uuid; run_id uuid; target uuid; start_date date; end_date date;
  created integer:=0; restored uuid; active_count integer; previous_actor text; previous_marker text;
begin
  perform 1 from escen_private.portal_revision where singleton for update;
  perform 1 from escen.academic_working_year where singleton for update;
  previous_actor:=current_setting('escen.actor_id',true);
  previous_marker:=current_setting('escen.year_lifecycle',true);
  perform set_config('escen.actor_id','',true);
  for src in select * from escen_private.legacy_rows where source_table='annee_scolaires' order by batch_id,source_id loop
    if exists(select 1 from escen_private.source_mappings where row_id=src.id and target_table='academic_years') then continue; end if;
    if coalesce(src.payload->>'nom','') !~ '^[0-9]{4}-[0-9]{4}$' or coalesce(src.payload->>'date_debut','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or coalesce(src.payload->>'date_fin','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then continue; end if;
    begin
      start_date:=(src.payload->>'date_debut')::date;
      end_date:=(src.payload->>'date_fin')::date;
    exception when datetime_field_overflow or invalid_datetime_format then continue;
    end;
    if end_date<=start_date then continue; end if;
    -- A matching text alone is not evidence that two sources identify the same year.
    if exists(select 1 from escen.academic_years where code=src.payload->>'nom') then continue; end if;
    insert into escen_private.import_runs(batch_id,run_code,counts)
      values(src.batch_id,'LEGACY_ACADEMIC_YEARS_V1',jsonb_build_object('source_table','annee_scolaires','code_rule','exact year label; original duplicate code retained in source'))
      on conflict(batch_id,run_code) do nothing;
    select id into run_id from escen_private.import_runs where batch_id=src.batch_id and run_code='LEGACY_ACADEMIC_YEARS_V1';
    insert into escen.academic_years(code,name,starts_on,ends_on,status,reason)
      values(src.payload->>'nom',src.payload->>'nom',start_date,end_date,case when src.payload->>'active' in ('1','true') then 'OUVERTE' else 'BROUILLON' end,
        'Reprise source exacte '||src.id||'; code unique issu du nom; code source conservé : '||coalesce(src.payload->>'code','absent')) returning id into target;
    insert into escen_private.source_mappings(row_id,target_table,target_id,mapped_by,reason,mapping_method,import_run_id)
      values(src.id,'academic_years',target,null,'Même ligne source ; nom et dates inchangés ; code source dupliqué conservé dans l’archive','SOURCE_EXACT',run_id);
    created:=created+1;
  end loop;
  -- Preserve any current configuration; restore only one unambiguous explicit source flag.
  if not exists(select 1 from escen.academic_working_year where academic_year_id is not null) then
    select count(*) into active_count from escen_private.legacy_rows where source_table='annee_scolaires' and payload->>'active' in ('1','true');
    if active_count=1 then
      select m.target_id into restored from escen_private.legacy_rows l join escen_private.source_mappings m on m.row_id=l.id and m.target_table='academic_years' join escen.academic_years y on y.id=m.target_id
        where l.source_table='annee_scolaires' and l.payload->>'active' in ('1','true') and y.status='OUVERTE' and y.archived_at is null;
      if restored is not null then
        perform set_config('escen.year_lifecycle','yes',true);
        update escen.academic_working_year set academic_year_id=restored,reason='Restauration du seul marqueur active=1 de la source historique ; aucune sélection par date',updated_at=now() where singleton;
      end if;
    end if;
  end if;
  if created>0 or restored is not null then
    update escen_private.portal_revision set revision=revision+1,changed_at=now(),actor_id=null where singleton;
  end if;
  perform set_config('escen.actor_id',coalesce(previous_actor,''),true);
  perform set_config('escen.year_lifecycle',coalesce(previous_marker,''),true);
  return jsonb_build_object('created',created,'restoredCurrentYearId',restored);
end $$;
revoke all on function escen_private.restore_source_academic_years() from public;
select escen_private.restore_source_academic_years();
-- Consultation bridge for already imported identities: exact source membership, no invented enrollment.
create function public.escen_history_student_ids_year(p_year_id uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
  select coalesce(jsonb_agg(distinct m.target_id),'[]'::jsonb)
  from escen_private.source_mappings m join escen_private.legacy_rows l on l.id=m.row_id
  where m.target_table='students' and m.mapping_method='SOURCE_EXACT' and l.source_table='etudiants'
    and p_year_id=any(escen_private.history_year_ids(l));
$$;
revoke all on function public.escen_history_student_ids_year(uuid) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then revoke all on function public.escen_history_student_ids_year(uuid) from anon; end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on function public.escen_history_student_ids_year(uuid) from authenticated; end if;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_history_student_ids_year(uuid) to service_role; end if;
end $$;
commit;

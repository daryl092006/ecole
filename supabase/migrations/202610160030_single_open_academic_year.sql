begin;

-- These references already expose reversible archival in the catalog UI.
alter table escen.curricula add column archived_at timestamptz;
alter table escen.academic_offerings add column archived_at timestamptz, add column reason text;
alter table escen.group_offerings add column archived_at timestamptz, add column reason text;
alter table escen.curricula add constraint curricula_archive_reason check (archived_at is null or length(btrim(coalesce(reason,''))) >= 3);
alter table escen.academic_offerings add constraint offering_archive_reason check (archived_at is null or length(btrim(coalesce(reason,''))) >= 3);
alter table escen.group_offerings add constraint group_offering_archive_reason check (archived_at is null or length(btrim(coalesce(reason,''))) >= 3);

-- Stop on inconsistent existing data; never choose or close a year implicitly.
lock table escen.academic_years in share row exclusive mode;
do $$ begin
  if (select count(*) from escen.academic_years where status='OUVERTE') > 1 then
    raise exception 'Plusieurs années sont ouvertes. Examiner leurs dossiers et décider explicitement de leur clôture avant cette migration.';
  end if;
end $$;
create unique index academic_year_single_open on escen.academic_years ((true)) where status='OUVERTE';

create function escen_private.assert_year_opening_ready(p_year_id uuid) returns void
language plpgsql set search_path=pg_catalog as $$
declare o record;
begin
  if exists(select 1 from escen.academic_years where status='OUVERTE' and id<>p_year_id) then
    raise exception 'Une année est déjà ouverte. Terminez son exploitation avant d’en ouvrir une autre.' using errcode='23514';
  end if;
  if not exists(select 1 from escen.academic_offerings where academic_year_id=p_year_id and archived_at is null) then
    raise exception 'Année non prête : aucune formation annuelle.' using errcode='23514';
  end if;
  for o in select a.*,c.program_id from escen.academic_offerings a
    left join escen.curricula c on c.id=a.curriculum_id and c.archived_at is null
    where a.academic_year_id=p_year_id and a.archived_at is null loop
    if o.program_id is null
      or not exists(select 1 from escen.programs where id=o.program_id and archived_at is null and active)
      or not exists(select 1 from escen.levels where id=o.level_id and archived_at is null) then
      raise exception 'Année non prête : filière, niveau ou programme de formation à compléter.' using errcode='23514';
    end if;
    if not exists(select 1 from escen.group_offerings l join escen.groups g on g.id=l.group_id
      where l.offering_id=o.id and l.academic_year_id=p_year_id and l.level_id=o.level_id
        and l.archived_at is null and g.archived_at is null and g.academic_year_id=p_year_id and g.level_id=o.level_id) then
      raise exception 'Année non prête : chaque formation doit disposer d’un groupe disponible.' using errcode='23514';
    end if;
    if exists(select category from (values ('SCOLARITE'),('INSCRIPTION')) categories(category)
      where not exists(select 1 from escen.annual_fee_schedules f
        where f.academic_year_id=p_year_id and f.archived_at is null and f.category=categories.category
          and (f.program_id is null or f.program_id=o.program_id)
          and (f.level_id is null or f.level_id=o.level_id)
          and (f.delivery_mode is null or f.delivery_mode=o.delivery_mode))) then
      raise exception 'Année non prête : frais de scolarité et d’inscription requis pour chaque formation.' using errcode='23514';
    end if;
  end loop;
  if not exists(select 1 from escen.annual_payment_channels where academic_year_id=p_year_id and archived_at is null) then
    raise exception 'Année non prête : aucun moyen d’encaissement disponible.' using errcode='23514';
  end if;
end $$;
revoke all on function escen_private.assert_year_opening_ready(uuid) from public;

create or replace function public.escen_academic_year_command(p_actor_id uuid,p_role_code text,p_action text,p_year_id uuid,p_expected_revision bigint,p_reason text,p_status text default null) returns bigint
language plpgsql security definer set search_path=pg_catalog as $$
declare y escen.academic_years; rev bigint; previous_marker text;
begin
  if not exists(select 1 from escen.accounts a join escen.role_grants g on g.account_id=a.id join escen.roles r on r.id=g.role_id join escen.role_permissions rp on rp.role_id=r.id join escen.permissions p on p.id=rp.permission_id
    where a.id=p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null and r.active and r.code=p_role_code and p.code='academic.year.open' and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()) and g.site_id is null and g.group_id is null and g.academic_year_id is null) then raise exception 'Pilotage global des années requis' using errcode='42501'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Motif obligatoire' using errcode='23514'; end if;
  select revision into rev from escen_private.portal_revision where singleton for update;
  if rev<>p_expected_revision then raise exception 'Modification concurrente : actualisez' using errcode='40001'; end if;
  if p_year_id is not null then
    select * into y from escen.academic_years where id=p_year_id and archived_at is null for update;
    if y.id is null then raise exception 'Année introuvable' using errcode='P0002'; end if;
  end if;
  previous_marker:=current_setting('escen.year_lifecycle',true);
  perform set_config('escen.actor_id',p_actor_id::text,true);
  perform set_config('escen.year_lifecycle','yes',true);
  if p_action='current' then
    if p_year_id is not null and y.status<>'OUVERTE' then raise exception 'L’année de travail doit être ouverte' using errcode='23514'; end if;
    update escen.academic_working_year set academic_year_id=p_year_id,reason=p_reason,updated_at=now() where singleton;
  elsif p_action='transition' then
    if y.id is null or p_status is null or not ((y.status='BROUILLON' and p_status='OUVERTE') or (y.status='OUVERTE' and p_status='EN_CLOTURE') or (y.status='EN_CLOTURE' and p_status='CLOTUREE')) then raise exception 'Transition d’année interdite' using errcode='23514'; end if;
    if p_status<>'OUVERTE' and exists(select 1 from escen.academic_working_year where academic_year_id=y.id) then raise exception 'Choisissez une autre année de travail ou retirez sa désignation avant la clôture' using errcode='23514'; end if;
    if p_status='OUVERTE' then perform escen_private.assert_year_opening_ready(y.id); end if;
    if p_status='CLOTUREE' then
      if exists(select 1 from escen.evaluations e join escen.academic_offerings o on o.id=e.offering_id where o.academic_year_id=y.id and e.cancelled_at is null and e.status<>'PUBLIEES') then raise exception 'Des évaluations ne sont pas publiées ou annulées' using errcode='23514'; end if;
      if exists(select 1 from escen.complaints c join escen.evaluation_candidates ec on ec.id=c.candidate_id join escen.evaluations e on e.id=ec.evaluation_id join escen.academic_offerings o on o.id=e.offering_id where o.academic_year_id=y.id and c.status<>'CLOTUREE') then raise exception 'Des réclamations sont encore ouvertes' using errcode='23514'; end if;
      if exists(select 1 from escen.exam_attempts a join escen.evaluations e on e.id=a.evaluation_id join escen.academic_offerings o on o.id=e.offering_id where o.academic_year_id=y.id and a.status='EN_COURS') then raise exception 'Des tentatives sont encore en cours' using errcode='23514'; end if;
    end if;
    update escen.academic_years set status=p_status,reason=p_reason where id=y.id;
  else raise exception 'Commande inconnue' using errcode='42501'; end if;
  update escen_private.portal_revision set revision=revision+1,changed_at=now(),actor_id=p_actor_id where singleton returning revision into rev;
  perform set_config('escen.year_lifecycle',coalesce(previous_marker,''),true);
  return rev;
end $$;

create or replace function escen_private.restore_source_academic_years() returns jsonb
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
      values(src.payload->>'nom',src.payload->>'nom',start_date,end_date,case when src.payload->>'active' in ('1','true')
          and not exists(select 1 from escen.academic_years where status='OUVERTE')
          and not exists(select 1 from escen.academic_working_year where academic_year_id is not null)
          and (select count(*) from escen_private.legacy_rows where source_table='annee_scolaires' and payload->>'active' in ('1','true'))=1
        then 'OUVERTE' else 'BROUILLON' end,
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

commit;

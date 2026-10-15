begin;
-- Missing information remains NULL only for rows with immutable source evidence.
do $$ declare t text; begin
 foreach t in array array['academic_offerings','levels','enrollment_groups','contract_versions','payments','curriculum_components','evaluations','grades'] loop
  execute format('alter table escen.%I add column legacy_source_row_id uuid references escen_private.legacy_rows(id) on delete restrict',t);
 end loop;
end $$;
alter table escen.academic_offerings alter column curriculum_id drop not null;
alter table escen.academic_offerings add constraint offering_curriculum_evidence check (curriculum_id is not null or legacy_source_row_id is not null);
alter table escen.academic_offerings add constraint offering_level_reference foreign key(level_id) references escen.levels(id) on delete restrict;
alter table escen.levels alter column cycle_id drop not null;
alter table escen.levels drop constraint levels_position_check;
alter table escen.levels add constraint recovered_level_required check ((cycle_id is not null and position>0) or (legacy_source_row_id is not null and position>=0));
alter table escen.enrollment_groups alter column valid_from drop not null;
alter table escen.enrollment_groups add constraint membership_date_evidence check (valid_from is not null or legacy_source_row_id is not null);
alter table escen.curriculum_components alter column unit_id drop not null, alter column credits drop not null, alter column curriculum_id drop not null, alter column coefficient drop not null;
alter table escen.curriculum_components drop constraint curriculum_components_coefficient_check;
alter table escen.curriculum_components add constraint component_coefficient_evidence check ((coefficient is not null and coefficient>0) or (legacy_source_row_id is not null and (coefficient is null or coefficient>=0)));
alter table escen.curriculum_components add constraint component_definition_evidence check ((curriculum_id is not null and unit_id is not null and credits is not null) or legacy_source_row_id is not null);
alter table escen.evaluations alter column assignment_id drop not null;
alter table escen.evaluations add constraint evaluation_assignment_evidence check (assignment_id is not null or legacy_source_row_id is not null);
alter table escen.evaluations add column archived_at timestamptz;
alter table escen.evaluations add column session_type text check(session_type in ('NORMALE','RATTRAPAGE'));
alter table escen.installments add column settled_amount escen.xof_amount;
alter table escen.curriculum_components add column total_hours numeric(7,2);
alter table escen.curriculum_components alter column cm_hours drop not null, alter column td_hours drop not null, alter column tp_hours drop not null, alter column other_hours drop not null;
alter table escen.curriculum_components add constraint component_hours_evidence check (legacy_source_row_id is not null or (cm_hours is not null and td_hours is not null and tp_hours is not null and other_hours is not null));
alter table escen.contract_versions drop constraint contract_versions_status_check;
alter table escen.contract_versions add constraint contract_version_state check (status in ('DRAFT','APPROVED','SUPERSEDED') or (status='EN_COURS' and legacy_source_row_id is not null));
alter table escen.contract_versions drop constraint contract_versions_check1;
alter table escen.contract_versions add constraint version_approval_evidence check (status in ('DRAFT','EN_COURS') or (approved_by is not null and approved_at is not null));
create unique index one_active_contract_version on escen.contract_versions(contract_id) where status in ('APPROVED','EN_COURS');
alter table escen.payments alter column payer_name drop not null;
alter table escen.payments add column status text not null default 'POSTED' check (status in ('POSTED','PENDING'));
alter table escen.payments add constraint payment_source_evidence check ((payer_name is not null and status='POSTED') or legacy_source_row_id is not null);
alter table escen.annual_fee_schedules add column delivery_mode text;
alter table escen.academic_offerings add column delivery_mode text;
do $$ declare c record; begin for c in select conname from pg_constraint where conrelid='escen.annual_fee_schedules'::regclass and contype='u' loop execute format('alter table escen.annual_fee_schedules drop constraint %I',c.conname); end loop; end $$;
alter table escen.annual_fee_schedules add constraint annual_fee_variant unique nulls not distinct(academic_year_id,category,program_id,level_id,delivery_mode,archived_at);
drop index escen.offering_without_location;
create unique index offering_without_location on escen.academic_offerings(coalesce(curriculum_id,'00000000-0000-0000-0000-000000000000'::uuid),academic_year_id,level_id,coalesce(delivery_mode,'')) where site_id is null;
-- A source exam may cover several actual formations; each operational exam
-- keeps the original source, while retaining existing per-formation security.
alter table escen_private.source_mappings drop constraint source_mappings_row_id_target_table_key;
alter table escen_private.source_mappings add constraint source_mapping_target unique(row_id,target_table,target_id);
create function escen_private.guard_recovery_evidence() returns trigger language plpgsql set search_path=pg_catalog as $$
declare source escen_private.legacy_rows; expected text;
begin
 if tg_op='UPDATE' and new.legacy_source_row_id is distinct from old.legacy_source_row_id then raise exception 'Provenance immuable' using errcode='23514'; end if;
 if new.legacy_source_row_id is null then return new; end if;
 expected:=case tg_table_name when 'levels' then 'niveaux' when 'enrollment_groups' then 'etudiant_group' when 'contract_versions' then 'frais_etudiants' when 'payments' then 'paiements' when 'curriculum_components' then 'unite_valeurs' when 'evaluations' then 'evaluations' when 'grades' then 'notes' end;
 select * into source from escen_private.legacy_rows where id=new.legacy_source_row_id;
 if source.id is null or (tg_table_name='academic_offerings' and source.source_table not in ('etudiant_group','filiere_group')) or (tg_table_name<>'academic_offerings' and source.source_table<>expected) then raise exception 'Source incompatible avec la reprise' using errcode='23514'; end if;
 if tg_op='INSERT' then
  if tg_table_name='grades' then if new.value is distinct from (source.payload->>'note')::numeric then raise exception 'Note différente de la source' using errcode='23514'; end if; end if;
  if tg_table_name='payments' then
   if new.amount is distinct from (source.payload->>'montant')::numeric or new.status is distinct from (case when source.payload->>'status'='valide' then 'POSTED' else 'PENDING' end) then raise exception 'Versement différent de la source' using errcode='23514'; end if;
  end if;
 end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['academic_offerings','levels','enrollment_groups','contract_versions','payments','curriculum_components','evaluations','grades'] loop
  execute format('create trigger recovery_evidence before insert or update on escen.%I for each row execute function escen_private.guard_recovery_evidence()',t);
 end loop;
end $$;
create function escen_private.restore_recovered_publication() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if new.target_table='evaluations' and new.mapping_method='SOURCE_EXACT' and exists(select 1 from escen_private.import_runs where id=new.import_run_id and run_code='CANONICAL_2025_V1') then
  if exists(select 1 from escen_private.legacy_rows l join escen.evaluations e on e.legacy_source_row_id=l.id where l.id=new.row_id and e.id=new.target_id and l.payload->>'published'='1') then
   update escen.evaluations set status='PUBLIEES' where id=new.target_id and status='BROUILLON';
  end if;
 end if;
 return new;
end $$;
create trigger recovery_publication after insert on escen_private.source_mappings for each row execute function escen_private.restore_recovered_publication();
alter table escen.evaluations add column group_id uuid references escen.groups(id) on delete restrict;
alter table escen.evaluations add column held_on date;
alter table escen.evaluations add constraint recovered_component_reference foreign key(component_id) references escen.curriculum_components(id) on delete restrict;
create or replace function escen_private.guard_candidate() returns trigger language plpgsql set search_path=pg_catalog as $$
declare state text; cancelled timestamptz; evaluation_group uuid; roster_date date; evidence uuid;
begin
 select e.status,e.cancelled_at,coalesce(a.group_id,e.group_id),e.held_on,e.legacy_source_row_id into state,cancelled,evaluation_group,roster_date,evidence from escen.evaluations e left join escen.teaching_assignments a on a.id=e.assignment_id where e.id=new.evaluation_id for update of e;
 if state<>'BROUILLON' or cancelled is not null or exists(select 1 from escen.grades g join escen.evaluation_candidates c on c.id=g.candidate_id where c.evaluation_id=new.evaluation_id) or exists(select 1 from escen.exam_attempts where evaluation_id=new.evaluation_id) then raise exception 'Liste de candidats verrouillée' using errcode='23514'; end if;
 roster_date:=coalesce(roster_date,(select (d.access_opens_at at time zone 'Africa/Lome')::date from escen.exam_deliveries d where d.evaluation_id=new.evaluation_id),current_date);
 if not exists(select 1 from escen.enrollment_groups where enrollment_id=new.enrollment_id and group_id=evaluation_group and (valid_from<=roster_date or (valid_from is null and legacy_source_row_id is not null and evidence is not null)) and (valid_until is null or valid_until>roster_date)) then raise exception 'Candidat hors du groupe affecté' using errcode='23514'; end if;
 return new;
end $$;
create or replace function escen_private.guard_contract_content() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare locked_version_id uuid; state text; total numeric; due numeric;
begin
  if tg_table_name = 'contract_versions' then
    perform 1 from escen.financial_contracts where id = new.contract_id for update;
    if tg_op = 'UPDATE' and old.status <> 'DRAFT' and
      ((to_jsonb(new) - 'status') <> (to_jsonb(old) - 'status') or new.status <> 'SUPERSEDED') then
      raise exception 'Contrat approuvé immuable' using errcode = '23514';
    end if;
    if new.status in ('APPROVED','EN_COURS') and (tg_op = 'INSERT' or old.status = 'DRAFT') then
      select coalesce(sum(amount),0) into total from escen.contract_lines where version_id = new.id;
      total := total - coalesce((select sum(amount) from escen.contract_discounts where contract_discounts.version_id = new.id),0);
      select coalesce(sum(amount),0) into due from escen.installments where installments.version_id = new.id;
      if not exists (select 1 from escen.contract_lines where contract_lines.version_id = new.id) or total <> due or total < 0 then
        raise exception 'Échéancier et montant net du contrat incompatibles' using errcode = '23514';
      end if;
      if exists (select 1 from escen.contract_lines l where l.version_id = new.id
        and l.amount < coalesce((select sum(d.amount) from escen.contract_discounts d where d.line_id = l.id),0)) then
        raise exception 'Remise supérieure à la ligne de frais' using errcode = '23514';
      end if;
    end if;
  else
    locked_version_id := new.version_id;
    select v.status into state from escen.contract_versions v where id = locked_version_id for update;
    if state <> 'DRAFT' then raise exception 'Contrat approuvé immuable' using errcode = '23514'; end if;
    if tg_op = 'UPDATE' then
      select v.status into state from escen.contract_versions v where id = old.version_id for update;
      if state <> 'DRAFT' then raise exception 'Contrat approuvé immuable' using errcode = '23514'; end if;
    end if;
    if tg_table_name = 'contract_discounts' then
      if coalesce((select sum(d.amount) from escen.contract_discounts d where d.line_id = new.line_id and d.id <> new.id),0) + new.amount
        > (select l.amount from escen.contract_lines l where l.id = new.line_id) then
        raise exception 'Remise supérieure à la ligne de frais' using errcode = '23514';
      end if;
      if new.scholarship_award_id is not null and not exists (select 1 from escen.scholarship_awards a
        join escen.financial_contracts c on c.enrollment_id = a.enrollment_id join escen.contract_lines l on l.contract_id = c.id
        where a.id = new.scholarship_award_id and l.id = new.line_id) then
        raise exception 'Bourse d’une autre inscription' using errcode = '23514';
      end if;
    elsif tg_table_name = 'contract_lines' then
      if new.rate_id is not null and not exists (select 1 from escen.fee_rates r join escen.enrollments e on e.offering_id = r.offering_id
        join escen.financial_contracts c on c.enrollment_id = e.id
        where r.id = new.rate_id and r.fee_type_id = new.fee_type_id and c.id = new.contract_id) then
        raise exception 'Tarif d’une autre formation ou nature de frais' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end $$;

revoke all on function escen_private.guard_recovery_evidence() from public;
revoke all on function escen_private.restore_recovered_publication() from public;
commit;

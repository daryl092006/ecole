begin;
-- Existing subject references remain intact; new annual definitions may reuse a code in another year.
alter table escen.subjects add column academic_year_id uuid references escen.academic_years(id) on delete restrict;
alter table escen.subjects drop constraint subjects_code_key;
alter table escen.subjects add constraint subject_code_per_year unique nulls not distinct(academic_year_id,code);
create index subject_year_fk on escen.subjects(academic_year_id);
create table escen.annual_fee_schedules (
 id uuid primary key default gen_random_uuid(),
 academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
 category text not null check(category in ('SCOLARITE','INSCRIPTION')),
 program_id uuid references escen.programs(id) on delete restrict,
 level_id uuid references escen.levels(id) on delete restrict,
 amount escen.xof_amount not null,
 reason escen.nonempty_text not null,
 archived_at timestamptz,
 unique nulls not distinct(academic_year_id,category,program_id,level_id,archived_at)
);
alter table escen.annual_fee_schedules enable row level security;
create index annual_fee_year_fk on escen.annual_fee_schedules(academic_year_id);
create index annual_fee_program_fk on escen.annual_fee_schedules(program_id);
create index annual_fee_level_fk on escen.annual_fee_schedules(level_id);
create trigger no_delete before delete on escen.annual_fee_schedules for each row execute function escen_private.no_delete();
create trigger audit_event after insert or update on escen.annual_fee_schedules for each row execute function escen_private.record_audit();
create trigger annual_activity_guard before insert or update on escen.annual_fee_schedules for each row execute function escen_private.guard_annual_activity();
create function escen_private.guard_annual_definition() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op='UPDATE' and old.academic_year_id is distinct from new.academic_year_id then raise exception 'L’année de cette définition est figée' using errcode='23514'; end if;
 if tg_table_name='subjects' and tg_op='UPDATE' and exists(select 1 from escen.curriculum_components where subject_id=old.id) and (new.name,new.code) is distinct from (old.name,old.code) then raise exception 'Cette matière est utilisée : conservez sa définition et créez une matière dans la nouvelle année' using errcode='23514'; end if;
 return new;
end $$;
create trigger annual_definition_guard before update on escen.subjects for each row execute function escen_private.guard_annual_definition();
create trigger annual_definition_guard before update on escen.annual_fee_schedules for each row execute function escen_private.guard_annual_definition();
create trigger annual_activity_guard before insert or update on escen.subjects for each row execute function escen_private.guard_annual_activity();
revoke all on function escen_private.guard_annual_definition() from public;
commit;

-- A yearly subject cannot be reused silently in another year's teaching plan.
create function escen_private.guard_subject_offering_year() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_table_name='academic_offerings' then
  if exists(select 1 from escen.curriculum_components c join escen.subjects s on s.id=c.subject_id where c.curriculum_id=new.curriculum_id and s.academic_year_id is not null and s.academic_year_id<>new.academic_year_id) then raise exception 'Une matière de la maquette appartient à une autre année' using errcode='23514'; end if;
 else
  if exists(select 1 from escen.subjects s join escen.academic_offerings o on o.curriculum_id=new.curriculum_id where s.id=new.subject_id and s.academic_year_id is not null and s.academic_year_id<>o.academic_year_id) then raise exception 'La matière ne correspond pas à l’année de l’offre' using errcode='23514'; end if;
 end if;
 return new;
end $$;
create trigger subject_offering_year_guard before insert or update on escen.academic_offerings for each row execute function escen_private.guard_subject_offering_year();
create trigger subject_offering_year_guard before insert or update on escen.curriculum_components for each row execute function escen_private.guard_subject_offering_year();
revoke all on function escen_private.guard_subject_offering_year() from public;

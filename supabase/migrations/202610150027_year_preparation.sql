begin;
create table escen.annual_payment_channels (
 id uuid primary key default gen_random_uuid(),
 academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
 name escen.nonempty_text not null,
 method text not null check(method in ('ESPECES','MOBILE_MONEY','VIREMENT','CHEQUE','CARTE')),
 reason escen.nonempty_text not null,
 archived_at timestamptz,
 unique nulls not distinct(academic_year_id,method,name,archived_at)
);
alter table escen.annual_payment_channels enable row level security;
create index annual_payment_channel_year_fk on escen.annual_payment_channels(academic_year_id);
create trigger no_delete before delete on escen.annual_payment_channels for each row execute function escen_private.no_delete();
create trigger audit_event after insert or update on escen.annual_payment_channels for each row execute function escen_private.record_audit();
create trigger annual_definition_guard before update on escen.annual_payment_channels for each row execute function escen_private.guard_annual_definition();
create trigger annual_activity_guard before insert or update on escen.annual_payment_channels for each row execute function escen_private.guard_annual_activity();
create or replace function escen_private.guard_annual_activity() returns trigger language plpgsql set search_path=pg_catalog as $$
declare year_id uuid; old_year uuid; year_status text;
begin
  year_id:=escen_private.activity_year(tg_table_name,to_jsonb(new));
  if year_id is null then return new; end if;
  if tg_op='UPDATE' then
    old_year:=escen_private.activity_year(tg_table_name,to_jsonb(old));
    if old_year is not null and old_year<>year_id then raise exception 'Un dossier annuel ne peut pas être déplacé vers une autre année' using errcode='23514'; end if;
  end if;
  select status into year_status from escen.academic_years where id=year_id and archived_at is null for share;
  if year_status='BROUILLON' and tg_table_name in ('academic_offerings','offering_semesters','groups','group_offerings','subjects','annual_fee_schedules','annual_payment_channels') then return new; end if;
  if year_status is null or year_status in ('BROUILLON','CLOTUREE') then raise exception 'Cette année ne permet pas cette opération académique' using errcode='23514'; end if;
  if year_status='EN_CLOTURE' and tg_op='INSERT' and tg_table_name in ('enrollments','academic_offerings','groups','teaching_assignments','sessions','evaluations','financial_contracts') then raise exception 'Année en clôture : aucune nouvelle inscription ou programmation' using errcode='23514'; end if;
  return new;
end $$;
-- Trigger records have different columns: only inspect subject fields inside its branch.
create or replace function escen_private.guard_annual_definition() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op='UPDATE' and old.academic_year_id is distinct from new.academic_year_id then raise exception 'L’année de cette définition est figée' using errcode='23514'; end if;
 if tg_table_name='subjects' then
  if tg_op='UPDATE' and exists(select 1 from escen.curriculum_components where subject_id=old.id) and (new.name,new.code) is distinct from (old.name,old.code) then raise exception 'Cette matière est utilisée : conservez sa définition et créez une matière dans la nouvelle année' using errcode='23514'; end if;
 end if;
 return new;
end $$;
commit;

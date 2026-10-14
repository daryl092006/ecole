-- Provenance des reprises automatiques et attributions historiques sans auteur connu.
begin;
create table escen_private.import_runs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references escen_private.import_batches(id) on delete restrict,
  run_code text not null,
  started_at timestamptz not null default now(),
  database_actor text not null default session_user,
  actor_account_id uuid references escen.accounts(id) on delete restrict,
  counts jsonb not null,
  unique(batch_id,run_code)
);
alter table escen_private.import_runs enable row level security;
create trigger import_runs_immutable before update or delete on escen_private.import_runs for each row execute function escen_private.immutable_record();

alter table escen_private.source_mappings alter column mapped_by drop not null;
alter table escen_private.source_mappings add column mapping_method text not null default 'HUMAN_REVIEW'
  check(mapping_method in ('HUMAN_REVIEW','SOURCE_EXACT'));
alter table escen_private.source_mappings add column import_run_id uuid references escen_private.import_runs(id) on delete restrict;
alter table escen_private.source_mappings add constraint source_mapping_actor_check check (
  (mapping_method='HUMAN_REVIEW' and mapped_by is not null and import_run_id is null)
  or (mapping_method='SOURCE_EXACT' and mapped_by is null and import_run_id is not null));
create trigger source_mappings_immutable before update or delete on escen_private.source_mappings for each row execute function escen_private.immutable_record();

alter table escen.role_grants alter column granted_by drop not null;
alter table escen.role_grants add column legacy_source_row_id uuid unique references escen_private.legacy_rows(id) on delete restrict;
alter table escen.role_grants add constraint role_grant_actor_provenance_check check (
  (granted_by is not null and legacy_source_row_id is null)
  or (granted_by is null and legacy_source_row_id is not null));
commit;

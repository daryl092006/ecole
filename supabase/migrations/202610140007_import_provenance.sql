begin;
create table escen_private.recovery_candidates (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references escen_private.import_batches(id) on delete restrict,
  source_archive text not null,
  source_sql_sha256 text not null check (source_sql_sha256 ~ '^[a-f0-9]{64}$'),
  source_table text not null,
  source_id text not null,
  payload jsonb not null,
  unique (batch_id, source_archive, source_table, source_id)
);
alter table escen_private.recovery_candidates enable row level security;
create trigger recovery_no_change before update or delete on escen_private.recovery_candidates for each row execute function escen_private.immutable_record();
create trigger batch_no_change before update or delete on escen_private.import_batches for each row execute function escen_private.immutable_record();
create function escen_private.guard_legacy_payload() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.payload <> old.payload or new.batch_id <> old.batch_id or new.source_table <> old.source_table or new.source_id <> old.source_id then
    raise exception 'Ligne source immuable ; créer une correspondance ou une résolution' using errcode = '23514';
  end if;
  if new.status = 'MAPPED' and not exists (select 1 from escen_private.source_mappings where row_id = new.id) then
    raise exception 'Correspondance explicite obligatoire' using errcode = '23514';
  end if;
  if new.status = 'MAPPED' and exists (select 1 from escen_private.import_issues where row_id = new.id and resolved_at is null) then
    raise exception 'Résoudre les anomalies avant de valider la correspondance' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger legacy_payload_guard before update on escen_private.legacy_rows for each row execute function escen_private.guard_legacy_payload();
create index recovery_batch_fk on escen_private.recovery_candidates(batch_id);
revoke all on all tables in schema escen_private from public;
revoke all on all functions in schema escen_private from public;
commit;

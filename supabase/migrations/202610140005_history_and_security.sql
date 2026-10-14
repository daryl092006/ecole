begin;
create table escen_private.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  archive_sha256 text not null unique check (archive_sha256 ~ '^[a-f0-9]{64}$'),
  sql_sha256 text not null check (sql_sha256 ~ '^[a-f0-9]{64}$'),
  imported_at timestamptz not null default now(),
  source_rows integer not null check (source_rows >= 0)
);
create table escen_private.legacy_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references escen_private.import_batches(id) on delete restrict,
  source_table text not null,
  source_id text not null,
  payload jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING','QUARANTINED','MAPPED','ARCHIVE_ONLY')),
  unique (batch_id, source_table, source_id)
);
create table escen_private.import_issues (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references escen_private.legacy_rows(id) on delete restrict,
  code text not null,
  details jsonb not null,
  resolved_at timestamptz,
  resolved_by uuid references escen.accounts(id) on delete restrict,
  resolution_reason text,
  unique (row_id, code),
  check (resolved_at is null or (resolved_by is not null and resolution_reason is not null and length(btrim(resolution_reason)) > 0))
);
create table escen_private.source_mappings (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references escen_private.legacy_rows(id) on delete restrict,
  target_table text not null,
  target_id uuid not null,
  mapped_by uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  mapped_at timestamptz not null default now(),
  unique (row_id, target_table)
);
create function escen_private.guard_source_mapping() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare found boolean;
begin
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'escen' and c.relname = new.target_table and c.relkind = 'r') then
    raise exception 'Table cible de correspondance inconnue' using errcode = '23514';
  end if;
  execute format('select exists(select 1 from escen.%I where id = $1)', new.target_table) into found using new.target_id;
  if not found then raise exception 'Entité cible de correspondance absente' using errcode = '23514'; end if;
  return new;
end $$;
create trigger source_mapping_guard before insert on escen_private.source_mappings for each row execute function escen_private.guard_source_mapping();

create table escen_private.model_decisions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  question text not null,
  resolution text,
  decided_by uuid references escen.accounts(id) on delete restrict,
  decided_at timestamptz,
  check ((resolution is null and decided_at is null and decided_by is null)
    or (resolution is not null and decided_at is not null and decided_by is not null))
);
insert into escen_private.model_decisions(code, question) values
  ('ENROLLMENT_CARDINALITY','Une formation ou plusieurs formations par étudiant et année ?'),
  ('ROLE_CARDINALITY','Un rôle actif ou cumul de rôles attribués explicitement ?'),
  ('GROUP_CARDINALITY','Un seul groupe actif ou plusieurs groupes pédagogiques par inscription ?'),
  ('EXAM_ATTEMPTS','Nombre de tentatives et conditions de reprise/prolongation ?'),
  ('ABSENCE_GRADES','Traitement des absences, dispenses et étudiants sans tentative ?'),
  ('SCHOLARSHIP_RULES','Cumul, assiette, arrondi et autorité d’attribution des bourses ?'),
  ('REPEAT_CREDITS','Crédits capitalisés en redoublement et changement de maquette ?'),
  ('LEGACY_ORPHANS','Rétablir les parents depuis une autre sauvegarde ou conserver les orphelins en archive ?'),
  ('SITE_ASSIGNMENT','Quels sites existent et comment rattacher les anciens groupes/salles ?');

create table escen_private.audit_events (
  id uuid primary key default gen_random_uuid(),
  table_schema text not null,
  table_name text not null,
  entity_id uuid not null,
  action text not null check (action in ('INSERT','UPDATE')),
  actor_id uuid references escen.accounts(id) on delete restrict,
  role_codes text[] not null default '{}',
  database_actor text not null,
  reason text,
  old_value jsonb,
  new_value jsonb not null,
  happened_at timestamptz not null default clock_timestamp(),
  transaction_id bigint not null default txid_current()
);
create function escen_private.record_audit() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare previous jsonb; current_value jsonb; actor uuid; roles text[];
begin
  current_value := to_jsonb(new);
  if tg_op = 'UPDATE' then previous := to_jsonb(old); end if;
  actor := coalesce(current_value->>'actor_id',current_value->>'last_modified_by',current_value->>'entered_by',current_value->>'recorded_by',current_value->>'created_by',
    current_value->>'changed_by',current_value->>'issued_by',current_value->>'approved_by',
    current_value->>'authorized_by',current_value->>'granted_by',current_value->>'allocated_by',
    current_value->>'received_by',current_value->>'uploaded_by',current_value->>'decided_by',current_value->>'corrected_by')::uuid;
  if actor is not null then
    select coalesce(array_agg(distinct r.code), '{}') into roles from escen.role_grants g join escen.roles r on r.id = g.role_id
      where g.account_id = actor and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now());
  end if;
  insert into escen_private.audit_events(table_schema, table_name, entity_id, action, actor_id, role_codes, database_actor, reason, old_value, new_value)
    values (tg_table_schema, tg_table_name, new.id, tg_op, actor, coalesce(roles,'{}'), session_user,
      coalesce(current_value->>'reason',current_value->>'review_reason',current_value->>'withdrawal_reason'),previous,current_value);
  return new;
end $$;
create trigger audit_no_change before update or delete on escen_private.audit_events for each row execute function escen_private.immutable_record();

-- Toute table métier conserve ses lignes ; les écritures sont auditées.
do $$ declare item record;
begin
  for item in select tablename from pg_tables where schemaname = 'escen' loop
    execute format('create trigger no_delete before delete on escen.%I for each row execute function escen_private.no_delete()',item.tablename);
    execute format('create trigger audit_event after insert or update on escen.%I for each row execute function escen_private.record_audit()',item.tablename);
    execute format('alter table escen.%I enable row level security',item.tablename);
  end loop;
  for item in select tablename from pg_tables where schemaname = 'escen_private' loop
    execute format('alter table escen_private.%I enable row level security',item.tablename);
  end loop;
end $$;
do $$ declare name text;
begin
  foreach name in array array['enrollment_events','evaluation_transitions','complaint_events','grade_revisions','answer_corrections',
    'academic_rule_versions','jury_decisions','jury_grade_inputs','credit_awards','generated_documents',
    'payments','payment_reversals','receipts','payment_allocations','allocation_reversals','refunds','credit_notes',
    'document_reviews','purchase_receipts','asset_movements','expenses','fee_rates','file_objects'] loop
    execute format('create trigger immutable before update on escen.%I for each row execute function escen_private.immutable_record()',name);
  end loop;
end $$;
create trigger mappings_no_change before update or delete on escen_private.source_mappings for each row execute function escen_private.immutable_record();
create trigger legacy_no_delete before delete on escen_private.legacy_rows for each row execute function escen_private.no_delete();

-- Index sur chaque FK : les index « foreign » sans FK de l'ancien modèle
-- ne sont pas repris. Les contraintes sont celles de PostgreSQL.
do $$ declare item record;
begin
  for item in select c.oid, n.nspname, t.relname,
    string_agg(format('%I',a.attname), ', ' order by keys.position) as columns
    from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
    cross join lateral unnest(c.conkey) with ordinality as keys(attnum,position)
    join pg_attribute a on a.attrelid = t.oid and a.attnum = keys.attnum
    where c.contype = 'f' and n.nspname in ('escen','escen_private') group by c.oid,n.nspname,t.relname loop
    execute format('create index %I on %I.%I (%s)', 'fk_' || item.oid, item.nspname,item.relname,item.columns);
  end loop;
end $$;

-- Protection de l'ancien socle public via une nouvelle migration, sans
-- modifier son fichier historique ni supprimer de table ou de données.
do $$ declare name text;
begin
  foreach name in array array['academic_cycles','academic_levels','level_semesters','programs'] loop
    if to_regclass('public.' || name) is not null then
      execute format('create policy relational_transition_deny on public.%I as restrictive for all to public using (false) with check (false)',name);
    end if;
  end loop;
end $$;
revoke all on all tables in schema escen, escen_private from public;
revoke all on all functions in schema escen_private from public;
alter default privileges in schema escen, escen_private revoke all on tables from public;
alter default privileges in schema escen_private revoke execute on functions from public;
-- Aucune policy permissive : les rôles applicatifs n'accèdent à aucune donnée
-- tant que les parcours Auth, les périmètres et leurs policies ne sont pas validés.
commit;

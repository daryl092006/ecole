begin;
create table escen_private.archive_objects (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references escen_private.import_batches(id) on delete restrict,
  source_name text not null,
  kind text not null check (kind in ('BACKUP','DOCUMENT','CONFIGURATION')),
  bucket text not null,
  object_path text not null,
  byte_size bigint not null check (byte_size > 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  storage_manifest jsonb,
  uploaded_at timestamptz not null default now(),
  database_actor text not null default session_user,
  unique (bucket, object_path)
);
alter table escen_private.archive_objects enable row level security;
create index archive_batch_fk on escen_private.archive_objects(batch_id);
create trigger archives_immutable before update or delete on escen_private.archive_objects for each row execute function escen_private.immutable_record();

create table escen_private.portal_revision (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true check (singleton),
  revision bigint not null default 0 check (revision >= 0),
  changed_at timestamptz not null default now(),
  actor_id uuid references escen.accounts(id) on delete restrict,
  unique (singleton)
);
insert into escen_private.portal_revision default values;
alter table escen_private.portal_revision enable row level security;
create index portal_revision_actor_fk on escen_private.portal_revision(actor_id);

-- Passerelles du serveur Next.js uniquement. Le navigateur ne dispose jamais
-- de la clé service_role. Le serveur vérifie le JWT réel et les périmètres.
create function public.escen_account_session(p_auth_user_id uuid) returns jsonb
language sql stable security definer set search_path = pg_catalog as $$
  select jsonb_build_object('account',to_jsonb(a),'person',to_jsonb(p),
    'student',(select to_jsonb(s) from escen.students s where s.person_id = a.person_id),
    'teacher',(select to_jsonb(t) from escen.teachers t join escen.staff st on st.id = t.staff_id where st.person_id = a.person_id),
    'grants',coalesce((select jsonb_agg(to_jsonb(g) || jsonb_build_object('role_code',r.code,'role_name',r.name))
      from escen.role_grants g join escen.roles r on r.id = g.role_id
      where g.account_id = a.id and r.active and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())),'[]'),
    'permissions',coalesce((select jsonb_agg(jsonb_build_object('role_code',r.code,'permission_code',p.code))
      from escen.role_permissions rp join escen.roles r on r.id = rp.role_id join escen.permissions p on p.id = rp.permission_id),'[]'))
  from escen.accounts a join escen.people p on p.id = a.person_id
  where a.auth_user_id = p_auth_user_id and a.active;
$$;
create function public.escen_backend_snapshot() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare item record; records jsonb; result jsonb := '{}';
begin
  for item in select tablename from pg_tables where schemaname = 'escen' order by tablename loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from escen.%I t',item.tablename) into records;
    result := result || jsonb_build_object(item.tablename,records);
  end loop;
  return jsonb_build_object('revision',(select revision from escen_private.portal_revision where singleton),'tables',result);
end $$;
create function public.escen_import_overview() returns jsonb
language sql stable security definer set search_path = pg_catalog as $$
  select jsonb_build_object(
    'batches',coalesce((select jsonb_agg(to_jsonb(b)) from escen_private.import_batches b),'[]'),
    'statuses',coalesce((select jsonb_agg(to_jsonb(t)) from
      (select batch_id,status,count(*)::integer as count from escen_private.legacy_rows group by batch_id,status) t),'[]'),
    'issues',coalesce((select jsonb_agg(to_jsonb(t)) from
      (select r.source_table,i.code,count(*)::integer as count from escen_private.import_issues i
       join escen_private.legacy_rows r on r.id = i.row_id where i.resolved_at is null group by r.source_table,i.code) t),'[]'),
    'archives',coalesce((select jsonb_agg(to_jsonb(a) - 'database_actor') from escen_private.archive_objects a),'[]'));
$$;
create function public.escen_backend_transaction(p_actor_id uuid,p_expected_revision bigint,p_changes jsonb) returns bigint
language plpgsql security definer set search_path = pg_catalog as $$
declare current_revision bigint; change jsonb; payload jsonb; target text; operation text;
  columns text; selects text; assignments text; row_id uuid; attribute text; changed_rows integer;
begin
  if not exists (select 1 from escen.accounts where id = p_actor_id and active and auth_user_id is not null) then
    raise exception 'Compte applicatif actif obligatoire' using errcode = '42501';
  end if;
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) < 1 or jsonb_array_length(p_changes) > 100 then
    raise exception 'Lot de modifications invalide' using errcode = '23514';
  end if;
  select revision into current_revision from escen_private.portal_revision where singleton for update;
  if current_revision <> p_expected_revision then raise exception 'CONCURRENT_UPDATE' using errcode = '40001'; end if;
  for change in select value from jsonb_array_elements(p_changes) loop
    target := change->>'table'; operation := change->>'operation'; payload := change->'record';
    if operation not in ('insert','update') or jsonb_typeof(payload) <> 'object' or not exists
      (select 1 from pg_tables where schemaname = 'escen' and tablename = target) then
      raise exception 'Table ou opération interdite' using errcode = '42501';
    end if;
    for attribute in select key from jsonb_object_keys(payload) as keys(key) loop
      if not exists (select 1 from information_schema.columns where table_schema = 'escen' and table_name = target
        and column_name = attribute and is_generated = 'NEVER') then
        raise exception 'Attribut inconnu ou généré' using errcode = '23514';
      end if;
    end loop;
    for attribute in select column_name from information_schema.columns where table_schema = 'escen' and table_name = target
      and column_name in ('actor_id','recorded_by','created_by','changed_by','issued_by','approved_by','authorized_by','granted_by',
        'allocated_by','received_by','uploaded_by','decided_by','corrected_by','entered_by','last_modified_by') loop
      if operation = 'insert' or payload ? attribute then payload := jsonb_set(payload,array[attribute],to_jsonb(p_actor_id)); end if;
    end loop;
    row_id := (payload->>'id')::uuid;
    if operation = 'insert' then
      select string_agg(format('%I',key),',' order by key),string_agg(format('r.%I',key),',' order by key)
        into columns,selects from jsonb_object_keys(payload) as keys(key);
      execute format('insert into escen.%I(%s) select %s from jsonb_populate_record(null::escen.%I,$1) r',target,columns,selects,target) using payload;
    else
      if row_id is null then raise exception 'Identifiant obligatoire' using errcode = '23514'; end if;
      select string_agg(format('%I = r.%I',key,key),',' order by key) into assignments
        from jsonb_object_keys(payload) as keys(key) where key <> 'id';
      if assignments is null then raise exception 'Modification vide' using errcode = '23514'; end if;
      execute format('update escen.%I t set %s from jsonb_populate_record(null::escen.%I,$1) r where t.id = $2',target,assignments,target) using payload,row_id;
      get diagnostics changed_rows = row_count;
      if changed_rows = 0 then raise exception 'Entité absente' using errcode = '23503'; end if;
    end if;
  end loop;
  update escen_private.portal_revision set revision = revision + 1,changed_at = now(),actor_id = p_actor_id where singleton returning revision into current_revision;
  return current_revision;
end $$;
revoke all on all tables in schema escen_private from public;
revoke all on function public.escen_account_session(uuid),public.escen_backend_snapshot(),public.escen_import_overview(),
  public.escen_backend_transaction(uuid,bigint,jsonb) from public;
do $$ declare role_name text; signature text;
begin
  foreach signature in array array['escen_account_session(uuid)','escen_backend_snapshot()','escen_import_overview()','escen_backend_transaction(uuid,bigint,jsonb)'] loop
    foreach role_name in array array['anon','authenticated'] loop
      if exists (select 1 from pg_roles where rolname = role_name) then
        execute format('revoke all on function public.%s from %I',signature,role_name);
      end if;
    end loop;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function public.%s to service_role',signature);
    end if;
  end loop;
end $$;
commit;

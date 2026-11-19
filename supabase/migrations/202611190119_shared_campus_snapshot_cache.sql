begin;

-- Cache technique privé et reconstructible, sans données métier supplémentaires.
create unlogged table escen_private.campus_snapshot_cache (
  singleton boolean primary key default true check (singleton),
  revision bigint not null,
  refreshed_at timestamptz not null,
  snapshot jsonb not null
);
alter table escen_private.campus_snapshot_cache enable row level security;
revoke all on escen_private.campus_snapshot_cache from public;

alter function public.escen_backend_snapshot() rename to escen_backend_snapshot_before_shared_cache;
revoke all on function public.escen_backend_snapshot_before_shared_cache() from public;

create function public.escen_backend_snapshot() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare cached escen_private.campus_snapshot_cache; current_revision bigint; result jsonb;
begin
  select revision into current_revision from escen_private.portal_revision where singleton;
  select * into cached from escen_private.campus_snapshot_cache where singleton;
  if cached.revision = current_revision and cached.refreshed_at > clock_timestamp() - interval '30 seconds' then
    return cached.snapshot;
  end if;
  if not pg_try_advisory_xact_lock(781021219, 1) then
    -- Un seul constructeur ; les lecteurs réutilisent au plus deux minutes
    -- une version de même révision pendant sa reconstruction.
    if cached.revision = current_revision and cached.refreshed_at > clock_timestamp() - interval '2 minutes' then
      return cached.snapshot;
    end if;
    perform pg_advisory_xact_lock(781021219, 1);
  end if;
  select revision into current_revision from escen_private.portal_revision where singleton;
  select * into cached from escen_private.campus_snapshot_cache where singleton;
  if cached.revision = current_revision and cached.refreshed_at > clock_timestamp() - interval '30 seconds' then
    return cached.snapshot;
  end if;
  result := public.escen_backend_snapshot_before_shared_cache();
  insert into escen_private.campus_snapshot_cache(singleton, revision, refreshed_at, snapshot)
    values (true, (result->>'revision')::bigint, clock_timestamp(), result)
    on conflict (singleton) do update set revision = excluded.revision,
      refreshed_at = excluded.refreshed_at, snapshot = excluded.snapshot;
  return result;
end $$;
revoke all on function public.escen_backend_snapshot() from public;

do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists (select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on escen_private.campus_snapshot_cache from %I',role_name);
      execute format('revoke all on function public.escen_backend_snapshot_before_shared_cache() from %I',role_name);
      execute format('revoke all on function public.escen_backend_snapshot() from %I',role_name);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.escen_backend_snapshot() to service_role;
  end if;
end $$;

-- Amorçage administratif avant la reprise des appels de l'API.
select public.escen_backend_snapshot() is not null as cache_ready;
notify pgrst, 'reload schema';
commit;

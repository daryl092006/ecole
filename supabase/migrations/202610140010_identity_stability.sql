begin;
create function escen_private.stable_primary_key() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.id <> old.id then raise exception 'Identifiant immuable' using errcode = '23514'; end if;
  return new;
end $$;
do $$ declare item record;
begin
  for item in select schemaname,tablename from pg_tables where schemaname in ('escen','escen_private') loop
    execute format('create trigger stable_id before update on %I.%I for each row execute function escen_private.stable_primary_key()',item.schemaname,item.tablename);
  end loop;
end $$;
create function escen_private.guard_role_scope() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare expected_site uuid; expected_year uuid;
begin
  if new.group_id is not null then
    select site_id,academic_year_id into expected_site,expected_year from escen.groups where id = new.group_id;
    if (new.site_id is not null and new.site_id <> expected_site) or
      (new.academic_year_id is not null and new.academic_year_id <> expected_year) then
      raise exception 'Périmètre du rôle incompatible avec le groupe' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger role_scope_guard before insert or update on escen.role_grants for each row execute function escen_private.guard_role_scope();
revoke all on all functions in schema escen_private from public;
commit;

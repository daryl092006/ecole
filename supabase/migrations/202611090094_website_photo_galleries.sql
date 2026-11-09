begin;

create table escen.website_galleries (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  title text not null check(length(btrim(title)) between 3 and 180),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 180),
  subtitle text not null default '' check(length(subtitle) <= 300),
  category text not null default 'Vie étudiante' check(length(btrim(category)) between 2 and 120),
  location text not null default 'Campus principal' check(length(btrim(location)) between 2 and 160),
  cover text not null default '',
  photos jsonb not null default '[]'::jsonb check(jsonb_typeof(photos) = 'array'),
  status text not null default 'BROUILLON' check(status in ('BROUILLON','PUBLIE','RETIRE')),
  version integer not null default 1,
  published_at timestamptz,
  created_by uuid not null references escen.accounts(id) on delete restrict,
  updated_at timestamptz not null default now(),
  check(status <> 'PUBLIE' or published_at is not null)
);

create index website_gallery_year on escen.website_galleries(academic_year_id);
create index website_gallery_author on escen.website_galleries(created_by);
create index website_gallery_status_published on escen.website_galleries(status, published_at desc);

alter table escen.website_galleries enable row level security;
create trigger no_delete before delete on escen.website_galleries for each row execute function escen_private.no_delete();
create trigger audit_event after insert or update on escen.website_galleries for each row execute function escen_private.record_audit();

create or replace function public.escen_backend_snapshot_before_level_documents() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare item record; records jsonb; result jsonb := '{}';
begin
  for item in select tablename from pg_tables where schemaname='escen' and tablename not in
    ('website_articles','website_intakes','online_applications','application_documents','website_brochures','website_galleries','email_outbox') order by tablename loop
    if item.tablename='accounts' then
      select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('account_type',case
        when exists(select 1 from escen.students s where s.person_id=a.person_id) then 'student'
        when exists(select 1 from escen.staff s where s.person_id=a.person_id) or exists(
          select 1 from escen_private.source_mappings m join escen_private.legacy_rows l on l.id=m.row_id
          where m.target_table='accounts' and m.target_id=a.id and l.source_table='users') then 'staff'
        else 'unclassified' end)),'[]') into records from escen.accounts a where a.archived_at is null;
    else execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from escen.%I t',item.tablename) into records;
    end if;
    result:=result||jsonb_build_object(item.tablename,records);
  end loop;
  return jsonb_build_object('revision',(select revision from escen_private.portal_revision where singleton),'tables',result);
end $$;

create or replace function public.escen_galleries_manage(p_actor_id uuid, p_role_code text, p_action text, p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  previous escen.website_galleries;
  result escen.website_galleries;
  target uuid;
  year_id uuid;
begin
  -- Vérifie les droits de lecture communication globale (identique aux articles et brochures)
  perform public.escen_website_manage(p_actor_id, p_role_code, 'articles', '{}');
  if p_action = 'list' then
    return coalesce((select jsonb_agg(to_jsonb(g) order by g.updated_at desc) from escen.website_galleries g), '[]'::jsonb);
  end if;
  if p_action <> 'save' or not exists (
    select 1 from escen.role_grants g join escen.roles r on r.id = g.role_id
    join escen.role_permissions rp on rp.role_id = r.id join escen.permissions p on p.id = rp.permission_id
    where g.account_id = p_actor_id and r.active and r.code = p_role_code and p.code = 'communication.manage'
      and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
  ) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  year_id := coalesce(
    nullif(p_data->>'academic_year_id', '')::uuid,
    (select academic_year_id from escen.academic_working_year where singleton)
  );
  if year_id is null then
    raise exception 'Année requise' using errcode = '23514';
  end if;
  target := coalesce((p_data->>'id')::uuid, gen_random_uuid());
  select * into previous from escen.website_galleries where id = target for update;
  if p_data ? 'id' and previous.id is null then
    raise exception 'Galerie absente' using errcode = 'P0002';
  end if;
  if previous.id is not null and previous.version is distinct from (p_data->>'version')::integer then
    raise exception 'Modification concurrente' using errcode = 'PT409';
  end if;
  perform set_config('escen.actor_id', p_actor_id::text, true);
  insert into escen.website_galleries(
    id, academic_year_id, title, slug, subtitle, category, location, cover, photos, status, published_at, created_by
  ) values (
    target,
    coalesce(previous.academic_year_id, year_id),
    p_data->>'title',
    p_data->>'slug',
    coalesce(p_data->>'subtitle', ''),
    coalesce(nullif(btrim(p_data->>'category'), ''), 'Vie étudiante'),
    coalesce(nullif(btrim(p_data->>'location'), ''), 'Campus principal'),
    coalesce(p_data->>'cover', ''),
    coalesce(p_data->'photos', '[]'::jsonb),
    p_data->>'status',
    case when p_data->>'status' = 'PUBLIE' then now() end,
    p_actor_id
  )
  on conflict (id) do update set
    title = excluded.title,
    slug = excluded.slug,
    subtitle = excluded.subtitle,
    category = excluded.category,
    location = excluded.location,
    cover = excluded.cover,
    photos = excluded.photos,
    status = excluded.status,
    version = escen.website_galleries.version + 1,
    published_at = case
      when excluded.status = 'PUBLIE' then coalesce(escen.website_galleries.published_at, now())
      else escen.website_galleries.published_at
    end,
    updated_at = now()
  returning * into result;
  return to_jsonb(result);
end $$;

create or replace function public.escen_galleries_public(p_slug text default null) returns jsonb
language sql security definer set search_path = pg_catalog as $$
  select coalesce(
    jsonb_agg(
      to_jsonb(g) - 'created_by'
      order by g.published_at desc nulls last, g.updated_at desc
    ),
    '[]'::jsonb
  )
  from escen.website_galleries g
  where g.status = 'PUBLIE'
    and (p_slug is null or g.slug = p_slug or g.id::text = p_slug);
$$;

revoke all on function public.escen_galleries_manage(uuid,text,text,jsonb), public.escen_galleries_public(text) from public;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function public.escen_galleries_manage(uuid,text,text,jsonb), public.escen_galleries_public(text) from %I', r);
      execute format('revoke all on table escen.website_galleries from %I', r);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.escen_galleries_manage(uuid,text,text,jsonb), public.escen_galleries_public(text) to service_role;
  end if;
end $$;

commit;


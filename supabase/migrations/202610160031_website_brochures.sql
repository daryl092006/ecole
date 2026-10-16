begin;
create table escen.website_brochures (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  title text not null check(length(btrim(title)) between 3 and 180),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=180),
  description text not null default '' check(length(description)<=500),
  status text not null default 'BROUILLON' check(status in ('BROUILLON','PUBLIE','RETIRE')),
  object_path text not null unique, filename text not null,
  byte_size integer not null check(byte_size between 1 and 10485760),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  version integer not null default 1,
  created_by uuid not null references escen.accounts(id) on delete restrict,
  updated_at timestamptz not null default now(),
  reason text not null check(length(btrim(reason))>=3)
);
create index website_brochure_year on escen.website_brochures(academic_year_id);
create index website_brochure_author on escen.website_brochures(created_by);
alter table escen.website_brochures enable row level security;
create trigger no_delete before delete on escen.website_brochures for each row execute function escen_private.no_delete();
create trigger audit_event after insert or update on escen.website_brochures for each row execute function escen_private.record_audit();
create or replace function public.escen_backend_snapshot() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare item record; records jsonb; result jsonb := '{}';
begin
  for item in select tablename from pg_tables where schemaname='escen' and tablename not in ('website_articles','website_intakes','online_applications','application_documents','website_brochures') order by tablename loop
    if item.tablename = 'accounts' then
      select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object('account_type',case
        when exists(select 1 from escen.students s where s.person_id=a.person_id) then 'student'
        when exists(select 1 from escen.staff s where s.person_id=a.person_id) or exists(
          select 1 from escen_private.source_mappings m join escen_private.legacy_rows l on l.id=m.row_id
          where m.target_table='accounts' and m.target_id=a.id and l.source_table='users') then 'staff'
        else 'unclassified' end)),'[]') into records from escen.accounts a where a.archived_at is null;
    else
      execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from escen.%I t',item.tablename) into records;
    end if;
    result := result || jsonb_build_object(item.tablename,records);
  end loop;
  return jsonb_build_object('revision',(select revision from escen_private.portal_revision where singleton),'tables',result);
end $$;


create function public.escen_brochures_manage(p_actor_id uuid,p_role_code text,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare previous escen.website_brochures; result escen.website_brochures; target uuid; year_id uuid;
begin
  -- Same real account and global communication scope as articles.
  perform public.escen_website_manage(p_actor_id,p_role_code,'articles','{}');
  if p_action='list' then
    return coalesce((select jsonb_agg(to_jsonb(b)-'object_path'-'sha256' order by updated_at desc) from escen.website_brochures b),'[]');
  end if;
  if p_action<>'save' or not exists (
    select 1 from escen.role_grants g join escen.roles r on r.id=g.role_id
    join escen.role_permissions rp on rp.role_id=r.id join escen.permissions p on p.id=rp.permission_id
    where g.account_id=p_actor_id and r.active and r.code=p_role_code and p.code='communication.manage'
    and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
    and g.site_id is null and g.group_id is null and g.academic_year_id is null
  ) then raise exception 'Accès refusé' using errcode='42501'; end if;
  year_id:=nullif(p_data->>'academic_year_id','')::uuid;
  if year_id is null then raise exception 'Année requise' using errcode='23514'; end if;
  target:=coalesce((p_data->>'id')::uuid,gen_random_uuid());
  select * into previous from escen.website_brochures where id=target for update;
  if p_data ? 'id' and previous.id is null then raise exception 'Brochure absente' using errcode='P0002'; end if;
  if previous.id is not null and (previous.version is distinct from (p_data->>'version')::integer or previous.academic_year_id<>year_id) then
    raise exception 'Version concurrente ou année incompatible' using errcode='40001';
  end if;
  perform set_config('escen.actor_id',p_actor_id::text,true);
  insert into escen.website_brochures(id,academic_year_id,title,slug,description,status,object_path,filename,byte_size,sha256,created_by,reason)
  values(target,year_id,p_data->>'title',p_data->>'slug',p_data->>'description',p_data->>'status',
    coalesce(p_data->>'object_path',previous.object_path),coalesce(p_data->>'filename',previous.filename),
    coalesce((p_data->>'byte_size')::integer,previous.byte_size),coalesce(p_data->>'sha256',previous.sha256),p_actor_id,p_data->>'reason')
  on conflict(id) do update set title=excluded.title,slug=excluded.slug,description=excluded.description,status=excluded.status,
    object_path=excluded.object_path,filename=excluded.filename,byte_size=excluded.byte_size,sha256=excluded.sha256,
    version=escen.website_brochures.version+1,updated_at=now(),reason=excluded.reason returning * into result;
  return to_jsonb(result)-'object_path'-'sha256';
end $$;
create function public.escen_brochures_public(p_slug text default null) returns jsonb
language sql security definer set search_path=pg_catalog as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'title',b.title,'slug',b.slug,'description',b.description,
    'filename',b.filename,'byte_size',b.byte_size) || case when p_slug is not null then jsonb_build_object('object_path',b.object_path) else '{}'::jsonb end order by b.updated_at desc),'[]')
  from escen.website_brochures b join escen.academic_working_year y on y.academic_year_id=b.academic_year_id
  where y.singleton and b.status='PUBLIE' and (p_slug is null or b.slug=p_slug);
$$;
revoke all on function public.escen_brochures_manage(uuid,text,text,jsonb),public.escen_brochures_public(text) from public;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=r) then
      execute format('revoke all on function public.escen_brochures_manage(uuid,text,text,jsonb),public.escen_brochures_public(text) from %I',r);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.escen_brochures_manage(uuid,text,text,jsonb),public.escen_brochures_public(text) to service_role;
  end if;
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
    values('escen-website-brochures','escen-website-brochures',false,10485760,array['application/pdf']) on conflict(id) do nothing;
  end if;
end $$;
commit;

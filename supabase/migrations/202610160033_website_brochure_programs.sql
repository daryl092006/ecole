begin;
-- A brochure describes one formation of the site: an existing filière and a diploma cycle.
-- Both stay optional so that a general ESCEN brochure remains possible.
alter table escen.website_brochures
  add column program_id uuid references escen.programs(id) on delete restrict,
  add column cycle text check (cycle in ('LICENCE','MASTER','EXECUTIVE')),
  add constraint website_brochure_formation check ((program_id is null) = (cycle is null));
create index website_brochure_program on escen.website_brochures(program_id);
-- Only one published brochure per formation and year, so the site never has to guess.
create unique index website_brochure_published_formation on escen.website_brochures(academic_year_id,program_id,cycle)
  where status='PUBLIE' and program_id is not null;

create or replace function public.escen_brochures_manage(p_actor_id uuid,p_role_code text,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare previous escen.website_brochures; result escen.website_brochures; target uuid; year_id uuid; program uuid; cycle_code text;
begin
  -- Same real account and global communication scope as articles.
  perform public.escen_website_manage(p_actor_id,p_role_code,'articles','{}');
  if p_action='list' then
    return coalesce((select jsonb_agg(to_jsonb(b)-'object_path'-'sha256' || jsonb_build_object('program_name',p.name,'program_code',p.code) order by b.updated_at desc)
      from escen.website_brochures b left join escen.programs p on p.id=b.program_id),'[]');
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
  program:=nullif(p_data->>'program_id','')::uuid;
  cycle_code:=nullif(p_data->>'cycle','');
  if program is not null and not exists(select 1 from escen.programs where id=program and active and archived_at is null) then
    raise exception 'Filière absente ou inactive' using errcode='23503';
  end if;
  target:=coalesce((p_data->>'id')::uuid,gen_random_uuid());
  select * into previous from escen.website_brochures where id=target for update;
  if p_data ? 'id' and previous.id is null then raise exception 'Brochure absente' using errcode='P0002'; end if;
  if previous.id is not null and (previous.version is distinct from (p_data->>'version')::integer or previous.academic_year_id<>year_id) then
    raise exception 'Version concurrente ou année incompatible' using errcode='40001';
  end if;
  if p_data->>'status'='PUBLIE' and program is not null and exists(select 1 from escen.website_brochures b where b.academic_year_id=year_id
    and b.program_id=program and b.cycle=cycle_code and b.status='PUBLIE' and b.id<>target) then
    raise exception 'Une brochure est déjà publiée pour cette formation ; retirez-la d’abord' using errcode='23505';
  end if;
  perform set_config('escen.actor_id',p_actor_id::text,true);
  insert into escen.website_brochures(id,academic_year_id,title,slug,description,status,object_path,filename,byte_size,sha256,created_by,reason,program_id,cycle)
  values(target,year_id,p_data->>'title',p_data->>'slug',p_data->>'description',p_data->>'status',
    coalesce(p_data->>'object_path',previous.object_path),coalesce(p_data->>'filename',previous.filename),
    coalesce((p_data->>'byte_size')::integer,previous.byte_size),coalesce(p_data->>'sha256',previous.sha256),p_actor_id,p_data->>'reason',program,cycle_code)
  on conflict(id) do update set title=excluded.title,slug=excluded.slug,description=excluded.description,status=excluded.status,
    object_path=excluded.object_path,filename=excluded.filename,byte_size=excluded.byte_size,sha256=excluded.sha256,
    program_id=excluded.program_id,cycle=excluded.cycle,
    version=escen.website_brochures.version+1,updated_at=now(),reason=excluded.reason returning * into result;
  return to_jsonb(result)-'object_path'-'sha256';
end $$;

create or replace function public.escen_brochures_public(p_slug text default null) returns jsonb
language sql security definer set search_path=pg_catalog as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'title',b.title,'slug',b.slug,'description',b.description,
    'filename',b.filename,'byte_size',b.byte_size,'program_code',p.code,'program_name',p.name,'cycle',b.cycle)
    || case when p_slug is not null then jsonb_build_object('object_path',b.object_path) else '{}'::jsonb end order by b.cycle nulls last,p.name,b.updated_at desc),'[]')
  from escen.website_brochures b join escen.academic_working_year y on y.academic_year_id=b.academic_year_id
  left join escen.programs p on p.id=b.program_id
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
end $$;
commit;

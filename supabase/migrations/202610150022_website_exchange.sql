begin;
-- Separate public-site submissions from official enrollments and accounts.
create table escen.website_articles (
  id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 3 and 180),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), excerpt text not null,
  content text not null, image text not null default '',
  status text not null default 'BROUILLON' check(status in ('BROUILLON','PUBLIE','RETIRE')),
  version integer not null default 1, published_at timestamptz,
  created_by uuid not null references escen.accounts(id) on delete restrict,
  updated_at timestamptz not null default now(), reason text not null,
  check(status <> 'PUBLIE' or published_at is not null)
);
create table escen.website_intakes (
  id uuid primary key default gen_random_uuid(), level_id uuid not null references escen.levels(id) on delete restrict,
  program_id uuid not null references escen.programs(id) on delete restrict,
  label text not null, active boolean not null default false,
  required_documents jsonb not null default '[]' check(jsonb_typeof(required_documents)='array'),
  version integer not null default 1, reason text not null,
  unique(level_id,program_id)
);
create table escen.online_applications (
  id uuid primary key default gen_random_uuid(), reference text not null unique,
  identity jsonb not null check(jsonb_typeof(identity)='object' and length(coalesce(identity->>'nom',''))>0 and length(coalesce(identity->>'prenom',''))>0 and length(coalesce(identity->>'email',''))>0),
  diploma jsonb not null default '{}' check(jsonb_typeof(diploma)='object'), guardians jsonb not null default '[]' check(jsonb_typeof(guardians)='array'),
  intake_id uuid references escen.website_intakes(id) on delete restrict,
  status text not null default 'BROUILLON' check(status in ('BROUILLON','RECU','EN_ANALYSE','CLASSE')),
  version integer not null default 1, created_at timestamptz not null default now(),
  submitted_at timestamptz, reason text not null default 'Dossier commencé sur le site',
  check(status='BROUILLON' or (submitted_at is not null and intake_id is not null))
);
create table escen.application_documents (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references escen.online_applications(id) on delete restrict,
  document_key text not null, filename text not null, mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),
  byte_size integer not null check(byte_size between 1 and 5242880),
  bucket text not null check(bucket='escen-online-applications'), object_path text not null unique,
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'), created_at timestamptz not null default now(),
  reason text not null default 'Pièce reçue depuis le site'
);
create table escen_private.application_access (
  id uuid primary key references escen.online_applications(id) on delete restrict,
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null default now()+interval '7 days'
);
create table escen_private.website_rate_limits (
  key text primary key, started_at timestamptz not null default now(), requests integer not null default 1
);
alter table escen_private.application_access enable row level security;
alter table escen_private.website_rate_limits enable row level security;
create index website_application_intake_fk on escen.online_applications(intake_id);
create index website_document_application_fk on escen.application_documents(application_id);
create index website_intake_level_fk on escen.website_intakes(level_id);
create index website_intake_program_fk on escen.website_intakes(program_id);
create index website_article_author_fk on escen.website_articles(created_by);
create index website_application_received on escen.online_applications(submitted_at desc);

do $$ declare name text; begin
  foreach name in array array['website_articles','website_intakes','online_applications','application_documents'] loop
    execute format('alter table escen.%I enable row level security',name);
    execute format('create trigger no_delete before delete on escen.%I for each row execute function escen_private.no_delete()',name);
    execute format('create trigger audit_event after insert or update on escen.%I for each row execute function escen_private.record_audit()',name);
  end loop;
end $$;
create trigger immutable before update on escen.application_documents for each row execute function escen_private.immutable_record();
-- These domains must be accessed through their dedicated endpoints, not the campus snapshot.
create or replace function public.escen_backend_snapshot() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare item record; records jsonb; result jsonb := '{}';
begin
  for item in select tablename from pg_tables where schemaname='escen' and tablename not in ('website_articles','website_intakes','online_applications','application_documents') order by tablename loop
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

create function public.escen_website_rate(p_key text,p_limit integer) returns boolean
language plpgsql security definer set search_path=pg_catalog as $$
declare n integer;
begin
  if length(p_key)<>64 or p_limit not between 1 and 300 then raise exception 'Limite invalide'; end if;
  insert into escen_private.website_rate_limits(key) values(p_key)
  on conflict(key) do update set requests=case when escen_private.website_rate_limits.started_at < now()-interval '1 hour' then 1 else escen_private.website_rate_limits.requests+1 end,
    started_at=case when escen_private.website_rate_limits.started_at < now()-interval '1 hour' then now() else escen_private.website_rate_limits.started_at end returning requests into n;
  return n<=p_limit;
end $$;
create function public.escen_website_public(p_action text,p_token_hash text default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare a escen.online_applications; i escen.website_intakes; doc jsonb; result jsonb;
begin
  if p_action='articles' then
    return coalesce((select jsonb_agg(to_jsonb(t) - 'created_by' - 'reason' order by t.published_at desc) from escen.website_articles t where status='PUBLIE'),'[]');
  elsif p_action='intakes' then
    return coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'level_id',t.level_id,'program_id',t.program_id,'label',t.label,'required_documents',t.required_documents,'level_name',l.name,'program_name',p.name)) from escen.website_intakes t join escen.levels l on l.id=t.level_id join escen.programs p on p.id=t.program_id where t.active and l.archived_at is null and p.archived_at is null),'[]');
  end if;
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Jeton invalide' using errcode='42501'; end if;
  if p_action='create' then
    insert into escen.online_applications(reference,identity) values('WEB-'||upper(replace(gen_random_uuid()::text,'-','')),p_data) returning * into a;
    insert into escen_private.application_access(id,token_hash) values(a.id,p_token_hash);
    return jsonb_build_object('id',a.id,'reference',a.reference);
  end if;
  select t.* into a from escen.online_applications t join escen_private.application_access x on x.id=t.id where x.token_hash=p_token_hash and x.expires_at>now() for update of t;
  if a.id is null then raise exception 'Brouillon introuvable ou expiré' using errcode='P0002'; end if;
  if p_action='submit' and a.status in ('RECU','EN_ANALYSE','CLASSE') then return jsonb_build_object('reference',a.reference,'status',a.status); end if;
  if a.status<>'BROUILLON' then raise exception 'Dossier déjà envoyé' using errcode='23514'; end if;
  if p_action='draft' then
    return jsonb_build_object('id',a.id,'reference',a.reference,'documents',coalesce((select jsonb_agg(jsonb_build_object('document_key',document_key,'filename',filename)) from escen.application_documents where application_id=a.id),'[]'),'candidat',a.identity||a.diploma||coalesce((select jsonb_build_object('niveau_id',level_id,'filiere_id',program_id) from escen.website_intakes where id=a.intake_id),'{}'));
  elsif p_action='identity' then update escen.online_applications set identity=p_data,version=version+1 where id=a.id;
  elsif p_action='diploma' then update escen.online_applications set diploma=p_data,version=version+1 where id=a.id;
  elsif p_action='documents' then
    select * into i from escen.website_intakes where level_id=(p_data->>'niveau_id')::uuid and program_id=(p_data->>'filiere_id')::uuid and active;
    if i.id is null or not exists(select 1 from escen.levels where id=i.level_id and archived_at is null) or not exists(select 1 from escen.programs where id=i.program_id and archived_at is null) then raise exception 'Formation fermée ou absente' using errcode='23514'; end if;
    if (select count(*) from escen.application_documents where application_id=a.id)+jsonb_array_length(p_data->'documents')>24 then raise exception 'Trop de pièces' using errcode='23514'; end if;
    for doc in select value from jsonb_array_elements(p_data->'documents') loop
      if doc->>'object_path' not like a.id::text||'/%' then raise exception 'Pièce hors dossier' using errcode='23514'; end if;
      insert into escen.application_documents(id,application_id,document_key,filename,mime_type,byte_size,bucket,object_path,sha256)
      values((doc->>'id')::uuid,a.id,doc->>'document_key',doc->>'filename',doc->>'mime_type',(doc->>'byte_size')::integer,'escen-online-applications',doc->>'object_path',doc->>'sha256');
    end loop;
    update escen.online_applications set intake_id=i.id,version=version+1 where id=a.id;
  elsif p_action='submit' then
    select * into i from escen.website_intakes where id=a.intake_id and active;
    if i.id is null or not exists(select 1 from escen.levels where id=i.level_id and archived_at is null) or not exists(select 1 from escen.programs where id=i.program_id and archived_at is null) or coalesce(a.diploma->>'type_diplome_id','')='' or coalesce(p_data->>'accept_cgu','')<>'1' or coalesce(jsonb_array_length(p_data->'tuteurs'),0)<1 then raise exception 'Dossier incomplet ou formation fermée' using errcode='23514'; end if;
    if exists(select 1 from jsonb_array_elements_text(i.required_documents) k where not exists(select 1 from escen.application_documents d where d.application_id=a.id and d.document_key=k)) then raise exception 'Pièces obligatoires absentes' using errcode='23514'; end if;
    update escen.online_applications set guardians=p_data->'tuteurs',status='RECU',submitted_at=now(),version=version+1,reason='Consentement et envoi confirmés sur le site' where id=a.id;
    return jsonb_build_object('reference',a.reference,'status','RECU');
  else raise exception 'Commande inconnue' using errcode='42501'; end if;
  return jsonb_build_object('id',a.id,'reference',a.reference);
end $$;
create function public.escen_website_manage(p_actor_id uuid,p_role_code text,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare can_read boolean; can_write boolean; articles boolean; previous escen.website_articles; intake escen.website_intakes; application escen.online_applications; target uuid; result jsonb;
begin
  articles:=p_action like 'article%';
  select exists(select 1 from escen.accounts a join escen.role_grants g on g.account_id=a.id join escen.roles r on r.id=g.role_id join escen.role_permissions rp on rp.role_id=r.id join escen.permissions p on p.id=rp.permission_id
    where a.id=p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null and r.active and r.code=p_role_code and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()) and g.site_id is null and g.group_id is null and g.academic_year_id is null
    and p.code=case when articles then 'communication.view' else 'student.view' end and (articles or r.code in ('DG','DGA','DA','LOG','RAF','IT'))) into can_read;
  select exists(select 1 from escen.role_grants g join escen.roles r on r.id=g.role_id join escen.role_permissions rp on rp.role_id=r.id join escen.permissions p on p.id=rp.permission_id
    where g.account_id=p_actor_id and r.active and r.code=p_role_code and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()) and g.site_id is null and g.group_id is null and g.academic_year_id is null and p.code=case when articles then 'communication.manage' else 'student.lifecycle.manage' end) into can_write;
  if not can_read then raise exception 'Accès refusé' using errcode='42501'; end if;
  if p_action='articles' then return coalesce((select jsonb_agg(to_jsonb(t) order by updated_at desc) from escen.website_articles t),'[]'); end if;
  if p_action='admissions' then return jsonb_build_object(
    'applications',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('intake_label',i.label,'documents',coalesce((select jsonb_agg(to_jsonb(d)-'bucket'-'object_path'-'sha256') from escen.application_documents d where d.application_id=a.id),'[]')) order by a.created_at desc) from escen.online_applications a left join escen.website_intakes i on i.id=a.intake_id where a.status<>'BROUILLON'),'[]'),
    'intakes',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('level_name',l.name,'program_name',p.name)) from escen.website_intakes i join escen.levels l on l.id=i.level_id join escen.programs p on p.id=i.program_id),'[]'),
    'levels',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from escen.levels where archived_at is null),'[]'),
    'programs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from escen.programs where archived_at is null),'[]')); end if;
  if p_action='document' then
    select to_jsonb(d) into result from escen.application_documents d join escen.online_applications a on a.id=d.application_id where d.id=(p_data->>'id')::uuid and a.status<>'BROUILLON';
    return result;
  end if;
  if not can_write or length(btrim(coalesce(p_data->>'reason','')))<3 then raise exception 'Droits ou motif insuffisants' using errcode='42501'; end if;
  perform set_config('escen.actor_id',p_actor_id::text,true);
  target:=coalesce((p_data->>'id')::uuid,gen_random_uuid());
  if p_action='article-save' then
    select * into previous from escen.website_articles where id=target for update;
    if previous.id is not null and previous.version<>(p_data->>'version')::integer then raise exception 'Modification concurrente' using errcode='40001'; end if;
    if p_data ? 'id' and previous.id is null then raise exception 'Article absent' using errcode='P0002'; end if;
    insert into escen.website_articles(id,title,slug,excerpt,content,image,status,created_by,published_at,reason)
      values(target,p_data->>'title',p_data->>'slug',p_data->>'excerpt',p_data->>'content',p_data->>'image',p_data->>'status',p_actor_id,case when p_data->>'status'='PUBLIE' then now() end,p_data->>'reason')
      on conflict(id) do update set title=excluded.title,slug=excluded.slug,excerpt=excluded.excerpt,content=excluded.content,image=excluded.image,status=excluded.status,
        version=escen.website_articles.version+1,published_at=case when excluded.status='PUBLIE' then coalesce(escen.website_articles.published_at,now()) else escen.website_articles.published_at end,updated_at=now(),reason=excluded.reason;
  elsif p_action='intake-save' then
    if not exists(select 1 from escen.levels where id=(p_data->>'level_id')::uuid and archived_at is null) or not exists(select 1 from escen.programs where id=(p_data->>'program_id')::uuid and archived_at is null) then raise exception 'Référence archivée ou absente' using errcode='23514'; end if;
    select * into intake from escen.website_intakes where id=target for update;
    if p_data ? 'id' and (intake.id is null or intake.version<>(p_data->>'version')::integer) then raise exception 'Modification concurrente' using errcode='40001'; end if;
    if intake.id is not null and (intake.level_id<>(p_data->>'level_id')::uuid or intake.program_id<>(p_data->>'program_id')::uuid) then raise exception 'Les références de la formation sont figées' using errcode='23514'; end if;
    insert into escen.website_intakes(id,level_id,program_id,label,active,required_documents,reason) values(target,(p_data->>'level_id')::uuid,(p_data->>'program_id')::uuid,p_data->>'label',(p_data->>'active')::boolean,p_data->'required_documents',p_data->>'reason')
      on conflict(id) do update set label=excluded.label,active=excluded.active,required_documents=excluded.required_documents,version=escen.website_intakes.version+1,reason=excluded.reason;
  elsif p_action='application-status' then
    select * into application from escen.online_applications where id=target for update;
    if application.id is null or application.status='BROUILLON' then raise exception 'Dossier absent' using errcode='P0002'; end if;
    if application.version<>(p_data->>'version')::integer then raise exception 'Modification concurrente' using errcode='40001'; end if;
    if p_data->>'status' not in ('EN_ANALYSE','CLASSE','RECU') then raise exception 'Statut invalide' using errcode='23514'; end if;
    update escen.online_applications set status=p_data->>'status',version=version+1,reason=p_data->>'reason' where id=target;
  else raise exception 'Commande inconnue' using errcode='42501'; end if;
  return jsonb_build_object('id',target);
end $$;
-- Only server endpoints may invoke these RPCs. No anonymous RLS policy is added.
do $$ declare signature text; name text; begin
  foreach signature in array array['public.escen_website_rate(text,integer)','public.escen_website_public(text,text,jsonb)','public.escen_website_manage(uuid,text,text,jsonb)'] loop
    execute 'revoke all on function '||signature||' from public';
    foreach name in array array['anon','authenticated'] loop
      if exists(select 1 from pg_roles where rolname=name) then execute 'revoke all on function '||signature||' from '||quote_ident(name); end if;
    end loop;
    if exists(select 1 from pg_roles where rolname='service_role') then execute 'grant execute on function '||signature||' to service_role'; end if;
  end loop;
  if to_regclass('storage.buckets') is not null then
    execute $q$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('escen-online-applications','escen-online-applications',false,5242880,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing$q$;
  end if;
end $$;
commit;

begin;

-- Les copies existantes restent hors du mode strict.
alter table escen.exam_attempts add column strict_mode boolean not null default false;

create table escen_private.exam_integrity_activation (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null unique default true check(singleton),
  activated_at timestamptz not null default 'infinity'::timestamptz,
  reason text not null default 'Préparation du mode strict ; activation après déploiement et vérification de l’interface'
);
alter table escen_private.exam_integrity_activation enable row level security;
revoke all on escen_private.exam_integrity_activation from public;
create trigger audit_event after insert or update on escen_private.exam_integrity_activation
  for each row execute function escen_private.record_audit();
insert into escen_private.exam_integrity_activation(singleton) values(true);

create table escen.exam_integrity_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references escen.exam_attempts(id) on delete restrict,
  client_event_id uuid not null,
  kind text not null check(kind in (
    'RULES_ACCEPTED','FULLSCREEN_EXIT','WINDOW_HIDDEN','WINDOW_RETURNED',
    'FOCUS_LOST','FOCUS_RETURNED','COPY_BLOCKED','CUT_BLOCKED','PASTE_BLOCKED',
    'PRINT_BLOCKED','CONTEXT_MENU_BLOCKED','CAPTURE_SHORTCUT'
  )),
  observed_at timestamptz,
  received_at timestamptz not null default clock_timestamp(),
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  role_code text not null check(role_code in ('STUD','DEL')),
  reason text not null check(length(reason) between 3 and 1000),
  unique(attempt_id,client_event_id)
);
create index exam_integrity_events_attempt_received on escen.exam_integrity_events(attempt_id,received_at desc);
create index exam_integrity_events_actor on escen.exam_integrity_events(actor_id);
create unique index exam_integrity_rules_once on escen.exam_integrity_events(attempt_id) where kind='RULES_ACCEPTED';
alter table escen.exam_integrity_events enable row level security;
create trigger immutable_record before update or delete on escen.exam_integrity_events
  for each row execute function escen_private.immutable_record();
create trigger audit_event after insert or update on escen.exam_integrity_events
  for each row execute function escen_private.record_audit();
revoke all on escen.exam_integrity_events from public;

create function escen_private.set_attempt_integrity_mode() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
  select coalesce(d.access_opens_at>=s.activated_at,false) into new.strict_mode
    from escen.exam_deliveries d cross join escen_private.exam_integrity_activation s
    where d.evaluation_id=new.evaluation_id and s.singleton;
  new.strict_mode:=coalesce(new.strict_mode,false);
  return new;
end $$;
-- Après attempt_guard : le contexte et le délai restent calculés par les gardes existantes.
create trigger zz_attempt_integrity_mode before insert on escen.exam_attempts
  for each row execute function escen_private.set_attempt_integrity_mode();
revoke all on function escen_private.set_attempt_integrity_mode() from public;

alter function escen_private.exam_attempt_view(uuid) rename to exam_attempt_view_before_integrity;
create function escen_private.exam_attempt_view(p_attempt_id uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
  select escen_private.exam_attempt_view_before_integrity(p_attempt_id)
    ||jsonb_build_object('strictMode',coalesce((select strict_mode from escen.exam_attempts where id=p_attempt_id),false));
$$;
revoke all on function escen_private.exam_attempt_view(uuid) from public;
revoke all on function escen_private.exam_attempt_view_before_integrity(uuid) from public;

-- Préserve le corps et les droits de la RPC existante, et enrichit uniquement l'annuaire.
do $directory$
declare definition text; marker text := '''durationMinutes'', d.duration_minutes,';
begin
  definition:=pg_get_functiondef('public.escen_online_exam(uuid,text,text,uuid,uuid,uuid,bigint,uuid,jsonb)'::regprocedure);
  if position(marker in definition)=0 then raise exception 'Annuaire des épreuves non reconnu'; end if;
  definition:=replace(definition,marker,marker||E'\n      ''strictMode'', coalesce(a.strict_mode,d.access_opens_at >= (select activated_at from escen_private.exam_integrity_activation where singleton)),');
  execute definition;
end $directory$;

create function public.escen_start_online_exam_checked(
  p_actor_id uuid,p_role_code text,p_evaluation_id uuid,p_integrity_accepted boolean default false
) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb; attempt uuid; previous_actor text;
begin
  if p_role_code not in ('STUD','DEL') then raise exception 'Rôle étudiant personnel requis' using errcode='42501'; end if;
  -- La RPC existante vérifie compte, rôle, année, groupe, inscription et admissibilité.
  result:=public.escen_online_exam(p_actor_id,p_role_code,'start',p_evaluation_id=>p_evaluation_id);
  if coalesce((result->>'strictMode')::boolean,false) then
    if not coalesce(p_integrity_accepted,false) then
      -- Toute création de copie dans cet appel est annulée avec la transaction.
      raise exception 'Les règles du mode strict doivent être acceptées avant de commencer' using errcode='23514';
    end if;
    attempt:=(result#>>'{attempt,id}')::uuid;
    previous_actor:=current_setting('escen.actor_id',true);
    perform set_config('escen.actor_id',p_actor_id::text,true);
    insert into escen.exam_integrity_events(attempt_id,client_event_id,kind,actor_id,role_code,reason)
      values(attempt,gen_random_uuid(),'RULES_ACCEPTED',p_actor_id,p_role_code,
        'Acceptation des règles : plein écran, restrictions de copie et journal des incidents ; sauvegarde automatique maintenue')
      on conflict do nothing;
    perform set_config('escen.actor_id',coalesce(previous_actor,''),true);
  end if;
  return result;
end $$;
revoke all on function public.escen_start_online_exam_checked(uuid,text,uuid,boolean) from public;

create function public.escen_record_exam_integrity_events(
  p_actor_id uuid,p_role_code text,p_attempt_id uuid,p_events jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare attempt escen.exam_attempts; item jsonb; inserted integer:=0; changed integer;
  current_count integer; previous_actor text; label text;
begin
  if p_role_code not in ('STUD','DEL') then raise exception 'Rôle étudiant personnel requis' using errcode='42501'; end if;
  select a.* into attempt from escen.exam_attempts a
    join escen.evaluation_candidates c on c.id=a.candidate_id
    join escen.enrollments n on n.id=c.enrollment_id
    join escen.students s on s.id=n.student_id
    join escen.accounts account on account.person_id=s.person_id
    join escen.academic_offerings o on o.id=n.offering_id
    join escen.evaluations e on e.id=a.evaluation_id
    join escen.teaching_assignments t on t.id=e.assignment_id
    where a.id=p_attempt_id and account.id=p_actor_id and account.active and account.archived_at is null
      and a.strict_mode and exists(
        select 1 from escen.role_grants g join escen.roles r on r.id=g.role_id
          join escen.role_permissions rp on rp.role_id=r.id join escen.permissions permission on permission.id=rp.permission_id
        where g.account_id=account.id and r.code=p_role_code and r.active and permission.code='exam.take'
          and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
          and (g.site_id is null or g.site_id=o.site_id)
          and (g.academic_year_id is null or g.academic_year_id=o.academic_year_id)
          and (g.group_id is null or g.group_id=t.group_id)
      ) for update of a;
  if attempt.id is null then raise exception 'Journal de cette copie inaccessible' using errcode='42501'; end if;
  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>20 then
    raise exception 'Lot de journal invalide' using errcode='23514';
  end if;
  if attempt.status<>'EN_COURS' and clock_timestamp()>coalesce(attempt.submitted_at,attempt.deadline_at)+interval '5 minutes' then
    return jsonb_build_object('accepted',jsonb_array_length(p_events),'recorded',0,'closed',true);
  end if;
  select count(*) into current_count from escen.exam_integrity_events where attempt_id=attempt.id;
  previous_actor:=current_setting('escen.actor_id',true);
  perform set_config('escen.actor_id',p_actor_id::text,true);
  for item in select value from jsonb_array_elements(p_events) loop
    if jsonb_typeof(item) is distinct from 'object' or item-array['id','kind','observedAt']<>'{}'::jsonb
      or item->>'kind' not in ('FULLSCREEN_EXIT','WINDOW_HIDDEN','WINDOW_RETURNED','FOCUS_LOST','FOCUS_RETURNED',
        'COPY_BLOCKED','CUT_BLOCKED','PASTE_BLOCKED','PRINT_BLOCKED','CONTEXT_MENU_BLOCKED','CAPTURE_SHORTCUT')
      or item->>'kind' is null or item->>'id' is null then
      raise exception 'Événement invalide' using errcode='23514';
    end if;
    if current_count+inserted>=1000 then exit; end if;
    label:=case item->>'kind'
      when 'FULLSCREEN_EXIT' then 'Sortie du plein écran'
      when 'WINDOW_HIDDEN' then 'Épreuve passée en arrière-plan'
      when 'WINDOW_RETURNED' then 'Retour dans la page de l’épreuve'
      when 'FOCUS_LOST' then 'Fenêtre de l’épreuve désactivée'
      when 'FOCUS_RETURNED' then 'Retour dans la fenêtre de l’épreuve'
      when 'COPY_BLOCKED' then 'Copie de contenu bloquée dans la page'
      when 'CUT_BLOCKED' then 'Coupe de contenu bloquée dans la page'
      when 'PASTE_BLOCKED' then 'Collage bloqué dans la page'
      when 'PRINT_BLOCKED' then 'Demande d’impression bloquée dans la page'
      when 'CONTEXT_MENU_BLOCKED' then 'Menu contextuel bloqué dans la page'
      else 'Raccourci de capture observé ; capture système non vérifiable' end;
    insert into escen.exam_integrity_events(attempt_id,client_event_id,kind,observed_at,actor_id,role_code,reason)
      values(attempt.id,(item->>'id')::uuid,item->>'kind',(item->>'observedAt')::timestamptz,p_actor_id,p_role_code,label)
      on conflict do nothing;
    get diagnostics changed=row_count;
    inserted:=inserted+changed;
  end loop;
  perform set_config('escen.actor_id',coalesce(previous_actor,''),true);
  return jsonb_build_object('accepted',jsonb_array_length(p_events),'recorded',inserted);
end $$;
revoke all on function public.escen_record_exam_integrity_events(uuid,text,uuid,jsonb) from public;

-- Le journal sensible ne rejoint jamais le snapshot général ni son cache.
create or replace function public.escen_backend_snapshot_before_level_documents() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare item record; records jsonb; result jsonb; fragments text[] := array[]::text[];
begin
  for item in select tablename from pg_tables where schemaname='escen' and tablename not in
    ('website_articles','website_intakes','online_applications','application_documents','website_brochures','website_galleries','email_outbox','exam_integrity_events') order by tablename loop
    if item.tablename='accounts' then
      select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('account_type',case
        when exists(select 1 from escen.students s where s.person_id=a.person_id) then 'student'
        when exists(select 1 from escen.staff s where s.person_id=a.person_id) or exists(
          select 1 from escen_private.source_mappings m join escen_private.legacy_rows l on l.id=m.row_id
          where m.target_table='accounts' and m.target_id=a.id and l.source_table='users') then 'staff'
        else 'unclassified' end)),'[]') into records from escen.accounts a where a.archived_at is null;
    else execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from escen.%I t',item.tablename) into records;
    end if;
    fragments:=array_append(fragments,to_jsonb(item.tablename)::text||':'||records::text);
  end loop;
  result:=('{'||array_to_string(fragments,',')||'}')::jsonb;
  return jsonb_build_object('revision',(select revision from escen_private.portal_revision where singleton),'tables',result);
end $$;

do $rights$ declare role_name text; signature text; begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on escen.exam_integrity_events from %I',role_name);
      execute format('revoke all on escen_private.exam_integrity_activation from %I',role_name);
      foreach signature in array array[
        'escen_private.set_attempt_integrity_mode()',
        'escen_private.exam_attempt_view(uuid)',
        'escen_private.exam_attempt_view_before_integrity(uuid)',
        'public.escen_start_online_exam_checked(uuid,text,uuid,boolean)',
        'public.escen_record_exam_integrity_events(uuid,text,uuid,jsonb)'
      ] loop execute 'revoke all on function '||signature||' from '||quote_ident(role_name); end loop;
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.escen_start_online_exam_checked(uuid,text,uuid,boolean) to service_role;
    grant execute on function public.escen_record_exam_integrity_events(uuid,text,uuid,jsonb) to service_role;
  end if;
end $rights$;
notify pgrst, 'reload schema';
commit;

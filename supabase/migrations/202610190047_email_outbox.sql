-- File de mails métier : SQL présenté et accord utilisateur du 19 octobre 2026.
-- Aucun accès distant ni envoi réseau ; déclencheurs métier traités séparément.
begin;

create table escen.email_outbox (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  event_type text not null check (event_type in (
    'application_received','application_status_changed',
    'exam_attempt_submitted','exam_attempt_expired',
    'teaching_assignment_created',
    'grades_submitted','grades_returned','grades_approved','grades_published',
    'course_scheduled','course_schedule_changed','course_cancelled',
    'exam_scheduled','exam_schedule_changed','exam_cancelled',
    'payment_recorded','tuition_settled'
  )),
  source_table text not null check (source_table in ('online_applications','evaluations','sessions','exam_attempts','teaching_assignments','payments','financial_contracts')),
  source_id uuid not null,
  source_version text not null check (length(source_version) between 1 and 80 and source_version=btrim(source_version)),
  recipient_email text not null check (length(recipient_email) <= 254 and recipient_email = lower(btrim(recipient_email)) and recipient_email ~ '^[^[:space:]<>@]+@[^[:space:]<>@]+[.][^[:space:]<>@]+$'),
  recipient_name text not null check (length(btrim(recipient_name)) between 1 and 160),
  subject text not null check (length(btrim(subject)) between 1 and 180 and subject !~ E'[\r\n]'),
  text_body text not null check (length(btrim(text_body)) between 1 and 20000),
  html_body text not null check (length(btrim(html_body)) between 1 and 50000),
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','ACCEPTED','FAILED','UNKNOWN')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  lock_token uuid,
  locked_until timestamptz,
  provider_reference text check (length(provider_reference) between 1 and 240),
  accepted_at timestamptz,
  last_error_code text check (last_error_code in ('CONFIGURATION','PROVIDER_REJECTED','RECIPIENT_INVALID','NETWORK_AMBIGUOUS','LEASE_EXPIRED','UNEXPECTED_RESPONSE')),
  requested_by uuid references escen.accounts(id) on delete restrict,
  last_modified_by uuid references escen.accounts(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint email_outbox_event_unique unique (event_type,source_id,source_version,recipient_email),
  constraint email_outbox_lock check ((status='PROCESSING' and lock_token is not null and locked_until is not null) or (status<>'PROCESSING' and lock_token is null and locked_until is null)),
  constraint email_outbox_acceptance check ((status='ACCEPTED' and accepted_at is not null and provider_reference is not null) or (status<>'ACCEPTED' and accepted_at is null and provider_reference is null)),
  constraint email_outbox_error check ((status in ('FAILED','UNKNOWN') and last_error_code is not null) or (status not in ('FAILED','UNKNOWN') and last_error_code is null)),
  constraint email_outbox_source_kind check (
    (source_table='online_applications' and event_type in ('application_received','application_status_changed'))
    or (source_table='evaluations' and event_type in ('grades_submitted','grades_returned','grades_approved','grades_published'))
    or (source_table='sessions' and event_type in ('course_scheduled','course_schedule_changed','course_cancelled','exam_scheduled','exam_schedule_changed','exam_cancelled'))
    or (source_table='exam_attempts' and event_type in ('exam_attempt_submitted','exam_attempt_expired'))
    or (source_table='teaching_assignments' and event_type='teaching_assignment_created')
    or (source_table='payments' and event_type='payment_recorded')
    or (source_table='financial_contracts' and event_type='tuition_settled')
  )
);
create index email_outbox_year_date on escen.email_outbox(academic_year_id,created_at desc,id);
create index email_outbox_pending on escen.email_outbox(created_at,id) where status='PENDING';
create index email_outbox_expired_lock on escen.email_outbox(locked_until) where status='PROCESSING';
create index email_outbox_requester on escen.email_outbox(requested_by);
create index email_outbox_modifier on escen.email_outbox(last_modified_by);
alter table escen.email_outbox enable row level security;
revoke all on escen.email_outbox from public;
create trigger audit_event after insert or update on escen.email_outbox
  for each row execute function escen_private.record_audit();

create function escen_private.guard_email_outbox() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  if (to_jsonb(new)-array['status','attempts','lock_token','locked_until','provider_reference','accepted_at','last_error_code','last_modified_by','reason','version','updated_at'])
    is distinct from (to_jsonb(old)-array['status','attempts','lock_token','locked_until','provider_reference','accepted_at','last_error_code','last_modified_by','reason','version','updated_at'])
  then raise exception 'Le message et ses destinataires sont immuables' using errcode='23514'; end if;
  new.version := old.version+1;
  new.updated_at := clock_timestamp();
  return new;
end $$;
create trigger guard_email before update on escen.email_outbox
  for each row execute function escen_private.guard_email_outbox();

insert into escen.permissions(code,description) values
  ('email.view','Consulter les mails métier et leur état de traitement'),
  ('email.retry','Reprendre un mail en échec confirmé avec motif');
insert into escen.role_permissions(role_id,permission_id)
select r.id,p.id from escen.roles r cross join escen.permissions p
where (r.code in ('DG','IT') and p.code='email.view') or (r.code='IT' and p.code='email.retry');

create function escen_private.authorize_email_admin(p_actor_id uuid,p_role_code text,p_permission text)
returns void language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  if p_permission not in ('email.view','email.retry') or p_permission is null or not exists (
    select 1 from escen.accounts a
    join escen.role_grants g on g.account_id=a.id
    join escen.roles r on r.id=g.role_id
    join escen.role_permissions rp on rp.role_id=r.id
    join escen.permissions p on p.id=rp.permission_id
    where a.id=p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null
      and r.active and r.code=p_role_code and r.code in ('DG','IT') and p.code=p_permission
      and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
  ) then raise exception 'Accès aux mails refusé' using errcode='42501'; end if;
end $$;

-- Réservé au serveur, après détermination du destinataire par les références métier.
-- Les futurs déclencheurs devront appeler cette fonction DANS la transaction métier.
create function public.escen_email_enqueue(
  p_year_id uuid,p_event_type text,p_source_table text,p_source_id uuid,p_source_version text,
  p_recipient_email text,p_recipient_name text,p_subject text,p_text_body text,p_html_body text,
  p_actor_id uuid default null
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare source_year uuid; result uuid; existing escen.email_outbox;
begin
  if p_source_table='online_applications' then
    select academic_year_id into source_year from escen.online_applications where id=p_source_id and status<>'BROUILLON';
  elsif p_source_table='evaluations' then
    select o.academic_year_id into source_year from escen.evaluations e
    left join escen.teaching_assignments a on a.id=e.assignment_id
    join escen.academic_offerings o on o.id=coalesce(e.offering_id,a.offering_id) where e.id=p_source_id and e.cancelled_at is null
      and ((p_event_type='grades_submitted' and e.status='SOUMISES')
        or (p_event_type='grades_approved' and e.status='VALIDEES')
        or (p_event_type='grades_published' and e.status='PUBLIEES')
        or (p_event_type='grades_returned' and e.status in ('BROUILLON','SAISIES') and exists(
          select 1 from escen.evaluation_transitions t where t.evaluation_id=e.id
            and t.from_status in ('SOUMISES','A_CONTROLER','VALIDEES') and t.to_status=e.status)));
  elsif p_source_table='sessions' then
    select o.academic_year_id into source_year from escen.sessions s
    join escen.academic_offerings o on o.id=s.offering_id where s.id=p_source_id
      and (
        (p_event_type in ('exam_scheduled','exam_schedule_changed','exam_cancelled')
          and exists(select 1 from escen.exam_deliveries d where d.session_id=s.id))
        or (p_event_type in ('course_scheduled','course_schedule_changed','course_cancelled')
          and s.mode='COURS' and not exists(select 1 from escen.exam_deliveries d where d.session_id=s.id))
      )
      and ((p_event_type in ('course_cancelled','exam_cancelled') and s.status='ANNULE')
        or (p_event_type not in ('course_cancelled','exam_cancelled') and s.status not in ('ANNULE','REPORTE')));
  elsif p_source_table='exam_attempts' then
    select o.academic_year_id into source_year from escen.exam_attempts a
    join escen.evaluation_candidates c on c.id=a.candidate_id and c.evaluation_id=a.evaluation_id
    join escen.enrollments n on n.id=c.enrollment_id
    join escen.academic_offerings o on o.id=n.offering_id where a.id=p_source_id and a.submitted_at is not null
      and ((p_event_type='exam_attempt_submitted' and a.status='REMISE' and a.submission_kind='MANUAL')
        or (p_event_type='exam_attempt_expired' and a.status='EXPIREE' and a.submission_kind='AUTO_DEADLINE'));
  elsif p_source_table='teaching_assignments' then
    select o.academic_year_id into source_year from escen.teaching_assignments a
    join escen.academic_offerings o on o.id=a.offering_id where a.id=p_source_id;
  elsif p_source_table='payments' then
    select o.academic_year_id into source_year from escen.payments p
    join escen.enrollments n on n.id=p.enrollment_id
    join escen.academic_offerings o on o.id=n.offering_id where p.id=p_source_id and p.status<>'PENDING'
      and not exists(select 1 from escen.payment_reversals r where r.payment_id=p.id);
  elsif p_source_table='financial_contracts' then
    select o.academic_year_id into source_year from escen.financial_contracts c
    join escen.enrollments n on n.id=c.enrollment_id
    join escen.academic_offerings o on o.id=n.offering_id where c.id=p_source_id
      and exists(select 1 from escen.contract_balances b where b.contract_id=c.id and b.expected<=b.paid);
  end if;
  if source_year is null or p_year_id is null or source_year<>p_year_id then
    raise exception 'Source absente ou rattachée à une autre année' using errcode='23514';
  end if;
  if p_actor_id is not null and not exists(select 1 from escen.accounts where id=p_actor_id and active and archived_at is null and auth_user_id is not null) then
    raise exception 'Auteur applicatif inactif' using errcode='42501';
  end if;
  insert into escen.email_outbox(academic_year_id,event_type,source_table,source_id,source_version,recipient_email,recipient_name,subject,text_body,html_body,requested_by,last_modified_by,reason)
  values(p_year_id,p_event_type,p_source_table,p_source_id,p_source_version,lower(btrim(p_recipient_email)),p_recipient_name,p_subject,p_text_body,p_html_body,p_actor_id,p_actor_id,'Message préparé après événement métier confirmé')
  on conflict on constraint email_outbox_event_unique do nothing returning id into result;
  if result is null then
    select * into existing from escen.email_outbox where event_type=p_event_type and source_id=p_source_id
      and source_version=p_source_version and recipient_email=lower(btrim(p_recipient_email));
    if existing.academic_year_id is distinct from p_year_id or existing.source_table is distinct from p_source_table
      or existing.subject is distinct from p_subject or existing.recipient_name is distinct from p_recipient_name
      or existing.text_body is distinct from p_text_body or existing.html_body is distinct from p_html_body then
      raise exception 'La même clé d’événement désigne un autre message' using errcode='40001';
    end if;
    result:=existing.id;
  end if;
  return result;
end $$;

create function public.escen_email_claim(p_lock_token uuid,p_limit integer default 10)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
  if p_lock_token is null or p_limit is null or p_limit<1 or p_limit>25 then
    raise exception 'Lot de traitement invalide' using errcode='22023'; end if;
  -- Un envoi peut avoir été accepté avant la perte de connexion : ne pas le renvoyer.
  with expired as (
    select id from escen.email_outbox where status='PROCESSING' and locked_until<=clock_timestamp()
    order by locked_until,id limit 100 for update skip locked
  ) update escen.email_outbox q set status='UNKNOWN',lock_token=null,locked_until=null,
    last_error_code='LEASE_EXPIRED',last_modified_by=null,reason='Traitement expiré : vérifier le prestataire avant toute reprise'
    from expired where q.id=expired.id;
  with pending as (
    select id from escen.email_outbox where status='PENDING' and attempts<5
    order by created_at,id limit p_limit for update skip locked
  ), claimed as (
    update escen.email_outbox q set status='PROCESSING',attempts=q.attempts+1,lock_token=p_lock_token,
      locked_until=clock_timestamp()+interval '10 minutes',last_error_code=null,last_modified_by=null,
      reason='Prise en charge technique du message'
    from pending where q.id=pending.id returning q.*
  ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into result from claimed;
  return result;
end $$;

create function public.escen_email_complete(p_id uuid,p_lock_token uuid,p_outcome text,p_provider_reference text default null,p_error_code text default null)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare next_version bigint;
begin
  if p_outcome is null or p_outcome not in ('ACCEPTED','FAILED','UNKNOWN')
    or (p_outcome='ACCEPTED' and (nullif(btrim(p_provider_reference),'') is null or p_error_code is not null))
    or (p_outcome<>'ACCEPTED' and (p_provider_reference is not null or p_error_code is null))
    or (p_outcome='FAILED' and p_error_code not in ('CONFIGURATION','PROVIDER_REJECTED','RECIPIENT_INVALID'))
    or (p_outcome='UNKNOWN' and p_error_code not in ('NETWORK_AMBIGUOUS','UNEXPECTED_RESPONSE')) then
    raise exception 'Résultat du prestataire invalide' using errcode='22023'; end if;
  update escen.email_outbox set status=p_outcome,
    provider_reference=case when p_outcome='ACCEPTED' then p_provider_reference end,
    accepted_at=case when p_outcome='ACCEPTED' then clock_timestamp() end,last_error_code=p_error_code,
    lock_token=null,locked_until=null,last_modified_by=null,reason='Résultat technique : '||p_outcome
    where id=p_id and status='PROCESSING' and lock_token=p_lock_token and locked_until>clock_timestamp()
    returning version into next_version;
  if next_version is null then raise exception 'Traitement absent, expiré ou déjà terminé' using errcode='40001'; end if;
  return next_version;
end $$;

create function public.escen_email_page(p_actor_id uuid,p_role_code text,p_year_id uuid default null,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
  perform escen_private.authorize_email_admin(p_actor_id,p_role_code,'email.view');
  if p_offset is null or p_offset<0 or p_offset>1000000 then raise exception 'Pagination invalide' using errcode='22023'; end if;
  select jsonb_build_object('yearId',p_year_id,'offset',p_offset,'limit',50,
    'total',(select count(*) from escen.email_outbox where p_year_id is null or academic_year_id=p_year_id),
    'records',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc) from (
      select id,academic_year_id,event_type,source_table,source_id,recipient_email,recipient_name,subject,status,
        attempts,provider_reference,accepted_at,last_error_code,requested_by,reason,version,created_at,updated_at
      from escen.email_outbox where p_year_id is null or academic_year_id=p_year_id
      order by created_at desc,id desc limit 50 offset p_offset
    ) q),'[]'::jsonb)) into result;
  return result;
end $$;

create function public.escen_email_retry(p_actor_id uuid,p_role_code text,p_year_id uuid,p_id uuid,p_version bigint,p_reason text)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare next_version bigint;
begin
  perform escen_private.authorize_email_admin(p_actor_id,p_role_code,'email.retry');
  if p_reason is null or length(btrim(p_reason)) not between 3 and 1000 or p_year_id is null then
    raise exception 'Année précise et motif requis' using errcode='22023'; end if;
  update escen.email_outbox set status='PENDING',last_error_code=null,last_modified_by=p_actor_id,reason=btrim(p_reason)
    where id=p_id and academic_year_id=p_year_id and version=p_version and status='FAILED' and attempts<5
    returning version into next_version;
  if next_version is null then raise exception 'Message modifié, hors année ou non reprenable' using errcode='40001'; end if;
  return next_version;
end $$;

-- Ne pas charger les destinataires et corps des mails dans le snapshot général.
create or replace function public.escen_backend_snapshot() returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare item record; records jsonb; result jsonb:='{}';
begin
  for item in select tablename from pg_tables where schemaname='escen' and tablename not in
    ('website_articles','website_intakes','online_applications','application_documents','website_brochures','email_outbox') order by tablename loop
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

-- Pas de politique RLS autorisant un accès direct depuis un navigateur.
do $$ declare role_name text; signature text; begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on escen.email_outbox from %I',role_name);
    end if;
  end loop;
  foreach signature in array array[
    'escen_private.guard_email_outbox()',
    'escen_private.authorize_email_admin(uuid,text,text)',
    'public.escen_email_enqueue(uuid,text,text,uuid,text,text,text,text,text,text,uuid)',
    'public.escen_email_claim(uuid,integer)',
    'public.escen_email_complete(uuid,uuid,text,text,text)',
    'public.escen_email_page(uuid,text,uuid,integer)',
    'public.escen_email_retry(uuid,text,uuid,uuid,bigint,text)'
  ] loop
    execute 'revoke all on function '||signature||' from public';
    foreach role_name in array array['anon','authenticated'] loop
      if exists(select 1 from pg_roles where rolname=role_name) then
        execute 'revoke all on function '||signature||' from '||quote_ident(role_name);
      end if;
    end loop;
    if signature like 'public.%' and exists(select 1 from pg_roles where rolname='service_role') then
      execute 'grant execute on function '||signature||' to service_role';
    end if;
  end loop;
end $$;
commit;

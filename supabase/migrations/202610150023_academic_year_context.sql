begin;
alter table escen.academic_years add column version integer not null default 1;
create table escen.academic_working_year (
  id uuid primary key default gen_random_uuid(), singleton boolean not null default true unique check(singleton),
  academic_year_id uuid references escen.academic_years(id) on delete restrict,
  reason text not null default 'Année de travail à définir', updated_at timestamptz not null default now()
);
insert into escen.academic_working_year(singleton) values(true);
alter table escen.academic_working_year enable row level security;
create index academic_working_year_fk on escen.academic_working_year(academic_year_id);
create trigger no_delete before delete on escen.academic_working_year for each row execute function escen_private.no_delete();
create trigger audit_event after insert or update on escen.academic_working_year for each row execute function escen_private.record_audit();
create function public.escen_academic_year_context() returns jsonb language sql stable security definer set search_path=pg_catalog as $$
  select jsonb_build_object('currentYearId',academic_year_id) from escen.academic_working_year where singleton
$$;
create function escen_private.guard_working_year() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if current_setting('escen.year_lifecycle',true) is distinct from 'yes' then raise exception 'Utilisez la commande d’année de travail' using errcode='42501'; end if;
  if new.academic_year_id is not null and not exists(select 1 from escen.academic_years where id=new.academic_year_id and status='OUVERTE' and archived_at is null) then raise exception 'L’année de travail doit être ouverte' using errcode='23514'; end if;
  return new;
end $$;
create trigger year_command_only before insert or update on escen.academic_working_year for each row execute function escen_private.guard_working_year();
create function escen_private.guard_academic_year() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if old.status='CLOTUREE' and new is distinct from old then raise exception 'Année clôturée : historique protégé' using errcode='23514'; end if;
  if new.status<>old.status and current_setting('escen.year_lifecycle',true) is distinct from 'yes' then raise exception 'Utilisez la commande d’ouverture ou de clôture' using errcode='42501'; end if;
  if new.archived_at is not null and exists(select 1 from escen.academic_working_year where academic_year_id=old.id) then raise exception 'Changez l’année de travail avant archivage' using errcode='23514'; end if;
  if (new.starts_on,new.ends_on) is distinct from (old.starts_on,old.ends_on) and (
    exists(select 1 from escen.offering_semesters s join escen.academic_offerings o on o.id=s.offering_id where o.academic_year_id=old.id and (s.starts_on<new.starts_on or s.ends_on>new.ends_on))
    or exists(select 1 from escen.sessions s join escen.academic_offerings o on o.id=s.offering_id where o.academic_year_id=old.id and ((s.starts_at at time zone 'Africa/Lome')::date<new.starts_on or (s.ends_at at time zone 'Africa/Lome')::date>new.ends_on)))
    then raise exception 'Les dates excluent des semestres ou séances existants' using errcode='23514'; end if;
  new.version:=old.version+1;
  return new;
end $$;
create trigger academic_year_guard before update on escen.academic_years for each row execute function escen_private.guard_academic_year();
create function public.escen_academic_year_command(p_actor_id uuid,p_role_code text,p_action text,p_year_id uuid,p_expected_revision bigint,p_reason text,p_status text default null) returns bigint
language plpgsql security definer set search_path=pg_catalog as $$
declare y escen.academic_years; rev bigint; previous_marker text;
begin
  if not exists(select 1 from escen.accounts a join escen.role_grants g on g.account_id=a.id join escen.roles r on r.id=g.role_id join escen.role_permissions rp on rp.role_id=r.id join escen.permissions p on p.id=rp.permission_id
    where a.id=p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null and r.active and r.code=p_role_code and p.code='academic.year.open' and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()) and g.site_id is null and g.group_id is null and g.academic_year_id is null) then raise exception 'Pilotage global des années requis' using errcode='42501'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Motif obligatoire' using errcode='23514'; end if;
  select revision into rev from escen_private.portal_revision where singleton for update;
  if rev<>p_expected_revision then raise exception 'Modification concurrente : actualisez' using errcode='40001'; end if;
  if p_year_id is not null then
    select * into y from escen.academic_years where id=p_year_id and archived_at is null for update;
    if y.id is null then raise exception 'Année introuvable' using errcode='P0002'; end if;
  end if;
  previous_marker:=current_setting('escen.year_lifecycle',true);
  perform set_config('escen.actor_id',p_actor_id::text,true);
  perform set_config('escen.year_lifecycle','yes',true);
  if p_action='current' then
    if p_year_id is not null and y.status<>'OUVERTE' then raise exception 'L’année de travail doit être ouverte' using errcode='23514'; end if;
    update escen.academic_working_year set academic_year_id=p_year_id,reason=p_reason,updated_at=now() where singleton;
  elsif p_action='transition' then
    if y.id is null or p_status is null or not ((y.status='BROUILLON' and p_status='OUVERTE') or (y.status='OUVERTE' and p_status='EN_CLOTURE') or (y.status='EN_CLOTURE' and p_status='CLOTUREE')) then raise exception 'Transition d’année interdite' using errcode='23514'; end if;
    if p_status<>'OUVERTE' and exists(select 1 from escen.academic_working_year where academic_year_id=y.id) then raise exception 'Choisissez une autre année de travail ou retirez sa désignation avant la clôture' using errcode='23514'; end if;
    if p_status='CLOTUREE' then
      if exists(select 1 from escen.evaluations e join escen.academic_offerings o on o.id=e.offering_id where o.academic_year_id=y.id and e.cancelled_at is null and e.status<>'PUBLIEES') then raise exception 'Des évaluations ne sont pas publiées ou annulées' using errcode='23514'; end if;
      if exists(select 1 from escen.complaints c join escen.evaluation_candidates ec on ec.id=c.candidate_id join escen.evaluations e on e.id=ec.evaluation_id join escen.academic_offerings o on o.id=e.offering_id where o.academic_year_id=y.id and c.status<>'CLOTUREE') then raise exception 'Des réclamations sont encore ouvertes' using errcode='23514'; end if;
      if exists(select 1 from escen.exam_attempts a join escen.evaluations e on e.id=a.evaluation_id join escen.academic_offerings o on o.id=e.offering_id where o.academic_year_id=y.id and a.status='EN_COURS') then raise exception 'Des tentatives sont encore en cours' using errcode='23514'; end if;
    end if;
    update escen.academic_years set status=p_status,reason=p_reason where id=y.id;
  else raise exception 'Commande inconnue' using errcode='42501'; end if;
  update escen_private.portal_revision set revision=revision+1,changed_at=now(),actor_id=p_actor_id where singleton returning revision into rev;
  perform set_config('escen.year_lifecycle',coalesce(previous_marker,''),true);
  return rev;
end $$;

create function escen_private.activity_year(p_table text,p_row jsonb,p_depth integer default 0) returns uuid
language plpgsql stable set search_path=pg_catalog as $$
declare parents jsonb:='{"offering_semesters":{"offering_id":"academic_offerings"},"group_offerings":{"offering_id":"academic_offerings","group_id":"groups"},"enrollments":{"offering_id":"academic_offerings"},"enrollment_groups":{"offering_id":"academic_offerings","enrollment_id":"enrollments","group_id":"groups"},"enrollment_events":{"enrollment_id":"enrollments"},"teaching_assignments":{"offering_id":"academic_offerings","group_id":"groups"},"role_grants":{"group_id":"groups"},"schedule_series":{"assignment_id":"teaching_assignments"},"sessions":{"offering_id":"academic_offerings","assignment_id":"teaching_assignments","group_id":"groups"},"session_supervisors":{"session_id":"sessions"},"attendances":{"offering_id":"academic_offerings","enrollment_id":"enrollments","session_id":"sessions"},"teacher_attendances":{"session_id":"sessions"},"evaluations":{"offering_id":"academic_offerings","assignment_id":"teaching_assignments"},"evaluation_transitions":{"evaluation_id":"evaluations"},"exam_deliveries":{"evaluation_id":"evaluations","session_id":"sessions"},"evaluation_candidates":{"offering_id":"academic_offerings","enrollment_id":"enrollments","evaluation_id":"evaluations"},"exam_papers":{"evaluation_id":"evaluations"},"exam_parts":{"paper_id":"exam_papers"},"exam_questions":{"part_id":"exam_parts","paper_id":"exam_papers"},"exam_options":{"question_id":"exam_questions"},"exam_attempts":{"evaluation_id":"evaluations","candidate_id":"evaluation_candidates","paper_id":"exam_papers"},"exam_answers":{"attempt_id":"exam_attempts","question_id":"exam_questions","paper_id":"exam_papers"},"answer_corrections":{"answer_id":"exam_answers"},"grades":{"candidate_id":"evaluation_candidates"},"complaints":{"candidate_id":"evaluation_candidates","grade_id":"grades"},"complaint_events":{"complaint_id":"complaints"},"grade_revisions":{"grade_id":"grades","complaint_id":"complaints"},"jury_members":{"jury_id":"juries"},"jury_decisions":{"offering_id":"academic_offerings","enrollment_id":"enrollments","jury_id":"juries"},"jury_grade_inputs":{"grade_id":"grades","decision_id":"jury_decisions"},"credit_awards":{"decision_id":"jury_decisions"},"generated_documents":{"enrollment_id":"enrollments","decision_id":"jury_decisions"},"fee_rates":{"offering_id":"academic_offerings"},"scholarship_awards":{"enrollment_id":"enrollments"},"financial_contracts":{"enrollment_id":"enrollments"},"contract_versions":{"contract_id":"financial_contracts"},"contract_lines":{"contract_id":"financial_contracts","version_id":"contract_versions"},"contract_discounts":{"version_id":"contract_versions","line_id":"contract_lines"},"installments":{"version_id":"contract_versions"},"payments":{"enrollment_id":"enrollments"},"payment_reversals":{"payment_id":"payments"},"receipts":{"payment_id":"payments"},"payment_allocations":{"enrollment_id":"enrollments","contract_id":"financial_contracts","version_id":"contract_versions","line_id":"contract_lines","payment_id":"payments"},"refunds":{"payment_id":"payments"},"credit_notes":{"line_id":"contract_lines"},"student_documents":{"enrollment_id":"enrollments"},"payment_documents":{"payment_id":"payments"},"communication_audiences":{"group_id":"groups"},"purchase_receipts":{"line_id":"purchase_lines"},"exam_rooms":{"evaluation_id":"evaluations","delivery_id":"exam_deliveries"},"exam_room_candidates":{"evaluation_id":"evaluations","candidate_id":"evaluation_candidates","exam_room_id":"exam_rooms"},"exam_room_supervisors":{"exam_room_id":"exam_rooms"}}'; k text; target text; parent jsonb; result uuid;
begin
  if p_depth>8 then return null; end if;
  if nullif(p_row->>'academic_year_id','') is not null then return (p_row->>'academic_year_id')::uuid; end if;
  foreach k in array array['offering_id','enrollment_id','evaluation_id','candidate_id','grade_id','session_id','assignment_id','group_id','attempt_id','answer_id','question_id','part_id','paper_id','complaint_id','jury_id','decision_id','delivery_id','exam_room_id','contract_id','version_id','line_id','payment_id'] loop
    target:=parents->p_table->>k;
    if target is not null and nullif(p_row->>k,'') is not null then
      execute format('select to_jsonb(t) from escen.%I t where id=$1',target) into parent using (p_row->>k)::uuid;
      if parent is not null then result:=escen_private.activity_year(target,parent,p_depth+1); if result is not null then return result; end if; end if;
    end if;
  end loop;
  return null;
end $$;
create function escen_private.guard_annual_activity() returns trigger language plpgsql set search_path=pg_catalog as $$
declare year_id uuid; old_year uuid; year_status text;
begin
  year_id:=escen_private.activity_year(tg_table_name,to_jsonb(new));
  if year_id is null then return new; end if;
  if tg_op='UPDATE' then
    old_year:=escen_private.activity_year(tg_table_name,to_jsonb(old));
    if old_year is not null and old_year<>year_id then raise exception 'Un dossier annuel ne peut pas être déplacé vers une autre année' using errcode='23514'; end if;
  end if;
  select status into year_status from escen.academic_years where id=year_id and archived_at is null for share;
  if year_status is null or year_status in ('BROUILLON','CLOTUREE') then raise exception 'Cette année ne permet pas cette opération académique' using errcode='23514'; end if;
  if year_status='EN_CLOTURE' and tg_op='INSERT' and tg_table_name in ('enrollments','academic_offerings','groups','teaching_assignments','sessions','evaluations','financial_contracts') then raise exception 'Année en clôture : aucune nouvelle inscription ou programmation' using errcode='23514'; end if;
  return new;
end $$;
do $$ declare name text; begin
  foreach name in array array['academic_offerings','offering_semesters','groups','group_offerings','enrollments','enrollment_groups','teaching_assignments','sessions','session_supervisors','attendances','teacher_attendances','evaluations','evaluation_candidates','evaluation_transitions','exam_papers','exam_parts','exam_questions','exam_options','exam_deliveries','exam_rooms','exam_room_candidates','exam_room_supervisors','exam_attempts','exam_answers','answer_corrections','grades','grade_revisions','complaints','complaint_events','juries','jury_members','jury_decisions','jury_grade_inputs','credit_awards','generated_documents','financial_contracts'] loop
    execute format('create trigger annual_activity_guard before insert or update on escen.%I for each row execute function escen_private.guard_annual_activity()',name);
  end loop;
end $$;
-- Historical payments and their reversals remain attributable to their original enrollment/year.
-- Settling an old debt is not a new academic enrollment and is not disabled by academic closure.
alter table escen.website_intakes add column academic_year_id uuid references escen.academic_years(id) on delete restrict;
alter table escen.online_applications add column academic_year_id uuid references escen.academic_years(id) on delete restrict;
create index website_intake_year_fk on escen.website_intakes(academic_year_id);
create index website_application_year_fk on escen.online_applications(academic_year_id);
alter table escen.website_intakes drop constraint website_intakes_level_id_program_id_key;
alter table escen.website_intakes add constraint website_intake_per_year unique(academic_year_id,level_id,program_id);
alter table escen.website_intakes add constraint website_intake_year_required check(not active or academic_year_id is not null) not valid;
create function escen_private.guard_website_intake_year() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if tg_op='UPDATE' and old.academic_year_id is not null and new.academic_year_id is distinct from old.academic_year_id then raise exception 'La campagne conserve son année d’origine' using errcode='23514'; end if;
  if new.active and not exists(select 1 from escen.academic_years where id=new.academic_year_id and status='OUVERTE' and archived_at is null) then raise exception 'Une campagne ouverte exige une année ouverte' using errcode='23514'; end if;
  return new;
end $$;
create trigger intake_year_guard before insert or update on escen.website_intakes for each row execute function escen_private.guard_website_intake_year();
create function escen_private.guard_application_year() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if tg_op='UPDATE' and new.academic_year_id is distinct from old.academic_year_id then raise exception 'Le dossier conserve son année de dépôt' using errcode='23514'; end if;
  if new.academic_year_id is not null and new.intake_id is not null and not exists(select 1 from escen.website_intakes where id=new.intake_id and academic_year_id=new.academic_year_id) then raise exception 'Formation et dossier de deux années différentes' using errcode='23514'; end if;
  return new;
end $$;
create trigger application_year_guard before insert or update on escen.online_applications for each row execute function escen_private.guard_application_year();
create or replace function public.escen_website_public(p_action text,p_token_hash text default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare a escen.online_applications; i escen.website_intakes; doc jsonb; result jsonb;
begin
  if p_action='year' then return (select jsonb_build_object('id',y.id,'name',y.name) from escen.academic_working_year w join escen.academic_years y on y.id=w.academic_year_id where w.singleton and y.status='OUVERTE' and y.archived_at is null); elsif p_action='articles' then
    return coalesce((select jsonb_agg(to_jsonb(t) - 'created_by' - 'reason' order by t.published_at desc) from escen.website_articles t where status='PUBLIE'),'[]');
  elsif p_action='intakes' then
    return coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'level_id',t.level_id,'program_id',t.program_id,'label',t.label,'academic_year_id',t.academic_year_id,'required_documents',t.required_documents,'level_name',l.name,'program_name',p.name)) from escen.website_intakes t join escen.levels l on l.id=t.level_id join escen.programs p on p.id=t.program_id where t.active and t.academic_year_id=(select academic_year_id from escen.academic_working_year where singleton) and exists(select 1 from escen.academic_years y where y.id=t.academic_year_id and y.status='OUVERTE' and y.archived_at is null) and l.archived_at is null and p.archived_at is null),'[]');
  end if;
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Jeton invalide' using errcode='42501'; end if;
  if p_action='create' then
    if not exists(select 1 from escen.academic_working_year w join escen.academic_years y on y.id=w.academic_year_id where w.singleton and y.id=(p_data->>'academic_year_id')::uuid and y.status='OUVERTE' and y.archived_at is null) then raise exception 'Année de campagne modifiée ou non ouverte' using errcode='23514'; end if;
    insert into escen.online_applications(reference,identity,academic_year_id) values('WEB-'||upper(replace(gen_random_uuid()::text,'-','')),p_data-'academic_year_id',(p_data->>'academic_year_id')::uuid) returning * into a;
    insert into escen_private.application_access(id,token_hash) values(a.id,p_token_hash);
    return jsonb_build_object('id',a.id,'reference',a.reference);
  end if;
  select t.* into a from escen.online_applications t join escen_private.application_access x on x.id=t.id where x.token_hash=p_token_hash and x.expires_at>now() for update of t;
  if a.id is null then raise exception 'Brouillon introuvable ou expiré' using errcode='P0002'; end if;
  if p_action='submit' and a.status in ('RECU','EN_ANALYSE','CLASSE') then return jsonb_build_object('reference',a.reference,'status',a.status); end if;
  if a.status<>'BROUILLON' then raise exception 'Dossier déjà envoyé' using errcode='23514'; end if;
  if p_action='draft' then
    return jsonb_build_object('id',a.id,'reference',a.reference,'documents',coalesce((select jsonb_agg(jsonb_build_object('document_key',document_key,'filename',filename)) from escen.application_documents where application_id=a.id),'[]'),'candidat',jsonb_build_object('academic_year_id',a.academic_year_id)||a.identity||a.diploma||coalesce((select jsonb_build_object('niveau_id',level_id,'filiere_id',program_id) from escen.website_intakes where id=a.intake_id),'{}'));
  elsif p_action='identity' then update escen.online_applications set identity=p_data,version=version+1 where id=a.id;
  elsif p_action='diploma' then update escen.online_applications set diploma=p_data,version=version+1 where id=a.id;
  elsif p_action='documents' then
    select * into i from escen.website_intakes where level_id=(p_data->>'niveau_id')::uuid and program_id=(p_data->>'filiere_id')::uuid and academic_year_id=a.academic_year_id and active;
    if i.id is null or not exists(select 1 from escen.academic_years y where y.id=a.academic_year_id and y.status='OUVERTE' and y.archived_at is null) or not exists(select 1 from escen.levels where id=i.level_id and archived_at is null) or not exists(select 1 from escen.programs where id=i.program_id and archived_at is null) then raise exception 'Formation fermée ou absente' using errcode='23514'; end if;
    if (select count(*) from escen.application_documents where application_id=a.id)+jsonb_array_length(p_data->'documents')>24 then raise exception 'Trop de pièces' using errcode='23514'; end if;
    for doc in select value from jsonb_array_elements(p_data->'documents') loop
      if doc->>'object_path' not like a.id::text||'/%' then raise exception 'Pièce hors dossier' using errcode='23514'; end if;
      insert into escen.application_documents(id,application_id,document_key,filename,mime_type,byte_size,bucket,object_path,sha256)
      values((doc->>'id')::uuid,a.id,doc->>'document_key',doc->>'filename',doc->>'mime_type',(doc->>'byte_size')::integer,'escen-online-applications',doc->>'object_path',doc->>'sha256');
    end loop;
    update escen.online_applications set intake_id=i.id,version=version+1 where id=a.id;
  elsif p_action='submit' then
    select * into i from escen.website_intakes where id=a.intake_id and academic_year_id=a.academic_year_id and active;
    if i.id is null or not exists(select 1 from escen.academic_years y where y.id=a.academic_year_id and y.status='OUVERTE' and y.archived_at is null) or not exists(select 1 from escen.levels where id=i.level_id and archived_at is null) or not exists(select 1 from escen.programs where id=i.program_id and archived_at is null) or coalesce(a.diploma->>'type_diplome_id','')='' or coalesce(p_data->>'accept_cgu','')<>'1' or coalesce(jsonb_array_length(p_data->'tuteurs'),0)<1 then raise exception 'Dossier incomplet ou formation fermée' using errcode='23514'; end if;
    if exists(select 1 from jsonb_array_elements_text(i.required_documents) k where not exists(select 1 from escen.application_documents d where d.application_id=a.id and d.document_key=k)) then raise exception 'Pièces obligatoires absentes' using errcode='23514'; end if;
    update escen.online_applications set guardians=p_data->'tuteurs',status='RECU',submitted_at=now(),version=version+1,reason='Consentement et envoi confirmés sur le site' where id=a.id;
    return jsonb_build_object('reference',a.reference,'status','RECU');
  else raise exception 'Commande inconnue' using errcode='42501'; end if;
  return jsonb_build_object('id',a.id,'reference',a.reference);
end $$;

create or replace function public.escen_website_manage(p_actor_id uuid,p_role_code text,p_action text,p_data jsonb default '{}') returns jsonb
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
    'years',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status)) from escen.academic_years where archived_at is null),'[]'),
    'currentYearId',(select academic_year_id from escen.academic_working_year where singleton),
    'levels',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from escen.levels where archived_at is null),'[]'),
    'programs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from escen.programs where archived_at is null),'[]')); end if;
  if p_action='document' then
    select to_jsonb(d)||jsonb_build_object('academic_year_id',a.academic_year_id) into result from escen.application_documents d join escen.online_applications a on a.id=d.application_id where d.id=(p_data->>'id')::uuid and a.status<>'BROUILLON';
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
    if not exists(select 1 from escen.academic_years where id=(p_data->>'academic_year_id')::uuid and archived_at is null and (not (p_data->>'active')::boolean or status='OUVERTE')) then raise exception 'Année de campagne absente ou non ouverte' using errcode='23514'; end if;
    if not exists(select 1 from escen.levels where id=(p_data->>'level_id')::uuid and archived_at is null) or not exists(select 1 from escen.programs where id=(p_data->>'program_id')::uuid and archived_at is null) then raise exception 'Référence archivée ou absente' using errcode='23514'; end if;
    select * into intake from escen.website_intakes where id=target for update;
    if p_data ? 'id' and (intake.id is null or intake.version<>(p_data->>'version')::integer) then raise exception 'Modification concurrente' using errcode='40001'; end if;
    if intake.id is not null and (intake.level_id<>(p_data->>'level_id')::uuid or intake.program_id<>(p_data->>'program_id')::uuid) then raise exception 'Les références de la formation sont figées' using errcode='23514'; end if;
    insert into escen.website_intakes(id,academic_year_id,level_id,program_id,label,active,required_documents,reason) values(target,(p_data->>'academic_year_id')::uuid,(p_data->>'level_id')::uuid,(p_data->>'program_id')::uuid,p_data->>'label',(p_data->>'active')::boolean,p_data->'required_documents',p_data->>'reason')
      on conflict(id) do update set academic_year_id=excluded.academic_year_id,label=excluded.label,active=excluded.active,required_documents=excluded.required_documents,version=escen.website_intakes.version+1,reason=excluded.reason;
  elsif p_action='application-status' then
    select * into application from escen.online_applications where id=target for update;
    if application.id is null or application.status='BROUILLON' then raise exception 'Dossier absent' using errcode='P0002'; end if;
    if application.version<>(p_data->>'version')::integer then raise exception 'Modification concurrente' using errcode='40001'; end if;
    if p_data->>'status' not in ('EN_ANALYSE','CLASSE','RECU') then raise exception 'Statut invalide' using errcode='23514'; end if;
    update escen.online_applications set status=p_data->>'status',version=version+1,reason=p_data->>'reason' where id=target;
  else raise exception 'Commande inconnue' using errcode='42501'; end if;
  return jsonb_build_object('id',target);
end $$;
-- Resolve archive years only through exact same-batch references and reviewed source mappings.
create function escen_private.history_year_ids(p_row escen_private.legacy_rows,p_depth integer default 0) returns uuid[]
language plpgsql stable set search_path=pg_catalog as $$
declare result uuid[]:='{}'; other uuid[]; parent escen_private.legacy_rows; k text; target text;
begin
  if p_depth>6 then return result; end if;
  if p_row.source_table='annee_scolaires' then
    return array(select distinct target_id from escen_private.source_mappings where row_id=p_row.id and target_table='academic_years');
  end if;
  if nullif(p_row.payload->>'annee_scolaire_id','') is not null then
    select * into parent from escen_private.legacy_rows where batch_id=p_row.batch_id and source_table='annee_scolaires' and source_id=p_row.payload->>'annee_scolaire_id';
    if parent.id is not null then return escen_private.history_year_ids(parent,p_depth+1); end if;
    return result; -- A missing declared parent is never replaced by an inferred year.
  end if;
  if p_row.source_table='etudiants' then
    for parent in select * from escen_private.legacy_rows where batch_id=p_row.batch_id and source_table='etudiant_group' and payload->>'etudiant_id'=p_row.source_id loop
      result:=result||escen_private.history_year_ids(parent,p_depth+1);
    end loop;
    return array(select distinct unnest(result));
  end if;
  for k,target in select * from (values ('group_id','groups'),('unite_valeur_id','unite_valeurs'),('uv_id','unite_valeurs'),('evaluation_id','evaluations'),('frais_etudiant_id','frais_etudiants'),('frais_scolarite_id','frais_scolarites'),('echeancier_id','echeanciers'),('question_id','exam_questions'),('part_id','exam_parts'),('emploi_du_temps_id','emploi_du_temps')) as links(field_name,table_name) loop
    if nullif(p_row.payload->>k,'') is not null then
      select * into parent from escen_private.legacy_rows where batch_id=p_row.batch_id and source_table=target and source_id=p_row.payload->>k;
      if parent.id is not null then other:=escen_private.history_year_ids(parent,p_depth+1); result:=result||other; end if;
    end if;
  end loop;
  return array(select distinct unnest(result));
end $$;
create function escen_private.history_matches_year(p_row escen_private.legacy_rows,p_year_id uuid) returns boolean
language sql stable set search_path=pg_catalog as $$
  select p_row.source_table in ('annee_scolaires','filieres','niveaux','matieres','periodes','salles','users','blogs','urgent_infos','gallery_albums','gallery_photos','blog_comments','document_types','document_requirements','support_categories','activity_log','notifications')
    or p_year_id=any(escen_private.history_year_ids(p_row));
$$;
create function public.escen_history_page_year(p_year_id uuid,p_table text,p_offset integer default 0,p_limit integer default 50,p_query text default '',p_flagged boolean default false,p_student_id text default null,p_batch_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  if not exists(select 1 from escen_private.history_catalog where table_name=p_table) then raise exception 'Collection non publiée' using errcode='42501'; end if;
  if p_offset<0 or p_offset>1000000 or p_limit not between 1 and 100 or length(p_query)>160 then raise exception 'Pagination invalide' using errcode='23514'; end if;
  return (with source as (
    select l.*,escen_private.safe_history_record(l) as safe from escen_private.legacy_rows l where source_table=p_table and escen_private.history_visible_row(l)
      and escen_private.history_matches_year(l,p_year_id) and (p_batch_id is null or batch_id=p_batch_id)
  ), filtered as (
    select * from source where (p_query='' or safe->>'values' ilike '%'||p_query||'%') and (not p_flagged or exists(select 1 from escen_private.import_issues i where i.row_id=source.id and i.resolved_at is null))
      and (p_student_id is null or payload->>'etudiant_id'=p_student_id or p_table='etudiants' and source_id=p_student_id)
  ) select jsonb_build_object('table',p_table,'total',(select count(*) from filtered),'records',coalesce((select jsonb_agg(safe order by source_id) from (select safe,source_id from filtered order by source_id offset p_offset limit p_limit) p),'[]'),'offset',p_offset,'limit',p_limit));
end $$;
create function public.escen_history_catalog_year(p_year_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare result jsonb; refs jsonb; entry record;
begin
  result:=public.escen_history_catalog(); refs:=result->'references';
  for entry in select key,value from jsonb_each(refs) loop
    refs:=jsonb_set(refs,array[entry.key],coalesce((select jsonb_agg(record) from jsonb_array_elements(entry.value) record join escen_private.legacy_rows l on l.id=(record->>'id')::uuid where escen_private.history_matches_year(l,p_year_id)),'[]'));
  end loop;
  return result||jsonb_build_object('references',refs,'datasets',coalesce((select jsonb_agg(jsonb_build_object('table',c.table_name,'count',(select count(*) from escen_private.legacy_rows l where l.source_table=c.table_name and escen_private.history_visible_row(l) and escen_private.history_matches_year(l,p_year_id)),'flagged',(select count(distinct l.id) from escen_private.legacy_rows l join escen_private.import_issues i on i.row_id=l.id where l.source_table=c.table_name and escen_private.history_visible_row(l) and i.resolved_at is null and escen_private.history_matches_year(l,p_year_id)))) from escen_private.history_catalog c),'[]'));
end $$;
create function public.escen_history_row_matches_year(p_year_id uuid,p_row_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select coalesce((select escen_private.history_matches_year(l,p_year_id) from escen_private.legacy_rows l where id=p_row_id and escen_private.history_visible_row(l)),false);
$$;
-- Every new function is server-only; no RLS policy or browser RPC grant is introduced.
do $$ declare signature text; role_name text; begin
  foreach signature in array array['public.escen_history_row_matches_year(uuid,uuid)','public.escen_academic_year_context()','public.escen_academic_year_command(uuid,text,text,uuid,bigint,text,text)','public.escen_history_page_year(uuid,text,integer,integer,text,boolean,text,uuid)','public.escen_history_catalog_year(uuid)'] loop
    execute 'revoke all on function '||signature||' from public';
    foreach role_name in array array['anon','authenticated'] loop
      if exists(select 1 from pg_roles where rolname=role_name) then execute 'revoke all on function '||signature||' from '||quote_ident(role_name); end if;
    end loop;
    if exists(select 1 from pg_roles where rolname='service_role') then execute 'grant execute on function '||signature||' to service_role'; end if;
  end loop;
end $$;
revoke all on function escen_private.activity_year(text,jsonb,integer),escen_private.history_year_ids(escen_private.legacy_rows,integer),escen_private.history_matches_year(escen_private.legacy_rows,uuid),escen_private.guard_working_year(),escen_private.guard_academic_year(),escen_private.guard_annual_activity(),escen_private.guard_website_intake_year(),escen_private.guard_application_year() from public;
commit;

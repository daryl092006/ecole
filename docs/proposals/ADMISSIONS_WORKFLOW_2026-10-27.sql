-- SQL proposé pour accord avant création d'une migration et application distante.
-- Document de cadrage fourni par l'utilisateur : aucun concours dans ce parcours.
begin;
alter table escen.online_applications
  add column workflow_stage text check(workflow_stage in ('NOUVELLE','RECUE','VERIFICATION_ADMISSION','INCOMPLET','A_COMPLETER','COMPLET','TRANSMIS_ACADEMIE','ETUDE_ACADEMIQUE','ADMISSIBLE','ATTENTE_PAIEMENT','ADMIS_OFFICIEL','REFUSE')),
  add column entry_channel text not null default 'WEB' check(entry_channel in ('WEB','ACCUEIL')),
  add column requested_changes text,
  add column registration_fee_due escen.xof_amount,
  add column registration_fee_schedule_id uuid references escen.annual_fee_schedules(id) on delete restrict,
  add column student_id uuid references escen.students(id) on delete restrict;
create index application_workflow_year on escen.online_applications(academic_year_id,workflow_stage,submitted_at desc);
create index application_registration_schedule_fk on escen.online_applications(registration_fee_schedule_id);
create index application_student_fk on escen.online_applications(student_id);
alter table escen.online_applications add constraint application_year_identity unique(id,academic_year_id);

create table escen.application_events (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references escen.online_applications(id) on delete restrict,
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  actor_id uuid references escen.accounts(id) on delete restrict, action text not null, from_stage text, to_stage text,
  reason text not null check(length(btrim(reason)) between 3 and 1000), metadata jsonb not null default '{}',
  visible_to_candidate boolean not null default true, created_at timestamptz not null default clock_timestamp(),
  foreign key(application_id,academic_year_id) references escen.online_applications(id,academic_year_id) on delete restrict
);
create table escen.application_letters (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references escen.online_applications(id) on delete restrict,
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  event_id uuid not null unique references escen.application_events(id) on delete restrict,
  kind text not null check(kind in ('ADMISSIBILITE','REFUS','ADMISSION')), reference text not null unique,
  content text not null check(length(content) between 20 and 20000), issued_by uuid references escen.accounts(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  foreign key(application_id,academic_year_id) references escen.online_applications(id,academic_year_id) on delete restrict
);
create table escen.application_registration_payments (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references escen.online_applications(id) on delete restrict,
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  kind text not null check(kind in ('PAYMENT','REVERSAL')), amount escen.xof_amount not null check(amount>0),
  channel_id uuid not null references escen.annual_payment_channels(id) on delete restrict,
  reference text not null check(length(btrim(reference)) between 3 and 160),
  reversal_of uuid unique references escen.application_registration_payments(id) on delete restrict,
  recorded_by uuid not null references escen.accounts(id) on delete restrict,
  reason text not null check(length(btrim(reason)) between 3 and 1000), created_at timestamptz not null default clock_timestamp(),
  check((kind='PAYMENT' and reversal_of is null) or (kind='REVERSAL' and reversal_of is not null)),
  foreign key(application_id,academic_year_id) references escen.online_applications(id,academic_year_id) on delete restrict
);
create unique index application_payment_reference on escen.application_registration_payments(academic_year_id,channel_id,lower(reference)) where kind='PAYMENT';
create table escen.application_notifications (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references escen.online_applications(id) on delete restrict,
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  event_id uuid not null references escen.application_events(id) on delete restrict,
  account_id uuid not null references escen.accounts(id) on delete restrict, role_code text not null,
  message text not null, read_at timestamptz, created_at timestamptz not null default clock_timestamp(),
  unique(event_id,account_id,role_code),
  foreign key(application_id,academic_year_id) references escen.online_applications(id,academic_year_id) on delete restrict
);
do $$ declare item text; begin
 foreach item in array array['application_events','application_letters','application_registration_payments','application_notifications'] loop
  execute format('alter table escen.%I enable row level security',item);
  execute format('revoke all on escen.%I from public',item);
  execute format('create trigger audit_event after insert or update on escen.%I for each row execute function escen_private.record_audit()',item);
  if item<>'application_notifications' then
   execute format('create trigger immutable_record before update or delete on escen.%I for each row execute function escen_private.immutable_record()',item);
  else
   execute format('create trigger no_delete before delete on escen.%I for each row execute function escen_private.no_delete()',item);
  end if;
 end loop;
end $$;
create index application_event_app on escen.application_events(application_id,created_at);
create index application_event_actor on escen.application_events(actor_id);
create index application_event_year on escen.application_events(academic_year_id);
create index application_letter_app on escen.application_letters(application_id);
create index application_letter_actor on escen.application_letters(issued_by);
create index application_letter_year on escen.application_letters(academic_year_id);
create index application_registration_app on escen.application_registration_payments(application_id);
create index application_registration_year on escen.application_registration_payments(academic_year_id);
create index application_registration_channel on escen.application_registration_payments(channel_id);
create index application_registration_actor on escen.application_registration_payments(recorded_by);
create index application_notice_recipient on escen.application_notifications(account_id,role_code,read_at);
create index application_notice_app on escen.application_notifications(application_id);
create index application_notice_event on escen.application_notifications(event_id);
create index application_notice_year on escen.application_notifications(academic_year_id);

insert into escen.permissions(code,description) values
 ('application.view','Consulter les candidatures autorisées'),('application.review','Vérifier et transmettre les candidatures'),
 ('application.decide','Prendre une décision académique'),('application.payment.confirm','Confirmer les frais d’inscription des candidats'),
 ('application.followup','Accompagner les candidatures à compléter');
insert into escen.role_permissions(role_id,permission_id)
 select r.id,p.id from escen.roles r cross join escen.permissions p where p.code like 'application.%' and (
  r.code='IT' or (p.code='application.view' and r.code in ('DG','DGA','DA','LOG','RAF','MKT'))
  or (p.code='application.review' and r.code='LOG') or (p.code='application.decide' and r.code='DA')
  or (p.code='application.payment.confirm' and r.code='RAF') or (p.code='application.followup' and r.code in ('LOG','MKT')));

create function escen_private.application_allowed(p_actor uuid,p_role text,p_permission text) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select exists(select 1 from escen.accounts a join escen.role_grants g on g.account_id=a.id
 join escen.roles r on r.id=g.role_id join escen.role_permissions rp on rp.role_id=r.id join escen.permissions p on p.id=rp.permission_id
 where a.id=p_actor and a.active and a.auth_user_id is not null and a.archived_at is null and r.active and r.code=p_role
 and p.code=p_permission and g.site_id is null and g.group_id is null and g.academic_year_id is null
 and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()));
$$;
create function escen_private.application_visible(p_actor uuid,p_role text,a escen.online_applications) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select escen_private.application_allowed(p_actor,p_role,'application.view') and
 case when p_role='MKT' then a.workflow_stage in ('INCOMPLET','A_COMPLETER')
 when p_role='DA' then a.workflow_stage is null or a.workflow_stage in ('TRANSMIS_ACADEMIE','ETUDE_ACADEMIQUE','ADMISSIBLE','ATTENTE_PAIEMENT','ADMIS_OFFICIEL','REFUSE')
 when p_role='RAF' then a.workflow_stage is null or a.workflow_stage in ('ADMISSIBLE','ATTENTE_PAIEMENT','ADMIS_OFFICIEL') else true end;
$$;
create function escen_private.application_stage_label(p_stage text) returns text language sql immutable set search_path=pg_catalog as $$
 select case p_stage when 'NOUVELLE' then 'Nouvelle candidature' when 'RECUE' then 'Candidature reçue' when 'VERIFICATION_ADMISSION' then 'En vérification admission'
 when 'INCOMPLET' then 'Dossier incomplet' when 'A_COMPLETER' then 'Dossier à compléter' when 'COMPLET' then 'Dossier complet'
 when 'TRANSMIS_ACADEMIE' then 'Transmis à l’académie' when 'ETUDE_ACADEMIQUE' then 'En étude académique'
 when 'ADMISSIBLE' then 'Admissible' when 'ATTENTE_PAIEMENT' then 'En attente de paiement' when 'ADMIS_OFFICIEL' then 'Admis officiellement'
 when 'REFUSE' then 'Refusé' else 'Dossier historique' end;
$$;
create function escen_private.application_json(a escen.online_applications,p_role text default 'CANDIDAT') returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
 select (to_jsonb(a)-array['legacy_source_row_id','registration_fee_schedule_id']) || jsonb_build_object(
  'intake_label',(select label from escen.website_intakes where id=a.intake_id),
  'intake_level_id',(select level_id from escen.website_intakes where id=a.intake_id),
  'intake_program_id',(select program_id from escen.website_intakes where id=a.intake_id),
  'academic_year_name',(select name from escen.academic_years where id=a.academic_year_id),
  'identity',case when p_role in ('MKT','RAF') then jsonb_build_object('nom',a.identity->>'nom','prenom',a.identity->>'prenom','email',a.identity->>'email','tel',a.identity->>'tel') else a.identity end,
  'diploma',case when p_role in ('MKT','RAF') then '{}'::jsonb else a.diploma end,
  'guardians',case when p_role in ('MKT','RAF') then '[]'::jsonb else a.guardians end,
  'required_documents',coalesce((select required_documents from escen.website_intakes where id=a.intake_id),'[]'::jsonb),
  'documents',case when p_role in ('MKT','RAF') then '[]'::jsonb else coalesce((select jsonb_agg(to_jsonb(d)-'bucket'-'object_path'-'sha256' order by d.created_at desc,d.id) from escen.application_documents d where d.application_id=a.id),'[]'::jsonb) end,
  'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'action',e.action,'from_stage',e.from_stage,'to_stage',e.to_stage,'reason',e.reason,'created_at',e.created_at) order by e.created_at,e.id)
    from escen.application_events e where e.application_id=a.id and (e.visible_to_candidate or p_role not in ('CANDIDAT','MKT','RAF') or (p_role='MKT' and e.action='contact'))),'[]'::jsonb),
  'letters',case when p_role='MKT' then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'kind',l.kind,'reference',l.reference,'content',l.content,'created_at',l.created_at) order by l.created_at) from escen.application_letters l where l.application_id=a.id),'[]'::jsonb) end,
  'registration_fee_paid',coalesce((select sum(case kind when 'PAYMENT' then amount else -amount end) from escen.application_registration_payments where application_id=a.id),0),
  'registration_payments',case when p_role='MKT' then '[]'::jsonb else coalesce((select jsonb_agg(to_jsonb(p)-'recorded_by'-'channel_id' order by p.created_at,p.id) from escen.application_registration_payments p where p.application_id=a.id),'[]'::jsonb) end
 );
$$;

-- Toute décision passe par une commande dédiée ; pas d'écriture générique du circuit.
create function escen_private.guard_application_workflow() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if current_setting('escen.application_command',true) is distinct from '1' then
  if tg_table_name<>'online_applications' then
    raise exception 'Commande de candidature obligatoire' using errcode='42501';
  elsif (tg_op='INSERT' and new.workflow_stage is not null) or
   (tg_op='UPDATE' and (new.workflow_stage is not null or old.workflow_stage is not null)) then
    raise exception 'Commande de candidature obligatoire' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
create trigger application_workflow_guard before insert or update on escen.online_applications for each row execute function escen_private.guard_application_workflow();
do $$ declare t text; begin foreach t in array array['application_events','application_letters','application_registration_payments','application_notifications'] loop
 execute format('create trigger workflow_command before insert or update on escen.%I for each row execute function escen_private.guard_application_workflow()',t);
end loop; end $$;

-- Événement, courrier et notifications sont enregistrés dans la transaction métier.
create function escen_private.application_event(p_application uuid,p_actor uuid,p_action text,p_from text,p_to text,p_reason text,p_metadata jsonb default '{}',p_access_url text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare a escen.online_applications; event_id uuid:=gen_random_uuid(); roles text[]:='{}'; recipient record;
 subject text; body text; letter_kind text; letter_content text; letter_reference text; label text; candidate_notice boolean:=true;
begin
 select * into strict a from escen.online_applications where id=p_application;
 label:=escen_private.application_stage_label(p_to);
 insert into escen.application_events(id,application_id,academic_year_id,actor_id,action,from_stage,to_stage,reason,metadata,visible_to_candidate)
 values(event_id,a.id,a.academic_year_id,p_actor,p_action,p_from,p_to,p_reason,p_metadata,p_action<>'contact');
 subject:='Suivi de votre candidature ESCEN';
 body:='Bonjour '||coalesce(a.identity->>'prenom','')||' '||coalesce(a.identity->>'nom','')||E',\n\n';
 if p_action in ('submit','create') then
  subject:='Confirmation de réception de votre candidature';
  body:=body||'Votre candidature à ESCEN a bien été reçue. Référence : '||a.reference||E'.\nVotre dossier sera vérifié par l’équipe admission. Les pièces manquantes peuvent être ajoutées depuis votre espace candidat.';
  if p_access_url is not null then body:=body||E'\n\nVotre accès personnel à l’espace candidat : '||p_access_url; end if;
  roles:=array['LOG','IT'];
 elsif p_to in ('INCOMPLET','A_COMPLETER') then
  subject:='Votre dossier de candidature est à compléter';body:=body||E'Éléments à compléter ou corriger :\n'||p_reason||E'\nReconnectez-vous à votre espace candidat pour compléter votre dossier.';roles:=array['MKT'];
 elsif p_to='TRANSMIS_ACADEMIE' then
  subject:='Votre dossier est en cours d’étude académique';body:=body||'Votre dossier a été vérifié par l’équipe admission et transmis à l’académie. Vous serez informé de la décision.';roles:=array['DA'];
 elsif p_to='ADMISSIBLE' then
  subject:='Lettre d’admissibilité à ESCEN';letter_kind:='ADMISSIBILITE';roles:=array['LOG','RAF'];
  letter_content:=body||'Votre candidature a été validée par l’académie. Vous êtes admissible à ESCEN, sous réserve du paiement des frais d’inscription de '||a.registration_fee_due::text||E' FCFA.\nVotre admission deviendra officielle après confirmation du paiement.';
 elsif p_to='REFUSE' then
  subject:='Décision concernant votre candidature';letter_kind:='REFUS';
  letter_content:=body||E'Après étude, votre candidature n’a pas été retenue.\nMotif : '||p_reason||E'\nNous vous remercions pour l’intérêt porté à ESCEN.';
 elsif p_to='ADMIS_OFFICIEL' and p_from is distinct from p_to then
  subject:='Confirmation de votre admission officielle à ESCEN';letter_kind:='ADMISSION';roles:=array['LOG'];
  letter_content:=body||'Le paiement de vos frais d’inscription est confirmé. Votre admission à ESCEN est désormais officielle.';
 elsif p_action='reverse_payment' then
  body:=body||'Une confirmation de paiement a été annulée avec le motif suivant : '||p_reason||'. Consultez votre situation actualisée.';roles:=array['LOG','RAF'];
 elsif p_action='contact' or p_to=p_from or p_to in ('RECUE','VERIFICATION_ADMISSION','COMPLET','ETUDE_ACADEMIQUE') then candidate_notice:=false;
 else body:=body||'Votre dossier est maintenant au statut « '||label||' ». '||p_reason;
 end if;
 if letter_kind is not null then
  letter_reference:='ESCEN-'||letter_kind||'-'||left(replace(event_id::text,'-',''),16);
  letter_content:=letter_content||E'\n\nRéférence du dossier : '||a.reference||E'\nAnnée : '||(select name from escen.academic_years where id=a.academic_year_id)||E'\n\nL’équipe ESCEN';
  insert into escen.application_letters(application_id,academic_year_id,event_id,kind,reference,content,issued_by) values(a.id,a.academic_year_id,event_id,letter_kind,letter_reference,letter_content,p_actor);
  body:=letter_content;
 end if;
 if candidate_notice then
  if p_access_url is not null and p_action not in ('submit','create') then body:=body||E'\n\nVotre accès personnel à l’espace candidat : '||p_access_url; end if;
  perform public.escen_email_enqueue(a.academic_year_id,case when p_action in ('submit','create') then 'application_received' else 'application_status_changed' end,
   'online_applications',a.id,a.version::text||':candidate',a.identity->>'email',left(coalesce(a.identity->>'prenom','')||' '||coalesce(a.identity->>'nom',''),160),subject,body,'<p>'||replace(replace(replace(replace(body,'&','&amp;'),'<','&lt;'),'>','&gt;'),E'\n','<br>')||'</p>',p_actor);
 end if;
 for recipient in select distinct ac.id account_id,r.code,p.email,p.firstname,p.lastname from escen.accounts ac join escen.people p on p.id=ac.person_id
  join escen.role_grants g on g.account_id=ac.id join escen.roles r on r.id=g.role_id
  where r.code=any(roles) and r.active and ac.active and ac.auth_user_id is not null and ac.archived_at is null and p.archived_at is null
  and g.site_id is null and g.group_id is null and g.academic_year_id is null and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()) loop
  insert into escen.application_notifications(application_id,academic_year_id,event_id,account_id,role_code,message) values(a.id,a.academic_year_id,event_id,recipient.account_id,recipient.code,label||' · '||a.reference);
  if recipient.email is not null and length(btrim(recipient.email))<=254 and recipient.email ~ '^[^[:space:]<>@]+@[^[:space:]<>@]+[.][^[:space:]<>@]+$' then
   perform public.escen_email_enqueue(a.academic_year_id,'application_status_changed','online_applications',a.id,a.version::text||':staff',recipient.email,'Équipe ESCEN',
    'Candidature ESCEN · '||label,'Le dossier '||a.reference||' est au statut « '||label||' ». Consultez les candidatures dans l’application interne.',
    '<p>Le dossier '||a.reference||' est au statut « '||label||' ». Consultez l’application interne.</p>',p_actor);
  end if;
 end loop;
 return event_id;
end $$;

create function public.escen_application_notices(p_actor_id uuid,p_role_code text,p_year_id uuid default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if not escen_private.application_allowed(p_actor_id,p_role_code,'application.view') then raise exception 'Notifications refusées' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(x)) from (
  select n.id,n.application_id,n.message,n.created_at from escen.application_notifications n join escen.online_applications a on a.id=n.application_id
  where n.account_id=p_actor_id and n.role_code=p_role_code and n.read_at is null and (p_year_id is null or a.academic_year_id=p_year_id)
   and escen_private.application_visible(p_actor_id,p_role_code,a) order by n.created_at desc,n.id limit 200
 ) x),'[]'::jsonb);
end $$;
create function public.escen_admissions_context(p_actor_id uuid,p_role_code text,p_year_id uuid default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if not escen_private.application_allowed(p_actor_id,p_role_code,'application.view') then raise exception 'Accès candidatures refusé' using errcode='42501'; end if;
 return jsonb_build_object('enabled',true,
  'applications',coalesce((select jsonb_agg(escen_private.application_json(a,p_role_code) order by a.created_at desc,a.id) from escen.online_applications a
   where (p_year_id is null or a.academic_year_id=p_year_id) and (a.status<>'BROUILLON' or a.legacy_source_row_id is not null) and escen_private.application_visible(p_actor_id,p_role_code,a)),'[]'::jsonb),
  'intakes',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('level_name',l.name,'program_name',p.name)) from escen.website_intakes i join escen.levels l on l.id=i.level_id join escen.programs p on p.id=i.program_id
    where (p_year_id is null or i.academic_year_id=p_year_id) and l.archived_at is null and p.archived_at is null),'[]'::jsonb),
  'capabilities',jsonb_build_object('review',escen_private.application_allowed(p_actor_id,p_role_code,'application.review'),'decide',escen_private.application_allowed(p_actor_id,p_role_code,'application.decide'),
   'payment',escen_private.application_allowed(p_actor_id,p_role_code,'application.payment.confirm'),'followup',escen_private.application_allowed(p_actor_id,p_role_code,'application.followup')),
  'payment_channels',coalesce((select jsonb_agg(to_jsonb(c)) from escen.annual_payment_channels c where (p_year_id is null or c.academic_year_id=p_year_id) and archived_at is null),'[]'::jsonb),
  'notices',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'application_id',n.application_id,'message',n.message,'created_at',n.created_at) order by n.created_at desc)
    from escen.application_notifications n join escen.online_applications a on a.id=n.application_id where n.account_id=p_actor_id and n.role_code=p_role_code and n.read_at is null
    and (p_year_id is null or a.academic_year_id=p_year_id) and escen_private.application_visible(p_actor_id,p_role_code,a)),'[]'::jsonb));
end $$;

create function public.escen_application_command(p_actor_id uuid,p_role_code text,p_year_id uuid,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare a escen.online_applications; previous_stage text; next_stage text; permission text; due escen.annual_fee_schedules;
 fee_count integer; maximum_rank integer; paid numeric; payment escen.application_registration_payments; new_payment uuid:=gen_random_uuid();
 identity_id uuid; student uuid; result jsonb; previous_marker text; access_url text; v_reason text:=btrim(p_data->>'reason');
begin
 permission:=case when p_action in ('study','admissible','refuse') then 'application.decide' when p_action in ('confirm_payment','reverse_payment') then 'application.payment.confirm'
  when p_action='contact' then 'application.followup' else 'application.review' end;
 if not escen_private.application_allowed(p_actor_id,p_role_code,permission) then raise exception 'Action candidature refusée' using errcode='42501'; end if;
 if coalesce(length(v_reason),0) not between 3 and 1000 then raise exception 'Motif obligatoire' using errcode='23514'; end if;
 perform 1 from escen_private.portal_revision where singleton for update;
 select * into a from escen.online_applications where id=(p_data->>'id')::uuid for update;
 if a.id is null or a.academic_year_id is distinct from p_year_id then raise exception 'Candidature introuvable dans cette année' using errcode='P0002'; end if;
 if not escen_private.application_visible(p_actor_id,p_role_code,a) then raise exception 'Dossier hors de votre étape' using errcode='42501'; end if;
 if a.version is distinct from (p_data->>'version')::integer then raise exception 'Modification concurrente' using errcode='40001'; end if;
 if not exists(select 1 from escen.academic_years where id=p_year_id and archived_at is null and status in ('OUVERTE','EN_CLOTURE')) then raise exception 'Année non modifiable' using errcode='23514'; end if;
 previous_stage:=a.workflow_stage; next_stage:=previous_stage;
 previous_marker:=current_setting('escen.application_command',true); perform set_config('escen.application_command','1',true); perform set_config('escen.actor_id',p_actor_id::text,true);
 case p_action
 when 'acknowledge' then if previous_stage is distinct from 'NOUVELLE' then raise exception 'Réception impossible' using errcode='23514'; end if; next_stage:='RECUE';
 when 'review' then
  if previous_stage is not null and previous_stage not in ('NOUVELLE','RECUE','INCOMPLET','A_COMPLETER') then raise exception 'Vérification impossible' using errcode='23514'; end if;
  if a.status='BROUILLON' then raise exception 'Un brouillon doit être soumis par son auteur' using errcode='23514'; end if;
  next_stage:='VERIFICATION_ADMISSION';
 when 'incomplete' then if previous_stage is distinct from 'VERIFICATION_ADMISSION' then raise exception 'Vérification préalable requise' using errcode='23514'; end if; next_stage:='INCOMPLET';
 when 'request_changes' then if previous_stage is null or previous_stage not in ('VERIFICATION_ADMISSION','INCOMPLET','COMPLET') then raise exception 'Complément impossible' using errcode='23514'; end if; next_stage:='A_COMPLETER';
 when 'complete' then
  if previous_stage is distinct from 'VERIFICATION_ADMISSION' or p_data->>'identity_checked' is distinct from 'true' or p_data->>'guardians_checked' is distinct from 'true' then raise exception 'Contrôles admission requis' using errcode='23514'; end if;
  if a.intake_id is null or jsonb_array_length(a.guardians)<1 then raise exception 'Formation et tuteurs requis' using errcode='23514'; end if;
  if exists(select 1 from escen.website_intakes i cross join lateral jsonb_array_elements_text(i.required_documents) k where i.id=a.intake_id
    and not exists(select 1 from escen.application_documents d where d.application_id=a.id and d.document_key=k
      and d.id=(select latest.id from escen.application_documents latest where latest.application_id=a.id and latest.document_key=k order by latest.created_at desc,latest.id desc limit 1)
      and p_data->'checked_documents' @> jsonb_build_array(d.id::text))) then raise exception 'Les pièces requises doivent être présentes et contrôlées' using errcode='23514'; end if;
  if exists(select 1 from jsonb_array_elements_text(p_data->'checked_documents') d where not exists(select 1 from escen.application_documents where id=d::uuid and application_id=a.id)) then raise exception 'Pièce hors dossier' using errcode='23514'; end if;
  next_stage:='COMPLET';
 when 'transmit' then
  if previous_stage is distinct from 'COMPLET' then raise exception 'Dossier complet requis' using errcode='23514'; end if;
  if exists(select 1 from escen.website_intakes i cross join lateral jsonb_array_elements_text(i.required_documents) k where i.id=a.intake_id and not exists(
    select 1 from escen.application_documents d where d.application_id=a.id and d.document_key=k
    and d.id=(select latest.id from escen.application_documents latest where latest.application_id=a.id and latest.document_key=k order by latest.created_at desc,latest.id desc limit 1)
    and coalesce((select e.metadata->'checked_documents' from escen.application_events e where e.application_id=a.id and e.action='complete' order by e.created_at desc,e.id desc limit 1),'[]'::jsonb) @> jsonb_build_array(d.id::text)))
   then raise exception 'Les pièces attendues ont changé : vérifier à nouveau la complétude' using errcode='23514'; end if;
  next_stage:='TRANSMIS_ACADEMIE';
 when 'study' then if previous_stage is distinct from 'TRANSMIS_ACADEMIE' then raise exception 'Transmission admission requise' using errcode='23514'; end if; next_stage:='ETUDE_ACADEMIQUE';
 when 'admissible' then
  if previous_stage is distinct from 'ETUDE_ACADEMIQUE' then raise exception 'Étude académique requise' using errcode='23514'; end if;
  perform 1 from escen.annual_fee_schedules f join escen.website_intakes i on i.id=a.intake_id where f.academic_year_id=a.academic_year_id and f.category='INSCRIPTION' and f.archived_at is null
   and (f.program_id is null or f.program_id=i.program_id) and (f.level_id is null or f.level_id=i.level_id) for share of f;
  select max((f.program_id is not null)::integer+(f.level_id is not null)::integer) into maximum_rank from escen.annual_fee_schedules f join escen.website_intakes i on i.id=a.intake_id
   where f.academic_year_id=a.academic_year_id and f.category='INSCRIPTION' and f.archived_at is null and (f.program_id is null or f.program_id=i.program_id) and (f.level_id is null or f.level_id=i.level_id);
  select count(*) into fee_count from escen.annual_fee_schedules f join escen.website_intakes i on i.id=a.intake_id where f.academic_year_id=a.academic_year_id and f.category='INSCRIPTION' and f.archived_at is null
   and (f.program_id is null or f.program_id=i.program_id) and (f.level_id is null or f.level_id=i.level_id) and (f.program_id is not null)::integer+(f.level_id is not null)::integer=maximum_rank;
  if fee_count<>1 then raise exception 'Tarif d’inscription absent ou ambigu' using errcode='23514'; end if;
  select f.* into due from escen.annual_fee_schedules f join escen.website_intakes i on i.id=a.intake_id where f.academic_year_id=a.academic_year_id and f.category='INSCRIPTION' and f.archived_at is null
   and (f.program_id is null or f.program_id=i.program_id) and (f.level_id is null or f.level_id=i.level_id) and (f.program_id is not null)::integer+(f.level_id is not null)::integer=maximum_rank;
  if due.amount<=0 then raise exception 'Un tarif positif ou une décision d’exonération est requis' using errcode='23514'; end if;
  update escen.online_applications set registration_fee_due=due.amount,registration_fee_schedule_id=due.id where id=a.id;
  next_stage:='ADMISSIBLE';
 when 'refuse' then if previous_stage is distinct from 'ETUDE_ACADEMIQUE' then raise exception 'Étude académique requise' using errcode='23514'; end if; next_stage:='REFUSE';
 when 'await_payment' then if previous_stage is distinct from 'ADMISSIBLE' then raise exception 'Admissibilité requise' using errcode='23514'; end if; next_stage:='ATTENTE_PAIEMENT';
 when 'confirm_payment' then
  if previous_stage is null or previous_stage not in ('ADMISSIBLE','ATTENTE_PAIEMENT') or a.registration_fee_due is null then raise exception 'Admissibilité et frais fixés requis' using errcode='23514'; end if;
  perform 1 from escen.annual_payment_channels where id=(p_data->>'channel_id')::uuid and academic_year_id=a.academic_year_id and archived_at is null for share;
  if not found then raise exception 'Moyen de paiement indisponible dans cette année' using errcode='23514'; end if;
  paid:=coalesce((select sum(case kind when 'PAYMENT' then amount else -amount end) from escen.application_registration_payments where application_id=a.id),0);
  if (p_data->>'amount')::numeric<=0 or (p_data->>'amount')::numeric<>trunc((p_data->>'amount')::numeric) or paid+(p_data->>'amount')::numeric>a.registration_fee_due then raise exception 'Montant invalide ou supérieur au reste à régler' using errcode='23514'; end if;
  insert into escen.application_registration_payments(id,application_id,academic_year_id,kind,amount,channel_id,reference,recorded_by,reason)
   values(new_payment,a.id,a.academic_year_id,'PAYMENT',(p_data->>'amount')::numeric,(p_data->>'channel_id')::uuid,btrim(p_data->>'reference'),p_actor_id,v_reason);
  if paid+(p_data->>'amount')::numeric=a.registration_fee_due then next_stage:='ADMIS_OFFICIEL'; else next_stage:='ATTENTE_PAIEMENT'; end if;
 when 'reverse_payment' then
  if previous_stage is null or previous_stage not in ('ADMISSIBLE','ATTENTE_PAIEMENT','ADMIS_OFFICIEL') then raise exception 'Annulation hors circuit financier' using errcode='23514'; end if;
  select * into payment from escen.application_registration_payments where id=(p_data->>'payment_id')::uuid and application_id=a.id and kind='PAYMENT' for update;
  if payment.id is null or exists(select 1 from escen.application_registration_payments where reversal_of=payment.id) then raise exception 'Confirmation absente ou déjà annulée' using errcode='23514'; end if;
  insert into escen.application_registration_payments(application_id,academic_year_id,kind,amount,channel_id,reference,reversal_of,recorded_by,reason)
   values(a.id,a.academic_year_id,'REVERSAL',payment.amount,payment.channel_id,'ANNULATION-'||left(new_payment::text,16),payment.id,p_actor_id,v_reason);
  next_stage:='ATTENTE_PAIEMENT';
 when 'contact' then if previous_stage is null or previous_stage not in ('INCOMPLET','A_COMPLETER') then raise exception 'Accompagnement hors dossier à compléter' using errcode='23514'; end if;
 when 'create_student' then
  if previous_stage is distinct from 'ADMIS_OFFICIEL' or a.student_id is not null or coalesce(length(btrim(p_data->>'matricule')),0) not between 1 and 160 then raise exception 'Admission officielle et matricule requis' using errcode='23514'; end if;
  if p_data->>'existing_student_id' is not null then
   select id into student from escen.students where id=(p_data->>'existing_student_id')::uuid and matricule=btrim(p_data->>'matricule') and archived_at is null;
   if student is null then raise exception 'Dossier étudiant absent' using errcode='23514'; end if;
  else
   if exists(select 1 from escen.people where lower(btrim(email))=lower(btrim(a.identity->>'email')) and archived_at is null) then raise exception 'Identité existante : sélectionner explicitement le dossier à relier' using errcode='23505'; end if;
   insert into escen.people(firstname,lastname,email,phone,gender,birth_date,nationality,address)
    values(a.identity->>'prenom',a.identity->>'nom',lower(a.identity->>'email'),a.identity->>'tel',a.identity->>'genre',(a.identity->>'date_naissance')::date,a.identity->>'nationalite',a.identity->>'adresse') returning id into identity_id;
   insert into escen.students(person_id,matricule) values(identity_id,btrim(p_data->>'matricule')) returning id into student;
  end if;
  update escen.online_applications set student_id=student where id=a.id;
 else raise exception 'Action inconnue' using errcode='23514';
 end case;
 update escen.online_applications set workflow_stage=next_stage,version=version+1,reason=v_reason,
  requested_changes=case when next_stage in ('INCOMPLET','A_COMPLETER') then v_reason else null end where id=a.id;
 if p_action in ('incomplete','request_changes') and not exists(select 1 from escen_private.application_access where id=a.id and expires_at>now()) then
  if coalesce(p_data->>'access_token_hash','') !~ '^[a-f0-9]{64}$' or coalesce(p_data->>'access_url','') !~ '^https?://' then raise exception 'Accès candidat à préparer pour ce dossier' using errcode='23514'; end if;
  insert into escen_private.application_access(id,token_hash,expires_at) values(a.id,p_data->>'access_token_hash',now()+interval '180 days')
   on conflict(id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at;
  access_url:=p_data->>'access_url';
 end if;
 perform escen_private.application_event(a.id,p_actor_id,p_action,previous_stage,next_stage,v_reason,p_data-array['reason','id','version','access_token_hash','access_url'],access_url);
 update escen_private.portal_revision set revision=revision+1,actor_id=p_actor_id,changed_at=now() where singleton;
 select escen_private.application_json(t,p_role_code) into result from escen.online_applications t where id=a.id;
 perform set_config('escen.application_command',coalesce(previous_marker,''),true);
 return result;
end $$;

-- Entrées site et guichet : même validation, même réception, aucun contrôle de pièces au dépôt.
create function public.escen_application_submit(p_actor_id uuid,p_role_code text,p_year_id uuid,p_token_hash text,p_data jsonb,p_access_url text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare a escen.online_applications; i escen.website_intakes; previous_marker text; target uuid; channel text;
begin
 if p_actor_id is not null and not escen_private.application_allowed(p_actor_id,p_role_code,'application.review') then raise exception 'Saisie admission refusée' using errcode='42501'; end if;
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or coalesce(length(p_access_url),0) not between 10 and 2000 or p_access_url !~ '^https?://' then raise exception 'Accès candidat invalide' using errcode='23514'; end if;
 if p_data->>'consent' is distinct from 'true' or jsonb_typeof(p_data->'identity') is distinct from 'object' or jsonb_typeof(p_data->'diploma') is distinct from 'object'
  or jsonb_typeof(p_data->'guardians') is distinct from 'array' or jsonb_array_length(p_data->'guardians') not between 1 and 5
  or coalesce(length(btrim(p_data->'identity'->>'nom')),0)=0 or coalesce(length(btrim(p_data->'identity'->>'prenom')),0)=0
  or coalesce(p_data->'identity'->>'email','') !~ '^[^[:space:]<>@]+@[^[:space:]<>@]+[.][^[:space:]<>@]+$'
  or coalesce(length(p_data->'diploma'->>'type_diplome_id'),0)=0 then raise exception 'Informations de candidature incomplètes' using errcode='23514'; end if;
 perform 1 from escen_private.portal_revision where singleton for update;
 select x.* into a from escen.online_applications x join escen_private.application_access k on k.id=x.id where k.token_hash=p_token_hash and k.expires_at>now() for update of x;
 if a.id is not null and a.academic_year_id is distinct from p_year_id then raise exception 'Le dossier conserve son année de dépôt' using errcode='23514'; end if;
 if a.id is not null and a.workflow_stage is not null then return jsonb_build_object('id',a.id,'reference',a.reference,'workflow_stage',a.workflow_stage); end if;
 select * into i from escen.website_intakes where id=(p_data->>'intake_id')::uuid and academic_year_id=p_year_id and active for share;
 if i.id is null or not exists(select 1 from escen.academic_working_year w join escen.academic_years y on y.id=w.academic_year_id where w.singleton and y.id=p_year_id and y.status='OUVERTE' and y.archived_at is null)
  or not exists(select 1 from escen.levels where id=i.level_id and archived_at is null) or not exists(select 1 from escen.programs where id=i.program_id and archived_at is null) then raise exception 'Formation non ouverte dans l’année de travail' using errcode='23514'; end if;
 previous_marker:=current_setting('escen.application_command',true); perform set_config('escen.application_command','1',true); perform set_config('escen.actor_id',coalesce(p_actor_id::text,''),true);
 channel:=case when p_actor_id is null then 'WEB' else 'ACCUEIL' end;
 if a.id is null then
  insert into escen.online_applications(reference,identity,diploma,guardians,intake_id,status,submitted_at,academic_year_id,workflow_stage,entry_channel,reason)
   values('ESCEN-'||upper(left(replace(gen_random_uuid()::text,'-',''),16)),p_data->'identity',p_data->'diploma',p_data->'guardians',i.id,'RECU',now(),p_year_id,'NOUVELLE',channel,'Consentement et dépôt de candidature confirmés') returning * into a;
  insert into escen_private.application_access(id,token_hash,expires_at) values(a.id,p_token_hash,now()+interval '180 days');
 else
  if a.status<>'BROUILLON' or a.academic_year_id<>p_year_id then raise exception 'Dossier déjà soumis ou année différente' using errcode='23514'; end if;
  update escen.online_applications set identity=p_data->'identity',diploma=p_data->'diploma',guardians=p_data->'guardians',intake_id=i.id,status='RECU',entry_channel=channel,submitted_at=now(),workflow_stage='NOUVELLE',version=version+1,reason='Consentement et dépôt confirmés' where id=a.id returning * into a;
  update escen_private.application_access set expires_at=now()+interval '180 days' where id=a.id;
 end if;
 perform escen_private.application_event(a.id,p_actor_id,case channel when 'WEB' then 'submit' else 'create' end,null,'NOUVELLE','Candidature reçue ; pièces à vérifier par l’admission','{}',p_access_url);
 update escen_private.portal_revision set revision=revision+1,actor_id=p_actor_id,changed_at=now() where singleton;
 perform set_config('escen.application_command',coalesce(previous_marker,''),true);
 return jsonb_build_object('id',a.id,'reference',a.reference,'workflow_stage',a.workflow_stage);
end $$;

create function public.escen_candidate_dossier(p_token_hash text,p_action text default 'read',p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare a escen.online_applications; d jsonb; result jsonb; previous_marker text;
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Accès candidat invalide' using errcode='42501'; end if;
 if p_action<>'read' then perform 1 from escen_private.portal_revision where singleton for update; end if;
 select x.* into a from escen.online_applications x join escen_private.application_access k on k.id=x.id where k.token_hash=p_token_hash and k.expires_at>now();
 if a.id is null or a.workflow_stage is null then raise exception 'Accès candidat introuvable ou expiré' using errcode='P0002'; end if;
 if p_action='read' then return jsonb_build_object('application',escen_private.application_json(a),'consent_recorded',true); end if;
 perform 1 from escen.online_applications where id=a.id for update;
 select * into a from escen.online_applications where id=a.id;
 if a.version is distinct from (p_data->>'version')::integer then raise exception 'Dossier modifié : actualiser avant de compléter' using errcode='40001'; end if;
 if a.workflow_stage not in ('NOUVELLE','RECUE','INCOMPLET','A_COMPLETER') then raise exception 'Le dossier est en étude et ne peut pas être modifié' using errcode='23514'; end if;
 previous_marker:=current_setting('escen.application_command',true); perform set_config('escen.application_command','1',true); perform set_config('escen.actor_id','',true);
 if p_action='update' then
  if lower(btrim(p_data->'identity'->>'email')) is distinct from lower(btrim(a.identity->>'email')) or p_data->>'consent' is distinct from 'true' then raise exception 'Email et consentement du dossier requis' using errcode='23514'; end if;
  if not exists(select 1 from escen.website_intakes i join escen.academic_years y on y.id=i.academic_year_id where i.id=(p_data->>'intake_id')::uuid and i.academic_year_id=a.academic_year_id and (i.active or i.id=a.intake_id) and y.status in ('OUVERTE','EN_CLOTURE') and y.archived_at is null) then raise exception 'Formation non ouverte dans l’année du dossier' using errcode='23514'; end if;
  update escen.online_applications set identity=a.identity||(p_data->'identity'),diploma=a.diploma||(p_data->'diploma'),guardians=p_data->'guardians',intake_id=(p_data->>'intake_id')::uuid,version=version+1,workflow_stage='NOUVELLE',requested_changes=null,reason='Dossier complété et renvoyé par le candidat' where id=a.id;
  perform escen_private.application_event(a.id,null,'resubmit',a.workflow_stage,'NOUVELLE','Dossier complété et renvoyé par le candidat');
 elsif p_action='documents' then
  if jsonb_typeof(p_data->'documents') is distinct from 'array' or jsonb_array_length(p_data->'documents')<1
    or (select count(*) from escen.application_documents where application_id=a.id)+jsonb_array_length(p_data->'documents')>24 then raise exception 'Nombre de pièces invalide' using errcode='23514'; end if;
  for d in select value from jsonb_array_elements(p_data->'documents') loop
   if d->>'object_path' not like a.id::text||'/%' then raise exception 'Pièce hors dossier' using errcode='23514'; end if;
   insert into escen.application_documents(id,application_id,document_key,filename,mime_type,byte_size,bucket,object_path,sha256)
    values((d->>'id')::uuid,a.id,d->>'document_key',d->>'filename',d->>'mime_type',(d->>'byte_size')::integer,'escen-online-applications',d->>'object_path',d->>'sha256');
  end loop;
  update escen.online_applications set version=version+1,reason='Pièces ajoutées par le candidat' where id=a.id;
  perform escen_private.application_event(a.id,null,'documents',a.workflow_stage,a.workflow_stage,'Pièces ajoutées par le candidat');
 else raise exception 'Action candidat inconnue' using errcode='23514'; end if;
 update escen_private.portal_revision set revision=revision+1,actor_id=null,changed_at=now() where singleton;
 select jsonb_build_object('application',escen_private.application_json(x),'consent_recorded',true) into result from escen.online_applications x where id=a.id;
 perform set_config('escen.application_command',coalesce(previous_marker,''),true);
 return result;
end $$;

create function public.escen_application_notice_read(p_actor_id uuid,p_role_code text,p_ids uuid[]) returns integer
language plpgsql security definer set search_path=pg_catalog as $$
declare changed integer; previous_marker text;
begin
 if not escen_private.application_allowed(p_actor_id,p_role_code,'application.view') or cardinality(p_ids)>200 then raise exception 'Lecture de notifications refusée' using errcode='42501'; end if;
 previous_marker:=current_setting('escen.application_command',true); perform set_config('escen.application_command','1',true); perform set_config('escen.actor_id',p_actor_id::text,true);
 update escen.application_notifications set read_at=now() where id=any(p_ids) and account_id=p_actor_id and role_code=p_role_code and read_at is null;
 get diagnostics changed=row_count; perform set_config('escen.application_command',coalesce(previous_marker,''),true); return changed;
end $$;

-- Ancienne API : les nouveaux dossiers ne peuvent contourner le circuit par « Classé ».
alter function public.escen_website_manage(uuid,text,text,jsonb) rename to escen_website_manage_before_admissions_workflow;
create function public.escen_website_manage(p_actor_id uuid,p_role_code text,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb; app escen.online_applications;
begin
 if p_action='application-status' then
  select * into app from escen.online_applications where id=(p_data->>'id')::uuid;
  if app.workflow_stage is not null then raise exception 'Utiliser le circuit de traitement des candidatures' using errcode='42501'; end if;
 end if;
 result:=public.escen_website_manage_before_admissions_workflow(p_actor_id,p_role_code,p_action,p_data);
 if p_action='admissions' then
  result:=jsonb_set(result,'{applications}',coalesce((select jsonb_agg(x) from jsonb_array_elements(result->'applications') x
   join escen.online_applications a on a.id=(x->>'id')::uuid where a.workflow_stage is null or escen_private.application_visible(p_actor_id,p_role_code,a)),'[]'::jsonb));
 elsif p_action='document' and result is not null then
  select a.* into app from escen.application_documents d join escen.online_applications a on a.id=d.application_id where d.id=(p_data->>'id')::uuid;
  if app.workflow_stage is not null and (not escen_private.application_visible(p_actor_id,p_role_code,app) or p_role_code in ('MKT','RAF')) then raise exception 'Pièce hors de votre périmètre' using errcode='42501'; end if;
 end if;
 return result;
end $$;

-- Les nouvelles tables sensibles ne rejoignent jamais le snapshot général.
alter function public.escen_backend_snapshot() rename to escen_backend_snapshot_before_admissions_workflow;
create function public.escen_backend_snapshot() returns jsonb language sql security definer set search_path=pg_catalog as $$
 select public.escen_backend_snapshot_before_admissions_workflow()
  #- '{tables,application_events}'::text[] #- '{tables,application_letters}'::text[]
  #- '{tables,application_registration_payments}'::text[] #- '{tables,application_notifications}'::text[];
$$;
do $$ declare signature text; r text; begin
 for signature in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where
  (n.nspname='escen_private' and p.proname in ('application_allowed','application_visible','application_stage_label','application_json','guard_application_workflow','application_event'))
  or (n.nspname='public' and p.proname in ('escen_application_notices','escen_admissions_context','escen_application_command','escen_application_submit','escen_candidate_dossier','escen_application_notice_read','escen_website_manage','escen_website_manage_before_admissions_workflow','escen_backend_snapshot','escen_backend_snapshot_before_admissions_workflow')) loop
  execute 'revoke all on function '||signature||' from public';
  foreach r in array array['anon','authenticated','service_role'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute 'revoke all on function '||signature||' from '||quote_ident(r); end if;
  end loop;
  if signature not like 'escen_private.%' and signature not like '%before_admissions_workflow%' and exists(select 1 from pg_roles where rolname='service_role') then execute 'grant execute on function '||signature||' to service_role'; end if;
 end loop;
 foreach r in array array['anon','authenticated','service_role'] loop
  if exists(select 1 from pg_roles where rolname=r) then
   revoke all on escen.application_events,escen.application_letters,escen.application_registration_payments,escen.application_notifications from public;
   execute 'revoke all on escen.application_events,escen.application_letters,escen.application_registration_payments,escen.application_notifications from '||quote_ident(r);
  end if;
 end loop;
end $$;
commit;

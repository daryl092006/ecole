-- PROPOSITION 048, non appliquée : raccordement atomique des actions aux mails.
-- Aucun envoi réseau, aucune reprise des données déjà présentes.
begin;

create function escen_private.email_escape(p_text text) returns text
language sql immutable set search_path=pg_catalog as $$
  select replace(replace(replace(replace(replace(coalesce(p_text,''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;'),'''','&#39;')
$$;

-- Sans adresse, conserver une trace consultable dans le journal existant.
-- Pas de fausse adresse et pas d’annulation de l’action pour une adresse absente.
create function escen_private.email_notice(
  p_year uuid,p_event text,p_table text,p_source uuid,p_version text,
  p_email text,p_name text,p_subject text,p_body text
) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare address text:=lower(btrim(coalesce(p_email,''))); recipient text;
begin
  if length(address)>254 or address !~ '^[^[:space:]<>@]+@[^[:space:]<>@]+[.][^[:space:]<>@]+$' then
    if not exists(select 1 from escen_private.audit_events where table_name='email_outbox' and entity_id=p_source
      and transaction_id=txid_current() and new_value->>'event_type'=p_event and new_value->>'status'='SKIPPED') then
      insert into escen_private.audit_events(table_schema,table_name,entity_id,action,database_actor,reason,new_value)
      values('escen','email_outbox',p_source,'INSERT',session_user,'Mail non préparé : adresse absente ou invalide',
        jsonb_build_object('academic_year_id',p_year,'event_type',p_event,'status','SKIPPED','name',left(coalesce(p_name,'Destinataire'),160)));
    end if;
    return;
  end if;
  recipient:=left(coalesce(nullif(btrim(p_name),''),'Destinataire'),160);
  perform public.escen_email_enqueue(p_year,p_event,p_table,p_source,p_version,address,recipient,left(p_subject,180),
    'Bonjour '||recipient||E',\n\n'||p_body||E'\n\nConnectez-vous à votre espace ESCEN pour consulter les détails.\nESCEN',
    '<!doctype html><html lang="fr"><meta charset="utf-8"><body><h1>ESCEN</h1><p>Bonjour '||escen_private.email_escape(recipient)||',</p><p>'||
    replace(escen_private.email_escape(p_body),E'\n','<br>')||'</p><p>Connectez-vous à votre espace ESCEN pour consulter les détails.</p></body></html>');
end $$;

create function escen_private.email_person(
  p_person uuid,p_year uuid,p_event text,p_table text,p_source uuid,p_version text,p_subject text,p_body text
) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare person escen.people;
begin
  select * into person from escen.people where id=p_person;
  perform escen_private.email_notice(p_year,p_event,p_table,p_source,p_version,person.email,
    concat_ws(' ',person.firstname,person.lastname),p_subject,p_body);
end $$;

create function escen_private.email_action() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare
  current_row jsonb; previous_row jsonb; event text; subject text; body text; audience text;
  year_id uuid; year_name text; offering uuid; group_id uuid; site_id uuid; teacher_id uuid;
  student_person uuid; source_id uuid; source_table text; version_key text; evaluation_id uuid;
  s escen.sessions; e escen.evaluations; a escen.teaching_assignments; payment escen.payments;
  application escen.online_applications; contract record; recipient record; newly_paid numeric;
begin
  source_table:=tg_table_name; source_id:=new.id;
  if tg_op='UPDATE' then previous_row:=to_jsonb(old); end if;
  execute format('select to_jsonb(t) from escen.%I t where id=$1',tg_table_name) into current_row using new.id;
  if current_row is null then return null; end if;
  -- Les événements intermédiaires supplantés dans la même transaction sont ignorés.
  if tg_op='UPDATE' and current_row->>'status' is distinct from to_jsonb(new)->>'status' then return null; end if;
  -- Une clé stable par source et transaction, même si plusieurs triggers convergent.
  version_key:=txid_current()::text;

  if tg_table_name='online_applications' then
    select * into application from escen.online_applications where id=new.id;
    if application.status='BROUILLON' or (tg_op='UPDATE' and previous_row->>'status'=application.status) then return null; end if;
    year_id:=application.academic_year_id;
    event:=case when application.status='RECU' and (tg_op='INSERT' or previous_row->>'status'='BROUILLON') then 'application_received' else 'application_status_changed' end;
    subject:=case when event='application_received' then 'Candidature reçue' else 'Suivi de votre candidature' end;
    body:='Dossier '||application.reference||' : '||case application.status when 'RECU' then 'reçu' when 'EN_ANALYSE' then 'en analyse' else 'classé' end||'. Ce suivi ne constitue pas une décision d’admission.';
    select name into year_name from escen.academic_years where id=year_id;
    perform escen_private.email_notice(year_id,event,source_table,source_id,version_key,application.identity->>'email',
      concat_ws(' ',application.identity->>'prenom',application.identity->>'nom'),subject||' · '||year_name,body||E'\nAnnée : '||year_name);
    return null;

  elsif tg_table_name='teaching_assignments' then
    if tg_op<>'INSERT' then return null; end if;
    select * into a from escen.teaching_assignments where id=new.id;
    offering:=a.offering_id; group_id:=a.group_id; teacher_id:=a.teacher_id;
    event:='teaching_assignment_created'; subject:='Affectation pédagogique enregistrée'; audience:='teacher';
    body:='Votre affectation pédagogique est enregistrée pour la période du '||a.valid_from::text||coalesce(' au '||a.valid_until::text,'')||'. Consultez votre espace pour la matière et le groupe concernés.';

  elsif tg_table_name in ('sessions','exam_deliveries') then
    if tg_table_name='exam_deliveries' then
      select * into s from escen.sessions where id=new.session_id;
      -- L’insertion de séance émet déjà le message en fin de transaction.
      if tg_op='INSERT' and exists(select 1 from escen_private.audit_events where table_name='sessions' and entity_id=s.id and action='INSERT' and transaction_id=txid_current()) then return null; end if;
      if tg_op='UPDATE' and (new.access_opens_at,new.access_closes_at,new.duration_minutes) is not distinct from (old.access_opens_at,old.access_closes_at,old.duration_minutes) then return null; end if;
    else
      select * into s from escen.sessions where id=new.id;
      if tg_op='UPDATE' and (to_jsonb(new)-array['reason','actual_starts_at','actual_ends_at']) is not distinct from (previous_row-array['reason','actual_starts_at','actual_ends_at']) then return null; end if;
      if tg_op='UPDATE' and (new.starts_at,new.ends_at,new.room_id,new.replacement_teacher_id,new.status,new.mode) is not distinct from (old.starts_at,old.ends_at,old.room_id,old.replacement_teacher_id,old.status,old.mode) then return null; end if;
    end if;
    if s.status='REPORTE' then return null; end if;
    select d.evaluation_id into evaluation_id from escen.exam_deliveries d where d.session_id=s.id;
    if evaluation_id is null and s.mode<>'COURS' then return null; end if;
    source_table:='sessions'; source_id:=s.id;
    event:=case when evaluation_id is null then 'course_' else 'exam_' end||
      case when s.status='ANNULE' then 'cancelled' when tg_op='INSERT' then 'scheduled' else 'schedule_changed' end;
    if tg_op='UPDATE' and s.status not in ('PLANIFIE','ANNULE') then return null; end if;
    offering:=s.offering_id; group_id:=s.group_id; teacher_id:=coalesce(s.replacement_teacher_id,s.teacher_id); audience:='planning';
    subject:=case when evaluation_id is null then 'Cours' else 'Examen' end||case when s.status='ANNULE' then ' annulé' when tg_op='INSERT' then ' programmé' else ' modifié' end;
    body:=subject||E'.\nHoraire (Lomé) : '||to_char(s.starts_at at time zone 'Africa/Lome','DD/MM/YYYY HH24:MI')||' – '||to_char(s.ends_at at time zone 'Africa/Lome','HH24:MI')||'.';
    if s.status<>'ANNULE' then
      body:=body||E'\n'||case when s.mode='EN_LIGNE' then 'En ligne.' else coalesce((select 'Salle : '||r.name||'.' from escen.rooms r where r.id=s.room_id),'Salle à consulter dans votre espace.') end;
    end if;

  elsif tg_table_name='exam_attempts' then
    if tg_op<>'UPDATE' or previous_row->>'status' not in ('EN_COURS','INTERROMPUE') or current_row->>'status' not in ('REMISE','EXPIREE') then return null; end if;
    evaluation_id:=new.evaluation_id;
    select * into e from escen.evaluations where id=evaluation_id;
    select * into a from escen.teaching_assignments where id=e.assignment_id;
    offering:=coalesce(e.offering_id,a.offering_id); group_id:=a.group_id; teacher_id:=a.teacher_id; audience:='copy';
    event:=case when current_row->>'submission_kind'='AUTO_DEADLINE' then 'exam_attempt_expired' else 'exam_attempt_submitted' end;
    subject:=case when event='exam_attempt_expired' then 'Copie remise à l’échéance' else 'Copie remise' end;
    body:=subject||' · '||e.name||'. Seules les réponses reçues par le serveur sont conservées. Aucune note n’est encore annoncée.';
    select p.person_id into student_person from escen.evaluation_candidates c join escen.enrollments n on n.id=c.enrollment_id join escen.students p on p.id=n.student_id where c.id=new.candidate_id;

  elsif tg_table_name='evaluations' then
    if tg_op<>'UPDATE' or previous_row->>'status'=current_row->>'status' or current_row->>'cancelled_at' is not null then return null; end if;
    select * into e from escen.evaluations where id=new.id;
    select * into a from escen.teaching_assignments where id=e.assignment_id;
    offering:=coalesce(e.offering_id,a.offering_id); group_id:=a.group_id; teacher_id:=a.teacher_id; evaluation_id:=e.id;
    if e.status='SOUMISES' then event:='grades_submitted'; subject:='Notes soumises au contrôle'; audience:='review';
    elsif e.status='VALIDEES' then event:='grades_approved'; subject:='Notes validées'; audience:='teacher';
    elsif e.status='PUBLIEES' then event:='grades_published'; subject:='Résultats disponibles'; audience:='results';
    elsif e.status in ('BROUILLON','SAISIES') and previous_row->>'status' in ('SOUMISES','A_CONTROLER','VALIDEES') then event:='grades_returned'; subject:='Notes à reprendre'; audience:='teacher';
    else return null; end if;
    body:=subject||' pour l’évaluation « '||e.name||' ». Consultez votre espace pour les détails.';

  elsif tg_table_name='payments' then
    select * into payment from escen.payments where id=new.id;
    if payment.status='PENDING' or exists(select 1 from escen.payment_reversals where payment_id=payment.id)
      or (tg_op='UPDATE' and previous_row->>'status'<>'PENDING') then return null; end if;
    select n.offering_id,p.person_id into offering,student_person from escen.enrollments n join escen.students p on p.id=n.student_id where n.id=payment.enrollment_id;
    select o.academic_year_id,y.name into year_id,year_name from escen.academic_offerings o join escen.academic_years y on y.id=o.academic_year_id where o.id=offering;
    perform escen_private.email_person(student_person,year_id,'payment_recorded','payments',payment.id,version_key,
      'Paiement enregistré · '||year_name,'Versement de '||payment.amount::text||' XOF enregistré le '||payment.paid_on::text||'. Référence : '||payment.reference||'. Ce versement ne signifie pas nécessairement que la scolarité est soldée.');
    select * into contract from escen.contract_balances where enrollment_id=payment.enrollment_id;
    if contract.contract_id is not null and contract.expected<=contract.paid then
      -- Retirer les seuls versements nouvellement effectifs de cette transaction
      -- pour détecter le passage positif -> soldé, même avec plusieurs paiements.
      select coalesce(sum(p.amount-coalesce((select sum(f.amount) from escen.refunds f where f.payment_id=p.id),0)),0)
      into newly_paid from escen.payments p where p.enrollment_id=payment.enrollment_id and p.status<>'PENDING'
        and not exists(select 1 from escen.payment_reversals r where r.payment_id=p.id)
        and exists(select 1 from escen_private.audit_events t where t.table_name='payments' and t.entity_id=p.id
          and t.transaction_id=txid_current() and (t.action='INSERT' or t.old_value->>'status'='PENDING'));
      if contract.expected>contract.paid-newly_paid then
        perform escen_private.email_person(student_person,year_id,'tuition_settled','financial_contracts',contract.contract_id,version_key,
          'Scolarité soldée · '||year_name,'Votre solde annuel est nul ou créditeur pour '||year_name||'. Consultez votre situation financière dans votre espace.');
      end if;
    end if;
    return null;
  else return null;
  end if;

  select o.academic_year_id,o.site_id,y.name into year_id,site_id,year_name from escen.academic_offerings o join escen.academic_years y on y.id=o.academic_year_id where o.id=offering;
  body:=body||E'\nAnnée : '||year_name;
  if audience in ('copy','results','planning') then
    for recipient in
      select distinct p.person_id from escen.students p join escen.enrollments n on n.student_id=p.id
      where (audience='copy' and p.person_id=student_person)
        or (audience in ('results','planning') and (
          (evaluation_id is not null and exists(select 1 from escen.evaluation_candidates c where c.evaluation_id=evaluation_id and c.enrollment_id=n.id and c.eligibility<>'EXCLUDED'))
          or (evaluation_id is null and n.status in ('INSCRIT','REINSCRIT') and exists(
            select 1 from escen.enrollment_groups eg join escen.academic_offerings o on o.id=eg.offering_id
            where eg.enrollment_id=n.id and eg.group_id=email_action.group_id and o.academic_year_id=year_id
              and eg.valid_from<=(s.starts_at at time zone 'Africa/Lome')::date
              and (eg.valid_until is null or eg.valid_until>(s.starts_at at time zone 'Africa/Lome')::date)))
        ))
    loop perform escen_private.email_person(recipient.person_id,year_id,event,source_table,source_id,version_key,subject||' · '||year_name,body); end loop;
  end if;
  if audience='review' then
    for recipient in
      select distinct c.person_id from escen.accounts c
      join escen.role_grants g on g.account_id=c.id join escen.roles r on r.id=g.role_id
      join escen.role_permissions rp on rp.role_id=r.id join escen.permissions p on p.id=rp.permission_id
      where c.active and c.archived_at is null and c.auth_user_id is not null and r.active and p.code='grade.review'
        and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
        and (g.academic_year_id is null or g.academic_year_id=year_id)
        and (g.site_id is null or g.site_id=email_action.site_id)
        and (g.group_id is null or g.group_id=email_action.group_id)
    loop perform escen_private.email_person(recipient.person_id,year_id,event,source_table,source_id,version_key,subject||' · '||year_name,body); end loop;
  else
    select f.person_id into recipient from escen.teachers t join escen.staff f on f.id=t.staff_id where t.id=teacher_id;
    if audience='copy' then body:='Une copie de « '||e.name||' » a été remise. Elle est disponible dans votre espace de correction.'||E'\nAnnée : '||year_name; subject:='Copie disponible pour correction'; end if;
    if audience='results' then body:='Les résultats de « '||e.name||' » sont publiés pour '||year_name||'.'; subject:='Publication des résultats confirmée'; end if;
    perform escen_private.email_person(recipient.person_id,year_id,event,source_table,source_id,version_key,subject||' · '||year_name,body);
  end if;
  return null;
end $$;

-- Différés : les références, candidats et contre-opérations de la transaction
-- sont présents avant la préparation des messages. Un rollback retire les mails.
do $$ declare source text; begin
  foreach source in array array['online_applications','teaching_assignments','sessions','exam_deliveries','exam_attempts','evaluations','payments'] loop
    execute format('create constraint trigger email_after_action after insert or update on escen.%I deferrable initially deferred for each row execute function escen_private.email_action()',source);
  end loop;
end $$;
revoke all on function escen_private.email_escape(text),
  escen_private.email_notice(uuid,text,text,uuid,text,text,text,text,text),
  escen_private.email_person(uuid,uuid,text,text,uuid,text,text,text),escen_private.email_action() from public;
commit;

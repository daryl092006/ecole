-- Proposition uniquement : ne pas appliquer avant accord.
-- Aucun compte ni attribution individuelle n'est modifié.
begin;
insert into escen.roles(code,name) values ('CC','Chargé de clientèle');
insert into escen.role_permissions(role_id,permission_id)
select r.id,p.id from escen.roles r cross join escen.permissions p
where r.code='CC' and p.code in ('application.view','application.review','application.followup','application.payment.confirm');
delete from escen.role_permissions rp using escen.roles r,escen.permissions p
where rp.role_id=r.id and rp.permission_id=p.id and r.code in ('LOG','RAF')
and p.code like 'application.%';

-- Les notifications suivent le responsable métier, sans réécrire les événements passés.
create or replace function escen_private.application_event(p_application uuid,p_actor uuid,p_action text,p_from text,p_to text,p_reason text,p_metadata jsonb default '{}',p_access_url text default null)
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
  roles:=array['CC','IT'];
 elsif p_to in ('INCOMPLET','A_COMPLETER') then
  subject:='Votre dossier de candidature est à compléter';body:=body||E'Éléments à compléter ou corriger :\n'||p_reason||E'\nReconnectez-vous à votre espace candidat pour compléter votre dossier.';roles:=array['CC','MKT'];
 elsif p_to='TRANSMIS_ACADEMIE' then
  subject:='Votre dossier est en cours d’étude académique';body:=body||'Votre dossier a été vérifié par l’équipe admission et transmis à l’académie. Vous serez informé de la décision.';roles:=array['DA'];
 elsif p_to='ADMISSIBLE' then
  subject:='Lettre d’admissibilité à ESCEN';letter_kind:='ADMISSIBILITE';roles:=array['CC'];
  letter_content:=body||'Votre candidature a été validée par l’académie. Vous êtes admissible à ESCEN, sous réserve du paiement des frais d’inscription de '||a.registration_fee_due::text||E' FCFA.\nVotre admission deviendra officielle après confirmation du paiement.';
 elsif p_to='REFUSE' then
  subject:='Décision concernant votre candidature';letter_kind:='REFUS';
  letter_content:=body||E'Après étude, votre candidature n’a pas été retenue.\nMotif : '||p_reason||E'\nNous vous remercions pour l’intérêt porté à ESCEN.';
 elsif p_to='ADMIS_OFFICIEL' and p_from is distinct from p_to then
  subject:='Confirmation de votre admission officielle à ESCEN';letter_kind:='ADMISSION';roles:=array['CC'];
  letter_content:=body||'Le paiement de vos frais d’inscription est confirmé. Votre admission à ESCEN est désormais officielle.';
 elsif p_action='reverse_payment' then
  body:=body||'Une confirmation de paiement a été annulée avec le motif suivant : '||p_reason||'. Consultez votre situation actualisée.';roles:=array['CC'];
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

-- Téléchargement réservé aux pièces des dossiers effectivement visibles pour le rôle.
create function public.escen_admission_document(p_actor_id uuid,p_role_code text,p_year_id uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
 if not escen_private.application_allowed(p_actor_id,p_role_code,'application.view') or p_role_code in ('MKT','RAF','LOG') then
  raise exception 'Accès aux pièces refusé' using errcode='42501';
 end if;
 select jsonb_build_object('bucket',d.bucket,'object_path',d.object_path,'filename',d.filename) into result
 from escen.application_documents d join escen.online_applications a on a.id=d.application_id
 where d.id=p_id and (p_year_id is null or a.academic_year_id=p_year_id)
 and (a.status<>'BROUILLON' or a.legacy_source_row_id is not null)
 and escen_private.application_visible(p_actor_id,p_role_code,a);
 if result is null then raise exception 'Pièce hors de votre périmètre' using errcode='42501'; end if;
 return result;
end $$;
revoke all on function public.escen_admission_document(uuid,text,uuid,uuid) from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then
   execute format('revoke all on function public.escen_admission_document(uuid,text,uuid,uuid) from %I',r);
  end if;
 end loop;
 if exists(select 1 from pg_roles where rolname='service_role') then
  grant execute on function public.escen_admission_document(uuid,text,uuid,uuid) to service_role;
 end if;
end $$;
commit;

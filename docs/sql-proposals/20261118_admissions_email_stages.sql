-- Proposition : un mail candidat par événement métier, notifications professionnelles.
-- Dépend de la migration des adresses professionnelles (114).
-- Aucun traitement ni renvoi d'un message historique.
begin;

create or replace function escen_private.application_event(p_application uuid, p_actor uuid, p_action text, p_from text, p_to text, p_reason text, p_metadata jsonb default '{}', p_access_url text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare a escen.online_applications; event_id uuid:=gen_random_uuid(); roles text[]:='{}'; recipient record;
 subject text; body text; paid numeric; letter_kind text; letter_content text; letter_reference text; label text; candidate_notice boolean:=true;
begin
 select * into strict a from escen.online_applications where id=p_application;
 label:=escen_private.application_stage_label(p_to);
 insert into escen.application_events(id,application_id,academic_year_id,actor_id,action,from_stage,to_stage,reason,metadata,visible_to_candidate)
 values(event_id,a.id,a.academic_year_id,p_actor,p_action,p_from,p_to,p_reason,p_metadata,p_action<>'contact');
 subject:='Suivi de votre candidature ESCEN';
 body:='Bonjour '||coalesce(a.identity->>'prenom','')||' '||coalesce(a.identity->>'nom','')||E',\n\n';
 if p_action in ('contact','documents') then
  candidate_notice:=false;
 elsif p_action in ('submit','create') then
  subject:='Confirmation de réception de votre candidature';
  body:=body||'Votre candidature à ESCEN a bien été reçue. Référence : '||a.reference||E'.\nVotre dossier sera vérifié par l’équipe admission. Les pièces manquantes peuvent être ajoutées depuis votre espace candidat.';
  if p_access_url is not null then body:=body||E'\n\nVotre accès personnel à l’espace candidat : '||p_access_url; end if;
  body:=body||E'\n\nIdentifiant de votre espace candidat : '||lower(btrim(a.identity->>'email'))||' (ou '||a.reference||E').\nMot de passe initial, si vous ne l’avez pas encore personnalisé : Escen2026!\nLors de votre première connexion, choisissez votre mot de passe personnel.';
  roles:=array['CC','IT'];
 elsif p_action='resubmit' then
  subject:='Vos corrections de candidature ont bien été reçues';
  body:=body||'Votre dossier complété a bien été renvoyé à l’équipe admission. Nous allons vérifier les corrections et pièces transmises.';
  roles:=array['CC','MKT'];
 elsif p_to in ('INCOMPLET','A_COMPLETER') then
  subject:='Votre dossier de candidature est à compléter';body:=body||E'Éléments à compléter ou corriger :\n'||p_reason||E'\n\nOuvrez votre espace candidat avec le lien personnel ci-dessous, choisissez « Compléter mon dossier », corrigez les éléments demandés, puis validez le renvoi du dossier. Votre identifiant est votre adresse e-mail ou la référence du dossier.';roles:=array['CC','MKT'];
 elsif p_to='TRANSMIS_ACADEMIE' then
  subject:='Votre dossier est en cours d’étude académique';body:=body||'Votre dossier a été vérifié par l’équipe admission et transmis à l’académie. Vous serez informé de la décision.';roles:=array['DA','LOG'];
 elsif p_to='ADMISSIBLE' then
  subject:='Lettre d’admissibilité à ESCEN';letter_kind:='ADMISSIBILITE';roles:=array['CC'];
  letter_content:=body||'Votre candidature a été validée par l’académie. Vous êtes admissible à ESCEN, sous réserve du paiement des frais d’inscription de '||a.registration_fee_due::text||E' FCFA.\nVotre admission deviendra officielle après confirmation du paiement.';
 elsif p_to='REFUSE' then
  subject:='Décision concernant votre candidature';letter_kind:='REFUS';roles:=array['CC'];
  letter_content:=body||E'Après étude, votre candidature n’a pas été retenue.\nMotif : '||p_reason||E'\nNous vous remercions pour l’intérêt porté à ESCEN.';
 elsif p_to='ADMIS_OFFICIEL' and p_from is distinct from p_to then
  subject:='Confirmation de votre admission officielle à ESCEN';letter_kind:='ADMISSION';roles:=array['CC'];
  letter_content:=body||'Le paiement de vos frais d’inscription est confirmé. Votre admission à ESCEN est désormais officielle.';
 elsif p_action='confirm_payment' then
  select coalesce(sum(case kind when 'PAYMENT' then amount else -amount end),0)
    into paid from escen.application_registration_payments where application_id=a.id;
  subject:='Paiement des frais d’inscription enregistré';
  body:=body||'Votre paiement a été enregistré. Total confirmé à ce jour : '||paid::text||' FCFA. Reste à régler : '||greatest(a.registration_fee_due-paid,0)::text||E' FCFA.\nVotre admission deviendra officielle après confirmation du paiement complet des frais d’inscription.';
  roles:=array['CC'];
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
  if position(a.reference in body)=0 then body:=body||E'\n\nRéférence du dossier : '||a.reference; end if;
  if p_access_url is not null and p_action not in ('submit','create') then body:=body||E'\n\nVotre accès personnel à l’espace candidat : '||p_access_url; end if;
  perform public.escen_email_enqueue(a.academic_year_id,case when p_action in ('submit','create') then 'application_received' else 'application_status_changed' end,
   'online_applications',a.id,a.version::text||':candidate',a.identity->>'email',left(coalesce(a.identity->>'prenom','')||' '||coalesce(a.identity->>'nom',''),160),subject,body,'<p>'||replace(replace(replace(replace(body,'&','&amp;'),'<','&lt;'),'>','&gt;'),E'\n','<br>')||'</p>',p_actor);
 end if;
 for recipient in select distinct ac.id account_id,r.code,escen_private.staff_notification_email(ac.id) as email,p.firstname,p.lastname from escen.accounts ac join escen.people p on p.id=ac.person_id
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

commit;

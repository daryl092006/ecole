-- Migration 074: Authentification candidat par mot de passe & changement obligatoire a la premiere connexion
create table if not exists escen_private.candidate_credentials (
  application_id uuid primary key references escen.online_applications(id) on delete restrict,
  password_hash text not null,
  must_change_password boolean not null default true,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table escen_private.candidate_credentials enable row level security;

-- Initialisation automatique pour toutes les candidatures existantes (y compris les inscriptions de ce matin)
insert into escen_private.candidate_credentials (application_id, password_hash, must_change_password)
select id, crypt('Escen2026!', gen_salt('bf', 10)), true
from escen.online_applications
where status <> 'BROUILLON'
on conflict (application_id) do nothing;

-- Fonction RPC publique de connexion candidat (par Email OU par Reference de dossier + Mot de passe)
create or replace function public.escen_candidate_login(
  p_identifier text,
  p_password text,
  p_session_token_hash text
) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare
  a escen.online_applications;
  c escen_private.candidate_credentials;
  v_ident text;
begin
  if p_session_token_hash is null or p_session_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Jeton de session invalide' using errcode='42501';
  end if;

  v_ident := lower(btrim(coalesce(p_identifier, '')));

  if length(v_ident) < 3 or length(coalesce(p_password, '')) < 1 then
    raise exception 'Identifiant ou mot de passe manquant' using errcode='23514';
  end if;

  -- Recherche du dossier par email OU par reference
  select * into a from escen.online_applications
  where (lower(btrim(identity->>'email')) = v_ident or lower(btrim(reference)) = v_ident)
    and status <> 'BROUILLON'
    and workflow_stage is not null
  order by created_at desc
  limit 1;

  if a.id is null then
    raise exception 'Identifiants incorrects : aucun dossier trouvé avec ces informations.' using errcode='P0002';
  end if;

  -- Recuperation ou initialisation des credentials
  select * into c from escen_private.candidate_credentials where application_id = a.id;
  if c.application_id is null then
    insert into escen_private.candidate_credentials(application_id, password_hash, must_change_password)
    values(a.id, crypt('Escen2026!', gen_salt('bf', 10)), true)
    returning * into c;
  end if;

  -- Verification du mot de passe avec pgcrypto crypt()
  if c.password_hash <> crypt(p_password, c.password_hash) then
    raise exception 'Mot de passe incorrect. Vérifiez vos identifiants.' using errcode='42501';
  end if;

  -- Enregistrement de la session d'acces pour 180 jours
  insert into escen_private.application_access(id, token_hash, expires_at)
  values(a.id, p_session_token_hash, now() + interval '180 days')
  on conflict(id) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at;

  return jsonb_build_object(
    'connected', true,
    'id', a.id,
    'reference', a.reference,
    'email', a.identity->>'email',
    'firstname', a.identity->>'prenom',
    'lastname', a.identity->>'nom',
    'workflow_stage', a.workflow_stage,
    'must_change_password', c.must_change_password
  );
end $$;

-- Fonction RPC de changement de mot de passe obligatoire (a la 1ere connexion ou a tout moment)
create or replace function public.escen_candidate_change_password(
  p_session_token_hash text,
  p_current_password text,
  p_new_password text
) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare
  a escen.online_applications;
  c escen_private.candidate_credentials;
begin
  if p_session_token_hash is null or p_session_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Session expirée ou invalide. Veuillez vous reconnecter.' using errcode='42501';
  end if;

  if length(coalesce(p_new_password, '')) < 8 then
    raise exception 'Le nouveau mot de passe doit comporter au moins 8 caractères.' using errcode='23514';
  end if;

  select x.* into a from escen.online_applications x
  join escen_private.application_access k on k.id = x.id
  where k.token_hash = p_session_token_hash and k.expires_at > now();

  if a.id is null then
    raise exception 'Session introuvable ou expirée' using errcode='P0002';
  end if;

  select * into c from escen_private.candidate_credentials where application_id = a.id for update;

  if c.application_id is not null and length(coalesce(p_current_password, '')) > 0 then
    if c.password_hash <> crypt(p_current_password, c.password_hash) then
      raise exception 'Le mot de passe actuel est incorrect.' using errcode='42501';
    end if;
  end if;

  insert into escen_private.candidate_credentials(application_id, password_hash, must_change_password, password_changed_at, updated_at)
  values(a.id, crypt(p_new_password, gen_salt('bf', 10)), false, now(), now())
  on conflict(application_id) do update set
    password_hash = excluded.password_hash,
    must_change_password = false,
    password_changed_at = now(),
    updated_at = now();

  return jsonb_build_object(
    'success', true,
    'must_change_password', false,
    'message', 'Mot de passe mis à jour avec succès.'
  );
end $$;

revoke all on function public.escen_candidate_login(text, text, text) from public;
revoke all on function public.escen_candidate_change_password(text, text, text) from public;

do $$
declare r text;
begin
  for r in select rolname from pg_roles where rolname in ('anon', 'authenticated', 'service_role') loop
    execute format('grant execute on function public.escen_candidate_login(text, text, text) to %I', r);
    execute format('grant execute on function public.escen_candidate_change_password(text, text, text) to %I', r);
  end loop;
end $$;

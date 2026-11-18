-- Proposition : notifications internes des candidatures sur l'adresse ESCEN.
-- Aucun envoi, renvoi ni changement d'adresse personnelle ou de mail historique.
begin;

create function escen_private.staff_notification_email(p_account_id uuid)
returns text language plpgsql stable security definer set search_path=pg_catalog as $$
declare auth_id uuid; contact text; auth_data jsonb; address text;
begin
  select ac.auth_user_id,p.email into auth_id,contact
  from escen.accounts ac join escen.people p on p.id=ac.person_id
  where ac.id=p_account_id and ac.active and ac.archived_at is null and p.archived_at is null;
  if not found then return null; end if;

  -- to_jsonb permet aussi les bases locales où Auth n'a qu'une colonne id.
  if auth_id is not null and to_regclass('auth.users') is not null then
    execute 'select to_jsonb(u) from auth.users u where u.id=$1'
      into auth_data using auth_id;
  end if;
  foreach address in array array[
    auth_data->'raw_app_meta_data'->>'escen_m365_email',
    auth_data->>'email',
    contact
  ] loop
    address:=lower(btrim(address));
    if char_length(address)<=254 and address ~ '^[^[:space:]<>@]+@escen[.]university$' then
      return address;
    end if;
  end loop;
  -- Pas de repli sur un mail personnel ; la notification interne reste créée.
  return null;
end $$;
revoke all on function escen_private.staff_notification_email(uuid) from public;

-- Ne modifier que la sélection de l'adresse de l'équipe. Les droits, rôles,
-- adresses des candidats et contenus des messages restent ceux de la fonction.
do $$
declare definition text;
  previous text:='select distinct ac.id account_id,r.code,p.email,p.firstname,p.lastname';
  replacement text:='select distinct ac.id account_id,r.code,escen_private.staff_notification_email(ac.id) as email,p.firstname,p.lastname';
begin
  select pg_get_functiondef('escen_private.application_event(uuid,uuid,text,text,text,text,jsonb,text)'::regprocedure)
    into definition;
  if position(previous in definition)=0 then
    raise exception 'Sélection destinataire inattendue : vérifier avant migration';
  end if;
  execute replace(definition,previous,replacement);
end $$;

commit;

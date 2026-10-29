begin;

do $$
declare
  v_actor_id uuid;
  v_nobel_account_id uuid;
  v_amah_account_id uuid;
  v_cc_role_id uuid;
  v_dga_role_id uuid;
  v_previous_actor text;
  v_changed boolean := false;
begin
  select a.id into v_actor_id
  from escen.accounts a
  join escen.role_grants g on g.account_id = a.id
  join escen.roles r on r.id = g.role_id
  where a.archived_at is null and r.code = 'IT'
    and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
  order by a.active desc, a.created_at asc
  limit 1;

  if v_actor_id is null then
    select a.id into v_actor_id from escen.accounts a where a.archived_at is null order by a.active desc, a.created_at asc limit 1;
  end if;

  if v_actor_id is not null then
    v_previous_actor := current_setting('escen.actor_id', true);
    perform set_config('escen.actor_id', v_actor_id::text, true);
  end if;

  select id into v_dga_role_id from escen.roles where code = 'DGA' and active;
  select id into v_cc_role_id from escen.roles where code = 'CC' and active;

  -- 1. Nobel GANGNITO (g.nobel@escen.university) : uniquement Directeur Général Adjoint (DGA)
  select a.id into v_nobel_account_id
  from escen.accounts a
  join escen.people p on p.id = a.person_id
  where a.archived_at is null and lower(btrim(p.email)) = 'g.nobel@escen.university'
  limit 1;

  if v_nobel_account_id is not null and v_dga_role_id is not null then
    update escen.role_grants g
    set valid_until = clock_timestamp(),
        reason = 'Alignement des fonctions : Nobel GANGNITO est uniquement Directeur Général Adjoint'
    from escen.roles r
    where g.role_id = r.id
      and g.account_id = v_nobel_account_id
      and r.code <> 'DGA'
      and g.valid_from <= now()
      and (g.valid_until is null or g.valid_until > now());
    if found then v_changed := true; end if;

    if not exists (
      select 1 from escen.role_grants
      where account_id = v_nobel_account_id and role_id = v_dga_role_id
        and valid_from <= now() and (valid_until is null or valid_until > now())
    ) then
      insert into escen.role_grants (account_id, role_id, granted_by, valid_from, reason)
      values (v_nobel_account_id, v_dga_role_id, coalesce(v_actor_id, v_nobel_account_id), clock_timestamp(), 'Attribution du rôle Directeur Général Adjoint');
      v_changed := true;
    end if;
  end if;

  -- 2. Tete Amah AKPADJA (a.amah@escen.university) : Chargé de clientèle (CC) au lieu de RAF
  select a.id into v_amah_account_id
  from escen.accounts a
  join escen.people p on p.id = a.person_id
  where a.archived_at is null and lower(btrim(p.email)) = 'a.amah@escen.university'
  limit 1;

  if v_amah_account_id is not null and v_cc_role_id is not null then
    update escen.role_grants g
    set valid_until = clock_timestamp(),
        reason = 'Alignement des fonctions : Tete Amah AKPADJA est Chargé de clientèle'
    from escen.roles r
    where g.role_id = r.id
      and g.account_id = v_amah_account_id
      and r.code <> 'CC'
      and g.valid_from <= now()
      and (g.valid_until is null or g.valid_until > now());
    if found then v_changed := true; end if;

    if not exists (
      select 1 from escen.role_grants
      where account_id = v_amah_account_id and role_id = v_cc_role_id
        and valid_from <= now() and (valid_until is null or valid_until > now())
    ) then
      insert into escen.role_grants (account_id, role_id, granted_by, valid_from, reason)
      values (v_amah_account_id, v_cc_role_id, coalesce(v_actor_id, v_amah_account_id), clock_timestamp(), 'Attribution du rôle Chargé de clientèle');
      v_changed := true;
    end if;
  end if;

  if v_changed then
    update escen_private.portal_revision
    set revision = revision + 1, changed_at = now(), actor_id = coalesce(v_actor_id, actor_id)
    where singleton;
  end if;

  if v_actor_id is not null then
    perform set_config('escen.actor_id', coalesce(v_previous_actor, ''), true);
  end if;
end $$;

create or replace function public.escen_manage_account(p_actor_id uuid,p_target_id uuid,p_action text,p_reason text,
  p_role_code text default null,p_previous_role_code text default null) returns bigint
language plpgsql security definer set search_path = pg_catalog as $$
declare target escen.accounts; new_role uuid; current_revision bigint; previous_actor text;
begin
  if not exists(select 1 from escen.accounts a join escen.role_grants g on g.account_id=a.id join escen.roles r on r.id=g.role_id
    where a.id=p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null and r.active and r.code in ('IT','DG')
      and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()) and g.site_id is null and g.group_id is null and g.academic_year_id is null)
    then raise exception 'Administration globale requise' using errcode='42501'; end if;
  if length(btrim(p_reason))<3 or length(p_reason)>1000 or p_reason is null then raise exception 'Motif obligatoire' using errcode='23514'; end if;
  if p_actor_id=p_target_id then raise exception 'Votre propre accès ne peut pas être modifié ici' using errcode='23514'; end if;
  if p_action not in ('activate','deactivate','archive','role') then raise exception 'Action inconnue' using errcode='23514'; end if;
  select revision into current_revision from escen_private.portal_revision where singleton for update;
  select * into target from escen.accounts where id=p_target_id and archived_at is null for update;
  if not found then raise exception 'Compte introuvable ou retiré' using errcode='23503'; end if;
  previous_actor:=current_setting('escen.actor_id',true);
  perform set_config('escen.actor_id',p_actor_id::text,true);
  if p_action='activate' then
    if target.auth_user_id is null then raise exception 'Liaison Auth obligatoire avant activation' using errcode='23514'; end if;
    update escen.accounts set active=true,reason=p_reason,last_modified_by=p_actor_id where id=p_target_id;
  elsif p_action='deactivate' then
    update escen.accounts set active=false,reason=p_reason,last_modified_by=p_actor_id where id=p_target_id;
  elsif p_action='archive' then
    update escen.accounts set active=false,archived_at=clock_timestamp(),reason=p_reason,last_modified_by=p_actor_id where id=p_target_id;
    update escen.role_grants set valid_until=clock_timestamp(),reason=p_reason where account_id=p_target_id
      and valid_from<=now() and (valid_until is null or valid_until>now());
  else
    select id into new_role from escen.roles where code=p_role_code and active;
    if new_role is null then raise exception 'Rôle inconnu' using errcode='23514'; end if;
    if p_role_code in ('STUD','DEL') and not exists(select 1 from escen.students where person_id=target.person_id)
      then raise exception 'Profil étudiant requis' using errcode='23514'; end if;
    if p_role_code='ENS' and not exists(select 1 from escen.teachers t join escen.staff s on s.id=t.staff_id where s.person_id=target.person_id)
      then raise exception 'Profil enseignant requis' using errcode='23514'; end if;
    if exists(select 1 from escen.role_grants where account_id=p_target_id and role_id=new_role
      and valid_from<=now() and (valid_until is null or valid_until>now()))
      and not exists(select 1 from escen.role_grants where account_id=p_target_id and role_id<>new_role
        and valid_from<=now() and (valid_until is null or valid_until>now()))
      then raise exception 'Rôle déjà attribué' using errcode='23514'; end if;
    if p_previous_role_code is not null then
      if not exists(select 1 from escen.role_grants g join escen.roles r on r.id=g.role_id
        where g.account_id=p_target_id and r.code=p_previous_role_code
          and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()))
        then raise exception 'L’attribution a changé, actualisez le dossier' using errcode='PT409'; end if;
    end if;
    update escen.role_grants set valid_until=clock_timestamp(),reason=p_reason
      where account_id=p_target_id and role_id<>new_role
        and valid_from<=now() and (valid_until is null or valid_until>now());
    if not exists(select 1 from escen.role_grants where account_id=p_target_id and role_id=new_role
      and valid_from<=now() and (valid_until is null or valid_until>now())) then
      insert into escen.role_grants(account_id,role_id,granted_by,valid_from,reason)
      values(p_target_id,new_role,p_actor_id,clock_timestamp(),p_reason);
    end if;
    update escen.accounts set reason=p_reason,last_modified_by=p_actor_id where id=p_target_id;
  end if;
  update escen_private.portal_revision set revision=revision+1,changed_at=now(),actor_id=p_actor_id where singleton returning revision into current_revision;
  perform set_config('escen.actor_id',coalesce(previous_actor,''),true);
  return current_revision;
end $$;

commit;


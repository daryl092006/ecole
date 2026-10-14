begin;
alter table escen.accounts add column archived_at timestamptz;
alter table escen.accounts add column reason text;
alter table escen.accounts add column last_modified_by uuid references escen.accounts(id) on delete restrict;
alter table escen.accounts add constraint archived_account_inactive check (archived_at is null or not active);
create index accounts_modified_by_fk on escen.accounts(last_modified_by);

create or replace function public.escen_backend_snapshot() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare item record; records jsonb; result jsonb := '{}';
begin
  for item in select tablename from pg_tables where schemaname='escen' order by tablename loop
    if item.tablename = 'accounts' then
      select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object('account_type',case
        when exists(select 1 from escen.students s where s.person_id=a.person_id) then 'student'
        when exists(select 1 from escen.staff s where s.person_id=a.person_id) or exists(
          select 1 from escen_private.source_mappings m join escen_private.legacy_rows l on l.id=m.row_id
          where m.target_table='accounts' and m.target_id=a.id and l.source_table='users') then 'staff'
        else 'unclassified' end)),'[]') into records from escen.accounts a where a.archived_at is null;
    else
      execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from escen.%I t',item.tablename) into records;
    end if;
    result := result || jsonb_build_object(item.tablename,records);
  end loop;
  return jsonb_build_object('revision',(select revision from escen_private.portal_revision where singleton),'tables',result);
end $$;

create function public.escen_manage_account(p_actor_id uuid,p_target_id uuid,p_action text,p_reason text,
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
      and valid_from<=now() and (valid_until is null or valid_until>now())) then raise exception 'Rôle déjà attribué' using errcode='23514'; end if;
    if p_previous_role_code is not null then
      update escen.role_grants g set valid_until=clock_timestamp(),reason=p_reason from escen.roles r
        where g.role_id=r.id and r.code=p_previous_role_code and g.account_id=p_target_id and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now());
      if not found then raise exception 'L’attribution a changé, actualisez le dossier' using errcode='40001'; end if;
    end if;
    insert into escen.role_grants(account_id,role_id,granted_by,valid_from,reason) values(p_target_id,new_role,p_actor_id,clock_timestamp(),p_reason);
    update escen.accounts set reason=p_reason,last_modified_by=p_actor_id where id=p_target_id;
  end if;
  update escen_private.portal_revision set revision=revision+1,changed_at=now(),actor_id=p_actor_id where singleton returning revision into current_revision;
  perform set_config('escen.actor_id',coalesce(previous_actor,''),true);
  return current_revision;
end $$;
revoke all on function public.escen_manage_account(uuid,uuid,text,text,text,text) from public;
do $$ declare role_name text;
begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then execute format('revoke all on function public.escen_manage_account(uuid,uuid,text,text,text,text) from %I',role_name); end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_manage_account(uuid,uuid,text,text,text,text) to service_role; end if;
end $$;
commit;

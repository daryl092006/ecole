-- Migration : Ouverture des actions de gestion du site web et des campagnes d'admission au Responsable Marketing (MKT)
begin;

-- 1. Attribution des permissions de gestion éditoriale et de revue des candidatures au rôle MKT
insert into escen.permissions (code, description)
values
  ('application.review', 'Vérifier et traiter les dossiers de candidature')
on conflict (code) do nothing;

insert into escen.role_permissions (role_id, permission_id)
select r.id, p.id
from escen.roles r
join escen.permissions p on p.code in (
  'communication.view',
  'communication.manage',
  'application.view',
  'application.review',
  'application.followup',
  'student.view'
)
where r.code = 'MKT'
on conflict (role_id, permission_id) do nothing;

-- 2. Ouverture de la RPC escen_website_manage pour MKT et CC sur les formations et pièces du site
create or replace function public.escen_website_manage(
  p_actor_id uuid,
  p_role_code text,
  p_action text,
  p_data jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  can_read boolean;
  can_write boolean;
  articles boolean;
  selected_year uuid;
begin
  articles := p_action like 'article%';

  -- Lecture : articles via communication.view, ou formations/pièces via student.view pour les rôles autorisés dont MKT et CC
  select exists(
    select 1 from escen.accounts a
    join escen.role_grants g on g.account_id = a.id
    join escen.roles r on r.id = g.role_id
    join escen.role_permissions rp on rp.role_id = r.id
    join escen.permissions p on p.id = rp.permission_id
    where a.id = p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null
      and r.active and r.code = p_role_code
      and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
      and p.code = case when articles then 'communication.view' else 'student.view' end
      and (articles or r.code in ('DG', 'DGA', 'DA', 'LOG', 'RAF', 'MKT', 'CC', 'IT'))
  ) into can_read;

  -- Écriture : articles via communication.manage, ou formations/pièces via communication.manage (MKT/CC) ou student.lifecycle.manage
  select exists(
    select 1 from escen.role_grants g
    join escen.roles r on r.id = g.role_id
    join escen.role_permissions rp on rp.role_id = r.id
    join escen.permissions p on p.id = rp.permission_id
    where g.account_id = p_actor_id and r.active and r.code = p_role_code
      and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
      and p.code = case
        when articles then 'communication.manage'
        when r.code in ('MKT', 'CC') then 'communication.manage'
        else 'student.lifecycle.manage'
      end
  ) into can_write;

  if not can_read then raise exception 'Accès refusé' using errcode = '42501'; end if;

  if p_action = 'article-save' then
    selected_year := nullif(p_data->>'academic_year_id', '')::uuid;
    if selected_year is null and not (p_data ? 'id') then
      raise exception 'Choisissez une année scolaire pour cet article' using errcode = '23514';
    end if;
    if selected_year is not null then
      perform set_config('escen.selected_year', selected_year::text, true);
    end if;
  end if;

  return public.escen_website_manage_before_annual_scope(p_actor_id, p_role_code, p_action, p_data);
end $$;

commit;

-- Migration validée : contacts des demandes de brochures.
-- Formulaire public : nom complet, email et téléphone, sans formation.
-- RPC appelées uniquement par le serveur ; aucune lecture publique des contacts.
begin;

create table escen.website_prospects (
  id uuid primary key,
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  full_name text not null check (full_name = btrim(full_name) and char_length(full_name) between 2 and 160),
  email text not null check (
    email = lower(btrim(email)) and char_length(email) <= 254
    and email ~ '^[^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+$'
  ),
  phone text not null check (
    phone = btrim(phone) and char_length(phone) between 6 and 30
    and phone ~ '^\+?[0-9() .-]+$'
    and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 6 and 15
  ),
  created_at timestamptz not null default now()
);
create index website_prospects_year_created on escen.website_prospects(academic_year_id, created_at desc, id desc);
create index website_prospects_created on escen.website_prospects(created_at desc, id desc);
alter table escen.website_prospects enable row level security;
create trigger no_delete before delete on escen.website_prospects
  for each row execute function escen_private.no_delete();
create trigger audit_event after insert or update on escen.website_prospects
  for each row execute function escen_private.record_audit();

insert into escen.permissions(code, description)
values ('website.prospect.view', 'Consulter les contacts ayant demandé une brochure sur le site web')
on conflict (code) do nothing;
insert into escen.role_permissions(role_id, permission_id)
select r.id, p.id from escen.roles r cross join escen.permissions p
where r.code in ('DG', 'DGA', 'CC', 'MKT', 'IT') and p.code = 'website.prospect.view'
on conflict (role_id, permission_id) do nothing;

-- Ne jamais ajouter les coordonnées au snapshot général des étudiants/personnels.
alter function public.escen_backend_snapshot() rename to escen_backend_snapshot_before_website_prospects;
create function public.escen_backend_snapshot() returns jsonb
language sql security definer set search_path = pg_catalog as $$
  select public.escen_backend_snapshot_before_website_prospects() #- '{tables,website_prospects}'::text[];
$$;

-- L'identifiant est généré par le navigateur et réutilisé lors d'une nouvelle
-- tentative : une réponse réseau perdue ne produit pas deux lignes.
create function escen.create_website_prospect(p_request_id uuid, p_full_name text, p_email text, p_phone text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare year_id uuid;
begin
  if p_request_id is null then
    raise exception 'Identifiant de demande requis' using errcode = '23514';
  end if;
  select academic_year_id into year_id from escen.academic_working_year where singleton for share;
  if year_id is null then
    raise exception 'Année de travail indisponible' using errcode = '23514';
  end if;
  -- Aucune identité de compte n'est attribuée à un visiteur non authentifié.
  perform set_config('escen.actor_id', '', true);
  insert into escen.website_prospects(id, academic_year_id, full_name, email, phone)
  values (p_request_id, year_id, btrim(p_full_name), lower(btrim(p_email)), btrim(p_phone))
  on conflict (id) do nothing;
  return jsonb_build_object('received', true);
end $$;

create function escen.list_website_prospects(
  p_actor_id uuid, p_role_code text, p_year_id uuid,
  p_before_created_at timestamptz default null, p_before_id uuid default null, p_limit integer default 50
) returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
begin
  if not exists (
    select 1 from escen.accounts a
    join escen.role_grants g on g.account_id = a.id
    join escen.roles r on r.id = g.role_id
    join escen.role_permissions rp on rp.role_id = r.id
    join escen.permissions p on p.id = rp.permission_id
    where a.id = p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null
      and r.active and r.code = p_role_code and p.code = 'website.prospect.view'
      and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
  ) then raise exception 'Accès refusé' using errcode = '42501'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100
    or (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Pagination invalide' using errcode = '23514';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc) from (
    select id, academic_year_id, full_name, email, phone, created_at
    from escen.website_prospects
    where (p_year_id is null or academic_year_id = p_year_id)
      and (p_before_created_at is null or (created_at, id) < (p_before_created_at, p_before_id))
    order by created_at desc, id desc limit p_limit
  ) page), '[]'::jsonb);
end $$;

-- Adaptateurs de l'API Supabase, qui expose actuellement le schéma public.
create function public.escen_website_prospect_create(p_request_id uuid, p_full_name text, p_email text, p_phone text)
returns jsonb language sql security definer set search_path = pg_catalog as $$
  select escen.create_website_prospect(p_request_id, p_full_name, p_email, p_phone);
$$;
create function public.escen_website_prospects_page(
  p_actor_id uuid, p_role_code text, p_year_id uuid,
  p_before_created_at timestamptz default null, p_before_id uuid default null, p_limit integer default 50
) returns jsonb language sql security definer set search_path = pg_catalog as $$
  select escen.list_website_prospects(p_actor_id, p_role_code, p_year_id, p_before_created_at, p_before_id, p_limit);
$$;

-- Pas de politique RLS publique : seul le serveur peut exécuter les RPC.
revoke all on table escen.website_prospects from public;
revoke all on function
  escen.create_website_prospect(uuid,text,text,text),
  escen.list_website_prospects(uuid,text,uuid,timestamptz,uuid,integer),
  public.escen_website_prospect_create(uuid,text,text,text),
  public.escen_website_prospects_page(uuid,text,uuid,timestamptz,uuid,integer),
  public.escen_backend_snapshot_before_website_prospects(), public.escen_backend_snapshot()
from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on table escen.website_prospects from %I', role_name);
      execute format('revoke all on function escen.create_website_prospect(uuid,text,text,text), escen.list_website_prospects(uuid,text,uuid,timestamptz,uuid,integer), public.escen_website_prospect_create(uuid,text,text,text), public.escen_website_prospects_page(uuid,text,uuid,timestamptz,uuid,integer), public.escen_backend_snapshot_before_website_prospects(), public.escen_backend_snapshot() from %I', role_name);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function
      escen.create_website_prospect(uuid,text,text,text),
      escen.list_website_prospects(uuid,text,uuid,timestamptz,uuid,integer),
      public.escen_website_prospect_create(uuid,text,text,text),
      public.escen_website_prospects_page(uuid,text,uuid,timestamptz,uuid,integer),
      public.escen_backend_snapshot()
    to service_role;
    revoke all on function public.escen_backend_snapshot_before_website_prospects() from service_role;
  end if;
end $$;

commit;

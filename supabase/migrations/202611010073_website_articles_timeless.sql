-- Les articles d'actualité et de blog de l'établissement sont intemporels.
-- Tous les articles publiés restent accessibles publiquement quelle que soit l'année universitaire active.

create or replace function public.escen_website_public(
  p_action text,
  p_token_hash text default null,
  p_data jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  result jsonb;
begin
  result := public.escen_website_public_before_annual_scope(p_action, p_token_hash, p_data);
  -- Les articles ne sont plus filtrés par l'année active : tous les articles publiés sont retournés
  return result;
end $$;

-- Assouplir article-save dans escen_website_manage pour permettre la gestion
-- transversale des articles sans bloquer la mise à jour d'un article d'une autre année.
create or replace function public.escen_website_manage(
  p_actor_id uuid,
  p_role_code text,
  p_action text,
  p_data jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  selected_year uuid;
begin
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

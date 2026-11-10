-- Migration : Restauration de la chaîne complète de délégation pour escen_website_manage et escen_website_public
-- (incluant level_document_rules pour /site-web/documents, la reprise des brouillons historiques, le circuit d'admission et le contrôle des formations publiques)
begin;

-- 1. Maillon annuel (avant pièces par niveau) : gestion souple de l'année pour article-save
create or replace function public.escen_website_manage_before_level_documents(
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

-- 2. Maillon pièces par niveau (avant reprise de candidatures) : ajoute level_document_rules à l'action 'admissions'
create or replace function public.escen_website_manage_before_application_recovery(
  p_actor_id uuid,
  p_role_code text,
  p_action text,
  p_data jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  result jsonb;
begin
  if p_action = 'intake-save' then
    perform 1 from escen.academic_years where id = (p_data->>'academic_year_id')::uuid for update;
  end if;
  result := public.escen_website_manage_before_level_documents(p_actor_id, p_role_code, p_action, p_data);
  if p_action = 'admissions' then
    result := result || jsonb_build_object(
      'level_document_rules',
      coalesce((select jsonb_agg(to_jsonb(r)) from escen.website_level_document_rules r), '[]'::jsonb)
    );
  end if;
  return result;
end $$;

-- 3. Maillon reprise des dossiers historiques (avant circuit d'admission)
create or replace function public.escen_website_manage_before_admissions_workflow(
  p_actor_id uuid,
  p_role_code text,
  p_action text,
  p_data jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  result jsonb;
begin
  result := public.escen_website_manage_before_application_recovery(p_actor_id, p_role_code, p_action, p_data);
  if p_action = 'admissions' then
    result := jsonb_set(
      result,
      '{applications}',
      coalesce(result->'applications', '[]'::jsonb) ||
      coalesce((
        select jsonb_agg(
          to_jsonb(a) || jsonb_build_object(
            'intake_label', i.label,
            'documents', coalesce((
              select jsonb_agg(to_jsonb(d) - 'bucket' - 'object_path' - 'sha256')
              from escen.application_documents d
              where d.application_id = a.id
            ), '[]'::jsonb)
          )
          order by a.created_at desc
        )
        from escen.online_applications a
        left join escen.website_intakes i on i.id = a.intake_id
        where a.status = 'BROUILLON' and a.legacy_source_row_id is not null
      ), '[]'::jsonb)
    );
  elsif p_action = 'document' and result is null then
    select to_jsonb(d) || jsonb_build_object('academic_year_id', a.academic_year_id) into result
    from escen.application_documents d
    join escen.online_applications a on a.id = d.application_id
    where d.id = (p_data->>'id')::uuid and a.status = 'BROUILLON' and a.legacy_source_row_id is not null;
  end if;
  return result;
end $$;

-- 4. Fonction principale escen_website_manage : applique le filtrage de visibilité du circuit d'admission tout en préservant level_document_rules
create or replace function public.escen_website_manage(
  p_actor_id uuid,
  p_role_code text,
  p_action text,
  p_data jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  result jsonb;
  app escen.online_applications;
begin
  if p_action = 'application-status' then
    select * into app from escen.online_applications where id = (p_data->>'id')::uuid;
    if app.workflow_stage is not null then
      raise exception 'Utiliser le circuit de traitement des candidatures' using errcode = '42501';
    end if;
  end if;
  result := public.escen_website_manage_before_admissions_workflow(p_actor_id, p_role_code, p_action, p_data);
  if p_action = 'admissions' then
    result := jsonb_set(
      result,
      '{applications}',
      coalesce((
        select jsonb_agg(x)
        from jsonb_array_elements(result->'applications') x
        join escen.online_applications a on a.id = (x->>'id')::uuid
        where a.workflow_stage is null or escen_private.application_visible(p_actor_id, p_role_code, a)
      ), '[]'::jsonb)
    );
  elsif p_action = 'document' and result is not null then
    select a.* into app
    from escen.application_documents d
    join escen.online_applications a on a.id = d.application_id
    where d.id = (p_data->>'id')::uuid;
    if app.workflow_stage is not null and (not escen_private.application_visible(p_actor_id, p_role_code, app) or p_role_code in ('MKT', 'RAF')) then
      raise exception 'Pièce hors de votre périmètre' using errcode = '42501';
    end if;
  end if;
  return result;
end $$;

-- 5. Restauration du contrôle des formations ouvertes dans escen_website_public tout en gardant les articles intemporels via escen_website_public_before_offerings
create or replace function public.escen_website_public(
  p_action text,
  p_token_hash text default null,
  p_data jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  result jsonb;
  application escen.online_applications;
  intake escen.website_intakes;
begin
  if p_action in ('documents', 'submit') then
    select a.* into application
    from escen.online_applications a
    join escen_private.application_access x on x.id = a.id
    where x.token_hash = p_token_hash and x.expires_at > now()
    for update of a;
    if application.id is not null and application.status = 'BROUILLON' then
      if p_action = 'documents' then
        if not escen_private.website_formation_available(application.academic_year_id, (p_data->>'niveau_id')::uuid, (p_data->>'filiere_id')::uuid) then
          raise exception 'Formation absente de l’année du dossier' using errcode = '23514';
        end if;
      else
        select * into intake from escen.website_intakes where id = application.intake_id;
        if intake.id is not null and not escen_private.website_formation_available(application.academic_year_id, intake.level_id, intake.program_id) then
          raise exception 'Formation absente de l’année du dossier' using errcode = '23514';
        end if;
      end if;
    end if;
  end if;
  result := public.escen_website_public_before_offerings(p_action, p_token_hash, p_data);
  if p_action = 'intakes' then
    return coalesce((
      select jsonb_agg(item order by item->>'level_name', item->>'program_name')
      from jsonb_array_elements(result) item
      where escen_private.website_formation_available((item->>'academic_year_id')::uuid, (item->>'level_id')::uuid, (item->>'program_id')::uuid)
    ), '[]'::jsonb);
  end if;
  return result;
end $$;

-- 6. Verrouillage des privilèges d'exécution
do $$
declare
  sig text;
  r text;
begin
  foreach sig in array array[
    'public.escen_website_manage_before_annual_scope(uuid,text,text,jsonb)',
    'public.escen_website_manage_before_level_documents(uuid,text,text,jsonb)',
    'public.escen_website_manage_before_application_recovery(uuid,text,text,jsonb)',
    'public.escen_website_manage_before_admissions_workflow(uuid,text,text,jsonb)',
    'public.escen_website_manage(uuid,text,text,jsonb)',
    'public.escen_website_public_before_annual_scope(text,text,jsonb)',
    'public.escen_website_public_before_offerings(text,text,jsonb)',
    'public.escen_website_public(text,text,jsonb)'
  ] loop
    execute 'revoke all on function ' || sig || ' from public';
    foreach r in array array['anon', 'authenticated', 'service_role'] loop
      if exists(select 1 from pg_roles where rolname = r) then
        execute format('revoke all on function %s from %I', sig, r);
      end if;
    end loop;
  end loop;
  if exists(select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function
      public.escen_website_manage(uuid,text,text,jsonb),
      public.escen_website_public(text,text,jsonb)
    to service_role;
  end if;
end $$;

commit;


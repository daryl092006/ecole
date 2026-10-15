-- Annual business roots. Existing unknown years remain NULL and are never guessed.
do $$ declare name text; begin
  foreach name in array array['communications','support_tickets','purchases','asset_movements','exam_papers','student_documents','generated_documents','website_articles'] loop
    execute format('alter table escen.%I add column academic_year_id uuid references escen.academic_years(id) on delete restrict',name);
    execute format('create index %I on escen.%I(academic_year_id)',name||'_academic_year_fk',name);
  end loop;
end $$;

create function escen_private.guard_business_year() returns trigger
language plpgsql set search_path=pg_catalog as $$
declare related uuid; proposed uuid; previous uuid;
begin
  related:=escen_private.activity_year(tg_table_name,to_jsonb(new)-'academic_year_id');
  if tg_table_name='asset_movements' and to_jsonb(new)->>'receipt_id' is not null then
    select p.academic_year_id into related from escen.purchase_receipts r join escen.purchase_lines l on l.id=r.line_id join escen.purchases p on p.id=l.purchase_id where r.id=(to_jsonb(new)->>'receipt_id')::uuid;
  end if;
  proposed:=coalesce(new.academic_year_id,related);
  if tg_op='UPDATE' then
    previous:=escen_private.activity_year(tg_table_name,to_jsonb(old));
    if previous is not null and proposed is distinct from previous then
      raise exception 'L’année du dossier est figée ; aucun transfert annuel implicite' using errcode='23514';
    end if;
    if proposed is null and previous is null then raise exception 'Confirmez le rattachement annuel de cette archive avant modification' using errcode='23514'; end if;
  else
    proposed:=coalesce(proposed,related,nullif(current_setting('escen.selected_year',true),'')::uuid);
  end if;
  if proposed is null then raise exception 'Une année scolaire explicite est obligatoire' using errcode='23514'; end if;
  if related is not null and proposed<>related then raise exception 'L’année ne correspond pas au dossier parent' using errcode='23514'; end if;
  if not exists(select 1 from escen.academic_years where id=proposed and archived_at is null) then raise exception 'Année scolaire absente ou archivée' using errcode='23514'; end if;
  if tg_table_name='exam_papers' then
    if exists(select 1 from escen.exam_papers p where p.library_id=(to_jsonb(new)->>'library_id')::uuid and p.academic_year_id is not null and p.academic_year_id<>proposed) then raise exception 'Les versions d’un sujet conservent leur année scolaire' using errcode='23514'; end if;
    if to_jsonb(new)->>'source_evaluation_row_id' is not null and not exists(select 1 from escen_private.legacy_rows l where l.id=(to_jsonb(new)->>'source_evaluation_row_id')::uuid and escen_private.history_matches_year(l,proposed)) then raise exception 'L’évaluation historique ne correspond pas à cette année' using errcode='23514'; end if;
  end if;
  new.academic_year_id:=proposed;
  return new;
end $$;
do $$ declare name text; begin
  foreach name in array array['communications','support_tickets','purchases','asset_movements','exam_papers','student_documents','generated_documents','website_articles'] loop
    execute format('create trigger a_business_year_guard before insert or update on escen.%I for each row execute function escen_private.guard_business_year()',name);
  end loop;
end $$;

-- Keep the existing authorization, optimistic lock and audit implementation.
alter function public.escen_website_manage(uuid,text,text,jsonb) rename to escen_website_manage_before_annual_scope;
create function public.escen_website_manage(p_actor_id uuid,p_role_code text,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare previous_year uuid; selected_year uuid;
begin
  if p_action='article-save' then
    selected_year:=nullif(p_data->>'academic_year_id','')::uuid;
    if selected_year is null then raise exception 'Choisissez une année scolaire pour cet article' using errcode='23514'; end if;
    if p_data ? 'id' then
      select academic_year_id into previous_year from escen.website_articles where id=(p_data->>'id')::uuid;
      if previous_year is distinct from selected_year then raise exception 'L’année de cet article ne correspond pas à la consultation' using errcode='23514'; end if;
    end if;
    perform set_config('escen.selected_year',selected_year::text,true);
  end if;
  return public.escen_website_manage_before_annual_scope(p_actor_id,p_role_code,p_action,p_data);
end $$;

-- Public articles belong to the official campaign year; older records remain stored.
alter function public.escen_website_public(text,text,jsonb) rename to escen_website_public_before_annual_scope;
create function public.escen_website_public(p_action text,p_token_hash text default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb; year_id uuid;
begin
  result:=public.escen_website_public_before_annual_scope(p_action,p_token_hash,p_data);
  if p_action='articles' then
    select academic_year_id into year_id from escen.academic_working_year where singleton;
    return coalesce((select jsonb_agg(item) from jsonb_array_elements(result) item where item->>'academic_year_id'=year_id::text),'[]');
  end if;
  return result;
end $$;
revoke all on function escen_private.guard_business_year() from public;
revoke all on function public.escen_website_manage_before_annual_scope(uuid,text,text,jsonb),public.escen_website_public_before_annual_scope(text,text,jsonb),public.escen_website_manage(uuid,text,text,jsonb),public.escen_website_public(text,text,jsonb) from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on function public.escen_website_manage_before_annual_scope(uuid,text,text,jsonb),public.escen_website_public_before_annual_scope(text,text,jsonb) from %I',role_name);
      execute format('revoke all on function public.escen_website_manage(uuid,text,text,jsonb),public.escen_website_public(text,text,jsonb) from %I',role_name);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_website_manage(uuid,text,text,jsonb),public.escen_website_public(text,text,jsonb) to service_role; end if;
end $$;

-- Only reference catalogs are timeless; undated publications/logs do not belong to every year.
create or replace function escen_private.history_matches_year(p_row escen_private.legacy_rows,p_year_id uuid) returns boolean
language sql stable set search_path=pg_catalog as $$
  select p_row.source_table in ('annee_scolaires','filieres','niveaux','matieres','periodes','salles','users','document_types','document_requirements','support_categories')
    or p_year_id=any(escen_private.history_year_ids(p_row));
$$;

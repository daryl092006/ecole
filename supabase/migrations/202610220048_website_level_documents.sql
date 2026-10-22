-- Pièces communes par année et niveau — accord utilisateur du 22 octobre 2026.
-- Application et tests locaux uniquement pendant ce chantier.
begin;

create table escen.website_level_document_rules (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references escen.academic_years(id) on delete restrict,
  level_id uuid not null references escen.levels(id) on delete restrict,
  required_documents jsonb not null check (jsonb_typeof(required_documents) = 'array' and jsonb_array_length(required_documents) <= 8),
  version integer not null default 1 check (version > 0),
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, level_id)
);
create index website_level_document_rules_level_fk on escen.website_level_document_rules(level_id);
alter table escen.website_level_document_rules enable row level security;
revoke all on escen.website_level_document_rules from public;
create trigger no_delete before delete on escen.website_level_document_rules
  for each row execute function escen_private.no_delete();
create trigger audit_event after insert or update on escen.website_level_document_rules
  for each row execute function escen_private.record_audit();

-- Ordre de verrouillage commun aux éditions de campagne et aux règles de niveau.
-- Les contrôles de droits et les écritures existants restent exécutés par délégation.
alter function public.escen_website_manage(uuid,text,text,jsonb) rename to escen_website_manage_before_level_documents;
create function public.escen_website_manage(p_actor_id uuid,p_role_code text,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare result jsonb;
begin
  if p_action = 'intake-save' then
    perform 1 from escen.academic_years where id = (p_data->>'academic_year_id')::uuid for update;
  end if;
  result := public.escen_website_manage_before_level_documents(p_actor_id,p_role_code,p_action,p_data);
  if p_action = 'admissions' then
    result := result || jsonb_build_object('level_document_rules', coalesce((select jsonb_agg(to_jsonb(r)) from escen.website_level_document_rules r), '[]'));
  end if;
  return result;
end $$;
revoke all on function public.escen_website_manage_before_level_documents(uuid,text,text,jsonb) from public;
revoke all on function public.escen_website_manage(uuid,text,text,jsonb) from public;

-- Les RPC publiques et la vérification des dossiers continuent de lire le cache
-- website_intakes.required_documents ; ce cache est imposé par la règle du niveau.
-- Une nouvelle filière hérite donc des pièces sans recopie manuelle.
create function escen_private.apply_level_document_rule() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare documents jsonb;
begin
  -- Même verrou que la sauvegarde du niveau, y compris lors d'une création concurrente.
  perform 1 from escen.academic_years where id = new.academic_year_id for update;
  select required_documents into documents from escen.website_level_document_rules
    where academic_year_id = new.academic_year_id and level_id = new.level_id;
  if found then new.required_documents := documents; end if;
  return new;
end $$;
create trigger level_document_rule before insert or update on escen.website_intakes
  for each row execute function escen_private.apply_level_document_rule();

-- Lecture si p_level_id est NULL ; sinon sauvegarde transactionnelle de tout le niveau.
-- Réutilisation des permissions et du périmètre global déjà en place.
create function public.escen_website_level_documents(
  p_actor_id uuid, p_role_code text, p_academic_year_id uuid,
  p_level_id uuid default null, p_required_documents jsonb default null,
  p_expected_intakes jsonb default null, p_expected_rule_version integer default null,
  p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare can_write boolean; documents jsonb; current_intakes jsonb; expected_intakes jsonb;
  previous_rule escen.website_level_document_rules; result escen.website_level_document_rules;
  changed integer; previous_actor text;
begin
  -- Authentification du compte, rôle actif, accès global, permission student.view
  -- et restriction des rôles : mêmes contrôles que l'écran des candidatures.
  perform public.escen_website_manage(p_actor_id, p_role_code, 'admissions', '{}');
  if not exists(select 1 from escen.academic_years where id = p_academic_year_id and archived_at is null) then
    raise exception 'Année absente ou archivée' using errcode = '23514';
  end if;
  if p_level_id is null then
    return coalesce((select jsonb_agg(to_jsonb(r) order by r.level_id)
      from escen.website_level_document_rules r where r.academic_year_id = p_academic_year_id), '[]');
  end if;
  select exists(select 1 from escen.role_grants g
    join escen.roles r on r.id = g.role_id
    join escen.role_permissions rp on rp.role_id = r.id
    join escen.permissions p on p.id = rp.permission_id
    where g.account_id = p_actor_id and r.active and r.code = p_role_code
      and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
      and p.code = 'student.lifecycle.manage') into can_write;
  if not can_write then raise exception 'Modification non autorisée' using errcode = '42501'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 3 and 1000 then
    raise exception 'Motif obligatoire' using errcode = '23514';
  end if;
  if not exists(select 1 from escen.levels where id = p_level_id and archived_at is null) then
    raise exception 'Niveau absent ou archivé' using errcode = '23514';
  end if;
  if p_required_documents is null or jsonb_typeof(p_required_documents) <> 'array' then
    raise exception 'Liste des pièces invalide' using errcode = '23514';
  end if;
  if jsonb_array_length(p_required_documents) > 8 or exists(
    select 1 from jsonb_array_elements(p_required_documents) d(value)
    where jsonb_typeof(value) <> 'string' or value #>> '{}' not in (
      'photo_identite_file', 'nationalite_file', 'naissance_file', 'diplome_file',
      'certificat_medical_file', 'cv_file', 'releve_bac1', 'releve_bac2')) then
    raise exception 'Pièce inconnue ou liste trop longue' using errcode = '23514';
  end if;
  select coalesce(jsonb_agg(value order by value), '[]') into documents
    from (select distinct value from jsonb_array_elements(p_required_documents)) d;
  if jsonb_array_length(documents) <> jsonb_array_length(p_required_documents) then
    raise exception 'Pièce dupliquée' using errcode = '23514';
  end if;
  if p_expected_intakes is null or jsonb_typeof(p_expected_intakes) <> 'array' then
    raise exception 'Versions des formations requises' using errcode = '23514';
  end if;
  if jsonb_array_length(p_expected_intakes) not between 1 and 500 then
    raise exception 'Lot de formations invalide' using errcode = '23514';
  end if;
  -- Une seule transaction : aucune filière ne peut rester partiellement mise à jour.
  perform 1 from escen.academic_years where id = p_academic_year_id for update;
  perform 1 from escen.website_intakes
    where academic_year_id = p_academic_year_id and level_id = p_level_id order by id for update;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'version', version) order by id), '[]')
    into current_intakes from escen.website_intakes
    where academic_year_id = p_academic_year_id and level_id = p_level_id;
  select coalesce(jsonb_agg(jsonb_build_object('id', (value->>'id')::uuid,
    'version', (value->>'version')::integer) order by (value->>'id')::uuid), '[]')
    into expected_intakes from jsonb_array_elements(p_expected_intakes);
  if current_intakes <> expected_intakes then
    raise exception 'Les formations ont changé : actualisez le niveau' using errcode = '40001';
  end if;
  select * into previous_rule from escen.website_level_document_rules
    where academic_year_id = p_academic_year_id and level_id = p_level_id for update;
  if previous_rule.version is distinct from p_expected_rule_version then
    raise exception 'Les pièces du niveau ont changé' using errcode = '40001';
  end if;
  previous_actor := current_setting('escen.actor_id', true);
  perform set_config('escen.actor_id', p_actor_id::text, true);
  insert into escen.website_level_document_rules(academic_year_id, level_id, required_documents, reason)
    values (p_academic_year_id, p_level_id, documents, btrim(p_reason))
    on conflict (academic_year_id, level_id) do update set
      required_documents = excluded.required_documents,
      version = escen.website_level_document_rules.version + 1,
      reason = excluded.reason, updated_at = now()
    returning * into result;
  update escen.website_intakes set required_documents = documents, version = version + 1, reason = btrim(p_reason)
    where academic_year_id = p_academic_year_id and level_id = p_level_id;
  get diagnostics changed = row_count;
  perform set_config('escen.actor_id', coalesce(previous_actor, ''), true);
  return jsonb_build_object('rule', to_jsonb(result), 'updated_intakes', changed);
end $$;
revoke all on function escen_private.apply_level_document_rule() from public;
revoke all on function public.escen_website_level_documents(uuid,text,uuid,uuid,jsonb,jsonb,integer,text)
  from public;

-- Ne pas exposer cette nouvelle table via le snapshot général des autres modules.
alter function public.escen_backend_snapshot() rename to escen_backend_snapshot_before_level_documents;
create function public.escen_backend_snapshot() returns jsonb
language sql security definer set search_path = pg_catalog as $$
  select public.escen_backend_snapshot_before_level_documents() #- '{tables,website_level_document_rules}'::text[];
$$;
revoke all on function public.escen_backend_snapshot_before_level_documents() from public;
revoke all on function public.escen_backend_snapshot() from public;

do $$ declare role_name text; signature text; begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on escen.website_level_document_rules from %I', role_name);
      foreach signature in array array[
        'public.escen_website_manage_before_level_documents(uuid,text,text,jsonb)',
        'public.escen_website_manage(uuid,text,text,jsonb)',
        'escen_private.apply_level_document_rule()',
        'public.escen_website_level_documents(uuid,text,uuid,uuid,jsonb,jsonb,integer,text)',
        'public.escen_backend_snapshot_before_level_documents()', 'public.escen_backend_snapshot()'
      ] loop execute format('revoke all on function %s from %I', signature, role_name); end loop;
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.escen_website_manage(uuid,text,text,jsonb),
      public.escen_website_level_documents(uuid,text,uuid,uuid,jsonb,jsonb,integer,text),
      public.escen_backend_snapshot() to service_role;
  end if;
end $$;

-- Pas de fusion automatique des anciennes pièces différentes entre filières.
-- L'utilisateur choisira puis confirmera les pièces communes du niveau.
commit;

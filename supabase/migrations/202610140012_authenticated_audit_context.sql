-- Conserver l’auteur de la commande même pour une table sans colonne auteur.
-- Contexte local à la transaction, restauré après la commande ; permissions RPC inchangées.
begin;
create or replace function escen_private.record_audit() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare previous jsonb; current_value jsonb; actor uuid; roles text[];
begin
  current_value := to_jsonb(new);
  if tg_op = 'UPDATE' then previous := to_jsonb(old); end if;
  actor := coalesce(nullif(current_setting('escen.actor_id',true),''),current_value->>'actor_id',current_value->>'last_modified_by',current_value->>'entered_by',current_value->>'recorded_by',current_value->>'created_by',
    current_value->>'changed_by',current_value->>'issued_by',current_value->>'approved_by',
    current_value->>'authorized_by',current_value->>'granted_by',current_value->>'allocated_by',
    current_value->>'received_by',current_value->>'uploaded_by',current_value->>'decided_by',current_value->>'corrected_by')::uuid;
  if actor is not null then
    select coalesce(array_agg(distinct r.code), '{}') into roles from escen.role_grants g join escen.roles r on r.id = g.role_id
      where g.account_id = actor and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now());
  end if;
  insert into escen_private.audit_events(table_schema, table_name, entity_id, action, actor_id, role_codes, database_actor, reason, old_value, new_value)
    values (tg_table_schema, tg_table_name, new.id, tg_op, actor, coalesce(roles,'{}'), session_user,
      coalesce(current_value->>'reason',current_value->>'review_reason',current_value->>'withdrawal_reason'),previous,current_value);
  return new;
end $$;
create or replace function public.escen_backend_transaction(p_actor_id uuid,p_expected_revision bigint,p_changes jsonb) returns bigint
language plpgsql security definer set search_path = pg_catalog as $$
declare current_revision bigint; change jsonb; payload jsonb; target text; operation text;
  columns text; selects text; assignments text; row_id uuid; attribute text; changed_rows integer; previous_actor text;
begin
  if not exists (select 1 from escen.accounts where id = p_actor_id and active and auth_user_id is not null) then
    raise exception 'Compte applicatif actif obligatoire' using errcode = '42501';
  end if;
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) < 1 or jsonb_array_length(p_changes) > 100 then
    raise exception 'Lot de modifications invalide' using errcode = '23514';
  end if;
  select revision into current_revision from escen_private.portal_revision where singleton for update;
  if current_revision <> p_expected_revision then raise exception 'CONCURRENT_UPDATE' using errcode = '40001'; end if;
  previous_actor := current_setting('escen.actor_id',true);
  perform set_config('escen.actor_id',p_actor_id::text,true);
  for change in select value from jsonb_array_elements(p_changes) loop
    target := change->>'table'; operation := change->>'operation'; payload := change->'record';
    if operation not in ('insert','update') or jsonb_typeof(payload) <> 'object' or not exists
      (select 1 from pg_tables where schemaname = 'escen' and tablename = target) then
      raise exception 'Table ou opération interdite' using errcode = '42501';
    end if;
    for attribute in select key from jsonb_object_keys(payload) as keys(key) loop
      if not exists (select 1 from information_schema.columns where table_schema = 'escen' and table_name = target
        and column_name = attribute and is_generated = 'NEVER') then
        raise exception 'Attribut inconnu ou généré' using errcode = '23514';
      end if;
    end loop;
    for attribute in select column_name from information_schema.columns where table_schema = 'escen' and table_name = target
      and column_name in ('actor_id','recorded_by','created_by','changed_by','issued_by','approved_by','authorized_by','granted_by',
        'allocated_by','received_by','uploaded_by','decided_by','corrected_by','entered_by','last_modified_by') loop
      if operation = 'insert' or payload ? attribute then payload := jsonb_set(payload,array[attribute],to_jsonb(p_actor_id)); end if;
    end loop;
    row_id := (payload->>'id')::uuid;
    if operation = 'insert' then
      select string_agg(format('%I',key),',' order by key),string_agg(format('r.%I',key),',' order by key)
        into columns,selects from jsonb_object_keys(payload) as keys(key);
      execute format('insert into escen.%I(%s) select %s from jsonb_populate_record(null::escen.%I,$1) r',target,columns,selects,target) using payload;
    else
      if row_id is null then raise exception 'Identifiant obligatoire' using errcode = '23514'; end if;
      select string_agg(format('%I = r.%I',key,key),',' order by key) into assignments
        from jsonb_object_keys(payload) as keys(key) where key <> 'id';
      if assignments is null then raise exception 'Modification vide' using errcode = '23514'; end if;
      execute format('update escen.%I t set %s from jsonb_populate_record(null::escen.%I,$1) r where t.id = $2',target,assignments,target) using payload,row_id;
      get diagnostics changed_rows = row_count;
      if changed_rows = 0 then raise exception 'Entité absente' using errcode = '23503'; end if;
    end if;
  end loop;
  update escen_private.portal_revision set revision = revision + 1,changed_at = now(),actor_id = p_actor_id where singleton returning revision into current_revision;
  perform set_config('escen.actor_id',coalesce(previous_actor,''),true);
  return current_revision;
end $$;
commit;

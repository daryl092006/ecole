-- La création d’une évaluation et la saisie d’une grande promotion restent atomiques.
-- La passerelle existante conserve sa limite de 100 ; chaque sous-lot contient au plus 50 écritures.
begin;

create function public.escen_evaluation_transaction(p_actor_id uuid, p_expected_revision bigint, p_changes jsonb)
returns bigint language plpgsql security definer set search_path = pg_catalog as $$
declare
  current_revision bigint := p_expected_revision;
  change jsonb;
  batch jsonb;
begin
  if p_expected_revision is null or p_expected_revision < 0 or jsonb_typeof(p_changes) is distinct from 'array' then
    raise exception 'Lot d’évaluation invalide' using errcode = '23514';
  end if;
  if jsonb_array_length(p_changes) = 0 then
    raise exception 'Lot d’évaluation vide' using errcode = '23514';
  end if;
  for change in select value from jsonb_array_elements(p_changes) loop
    if not coalesce(
      (change->>'table' in ('evaluations', 'evaluation_candidates', 'evaluation_transitions') and change->>'operation' = 'insert')
      or (change->>'table' = 'grades' and change->>'operation' in ('insert', 'update')), false) then
      raise exception 'Table ou opération hors du circuit des notes' using errcode = '42501';
    end if;
  end loop;

  -- Un seul appel RPC, donc une seule transaction PostgreSQL : une erreur dans un lot
  -- annule aussi les lots précédents, leurs audits et toutes leurs révisions.
  -- Le verrou de portal_revision acquis par la passerelle est gardé jusqu’à la fin.
  for batch in
    select jsonb_agg(value order by ordinality)
    from jsonb_array_elements(p_changes) with ordinality
    group by (ordinality - 1) / 50
    order by (ordinality - 1) / 50
  loop
    current_revision := public.escen_backend_transaction(p_actor_id, current_revision, batch);
  end loop;
  return current_revision;
end $$;

revoke all on function public.escen_evaluation_transaction(uuid, bigint, jsonb) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.escen_evaluation_transaction(uuid, bigint, jsonb) from anon;
  end if;
  if exists(select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.escen_evaluation_transaction(uuid, bigint, jsonb) from authenticated;
  end if;
  if exists(select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.escen_evaluation_transaction(uuid, bigint, jsonb) to service_role;
  end if;
end $$;

commit;

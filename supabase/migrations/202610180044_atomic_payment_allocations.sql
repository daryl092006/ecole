begin;

create function public.escen_payment_transaction(
  p_actor_id uuid,
  p_expected_revision bigint,
  p_action text,
  p_payment_id uuid,
  p_changes jsonb
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_revision bigint;
  change jsonb;
  payload jsonb;
  target text;
  batch jsonb;
  payment escen.payments;
  payment_count integer := 0;
  receipt_count integer := 0;
begin
  if p_expected_revision is null
     or p_expected_revision < 0
     or p_payment_id is null
     or p_action is null
     or p_action not in ('record', 'reallocate')
     or jsonb_typeof(p_changes) is distinct from 'array'
  then
    raise exception 'Commande de paiement invalide'
      using errcode = '23514';
  end if;

  if jsonb_array_length(p_changes) = 0 then
    raise exception 'Lot de paiement vide'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from escen.accounts a
    join escen.role_grants g on g.account_id = a.id
    join escen.roles r on r.id = g.role_id
    join escen.role_permissions rp on rp.role_id = r.id
    join escen.permissions p on p.id = rp.permission_id
    where a.id = p_actor_id
      and a.active
      and a.auth_user_id is not null
      and r.active
      and r.code in ('RAF', 'IT')
      and p.code = 'payment.record'
      and g.valid_from <= now()
      and (g.valid_until is null or g.valid_until > now())
  ) then
    raise exception 'Autorisation financière RAF ou IT requise'
      using errcode = '42501';
  end if;

  -- Même ordre de verrouillage que la transaction existante.
  select revision into current_revision
  from escen_private.portal_revision
  where singleton
  for update;

  if current_revision is distinct from p_expected_revision then
    raise exception 'CONCURRENT_UPDATE'
      using errcode = '40001';
  end if;

  if p_action = 'reallocate' then
    select * into payment
    from escen.payments
    where id = p_payment_id
    for update;

    if not found then
      raise exception 'Paiement introuvable'
        using errcode = '23503';
    end if;

    if payment.status = 'PENDING'
       or exists (
         select 1 from escen.payment_reversals
         where payment_id = p_payment_id
       )
    then
      raise exception 'Paiement en attente ou annulé : réaffectation interdite'
        using errcode = '23514';
    end if;
  end if;

  -- L’API contrôle également l’année, l’inscription
  -- et le périmètre du rôle sélectionné.
  for change in select value from jsonb_array_elements(p_changes)
  loop
    payload := change->'record';
    target := change->>'table';

    if change->>'operation' is distinct from 'insert'
       or jsonb_typeof(payload) is distinct from 'object'
    then
      raise exception 'Seules les écritures financières additives sont permises'
        using errcode = '42501';
    end if;

    if target = 'payments' then
      if p_action <> 'record'
         or (payload->>'id')::uuid is distinct from p_payment_id
         or coalesce(payload->>'status', 'POSTED') <> 'POSTED'
         or coalesce(char_length(btrim(payload->>'comment')), 0)
              not between 3 and 1000
      then
        raise exception 'Création de paiement invalide'
          using errcode = '23514';
      end if;
      payment_count := payment_count + 1;

    elsif target = 'receipts' then
      if p_action <> 'record'
         or (payload->>'payment_id')::uuid
              is distinct from p_payment_id
      then
        raise exception 'Reçu hors du paiement courant'
          using errcode = '23514';
      end if;
      receipt_count := receipt_count + 1;

    elsif target = 'payment_allocations' then
      if (payload->>'payment_id')::uuid
           is distinct from p_payment_id
         or payload->>'installment_id' is null
      then
        raise exception 'Affectation hors du paiement ou sans échéance'
          using errcode = '23514';
      end if;

    elsif target = 'allocation_reversals' then
      if p_action <> 'reallocate'
         or coalesce(char_length(btrim(payload->>'reason')), 0)
              not between 3 and 1000
         or not exists (
           select 1
           from escen.payment_allocations a
           where a.id = (payload->>'allocation_id')::uuid
             and a.payment_id = p_payment_id
         )
      then
        raise exception 'Contrepassation invalide ou insuffisamment motivée'
          using errcode = '23514';
      end if;

    else
      raise exception 'Table hors du circuit des affectations'
        using errcode = '42501';
    end if;
  end loop;

  if (p_action = 'record'
      and (payment_count <> 1 or receipt_count <> 1))
     or (p_action = 'reallocate'
         and (payment_count <> 0 or receipt_count <> 0))
  then
    raise exception 'Paiement et reçu doivent être créés ensemble'
      using errcode = '23514';
  end if;

  -- Les contrepassations précèdent les nouvelles affectations.
  -- Une erreur annule tous les lots, audits et révisions compris.
  for batch in
    select jsonb_agg(value order by ordinality)
    from jsonb_array_elements(p_changes) with ordinality
    group by (ordinality - 1) / 50
    order by (ordinality - 1) / 50
  loop
    current_revision := public.escen_backend_transaction(
      p_actor_id, current_revision, batch
    );
  end loop;

  return current_revision;
end;
$$;

revoke all on function
  public.escen_payment_transaction(uuid, bigint, text, uuid, jsonb)
  from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function
      public.escen_payment_transaction(uuid, bigint, text, uuid, jsonb)
      from anon;
  end if;

  if exists (
    select 1 from pg_roles where rolname = 'authenticated'
  ) then
    revoke all on function
      public.escen_payment_transaction(uuid, bigint, text, uuid, jsonb)
      from authenticated;
  end if;

  if exists (
    select 1 from pg_roles where rolname = 'service_role'
  ) then
    grant execute on function
      public.escen_payment_transaction(uuid, bigint, text, uuid, jsonb)
      to service_role;
  end if;
end;
$$;

commit;

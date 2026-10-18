begin;

create or replace function escen_private.guard_financial_operation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  p escen.payments;
  available numeric;
  used numeric;
  maximum numeric;
  c uuid;
  v escen.contract_versions;
  source escen.payment_allocations;
  replacement jsonb;
begin
  if tg_table_name in (
    'payment_allocations', 'payment_reversals', 'refunds'
  ) then
    select * into p
    from escen.payments
    where id = new.payment_id
    for update;

    if exists (
      select 1 from escen.payment_reversals
      where payment_id = p.id
    ) then
      raise exception 'Paiement déjà annulé'
        using errcode = '23514';
    end if;

    available := p.amount - coalesce((
      select sum(amount) from escen.refunds
      where payment_id = p.id
    ), 0);

    used := coalesce((
      select sum(amount) from escen.active_payment_allocations
      where payment_id = p.id
    ), 0);

    if tg_table_name = 'payment_reversals' then
      if exists (
        select 1 from escen.refunds where payment_id = p.id
      ) then
        raise exception 'Paiement remboursé : annulation incompatible'
          using errcode = '23514';
      end if;
      return new;
    end if;

    if used + new.amount > available then
      raise exception 'Montant disponible du paiement dépassé'
        using errcode = '23514';
    end if;

    if tg_table_name = 'payment_allocations' then
      select * into v
      from escen.contract_versions
      where id = new.version_id
      for update;

      if v.status <> 'APPROVED' then
        replacement := nullif(
          current_setting('escen.refund_replacement', true), ''
        )::jsonb;

        select * into source
        from escen.payment_allocations
        where id = (replacement->>'source_id')::uuid;

        -- Seul le reliquat réduit d’une affectation contrepassée
        -- peut conserver les références d’un ancien contrat.
        if v.status not in ('SUPERSEDED', 'EN_COURS')
           or replacement->>'new_id'
                is distinct from new.id::text
           or source.id is null
           or row(
             new.payment_id, new.enrollment_id, new.contract_id,
             new.version_id, new.line_id, new.installment_id
           ) is distinct from row(
             source.payment_id, source.enrollment_id,
             source.contract_id, source.version_id,
             source.line_id, source.installment_id
           )
           or new.amount >= source.amount
           or not exists (
             select 1 from escen.allocation_reversals r
             where r.allocation_id = source.id
               and r.actor_id = nullif(
                 current_setting('escen.actor_id', true), ''
               )::uuid
           )
        then
          raise exception 'Allocation sur un contrat non courant'
            using errcode = '23514';
        end if;
      end if;

      perform 1 from escen.contract_lines
      where id = new.line_id
      for update;

      select amount into maximum
      from escen.contract_lines
      where id = new.line_id;

      maximum := maximum
        - coalesce((
          select sum(amount) from escen.contract_discounts
          where line_id = new.line_id
        ), 0)
        - coalesce((
          select sum(amount) from escen.credit_notes
          where line_id = new.line_id
        ), 0);

      if coalesce((
        select sum(amount) from escen.active_payment_allocations
        where line_id = new.line_id
      ), 0) + new.amount > maximum then
        raise exception 'Ligne de frais déjà réglée'
          using errcode = '23514';
      end if;

      if new.installment_id is not null then
        perform 1 from escen.installments
        where id = new.installment_id
        for update;

        if coalesce((
          select sum(amount) from escen.active_payment_allocations
          where installment_id = new.installment_id
        ), 0) + new.amount > (
          select amount from escen.installments
          where id = new.installment_id
        ) then
          raise exception 'Échéance déjà réglée'
            using errcode = '23514';
        end if;
      end if;
    end if;

  elsif tg_table_name = 'credit_notes' then
    perform 1 from escen.contract_lines
    where id = new.line_id
    for update;

    select amount into maximum
    from escen.contract_lines
    where id = new.line_id;

    maximum := maximum - coalesce((
      select sum(amount) from escen.contract_discounts
      where line_id = new.line_id
    ), 0);

    if coalesce((
      select sum(amount) from escen.credit_notes
      where line_id = new.line_id
    ), 0) + new.amount + coalesce((
      select sum(amount) from escen.active_payment_allocations
      where line_id = new.line_id
    ), 0) > maximum then
      raise exception 'Avoir supérieur au montant non alloué de la ligne'
        using errcode = '23514';
    end if;

  elsif tg_table_name = 'allocation_reversals' then
    select payment_id into c
    from escen.payment_allocations
    where id = new.allocation_id;

    perform 1 from escen.payments
    where id = c
    for update;
  end if;

  return new;
end;
$$;

create function public.escen_payment_adjustment(
  p_actor_id uuid,
  p_expected_revision bigint,
  p_action text,
  p_entity_id uuid,
  p_amount numeric,
  p_reference text,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_revision bigint;
  payment escen.payments;
  source escen.payment_allocations;
  bucket record;
  part record;
  available numeric;
  allocated numeric;
  to_release numeric;
  chunk numeric;
  copy_id uuid;
  previous_actor text;
  previous_replacement text;
begin
  if p_expected_revision is null
     or p_expected_revision < 0
     or p_entity_id is null
     or p_action is null
     or p_action not in ('cancel', 'refund', 'credit')
     or coalesce(char_length(btrim(p_reason)), 0)
          not between 3 and 1000
  then
    raise exception 'Commande financière ou motif invalide'
      using errcode = '23514';
  end if;

  if p_action <> 'cancel' and (
    p_amount is null
    or p_amount <= 0
    or p_amount <> trunc(p_amount)
  ) then
    raise exception 'Montant FCFA entier positif obligatoire'
      using errcode = '23514';
  end if;

  if p_action = 'refund' and
     coalesce(char_length(btrim(p_reference)), 0)
       not between 2 and 160
  then
    raise exception 'Référence de remboursement invalide'
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
      and g.valid_from <= now()
      and (g.valid_until is null or g.valid_until > now())
      and (
        (
          p_action = 'cancel'
          and r.code in ('DG', 'IT')
          and p.code = 'payment.cancel'
        )
        or (
          p_action in ('refund', 'credit')
          and r.code in ('RAF', 'IT')
          and p.code = 'payment.record'
        )
      )
  ) then
    raise exception 'Autorisation financière insuffisante'
      using errcode = '42501';
  end if;

  select revision into current_revision
  from escen_private.portal_revision
  where singleton
  for update;

  if current_revision is distinct from p_expected_revision then
    raise exception 'CONCURRENT_UPDATE'
      using errcode = '40001';
  end if;

  previous_actor := current_setting('escen.actor_id', true);
  previous_replacement :=
    current_setting('escen.refund_replacement', true);

  perform set_config('escen.actor_id', p_actor_id::text, true);
  perform set_config('escen.refund_replacement', '{}', true);

  if p_action in ('cancel', 'refund') then
    select * into payment
    from escen.payments
    where id = p_entity_id
    for update;

    if not found then
      raise exception 'Paiement introuvable'
        using errcode = '23503';
    end if;

    if exists (
      select 1 from escen.payment_reversals
      where payment_id = payment.id
    ) then
      raise exception 'Paiement déjà annulé'
        using errcode = '23514';
    end if;

    if p_action = 'cancel' then
      insert into escen.payment_reversals(
        payment_id, actor_id, reason
      )
      values (payment.id, p_actor_id, btrim(p_reason));

    else
      if payment.status <> 'POSTED' then
        raise exception 'Un paiement en attente ne peut pas être remboursé'
          using errcode = '23514';
      end if;

      available := payment.amount - coalesce((
        select sum(amount) from escen.refunds
        where payment_id = payment.id
      ), 0);

      if p_amount > available then
        raise exception 'Remboursement supérieur au paiement net disponible'
          using errcode = '23514';
      end if;

      select coalesce(sum(amount), 0) into allocated
      from escen.active_payment_allocations
      where payment_id = payment.id;

      to_release := greatest(
        allocated - (available - p_amount), 0
      );

      -- Libération des échéances les plus récentes.
      for bucket in
        select
          a.installment_id,
          sum(a.amount) as amount
        from escen.active_payment_allocations a
        left join escen.installments i on i.id = a.installment_id
        where a.payment_id = payment.id
        group by a.installment_id
        order by
          max(i.due_on) desc nulls last,
          max(a.allocated_at) desc,
          a.installment_id desc nulls last
      loop
        exit when to_release = 0;
        chunk := least(to_release, bucket.amount);

        -- Prorata entier entre les affectations d’une échéance.
        for part in
          with shares as (
            select
              a.id,
              floor(a.amount * chunk / bucket.amount) as base_cut,
              mod(a.amount * chunk, bucket.amount) as remainder
            from escen.active_payment_allocations a
            where a.payment_id = payment.id
              and a.installment_id
                    is not distinct from bucket.installment_id
          )
          select
            id,
            base_cut + case
              when row_number() over (
                order by remainder desc, id
              ) <= chunk - sum(base_cut) over ()
              then 1 else 0
            end as reduction
          from shares
          order by id
        loop
          continue when part.reduction = 0;

          select * into source
          from escen.payment_allocations
          where id = part.id;

          insert into escen.allocation_reversals(
            allocation_id, actor_id, reason
          )
          values (source.id, p_actor_id, btrim(p_reason));

          if part.reduction < source.amount then
            copy_id := gen_random_uuid();

            perform set_config(
              'escen.refund_replacement',
              jsonb_build_object(
                'new_id', copy_id,
                'source_id', source.id
              )::text,
              true
            );

            insert into escen.payment_allocations(
              id, payment_id, enrollment_id, contract_id,
              version_id, line_id, installment_id,
              amount, allocated_by
            )
            values (
              copy_id, source.payment_id, source.enrollment_id,
              source.contract_id, source.version_id,
              source.line_id, source.installment_id,
              source.amount - part.reduction, p_actor_id
            );
          end if;
        end loop;

        to_release := to_release - chunk;
      end loop;

      if to_release <> 0 then
        raise exception 'Libération des affectations incomplète'
          using errcode = '23514';
      end if;

      insert into escen.refunds(
        payment_id, amount, reference, actor_id, reason
      )
      values (
        payment.id, p_amount, btrim(p_reference),
        p_actor_id, btrim(p_reason)
      );
    end if;

  else
    perform 1
    from escen.contract_lines l
    join escen.contract_versions v on v.id = l.version_id
    where l.id = p_entity_id and v.status = 'APPROVED'
    for update of l, v;

    if not found then
      raise exception 'Ligne absente ou contrat non approuvé'
        using errcode = '23514';
    end if;

    insert into escen.credit_notes(
      line_id, amount, actor_id, reason
    )
    values (
      p_entity_id, p_amount, p_actor_id, btrim(p_reason)
    );
  end if;

  update escen_private.portal_revision
  set revision = revision + 1,
      changed_at = now(),
      actor_id = p_actor_id
  where singleton
  returning revision into current_revision;

  perform set_config(
    'escen.actor_id', coalesce(previous_actor, ''), true
  );
  perform set_config(
    'escen.refund_replacement',
    coalesce(previous_replacement, ''),
    true
  );

  return current_revision;
end;
$$;

revoke all on function
  public.escen_payment_adjustment(
    uuid, bigint, text, uuid, numeric, text, text
  )
  from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function
      public.escen_payment_adjustment(
        uuid, bigint, text, uuid, numeric, text, text
      )
      from anon;
  end if;

  if exists (
    select 1 from pg_roles where rolname = 'authenticated'
  ) then
    revoke all on function
      public.escen_payment_adjustment(
        uuid, bigint, text, uuid, numeric, text, text
      )
      from authenticated;
  end if;

  if exists (
    select 1 from pg_roles where rolname = 'service_role'
  ) then
    grant execute on function
      public.escen_payment_adjustment(
        uuid, bigint, text, uuid, numeric, text, text
      )
      to service_role;
  end if;
end;
$$;

commit;

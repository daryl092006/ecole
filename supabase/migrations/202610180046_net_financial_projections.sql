begin;

create or replace view escen.active_payment_allocations
with (security_invoker = true) as
select a.*
from escen.payment_allocations a
join escen.payments p on p.id = a.payment_id
where p.status <> 'PENDING'
  and not exists (
    select 1
    from escen.allocation_reversals r
    where r.allocation_id = a.id
  )
  and not exists (
    select 1
    from escen.payment_reversals r
    where r.payment_id = a.payment_id
  );

create or replace view escen.contract_balances
with (security_invoker = true) as
select
  c.id as contract_id,
  c.enrollment_id,
  v.id as version_id,
  coalesce((
    select sum(l.amount)
    from escen.contract_lines l
    where l.version_id = v.id
  ), 0)
  - coalesce((
    select sum(d.amount)
    from escen.contract_discounts d
    where d.version_id = v.id
  ), 0)
  - coalesce((
    select sum(n.amount)
    from escen.credit_notes n
    join escen.contract_lines l on l.id = n.line_id
    where l.version_id = v.id
  ), 0) as expected,
  coalesce((
    select sum(
      p.amount - coalesce((
        select sum(f.amount)
        from escen.refunds f
        where f.payment_id = p.id
      ), 0)
    )
    from escen.payments p
    where p.enrollment_id = c.enrollment_id
      and p.status <> 'PENDING'
      and not exists (
        select 1
        from escen.payment_reversals r
        where r.payment_id = p.id
      )
  ), 0) as paid
from escen.financial_contracts c
join escen.contract_versions v
  on v.contract_id = c.id
  and v.status = 'APPROVED';

commit;

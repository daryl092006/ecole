-- =============================================================================
-- Migration 202611060091 : Rattachement automatique des 28 étudiants 2026-2027
-- (matricules 164-ESC-2026 à 191-ESC-2026) à leurs classes officielles
-- (L1 TRONC COMMUN, L1 IA, Licence 3 FD/IA/MD/MPN, Master 1/2/Pro)
-- =============================================================================

begin;

do $$
declare
  v_year_id uuid := 'cbd8ee33-b322-43b2-9876-99636e5891d8';
  v_actor_id uuid;
  r record;
begin
  if not exists (select 1 from escen.academic_years where id = v_year_id) then
    return;
  end if;

  select a.id into v_actor_id
  from escen.accounts a
  join escen.people p on p.id = a.person_id
  where lower(p.email) = lower('g.nobel@escen.university')
  limit 1;

  if v_actor_id is null then
    select id into v_actor_id from escen.accounts where active = true limit 1;
  end if;

  if v_actor_id is null then
    return;
  end if;

  -- Affecter toutes les inscriptions 2026-2027 sans groupe au groupe officiel de leur offre
  for r in (
    select distinct on (e.id)
      e.id as enrollment_id,
      e.offering_id,
      go.group_id,
      g.name as group_name
    from escen.enrollments e
    join escen.academic_offerings ao on ao.id = e.offering_id
    join escen.group_offerings go on go.offering_id = e.offering_id and go.archived_at is null
    join escen.groups g on g.id = go.group_id and g.archived_at is null
    where ao.academic_year_id = v_year_id
      and not exists (
        select 1
        from escen.enrollment_groups eg
        where eg.enrollment_id = e.id
          and eg.valid_until is null
      )
    order by e.id, g.name
  ) loop
    insert into escen.enrollment_groups (
      enrollment_id,
      offering_id,
      group_id,
      valid_from,
      changed_by,
      reason
    )
    values (
      r.enrollment_id,
      r.offering_id,
      r.group_id,
      '2026-10-01'::date,
      v_actor_id,
      'Affectation automatique à la classe officielle ' || r.group_name || ' (2026-2027)'
    )
    on conflict do nothing;
  end loop;
end $$;

commit;

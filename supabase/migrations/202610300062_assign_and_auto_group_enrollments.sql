-- Migration : Affectation automatique des inscriptions aux groupes officiels (L1 Tronc commun, L1 IA, etc.)
create or replace function escen_private.auto_assign_enrollment_group()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_group_id uuid;
  v_group_name text;
  v_actor_id uuid;
begin
  -- Si l'inscription a déjà un groupe, ne rien faire
  if exists (select 1 from escen.enrollment_groups where enrollment_id = new.id) then
    return new;
  end if;

  -- Trouver le groupe officiel associé à l'offre de formation
  select go.group_id, g.name
    into v_group_id, v_group_name
  from escen.group_offerings go
  join escen.groups g on g.id = go.group_id
  where go.offering_id = new.offering_id
  limit 1;

  if v_group_id is not null then
    -- Trouver un compte responsable
    select id into v_actor_id
    from escen.accounts
    where person_id = (select id from escen.people where email = 'g.nobel@escen.university' limit 1)
    limit 1;

    if v_actor_id is null then
      select id into v_actor_id from escen.accounts limit 1;
    end if;

    insert into escen.enrollment_groups(
      enrollment_id,
      offering_id,
      group_id,
      valid_from,
      changed_by,
      reason
    )
    values (
      new.id,
      new.offering_id,
      v_group_id,
      coalesce(new.enrolled_on, current_date),
      v_actor_id,
      'Affectation automatique au groupe officiel ' || coalesce(v_group_name, '')
    )
    on conflict do nothing;
  end if;

  return new;
end $$;

-- Poser le trigger d'affectation automatique sur les nouvelles inscriptions
drop trigger if exists auto_assign_group_trigger on escen.enrollments;
create trigger auto_assign_group_trigger
after insert on escen.enrollments
for each row execute function escen_private.auto_assign_enrollment_group();

-- Rétroaction : Affecter tous les étudiants déjà inscrits sans groupe
do $$
declare
  r record;
  v_actor_id uuid;
begin
  select id into v_actor_id
  from escen.accounts
  where person_id = (select id from escen.people where email = 'g.nobel@escen.university' limit 1)
  limit 1;

  if v_actor_id is null then
    select id into v_actor_id from escen.accounts limit 1;
  end if;

  for r in
    select distinct on (e.id)
      e.id as enrollment_id,
      e.offering_id,
      go.group_id,
      coalesce(e.enrolled_on, current_date) as valid_from,
      g.name as group_name
    from escen.enrollments e
    join escen.group_offerings go on go.offering_id = e.offering_id
    join escen.groups g on g.id = go.group_id
    where not exists (
      select 1 from escen.enrollment_groups eg where eg.enrollment_id = e.id
    )
  loop
    insert into escen.enrollment_groups(
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
      r.valid_from,
      v_actor_id,
      'Affectation automatique au groupe officiel ' || r.group_name
    )
    on conflict do nothing;
  end loop;
end $$;

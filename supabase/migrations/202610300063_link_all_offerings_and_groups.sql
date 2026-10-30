-- Migration : Rattachement de toutes les offres 2026-2027 aux groupes correspondants et affectation automatique
do $$
declare
  r record;
  v_group_id uuid;
  v_actor_id uuid;
begin
  select id into v_actor_id
  from escen.accounts
  where person_id = (select id from escen.people where email = 'g.nobel@escen.university' limit 1)
  limit 1;

  if v_actor_id is null then
    select id into v_actor_id from escen.accounts limit 1;
  end if;

  -- 1. Lier les offres 2026-2027 sans groupe au groupe de même niveau
  for r in
    select o.id as offering_id, o.academic_year_id, o.level_id, o.site_id, l.code as level_code, p.name as program_name
    from escen.academic_offerings o
    join escen.curricula c on c.id = o.curriculum_id
    join escen.programs p on p.id = c.program_id
    join escen.levels l on l.id = o.level_id
    where o.academic_year_id = 'cbd8ee33-b322-43b2-9876-99636e5891d8'
      and not exists (select 1 from escen.group_offerings go where go.offering_id = o.id)
  loop
    v_group_id := null;

    -- Pour L1 Tronc Commun
    if r.level_code = 'L1' and r.program_name in ('Marketing Digital & E-commerce', 'Finance Digitale', 'Management de Projets Numériques') then
      select id into v_group_id from escen.groups where academic_year_id = r.academic_year_id and name = 'L1 TRONC COMMUN' limit 1;
    -- Pour L2 Tronc Commun
    elsif r.level_code = 'L2' and r.program_name in ('Marketing Digital & E-commerce', 'Finance Digitale', 'Management de Projets Numériques') then
      select id into v_group_id from escen.groups where academic_year_id = r.academic_year_id and name = 'L2 TRONC COMMUN' limit 1;
    -- Pour L3 MPN
    elsif r.level_code = 'L3' and r.program_name = 'Management de Projets Numériques' then
      select id into v_group_id from escen.groups where academic_year_id = r.academic_year_id and name = 'Licence 3 MPN' limit 1;
    -- Pour M1 MD
    elsif r.level_code = 'M1' and r.program_name = 'Marketing Digital & E-commerce' then
      select id into v_group_id from escen.groups where academic_year_id = r.academic_year_id and name = 'Master 1 MD' limit 1;
    -- Pour EM FD
    elsif r.level_code = 'EM' and r.program_name = 'Finance Digitale' then
      select id into v_group_id from escen.groups where academic_year_id = r.academic_year_id and name = 'Master Pro FD' limit 1;
    end if;

    if v_group_id is not null then
      insert into escen.group_offerings(group_id, offering_id, academic_year_id, level_id, site_id)
      values (v_group_id, r.offering_id, r.academic_year_id, r.level_id, r.site_id)
      on conflict do nothing;
    end if;
  end loop;

  -- 2. Affecter tous les étudiants encore non affectés
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

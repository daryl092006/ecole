-- 202611040085_assign_scholarship_awards_catalog_2026_2027.sql
-- Enregistrement des 38 attributions de bourses selon le catalogue officiel de l'application :
-- - PART-NEHEMIAH-50 (12 bénéficiaires)
-- - PART-COMPASSION-50 (11 bénéficiaires)
-- - REMISE-50 (8 bénéficiaires)
-- - REMISE-15 (5 bénéficiaires)
-- - REMISE-31 (2 bénéficiaires)
-- - REMISE-20 (1 bénéficiaire)
-- Permet à l'interface /finance/contrats d'afficher les 38 bénéficiaires et leurs fiches détaillées.

begin;

-- 1. Synchronisation du catalogue des 8 bourses
insert into escen.scholarships (code, name, kind, percent, amount, active)
values ('PART-COMPASSION-20', 'Compassion', 'POURCENTAGE', 20.00, null, true)
on conflict (code) do update set name = excluded.name, kind = excluded.kind, percent = excluded.percent, active = true;

insert into escen.scholarships (code, name, kind, percent, amount, active)
values ('PART-COMPASSION-31', 'Compassion', 'POURCENTAGE', 31.00, null, true)
on conflict (code) do update set name = excluded.name, kind = excluded.kind, percent = excluded.percent, active = true;

insert into escen.scholarships (code, name, kind, percent, amount, active)
values ('PART-COMPASSION-50', 'Compassion', 'POURCENTAGE', 50.00, null, true)
on conflict (code) do update set name = excluded.name, kind = excluded.kind, percent = excluded.percent, active = true;

insert into escen.scholarships (code, name, kind, percent, amount, active)
values ('PART-NEHEMIAH-50', 'Nehemiah', 'POURCENTAGE', 50.00, null, true)
on conflict (code) do update set name = excluded.name, kind = excluded.kind, percent = excluded.percent, active = true;

insert into escen.scholarships (code, name, kind, percent, amount, active)
values ('REMISE-15', 'Remise paiement annuel', 'POURCENTAGE', 15.00, null, true)
on conflict (code) do update set name = excluded.name, kind = excluded.kind, percent = excluded.percent, active = true;

insert into escen.scholarships (code, name, kind, percent, amount, active)
values ('REMISE-20', 'Remise ESCEN', 'POURCENTAGE', 20.00, null, true)
on conflict (code) do update set name = excluded.name, kind = excluded.kind, percent = excluded.percent, active = true;

insert into escen.scholarships (code, name, kind, percent, amount, active)
values ('REMISE-31', 'Remise ESCEN', 'POURCENTAGE', 31.00, null, true)
on conflict (code) do update set name = excluded.name, kind = excluded.kind, percent = excluded.percent, active = true;

insert into escen.scholarships (code, name, kind, percent, amount, active)
values ('REMISE-50', 'Bourse ESCEN', 'POURCENTAGE', 50.00, null, true)
on conflict (code) do update set name = excluded.name, kind = excluded.kind, percent = excluded.percent, active = true;

do $$
declare
  v_year_id uuid;
  v_admin_id uuid;
  v_enrollment_id uuid;
  v_sch_id uuid;
  v_award_id uuid;
begin
  select id into v_year_id from escen.academic_years where code = '2026-2027' limit 1;
  if v_year_id is null then return; end if;

  select a.id into v_admin_id
  from escen.accounts a
  join escen.role_grants g on g.account_id = a.id
  join escen.roles r on r.id = g.role_id
  where r.code in ('RAF', 'IT') and a.active = true
  order by case when r.code = 'RAF' then 1 else 2 end
  limit 1;
  if v_admin_id is null then select id into v_admin_id from escen.accounts limit 1; end if;

  -- [164-ESC-2026] AKOR Abla Élisée -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '164-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [035-ESC-2025] ADEPOHA Komlan Victor -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '035-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [025-ESC-2025] ADZODI Prudence -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '025-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [010-ESC-2025] DAYI Adjo -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '010-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [007-ESC-2025] GBLAGUIDI Akouavi -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '007-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [030-ESC-2025] AZIATOUWO Koffi Amen -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '030-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [004-ESC-2024] ADJIGNON Komi Del Pierro -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '004-ESC-2024' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [009-ESC-2024] KESSOUGBO Amavi -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '009-ESC-2024' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [011-ESC-2024] TONOU Kossiwa Léontine -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '011-ESC-2024' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [002-ESC-2022] AGBO Akossiwa Fanta-maiga -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '002-ESC-2022' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [025-ESC-2022] KOUZAO Afi pierrette -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '025-ESC-2022' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [027-ESC-2022] KPOSSOU Aimée -> PART-NEHEMIAH-50
  select id into v_sch_id from escen.scholarships where code = 'PART-NEHEMIAH-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '027-ESC-2022' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Nehemiah Project (50%)',
      jsonb_build_object('code', 'PART-NEHEMIAH-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [153-ESC-2026] EKLO Ablavi Natacha -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '153-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [167-ESC-2026] AGUIDI Abla Dzifa -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '167-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [160-ESC-2026] AHOSSI Mawunyon Verra -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '160-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [170-ESC-2026] EGAN Akouvi Alice -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '170-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [033-ESC-2025] ATCHOU Valérie -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '033-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [146-ESC-2026] ADJEI Honoré Koffi -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '146-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [032-ESC-2025] AGBA Yawo Gedeon -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '032-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [034-ESC-2025] AGBEHADJI Koami Samuel -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '034-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [002-ESC-2024] MESSAN Dédé Egnonam Aubine -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '002-ESC-2024' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [183-ESC-2026] LOKO Cristilla Flavia -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '183-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [185-ESC-2026] AKODA Pascal -> PART-COMPASSION-50
  select id into v_sch_id from escen.scholarships where code = 'PART-COMPASSION-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '185-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Partenariat Compassion International (50%)',
      jsonb_build_object('code', 'PART-COMPASSION-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [165-ESC-2026] BANNA Achraf -> REMISE-50
  select id into v_sch_id from escen.scholarships where code = 'REMISE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '165-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse ESCEN Excellence (50%)',
      jsonb_build_object('code', 'REMISE-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [166-ESC-2026] GBADOE Komi Prince Antoine -> REMISE-50
  select id into v_sch_id from escen.scholarships where code = 'REMISE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '166-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse ESCEN Excellence (50%)',
      jsonb_build_object('code', 'REMISE-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [022-ESC-2025] APATIO Beni de Dieu -> REMISE-50
  select id into v_sch_id from escen.scholarships where code = 'REMISE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '022-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse ESCEN Excellence (50%)',
      jsonb_build_object('code', 'REMISE-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [002-ESC-2025] KPOBIE Manawe -> REMISE-50
  select id into v_sch_id from escen.scholarships where code = 'REMISE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '002-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse ESCEN Excellence (50%)',
      jsonb_build_object('code', 'REMISE-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [040-ESC-2025] BATADJA fékand''N Shalom -> REMISE-50
  select id into v_sch_id from escen.scholarships where code = 'REMISE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '040-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse ESCEN Excellence (50%)',
      jsonb_build_object('code', 'REMISE-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [008-ESC-2025] SOMA Abdou Latifou -> REMISE-50
  select id into v_sch_id from escen.scholarships where code = 'REMISE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '008-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse ESCEN Excellence (50%)',
      jsonb_build_object('code', 'REMISE-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [012-ESC-2025] TAHIROU Moussa -> REMISE-50
  select id into v_sch_id from escen.scholarships where code = 'REMISE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '012-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse ESCEN Excellence (50%)',
      jsonb_build_object('code', 'REMISE-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [015-ESC-2025] KOUESSAN Akossiwa robertine -> REMISE-50
  select id into v_sch_id from escen.scholarships where code = 'REMISE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '015-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse ESCEN Excellence (50%)',
      jsonb_build_object('code', 'REMISE-50', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [171-ESC-2026] GNELE Evynel Olanique -> REMISE-15
  select id into v_sch_id from escen.scholarships where code = 'REMISE-15' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '171-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise paiement annuel comptant (15%)',
      jsonb_build_object('code', 'REMISE-15', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [172-ESC-2026] AKAKPO Harmony Daniella Modoukpe -> REMISE-15
  select id into v_sch_id from escen.scholarships where code = 'REMISE-15' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '172-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise paiement annuel comptant (15%)',
      jsonb_build_object('code', 'REMISE-15', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [174-ESC-2026] AMUZU Koffi Komi Abel -> REMISE-15
  select id into v_sch_id from escen.scholarships where code = 'REMISE-15' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '174-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise paiement annuel comptant (15%)',
      jsonb_build_object('code', 'REMISE-15', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [176-ESC-2026] OLOHUNTO Amed Oba Sanjo -> REMISE-15
  select id into v_sch_id from escen.scholarships where code = 'REMISE-15' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '176-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise paiement annuel comptant (15%)',
      jsonb_build_object('code', 'REMISE-15', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [018-ESC-2025] d''ALMEIDA Ayélé Marianne -> REMISE-15
  select id into v_sch_id from escen.scholarships where code = 'REMISE-15' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '018-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise 15% Double Diplomation - paiement comptant',
      jsonb_build_object('code', 'REMISE-15', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [175-ESC-2026] MAMA Issa -> REMISE-31
  select id into v_sch_id from escen.scholarships where code = 'REMISE-31' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '175-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise ESCEN (31%)',
      jsonb_build_object('code', 'REMISE-31', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [177-ESC-2026] SAMANI Djibril -> REMISE-31
  select id into v_sch_id from escen.scholarships where code = 'REMISE-31' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '177-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise ESCEN (31%)',
      jsonb_build_object('code', 'REMISE-31', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

  -- [048-ESC-2025] ATIKLEME Eddie -> REMISE-20
  select id into v_sch_id from escen.scholarships where code = 'REMISE-20' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students st on st.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and st.matricule = '048-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise ESCEN Partenariat & Groupe (20%)',
      jsonb_build_object('code', 'REMISE-20', 'percent', (select percent from escen.scholarships where id = v_sch_id))
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    -- Lier la remise contractuelle correspondante si elle existe
    update escen.contract_discounts d
    set scholarship_award_id = v_award_id
    from escen.contract_lines l
    join escen.financial_contracts c on c.id = l.contract_id
    where d.line_id = l.id and c.enrollment_id = v_enrollment_id and v_award_id is not null;
  end if;

end $$;

commit;

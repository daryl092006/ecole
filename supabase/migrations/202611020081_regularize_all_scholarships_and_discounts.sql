-- 202611020081_regularize_all_scholarships_and_discounts.sql
-- Enregistrement officiel des bourses, partenariats et remises 2026-2027 pour les 38 étudiants concernés

-- 1. Ajout de la remise 31% au catalogue si absente
insert into escen.scholarships (code, name, kind, percent, amount, active)
values ('REMISE-31', 'Remise Spéciale 31%', 'POURCENTAGE', 31.00, null, true)
on conflict (code) do update set active = true;

-- 2. Création des attributions de bourses pour les 38 étudiants
do $$
declare
  v_year_id uuid;
  v_admin_id uuid;
  v_enrollment_id uuid;
  v_sch_id uuid;
  v_award_id uuid;
begin
  select id into v_year_id from escen.academic_years where code = '2026-2027' limit 1;
  
  select a.id into v_admin_id
  from escen.accounts a
  join escen.role_grants g on g.account_id = a.id
  join escen.roles r on r.id = g.role_id
  where r.code in ('RAF', 'IT') and a.active = true
  order by case when r.code = 'RAF' then 1 else 2 end
  limit 1;
  if v_admin_id is null then select id into v_admin_id from escen.accounts limit 1; end if;

  -- [164-ESC-2026] AKOR Abla Élisée -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '164-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [165-ESC-2026] BANNA Achraf -> BOURSE-50
  select id into v_sch_id from escen.scholarships where code = 'BOURSE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '165-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Demi-bourse d''excellence / mérite (50%)',
      '{"code":"BOURSE-50","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [153-ESC-2026] EKLO Ablavi Natacha -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '153-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [166-ESC-2026] GBADOE Komi Prince Antoine -> BOURSE-50
  select id into v_sch_id from escen.scholarships where code = 'BOURSE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '166-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Demi-bourse d''excellence / mérite (50%)',
      '{"code":"BOURSE-50","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [167-ESC-2026] AGUIDI Abla Dzifa -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '167-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [160-ESC-2026] AHOSSI Mawunyon Verra -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '160-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [170-ESC-2026] EGAN Akouvi Alice -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '170-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [171-ESC-2026] GNELE Evynel Olanique -> REMISE-15
  select id into v_sch_id from escen.scholarships where code = 'REMISE-15' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '171-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise 15% - Paiement annuel comptant',
      '{"code":"REMISE-15","percent":15}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [172-ESC-2026] AKAKPO Harmony Daniella Modoukpe -> REMISE-15
  select id into v_sch_id from escen.scholarships where code = 'REMISE-15' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '172-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise 15% - Paiement annuel comptant',
      '{"code":"REMISE-15","percent":15}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [033-ESC-2025] ATCHOU Valérie -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '033-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [022-ESC-2025] APATIO Beni de Dieu -> BOURSE-50
  select id into v_sch_id from escen.scholarships where code = 'BOURSE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '022-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Demi-bourse d''excellence / mérite (50%)',
      '{"code":"BOURSE-50","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [002-ESC-2025] KPOBIE Manawe -> BOURSE-50
  select id into v_sch_id from escen.scholarships where code = 'BOURSE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '002-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Demi-bourse d''excellence / mérite (50%)',
      '{"code":"BOURSE-50","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [035-ESC-2025] ADEPOHA Komlan Victor -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '035-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [146-ESC-2026] ADJEI Honoré Koffi -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '146-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [025-ESC-2025] ADZODI Prudence -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '025-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [032-ESC-2025] AGBA Yawo Gedeon -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '032-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [034-ESC-2025] AGBEHADJI Koami Samuel -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '034-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [040-ESC-2025] BATADJA fékand'N Shalom -> BOURSE-50
  select id into v_sch_id from escen.scholarships where code = 'BOURSE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '040-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Demi-bourse d''excellence / mérite (50%)',
      '{"code":"BOURSE-50","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [010-ESC-2025] DAYI Adjo -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '010-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [007-ESC-2025] GBLAGUIDI Akouavi -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '007-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [008-ESC-2025] SOMA Abdou Latifou -> BOURSE-50
  select id into v_sch_id from escen.scholarships where code = 'BOURSE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '008-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Demi-bourse d''excellence / mérite (50%)',
      '{"code":"BOURSE-50","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [012-ESC-2025] TAHIROU Moussa -> BOURSE-50
  select id into v_sch_id from escen.scholarships where code = 'BOURSE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '012-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Demi-bourse d''excellence / mérite (50%)',
      '{"code":"BOURSE-50","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [030-ESC-2025] AZIATOUWO Koffi Amen -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '030-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [015-ESC-2025] KOUESSAN Akossiwa robertine -> BOURSE-50
  select id into v_sch_id from escen.scholarships where code = 'BOURSE-50' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '015-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Demi-bourse d''excellence / mérite (50%)',
      '{"code":"BOURSE-50","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [004-ESC-2024] ADJIGNON Komi Del Pierro -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '004-ESC-2024' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [174-ESC-2026] AMUZU Koffi Komi Abel -> REMISE-15
  select id into v_sch_id from escen.scholarships where code = 'REMISE-15' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '174-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise 15% - Paiement annuel comptant',
      '{"code":"REMISE-15","percent":15}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [009-ESC-2024] KESSOUGBO Amavi -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '009-ESC-2024' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [175-ESC-2026] MAMA Issa -> REMISE-31
  select id into v_sch_id from escen.scholarships where code = 'REMISE-31' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '175-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise spéciale 31%',
      '{"code":"REMISE-31","percent":31}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [176-ESC-2026] OLOHUNTO Amed Oba Sanjo -> REMISE-15
  select id into v_sch_id from escen.scholarships where code = 'REMISE-15' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '176-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise 15% - Paiement annuel comptant',
      '{"code":"REMISE-15","percent":15}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [177-ESC-2026] SAMANI Djibril -> REMISE-31
  select id into v_sch_id from escen.scholarships where code = 'REMISE-31' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '177-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise spéciale 31%',
      '{"code":"REMISE-31","percent":31}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [011-ESC-2024] TONOU Kossiwa Léontine -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '011-ESC-2024' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [002-ESC-2024] MESSAN Dédé Egnonam Aubine -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '002-ESC-2024' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [183-ESC-2026] LOKO Cristilla Flavia -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '183-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [048-ESC-2025] ATIKLEME -> REMISE-20
  select id into v_sch_id from escen.scholarships where code = 'REMISE-20' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '048-ESC-2025' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise partenaire / spéciale 20%',
      '{"code":"REMISE-20","percent":20}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [185-ESC-2026] AKODA Pascal -> COMPASSION
  select id into v_sch_id from escen.scholarships where code = 'COMPASSION' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '185-ESC-2026' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Compassion International (50%)',
      '{"code":"COMPASSION","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [002-ESC-2022] AGBO Akossiwa Fanta-maiga -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '002-ESC-2022' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [025-ESC-2022] KOUZAO Afi pierrette -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '025-ESC-2022' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

  -- [027-ESC-2022] KPOSSOU Aimée -> NEHEMIAH
  select id into v_sch_id from escen.scholarships where code = 'NEHEMIAH' limit 1;
  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  where o.academic_year_id = v_year_id and s.matricule = '027-ESC-2022' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Bourse partenaire Nehemiah Project (50%)',
      '{"code":"NEHEMIAH","percent":50}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason;
  end if;

end $$;

-- Migration datée : Insertion des règlements effectifs 2026-2027 (Fichier de recouvrement)
-- 73 étudiants bénéficiaires, 92 écritures de versement, total 8 796 450 FCFA
-- Traçabilité complète : Caisse ESCEN, statut POSTED, montants exacts et contrôle d'intégrité

do $$
declare
  v_year_id uuid;
  v_admin_account_id uuid;
  v_enrollment_id uuid;
  v_person_id uuid;
  v_matricule text;
  v_payer_name text;
begin
  -- 1. Vérification de l'existence de l'année 2026-2027
  select id into v_year_id from escen.academic_years where code = '2026-2027';
  if v_year_id is null then
    -- Ne rien faire dans un environnement de test unitaire éphémère vierge
    return;
  end if;

  -- 2. Compte habilité pour l'enregistrement (RAF / IT)
  select a.id into v_admin_account_id
  from escen.accounts a
  join escen.role_grants g on g.account_id = a.id
  join escen.roles r on r.id = g.role_id
  where r.code in ('RAF', 'IT') and a.active = true
  order by case when r.code = 'RAF' then 1 else 2 end
  limit 1;

  if v_admin_account_id is null then
    raise exception 'Aucun compte RAF ou IT actif trouvé pour enregistrer les règlements';
  end if;

  -- [1/92] 164-ESC-2026 - AKOR Abla Élisée - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '164-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-164-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [2/92] 158-ESC-2026 - AHYEE John Bienvenu Andreano Ayité - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '158-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-158-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [3/92] 158-ESC-2026 - AHYEE John Bienvenu Andreano Ayité - SCOLARITE (290000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '158-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      290000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-158-ESC-2026', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [4/92] 165-ESC-2026 - BANNA Achraf - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '165-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-165-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [5/92] 153-ESC-2026 - EKLO Ablavi Natacha - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '153-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-153-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [6/92] 166-ESC-2026 - GBADOE Komi Prince Antoine - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '166-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-166-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [7/92] 163-ESC-2026 - TELOU Abidé - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '163-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-163-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [8/92] 167-ESC-2026 - AGUIDI Abla Dzifa - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '167-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-167-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [9/92] 160-ESC-2026 - AHOSSI Mawunyon Verra - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '160-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-160-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [10/92] 168-ESC-2026 - BODJONA Koboyo Magnim - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '168-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-168-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [11/92] 168-ESC-2026 - BODJONA Koboyo Magnim - SCOLARITE (160000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '168-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      160000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M2-168-ESC-2026', '2026-09-30'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M2)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [12/92] 169-ESC-2026 - BOURAIMA Rafik - SCOLARITE (408000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '169-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      408000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-169-ESC-2026', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [13/92] 170-ESC-2026 - EGAN Akouvi Alice - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '170-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-170-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [14/92] 171-ESC-2026 - GNELE Evynel Olanique - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '171-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-171-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [15/92] 171-ESC-2026 - GNELE Evynel Olanique - SCOLARITE (408000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '171-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      408000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-171-ESC-2026', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [16/92] 172-ESC-2026 - AKAKPO Harmony Daniella Modoukpe - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '172-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-172-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [17/92] 172-ESC-2026 - AKAKPO Harmony Daniella Modoukpe - SCOLARITE (108000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '172-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      108000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M2-172-ESC-2026', '2026-09-30'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M2)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [18/92] 173-ESC-2026 - AMONY Mensah Léopold Junior - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '173-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-173-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [19/92] 152-ESC-2026 - BOLOUVI Emmanuel Yanis Alvin - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '152-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-152-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [20/92] 152-ESC-2026 - BOLOUVI Emmanuel Yanis Alvin - SCOLARITE (120000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '152-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      120000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M2-152-ESC-2026', '2026-09-30'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M2)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [21/92] 033-ESC-2025 - ATCHOU Valérie - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '033-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-033-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [22/92] 013-ESC-2025 - GABA Kossi Benoît - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '013-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-013-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [23/92] 011-ESC-2025 - MIJIYAWA TAOUFICK - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '011-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-011-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [24/92] 022-ESC-2025 - APATIO Beni de Dieu - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '022-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-022-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [25/92] 022-ESC-2025 - APATIO Beni de Dieu - SCOLARITE (244000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '022-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      244000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-022-ESC-2025', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [26/92] 020-ESC-2025 - CADIRY Ramadan - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '020-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-020-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [27/92] 018-ESC-2025 - d''ALMEIDA Ayélé Marianne - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '018-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-018-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [28/92] 018-ESC-2025 - d''ALMEIDA Ayélé Marianne - SCOLARITE (828750 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '018-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      828750, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-018-ESC-2025', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [29/92] 061-ESC-2025 - HEGNON Komi Thierry - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '061-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-061-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [30/92] 061-ESC-2025 - HEGNON Komi Thierry - SCOLARITE (134000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '061-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      134000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-061-ESC-2025', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [31/92] 002-ESC-2025 - KPOBIE Manawe - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '002-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-002-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [32/92] 002-ESC-2025 - KPOBIE Manawe - SCOLARITE (450000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '002-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      450000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-002-ESC-2025', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [33/92] 003-ESC-2025 - TETE TCHEYI Apéfa Eyram Rebecca - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '003-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-003-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [34/92] 035-ESC-2025 - ADEPOHA Komlan Victor - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '035-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-035-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [35/92] 146-ESC-2026 - ADJEI Honoré Koffi - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '146-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-146-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [36/92] 032-ESC-2025 - AGBA Yawo Gedeon - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '032-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-032-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [37/92] 034-ESC-2025 - AGBEHADJI Koami Samuel - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '034-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-034-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [38/92] 040-ESC-2025 - BATADJA fékand''N Shalom - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '040-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-040-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [39/92] 040-ESC-2025 - BATADJA fékand''N Shalom - SCOLARITE (100000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '040-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      100000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-040-ESC-2025', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [40/92] 010-ESC-2025 - DAYI Adjo - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '010-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-010-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [41/92] 019-ESC-2025 - DJATO Bougonnou Josué - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '019-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-019-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [42/92] 019-ESC-2025 - DJATO Bougonnou Josué - SCOLARITE (135000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '019-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      135000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M2-019-ESC-2025', '2026-09-30'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M2)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [43/92] 007-ESC-2025 - GBLAGUIDI Akouavi - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '007-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-007-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [44/92] 006-ESC-2025 - PILIZIWE Essoklina - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '006-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-006-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [45/92] 006-ESC-2025 - PILIZIWE Essoklina - SCOLARITE (185000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '006-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      185000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-006-ESC-2025', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [46/92] 008-ESC-2025 - SOMA Abdou Latifou - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '008-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-008-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [47/92] 012-ESC-2025 - TAHIROU Moussa - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '012-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-012-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [48/92] 012-ESC-2025 - TAHIROU Moussa - SCOLARITE (137500 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '012-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      137500, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-012-ESC-2025', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [49/92] 030-ESC-2025 - AZIATOUWO Koffi Amen - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '030-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-030-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [50/92] 042-ESC-2025 - KOUDAKPO Komi Rodrigue - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '042-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-042-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [51/92] 015-ESC-2025 - KOUESSAN Akossiwa robertine - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '015-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-015-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [52/92] 015-ESC-2025 - KOUESSAN Akossiwa robertine - SCOLARITE (100000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '015-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      100000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-015-ESC-2025', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [53/92] 174-ESC-2026 - AMUZU Koffi Komi Abel - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '174-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-174-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [54/92] 175-ESC-2026 - MAMA Issa - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '175-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-175-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [55/92] 176-ESC-2026 - OLOHUNTO Amed Oba Sanjo - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '176-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-176-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [56/92] 177-ESC-2026 - SAMANI Djibril - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '177-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-177-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [57/92] 178-ESC-2026 - LOKOSSOU Cedric Franzt - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '178-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-178-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [58/92] 178-ESC-2026 - LOKOSSOU Cedric Franzt - SCOLARITE (300000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '178-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      300000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M2-178-ESC-2026', '2026-09-30'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M2)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [59/92] 043-ESC-2025 - AMAVI Yves daniel - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '043-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-043-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [60/92] 067-ESC-2024 - DOGBLA Koudjo Pacôme Elom - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '067-ESC-2024'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-067-ESC-2024', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [61/92] 067-ESC-2024 - DOGBLA Koudjo Pacôme Elom - SCOLARITE (250000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '067-ESC-2024'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      250000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-067-ESC-2024', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [62/92] 015-ESC-2024 - GABA Adama Jean-Pierre - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '015-ESC-2024'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-015-ESC-2024', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [63/92] 009-ESC-2025 - GARBA Ridwoine - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '009-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-009-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [64/92] 028-ESC-2025 - ISSIFOU Soulemane - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '028-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-028-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [65/92] 017-ESC-2024 - N''FEIDE Pizikilé Payébinam - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '017-ESC-2024'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-017-ESC-2024', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [66/92] 179-ESC-2026 - DATEY Dah Mokpokpo - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '179-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-179-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [67/92] 162-ESC-2026 - FOLLY-NOTSRON Agbenou Ayélé Darina - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '162-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-162-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [68/92] 006-ESC-2024 - GABA Ayélé Daniella Gracia - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '006-ESC-2024'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-006-ESC-2024', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [69/92] 003-ESC-2024 - GUIHINI Fatimé - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '003-ESC-2024'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-003-ESC-2024', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [70/92] 013-ESC-2024 - LOGOSSOU Ami Sika Sandra - SCOLARITE (200000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '013-ESC-2024'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      200000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M2-013-ESC-2024', '2026-09-30'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M2)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [71/92] 013-ESC-2024 - LOGOSSOU Ami Sika Sandra - SCOLARITE (200000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '013-ESC-2024'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      200000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-013-ESC-2024', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [72/92] 180-ESC-2026 - SADJI Yao Wisdom - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '180-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-180-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [73/92] 161-ESC-2026 - TESSI Messan Segninou - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '161-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-161-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [74/92] 182-ESC-2026 - KOUADIO Kouadio Joel - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '182-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-182-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [75/92] 183-ESC-2026 - LOKO Cristilla Flavia - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '183-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-183-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [76/92] 184-ESC-2026 - OUSMAN Ahmat Mahamat - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '184-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-184-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [77/92] 185-ESC-2026 - AKODA Pascal - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '185-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-185-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [78/92] 186-ESC-2026 - TCHABANA Malia - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '186-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-186-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [79/92] 047-ESC-2025 - KPONOU Darius - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '047-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-047-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [80/92] 069-ESC-2025 - POGBO Pali Lidao - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '069-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-069-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [81/92] 060-ESC-2025 - TADEHADJIM Nelson - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '060-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-060-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [82/92] 060-ESC-2025 - TADEHADJIM Nelson - SCOLARITE (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '060-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-060-ESC-2025', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [83/92] 048-ESC-2025 - ATIKLEME Eddie - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '048-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-048-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [84/92] 188-ESC-2026 - CHIDAS Vanessa Grâce Emilienne - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '188-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-188-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [85/92] 050-ESC-2025 - Franck Carmel Togbe - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '050-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-050-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [86/92] 083-ESC-2025 - GNIDOTE Senam Soke Arnaud - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '083-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-083-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [87/92] 189-ESC-2026 - SAMKLU Enyonam - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '189-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-189-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [88/92] 084-ESC-2025 - WALLA Azah Wembou - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '084-ESC-2025'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-084-ESC-2025', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [89/92] 190-ESC-2026 - MARCOS Nafissath - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '190-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-190-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [90/92] 191-ESC-2026 - KIALA MFUAMBI Beni - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '191-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-191-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [91/92] 159-ESC-2026 - ACAKPO Fabienne Peroline - INSCRIPTION (50000 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '159-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      50000, 'ESPECES', 'Caisse ESCEN', 'REC-2026-INS-159-ESC-2026', '2026-09-15'::date,
      v_admin_account_id, 'Frais d''inscription 2026-2027', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

  -- [92/92] 159-ESC-2026 - ACAKPO Fabienne Peroline - SCOLARITE (438200 FCFA)
  v_enrollment_id := null;
  select e.id, s.matricule, p.id, p.lastname || ' ' || p.firstname
  into v_enrollment_id, v_matricule, v_person_id, v_payer_name
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.students s on s.id = e.student_id
  join escen.people p on p.id = s.person_id
  where o.academic_year_id = v_year_id and s.matricule = '159-ESC-2026'
  limit 1;

  if v_enrollment_id is not null then
    insert into escen.payments(
      enrollment_id, payer_person_id, payer_name,
      amount, method, provider, reference, paid_on,
      recorded_by, comment, status, withdrawal_fee
    )
    values (
      v_enrollment_id, v_person_id, v_payer_name,
      438200, 'ESPECES', 'Caisse ESCEN', 'REC-2026-SCO-M3-159-ESC-2026', '2026-10-15'::date,
      v_admin_account_id, 'Scolarité 2026-2027 (Tranche M3)', 'POSTED', 0
    )
    on conflict (provider, reference) do nothing;
  end if;

end $$;

-- Migration : Insertion des 28 étudiants de l'échéancier de recouvrement 2026-2027 et régularisation des contrats
-- Référence source : docs/ECHEANCIER_RECOUVREMENT_2026_2027.csv
-- Conforme à la règle du 28/10/2026 : matricules automatiques séquentiels NNN-ESC-2026

do $$
declare
  v_year_id uuid;
  v_admin_id uuid;
  v_next_num int;
  v_matricule text;
  v_person_id uuid;
  v_student_id uuid;
  v_offering_id uuid;
  v_enrollment_id uuid;
  v_contract_id uuid;
  v_version_id uuid;
  v_fee_inscription_id uuid;
  v_fee_scolarite_id uuid;
begin
  -- Autoriser les modifications administratives sur online_applications
  perform set_config('escen.application_command', '1', true);

  -- 1. Récupérer l'année 2026-2027
  select id into v_year_id from escen.academic_years where code = '2026-2027' limit 1;
  if v_year_id is null then
    select id into v_year_id from escen.academic_years where name = '2026-2027' limit 1;
  end if;

  -- Si l'année 2026-2027 n'existe pas encore (recette locale ou base vierge), ne rien faire
  if v_year_id is null then
    return;
  end if;

  -- 2. Récupérer un administrateur pour l'audit et l'approbation
  select a.id into v_admin_id
  from escen.accounts a
  join escen.people p on p.id = a.person_id
  where p.email = 'g.nobel@escen.university' limit 1;

  if v_admin_id is null then
    select id into v_admin_id from escen.accounts limit 1;
  end if;

  -- 3. Récupérer les types de frais
  select id into v_fee_inscription_id from escen.fee_types where code = 'ANNUAL-INSCRIPTION' limit 1;
  select id into v_fee_scolarite_id from escen.fee_types where code = 'ANNUAL-SCOLARITE' limit 1;

  -- 4. Obtenir le dernier numéro de matricule
  select coalesce(max(nullif(regexp_replace(matricule, '^([0-9]+)-ESC-.*$', '\1'), matricule)::int), 163)
    into v_next_num from escen.students where matricule like '%-ESC-%';

  ----------------------------------------------------------------------
  -- PARTIE A : INSERTION DES 28 ÉTUDIANTS MANQUANTS
  ----------------------------------------------------------------------
  -- [Ligne 2] AKOR Abla Élisée (L1 FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L1 FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L1'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Abla Élisée', 'AKOR', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Annuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 240000, 'Scolarité 2026-2027 (Remise 50%)');
    -- Échéance Tranche 1 (Annuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Annuel)', 240000, '2027-03-15', 0);
  end if;

  -- [Ligne 4] BANNA Achraf (L1 IA-GL)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L1 IA-GL
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L1'
    and p.code = 'IA-GL'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Achraf', 'BANNA', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 425000, 'Scolarité 2026-2027 (Remise 50%)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 106250, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 106250, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 106250, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 106250, '2027-04-15', 0);
  end if;

  -- [Ligne 6] GBADOE Komi Prince Antoine (L1 IA-GL)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L1 IA-GL
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L1'
    and p.code = 'IA-GL'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Komi Prince Antoine', 'GBADOE', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 425000, 'Scolarité 2026-2027 (Remise 50%)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 106250, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 106250, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 106250, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 106250, '2027-04-15', 0);
  end if;

  -- [Ligne 8] AGUIDI Abla Dzifa (L1 MDE)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L1 MDE
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L1'
    and p.code = 'MDE'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Abla Dzifa', 'AGUIDI', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Annuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 275000, 'Scolarité 2026-2027 (Remise 50%)');
    -- Échéance Tranche 1 (Annuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Annuel)', 275000, '2027-03-15', 0);
  end if;

  -- [Ligne 10] BODJONA Koboyo Magnim (L1 MDE)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L1 MDE
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L1'
    and p.code = 'MDE'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Koboyo Magnim', 'BODJONA', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 480000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 120000, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 120000, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 120000, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 120000, '2027-04-15', 0);
  end if;

  -- [Ligne 11] BOURAIMA Rafik (L1 MDE)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L1 MDE
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L1'
    and p.code = 'MDE'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Rafik', 'BOURAIMA', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 480000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 120000, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 120000, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 120000, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 120000, '2027-04-15', 0);
  end if;

  -- [Ligne 12] EGAN Akouvi Alice (L1 MDE)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L1 MDE
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L1'
    and p.code = 'MDE'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Akouvi Alice', 'EGAN', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Annuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 275000, 'Scolarité 2026-2027 (Remise 50%)');
    -- Échéance Tranche 1 (Annuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Annuel)', 275000, '2027-03-15', 0);
  end if;

  -- [Ligne 13] GNELE Evynel Olanique (L1 MDE)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L1 MDE
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L1'
    and p.code = 'MDE'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Evynel Olanique', 'GNELE', 'Olola3260@gmail.com', '+22891861732', 'Féminin', '2000-05-03', 'Béninoise')
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Lier la candidature en ligne si existante
  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = 'LEGACY-2026-2027-197';

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Annuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 408000, 'Scolarité 2026-2027 (Remise 15%)');
    -- Échéance Tranche 1 (Annuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Annuel)', 408000, '2026-10-15', 0);
  end if;

  -- [Ligne 14] AKAKPO Harmony Daniella Modoukpe (L1 MPN)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L1 MPN
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L1'
    and p.code = 'MPN'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Harmony Daniella Modoukpe', 'AKAKPO', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Annuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 408000, 'Scolarité 2026-2027 (Remise 15%)');
    -- Échéance Tranche 1 (Annuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Annuel)', 408000, '2026-10-15', 0);
  end if;

  -- [Ligne 15] AMONY Mensah Léopold Junior (L1 MPN)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L1 MPN
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L1'
    and p.code = 'MPN'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Mensah Léopold Junior', 'AMONY', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 480000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 120000, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 120000, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 120000, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 120000, '2027-04-15', 0);
  end if;

  -- [Ligne 45] AMUZU Koffi Komi Abel (L3 FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L3 FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L3'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Koffi Komi Abel', 'AMUZU', 'abelamuzu@gmail.com', '+22892874894', 'Masculin', '1997-08-07', 'Togolaise')
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Lier la candidature en ligne si existante
  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = 'LEGACY-2026-2027-177';

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 467500, 'Scolarité 2026-2027 (Remise 15%)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 116875, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 116875, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 116875, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 116875, '2027-04-15', 0);
  end if;

  -- [Ligne 47] MAMA Issa (L3 FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L3 FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L3'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Issa', 'MAMA', 'mamaissa594@gmail.com', '+22896517304', 'Masculin', '1992-05-17', 'Togolaise')
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Lier la candidature en ligne si existante
  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = 'LEGACY-2026-2027-178';

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 379500, 'Scolarité 2026-2027 (Remise 31%)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 94875, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 94875, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 94875, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 94875, '2027-04-15', 0);
  end if;

  -- [Ligne 48] OLOHUNTO Amed Oba Sanjo (L3 FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L3 FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L3'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Amed Oba Sanjo', 'OLOHUNTO', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 467500, 'Scolarité 2026-2027 (Remise 15%)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 116875, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 116875, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 116875, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 116875, '2027-04-15', 0);
  end if;

  -- [Ligne 49] SAMANI Djibril (L3 FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L3 FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L3'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Djibril', 'SAMANI', 'djibrilsamani3@gmail.com', '+22893518406', 'Masculin', '1996-05-29', 'Togolaise')
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Lier la candidature en ligne si existante
  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = 'LEGACY-2026-2027-176';

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 379500, 'Scolarité 2026-2027 (Remise 31%)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 94875, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 94875, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 94875, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 94875, '2027-04-15', 0);
  end if;

  -- [Ligne 51] LOKOSSOU Cedric Franzt (L3 IA-GL)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L3 IA-GL
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L3'
    and p.code = 'IA-GL'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Cedric Franzt', 'LOKOSSOU', 'cedriclokossou1397@gmail.com', '+2290153840441', 'Masculin', '2007-09-13', 'Béninoise')
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Lier la candidature en ligne si existante
  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = 'LEGACY-2026-2027-148';

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 137500, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 137500, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 137500, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 137500, '2027-04-15', 0);
  end if;

  -- [Ligne 60] DATEY Dah Mokpokpo (L3 MDE)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L3 MDE
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L3'
    and p.code = 'MDE'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Dah Mokpokpo', 'DATEY', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 137500, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 137500, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 137500, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 137500, '2027-04-15', 0);
  end if;

  -- [Ligne 65] SADJI Yao Wisdom (L3 MDE)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L3 MDE
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L3'
    and p.code = 'MDE'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Yao Wisdom', 'SADJI', 'wisdomsadji@gmail.com', '+22892307889', 'Masculin', '1999-04-29', 'Togolaise')
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Lier la candidature en ligne si existante
  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = 'LEGACY-2026-2027-183';

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 137500, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 137500, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 137500, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 137500, '2027-04-15', 0);
  end if;

  -- [Ligne 66] GOUMBANE Bouamey (L3 MPN)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour L3 MPN
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'L3'
    and p.code = 'MPN'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Bouamey', 'GOUMBANE', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 137500, '2026-10-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 137500, '2026-12-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 137500, '2027-02-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 137500, '2027-04-15', 0);
  end if;

  -- [Ligne 70] KOUADIO Kouadio Joel (M1 FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour M1 FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'M1'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Kouadio Joel', 'KOUADIO', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 237500, '2026-11-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 237500, '2027-01-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 237500, '2027-03-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 237500, '2027-05-15', 0);
  end if;

  -- [Ligne 71] LOKO Cristilla Flavia (M1 FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour M1 FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'M1'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Cristilla Flavia', 'LOKO', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 475000, 'Scolarité 2026-2027 (Remise 50%)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 118750, '2026-11-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 118750, '2027-01-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 118750, '2027-03-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 118750, '2027-05-15', 0);
  end if;

  -- [Ligne 72] OUSMAN Ahmat Mahamat (M1 FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour M1 FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'M1'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Ahmat Mahamat', 'OUSMAN', 'ousmanaht50@gmail.com', '+23590809797', 'Masculin', '2002-01-01', 'Tchadienne')
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Lier la candidature en ligne si existante
  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = 'LEGACY-2026-2027-165';

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 237500, '2026-11-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 237500, '2027-01-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 237500, '2027-03-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 237500, '2027-05-15', 0);
  end if;

  -- [Ligne 74] AKODA Pascal (M1 MP-TD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour M1 MP-TD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'M1'
    and p.code = 'MP-TD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Pascal', 'AKODA', 'pasciakoda@gmail.com', '+22893102660', 'Masculin', '1995-04-15', 'Togolaise')
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Lier la candidature en ligne si existante
  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = 'LEGACY-2026-2027-201';

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 475000, 'Scolarité 2026-2027 (Remise 50%)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 118750, '2026-11-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 118750, '2027-01-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 118750, '2027-03-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 118750, '2027-05-15', 0);
  end if;

  -- [Ligne 75] TCHABANA Malia (M1 MP-TD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour M1 MP-TD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'M1'
    and p.code = 'MP-TD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Malia', 'TCHABANA', 'tchabanamalia@gmail.com', '+22870460208', 'Féminin', '2002-04-29', 'Togolaise')
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Lier la candidature en ligne si existante
  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = 'LEGACY-2026-2027-126';

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 237500, '2026-11-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 237500, '2027-01-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 237500, '2027-03-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 237500, '2027-05-15', 0);
  end if;

  -- [Ligne 76] ANNOUR Mahamat Saleh Kaya (M2 FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour M2 FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'M2'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Mahamat Saleh Kaya', 'ANNOUR', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 237500, '2026-11-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 237500, '2027-01-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 237500, '2027-03-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 237500, '2027-05-15', 0);
  end if;

  -- [Ligne 96] CHIDAS Vanessa Grâce Emilienne (EM FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour EM FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'EM'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Vanessa Grâce Emilienne', 'CHIDAS', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 1650000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 330000, '2027-01-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 330000, '2027-03-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 330000, '2027-05-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 330000, '2027-07-15', 0);
    -- Échéance Tranche 5 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Tranche 5 (Bi-mensuel)', 330000, '2027-09-15', 0);
  end if;

  -- [Ligne 99] SAMKLU Enyonam (EM FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour EM FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'EM'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Enyonam', 'SAMKLU', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    -- Ligne frais inscription
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    -- Ligne frais scolarité
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 1650000, 'Scolarité 2026-2027 (Tarif standard)');
    -- Échéance Tranche 1 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 330000, '2027-01-15', 0);
    -- Échéance Tranche 2 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 330000, '2027-03-15', 0);
    -- Échéance Tranche 3 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 330000, '2027-05-15', 0);
    -- Échéance Tranche 4 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 330000, '2027-07-15', 0);
    -- Échéance Tranche 5 (Bi-mensuel)
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Tranche 5 (Bi-mensuel)', 330000, '2027-09-15', 0);
  end if;

  -- [Ligne 101] MARCOS Nafissath (M1 FD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour M1 FD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'M1'
    and p.code = 'FD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Nafissath', 'MARCOS', 'nafissathmarcos21@gmail.com', '+2290197326629', 'Féminin', '2005-01-21', 'Béninoise')
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Lier la candidature en ligne si existante
  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = 'LEGACY-2026-2027-175';

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Annuel)', v_admin_id, null)
    returning id into v_version_id;

  end if;

  -- [Ligne 102] KIALA MFUAMBI Beni (M1 MP-TD)
  v_next_num := v_next_num + 1;
  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

  -- Récupérer l'offre active pour M1 MP-TD
  select o.id into v_offering_id
  from escen.academic_offerings o
  join escen.levels l on l.id = o.level_id
  join escen.curricula c on c.id = o.curriculum_id
  join escen.programs p on p.id = c.program_id
  where o.academic_year_id = v_year_id
    and l.code = 'M1'
    and p.code = 'MP-TD'
    and o.archived_at is null
  limit 1;

  -- Création personne
  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)
  values ('Beni', 'KIALA MFUAMBI', NULL, NULL, NULL, NULL, NULL)
  returning id into v_person_id;

  -- Création étudiant
  insert into escen.students(person_id, matricule, reason)
  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')
  returning id into v_student_id;

  -- Aligner l'email de la personne sur l'email étudiant officiel généré
  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;

  -- Inscription académique 2026-2027
  if v_offering_id is not null then
    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)
    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)
    returning id into v_enrollment_id;

    -- Contrat financier
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')
    returning id into v_contract_id;

    -- Version du contrat
    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Annuel)', v_admin_id, null)
    returning id into v_version_id;

  end if;

  ----------------------------------------------------------------------
  -- PARTIE B : CRÉATION DES CONTRATS POUR LES 8 ÉTUDIANTS DÉJÀ INSCRITS
  ----------------------------------------------------------------------
  -- [Matricule 158-ESC-2026] AHYEE John Bienvenu Andreano Ayité
  select e.id into v_enrollment_id
  from escen.students st
  join escen.enrollments e on e.student_id = st.id
  join escen.academic_offerings o on o.id = e.offering_id
  where st.matricule = '158-ESC-2026' and o.academic_year_id = v_year_id
  limit 1;

  if v_enrollment_id is not null and not exists (select 1 from escen.financial_contracts where enrollment_id = v_enrollment_id) then
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || split_part('158-ESC-2026', '-', 1), 'XOF')
    returning id into v_contract_id;

    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Trimestriel)', v_admin_id, null)
    returning id into v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Scolarité 2026-2027 (Tarif standard)');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Trimestriel)', 283333, '2026-10-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Trimestriel)', 283333, '2027-01-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Trimestriel)', 283333, '2027-04-15', 0);
  end if;

  -- [Matricule 153-ESC-2026] EKLO Ablavi Natacha
  select e.id into v_enrollment_id
  from escen.students st
  join escen.enrollments e on e.student_id = st.id
  join escen.academic_offerings o on o.id = e.offering_id
  where st.matricule = '153-ESC-2026' and o.academic_year_id = v_year_id
  limit 1;

  if v_enrollment_id is not null and not exists (select 1 from escen.financial_contracts where enrollment_id = v_enrollment_id) then
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || split_part('153-ESC-2026', '-', 1), 'XOF')
    returning id into v_contract_id;

    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 425000, 'Scolarité 2026-2027 (Remise 50%)');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 106250, '2026-10-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 106250, '2026-12-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 106250, '2027-02-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 106250, '2027-04-15', 0);
  end if;

  -- [Matricule 163-ESC-2026] TELOU Abidé
  select e.id into v_enrollment_id
  from escen.students st
  join escen.enrollments e on e.student_id = st.id
  join escen.academic_offerings o on o.id = e.offering_id
  where st.matricule = '163-ESC-2026' and o.academic_year_id = v_year_id
  limit 1;

  if v_enrollment_id is not null and not exists (select 1 from escen.financial_contracts where enrollment_id = v_enrollment_id) then
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || split_part('163-ESC-2026', '-', 1), 'XOF')
    returning id into v_contract_id;

    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Scolarité 2026-2027 (Tarif standard)');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 212500, '2026-10-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 212500, '2026-12-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 212500, '2027-02-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 212500, '2027-04-15', 0);
  end if;

  -- [Matricule 160-ESC-2026] AHOSSI Mawunyon Verra
  select e.id into v_enrollment_id
  from escen.students st
  join escen.enrollments e on e.student_id = st.id
  join escen.academic_offerings o on o.id = e.offering_id
  where st.matricule = '160-ESC-2026' and o.academic_year_id = v_year_id
  limit 1;

  if v_enrollment_id is not null and not exists (select 1 from escen.financial_contracts where enrollment_id = v_enrollment_id) then
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || split_part('160-ESC-2026', '-', 1), 'XOF')
    returning id into v_contract_id;

    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 240000, 'Scolarité 2026-2027 (Remise 50%)');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 60000, '2026-10-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 60000, '2026-12-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 60000, '2027-02-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 60000, '2027-04-15', 0);
  end if;

  -- [Matricule 152-ESC-2026] BOLOUVI Emmanuel Yanis Alvin
  select e.id into v_enrollment_id
  from escen.students st
  join escen.enrollments e on e.student_id = st.id
  join escen.academic_offerings o on o.id = e.offering_id
  where st.matricule = '152-ESC-2026' and o.academic_year_id = v_year_id
  limit 1;

  if v_enrollment_id is not null and not exists (select 1 from escen.financial_contracts where enrollment_id = v_enrollment_id) then
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || split_part('152-ESC-2026', '-', 1), 'XOF')
    returning id into v_contract_id;

    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 480000, 'Scolarité 2026-2027 (Tarif standard)');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 120000, '2026-10-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 120000, '2026-12-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 120000, '2027-02-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 120000, '2027-04-15', 0);
  end if;

  -- [Matricule 162-ESC-2026] FOLLY-NOTSRON Agbenou Ayélé Darina
  select e.id into v_enrollment_id
  from escen.students st
  join escen.enrollments e on e.student_id = st.id
  join escen.academic_offerings o on o.id = e.offering_id
  where st.matricule = '162-ESC-2026' and o.academic_year_id = v_year_id
  limit 1;

  if v_enrollment_id is not null and not exists (select 1 from escen.financial_contracts where enrollment_id = v_enrollment_id) then
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || split_part('162-ESC-2026', '-', 1), 'XOF')
    returning id into v_contract_id;

    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Scolarité 2026-2027 (Tarif standard)');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 137500, '2026-10-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 137500, '2026-12-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 137500, '2027-02-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 137500, '2027-04-15', 0);
  end if;

  -- [Matricule 161-ESC-2026] TESSI Messan Segninou
  select e.id into v_enrollment_id
  from escen.students st
  join escen.enrollments e on e.student_id = st.id
  join escen.academic_offerings o on o.id = e.offering_id
  where st.matricule = '161-ESC-2026' and o.academic_year_id = v_year_id
  limit 1;

  if v_enrollment_id is not null and not exists (select 1 from escen.financial_contracts where enrollment_id = v_enrollment_id) then
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || split_part('161-ESC-2026', '-', 1), 'XOF')
    returning id into v_contract_id;

    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Bi-mensuel)', v_admin_id, null)
    returning id into v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Scolarité 2026-2027 (Tarif standard)');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Tranche 1 (Bi-mensuel)', 137500, '2026-10-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Tranche 2 (Bi-mensuel)', 137500, '2026-12-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Tranche 3 (Bi-mensuel)', 137500, '2027-02-15', 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Tranche 4 (Bi-mensuel)', 137500, '2027-04-15', 0);
  end if;

  -- [Matricule 159-ESC-2026] ACAKPO Fabienne Peroline
  select e.id into v_enrollment_id
  from escen.students st
  join escen.enrollments e on e.student_id = st.id
  join escen.academic_offerings o on o.id = e.offering_id
  where st.matricule = '159-ESC-2026' and o.academic_year_id = v_year_id
  limit 1;

  if v_enrollment_id is not null and not exists (select 1 from escen.financial_contracts where enrollment_id = v_enrollment_id) then
    insert into escen.financial_contracts(enrollment_id, reference, currency)
    values (v_enrollment_id, 'CON-2026-' || split_part('159-ESC-2026', '-', 1), 'XOF')
    returning id into v_contract_id;

    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)
    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (Annuel)', v_admin_id, null)
    returning id into v_version_id;

  end if;

end $$;

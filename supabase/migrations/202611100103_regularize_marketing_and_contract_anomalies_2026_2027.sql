-- Migration : Régularisation des contrats financiers et échéanciers 2026-2027
-- Ajuste les montants de scolarité erronés (ex. tarif IA au lieu de Marketing Digital L2, bourses non déduites)
-- Assure la parité stricte : sum(contract_lines) == sum(installments)

begin;

alter table escen.installments disable trigger no_delete;
alter table escen.contract_discounts disable trigger no_delete;
alter table escen.contract_lines disable trigger no_delete;
alter table escen.installments disable trigger installment_guard;
alter table escen.contract_lines disable trigger contract_line_guard;
alter table escen.contract_versions disable trigger contract_version_guard;

do $$
declare
  v_fee_inscription_id uuid;
  v_fee_scolarite_id uuid;
  v_contract_id uuid;
  v_version_id uuid;
begin
  select id into v_fee_inscription_id from escen.fee_types where code = 'ANNUAL-INSCRIPTION' limit 1;
  select id into v_fee_scolarite_id from escen.fee_types where code in ('ANNUAL-SCOLARITE', 'SCOLARITE-2025') or category = 'SCOLARITE' order by code limit 1;
  if v_fee_inscription_id is null or v_fee_scolarite_id is null then
    return;
  end if;

  -- [025-ESC-2025] ADZODI Prudence (Marketing Digital & E-commerce · Licence 2) : Scolarité = 275000 FCFA
  v_contract_id := 'd9b4da2d-8557-4642-90f9-79f53ebe7b79';
  v_version_id := 'c4012308-56c0-4bfd-b5c5-f37e501e5418';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 275000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 68750, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 68750, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 68750, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 68750, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [032-ESC-2025] AGBA Yao Gédéon (Marketing Digital & E-commerce · Licence 2) : Scolarité = 275000 FCFA
  v_contract_id := '89a25b09-46c5-4a5d-aad0-363e41b34151';
  v_version_id := 'b5ea2639-efba-4ebc-a8e2-ec964fa677bc';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 275000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 68750, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 68750, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 68750, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 68750, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [010-ESC-2025] DAYI Adjo (Marketing Digital & E-commerce · Licence 2) : Scolarité = 275000 FCFA
  v_contract_id := 'cdeba822-bcc5-4058-9944-d941f6daedf1';
  v_version_id := '21fd2be9-06ad-4d23-9485-45b1358cf2ef';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 275000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 68750, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 68750, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 68750, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 68750, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [007-ESC-2025] GBLAGUIDI Akouavi (Marketing Digital & E-commerce · Licence 2) : Scolarité = 275000 FCFA
  v_contract_id := '69fdb68d-7b6a-4127-8009-5ffda57f8f18';
  v_version_id := '123e9778-9d87-4d37-b8c9-9382f412d07d';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 275000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 68750, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 68750, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 68750, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 68750, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [008-ESC-2025] SOMA Abdou Latifou (Marketing Digital & E-commerce · Licence 2) : Scolarité = 275000 FCFA
  v_contract_id := 'dea089e6-a6b2-43be-9470-1ea5ec44894e';
  v_version_id := 'f2751afd-d580-4ebd-880c-11c12ec51a5e';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 275000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 68750, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 68750, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 68750, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 68750, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [030-ESC-2025] AZIATOUWO Koffi Amen (Management de Projets Numériques · Licence 2) : Scolarité = 275000 FCFA
  v_contract_id := '91c34a74-bd3d-4a17-b62f-861328f12792';
  v_version_id := 'c1bd5740-16cb-444c-b464-97c189b1f748';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 275000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 68750, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 68750, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 68750, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 68750, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [033-ESC-2025] ATCHOU Valérie (Finance Digitale · Licence 2) : Scolarité = 275000 FCFA
  v_contract_id := '16454ace-375c-45c3-8606-3a0e77e1dbda';
  v_version_id := '91a1134c-6428-4535-8089-18f19adabe3d';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 275000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 68750, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 68750, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 68750, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 68750, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [146-ESC-2026] ADJEI Honoré Koffi (Marketing Digital & E-commerce · Licence 2) : Scolarité = 275000 FCFA
  v_contract_id := '5628652d-dac5-4641-85c4-031d567ec674';
  v_version_id := '5ec993c4-472a-4114-88ef-bae1ef0c726f';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 275000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 68750, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 68750, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 68750, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 68750, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [062-ESC-2025] MAKAYA NDJIMBI Georges Daniel Anakin (Management de Projets Numériques · Licence 2) : Scolarité = 550000 FCFA
  v_contract_id := '2c0570b3-25e3-4e6a-ba06-25ba6141d8c0';
  v_version_id := 'f3d1837e-ef5c-4960-aeb3-909a080fb4df';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [163-ESC-2026] TELOU Abide (Management de Projets Numériques · Licence 1) : Scolarité = 480000 FCFA
  v_contract_id := 'f19cbbe6-39d6-47a4-899e-ba9e7cf10161';
  v_version_id := '4913dde4-5965-47ad-9a8a-de1e602b5b13';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 480000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 120000, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 120000, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 120000, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 120000, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [167-ESC-2026] AGUIDI Abla Dzifa (Marketing Digital & E-commerce · Licence 1) : Scolarité = 240000 FCFA
  v_contract_id := 'dbf4a910-1237-4449-b1f5-200a4a4056c1';
  v_version_id := '7a7e4af5-20ba-4e18-8717-6474cc9115aa';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 240000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 240000, '2027-05-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [170-ESC-2026] EGAN Akouvi Alice (Marketing Digital & E-commerce · Licence 1) : Scolarité = 240000 FCFA
  v_contract_id := 'c9d0d991-195d-416a-bda2-1f42b8d43300';
  v_version_id := '227bde73-b5c2-43bc-972c-c41fa3cdf0a8';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 240000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 240000, '2027-05-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [048-ESC-2025] ATIKLEME Eddie (Marketing Digital & E-commerce · Master 2) : Scolarité = 760000 FCFA
  v_contract_id := '95ae9b80-d7c7-45b0-a794-7fd4acbd4b64';
  v_version_id := 'd955d05f-06b5-48ad-a6c0-2fb0a80da1b4';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 760000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 190000, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 190000, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 190000, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 190000, '2027-03-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;

  -- [189-ESC-2026] SAMKLU Enyonam (Management de Projets  & Transformation Digitale · Master 2) : Scolarité = 950000 FCFA
  v_contract_id := '753e8aca-79bb-420e-b8fa-5c9a19fa1f85';
  v_version_id := '6f396598-926e-41f1-be17-e286e6b101a8';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M6)', 190000, '2027-03-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M8)', 190000, '2027-05-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M10)', 190000, '2027-07-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M12)', 190000, '2027-09-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 6, 'Scolarité 2026-2027 (Tranche M14)', 190000, '2027-11-15'::date, 0);
    update escen.contract_versions
    set reason = 'Régularisation du contrat financier et échéancier conforme aux tarifs officiels 2026-2027'
    where id = v_version_id;
  end if;
end $$;

alter table escen.contract_versions enable trigger contract_version_guard;
alter table escen.contract_lines enable trigger contract_line_guard;
alter table escen.installments enable trigger installment_guard;
alter table escen.contract_lines enable trigger no_delete;
alter table escen.contract_discounts enable trigger no_delete;
alter table escen.installments enable trigger no_delete;

commit;

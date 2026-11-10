-- Migration : Régularisation des contrats financiers Executive Master, Licence 3 et Master 1 pour 2026-2027
-- 1. ACAKPO Fabienne (159-ESC-2026) : Rétablissement de la scolarité Executive Master (1 650 000 FCFA au lieu de 438 200 FCFA).
--    Ses paiements réels de 488 200 FCFA sont conservés (50k inscription + 438 200 acompte scolarité). Le reste à payer est de 1 211 800 FCFA.
-- 2. Étudiants de Licence 3 sans bourse : Rétablissement du tarif L3 (650 000 FCFA de scolarité au lieu de 550 000 FCFA de L2).
-- 3. Étudiants de Licence 3 avec bourse 50% : Rétablissement du tarif L3 boursier (325 000 FCFA de scolarité au lieu de 275 000 FCFA de L2).
-- 4. Étudiants de Master 1 sans bourse : Rétablissement du tarif M1 (950 000 FCFA de scolarité au lieu de 850 000 FCFA).

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

  -- =========================================================================
  -- 1. [159-ESC-2026] ACAKPO Fabienne Péroline (Executive Master · Finance Digitale)
  -- Total contrat : 1 700 000 FCFA (50 000 inscription + 1 650 000 scolarité)
  -- Encaissé : 50 000 (inscription) + 438 200 (acompte scolarité) = 488 200 FCFA
  -- Reste à payer : 1 211 800 FCFA en 3 échéances de 403 933 / 403 933 / 403 934 FCFA
  -- =========================================================================
  v_contract_id := 'd4d40c29-47d3-46f2-9e1e-a88c66cefaf6';
  v_version_id := '9e93fb78-f368-43f9-9a69-70ecf12558ef';

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_discounts where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;

    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
    values (v_contract_id, v_version_id, v_fee_scolarite_id, 1650000, 'Frais de scolarité 2026-2027');

    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 2, 'Scolarité 2026-2027 (Acompte encaissé)', 438200, '2026-10-15'::date, 438200);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 403933, '2027-03-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 403933, '2027-05-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
    values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 403934, '2027-07-15'::date, 0);

    update escen.contract_versions
    set reason = 'Régularisation du contrat financier Executive Master (1 650 000 FCFA de scolarité)'
    where id = v_version_id;
  end if;

  -- =========================================================================
  -- 2. Étudiants Licence 3 sans bourse : Scolarité = 650 000 FCFA (4 tranches de 162 500)
  -- Total = 700 000 FCFA (avec inscription 50 000 FCFA)
  -- =========================================================================

  -- [003-ESC-2024] GUIHINI Fatimé
  v_contract_id := 'cba01145-a114-468f-9b20-b68926e18956';
  v_version_id := 'a0273829-b997-4765-81fd-6953a7c2ba4f';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 650000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 162500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 162500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 162500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 162500, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 (650 000 FCFA)' where id = v_version_id;
  end if;

  -- [006-ESC-2024] GABA Ayélé Daniella Gracia
  v_contract_id := 'f92f2452-f472-46a4-b040-3498be5bf590';
  v_version_id := '99120610-d01c-43f9-ba2a-eb49d79ca0bf';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 650000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 162500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 162500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 162500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 162500, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 (650 000 FCFA)' where id = v_version_id;
  end if;

  -- [013-ESC-2024] LOGOSSOU Ami
  v_contract_id := 'c6168e61-6bfb-46cb-8d1e-84882dfc280f';
  v_version_id := '023b0dbe-86eb-4608-89c0-6d09386c757c';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 650000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 162500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 162500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 162500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 162500, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 (650 000 FCFA)' where id = v_version_id;
  end if;

  -- [161-ESC-2026] TESSI MESSAN SEGNINOU
  v_contract_id := 'f93c5c99-0bfe-4c6e-a3b0-dd9c1f618a8d';
  v_version_id := 'f3ef6c51-518d-4cb0-a590-79883db0c5a2';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 650000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 162500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 162500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 162500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 162500, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 (650 000 FCFA)' where id = v_version_id;
  end if;

  -- [162-ESC-2026] FOLLY-NOTSRON Agbenou Ayélé Darina Alfreda
  v_contract_id := 'fa1bfa70-65e9-4e76-87cf-6556e355f302';
  v_version_id := '0df0f81e-ddbe-478a-a4ea-017088b907be';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 650000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 162500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 162500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 162500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 162500, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 (650 000 FCFA)' where id = v_version_id;
  end if;

  -- [179-ESC-2026] DATEY Dah Mokpokpo
  v_contract_id := 'c6c39f19-b2dc-4861-b40b-78a0584ae000';
  v_version_id := '178f7e2a-e24c-42b7-a352-7b247f12e84c';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 650000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 162500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 162500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 162500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 162500, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 (650 000 FCFA)' where id = v_version_id;
  end if;

  -- [180-ESC-2026] SADJI Yao Wisdom
  v_contract_id := '7f999912-9271-4a47-a99f-7ae7227ea1e3';
  v_version_id := 'cba31bb9-b7b5-416b-ad53-c90a1f0a51be';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 650000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 162500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 162500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 162500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 162500, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 (650 000 FCFA)' where id = v_version_id;
  end if;

  -- [181-ESC-2026] GOUMBANE Bouamey
  v_contract_id := '5a818c94-cb23-4554-b52b-7cbf92f7dc2c';
  v_version_id := 'f0b4d455-8ec0-424a-a28a-76dcfb4ce961';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 650000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 162500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 162500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 162500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 162500, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 (650 000 FCFA)' where id = v_version_id;
  end if;

  -- =========================================================================
  -- 3. Étudiants Licence 3 avec bourse 50% : Scolarité = 325 000 FCFA (4 tranches de 81 250)
  -- Total = 375 000 FCFA (avec inscription 50 000 FCFA)
  -- =========================================================================

  -- [002-ESC-2024] MESSAN Dédé Egnonam Aubine (Compassion 50%)
  v_contract_id := '9c20c45f-4e03-4883-b9c8-4f7f074ec3f4';
  v_version_id := 'de49ef5f-5c86-46a4-8ff1-44fc9ecc76b3';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 325000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 81250, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 81250, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 81250, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 81250, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 Bourse 50% (325 000 FCFA)' where id = v_version_id;
  end if;

  -- [004-ESC-2024] ADJIGNON Komi Del Pierro (Nehemiah 50%)
  v_contract_id := 'b750062a-b37f-4389-8676-f9224e4f7816';
  v_version_id := '3e70b9fc-fc85-4ddc-9185-428e1ea7a554';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 325000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 81250, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 81250, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 81250, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 81250, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 Bourse 50% (325 000 FCFA)' where id = v_version_id;
  end if;

  -- [009-ESC-2024] KESSOUGBO Amavi (Nehemiah 50%)
  v_contract_id := 'c61eb4c6-ba8b-4c4c-8594-5506041ec627';
  v_version_id := '3f923e2a-14d2-4467-93be-ef7c995cf53f';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 325000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 81250, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 81250, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 81250, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 81250, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 Bourse 50% (325 000 FCFA)' where id = v_version_id;
  end if;

  -- [011-ESC-2024] TONOU Kossiwa Léontine (Nehemiah 50%)
  v_contract_id := 'c59ee7cf-be58-45ec-8efb-1a9be6935cba';
  v_version_id := '157e9371-3c97-4c45-9372-e676112ff7f7';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 325000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 81250, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 81250, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 81250, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 81250, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Licence 3 Bourse 50% (325 000 FCFA)' where id = v_version_id;
  end if;

  -- =========================================================================
  -- 4. Étudiants Master 1 sans bourse : Scolarité = 950 000 FCFA (4 tranches de 237 500)
  -- Total = 1 000 000 FCFA (avec inscription 50 000 FCFA)
  -- =========================================================================

  -- [190-ESC-2026] MARCOS Nafissath
  v_contract_id := '9ba06142-bcc7-42f4-a0eb-d89805be4069';
  v_version_id := 'a4bbdbf3-2a1f-4251-96cb-82ed20ce8418';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 237500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 237500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 237500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 237500, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Master 1 (950 000 FCFA)' where id = v_version_id;
  end if;

  -- [191-ESC-2026] KIALA MFUAMBI Beni
  v_contract_id := '6360e1f4-6ed4-4522-80bf-36fea4975bb3';
  v_version_id := 'e7215208-52e1-47c5-86cb-2c57b668c66c';
  if exists (select 1 from escen.contract_versions where id = v_version_id) then
    delete from escen.installments where version_id = v_version_id;
    delete from escen.contract_lines where version_id = v_version_id;
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description) values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 237500, '2026-12-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 237500, '2027-02-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 237500, '2027-04-15'::date, 0);
    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount) values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 237500, '2027-03-15'::date, 0);
    update escen.contract_versions set reason = 'Régularisation tarif Master 1 (950 000 FCFA)' where id = v_version_id;
  end if;

end $$;

alter table escen.contract_versions enable trigger contract_version_guard;
alter table escen.contract_lines enable trigger contract_line_guard;
alter table escen.installments enable trigger installment_guard;
alter table escen.contract_lines enable trigger no_delete;
alter table escen.contract_discounts enable trigger no_delete;
alter table escen.installments enable trigger no_delete;

commit;


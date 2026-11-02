-- Migration datée : Régularisation des échéanciers et approbation des contrats financiers 2026-2027
-- Couvre 101 contrats d'études 2026-2027 avec parité exacte : sum(lignes) == sum(échéances)
-- Permet à la "Situation financière globale" d'auditer 100% des dossiers et de refléter les montants réels

alter table escen.installments disable trigger no_delete;
alter table escen.contract_discounts disable trigger no_delete;
alter table escen.contract_lines disable trigger no_delete;

do $$
declare
  v_year_id uuid;
  v_admin_account_id uuid;
  v_fee_inscription_id uuid;
  v_fee_scolarite_id uuid;
  v_contract_id uuid;
  v_version_id uuid;
begin
  -- 1. Année 2026-2027
  select id into v_year_id from escen.academic_years where code = '2026-2027';
  if v_year_id is null then
    return;
  end if;

  -- 2. Compte administrateur validateur (RAF / IT)
  select a.id into v_admin_account_id
  from escen.accounts a
  join escen.role_grants g on g.account_id = a.id
  join escen.roles r on r.id = g.role_id
  where r.code in ('RAF', 'IT') and a.active = true
  order by case when r.code = 'RAF' then 1 else 2 end
  limit 1;

  -- 3. Natures de frais
  select id into v_fee_inscription_id from escen.fee_types where code = 'ANNUAL-INSCRIPTION';
  select id into v_fee_scolarite_id from escen.fee_types where code in ('ANNUAL-SCOLARITE', 'SCOLARITE-2025') order by code limit 1;

  -- [164-ESC-2026] AKOR Abla Élisée - Net: 290000 FCFA
  v_contract_id := 'b37fb687-bd54-452b-8844-e9e880ca7568';
  v_version_id := '9e5e570d-5c44-44cc-93c5-5836de4a98b5';

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
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [158-ESC-2026] AHYEE John Bienvenu Andreano Ayité - Net: 900000 FCFA
  v_contract_id := '48fcc9cb-2034-4ce7-9c88-6af1dda03b98';
  v_version_id := '14182a57-70b2-47d6-b407-77a6c1492b2b';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 283333, '2026-12-15'::date, 290000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 283333, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M9)', 283334, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [165-ESC-2026] BANNA Achraf - Net: 475000 FCFA
  v_contract_id := 'ac282f25-dc2c-43c4-8057-9e2d03f97bc7';
  v_version_id := '90b82208-9d17-4085-ba9f-50f8b522f901';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 425000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 106250, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 106250, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 106250, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 106250, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [153-ESC-2026] EKLO Ablavi Natacha - Net: 475000 FCFA
  v_contract_id := '902929f5-bec7-4c6f-a56a-e534538be645';
  v_version_id := '72643c9c-98f1-437c-8619-b6756b7b47a7';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 425000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 106250, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 106250, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 106250, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 106250, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [166-ESC-2026] GBADOE Komi Prince Antoine - Net: 475000 FCFA
  v_contract_id := '6fe40cdf-fa07-477e-b048-78793403b0c7';
  v_version_id := '78b4958c-98fa-4df1-b421-fa8c184804e5';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 425000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 106250, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 106250, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 106250, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 106250, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [163-ESC-2026] TELOU Abidé - Net: 900000 FCFA
  v_contract_id := 'f19cbbe6-39d6-47a4-899e-ba9e7cf10161';
  v_version_id := '4913dde4-5965-47ad-9a8a-de1e602b5b13';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 212500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 212500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 212500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 212500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [167-ESC-2026] AGUIDI Abla Dzifa - Net: 325000 FCFA
  v_contract_id := 'dbf4a910-1237-4449-b1f5-200a4a4056c1';
  v_version_id := '7a7e4af5-20ba-4e18-8717-6474cc9115aa';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 275000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [160-ESC-2026] AHOSSI Mawunyon Verra - Net: 290000 FCFA
  v_contract_id := '6bfae674-a2d3-4829-befb-7baffc8e324a';
  v_version_id := '52e78d19-935d-4c2b-b209-082397776952';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 60000, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 60000, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 60000, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 60000, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [168-ESC-2026] BODJONA Koboyo Magnim - Net: 530000 FCFA
  v_contract_id := '7125a279-b08b-4b2a-84e7-6fcaacf6b93b';
  v_version_id := '3a205d13-7dd5-4cd9-a7f0-7f757507bd17';

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
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [169-ESC-2026] BOURAIMA Rafik - Net: 530000 FCFA
  v_contract_id := '0e5bd0d9-fda7-40dc-b9e8-ab62549b4f43';
  v_version_id := '35c7fd10-2e1f-4d1b-86b5-e951860f5fff';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 480000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 120000, '2026-12-15'::date, 408000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 120000, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 120000, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 120000, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [170-ESC-2026] EGAN Akouvi Alice - Net: 325000 FCFA
  v_contract_id := 'c9d0d991-195d-416a-bda2-1f42b8d43300';
  v_version_id := '227bde73-b5c2-43bc-972c-c41fa3cdf0a8';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 275000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [171-ESC-2026] GNELE Evynel Olanique - Net: 458000 FCFA
  v_contract_id := '31af30cb-1b46-4bec-b8c8-4741aa2422b6';
  v_version_id := '10e53263-3336-47ec-af46-acb45a1c1d9d';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 408000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Paiement comptant / annuel)', 408000, '2026-10-15'::date, 408000);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [172-ESC-2026] AKAKPO Harmony Daniella Modoukpe - Net: 458000 FCFA
  v_contract_id := 'fdad0ed1-5d48-4c28-a2a2-aad06109ad6a';
  v_version_id := 'a7897242-32f5-4761-a3b8-88e027da691e';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 408000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 408000, '2026-12-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [173-ESC-2026] AMONY Mensah Léopold Junior - Net: 530000 FCFA
  v_contract_id := '2a5a73dc-4941-47de-85ee-c84c98cb4384';
  v_version_id := 'c13f0e5b-7c8e-44d1-aa9a-60422d5bd00e';

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
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [152-ESC-2026] BOLOUVI Emmanuel Yanis Alvin - Net: 530000 FCFA
  v_contract_id := 'eb4a8b4d-33b2-4224-831a-d26c3a5dbf93';
  v_version_id := '99ce326b-9ffb-41e3-a0b1-d2e71c1723e8';

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
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [033-ESC-2025] ATCHOU Valérie - Net: 600000 FCFA
  v_contract_id := '16454ace-375c-45c3-8606-3a0e77e1dbda';
  v_version_id := '91a1134c-6428-4535-8089-18f19adabe3d';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [013-ESC-2025] GABA Kossi Benoît - Net: 600000 FCFA
  v_contract_id := 'bd36910a-eff4-4286-a5bd-959953e6534d';
  v_version_id := 'e144724c-a5d1-481a-b7af-e337a7839dd3';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [011-ESC-2025] MIJIYAWA TAOUFICK - Net: 600000 FCFA
  v_contract_id := 'ed8e767c-267d-4d68-b9c8-adfa87eb4ff6';
  v_version_id := 'ae8ea686-dbfe-49d7-afbd-103d8859bc13';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [022-ESC-2025] APATIO Beni de Dieu - Net: 325000 FCFA
  v_contract_id := 'fb528f0c-2cab-4019-b57b-f3838837f8cb';
  v_version_id := 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 68750, '2026-12-15'::date, 244000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 68750, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 68750, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 68750, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [020-ESC-2025] CADIRY Ramadan - Net: 600000 FCFA
  v_contract_id := '77e9c1d0-0400-463c-a745-37e03b7f0f2e';
  v_version_id := '3e60e68b-2755-444b-81eb-337d3aded29a';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [018-ESC-2025] d''ALMEIDA Ayélé Marianne - Net: 600000 FCFA
  v_contract_id := 'a0229984-241f-491f-997e-00a3f1e3f3b6';
  v_version_id := '692be8a8-0935-413f-9427-3346669b136c';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 828750);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [061-ESC-2025] HEGNON Komi Thierry - Net: 600000 FCFA
  v_contract_id := 'e3dfcd03-96a0-478e-9110-fc06cfce48eb';
  v_version_id := 'a2215e01-b6e6-4e04-a522-08f7c8c08200';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 134000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [002-ESC-2025] KPOBIE Manawe - Net: 537500 FCFA
  v_contract_id := '142528a1-c0f0-46aa-815d-2abdbf602058';
  v_version_id := 'a5184cd4-3029-4bad-a514-3ccf83f07353';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 487500, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 487500, '2026-12-15'::date, 450000);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [039-ESC-2025] SAKPA Komi Alexandre - Net: 600000 FCFA
  v_contract_id := '96f92078-a3cc-4a1e-9f2e-aaff5374a7a6';
  v_version_id := 'f020a0f9-a539-49ed-89b3-cf58ce715375';

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
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [003-ESC-2025] TETE TCHEYI Apéfa Eyram Rebecca - Net: 600000 FCFA
  v_contract_id := 'a416a2b1-7956-419d-9b17-36f3e08b2575';
  v_version_id := 'bf381f5f-f716-4c3d-b32e-862ed69ffd03';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [035-ESC-2025] ADEPOHA Komlan Victor - Net: 325000 FCFA
  v_contract_id := 'dcc15f85-b932-4a89-a22c-cc781d1d2afa';
  v_version_id := 'b07c70b1-3861-4244-96d1-d0a205f27dbd';

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
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [146-ESC-2026] ADJEI Honoré Koffi - Net: 600000 FCFA
  v_contract_id := '5628652d-dac5-4641-85c4-031d567ec674';
  v_version_id := '5ec993c4-472a-4114-88ef-bae1ef0c726f';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [025-ESC-2025] ADZODI Prudence - Net: 1025000 FCFA
  v_contract_id := 'd9b4da2d-8557-4642-90f9-79f53ebe7b79';
  v_version_id := 'c4012308-56c0-4bfd-b5c5-f37e501e5418';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 975000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 243750, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 243750, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 243750, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 243750, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [032-ESC-2025] AGBA Yawo Gedeon - Net: 1025000 FCFA
  v_contract_id := '89a25b09-46c5-4a5d-aad0-363e41b34151';
  v_version_id := 'b5ea2639-efba-4ebc-a8e2-ec964fa677bc';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 975000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 243750, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 243750, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 243750, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 243750, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [034-ESC-2025] AGBEHADJI Koami Samuel - Net: 325000 FCFA
  v_contract_id := '19efae49-f696-4da9-b482-f72ea6cf1147';
  v_version_id := 'b869b6c0-e05f-4ea6-b293-f949650035c0';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 275000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [040-ESC-2025] BATADJA fékand''N Shalom - Net: 325000 FCFA
  v_contract_id := 'e3bc974a-8119-44d7-bf6a-731b48fca3dc';
  v_version_id := '22f946f1-6dec-4679-bb88-0de7589eb1c9';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 68750, '2026-12-15'::date, 100000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 68750, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 68750, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 68750, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [010-ESC-2025] DAYI Adjo - Net: 1025000 FCFA
  v_contract_id := 'cdeba822-bcc5-4058-9944-d941f6daedf1';
  v_version_id := '21fd2be9-06ad-4d23-9485-45b1358cf2ef';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 975000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 243750, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 243750, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 243750, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 243750, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [019-ESC-2025] DJATO Bougonnou Josué - Net: 600000 FCFA
  v_contract_id := 'c2fbb491-8204-41eb-ab67-30ad8a8d87c4';
  v_version_id := 'd5b6806b-3933-44e7-bdfb-b91103def9f4';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [007-ESC-2025] GBLAGUIDI Akouavi - Net: 600000 FCFA
  v_contract_id := '69fdb68d-7b6a-4127-8009-5ffda57f8f18';
  v_version_id := '123e9778-9d87-4d37-b8c9-9382f412d07d';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [006-ESC-2025] PILIZIWE Essoklina - Net: 600000 FCFA
  v_contract_id := 'f22492fc-364c-49a4-93fb-cfe90f56923c';
  v_version_id := '32087164-735d-4b8f-8b6a-650eadc51a14';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 185000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [008-ESC-2025] SOMA Abdou Latifou - Net: 537500 FCFA
  v_contract_id := 'dea089e6-a6b2-43be-9470-1ea5ec44894e';
  v_version_id := 'f2751afd-d580-4ebd-880c-11c12ec51a5e';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 487500, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 121875, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 121875, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 121875, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 121875, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [145-ESC-2026] SOULE Feichal - Net: 600000 FCFA
  v_contract_id := '5cdd3502-48da-46ba-8817-ea5cece94c0e';
  v_version_id := '2f15d254-8579-4680-8c91-1091d8c8750a';

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
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [012-ESC-2025] TAHIROU Moussa - Net: 325000 FCFA
  v_contract_id := '06433f7e-a87a-4b1e-ade3-01b2f2455b13';
  v_version_id := 'af146945-040c-4a22-9f7b-9cc7e3ba3f86';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 275000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [030-ESC-2025] AZIATOUWO Koffi Amen - Net: 600000 FCFA
  v_contract_id := '91c34a74-bd3d-4a17-b62f-861328f12792';
  v_version_id := 'c1bd5740-16cb-444c-b464-97c189b1f748';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [042-ESC-2025] KOUDAKPO Komi Rodrigue - Net: 600000 FCFA
  v_contract_id := '9d00c4a1-bf4d-4017-aa0c-f67190e45db3';
  v_version_id := '1649fd41-9f43-4b33-a8f6-0a6bb3fd5bfd';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [015-ESC-2025] KOUESSAN Akossiwa robertine - Net: 325000 FCFA
  v_contract_id := 'e03dfff6-8127-406d-898e-f94e2c369e56';
  v_version_id := 'b5762da4-5d09-4fea-943a-c8772a5f8271';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 275000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [062-ESC-2025] MAKAYA NDJIMBI Georges Daniel Anakin - Net: 1025000 FCFA
  v_contract_id := '2c0570b3-25e3-4e6a-ba06-25ba6141d8c0';
  v_version_id := 'f3d1837e-ef5c-4960-aeb3-909a080fb4df';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 975000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 243750, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 243750, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 243750, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 243750, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [004-ESC-2024] ADJIGNON Komi Del Pierro - Net: 325000 FCFA
  v_contract_id := 'b750062a-b37f-4389-8676-f9224e4f7816';
  v_version_id := '3e70b9fc-fc85-4ddc-9185-428e1ea7a554';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 275000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [174-ESC-2026] AMUZU Koffi Komi Abel - Net: 517500 FCFA
  v_contract_id := '35d0cc8b-5eb5-4cc0-b51e-9e0bf3e38092';
  v_version_id := '9c8143da-4b96-4c68-9ca6-15d2261fe900';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 467500, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 116875, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 116875, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 116875, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 116875, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [009-ESC-2024] KESSOUGBO Amavi - Net: 325000 FCFA
  v_contract_id := '648f368f-67c4-42bd-b1a7-d3df56de4be8';
  v_version_id := '21d23309-2d6b-49fe-9190-fef19017b218';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 275000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [175-ESC-2026] MAMA Issa - Net: 429500 FCFA
  v_contract_id := '29b24ed2-ed08-45dd-acf1-f679744debbd';
  v_version_id := 'c3d9f057-c8a0-4752-8368-655bbb972730';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 379500, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 94875, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 94875, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 94875, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 94875, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [176-ESC-2026] OLOHUNTO Amed Oba Sanjo - Net: 517500 FCFA
  v_contract_id := '0007fc38-9592-450a-95bc-84826f23bac7';
  v_version_id := '7b19890e-c10d-4cac-97fb-ab0996789d14';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 467500, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 116875, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 116875, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 116875, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 116875, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [177-ESC-2026] SAMANI Djibril - Net: 429500 FCFA
  v_contract_id := 'ce99e037-a116-4b77-83e4-19af14739477';
  v_version_id := '2865b5ea-fbba-4198-a148-ee35a5a835e1';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 379500, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 94875, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 94875, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 94875, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 94875, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [011-ESC-2024] TONOU Kossiwa Léontine - Net: 325000 FCFA
  v_contract_id := '8973f2bc-94d8-4a60-adb3-6cbbd331e545';
  v_version_id := '248059b1-a437-471e-ab7c-6037faba9f21';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 275000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [178-ESC-2026] LOKOSSOU Cedric Franzt - Net: 600000 FCFA
  v_contract_id := '6fc43823-538b-4b36-9a61-fdd3c90b264f';
  v_version_id := 'd9eabd66-6f7b-49c0-b9a6-207d8fb26d53';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [043-ESC-2025] AMAVI Yves daniel - Net: 600000 FCFA
  v_contract_id := 'c693557d-8c98-4a52-a381-3639a41cb711';
  v_version_id := '337574e3-de42-4cc1-a1ca-bc8341449fea';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [016-ESC-2024] AMEDOME Yaovi Jérôme - Net: 900000 FCFA
  v_contract_id := 'f71c2bc9-9041-47b2-9cf9-5aad35c43e11';
  v_version_id := '56462bef-511a-4cde-87ec-c186ddf34f9f';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 212500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 212500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 212500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 212500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [067-ESC-2024] DOGBLA Koudjo Pacôme Elom - Net: 900000 FCFA
  v_contract_id := 'e93a49ce-4fc8-484e-b318-343381cb0de3';
  v_version_id := 'b4a2b6c9-fe4d-43ff-be4f-909e0a989d74';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 212500, '2026-12-15'::date, 250000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 212500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 212500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 212500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [015-ESC-2024] GABA Adama Jean-Pierre - Net: 900000 FCFA
  v_contract_id := 'd9a35cf3-ad49-4ea4-9c24-fb3663c8d3ab';
  v_version_id := 'f2607f38-a2bc-4a52-aeac-83b562f34ca3';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 212500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 212500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 212500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 212500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [009-ESC-2025] GARBA Ridwoine - Net: 600000 FCFA
  v_contract_id := '8dda1494-7e3a-4fea-b615-e41ec39b7389';
  v_version_id := '475e79f3-a3b7-4a5a-afa8-9bb85e118ea2';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [028-ESC-2025] ISSIFOU Soulemane - Net: 900000 FCFA
  v_contract_id := '0048b5ff-142b-441c-9eff-397566128bd1';
  v_version_id := 'd3b0d8a6-b7dc-4023-a99f-695d1f4af437';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 212500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 212500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 212500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 212500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [017-ESC-2024] N''FEIDE Pizikilé Payébinam - Net: 900000 FCFA
  v_contract_id := '94bd418a-d1cc-4ecb-ab01-3935fb700b21';
  v_version_id := 'cc2c2973-34a9-4ad6-a922-facb04e085fc';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 212500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 212500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 212500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 212500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [016-ESC-2025] N''TSOUKPO Komla Daniel - Net: 1025000 FCFA
  v_contract_id := '5ed2785c-b70a-4543-ae66-755716576318';
  v_version_id := 'd0c56462-0410-4c59-bc79-fcd400ac15b5';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 975000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 243750, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 243750, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 243750, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 243750, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [179-ESC-2026] DATEY Dah Mokpokpo - Net: 600000 FCFA
  v_contract_id := 'b073343c-6db0-45db-9ef4-27c378501af1';
  v_version_id := '7c6e91b4-b689-4dc7-b001-7219e52a3f9a';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [162-ESC-2026] FOLLY-NOTSRON Agbenou Ayélé Darina - Net: 600000 FCFA
  v_contract_id := 'feda393c-93e0-4747-b856-bef9c7b9c96f';
  v_version_id := '21e82744-5216-44fb-a29a-f29cd6c320b1';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [006-ESC-2024] GABA Ayélé Daniella Gracia - Net: 600000 FCFA
  v_contract_id := '2d6b7269-e15b-48ff-a195-d9f553a8ec24';
  v_version_id := 'df6a02d2-055e-45b8-befd-626c129325b8';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [003-ESC-2024] GUIHINI Fatimé - Net: 600000 FCFA
  v_contract_id := 'cba01145-a114-468f-9b20-b68926e18956';
  v_version_id := 'a0273829-b997-4765-81fd-6953a7c2ba4f';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [013-ESC-2024] LOGOSSOU Ami Sika Sandra - Net: 600000 FCFA
  v_contract_id := '019a8a66-bc15-4de2-b501-37e57f4d35c7';
  v_version_id := 'eecba3b3-2ee4-40a7-b7c6-be660eed4929';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 200000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [180-ESC-2026] SADJI Yao Wisdom - Net: 600000 FCFA
  v_contract_id := 'e25af0ac-76a9-4d85-afe7-6cd702543852';
  v_version_id := '603aa926-35cd-4a99-92cb-fdbb9f8434c3';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [181-ESC-2026] GOUMBANE Bouamey - Net: 600000 FCFA
  v_contract_id := 'db4565c0-a5e7-4144-9d09-dd6dd8b12102';
  v_version_id := '15ae12e3-560d-4dd2-8479-70783c541560';

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
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [002-ESC-2024] MESSAN Dédé Egnonam Aubine - Net: 325000 FCFA
  v_contract_id := '9c20c45f-4e03-4883-b9c8-4f7f074ec3f4';
  v_version_id := 'de49ef5f-5c86-46a4-8ff1-44fc9ecc76b3';

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
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [161-ESC-2026] TESSI Messan Segninou - Net: 600000 FCFA
  v_contract_id := '902231fa-a201-4447-8df3-8b2a426ca1d8';
  v_version_id := '6e12d7c1-dd32-4c84-9d0e-b92298b89d95';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 550000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 137500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 137500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 137500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 137500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [021-ESC-2025] TOHENOU Kokou Espoir - Net: 900000 FCFA
  v_contract_id := 'ef0b87e6-fd2b-46c6-b859-ca41f6919106';
  v_version_id := '3f536cba-9c9a-499c-8192-c5ec14953701';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M3)', 212500, '2026-12-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M5)', 212500, '2027-02-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M7)', 212500, '2027-04-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M9)', 212500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [182-ESC-2026] KOUADIO Kouadio Joel - Net: 1000000 FCFA
  v_contract_id := '0b2b2af1-7f0b-459a-b464-5e8fa93f886b';
  v_version_id := '17b3a25e-8abf-4699-b946-9183a0294f1d';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [183-ESC-2026] LOKO Cristilla Flavia - Net: 525000 FCFA
  v_contract_id := '34ccb211-128e-4ed9-9d87-de5e04659eb6';
  v_version_id := '512952b3-88cc-4914-bbac-5d5c3229ee5d';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 475000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 118750, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 118750, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 118750, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 118750, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [184-ESC-2026] OUSMAN Ahmat Mahamat - Net: 1000000 FCFA
  v_contract_id := '6899e7e9-5cb2-4cff-ad2d-53c80993b8c4';
  v_version_id := 'c12bc23f-c21b-4e93-9d2e-a6a9155dedc3';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [185-ESC-2026] AKODA Pascal - Net: 525000 FCFA
  v_contract_id := 'aec16433-b5ff-4059-8980-d7de5e33eb1f';
  v_version_id := 'd90a4146-a1cc-424b-9259-5cb441472e27';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 475000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 118750, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 118750, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 118750, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 118750, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [186-ESC-2026] TCHABANA Malia - Net: 1000000 FCFA
  v_contract_id := '24d8c7ee-e44c-48c9-ad42-e76b0691fb3c';
  v_version_id := '92b5f9e0-649b-46a8-8ab7-f66ec55916e6';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [187-ESC-2026] ANNOUR Mahamat Saleh Kaya - Net: 1000000 FCFA
  v_contract_id := '9c8e964b-0151-4594-bb3f-52120cceda28';
  v_version_id := '9ac7fe2f-2667-4ac5-83a3-a5470bd7c4a0';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [049-ESC-2025] BONI KONAN Yao Serge Pacôme - Net: 1000000 FCFA
  v_contract_id := '25441e6e-a772-4e83-91d0-e1bdf7b6edc8';
  v_version_id := '045cee05-779e-4c9f-af04-f106c6f8226c';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [056-ESC-2025] DIALLO Alpha Oumarou Lalbabou - Net: 1000000 FCFA
  v_contract_id := '5b5b32c1-d62a-4649-94f1-66eb3073ddc8';
  v_version_id := '56c32213-b546-4b5e-b466-7f81c3f075d4';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [073-ESC-2022] HOUNYOVI Kokou Fagla - Net: 1000000 FCFA
  v_contract_id := 'cd5ff670-9963-47c1-90d4-495be92523bb';
  v_version_id := '57156795-c77d-4440-9d48-f451eadda640';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [005-ESC-2025] KONAN Romaric Ezéchiel - Net: 1000000 FCFA
  v_contract_id := 'ff1edf89-0599-483c-ac00-303a18c5cf76';
  v_version_id := 'ca288ce4-c985-43af-8a4f-5a2208ee1d05';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [052-ESC-2025] KOUTANDJI Ossara Julienne - Net: 1000000 FCFA
  v_contract_id := '8839ec01-a1cf-4181-8b1c-76af8f40993a';
  v_version_id := '77c1a758-e8f2-4193-9dfb-75ac68801ce7';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [047-ESC-2025] KPONOU Darius - Net: 1000000 FCFA
  v_contract_id := '7cf838bd-4ed4-43c7-bd9f-a8bde0e5772b';
  v_version_id := 'c39ab092-aa3e-4296-89ef-bddbe0fddbb2';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [082-ESC-2025] KPOTI Yao Edem - Net: 1000000 FCFA
  v_contract_id := '5dc77378-ad8d-4196-8867-52809249207c';
  v_version_id := 'c70c1629-8803-4e9c-a27f-0e35915e643c';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [069-ESC-2025] POGBO Pali Lidao - Net: 1000000 FCFA
  v_contract_id := 'b87d12dc-b5a6-4c1c-8424-799ccbc4fadc';
  v_version_id := '828382b8-a2c9-473f-8c45-c47b51f6723b';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [054-ESC-2025] SIAVI Kocou Josias Dimas - Net: 1000000 FCFA
  v_contract_id := '26e85dfb-11b0-4145-bd68-eae15059d092';
  v_version_id := '94251ba9-1fd7-4ea1-b4c7-406ca04d7efd';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [060-ESC-2025] TADEHADJIM Nelson - Net: 1000000 FCFA
  v_contract_id := 'b069cae4-baf8-45d7-a303-f97fea921f61';
  v_version_id := '0599c9d9-39e9-42bb-a6ee-aebd5cdd1336';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [051-ESC-2025] YAO DJE Fortune Herman - Net: 1000000 FCFA
  v_contract_id := '064f3966-47d3-499b-92a4-18f18ccffa37';
  v_version_id := '92ce20db-3dd0-4bf9-8ac5-a489fa38b991';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [048-ESC-2025] ATIKLEME Eddie - Net: 1000000 FCFA
  v_contract_id := '95ae9b80-d7c7-45b0-a794-7fd4acbd4b64';
  v_version_id := 'd955d05f-06b5-48ad-a6c0-2fb0a80da1b4';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [053-ESC-2025] KOUASSI Jerryda Ahlimba - Net: 1000000 FCFA
  v_contract_id := 'cc0f4670-ce58-41a7-8cea-5c74961c3217';
  v_version_id := '3172affd-f4fb-4401-a590-5463a2830c91';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [068-ESC-2025] ADJIBODE Euphrem - Net: 1000000 FCFA
  v_contract_id := '1dc5650e-b63a-4142-a630-e95a01f6176c';
  v_version_id := 'f3b728d1-ce17-46e6-96c7-3a74858631ee';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [002-ESC-2022] AGBO Akossiwa Fanta-maiga - Net: 525000 FCFA
  v_contract_id := 'dc1b9a5a-be96-4eba-86c6-795f5c0fa62f';
  v_version_id := '3d9416ee-793a-4c05-bb43-93a8a209f42b';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 475000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 475000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [023-ESC-2025] KOUNOU Wonder Daniel - Net: 1000000 FCFA
  v_contract_id := '8c2360fa-1550-4e05-b88b-a3f7494096e8';
  v_version_id := '788e2dfa-74b1-477e-a34b-24c97608b530';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [025-ESC-2022] KOUZAO Afi pierrette - Net: 525000 FCFA
  v_contract_id := '223de2ed-0a31-4839-9614-928792afeb50';
  v_version_id := '35f64add-ef34-42c0-913e-3a0d643d7cbd';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 475000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 475000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [027-ESC-2022] KPOSSOU Aimée - Net: 525000 FCFA
  v_contract_id := 'bc4ee61e-31ae-4089-93b1-cf4de628de26';
  v_version_id := 'afd52867-71ca-415c-8ed7-a084982cc320';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 475000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M8)', 475000, '2027-05-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [020-ESC-2022] LIMAZIE Bouwedeou - Net: 1000000 FCFA
  v_contract_id := '1f8d64e5-560c-4ad6-bbdd-3884334c492f';
  v_version_id := 'c7721e30-9b1a-4844-9bbd-7a6ddb06781a';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 950000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M4)', 237500, '2027-01-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M6)', 237500, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M8)', 237500, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M10)', 237500, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [188-ESC-2026] CHIDAS Vanessa Grâce Emilienne - Net: 1700000 FCFA
  v_contract_id := 'a7fffc9c-7e8c-4c03-a2b8-4dad06a932b1';
  v_version_id := '712508b3-e440-40dc-8fbf-3867e0633fda';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M6)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M8)', 330000, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M10)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M12)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 6, 'Scolarité 2026-2027 (Tranche M14)', 330000, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [050-ESC-2025] Franck Carmel Togbe - Net: 1700000 FCFA
  v_contract_id := 'b0e4be96-36e4-4d80-97e1-ab6a2246721e';
  v_version_id := '527e5325-8a9b-4b38-b678-47450dabb6fd';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M6)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M8)', 330000, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M10)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M12)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 6, 'Scolarité 2026-2027 (Tranche M14)', 330000, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [083-ESC-2025] GNIDOTE Senam Soke Arnaud - Net: 1700000 FCFA
  v_contract_id := 'f51ad0e5-f702-4e6d-a1ec-ddc45a88618a';
  v_version_id := '1747c25c-875a-4150-9839-bc425aa02a61';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M6)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M8)', 330000, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M10)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M12)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 6, 'Scolarité 2026-2027 (Tranche M14)', 330000, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [189-ESC-2026] SAMKLU Enyonam - Net: 1700000 FCFA
  v_contract_id := '753e8aca-79bb-420e-b8fa-5c9a19fa1f85';
  v_version_id := '6f396598-926e-41f1-be17-e286e6b101a8';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M6)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M8)', 330000, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M10)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M12)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 6, 'Scolarité 2026-2027 (Tranche M14)', 330000, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [084-ESC-2025] WALLA Azah Wembou - Net: 1700000 FCFA
  v_contract_id := 'ba91241e-e147-476f-b367-331dda94b59f';
  v_version_id := '3fd1b964-4622-4bd3-8036-9e5b253415a8';

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
  values (v_version_id, 2, 'Scolarité 2026-2027 (Tranche M6)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 3, 'Scolarité 2026-2027 (Tranche M8)', 330000, '2027-05-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 4, 'Scolarité 2026-2027 (Tranche M10)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 5, 'Scolarité 2026-2027 (Tranche M12)', 330000, '2027-03-15'::date, 0);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 6, 'Scolarité 2026-2027 (Tranche M14)', 330000, '2027-03-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [190-ESC-2026] MARCOS Nafissath - Net: 900000 FCFA
  v_contract_id := '9ba06142-bcc7-42f4-a0eb-d89805be4069';
  v_version_id := 'a4bbdbf3-2a1f-4251-96cb-82ed20ce8418';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Paiement comptant / annuel)', 850000, '2026-10-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [191-ESC-2026] KIALA MFUAMBI Beni - Net: 900000 FCFA
  v_contract_id := '6360e1f4-6ed4-4522-80bf-36fea4975bb3';
  v_version_id := 'e7215208-52e1-47c5-86cb-2c57b668c66c';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 850000, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Paiement comptant / annuel)', 850000, '2026-10-15'::date, 0);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

  -- [159-ESC-2026] ACAKPO Fabienne Peroline - Net: 488200 FCFA
  v_contract_id := 'd4d40c29-47d3-46f2-9e1e-a88c66cefaf6';
  v_version_id := '9e93fb78-f368-43f9-9a69-70ecf12558ef';

  delete from escen.installments where version_id = v_version_id;
  delete from escen.contract_discounts where version_id = v_version_id;
  delete from escen.contract_lines where version_id = v_version_id;

  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, 438200, 'Frais de scolarité 2026-2027');
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 1, 'Frais d''inscription 2026-2027', 50000, '2026-09-15'::date, 50000);
  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, 2, 'Scolarité 2026-2027 (Paiement comptant / annuel)', 438200, '2026-10-15'::date, 438200);
  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;

end $$;

alter table escen.contract_lines enable trigger no_delete;
alter table escen.contract_discounts enable trigger no_delete;
alter table escen.installments enable trigger no_delete;

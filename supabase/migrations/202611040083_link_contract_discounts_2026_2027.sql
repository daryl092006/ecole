-- 202611040083_link_contract_discounts_2026_2027.sql
-- Régularisation des bourses et remises contractuelles 2026-2027 :
-- Pour les 31 étudiants bénéficiaires d'une réduction (50%, 31%, 20%, 15%) :
-- 1. Rétablissement de la scolarité brute dans escen.contract_lines
-- 2. Insertion de la remise dans escen.contract_discounts reliée à scholarship_awards
-- 3. Maintien strict de la parité nette : sum(lignes) - sum(remises) = sum(échéances)

begin;

-- Désactivation temporaire des triggers de garde pour la mise à jour contractuelle
alter table escen.contract_versions disable trigger contract_version_guard;
alter table escen.contract_lines disable trigger contract_line_guard;
alter table escen.contract_discounts disable trigger contract_discount_guard;
alter table escen.contract_discounts disable trigger no_delete;
alter table escen.installments disable trigger installment_guard;

do $$
declare
  v_version_id uuid;
  v_contract_id uuid;
  v_line_id uuid;
  v_award_id uuid;
begin
  -- [164-ESC-2026] AKOR Abla Élisée : Brut 480000 FCFA - Remise 50% (240000 FCFA) = Net 240000 FCFA
  v_contract_id := 'b37fb687-bd54-452b-8844-e9e880ca7568';
  v_version_id := '9e5e570d-5c44-44cc-93c5-5836de4a98b5';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 480000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 240000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [165-ESC-2026] BANNA Achraf : Brut 850000 FCFA - Remise 50% (425000 FCFA) = Net 425000 FCFA
  v_contract_id := 'ac282f25-dc2c-43c4-8057-9e2d03f97bc7';
  v_version_id := '90b82208-9d17-4085-ba9f-50f8b522f901';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 850000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 425000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [153-ESC-2026] EKLO Ablavi Natacha : Brut 850000 FCFA - Remise 50% (425000 FCFA) = Net 425000 FCFA
  v_contract_id := '902929f5-bec7-4c6f-a56a-e534538be645';
  v_version_id := '72643c9c-98f1-437c-8619-b6756b7b47a7';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 850000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 425000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [166-ESC-2026] GBADOE Komi Prince Antoine : Brut 850000 FCFA - Remise 50% (425000 FCFA) = Net 425000 FCFA
  v_contract_id := '6fe40cdf-fa07-477e-b048-78793403b0c7';
  v_version_id := '78b4958c-98fa-4df1-b421-fa8c184804e5';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 850000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 425000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [167-ESC-2026] AGUIDI Abla Dzifa : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := 'dbf4a910-1237-4449-b1f5-200a4a4056c1';
  v_version_id := '7a7e4af5-20ba-4e18-8717-6474cc9115aa';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [160-ESC-2026] AHOSSI Mawunyon Verra : Brut 480000 FCFA - Remise 50% (240000 FCFA) = Net 240000 FCFA
  v_contract_id := '6bfae674-a2d3-4829-befb-7baffc8e324a';
  v_version_id := '52e78d19-935d-4c2b-b209-082397776952';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 480000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 240000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [170-ESC-2026] EGAN Akouvi Alice : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := 'c9d0d991-195d-416a-bda2-1f42b8d43300';
  v_version_id := '227bde73-b5c2-43bc-972c-c41fa3cdf0a8';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [171-ESC-2026] GNELE Evynel Olanique : Brut 480000 FCFA - Remise 15% (72000 FCFA) = Net 408000 FCFA
  v_contract_id := '31af30cb-1b46-4bec-b8c8-4741aa2422b6';
  v_version_id := '10e53263-3336-47ec-af46-acb45a1c1d9d';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 480000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 72000, 'Attribution officielle : remise de 15% sur la scolarité');
  end if;

  -- [172-ESC-2026] AKAKPO Harmony Daniella Modoukpe : Brut 480000 FCFA - Remise 15% (72000 FCFA) = Net 408000 FCFA
  v_contract_id := 'fdad0ed1-5d48-4c28-a2a2-aad06109ad6a';
  v_version_id := 'a7897242-32f5-4761-a3b8-88e027da691e';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 480000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 72000, 'Attribution officielle : remise de 15% sur la scolarité');
  end if;

  -- [022-ESC-2025] APATIO Beni de Dieu : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := 'fb528f0c-2cab-4019-b57b-f3838837f8cb';
  v_version_id := 'c9a9425b-02b2-4ee3-8583-d2cd9a6f2426';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [002-ESC-2025] KPOBIE Manawe : Brut 975000 FCFA - Remise 50% (487500 FCFA) = Net 487500 FCFA
  v_contract_id := '142528a1-c0f0-46aa-815d-2abdbf602058';
  v_version_id := 'a5184cd4-3029-4bad-a514-3ccf83f07353';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 975000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 487500, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [035-ESC-2025] ADEPOHA Komlan Victor : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := 'dcc15f85-b932-4a89-a22c-cc781d1d2afa';
  v_version_id := 'b07c70b1-3861-4244-96d1-d0a205f27dbd';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [034-ESC-2025] AGBEHADJI Koami Samuel : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := '19efae49-f696-4da9-b482-f72ea6cf1147';
  v_version_id := 'b869b6c0-e05f-4ea6-b293-f949650035c0';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [040-ESC-2025] BATADJA fékand'N Shalom : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := 'e3bc974a-8119-44d7-bf6a-731b48fca3dc';
  v_version_id := '22f946f1-6dec-4679-bb88-0de7589eb1c9';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [008-ESC-2025] SOMA Abdou Latifou : Brut 975000 FCFA - Remise 50% (487500 FCFA) = Net 487500 FCFA
  v_contract_id := 'dea089e6-a6b2-43be-9470-1ea5ec44894e';
  v_version_id := 'f2751afd-d580-4ebd-880c-11c12ec51a5e';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 975000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 487500, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [012-ESC-2025] TAHIROU Moussa : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := '06433f7e-a87a-4b1e-ade3-01b2f2455b13';
  v_version_id := 'af146945-040c-4a22-9f7b-9cc7e3ba3f86';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [015-ESC-2025] KOUESSAN Akossiwa robertine : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := 'e03dfff6-8127-406d-898e-f94e2c369e56';
  v_version_id := 'b5762da4-5d09-4fea-943a-c8772a5f8271';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [004-ESC-2024] ADJIGNON Komi Del Pierro : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := 'b750062a-b37f-4389-8676-f9224e4f7816';
  v_version_id := '3e70b9fc-fc85-4ddc-9185-428e1ea7a554';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [174-ESC-2026] AMUZU Koffi Komi Abel : Brut 550000 FCFA - Remise 15% (82500 FCFA) = Net 467500 FCFA
  v_contract_id := '35d0cc8b-5eb5-4cc0-b51e-9e0bf3e38092';
  v_version_id := '9c8143da-4b96-4c68-9ca6-15d2261fe900';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 82500, 'Attribution officielle : remise de 15% sur la scolarité');
  end if;

  -- [009-ESC-2024] KESSOUGBO Amavi : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := '648f368f-67c4-42bd-b1a7-d3df56de4be8';
  v_version_id := '21d23309-2d6b-49fe-9190-fef19017b218';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [175-ESC-2026] MAMA Issa : Brut 550000 FCFA - Remise 31% (170500 FCFA) = Net 379500 FCFA
  v_contract_id := '29b24ed2-ed08-45dd-acf1-f679744debbd';
  v_version_id := 'c3d9f057-c8a0-4752-8368-655bbb972730';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 170500, 'Attribution officielle : remise de 31% sur la scolarité');
  end if;

  -- [176-ESC-2026] OLOHUNTO Amed Oba Sanjo : Brut 550000 FCFA - Remise 15% (82500 FCFA) = Net 467500 FCFA
  v_contract_id := '0007fc38-9592-450a-95bc-84826f23bac7';
  v_version_id := '7b19890e-c10d-4cac-97fb-ab0996789d14';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 82500, 'Attribution officielle : remise de 15% sur la scolarité');
  end if;

  -- [177-ESC-2026] SAMANI Djibril : Brut 550000 FCFA - Remise 31% (170500 FCFA) = Net 379500 FCFA
  v_contract_id := 'ce99e037-a116-4b77-83e4-19af14739477';
  v_version_id := '2865b5ea-fbba-4198-a148-ee35a5a835e1';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 170500, 'Attribution officielle : remise de 31% sur la scolarité');
  end if;

  -- [011-ESC-2024] TONOU Kossiwa Léontine : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := '8973f2bc-94d8-4a60-adb3-6cbbd331e545';
  v_version_id := '248059b1-a437-471e-ab7c-6037faba9f21';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [002-ESC-2024] MESSAN Dédé Egnonam Aubine : Brut 550000 FCFA - Remise 50% (275000 FCFA) = Net 275000 FCFA
  v_contract_id := '9c20c45f-4e03-4883-b9c8-4f7f074ec3f4';
  v_version_id := 'de49ef5f-5c86-46a4-8ff1-44fc9ecc76b3';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 550000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 275000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [183-ESC-2026] LOKO Cristilla Flavia : Brut 950000 FCFA - Remise 50% (475000 FCFA) = Net 475000 FCFA
  v_contract_id := '34ccb211-128e-4ed9-9d87-de5e04659eb6';
  v_version_id := '512952b3-88cc-4914-bbac-5d5c3229ee5d';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 950000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 475000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [048-ESC-2025] ATIKLEME : Brut 950000 FCFA - Remise 20% (190000 FCFA) = Net 760000 FCFA
  v_contract_id := '95ae9b80-d7c7-45b0-a794-7fd4acbd4b64';
  v_version_id := 'd955d05f-06b5-48ad-a6c0-2fb0a80da1b4';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 950000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 190000, 'Attribution officielle : remise de 20% sur la scolarité');

    -- Régularisation des échéances de scolarité pour ATIKLEME (4 x 190 000 FCFA = 760 000 FCFA)
    update escen.installments set amount = 190000 where version_id = v_version_id and position >= 2;
  end if;

  -- [185-ESC-2026] AKODA Pascal : Brut 950000 FCFA - Remise 50% (475000 FCFA) = Net 475000 FCFA
  v_contract_id := 'aec16433-b5ff-4059-8980-d7de5e33eb1f';
  v_version_id := 'd90a4146-a1cc-424b-9259-5cb441472e27';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 950000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 475000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [002-ESC-2022] AGBO Akossiwa Fanta-maiga : Brut 950000 FCFA - Remise 50% (475000 FCFA) = Net 475000 FCFA
  v_contract_id := 'dc1b9a5a-be96-4eba-86c6-795f5c0fa62f';
  v_version_id := '3d9416ee-793a-4c05-bb43-93a8a209f42b';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 950000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 475000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [025-ESC-2022] KOUZAO Afi pierrette : Brut 950000 FCFA - Remise 50% (475000 FCFA) = Net 475000 FCFA
  v_contract_id := '223de2ed-0a31-4839-9614-928792afeb50';
  v_version_id := '35f64add-ef34-42c0-913e-3a0d643d7cbd';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 950000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 475000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

  -- [027-ESC-2022] KPOSSOU Aimée : Brut 950000 FCFA - Remise 50% (475000 FCFA) = Net 475000 FCFA
  v_contract_id := 'bc4ee61e-31ae-4089-93b1-cf4de628de26';
  v_version_id := 'afd52867-71ca-415c-8ed7-a084982cc320';

  -- 1. Rétablir le montant brut sur la ligne de scolarité
  select l.id into v_line_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_id is not null then
    update escen.contract_lines set amount = 950000 where id = v_line_id;

    -- 2. Récupérer l'attribution de bourse associée
    select a.id into v_award_id
    from escen.scholarship_awards a
    join escen.financial_contracts c on c.enrollment_id = a.enrollment_id
    where c.id = v_contract_id and a.revoked_at is null
    order by a.valid_from desc
    limit 1;

    -- 3. Insérer la remise contractuelle
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_id;
    insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
    values (v_line_id, v_version_id, v_award_id, 475000, 'Attribution officielle : remise de 50% sur la scolarité');
  end if;

end $$;

-- Réactivation des triggers de garde
alter table escen.installments enable trigger installment_guard;
alter table escen.contract_discounts enable trigger no_delete;
alter table escen.contract_discounts enable trigger contract_discount_guard;
alter table escen.contract_lines enable trigger contract_line_guard;
alter table escen.contract_versions enable trigger contract_version_guard;

commit;

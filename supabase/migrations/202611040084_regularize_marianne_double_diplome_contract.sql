-- 202611040084_regularize_marianne_double_diplome_contract.sql
-- Régularisation du contrat de Marianne d'Almeida (018-ESC-2025) :
-- Filière : L2 Intelligence Artificielle & Génie Logiciel (Double Diplomation)
-- 1. Frais de scolarité Double Diplomation : 975 000 FCFA brut
-- 2. Remise 15% comptant : 146 250 FCFA
-- 3. Net scolarité : 828 750 FCFA (+ 50 000 FCFA inscription = 878 750 FCFA net)
-- 4. Échéance unique de scolarité : 828 750 FCFA, intégralement réglée par le paiement de 828 750 FCFA
-- 5. Allocation complète du paiement de 828 750 FCFA sur l'échéance de scolarité

begin;

-- Désactivation temporaire des triggers de garde
alter table escen.contract_versions disable trigger contract_version_guard;
alter table escen.contract_lines disable trigger contract_line_guard;
alter table escen.contract_discounts disable trigger contract_discount_guard;
alter table escen.contract_discounts disable trigger no_delete;
alter table escen.installments disable trigger installment_guard;
alter table escen.installments disable trigger no_delete;
alter table escen.payment_allocations disable trigger no_delete;

do $$
declare
  v_contract_id uuid := 'a0229984-241f-491f-997e-00a3f1e3f3b6';
  v_version_id uuid := '692be8a8-0935-413f-9427-3346669b136c';
  v_enrollment_id uuid;
  v_line_sco_id uuid;
  v_line_ins_id uuid;
  v_inst_sco_id uuid;
  v_award_id uuid;
  v_payment_sco_id uuid;
  v_admin_id uuid;
begin
  -- 1. Récupérer l'administrateur RAF / IT
  select a.id into v_admin_id
  from escen.accounts a
  join escen.role_grants g on g.account_id = a.id
  join escen.roles r on r.id = g.role_id
  where r.code in ('RAF', 'IT') and a.active = true
  order by case when r.code = 'RAF' then 1 else 2 end
  limit 1;
  if v_admin_id is null then select id into v_admin_id from escen.accounts limit 1; end if;

  -- 2. Récupérer l'inscription
  select enrollment_id into v_enrollment_id
  from escen.financial_contracts where id = v_contract_id;

  -- 3. Récupérer ou insérer l'attribution de la remise 15% (Double Diplomation / comptant)
  select a.id into v_award_id
  from escen.scholarship_awards a
  where a.enrollment_id = v_enrollment_id and a.revoked_at is null
  limit 1;

  if v_award_id is null and v_enrollment_id is not null then
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    )
    select s.id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Remise 15% Double Diplomation - Paiement annuel comptant',
      '{"code":"REMISE-15","percent":15,"applied_on":975000}'::jsonb
    from escen.scholarships s where s.code = 'REMISE-15'
    returning id into v_award_id;
  end if;

  -- 4. Rétablir le montant brut de scolarité à 975 000 FCFA (Double Diplomation L2 IA)
  select l.id into v_line_sco_id
  from escen.contract_lines l
  join escen.fee_types f on f.id = l.fee_type_id
  where l.version_id = v_version_id and f.category = 'SCOLARITE'
  limit 1;

  if v_line_sco_id is not null then
    update escen.contract_lines set amount = 975000 where id = v_line_sco_id;

    -- 5. Insérer la remise contractuelle de 146 250 FCFA
    delete from escen.contract_discounts where version_id = v_version_id and line_id = v_line_sco_id;
    if v_award_id is not null then
      insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
      values (v_line_sco_id, v_version_id, v_award_id, 146250, 'Remise 15% Double Diplomation - paiement comptant');
    end if;

    -- 6. Récupérer ou créer l'échéance de scolarité annuelle (position 2)
    select id into v_inst_sco_id
    from escen.installments where version_id = v_version_id and position = 2;

    if v_inst_sco_id is not null then
      update escen.installments
      set amount = 828750,
          settled_amount = 828750,
          description = 'Scolarité annuelle L2 IA Double Diplomation (Comptant)',
          due_on = '2026-10-15'::date
      where id = v_inst_sco_id;
    end if;

    -- 7. Nettoyer les anciennes échéances superflues de scolarité (positions > 2)
    -- et rediriger leurs allocations vers l'échéance unique de scolarité v_inst_sco_id
    update escen.payment_allocations
    set installment_id = v_inst_sco_id
    where version_id = v_version_id and installment_id in (
      select id from escen.installments where version_id = v_version_id and position > 2
    );

    delete from escen.installments where version_id = v_version_id and position > 2;

    -- 8. Régulariser l'allocation totale du paiement de 828 750 FCFA sur la tranche de scolarité
    select p.id into v_payment_sco_id
    from escen.payments p
    where p.enrollment_id = v_enrollment_id and p.amount = 828750
    limit 1;

    if v_payment_sco_id is not null and v_inst_sco_id is not null then
      delete from escen.payment_allocations
      where payment_id = v_payment_sco_id;

      insert into escen.payment_allocations (
        payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by
      )
      values (
        v_payment_sco_id, v_enrollment_id, v_contract_id, v_version_id, v_line_sco_id, v_inst_sco_id, 828750, v_admin_id
      );
    end if;
  end if;
end $$;

-- Réactivation des triggers
alter table escen.payment_allocations enable trigger no_delete;
alter table escen.installments enable trigger no_delete;
alter table escen.installments enable trigger installment_guard;
alter table escen.contract_discounts enable trigger no_delete;
alter table escen.contract_discounts enable trigger contract_discount_guard;
alter table escen.contract_lines enable trigger contract_line_guard;
alter table escen.contract_versions enable trigger contract_version_guard;

commit;

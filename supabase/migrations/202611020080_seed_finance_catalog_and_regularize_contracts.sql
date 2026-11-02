-- 202611020080_seed_finance_catalog_and_regularize_contracts.sql
-- Catalogue général des bourses, remises et grilles tarifaires 2026-2027
-- Régularisation du contrat financier L2 Intelligence Artificielle de Marianne d'Almeida (018-ESC-2025)

-- 1. Catalogue général des bourses et remises ESCEN
insert into escen.scholarships (code, name, kind, percent, amount, active)
values
  ('REMISE-15', 'Remise 15% - Paiement annuel comptant', 'POURCENTAGE', 15.00, null, true),
  ('REMISE-20', 'Remise 20% - Partenariat & Groupe', 'POURCENTAGE', 20.00, null, true),
  ('BOURSE-50', 'Bourse d''Excellence / Demi-bourse 50%', 'POURCENTAGE', 50.00, null, true),
  ('BOURSE-100', 'Bourse Totale 100%', 'POURCENTAGE', 100.00, null, true),
  ('COMPASSION', 'Bourse Partenaire Compassion International', 'POURCENTAGE', 50.00, null, true),
  ('NEHEMIAH', 'Bourse Partenaire Nehemiah Project', 'POURCENTAGE', 50.00, null, true),
  ('FRATRIE-10', 'Remise Fratrie / Famille 10%', 'POURCENTAGE', 10.00, null, true)
on conflict (code) do update
  set name = excluded.name, kind = excluded.kind, percent = excluded.percent, active = true;

-- 2. Tarifs de référence 2026-2027
do $$
declare
  v_year_id uuid;
begin
  select id into v_year_id from escen.academic_years where code = '2026-2027' limit 1;
  if v_year_id is not null then
    -- Frais d'inscription généraux (50 000 FCFA)
    insert into escen.annual_fee_schedules (academic_year_id, category, amount, reason, delivery_mode)
    values (v_year_id, 'INSCRIPTION', 50000, 'Frais d''inscription généraux 2026-2027', 'Présentiel')
    on conflict do nothing;
  end if;
end $$;

-- 3. Régularisation du contrat de Marianne d'Almeida (018-ESC-2025)
do $$
declare
  v_enrollment_id uuid;
  v_sch_id uuid;
  v_contract_id uuid;
  v_version_id uuid;
  v_line_sco_id uuid;
  v_inst_1_id uuid;
  v_award_id uuid;
  v_admin_id uuid;
begin
  select a.id into v_admin_id
  from escen.accounts a
  join escen.role_grants g on g.account_id = a.id
  join escen.roles r on r.id = g.role_id
  where r.code in ('RAF', 'IT') and a.active = true
  order by case when r.code = 'RAF' then 1 else 2 end
  limit 1;

  if v_admin_id is null then
    select id into v_admin_id from escen.accounts limit 1;
  end if;

  select id into v_sch_id from escen.scholarships where code = 'REMISE-15' limit 1;

  select e.id into v_enrollment_id
  from escen.enrollments e
  join escen.students s on s.id = e.student_id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years y on y.id = o.academic_year_id
  where s.matricule = '018-ESC-2025' and y.code = '2026-2027' limit 1;

  if v_enrollment_id is not null and v_sch_id is not null then
    -- Attribution de la remise 15% comptant
    insert into escen.scholarship_awards (
      scholarship_id, enrollment_id, valid_from, granted_by, reason, terms_snapshot
    ) values (
      v_sch_id, v_enrollment_id, '2026-10-01'::date, v_admin_id,
      'Paiement annuel comptant L2 Intelligence Artificielle (Remise 15%)',
      '{"code":"REMISE-15","percent":15,"applied_on":975000}'::jsonb
    )
    on conflict (scholarship_id, enrollment_id, valid_from) do update
      set reason = excluded.reason
    returning id into v_award_id;

    if v_award_id is null then
      select id into v_award_id from escen.scholarship_awards
      where scholarship_id = v_sch_id and enrollment_id = v_enrollment_id and valid_from = '2026-10-01'::date limit 1;
    end if;

    -- Mise à jour du contrat financier : L2 IA = 975 000 FCFA brut avec remise de 146 250 FCFA
    select id into v_contract_id from escen.financial_contracts where enrollment_id = v_enrollment_id limit 1;
    if v_contract_id is not null then
      select id into v_version_id from escen.contract_versions where contract_id = v_contract_id and status = 'APPROVED' limit 1;
      
      select id into v_line_sco_id
      from escen.contract_lines
      where contract_id = v_contract_id and version_id = v_version_id and description like '%Scolarité%' limit 1;

      if v_line_sco_id is not null and v_version_id is not null then
        -- Montant brut L2 IA
        update escen.contract_lines set amount = 975000 where id = v_line_sco_id;
        
        -- Remise de 15% (146 250 FCFA)
        insert into escen.contract_discounts (line_id, version_id, scholarship_award_id, amount, reason)
        values (v_line_sco_id, v_version_id, v_award_id, 146250, 'Remise 15% paiement annuel comptant')
        on conflict do nothing;

        -- Récupérer l'échéance 1 (position 1)
        select id into v_inst_1_id from escen.installments where version_id = v_version_id and position = 1 limit 1;

        if v_inst_1_id is not null then
          -- Ajustement de l'échéance annuelle : 828 750 FCFA nette, réglée à 828 750 FCFA
          update escen.installments
          set amount = 828750, settled_amount = 828750, description = 'Scolarité annuelle L2 IA (Comptant)'
          where id = v_inst_1_id;

          -- Nettoyer les allocations de paiements existantes sur cette version pour les concentrer sur l'échéance 1
          delete from escen.payment_allocations where version_id = v_version_id;

          -- Allouer l'intégralité du versement scolarité (828 750 FCFA) sur la tranche unique
          insert into escen.payment_allocations (
            payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by
          )
          select
            p.id, v_enrollment_id, v_contract_id, v_version_id, v_line_sco_id, v_inst_1_id, 828750, v_admin_id
          from escen.payments p
          where p.enrollment_id = v_enrollment_id and p.amount = 828750 limit 1;

          -- Supprimer les échéances superflues de position > 1
          delete from escen.installments where version_id = v_version_id and position > 1;
        end if;
      end if;
    end if;
  end if;
end $$;

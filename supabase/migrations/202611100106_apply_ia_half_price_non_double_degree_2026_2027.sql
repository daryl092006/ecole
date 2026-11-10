-- Migration : Application de la tarification IA normale (sans double diplomation, moitié prix) pour 2026-2027
-- Pour la filière IA & Génie Logiciel (IA-GL) :
-- 1. Double diplomation (double_degree = true) :
--    - L1 : 850 000 FCFA de scolarité
--    - L2 : 975 000 FCFA de scolarité
--    - L3 : 1 100 000 FCFA de scolarité
-- 2. Normale sans double diplomation (double_degree = false, moitié prix officiel) :
--    - L1 : 425 000 FCFA de scolarité (soit 850 000 / 2) + 50 000 inscription = 475 000 FCFA
--    - L2 : 487 500 FCFA de scolarité (soit 975 000 / 2) + 50 000 inscription = 537 500 FCFA
--    - L3 : 550 000 FCFA de scolarité (soit 1 100 000 / 2) + 50 000 inscription = 600 000 FCFA
-- 3. Application des bourses éventuelles sur cette base de scolarité normale.
-- 4. Préservation de tous les montants déjà encaissés et égalité stricte lignes = échéances.

begin;

alter table escen.installments disable trigger no_delete;
alter table escen.contract_discounts disable trigger no_delete;
alter table escen.contract_lines disable trigger no_delete;
alter table escen.installments disable trigger installment_guard;
alter table escen.contract_lines disable trigger contract_line_guard;
alter table escen.contract_versions disable trigger contract_version_guard;

do $$
declare
  r record;
  v_fee_inscription_id uuid;
  v_fee_scolarite_id uuid;
  v_approver_id uuid;
  v_contract_id uuid;
  v_version_id uuid;
  v_base_tuition numeric;
  v_discounted_tuition numeric;
  v_settled_total numeric;
  v_rem_settled numeric;
  v_t1 numeric; v_t2 numeric; v_t3 numeric; v_t4 numeric;
  v_s1 numeric; v_s2 numeric; v_s3 numeric; v_s4 numeric;
  v_sinsc numeric;
  v_alloc numeric;
  v_count_inst integer;
begin
  select id into v_fee_inscription_id from escen.fee_types where code = 'ANNUAL-INSCRIPTION' limit 1;
  select id into v_fee_scolarite_id from escen.fee_types where code in ('ANNUAL-SCOLARITE', 'SCOLARITE-2025') or category = 'SCOLARITE' order by code limit 1;
  select a.id into v_approver_id from escen.accounts a join escen.role_grants rg on rg.account_id = a.id join escen.roles ro on ro.id = rg.role_id where ro.code in ('DG', 'RAF', 'IT') limit 1;
  if v_approver_id is null then
    select id into v_approver_id from escen.accounts limit 1;
  end if;

  if v_fee_inscription_id is null or v_fee_scolarite_id is null then
    return;
  end if;

  for r in (
    select
      s.id as student_id,
      s.matricule,
      p.firstname || ' ' || p.lastname as student_name,
      lvl.code as level_code,
      prog.code as program_code,
      e.id as enrollment_id,
      e.double_degree,
      fc.id as contract_id,
      cv.id as version_id,
      coalesce(
        (
          select sch.percent
          from escen.scholarship_awards sa
          join escen.scholarships sch on sch.id = sa.scholarship_id
          where sa.enrollment_id = e.id and sa.revoked_at is null
          limit 1
        ),
        0
      ) as scholarship_pct,
      coalesce((select sum(ci.settled_amount) from escen.installments ci where ci.version_id = cv.id), 0) as settled_total,
      case
        when e.double_degree = false and lvl.code = 'L1' then 425000
        when e.double_degree = false and lvl.code = 'L2' then 487500
        when e.double_degree = false and lvl.code = 'L3' then 550000
        else 0
      end as base_tuition
    from escen.students s
    join escen.people p on p.id = s.person_id
    join escen.enrollments e on e.student_id = s.id
    join escen.academic_offerings ao on ao.id = e.offering_id and ao.academic_year_id = (select id from escen.academic_years where code = '2026-2027')
    join escen.curricula curr on curr.id = ao.curriculum_id
    join escen.programs prog on prog.id = curr.program_id and prog.code = 'IA-GL'
    join escen.levels lvl on lvl.id = ao.level_id
    left join escen.financial_contracts fc on fc.enrollment_id = e.id
    left join escen.contract_versions cv on cv.contract_id = fc.id and cv.version = (select max(version) from escen.contract_versions where contract_id = fc.id)
    where e.double_degree = false
    order by lvl.code, s.matricule
  ) loop

    v_base_tuition := r.base_tuition;
    v_discounted_tuition := round(v_base_tuition * (1 - r.scholarship_pct / 100.0));
    v_contract_id := r.contract_id;
    v_version_id := r.version_id;

    if v_version_id is null then
      continue;
    end if;

    v_settled_total := r.settled_total;

    -- Mise à jour des lignes de contrat
    if exists (select 1 from escen.contract_lines where version_id = v_version_id and fee_type_id = v_fee_inscription_id) then
      update escen.contract_lines set amount = 50000 where version_id = v_version_id and fee_type_id = v_fee_inscription_id;
    else
      insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
      values (v_contract_id, v_version_id, v_fee_inscription_id, 50000, 'Frais d''inscription 2026-2027');
    end if;

    if exists (select 1 from escen.contract_lines where version_id = v_version_id and fee_type_id = v_fee_scolarite_id) then
      update escen.contract_lines set amount = v_discounted_tuition where version_id = v_version_id and fee_type_id = v_fee_scolarite_id;
    else
      insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
      values (v_contract_id, v_version_id, v_fee_scolarite_id, v_discounted_tuition, 'Frais de scolarité 2026-2027 (IA normale sans double diplomation)');
    end if;

    select count(*) into v_count_inst from escen.installments where version_id = v_version_id;

    if r.matricule = '002-ESC-2025' then
      -- [002-ESC-2025] Manawè Joceline KPOBIE (2 échéances : inscription 50k + scolarité 50% 243 750 FCFA)
      update escen.installments set amount = 50000, settled_amount = 50000 where version_id = v_version_id and position = 1;
      update escen.installments set amount = 243750, settled_amount = 243750 where version_id = v_version_id and position = 2;

    elsif r.matricule = '158-ESC-2026' then
      -- [158-ESC-2026] John Bienvenu AHYEE (4 échéances : inscription 50k + 3 tranches de 141 666 / 141 667 / 141 667)
      update escen.installments set amount = 50000, settled_amount = 50000 where version_id = v_version_id and position = 1;
      update escen.installments set amount = 141666, settled_amount = 141666 where version_id = v_version_id and position = 2;
      update escen.installments set amount = 141667, settled_amount = 141667 where version_id = v_version_id and position = 3;
      update escen.installments set amount = 141667, settled_amount = 6667 where version_id = v_version_id and position = 4;

    elsif v_count_inst = 5 then
      -- Répartition en 4 tranches
      v_t1 := floor(v_discounted_tuition / 4);
      v_t2 := floor(v_discounted_tuition / 4);
      v_t3 := floor(v_discounted_tuition / 4);
      v_t4 := v_discounted_tuition - (v_t1 + v_t2 + v_t3);

      -- Allocation des montants déjà encaissés
      if v_settled_total >= 50000 then
        v_sinsc := 50000;
        v_rem_settled := v_settled_total - 50000;
      else
        v_sinsc := v_settled_total;
        v_rem_settled := 0;
      end if;

      v_alloc := least(v_t1, v_rem_settled);
      v_s1 := v_alloc;
      v_rem_settled := v_rem_settled - v_alloc;

      v_alloc := least(v_t2, v_rem_settled);
      v_s2 := v_alloc;
      v_rem_settled := v_rem_settled - v_alloc;

      v_alloc := least(v_t3, v_rem_settled);
      v_s3 := v_alloc;
      v_rem_settled := v_rem_settled - v_alloc;

      v_alloc := least(v_t4, v_rem_settled);
      v_s4 := v_alloc;
      v_rem_settled := v_rem_settled - v_alloc;

      update escen.installments set amount = 50000, settled_amount = v_sinsc where version_id = v_version_id and position = 1;
      update escen.installments set amount = v_t1, settled_amount = v_s1 where version_id = v_version_id and position = 2;
      update escen.installments set amount = v_t2, settled_amount = v_s2 where version_id = v_version_id and position = 3;
      update escen.installments set amount = v_t3, settled_amount = v_s3 where version_id = v_version_id and position = 4;
      update escen.installments set amount = v_t4, settled_amount = v_s4 where version_id = v_version_id and position = 5;
    end if;

    update escen.contract_versions
    set reason = 'Régularisation tarif officiel IA-GL normale sans double diplomation (moitié prix)'
    where id = v_version_id;

  end loop;
end $$;

alter table escen.installments enable trigger no_delete;
alter table escen.contract_discounts enable trigger no_delete;
alter table escen.contract_lines enable trigger no_delete;
alter table escen.installments enable trigger installment_guard;
alter table escen.contract_lines enable trigger contract_line_guard;
alter table escen.contract_versions enable trigger contract_version_guard;

commit;

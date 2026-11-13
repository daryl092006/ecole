-- Migration : Réaffectation de TELOU Abidé (163-ESC-2026) en IA-GL L1 et régularisation du contrat financier 2026-2027

begin;

alter table escen.installments disable trigger no_delete;
alter table escen.contract_discounts disable trigger no_delete;
alter table escen.contract_lines disable trigger no_delete;
alter table escen.installments disable trigger installment_guard;
alter table escen.contract_lines disable trigger contract_line_guard;
alter table escen.contract_versions disable trigger contract_version_guard;
alter table escen.enrollments disable trigger enrollment_context_guard;
alter table escen.enrollment_groups disable trigger no_delete;

do $$
declare
  v_enrollment_id uuid := '4a1c1ab7-ef42-4450-8e7e-1ab8eb33f09b';
  v_ia_offering_id uuid := '061c059b-0b18-42c4-bbe8-dd2094e16d09';
  v_contract_id uuid := 'f19cbbe6-39d6-47a4-899e-ba9e7cf10161';
  v_version_id uuid := '4913dde4-5965-47ad-9a8a-de1e602b5b13';
  v_fee_inscription_id uuid;
  v_fee_scolarite_id uuid;
begin
  select id into v_fee_inscription_id from escen.fee_types where code = 'ANNUAL-INSCRIPTION' limit 1;
  select id into v_fee_scolarite_id from escen.fee_types where code in ('ANNUAL-SCOLARITE', 'SCOLARITE-2025') or category = 'SCOLARITE' order by code limit 1;

  if v_fee_inscription_id is null or v_fee_scolarite_id is null then
    return;
  end if;

  if exists (select 1 from escen.enrollments where id = v_enrollment_id)
     and exists (select 1 from escen.academic_offerings where id = v_ia_offering_id) then
    delete from escen.enrollment_groups
    where enrollment_id = v_enrollment_id;

    update escen.enrollments
    set offering_id = v_ia_offering_id,
        double_degree = false
    where id = v_enrollment_id;
  end if;

  if exists (select 1 from escen.contract_versions where id = v_version_id) then
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
    set reason = 'Réaffectation en IA-GL L1 et régularisation du contrat financier 2026-2027'
    where id = v_version_id;
  end if;
end $$;

alter table escen.enrollment_groups enable trigger no_delete;
alter table escen.enrollments enable trigger enrollment_context_guard;
alter table escen.contract_versions enable trigger contract_version_guard;
alter table escen.contract_lines enable trigger contract_line_guard;
alter table escen.installments enable trigger installment_guard;
alter table escen.contract_lines enable trigger no_delete;
alter table escen.contract_discounts enable trigger no_delete;
alter table escen.installments enable trigger no_delete;

commit;


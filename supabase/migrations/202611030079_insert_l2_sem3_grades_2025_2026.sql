-- Migration 202611030079_insert_l2_sem3_grades_2025_2026.sql
-- Insertion des 11 matières, maquettes, affectations et notes réelles du Semestre 3 (Licence 2 - Année 2025-2026)

begin;

-- Désactivation temporaire des contrôles d'activité annuelle et de suppression pour l'insertion de l'année 2025-2026
alter table escen.teaching_assignments disable trigger annual_activity_guard;
alter table escen.evaluations disable trigger annual_activity_guard;
alter table escen.evaluations disable trigger evaluation_state_guard;
alter table escen.evaluation_candidates disable trigger annual_activity_guard;
alter table escen.evaluation_candidates disable trigger candidate_guard;
alter table escen.grades disable trigger annual_activity_guard;
alter table escen.grades disable trigger grade_guard;
alter table escen.evaluation_transitions disable trigger annual_activity_guard;
alter table escen.evaluation_transitions disable trigger evaluation_transition;
alter table escen.curriculum_components disable trigger no_delete;
alter table escen.teaching_units disable trigger no_delete;

do $$
declare
  v_admin_id uuid := '43ce07c4-bb38-5c56-85e6-70e2ffa5b909';
  v_year_2025_id uuid;
  v_teacher_id uuid;
  v_group_id uuid := '781d5488-2252-53c5-8684-96ab00399901'; -- L2 TRONC COMMUN
  v_mpn_offering_id uuid := 'fe06d7d3-573f-59d7-af21-995ff88ddce2'; -- MPN L2 2025-2026
  v_curr record;
  v_sem_id uuid;
  v_unit_id uuid;
  v_comp_id uuid;
  v_subj_id uuid;
  v_assignment_id uuid;
  v_eval_devoir_id uuid;
  v_eval_partiel_id uuid;
  v_cand_devoir_id uuid;
  v_cand_partiel_id uuid;
  v_enrollment record;
begin
  select id into v_year_2025_id from escen.academic_years where code = '2025-2026';
  if v_year_2025_id is null then
    insert into escen.academic_years (id, code, name, starts_on, ends_on, status)
    values ('254d1710-5f3c-4233-bd75-48b321eb1958', '2025-2026', '2025-2026', '2025-09-01', '2026-07-31', 'EN_CLOTURE')
    on conflict (code) do update set name = excluded.name
    returning id into v_year_2025_id;
  end if;
  select id into v_teacher_id from escen.teachers limit 1;

  -- 1. Insérer les 11 matières dans escen.subjects (rattachées à l'année 2025-2026)
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'ANG 201', 'ANGLAIS COMMERCIALE', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'MKG 201', 'TECHNIQUE EN MARKETING DIGITALE', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'INF 202', 'INFOGRAPHIE', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'CPT 201', 'ANALYSE DES COÛTS', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'MKG 202', 'E-COMMERCE & RÉFÉRENCEMENT', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'INF 203', 'DIGITALISATION DES SECTEURS DU NUMÉRIQUE', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'INF 204', 'TECHNOLOGIE DIGITALE AVANCÉE', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'MTH 201', 'STATISTIQUES DES SÉRIES CHRONOLOGIQUES', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'INF 205', 'THÉORIE DES BASES DE DONNÉES', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'DRT 201', 'DROIT DES AFFAIRES', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, 'ECN 2110', 'GESTION DE PROJET', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;

  -- 2. Pour chaque maquette L2 (FD, MDE, MPN, IA-GL) : insérer les 11 UE et composants
  for v_curr in (
    select c.id as curriculum_id, cs.id as semester_id
    from escen.curricula c
    join escen.levels l on l.id = c.level_id
    join escen.curriculum_semesters cs on cs.curriculum_id = c.id
    where l.code = 'L2' and c.version = 1 and cs.position = 1
  ) loop

    -- UE et Composant: ANG 201
    select id into v_subj_id from escen.subjects where code = 'ANG 201' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'ANG 201', 'ANGLAIS COMMERCIALE', 3.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'ANG 201', 3.000, 3.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
    -- UE et Composant: MKG 201
    select id into v_subj_id from escen.subjects where code = 'MKG 201' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'MKG 201', 'TECHNIQUE EN MARKETING DIGITALE', 3.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'MKG 201', 3.000, 3.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
    -- UE et Composant: INF 202
    select id into v_subj_id from escen.subjects where code = 'INF 202' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'INF 202', 'INFOGRAPHIE', 2.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'INF 202', 2.000, 2.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
    -- UE et Composant: CPT 201
    select id into v_subj_id from escen.subjects where code = 'CPT 201' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'CPT 201', 'ANALYSE DES COÛTS', 2.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'CPT 201', 2.000, 2.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
    -- UE et Composant: MKG 202
    select id into v_subj_id from escen.subjects where code = 'MKG 202' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'MKG 202', 'E-COMMERCE & RÉFÉRENCEMENT', 3.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'MKG 202', 3.000, 3.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
    -- UE et Composant: INF 203
    select id into v_subj_id from escen.subjects where code = 'INF 203' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'INF 203', 'DIGITALISATION DES SECTEURS DU NUMÉRIQUE', 3.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'INF 203', 3.000, 3.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
    -- UE et Composant: INF 204
    select id into v_subj_id from escen.subjects where code = 'INF 204' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'INF 204', 'TECHNOLOGIE DIGITALE AVANCÉE', 3.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'INF 204', 3.000, 3.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
    -- UE et Composant: MTH 201
    select id into v_subj_id from escen.subjects where code = 'MTH 201' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'MTH 201', 'STATISTIQUES DES SÉRIES CHRONOLOGIQUES', 2.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'MTH 201', 2.000, 2.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
    -- UE et Composant: INF 205
    select id into v_subj_id from escen.subjects where code = 'INF 205' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'INF 205', 'THÉORIE DES BASES DE DONNÉES', 3.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'INF 205', 3.000, 3.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
    -- UE et Composant: DRT 201
    select id into v_subj_id from escen.subjects where code = 'DRT 201' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'DRT 201', 'DROIT DES AFFAIRES', 3.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'DRT 201', 3.000, 3.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
    -- UE et Composant: ECN 2110
    select id into v_subj_id from escen.subjects where code = 'ECN 2110' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, 'ECN 2110', 'GESTION DE PROJET', 3.00)
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, 'ECN 2110', 3.000, 3.00)
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
  end loop;

  -- 3. Rattacher l'offre L2 de MESSAN et TOHENOU au curriculum MPN L2 2025-2026
  update escen.academic_offerings
  set curriculum_id = 'f825ef4b-5a6d-5f61-bc95-36db74cf2ae3'
  where id = '7f985bf1-c0f0-5202-a8ba-7d0aabccead9' and curriculum_id is null;

  -- Vérifier le rattachement des inscriptions L2 au groupe L2 TRONC COMMUN
  insert into escen.enrollment_groups (enrollment_id, offering_id, group_id, valid_from, changed_by, reason)
  select e.id, e.offering_id, v_group_id, '2025-10-01'::date, v_admin_id, 'Affectation au groupe L2 Tronc Commun'
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.levels l on l.id = o.level_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and not exists (
      select 1 from escen.enrollment_groups eg where eg.enrollment_id = e.id and eg.group_id = v_group_id
    );

end $$;

-- 4. Insertion des affectations d'enseignement, évaluations et notes
do $$
declare
  v_admin_id uuid := '43ce07c4-bb38-5c56-85e6-70e2ffa5b909';
  v_teacher_id uuid;
  v_group_id uuid := '781d5488-2252-53c5-8684-96ab00399901';
  v_assignment_id uuid;
  v_eval_devoir_id uuid;
  v_eval_partiel_id uuid;
  v_cand_devoir_id uuid;
  v_cand_partiel_id uuid;
  v_offering record;
  v_comp record;
begin
  select id into v_teacher_id from escen.teachers limit 1;

  -- Pour chacune des 3 offres d'études contenant nos étudiants (FD, MDE, MPN) :
  for v_offering in (
    select o.id as offering_id, o.curriculum_id, p.code as program_code
    from escen.academic_offerings o
    join escen.academic_years ay on ay.id = o.academic_year_id
    join escen.levels l on l.id = o.level_id
    join escen.curricula c on c.id = o.curriculum_id
    join escen.programs p on p.id = c.program_id
    where ay.code = '2025-2026' and l.code = 'L2' and p.code in ('FD', 'MDE', 'MPN')
  ) loop

    for v_comp in (
      select cc.id as component_id, cc.code, s.name as subject_name
      from escen.curriculum_components cc
      join escen.subjects s on s.id = cc.subject_id
      join escen.teaching_units tu on tu.id = cc.unit_id
      join escen.curriculum_semesters cs on cs.id = tu.semester_id
      where cc.curriculum_id = v_offering.curriculum_id and cs.position = 1
    ) loop
      -- Créer ou récupérer l'affectation d'enseignement
      select id into v_assignment_id
      from escen.teaching_assignments
      where offering_id = v_offering.offering_id and component_id = v_comp.component_id and group_id = v_group_id;

      if v_assignment_id is null then
        insert into escen.teaching_assignments (
          teacher_id, offering_id, group_id, curriculum_id, component_id, valid_from
        ) values (
          v_teacher_id, v_offering.offering_id, v_group_id, v_offering.curriculum_id, v_comp.component_id, '2025-10-01'::date
        ) returning id into v_assignment_id;
      end if;

      -- Créer ou récupérer l'évaluation DEVOIR
      select id into v_eval_devoir_id
      from escen.evaluations
      where offering_id = v_offering.offering_id and component_id = v_comp.component_id and kind = 'DEVOIR';

      if v_eval_devoir_id is null then
        insert into escen.evaluations (
          assignment_id, offering_id, component_id, name, kind, status, created_by
        ) values (
          v_assignment_id, v_offering.offering_id, v_comp.component_id, 'Devoir · ' || v_comp.code, 'DEVOIR', 'PUBLIEES', v_admin_id
        ) returning id into v_eval_devoir_id;

        insert into escen.evaluation_transitions (evaluation_id, from_status, to_status, actor_id, reason)
        values
          (v_eval_devoir_id, 'BROUILLON', 'SAISIES', v_admin_id, 'Saisie des notes de contrôle continu'),
          (v_eval_devoir_id, 'SAISIES', 'SOUMISES', v_admin_id, 'Soumission des notes de contrôle continu'),
          (v_eval_devoir_id, 'SOUMISES', 'VALIDEES', v_admin_id, 'Validation académique'),
          (v_eval_devoir_id, 'VALIDEES', 'PUBLIEES', v_admin_id, 'Publication des résultats officiels Semestre 3');
      end if;

      -- Créer ou récupérer l'évaluation EXAMEN (Partiel)
      select id into v_eval_partiel_id
      from escen.evaluations
      where offering_id = v_offering.offering_id and component_id = v_comp.component_id and kind = 'EXAMEN';

      if v_eval_partiel_id is null then
        insert into escen.evaluations (
          assignment_id, offering_id, component_id, name, kind, status, created_by
        ) values (
          v_assignment_id, v_offering.offering_id, v_comp.component_id, 'Partiel · ' || v_comp.code, 'EXAMEN', 'PUBLIEES', v_admin_id
        ) returning id into v_eval_partiel_id;

        insert into escen.evaluation_transitions (evaluation_id, from_status, to_status, actor_id, reason)
        values
          (v_eval_partiel_id, 'BROUILLON', 'SAISIES', v_admin_id, 'Saisie des notes de partiel'),
          (v_eval_partiel_id, 'SAISIES', 'SOUMISES', v_admin_id, 'Soumission des notes de partiel'),
          (v_eval_partiel_id, 'SOUMISES', 'VALIDEES', v_admin_id, 'Validation académique'),
          (v_eval_partiel_id, 'VALIDEES', 'PUBLIEES', v_admin_id, 'Publication des résultats officiels Semestre 3');
      end if;

    end loop;
  end loop;

end $$;

-- 5. Candidats et notes pour les 9 étudiants
do $$
declare
  v_admin_id uuid := '43ce07c4-bb38-5c56-85e6-70e2ffa5b909';
  v_student_id uuid;
  v_enrollment_id uuid;
  v_offering_id uuid;
  v_component_id uuid;
  v_eval_devoir_id uuid;
  v_eval_partiel_id uuid;
  v_cand_devoir_id uuid;
  v_cand_partiel_id uuid;
begin

  -- =========================================================================
  -- Étudiant : ADJIGNON Komi Del Pierro (Matricule: 004-ESC-2024)
  -- =========================================================================
  select s.id, e.id, e.offering_id into v_student_id, v_enrollment_id, v_offering_id
  from escen.students s
  join escen.enrollments e on e.student_id = s.id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  join escen.levels l on l.id = o.level_id
  join escen.people p on p.id = s.person_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and s.matricule in ('004-ESC-2024', replace('004-ESC-2024', '2025', '2O25'));

  -- Matière ANG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ANG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (11)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (10.25)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 10.25, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (11)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière CPT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'CPT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (11)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (11)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 203
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 203';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (15)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (15)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 204
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 204';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (11)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (4.75)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 4.75, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MTH 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MTH 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 205
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 205';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (14)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière DRT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'DRT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (15)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (15)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière ECN 2110
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ECN 2110';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (17)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (10)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 10.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- =========================================================================
  -- Étudiant : GABA Ayélé Daniella Gracia (Matricule: 006-ESC-2024)
  -- =========================================================================
  select s.id, e.id, e.offering_id into v_student_id, v_enrollment_id, v_offering_id
  from escen.students s
  join escen.enrollments e on e.student_id = s.id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  join escen.levels l on l.id = o.level_id
  join escen.people p on p.id = s.person_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and s.matricule in ('006-ESC-2024', replace('006-ESC-2024', '2025', '2O25'));

  -- Matière ANG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ANG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (17)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (11)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière CPT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'CPT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (10)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 10.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (16)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 203
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 203';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (16)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (16)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 204
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 204';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13.75)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.75, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MTH 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MTH 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (17)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 205
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 205';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (16)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière DRT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'DRT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (10)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 10.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière ECN 2110
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ECN 2110';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (17)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12.5)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.50, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- =========================================================================
  -- Étudiant : GNALETASSI Ayawo Boris (Matricule: 024-ESC-2025)
  -- =========================================================================
  select s.id, e.id, e.offering_id into v_student_id, v_enrollment_id, v_offering_id
  from escen.students s
  join escen.enrollments e on e.student_id = s.id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  join escen.levels l on l.id = o.level_id
  join escen.people p on p.id = s.person_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and s.matricule in ('024-ESC-2025', replace('024-ESC-2025', '2025', '2O25'));

  -- Matière ANG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ANG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (15)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (0)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (0)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (0)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (0)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière CPT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'CPT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (10)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 10.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (0)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (0)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (0)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 203
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 203';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (0)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (0)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 204
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 204';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (0)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (0)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MTH 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MTH 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (19)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 19.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (0)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 205
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 205';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (0)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (0)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière DRT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'DRT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (0)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (0)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière ECN 2110
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ECN 2110';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (18)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 18.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (0)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- =========================================================================
  -- Étudiant : GUIHINI Fatimé (Matricule: 003-ESC-2024)
  -- =========================================================================
  select s.id, e.id, e.offering_id into v_student_id, v_enrollment_id, v_offering_id
  from escen.students s
  join escen.enrollments e on e.student_id = s.id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  join escen.levels l on l.id = o.level_id
  join escen.people p on p.id = s.person_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and s.matricule in ('003-ESC-2024', replace('003-ESC-2024', '2025', '2O25'));

  -- Matière ANG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ANG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (15)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (16)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (16)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière CPT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'CPT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (10)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 10.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (19)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 19.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 203
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 203';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (18)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 18.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (18)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 18.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 204
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 204';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MTH 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MTH 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (18)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 18.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 205
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 205';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (14)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière DRT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'DRT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (16)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière ECN 2110
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ECN 2110';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (17)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (17.75)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 17.75, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- =========================================================================
  -- Étudiant : KESSOUGBO Amavi (Matricule: 009-ESC-2024)
  -- =========================================================================
  select s.id, e.id, e.offering_id into v_student_id, v_enrollment_id, v_offering_id
  from escen.students s
  join escen.enrollments e on e.student_id = s.id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  join escen.levels l on l.id = o.level_id
  join escen.people p on p.id = s.person_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and s.matricule in ('009-ESC-2024', replace('009-ESC-2024', '2025', '2O25'));

  -- Matière ANG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ANG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (11)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (9)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 9.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière CPT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'CPT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (10)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 10.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 203
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 203';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (17)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (17)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 204
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 204';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MTH 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MTH 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 205
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 205';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (8)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 8.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière DRT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'DRT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (8)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 8.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière ECN 2110
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ECN 2110';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (18)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 18.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (11.5)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 11.50, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- =========================================================================
  -- Étudiant : LOGOSSOU Ami Sika Sandra (Matricule: 013-ESC-2024)
  -- =========================================================================
  select s.id, e.id, e.offering_id into v_student_id, v_enrollment_id, v_offering_id
  from escen.students s
  join escen.enrollments e on e.student_id = s.id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  join escen.levels l on l.id = o.level_id
  join escen.people p on p.id = s.person_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and s.matricule in ('013-ESC-2024', replace('013-ESC-2024', '2025', '2O25'));

  -- Matière ANG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ANG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (11.25)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 11.25, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (17)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (11)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière CPT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'CPT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (14)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (16)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 203
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 203';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (16)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (16)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 204
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 204';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (10.5)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 10.50, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (15.75)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 15.75, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MTH 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MTH 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (16)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (9)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 9.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 205
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 205';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13.5)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.50, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (15)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière DRT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'DRT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (6)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 6.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière ECN 2110
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ECN 2110';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (17)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13.5)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.50, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- =========================================================================
  -- Étudiant : MESSAN Dédé Egnonam Aubine (Matricule: 002-ESC-2024)
  -- =========================================================================
  select s.id, e.id, e.offering_id into v_student_id, v_enrollment_id, v_offering_id
  from escen.students s
  join escen.enrollments e on e.student_id = s.id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  join escen.levels l on l.id = o.level_id
  join escen.people p on p.id = s.person_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and s.matricule in ('002-ESC-2024', replace('002-ESC-2024', '2025', '2O25'));

  -- Matière ANG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ANG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (10)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 10.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (10)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 10.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière CPT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'CPT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (9)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 9.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (11)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 203
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 203';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (16)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (16)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 204
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 204';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (11.75)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 11.75, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (9.5)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 9.50, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MTH 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MTH 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (8)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 8.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (17)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 205
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 205';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12.5)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.50, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (10)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 10.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière DRT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'DRT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (6)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 6.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (4)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 4.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière ECN 2110
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ECN 2110';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (17)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- =========================================================================
  -- Étudiant : TOHENOU Kokou Espoir (Matricule: 021-ESC-2025)
  -- =========================================================================
  select s.id, e.id, e.offering_id into v_student_id, v_enrollment_id, v_offering_id
  from escen.students s
  join escen.enrollments e on e.student_id = s.id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  join escen.levels l on l.id = o.level_id
  join escen.people p on p.id = s.person_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and s.matricule in ('021-ESC-2025', replace('021-ESC-2025', '2025', '2O25'));

  -- Matière ANG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ANG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (11)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (0)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 0.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (11.75)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 11.75, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12.5)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.50, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière CPT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'CPT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (9)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 9.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (6)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 6.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (14)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 203
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 203';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (14)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 204
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 204';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (14)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (11.75)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 11.75, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MTH 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MTH 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (18)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 18.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (4)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 4.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 205
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 205';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (15)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (9)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 9.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière DRT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'DRT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (6)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 6.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (1)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 1.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière ECN 2110
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ECN 2110';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (18)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 18.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- =========================================================================
  -- Étudiant : TONOU Kossiwa Léontine (Matricule: 011-ESC-2024)
  -- =========================================================================
  select s.id, e.id, e.offering_id into v_student_id, v_enrollment_id, v_offering_id
  from escen.students s
  join escen.enrollments e on e.student_id = s.id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  join escen.levels l on l.id = o.level_id
  join escen.people p on p.id = s.person_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and s.matricule in ('011-ESC-2024', replace('011-ESC-2024', '2025', '2O25'));

  -- Matière ANG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ANG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (11)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (15.5)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 15.50, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (12)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière CPT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'CPT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (16)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 16.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MKG 202
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MKG 202';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (12)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 12.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (9)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 9.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 203
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 203';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (15)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (15)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 204
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 204';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (11)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (13)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière MTH 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'MTH 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (17)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (17)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 17.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière INF 205
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'INF 205';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (13)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 13.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (15)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 15.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière DRT 201
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'DRT 201';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (10)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 10.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (14)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 14.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Matière ECN 2110
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = 'ECN 2110';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (18)
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, 18.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (11)
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, 11.00, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

end $$;

-- Réactivation des triggers
alter table escen.teaching_units enable trigger no_delete;
alter table escen.curriculum_components enable trigger no_delete;
alter table escen.evaluation_transitions enable trigger evaluation_transition;
alter table escen.evaluation_transitions enable trigger annual_activity_guard;
alter table escen.grades enable trigger grade_guard;
alter table escen.grades enable trigger annual_activity_guard;
alter table escen.evaluation_candidates enable trigger candidate_guard;
alter table escen.evaluation_candidates enable trigger annual_activity_guard;
alter table escen.evaluations enable trigger evaluation_state_guard;
alter table escen.evaluations enable trigger annual_activity_guard;
alter table escen.teaching_assignments enable trigger annual_activity_guard;

commit;

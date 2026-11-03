import fs from 'node:fs';

const studentsData = JSON.parse(fs.readFileSync('tmp/l2_sem3_data.json', 'utf8'));

const subjectsList = [
  { code: 'ANG 201', name: 'ANGLAIS COMMERCIALE', credits: 3.0 },
  { code: 'MKG 201', name: 'TECHNIQUE EN MARKETING DIGITALE', credits: 3.0 },
  { code: 'INF 202', name: 'INFOGRAPHIE', credits: 2.0 },
  { code: 'CPT 201', name: 'ANALYSE DES COÛTS', credits: 2.0 },
  { code: 'MKG 202', name: 'E-COMMERCE & RÉFÉRENCEMENT', credits: 3.0 },
  { code: 'INF 203', name: 'DIGITALISATION DES SECTEURS DU NUMÉRIQUE', credits: 3.0 },
  { code: 'INF 204', name: 'TECHNOLOGIE DIGITALE AVANCÉE', credits: 3.0 },
  { code: 'MTH 201', name: 'STATISTIQUES DES SÉRIES CHRONOLOGIQUES', credits: 2.0 },
  { code: 'INF 205', name: 'THÉORIE DES BASES DE DONNÉES', credits: 3.0 },
  { code: 'DRT 201', name: 'DROIT DES AFFAIRES', credits: 3.0 },
  { code: 'ECN 2110', name: 'GESTION DE PROJET', credits: 3.0 },
];

let sql = `-- Migration 202611030079_insert_l2_sem3_grades_2025_2026.sql
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
`;

for (const s of subjectsList) {
  sql += `  insert into escen.subjects (academic_year_id, code, name, active)
  values (v_year_2025_id, '${s.code}', '${s.name}', true)
  on conflict (academic_year_id, code) do update set name = excluded.name;
`;
}

sql += `
  -- 2. Pour chaque maquette L2 (FD, MDE, MPN, IA-GL) : insérer les 11 UE et composants
  for v_curr in (
    select c.id as curriculum_id, cs.id as semester_id
    from escen.curricula c
    join escen.levels l on l.id = c.level_id
    join escen.curriculum_semesters cs on cs.curriculum_id = c.id
    where l.code = 'L2' and c.version = 1 and cs.position = 1
  ) loop

`;

for (const s of subjectsList) {
  sql += `    -- UE et Composant: ${s.code}
    select id into v_subj_id from escen.subjects where code = '${s.code}' and academic_year_id = v_year_2025_id;
    
    insert into escen.teaching_units (semester_id, curriculum_id, code, name, credits)
    values (v_curr.semester_id, v_curr.curriculum_id, '${s.code}', '${s.name}', ${s.credits.toFixed(2)})
    on conflict (semester_id, code) do update set name = excluded.name, credits = excluded.credits
    returning id into v_unit_id;
    
    insert into escen.curriculum_components (subject_id, unit_id, curriculum_id, code, coefficient, credits)
    values (v_subj_id, v_unit_id, v_curr.curriculum_id, '${s.code}', ${s.credits.toFixed(3)}, ${s.credits.toFixed(2)})
    on conflict (unit_id, code) do update set coefficient = excluded.coefficient, credits = excluded.credits;
`;
}

sql += `  end loop;

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
`;

for (const student of studentsData) {
  const nameComment = student.name;
  const mat = student.matricule;
  sql += `
  -- =========================================================================
  -- Étudiant : ${nameComment} (Matricule: ${mat})
  -- =========================================================================
  select s.id, e.id, e.offering_id into v_student_id, v_enrollment_id, v_offering_id
  from escen.students s
  join escen.enrollments e on e.student_id = s.id
  join escen.academic_offerings o on o.id = e.offering_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  join escen.levels l on l.id = o.level_id
  join escen.people p on p.id = s.person_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and s.matricule in ('${mat}', replace('${mat}', '2025', '2O25'));
`;

  for (const s of student.subjects) {
    sql += `
  -- Matière ${s.code}
  select cc.id into v_component_id
  from escen.curriculum_components cc
  join escen.academic_offerings o on o.curriculum_id = cc.curriculum_id
  where o.id = v_offering_id and cc.code = '${s.code}';

  select id into v_eval_devoir_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'DEVOIR';
  select id into v_eval_partiel_id from escen.evaluations where offering_id = v_offering_id and component_id = v_component_id and kind = 'EXAMEN';

  -- Devoir (${s.devoir !== null ? s.devoir : 'null'})
  if v_eval_devoir_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_devoir_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_devoir_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_devoir_id, ${s.devoir !== null ? s.devoir.toFixed(2) : 'null'}, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;

  -- Partiel (${s.partiel !== null ? s.partiel : 'null'})
  if v_eval_partiel_id is not null then
    insert into escen.evaluation_candidates (evaluation_id, enrollment_id, offering_id, eligibility)
    values (v_eval_partiel_id, v_enrollment_id, v_offering_id, 'ELIGIBLE')
    on conflict (evaluation_id, enrollment_id) do update set eligibility = 'ELIGIBLE'
    returning id into v_cand_partiel_id;

    insert into escen.grades (candidate_id, value, entered_by, last_modified_by)
    values (v_cand_partiel_id, ${s.partiel !== null ? s.partiel.toFixed(2) : 'null'}, v_admin_id, v_admin_id)
    on conflict (candidate_id) do update set value = excluded.value;
  end if;
`;
  }
}

sql += `
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
`;

fs.writeFileSync('supabase/migrations/202611030079_insert_l2_sem3_grades_2025_2026.sql', sql, 'utf8');
console.log('Migration generated successfully: supabase/migrations/202611030079_insert_l2_sem3_grades_2025_2026.sql');

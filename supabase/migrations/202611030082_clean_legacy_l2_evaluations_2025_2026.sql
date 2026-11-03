-- Migration 202611030082_clean_legacy_l2_evaluations_2025_2026.sql
-- Nettoyage des évaluations fictives/incomplètes en Licence 2 pour l'année 2025-2026 :
-- - DIGITALISATION DES TRANSFERTS / PAYEMENT INTERNATIONAUX
-- - DIGITALISATION DES PAIEMENTS DE L’ÉTAT
-- - MICROFINANCE ET INCLUSION FINANCIÈRE
-- Conservation stricte et exclusive des 11 matières officielles de L2 Tronc Commun (2025-2026)

begin;

-- Désactivation temporaire des triggers de protection
alter table escen.grades disable trigger no_delete;
alter table escen.grades disable trigger grade_guard;
alter table escen.evaluation_candidates disable trigger no_delete;
alter table escen.evaluation_candidates disable trigger candidate_guard;
alter table escen.evaluations disable trigger no_delete;
alter table escen.evaluations disable trigger evaluation_state_guard;
alter table escen.evaluations disable trigger recovery_evidence;
alter table escen.evaluations disable trigger annual_activity_guard;
alter table escen.evaluation_transitions disable trigger no_delete;
alter table escen.evaluation_transitions disable trigger annual_activity_guard;
alter table escen.teaching_assignments disable trigger no_delete;
alter table escen.teaching_assignments disable trigger annual_activity_guard;
alter table escen.curriculum_components disable trigger no_delete;
alter table escen.curriculum_components disable trigger component_guard;
alter table escen.teaching_units disable trigger no_delete;
alter table escen.teaching_units disable trigger unit_guard;

do $$
declare
  v_eval_ids uuid[];
  v_cand_ids uuid[];
begin
  -- 1. Récupérer toutes les évaluations hors tronc commun officiel (11 matières) pour L2 2025-2026
  select coalesce(array_agg(distinct ev.id), array[]::uuid[]) into v_eval_ids
  from escen.evaluations ev
  join escen.academic_offerings o on o.id = ev.offering_id
  join escen.levels l on l.id = o.level_id
  join escen.academic_years ay on ay.id = o.academic_year_id
  where ay.code = '2025-2026' and l.code = 'L2'
    and (
      ev.name ilike '%DIGITALISATION DES TRANSFERTS%'
      or ev.name ilike '%DIGITALISATION DES PAIEMENTS%'
      or ev.name ilike '%MICROFINANCE%'
      or ev.name ilike '%GESTION DES RISQUES%'
      or ev.name ilike '%GRFD%'
    );

  if array_length(v_eval_ids, 1) > 0 then
    -- Candidats associés
    select coalesce(array_agg(distinct ec.id), array[]::uuid[]) into v_cand_ids
    from escen.evaluation_candidates ec
    where ec.evaluation_id = any(v_eval_ids);

    -- Supprimer les notes
    if array_length(v_cand_ids, 1) > 0 then
      delete from escen.grades where candidate_id = any(v_cand_ids);
    end if;

    -- Supprimer les candidats
    delete from escen.evaluation_candidates where evaluation_id = any(v_eval_ids);

    -- Supprimer les transitions d'évaluation
    delete from escen.evaluation_transitions where evaluation_id = any(v_eval_ids);

    -- Supprimer les évaluations
    delete from escen.evaluations where id = any(v_eval_ids);
  end if;

  -- 2. Supprimer les affectations d'enseignement orphelines de ces matières pour L2 2025-2026
  delete from escen.teaching_assignments ta
  using escen.academic_offerings o, escen.levels l, escen.academic_years ay
  where ta.offering_id = o.id
    and o.level_id = l.id
    and o.academic_year_id = ay.id
    and ay.code = '2025-2026' and l.code = 'L2'
    and not exists (select 1 from escen.evaluations ev where ev.assignment_id = ta.id);

  -- 3. Supprimer les composants de maquette correspondants pour L2
  delete from escen.curriculum_components cc
  using escen.curricula c, escen.levels l
  where cc.curriculum_id = c.id
    and c.level_id = l.id
    and l.code = 'L2'
    and cc.code in ('UE 12-40', 'UE10-42', 'GRFD-38');

  -- 4. Supprimer les unités d'enseignement de maquette correspondantes pour L2
  delete from escen.teaching_units tu
  using escen.curricula c, escen.levels l
  where tu.curriculum_id = c.id
    and c.level_id = l.id
    and l.code = 'L2'
    and tu.code in ('UE 12-40', 'UE10-42', 'GRFD-38');

end $$;

-- Réactivation des triggers
alter table escen.teaching_units enable trigger unit_guard;
alter table escen.teaching_units enable trigger no_delete;
alter table escen.curriculum_components enable trigger component_guard;
alter table escen.curriculum_components enable trigger no_delete;
alter table escen.teaching_assignments enable trigger annual_activity_guard;
alter table escen.teaching_assignments enable trigger no_delete;
alter table escen.evaluation_transitions enable trigger annual_activity_guard;
alter table escen.evaluation_transitions enable trigger no_delete;
alter table escen.evaluations enable trigger annual_activity_guard;
alter table escen.evaluations enable trigger recovery_evidence;
alter table escen.evaluations enable trigger evaluation_state_guard;
alter table escen.evaluations enable trigger no_delete;
alter table escen.evaluation_candidates enable trigger candidate_guard;
alter table escen.evaluation_candidates enable trigger no_delete;
alter table escen.grades enable trigger grade_guard;
alter table escen.grades enable trigger no_delete;

commit;

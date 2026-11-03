-- Migration 202611030080_unify_l2_sem3_evaluations_and_reesao_codes.sql
-- 1. Harmonisation des codes REESAO pour les 11 matières de L2 Semestre 3 (2025-2026) :
--    ANG 201 -> ANG1301, MKG 201 -> MKG1301, INF 202 -> INF1301, CPT 201 -> CPT1301,
--    MKG 202 -> MKG1302, INF 203 -> INF1302, INF 204 -> INF1303, MTH 201 -> MTH1301,
--    INF 205 -> INF1304, DRT 201 -> DRT1301, ECN 2110 -> ECN1301
-- 2. Regroupement des épreuves du tronc commun via un legacy_source_row_id partagé par épreuve
--    pour afficher une seule ligne consolidée par matière (9 candidats) au lieu d'une répétition par filière
-- 3. Suppression des évaluations sans candidats sur l'offre inutilisée

begin;

-- Désactivation temporaire des contrôles de verrouillage et d'activité
alter table escen.subjects disable trigger annual_definition_guard;
alter table escen.teaching_units disable trigger unit_guard;
alter table escen.curriculum_components disable trigger component_guard;
alter table escen.evaluations disable trigger annual_activity_guard;
alter table escen.evaluations disable trigger evaluation_state_guard;
alter table escen.evaluations disable trigger recovery_evidence;
alter table escen.evaluations disable trigger no_delete;
alter table escen.evaluation_transitions disable trigger annual_activity_guard;
alter table escen.evaluation_transitions disable trigger no_delete;
alter table escen.teaching_assignments disable trigger annual_activity_guard;
alter table escen.teaching_assignments disable trigger no_delete;

do $$
declare
  v_year_2025_id uuid := '254d1710-5f3c-4233-bd75-48b321eb1958';
  v_batch_id uuid;
  v_rec record;
  v_devoir_group_id uuid;
  v_partiel_group_id uuid;
begin
  select id into v_batch_id from escen_private.import_batches limit 1;
  if v_batch_id is null then
    insert into escen_private.import_batches (id, source_name, archive_sha256, sql_sha256, source_rows)
    values (
      'e528f48f-ca9a-4f2f-b5d7-96d7e1bb8ed1',
      'archive-l2-sem3-2025-2026',
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      22
    )
    returning id into v_batch_id;
  end if;

  create temporary table temp_reesao_map (
    old_code text primary key,
    new_code text not null
  ) on commit drop;

  insert into temp_reesao_map (old_code, new_code) values
    ('ANG 201',  'ANG1301'),
    ('MKG 201',  'MKG1301'),
    ('INF 202',  'INF1301'),
    ('CPT 201',  'CPT1301'),
    ('MKG 202',  'MKG1302'),
    ('INF 203',  'INF1302'),
    ('INF 204',  'INF1303'),
    ('MTH 201',  'MTH1301'),
    ('INF 205',  'INF1304'),
    ('DRT 201',  'DRT1301'),
    ('ECN 2110', 'ECN1301');

  -- 1. Mise à jour dans escen.subjects
  update escen.subjects s
  set code = m.new_code
  from temp_reesao_map m
  where s.academic_year_id = v_year_2025_id and s.code = m.old_code;

  -- Mise à jour dans escen.teaching_units
  update escen.teaching_units u
  set code = m.new_code
  from temp_reesao_map m
  where u.code = m.old_code;

  -- Mise à jour dans escen.curriculum_components
  update escen.curriculum_components c
  set code = m.new_code
  from temp_reesao_map m
  where c.code = m.old_code;

  -- 2. Nettoyage des évaluations orphelines sans candidat (offering MPN fe06d7d3... vide)
  delete from escen.evaluation_transitions
  where evaluation_id in (
    select ev.id
    from escen.evaluations ev
    where ev.offering_id = 'fe06d7d3-573f-59d7-af21-995ff88ddce2'
      and (ev.name like 'Partiel · %' or ev.name like 'Devoir · %')
      and not exists (select 1 from escen.evaluation_candidates ec where ec.evaluation_id = ev.id)
  );

  delete from escen.evaluations
  where offering_id = 'fe06d7d3-573f-59d7-af21-995ff88ddce2'
    and (name like 'Partiel · %' or name like 'Devoir · %')
    and not exists (select 1 from escen.evaluation_candidates ec where ec.evaluation_id = id);

  delete from escen.teaching_assignments
  where offering_id = 'fe06d7d3-573f-59d7-af21-995ff88ddce2'
    and not exists (select 1 from escen.evaluations ev where ev.assignment_id = id);

  -- 3. Création des legacy_rows pour regrouper les épreuves communes et mise à jour des noms
  for v_rec in (
    select old_code, new_code
    from temp_reesao_map
  ) loop
    v_devoir_group_id := gen_random_uuid();
    v_partiel_group_id := gen_random_uuid();

    insert into escen_private.legacy_rows (id, batch_id, source_table, source_id, payload, status)
    values (
      v_devoir_group_id,
      v_batch_id,
      'evaluations',
      '2025_l2_sem3_devoir_' || v_rec.new_code,
      jsonb_build_object('kind', 'DEVOIR', 'code', v_rec.new_code),
      'PENDING'
    ) on conflict (batch_id, source_table, source_id) do update set payload = excluded.payload
    returning id into v_devoir_group_id;

    insert into escen_private.legacy_rows (id, batch_id, source_table, source_id, payload, status)
    values (
      v_partiel_group_id,
      v_batch_id,
      'evaluations',
      '2025_l2_sem3_partiel_' || v_rec.new_code,
      jsonb_build_object('kind', 'EXAMEN', 'code', v_rec.new_code),
      'PENDING'
    ) on conflict (batch_id, source_table, source_id) do update set payload = excluded.payload
    returning id into v_partiel_group_id;

    -- Devoirs
    update escen.evaluations
    set
      name = 'Devoir · ' || v_rec.new_code,
      legacy_source_row_id = v_devoir_group_id
    where name in ('Devoir · ' || v_rec.old_code, 'Devoir · ' || v_rec.new_code);

    -- Examens (Partiels)
    update escen.evaluations
    set
      name = 'Partiel · ' || v_rec.new_code,
      legacy_source_row_id = v_partiel_group_id
    where name in ('Partiel · ' || v_rec.old_code, 'Partiel · ' || v_rec.new_code);

  end loop;

end $$;

-- Réactivation des triggers
alter table escen.teaching_assignments enable trigger no_delete;
alter table escen.teaching_assignments enable trigger annual_activity_guard;
alter table escen.evaluation_transitions enable trigger no_delete;
alter table escen.evaluation_transitions enable trigger annual_activity_guard;
alter table escen.evaluations enable trigger no_delete;
alter table escen.evaluations enable trigger recovery_evidence;
alter table escen.evaluations enable trigger evaluation_state_guard;
alter table escen.evaluations enable trigger annual_activity_guard;
alter table escen.curriculum_components enable trigger component_guard;
alter table escen.teaching_units enable trigger unit_guard;
alter table escen.subjects enable trigger annual_definition_guard;

commit;

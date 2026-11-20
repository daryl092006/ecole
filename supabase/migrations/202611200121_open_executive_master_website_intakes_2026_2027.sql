-- Migration : Ouverture des 3 filières Executive Master (Marketing, Finance, Management) aux inscriptions du site pour 2026-2027
BEGIN;

DO $$
DECLARE
  v_year_id uuid;
  v_em_level_id uuid;
  v_prog record;
  v_curriculum_id uuid;
  v_offering_id uuid;
  v_next_version integer;
BEGIN
  SELECT id INTO v_year_id
  FROM escen.academic_years
  WHERE code = '2026-2027' AND archived_at IS NULL
  LIMIT 1;

  SELECT id INTO v_em_level_id
  FROM escen.levels
  WHERE code = 'EM' AND archived_at IS NULL
  LIMIT 1;

  IF v_year_id IS NULL OR v_em_level_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_prog IN
    SELECT id, code, name
    FROM escen.programs
    WHERE code IN ('MDE', 'FD', 'MP-TD')
      AND archived_at IS NULL
    ORDER BY code
  LOOP
    -- 1. Vérifier ou créer l'offre académique 2026-2027 pour (Executive Master, Filière)
    v_offering_id := NULL;
    SELECT o.id INTO v_offering_id
    FROM escen.academic_offerings o
    JOIN escen.curricula c ON c.id = o.curriculum_id AND c.archived_at IS NULL
    WHERE o.academic_year_id = v_year_id
      AND o.level_id = v_em_level_id
      AND c.program_id = v_prog.id
      AND o.archived_at IS NULL
    LIMIT 1;

    IF v_offering_id IS NULL THEN
      SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
      FROM escen.curricula
      WHERE program_id = v_prog.id AND level_id = v_em_level_id;

      INSERT INTO escen.curricula (program_id, level_id, version, status, reason)
      VALUES (
        v_prog.id,
        v_em_level_id,
        v_next_version,
        'DRAFT',
        'Création de la maquette Executive Master ' || v_prog.code || ' pour les inscriptions 2026-2027'
      )
      RETURNING id INTO v_curriculum_id;

      INSERT INTO escen.academic_offerings (academic_year_id, level_id, curriculum_id, delivery_mode, reason)
      VALUES (
        v_year_id,
        v_em_level_id,
        v_curriculum_id,
        'En ligne',
        'Ouverture de la formation Executive Master ' || v_prog.code || ' pour 2026-2027'
      )
      RETURNING id INTO v_offering_id;
    END IF;

    -- 2. Activer ou créer la campagne d'inscription sur le site (website_intakes)
    INSERT INTO escen.website_intakes (
      academic_year_id,
      level_id,
      program_id,
      label,
      active,
      required_documents,
      reason
    )
    VALUES (
      v_year_id,
      v_em_level_id,
      v_prog.id,
      v_prog.name || ' · Executive Master',
      true,
      '[]'::jsonb,
      'Ouverture Executive Master sur le site pour 2026-2027'
    )
    ON CONFLICT (academic_year_id, level_id, program_id)
    DO UPDATE SET
      label = EXCLUDED.label,
      active = true,
      version = escen.website_intakes.version + 1,
      reason = EXCLUDED.reason;

    -- 3. Grilles tarifaires Executive Master (Inscription 50 000 FCFA, Scolarité 1 650 000 FCFA)
    INSERT INTO escen.annual_fee_schedules (
      academic_year_id, category, program_id, level_id, delivery_mode, double_degree, amount, reason
    )
    VALUES
      (v_year_id, 'INSCRIPTION', v_prog.id, v_em_level_id, 'En ligne', false, 50000, 'Frais d''inscription Executive Master 2026-2027'),
      (v_year_id, 'SCOLARITE', v_prog.id, v_em_level_id, 'En ligne', false, 1650000, 'Scolarité Executive Master 2026-2027')
    ON CONFLICT (academic_year_id, category, program_id, level_id, delivery_mode, double_degree, archived_at)
    DO UPDATE SET amount = EXCLUDED.amount, reason = EXCLUDED.reason;
  END LOOP;
END $$;

COMMIT;

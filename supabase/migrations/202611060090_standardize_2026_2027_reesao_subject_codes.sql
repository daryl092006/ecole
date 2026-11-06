-- =============================================================================
-- Migration 202611060090 : Harmonisation des codes REESAO pour les matières 2026-2027
-- Remplace les codes techniques provisoires (SUBJ-*, ECOMMERCE, STATISTIQU, etc.)
-- par les codes officiels REESAO ([A-Z]{3}[1-3][1-6][0-9]{2}).
-- =============================================================================

begin;

alter table escen.subjects disable trigger annual_definition_guard;
alter table escen.curriculum_components disable trigger component_guard;

do $$
declare
  v_year_id uuid := 'cbd8ee33-b322-43b2-9876-99636e5891d8';
  v_ang_l2_subj_id uuid;
  v_inf_l2_subj_id uuid;
  v_rec record;
begin
  if not exists (select 1 from escen.academic_years where id = v_year_id) then
    return;
  end if;

  -- 1. Dissocier Coaching en Anglais L1 (ANG1101) et L2 (ANG1301)
  update escen.subjects
  set code = 'ANG1101'
  where academic_year_id = v_year_id
    and upper(name) = upper('Coaching en Anglais')
    and code <> 'ANG1301';

  select id into v_ang_l2_subj_id
  from escen.subjects
  where academic_year_id = v_year_id and code = 'ANG1301'
  limit 1;

  if v_ang_l2_subj_id is null then
    insert into escen.subjects (id, academic_year_id, code, name, active, reason)
    values (
      '3e12c056-dd21-45fc-8134-300e37b31fca',
      v_year_id,
      'ANG1301',
      'Coaching en Anglais',
      true,
      'Code REESAO officiel L2 Semestre 3'
    )
    on conflict (academic_year_id, code) do update set name = excluded.name
    returning id into v_ang_l2_subj_id;
  end if;

  update escen.curriculum_components cc
  set code = 'ANG1101'
  from escen.teaching_units tu
  join escen.curriculum_semesters cs on cs.id = tu.semester_id
  join escen.subjects s on s.academic_year_id = v_year_id and upper(s.name) = upper('Coaching en Anglais')
  where cc.unit_id = tu.id
    and cc.subject_id = s.id
    and cs.position = 1;

  update escen.curriculum_components cc
  set subject_id = v_ang_l2_subj_id,
      code = 'ANG1301'
  from escen.teaching_units tu
  join escen.curriculum_semesters cs on cs.id = tu.semester_id
  join escen.subjects s on s.academic_year_id = v_year_id and upper(s.name) = upper('Coaching en Anglais')
  where cc.unit_id = tu.id
    and cc.subject_id = s.id
    and cs.position = 3;

  -- 2. Dissocier Théorie des Systèmes d’Exploitation L1 (INF1102) et L2 (INF1306)
  -- Si une ligne orpheline SUBJ-% existe pour la variante L2, la convertir en INF1306
  select s.id into v_inf_l2_subj_id
  from escen.subjects s
  where s.academic_year_id = v_year_id
    and upper(s.name) = upper('Théorie des Systèmes d’exploitation')
    and not exists (select 1 from escen.curriculum_components cc where cc.subject_id = s.id)
  limit 1;

  if v_inf_l2_subj_id is not null then
    update escen.subjects
    set code = 'INF1306',
        name = 'Théorie des Systèmes d’Exploitation'
    where id = v_inf_l2_subj_id;
  end if;

  update escen.subjects s
  set code = 'INF1102'
  where s.academic_year_id = v_year_id
    and upper(s.name) = upper('Théorie des Systèmes d’exploitation')
    and s.code <> 'INF1306';

  if v_inf_l2_subj_id is null then
    select id into v_inf_l2_subj_id
    from escen.subjects
    where academic_year_id = v_year_id and code = 'INF1306'
    limit 1;
  end if;

  if v_inf_l2_subj_id is null then
    insert into escen.subjects (id, academic_year_id, code, name, active, reason)
    values (
      'c679d00d-13fe-458d-bbe4-4a6b6378df83',
      v_year_id,
      'INF1306',
      'Théorie des Systèmes d’Exploitation',
      true,
      'Code REESAO officiel L2 Semestre 3'
    )
    on conflict (academic_year_id, code) do update set name = excluded.name
    returning id into v_inf_l2_subj_id;
  end if;

  update escen.curriculum_components cc
  set code = 'INF1102'
  from escen.teaching_units tu
  join escen.curriculum_semesters cs on cs.id = tu.semester_id
  join escen.subjects s on s.academic_year_id = v_year_id and upper(s.name) = upper('Théorie des Systèmes d’exploitation')
  where cc.unit_id = tu.id
    and cc.subject_id = s.id
    and cs.position = 1;

  update escen.curriculum_components cc
  set subject_id = v_inf_l2_subj_id,
      code = 'INF1306'
  from escen.teaching_units tu
  join escen.curriculum_semesters cs on cs.id = tu.semester_id
  join escen.subjects s on s.academic_year_id = v_year_id and upper(s.name) = upper('Théorie des Systèmes d’exploitation')
  where cc.unit_id = tu.id
    and cc.subject_id = s.id
    and cs.position = 3;

  -- 3. Table de correspondance des autres matières 2026-2027 (L1 S1 et L2 S3)
  for v_rec in (
    select * from (values
      ('Statistiques Descriptives', 'MTH1101'),
      ('Calcul différentiel dans IR', 'MTH1102'),
      ('T.E.E.O.', 'TEE1101'),
      ('Les Principes Marketing', 'MKG1101'),
      ('Généralités sur l’Economie Numérique', 'ECN1101'),
      ('Economie Générale', 'ECN1102'),
      ('Architecture & Technologie des Ordinateurs', 'INF1101'),
      ('E-commerce et référencement', 'MKG1302'),
      ('Technologie digital avancée', 'INF1303'),
      ('Digitalisation dans les secteurs clés du numérique', 'INF1302'),
      ('Analyse des coûts', 'CPT1301'),
      ('Introduction au Management des Projets', 'ECN1301'),
      ('Administration Système : Windows & Linux', 'INF1305'),
      ('Economie d’Entreprise', 'ECN1302'),
      ('Statistiques Inférentielles (Décisionnelle)', 'MTH1302'),
      ('Architecture & Fonctionnement des Réseaux Informatiques', 'INF1307'),
      ('Modélisation UML', 'INF1308')
    ) as t(subject_name, reesao_code)
  ) loop
    update escen.subjects s
    set code = v_rec.reesao_code
    where s.academic_year_id = v_year_id
      and upper(s.name) = upper(v_rec.subject_name);

    update escen.curriculum_components cc
    set code = v_rec.reesao_code
    from escen.subjects s
    where cc.subject_id = s.id
      and s.academic_year_id = v_year_id
      and upper(s.name) = upper(v_rec.subject_name);
  end loop;
end $$;

alter table escen.curriculum_components enable trigger component_guard;
alter table escen.subjects enable trigger annual_definition_guard;

commit;

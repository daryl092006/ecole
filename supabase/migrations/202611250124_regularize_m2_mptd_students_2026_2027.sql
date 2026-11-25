BEGIN;

-- Désactiver temporairement les verrous de contexte pour régulariser les inscriptions M2 MP & TD (2026-2027)
ALTER TABLE escen.enrollments DISABLE TRIGGER enrollment_context_guard;
ALTER TABLE escen.enrollment_groups DISABLE TRIGGER membership_context_guard;

-- 1. Réactiver l'inscription 2026-2027 d'Euphrem ADJIBODE (068-ESC-2025) en Master 2 MP & TD
UPDATE escen.enrollments
SET status = 'REINSCRIT'
WHERE id = '1f836c49-db7f-4532-8d17-f3c31739694a'::uuid
  AND student_id = '6c3a7db6-0e72-5ffd-b62a-767cc515da3e'::uuid;

UPDATE escen.enrollment_groups
SET valid_until = NULL,
    reason = 'Réactivation inscription Master 2 MP & TD (2026-2027)'
WHERE id = '7a03bcca-eeba-4212-8deb-307c2f4b62ae'::uuid
  AND enrollment_id = '1f836c49-db7f-4532-8d17-f3c31739694a'::uuid;

-- 2. Réinscrire Vincent ETCHIN (086-ESC-2025) en Master 2 MP & TD (2026-2027)
INSERT INTO escen.enrollments (id, student_id, offering_id, status, enrolled_on, created_by, double_degree)
SELECT
  '86086086-e5c0-4026-9086-3786bdde6c38'::uuid,
  '10030a4f-44cc-55b2-906d-3786bdde6c38'::uuid,
  '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid,
  'REINSCRIT',
  '2026-10-29'::date,
  '43ce07c4-bb38-5c56-85e6-70e2ffa5b909'::uuid,
  false
WHERE EXISTS (SELECT 1 FROM escen.students WHERE id = '10030a4f-44cc-55b2-906d-3786bdde6c38'::uuid)
  AND EXISTS (SELECT 1 FROM escen.academic_offerings WHERE id = '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM escen.enrollments
    WHERE student_id = '10030a4f-44cc-55b2-906d-3786bdde6c38'::uuid
      AND offering_id = '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid
  );

INSERT INTO escen.enrollment_groups (enrollment_id, offering_id, group_id, valid_from, valid_until, changed_by, reason)
SELECT
  e.id,
  '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid,
  '6ea55e2f-0568-446a-b9cc-abb085b1c10f'::uuid,
  '2026-10-29'::date,
  NULL,
  '43ce07c4-bb38-5c56-85e6-70e2ffa5b909'::uuid,
  'Réinscription annuelle et affectation au groupe Master 2 MP & TD (2026-2027)'
FROM escen.enrollments e
WHERE e.student_id = '10030a4f-44cc-55b2-906d-3786bdde6c38'::uuid
  AND e.offering_id = '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM escen.enrollment_groups eg
    WHERE eg.enrollment_id = e.id
      AND eg.group_id = '6ea55e2f-0568-446a-b9cc-abb085b1c10f'::uuid
  );

-- 3. Réinscrire Eloic Lenox ATINDEGLA (087-ESC-2025) en Master 2 MP & TD (2026-2027)
INSERT INTO escen.enrollments (id, student_id, offering_id, status, enrolled_on, created_by, double_degree)
SELECT
  '87087087-e5c0-4026-9087-070f5acac680'::uuid,
  '72494789-5faa-5b99-b42a-070f5acac680'::uuid,
  '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid,
  'REINSCRIT',
  '2026-10-29'::date,
  '43ce07c4-bb38-5c56-85e6-70e2ffa5b909'::uuid,
  false
WHERE EXISTS (SELECT 1 FROM escen.students WHERE id = '72494789-5faa-5b99-b42a-070f5acac680'::uuid)
  AND EXISTS (SELECT 1 FROM escen.academic_offerings WHERE id = '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM escen.enrollments
    WHERE student_id = '72494789-5faa-5b99-b42a-070f5acac680'::uuid
      AND offering_id = '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid
  );

INSERT INTO escen.enrollment_groups (enrollment_id, offering_id, group_id, valid_from, valid_until, changed_by, reason)
SELECT
  e.id,
  '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid,
  '6ea55e2f-0568-446a-b9cc-abb085b1c10f'::uuid,
  '2026-10-29'::date,
  NULL,
  '43ce07c4-bb38-5c56-85e6-70e2ffa5b909'::uuid,
  'Réinscription annuelle et affectation au groupe Master 2 MP & TD (2026-2027)'
FROM escen.enrollments e
WHERE e.student_id = '72494789-5faa-5b99-b42a-070f5acac680'::uuid
  AND e.offering_id = '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM escen.enrollment_groups eg
    WHERE eg.enrollment_id = e.id
      AND eg.group_id = '6ea55e2f-0568-446a-b9cc-abb085b1c10f'::uuid
  );

ALTER TABLE escen.enrollments ENABLE TRIGGER enrollment_context_guard;
ALTER TABLE escen.enrollment_groups ENABLE TRIGGER membership_context_guard;

COMMIT;

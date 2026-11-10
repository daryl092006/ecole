BEGIN;

-- 1. Accorder la gestion des supports de cours au rôle Délégué (DEL)
INSERT INTO escen.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM escen.roles r
CROSS JOIN escen.permissions p
WHERE r.code = 'DEL' AND p.code = 'course_resource.manage'
ON CONFLICT DO NOTHING;

-- Désactiver temporairement les verrous d'immutabilité et de suppression pour la réaffectation
ALTER TABLE escen.enrollments DISABLE TRIGGER enrollment_context_guard;
ALTER TABLE escen.enrollment_groups DISABLE TRIGGER membership_context_guard;
ALTER TABLE escen.enrollment_groups DISABLE TRIGGER no_delete;

-- 2. Régularisation des affectations M2 MP-TD (2026-2027)
-- Jerryda KOUASSI (053-ESC-2025) : bascule de M2 MDE vers M2 MP-TD
DELETE FROM escen.enrollment_groups
WHERE enrollment_id = '59b3ec3e-e108-4556-9bb0-68a1ed787c6c'::uuid;

UPDATE escen.enrollments
SET offering_id = '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid -- M2 MP-TD 2026-2027
WHERE id = '59b3ec3e-e108-4556-9bb0-68a1ed787c6c'::uuid;

INSERT INTO escen.enrollment_groups(enrollment_id, offering_id, group_id, valid_from, valid_until, changed_by, reason)
SELECT
  '59b3ec3e-e108-4556-9bb0-68a1ed787c6c'::uuid,
  '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid,
  '6ea55e2f-0568-446a-b9cc-abb085b1c10f'::uuid, -- Groupe Master 2 MP & TD
  '2026-10-15'::date,
  NULL,
  e.created_by,
  'Régularisation filière M2 Management de Projets & Transformation Digitale'
FROM escen.enrollments e
WHERE e.id = '59b3ec3e-e108-4556-9bb0-68a1ed787c6c'::uuid;

-- Enyo Neyram SAMKLU (189-ESC-2026) : email et bascule de EM FD vers M2 MP-TD
UPDATE escen.people
SET email = coalesce(email, 'mlanvi1@yahoo.fr')
WHERE id = (SELECT person_id FROM escen.students WHERE matricule = '189-ESC-2026');

DELETE FROM escen.enrollment_groups
WHERE enrollment_id = '8b67d6d2-b907-4b92-8c1a-18e481ff3a8c'::uuid;

UPDATE escen.enrollments
SET offering_id = '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid -- M2 MP-TD 2026-2027
WHERE id = '8b67d6d2-b907-4b92-8c1a-18e481ff3a8c'::uuid;

INSERT INTO escen.enrollment_groups(enrollment_id, offering_id, group_id, valid_from, valid_until, changed_by, reason)
SELECT
  '8b67d6d2-b907-4b92-8c1a-18e481ff3a8c'::uuid,
  '655ec792-8a97-4c04-9d21-9495776c9f09'::uuid,
  '6ea55e2f-0568-446a-b9cc-abb085b1c10f'::uuid, -- Groupe Master 2 MP & TD
  '2026-10-15'::date,
  NULL,
  e.created_by,
  'Régularisation filière M2 Management de Projets & Transformation Digitale'
FROM escen.enrollments e
WHERE e.id = '8b67d6d2-b907-4b92-8c1a-18e481ff3a8c'::uuid;

-- Réactiver les verrous
ALTER TABLE escen.enrollments ENABLE TRIGGER enrollment_context_guard;
ALTER TABLE escen.enrollment_groups ENABLE TRIGGER membership_context_guard;
ALTER TABLE escen.enrollment_groups ENABLE TRIGGER no_delete;

-- 3. Retrait des 6 autres inscriptions M2 de 2026-2027 qui n'ont pas lieu d'être
-- Passage au statut ABANDON pour l'année 2026-2027
UPDATE escen.enrollments
SET status = 'ABANDON'
WHERE id IN (
  '6c7991a9-d9ca-4420-8bef-5f404a719e29'::uuid, -- Romaric Ezéchiel KONAN
  '6a414243-79c7-4342-80fb-5511d4330917'::uuid, -- Julienne Ossara KOUTANDJI
  '83118f8e-86ce-4c51-8a77-958dcce2d9df'::uuid, -- Kocou Josias Dimas SIAVI
  '738faa20-e6f1-4b9f-8cc3-f42f975f6824'::uuid, -- Mahamat Saleh Kaya ANNOUR
  '8108f7b1-7ddd-4c1c-9e35-8348014fa6af'::uuid, -- Eddie ATIKLEME
  '1f836c49-db7f-4532-8d17-f3c31739694a'::uuid  -- Euphrem ADJIBODE
);

UPDATE escen.enrollment_groups
SET valid_until = GREATEST(valid_from + interval '1 day', CURRENT_DATE)::date,
    reason = 'Inscription Master 2 annulée pour l’année 2026-2027'
WHERE enrollment_id IN (
  '6c7991a9-d9ca-4420-8bef-5f404a719e29'::uuid,
  '6a414243-79c7-4342-80fb-5511d4330917'::uuid,
  '83118f8e-86ce-4c51-8a77-958dcce2d9df'::uuid,
  '738faa20-e6f1-4b9f-8cc3-f42f975f6824'::uuid,
  '8108f7b1-7ddd-4c1c-9e35-8348014fa6af'::uuid,
  '1f836c49-db7f-4532-8d17-f3c31739694a'::uuid
);

COMMIT;

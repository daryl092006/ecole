-- Correction approuvée : SIAVI n'a pas abandonné ses études.
-- Rétablir le statut et l'affectation antérieurs à la migration 098.
BEGIN;

UPDATE escen.enrollments
SET status = 'REINSCRIT'
WHERE id = '83118f8e-86ce-4c51-8a77-958dcce2d9df'
  AND status = 'ABANDON';

UPDATE escen.enrollment_groups
SET valid_until = NULL,
    reason = 'Correction de la migration 098 : aucun abandon, rétablissement du groupe Master 2 FD'
WHERE id = '2a3ab8fd-d147-4982-930a-772833201694'
  AND valid_until = DATE '2026-11-10';

COMMIT;

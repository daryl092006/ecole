BEGIN;

-- 1. Accorder la consultation et la gestion des profils du personnel (staff.view et staff.manage) au rôle Logisticien académique (LOG)
-- Permet au logisticien académique de créer des profils enseignants et d'accéder aux dossiers nécessaires.
INSERT INTO escen.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM escen.roles r
CROSS JOIN escen.permissions p
WHERE r.code = 'LOG'
  AND p.code IN ('staff.view', 'staff.manage')
ON CONFLICT DO NOTHING;

COMMIT;

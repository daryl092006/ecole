BEGIN;

INSERT INTO escen.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM escen.roles r
CROSS JOIN escen.permissions p
WHERE r.code IN ('LOG', 'DA')
  AND p.code = 'evaluation.create'
ON CONFLICT DO NOTHING;

COMMIT;

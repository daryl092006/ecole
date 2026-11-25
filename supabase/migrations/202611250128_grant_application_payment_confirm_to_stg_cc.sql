BEGIN;

INSERT INTO escen.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM escen.roles r
CROSS JOIN escen.permissions p
WHERE r.code = 'STG_CC'
  AND p.code = 'application.payment.confirm'
ON CONFLICT (role_id, permission_id) DO NOTHING;

DO $$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef('escen_private.application_event(uuid,uuid,text,text,text,text,jsonb,text)'::regprocedure)
    INTO definition;

  definition := replace(definition, 'roles:=array[''CC''];', 'roles:=array[''CC'',''STG_CC''];');

  EXECUTE definition;
END $$;

COMMIT;

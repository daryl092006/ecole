BEGIN;

UPDATE escen.teaching_assignments
SET valid_until = NULL
WHERE id = '688b9558-a15c-4be6-aa32-04d517a3f979'::uuid;

COMMIT;

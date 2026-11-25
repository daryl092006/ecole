BEGIN;

UPDATE escen.people p
SET email = 'lenoxatindegla@gmail.com'
FROM escen.students s
WHERE s.person_id = p.id
  AND s.matricule = '087-ESC-2025';

COMMIT;

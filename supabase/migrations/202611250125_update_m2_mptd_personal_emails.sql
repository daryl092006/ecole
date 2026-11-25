BEGIN;

UPDATE escen.people p
SET email = 'fantamaigaagbo58@gmail.com'
FROM escen.students s
WHERE s.person_id = p.id
  AND s.matricule = '002-ESC-2022';

UPDATE escen.people p
SET email = 'jerrydakouassi@gmail.com'
FROM escen.students s
WHERE s.person_id = p.id
  AND s.matricule = '053-ESC-2025';

UPDATE escen.people p
SET email = 'vincentetchin@gmail.com'
FROM escen.students s
WHERE s.person_id = p.id
  AND s.matricule = '086-ESC-2025';

COMMIT;

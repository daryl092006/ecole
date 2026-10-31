-- Migration 202610310071_student_attendance_academic_permissions.sql
-- Attribuer la consultation de l'assiduité et du référentiel académique aux rôles Étudiant et Délégué
-- afin que les nouveaux écrans "Mon assiduité" et "Maquette pédagogique" soient visibles dans leur portail.

insert into escen.role_permissions (role_id, permission_id)
select r.id, p.id
from escen.roles r
cross join escen.permissions p
where (
  (r.code = 'STUD' and p.code in ('attendance.view', 'academic.view'))
  or
  (r.code = 'DEL' and p.code = 'academic.view')
)
on conflict (role_id, permission_id) do nothing;

-- Migration 202610300070_raf_cc_catalog_and_schedule_access.sql
-- Attribuer la visibilité académique, organisationnelle et étudiante :
-- 1. Au Responsable Administratif et Financier (RAF) : academic.view et schedule.view
--    pour lui permettre d'exploiter les dossiers étudiants, leurs filières et le suivi financier.
-- 2. Au Chargé de Clientèle (CC) : student.view, academic.view et schedule.view
--    pour lui permettre de consulter les dossiers étudiants admis, les programmes et les groupes.

insert into escen.role_permissions (role_id, permission_id)
select r.id, p.id
from escen.roles r
cross join escen.permissions p
where (
  (r.code = 'RAF' and p.code in ('academic.view', 'schedule.view'))
  or
  (r.code = 'CC' and p.code in ('student.view', 'academic.view', 'schedule.view'))
)
on conflict (role_id, permission_id) do nothing;

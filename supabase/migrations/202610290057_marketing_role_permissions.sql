-- Attribution des permissions de consultation académique, planning et étudiants au rôle Responsable Marketing (MKT)
begin;

insert into escen.permissions (code, description)
values
  ('student.view', 'Consulter les dossiers étudiants'),
  ('academic.view', 'Consulter le référentiel et les programmes académiques'),
  ('schedule.view', 'Consulter le planning des cours'),
  ('application.view', 'Consulter les candidatures'),
  ('application.followup', 'Assurer le suivi commercial des candidatures'),
  ('communication.view', 'Consulter les communications et contenus éditoriaux'),
  ('communication.manage', 'Gérer les communications, brochures et articles')
on conflict (code) do nothing;

insert into escen.role_permissions (role_id, permission_id)
select r.id, p.id
from escen.roles r
join escen.permissions p
  on p.code in (
    'student.view',
    'academic.view',
    'schedule.view',
    'application.view',
    'application.followup',
    'communication.view',
    'communication.manage'
  )
where r.code = 'MKT'
on conflict (role_id, permission_id) do nothing;

commit;

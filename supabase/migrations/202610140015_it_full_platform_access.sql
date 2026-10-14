-- Instruction explicite : accès complet de l’Informaticien.
-- Aucun compte ou rôle n’est attribué, aucune politique RLS n’est ouverte.
begin;
insert into escen.role_permissions (role_id, permission_id)
select r.id, p.id
from escen.roles r cross join escen.permissions p
where r.code = 'IT'
on conflict (role_id, permission_id) do nothing;
commit;

-- Proposition uniquement : ne pas appliquer avant accord utilisateur.
-- Première étape : droits dédiés et classement des signalements scolaires.
-- Aucun changement d'inscription, de groupe, de note ou de contrat.
begin;

insert into escen.permissions (code, description)
values ('student.correction.manage', 'Prendre en charge les demandes de correction scolaire')
on conflict (code) do nothing;

insert into escen.role_permissions (role_id, permission_id)
select r.id, p.id
from escen.roles r cross join escen.permissions p
where r.code in ('DA', 'LOG', 'IT') and p.code = 'student.correction.manage'
on conflict do nothing;

insert into escen.support_categories (code, name, active)
values ('STUDENT_PROGRAM_CORRECTION', 'Correction de filière ou de niveau', true)
on conflict (code) do nothing;

-- Reprise des tickets produits par la première connexion : le titre seul
-- ne suffit pas. Vérifier également l'identifiant déterministe lié à Auth.
with reports as (
  select t.id, encode(sha256(convert_to('first-login:v1:' || a.auth_user_id::text, 'UTF8')), 'hex') as digest
  from escen.support_tickets t
  join escen.accounts a on a.id = t.author_id
  where t.category_id is null
    and a.auth_user_id is not null
    and t.title = 'Première connexion · Filière, niveau ou dossier scolaire à corriger'
), verified as (
  select id from reports
  where id::text = substr(digest, 1, 8) || '-' || substr(digest, 9, 4)
    || '-5' || substr(digest, 14, 3) || '-a' || substr(digest, 18, 3)
    || '-' || substr(digest, 21, 12)
)
update escen.support_tickets t
set category_id = c.id
from escen.support_categories c
where c.code = 'STUDENT_PROGRAM_CORRECTION'
  and t.id in (select id from verified);

commit;

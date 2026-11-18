-- Régularisation idempotente des droits CC prévus par 202611100100,
-- constatés manquants dans la base en ligne le 18 novembre 2026.
-- SQL présenté et approuvé par l’utilisateur le 18 novembre 2026.
begin;

insert into escen.role_permissions (role_id, permission_id)
select r.id, p.id
from escen.roles r
cross join escen.permissions p
where r.code = 'CC'
  and p.code in (
    'finance.view',
    'finance.report.view',
    'payment.record'
  )
on conflict do nothing;

commit;

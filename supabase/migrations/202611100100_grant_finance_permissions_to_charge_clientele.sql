-- Migration 202611100100_grant_finance_permissions_to_charge_clientele.sql
-- Attribution des permissions du module Finance au Chargé de Clientèle (CC) :
-- 1. finance.view : consultation du module finance, des indicateurs, échéanciers et contrats
-- 2. finance.report.view : consultation des rapports financiers et du suivi des impayés
-- 3. payment.record : encaissement et saisie des règlements de scolarité / versements

insert into escen.role_permissions (role_id, permission_id)
select r.id, p.id
from escen.roles r
cross join escen.permissions p
where r.code = 'CC'
  and p.code in ('finance.view', 'finance.report.view', 'payment.record')
on conflict (role_id, permission_id) do nothing;

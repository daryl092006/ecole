-- Proposition SQL : Rôle dédié "Stagiaire chargé de clientèle" (STG_CC)
-- Périmètre strictement limité à la vérification et validation des dossiers de candidature
-- (application.view, application.review, application.followup), sans accès finance ni académique.
begin;

insert into escen.roles (code, name)
values ('STG_CC', 'Stagiaire chargé de clientèle')
on conflict (code) do update set name = excluded.name, active = true;

insert into escen.role_permissions (role_id, permission_id)
select r.id, p.id
from escen.roles r
cross join escen.permissions p
where r.code = 'STG_CC'
  and p.code in (
    'application.view',
    'application.review',
    'application.followup'
  )
on conflict (role_id, permission_id) do nothing;

-- Inclure STG_CC dans les notifications internes de réception et complétion des dossiers de candidature
do $$
declare
  definition text;
begin
  select pg_get_functiondef('escen_private.application_event(uuid,uuid,text,text,text,text,jsonb,text)'::regprocedure)
    into definition;

  definition := replace(definition, 'roles:=array[''CC'',''IT''];', 'roles:=array[''CC'',''STG_CC'',''IT''];');
  definition := replace(definition, 'roles:=array[''CC'',''MKT''];', 'roles:=array[''CC'',''STG_CC'',''MKT''];');

  execute definition;
end $$;

commit;


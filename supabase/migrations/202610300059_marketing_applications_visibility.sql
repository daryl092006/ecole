-- Migration : Visibilité globale des candidatures pour le Responsable Marketing (MKT)
begin;

create or replace function escen_private.application_visible(p_actor uuid, p_role text, a escen.online_applications) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select escen_private.application_allowed(p_actor, p_role, 'application.view') and
 case
   when p_role = 'DA' then a.workflow_stage is null or a.workflow_stage in ('TRANSMIS_ACADEMIE','ETUDE_ACADEMIQUE','ADMISSIBLE','ATTENTE_PAIEMENT','ADMIS_OFFICIEL','REFUSE')
   when p_role = 'RAF' then a.workflow_stage is null or a.workflow_stage in ('ADMISSIBLE','ATTENTE_PAIEMENT','ADMIS_OFFICIEL')
   else true
 end;
$$;

commit;


-- SQL relu et approuvé par l'utilisateur le 18 novembre 2026.
-- Retrait demandé par l'utilisateur ; aucun changement des notes, crédits,
-- pondérations devoir/examen, décisions ou données sources historiques.
begin;

alter table escen.curriculum_components drop column coefficient;

-- L'ancien champ ne doit plus être proposé dans les écrans d'archives.
-- Les données sources et événements d'audit restent intacts.
update escen_private.history_catalog
set definition = definition #- '{fields,coefficient}'
where table_name = 'unite_valeurs';

commit;

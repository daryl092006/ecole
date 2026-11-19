-- À exécuter uniquement après déploiement et vérification du mode strict.
begin;
update escen_private.exam_integrity_activation
  set activated_at=clock_timestamp(),
    reason='Activation validée du mode strict pour les prochaines épreuves, après déploiement de l’interface ; sauvegarde automatique conservée'
  where singleton and activated_at='infinity'::timestamptz;
commit;
select activated_at from escen_private.exam_integrity_activation where singleton;

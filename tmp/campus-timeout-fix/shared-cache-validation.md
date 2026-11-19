# Rétablissement du portail — migration 119

Migration 202611190119 autorisée, appliquée en production et enregistrée dans supabase_migrations.schema_migrations.

- Trois GET /api/campus authentifiés : HTTP 200 en 4 170, 3 506 et 2 166 ms, révision 263, 110 tables après filtrage.
- Contrôle ultérieur du snapshot, au-delà du premier chargement : HTTP 200 en 4 213 ms, révision 263.
- Service d’épreuves avec le rôle STUD de Valérie : HTTP 200 en 877 ms, une épreuve retrouvée ; aucun démarrage, changement de réponse ou remise effectué par ce contrôle.
- Vérification locale dédiée : contenu inchangé, réutilisation du cache, invalidation sur une vraie transaction métier, expiration, reconstruction, RLS, droits et exclusions sensibles.
- Test dédié intégré à npm run test:db. Les fixtures SQL directes des anciens tests utilisent explicitement des snapshots sans cache, puisqu’elles ne passent pas par la révision métier.
- TypeScript sans écriture incrémentale : réussi. ESLint : réussi. npm test : réussi.
- Documentation SQL et dictionnaire régénérés ensemble avec npm run db:describe.
- Sauvegarde automatique conservée ; son correctif de rechargement reste déployé dans 98411c5.
- Aucun push Git. Aucun mot de passe, réponse de copie ou délai d’épreuve modifié par cette migration.

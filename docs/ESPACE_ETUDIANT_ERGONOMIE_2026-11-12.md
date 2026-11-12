# Refonte de l’accueil étudiant — 12 novembre 2026

## Problème et parcours obtenu

L’accueil étudiant utilisait des cartes de gestion réduites à quelques compteurs. Les liens personnels pouvaient disparaître du menu dès que le compte avait accès à un onglet pédagogique : la déduplication destinée au personnel se basait sur les onglets accessibles plutôt que sur le rôle actif.

L’accueil des rôles Étudiant et Délégué dispose désormais d’un écran personnel : identité et année consultée, quatre accès directs aux cours et résultats, prochaines séances, annonces, situation financière et démarches. Les autres rôles conservent leur accueil existant.

Le menu est organisé en quotidien, études et vie étudiante. Les frais, documents et l’assiduité personnels restent accessibles. Les feuilles de présence du groupe apparaissent dans une rubrique distincte réservée au rôle Délégué. Sur mobile, une barre persistante donne accès à Accueil, Planning, Résultats et Documents ; son état actif suit la route. Elle est neutralisée lorsque le menu est ouvert et le contenu conserve une marge inférieure pour rester accessible.

## Cohérence des informations

- Chaque destination est intersectée avec les pages déjà autorisées pour le rôle actif. Aucune permission supplémentaire.
- Le planning provient du snapshot connecté, des inscriptions actives du compte et du mécanisme existant de participation aux séances. Les séances annulées, reportées, terminées ou aux dates invalides sont exclues. Les cours sont triés par date, avec la salle effective lorsqu’elle est connue.
- Les annonces proviennent des communications déjà filtrées côté serveur ; les publications futures, retirées et expirées sont exclues.
- Les montants reprennent la projection financière existante. Une situation indisponible n’est pas présentée comme un montant nul. Aucun taux de réussite ou moyenne n’est inventé.
- Les cas sans séance ou sans inscription confirmée disposent d’un état explicite.
- Aucun appel à une API externe supplémentaire, aucune mutation, migration ou création de compte.

## Vérifications

- `npx tsc --noEmit --incremental false` : réussi.
- `npm run lint` : réussi.
- `npm test` : réussi, workflows et contrôles PostgreSQL locaux.
- `tests/ui/dashboard-home.config.ts` : 14 tests réussis, dont neuf tests ciblés. Accueil IT à 390/1440 px, accueil étudiant et navigation à 360/390/768/1024/1440 px, confidentialité du planning, état financier absent et accès du délégué.
- Audit responsive global : cinq tests réussis, 77 écrans à chacune des cinq largeurs, aucune anomalie détectée sur les 385 vues. Résultats JSON dans `tmp/screenshots/student-home-responsive/after/`.

Les tests utilisent des comptes et données simulés, sans écriture distante. Ils ne remplacent pas une recette avec des comptes réels.

## Aperçus

- [Accueil étudiant sur ordinateur](../tmp/screenshots/dashboard-home/student-1440.png)
- [Accueil étudiant sur mobile](../tmp/screenshots/dashboard-home/student-390.png)
- Les cinq tailles et les états de navigation sont vérifiés par les tests ; les captures proviennent de la fixture isolée.

## Portée

Cette sous-étape refond l’accueil et la navigation étudiante. Les pages détaillées des notes, documents, frais et supports restent leurs écrans connectés existants ; leur refonte complète n’est pas déclarée terminée. Les modifications sont locales et ne sont pas publiées pendant cette sous-étape.

# Revue de clarté du 16 octobre 2026

## Constats et corrections

La demande porte sur la cohérence de l’application, au-delà des filtres étudiants. La revue confronte les composants et les parcours navigateur à 390 et 1440 pixels. Les données des tests sont isolées ; elles ne constituent pas une validation des dossiers de production.

| Problème constaté | Correction |
| --- | --- |
| L’accueil cumule compteurs, tableaux de pilotage, graphiques et annuaire complet des pages. | Les indicateurs détaillés restent dans Vue d’ensemble. L’accueil conserve les accès courants et des rubriques dépliables. |
| Les réinscriptions sont rangées dans les paiements. | Elles rejoignent Dossiers étudiants. La situation financière ouvre le groupe des pages financières. |
| « Saisir les notes » conduit à une consultation et « Encaisser » à une liste sans entrée vers l’opération. | Les raccourcis annoncent la consultation. Versements et reçus propose de choisir un dossier puis d’utiliser les opérations existantes, avec leurs prérequis et confirmations. |
| Les sélecteurs de dossiers affichent toute la population et une recherche sans résultat n’explique rien. | Sélecteur partagé, recherche insensible aux accents, 25 dossiers par page, compteur et état vide explicite. Les filtres de la page financière restent conservés à la fermeture du dossier. |
| Le tableau de bord assimile une moyenne brute de notes à une moyenne académique et le seuil 10 à une réussite. | Suppression de ces indicateurs sans règle institutionnelle confirmée. Aucun résultat de jury n’est déduit. |
| Des montants attendus et taux de recouvrement apparaissent à zéro sans contrats établis. | Affichage « Non établi » lorsque les données nécessaires manquent. Suppression du compteur de rôles utilisant une collection absente du snapshot. |
| Une année différente de l’année de travail est systématiquement appelée « historique », même si elle est en préparation. | Message neutre avec le statut réel de l’année sélectionnée. |
| Le contrôle de fermeture lors d’un changement d’année recherche une ancienne classe de formulaire. | Détection des fenêtres actuelles ; changement refusé pendant une écriture et confirmation lorsque la fenêtre est ouverte. |
| L’activation d’une année peut mettre l’autre année ouverte en clôture sans présenter ces effets. Les erreurs de vérification de préparation sont ignorées. | Relecture des changements avant confirmation ; vérification de préparation obligatoire, erreur visible et reprise possible sans écriture préalable. |
| L’export financier annonce une option « page affichée » inexistante. | Le texte décrit l’export de tous les résultats filtrés réellement disponible. |

## Limites qui ne relèvent pas de la présentation

Les modules connectés de planning, présences, réclamations, achats et support comportent encore des consultations sans traitement complet. Les notes se consultent ; cela ne réalise pas leur saisie, leur validation ni leur publication. Les écrans indiquent leurs limites et les contrôles serveur restent en place.

La préparation des années, les inscriptions, les paiements dans le dossier, les identités et les publications du site ont leurs propres parcours persistants. Leur coexistence avec des domaines consultatifs reste une source de discontinuité fonctionnelle. Cette revue n’ajoute pas de règles académiques ni de migrations pour combler ces traitements.

## Recette

- `npm run lint`, `npm run build`, `npm run test`.
- `npm run test:ui -- tests/ui/navigation-review.spec.ts tests/ui/operational-review.spec.ts tests/ui/global-organisation.spec.ts` : routes, menus, premières actions et captures.
- `npm run test:ui -- tests/ui/workspace-clarity.spec.ts tests/ui/process-clarity.spec.ts tests/ui/student-dialog.spec.ts` : accueil, accès à l’encaissement, conservation du contexte, préparation et dossiers.
- `npm run test:ui -- tests/ui/academic-years.spec.ts` : contexte annuel, confirmation des changements et arrêt sans écriture si la vérification de préparation échoue.
- Captures sous `.tmp/interface/390/` et `.tmp/interface/1440/`. Les premières actions recensées ne couvrent pas toutes les combinaisons de formulaires, rôles et données.

Résultat : les 49 routes de la revue passent à chaque largeur, sans erreur JavaScript ni débordement détecté. Les tests ciblés de dossiers/préparation/encaissement (12), de contexte annuel (8) et les quatre tests opérationnels passent. Les contrôles de navigation, d’organisation et de connexion passent également. Lint sans erreur (deux avertissements préexistants), build réussi et 46 groupes de contrôles PostgreSQL réussis.

La recette opérationnelle utilisait encore l’ancien libellé d’état d’examen « Publiées ». L’assertion vérifie désormais « Résultats publiés », conformément à la distinction entre correction et publication déjà implémentée.

Les quatre tests opérationnels ont chacun terminé avec succès (79 actions recensées sur mobile, 95 sur ordinateur). Le processus de recette est resté en attente après leur terminaison lors de l’arrêt du serveur Windows ; il a été interrompu après réception des quatre résultats, sans interrompre de test en cours.

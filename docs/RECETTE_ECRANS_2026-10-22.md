# Recette des écrans du 22 octobre 2026

## Périmètre et méthode

Reprise des trois chantiers : connexion/sessions, programmes et relevés REESAO, admissions et pièces communes par niveau. Interactions Chrome sur mobile et ordinateur, saisie des formulaires, confirmations, rechargements, changement d’année et de rôle, inspection visuelle des captures et du relevé imprimé. Le navigateur est piloté par Playwright ; les captures sont également examinées visuellement. Cette recette ne constitue pas une validation de tous les modules de la plateforme.

Le nouveau banc `tests/ui/local-business-fixture.mjs` applique toutes les migrations existantes dans PGlite en mémoire. Il exécute les vraies routes Next.js, `requireAccount`, les permissions persistées, les filtres annuels, la validation Zod et les RPC PostgreSQL. Le transport HTTP vers ces routes est remplacé par une interception navigateur. L’identité Auth est une identité de recette ; les fichiers sont stockés en mémoire. Les autres tests de la suite peuvent employer des réponses API simulées, comme auparavant.

La copie du site public située dans le projet voisin est lancée localement pour le parcours de candidature. Aucune donnée réelle ni base distante n’est modifiée. Cette méthode ne vérifie pas les services Supabase Auth/Storage distants ni leur disponibilité.

## Contrôles métier effectués

| Parcours | Vérification |
| --- | --- |
| Matière | Choix filière/niveau/semestre, code REESAO, crédits 3.75 et coefficient 0.625, aucune création avant confirmation, transaction matière/UE/composant, conservation après rechargement. |
| Pièces communes | Une règle par année/niveau, propagation à deux filières, conservation après rechargement, mêmes exigences renvoyées par les API publiques de chaque filière. |
| Conflit de sauvegarde | Sauvegarde concurrente réelle en PostgreSQL, ancienne version refusée, aucune perte de la première sauvegarde. Défaut de visibilité de l’erreur sur mobile décrit ci-dessous. |
| Formulaire modifié | Échap déclenche la protection contre l’abandon ; « Continuer la saisie » conserve les champs. |
| Ouverture d’une filière | Fermeture après confirmation, autre filière conservée ouverte, catalogue public réellement modifié et audit avec acteur et motif. |
| Années et rôles | Année suivante sans reprise des campagnes précédentes ; consultation toutes années sans commandes d’écriture ; passage au rôle marketing retire l’accès ; API admissions refusée avec HTTP 403. |
| Relevé établi | Lecture du document enregistré par la vraie route, identité et date figées, note absente distincte de zéro, document incomplet refusé avec HTTP 409, PDF et capture produits. |
| Candidature publique | Pièce CV issue de la règle commune, quatre étapes réelles jusqu’au statut RECU, pièce obligatoire manquante bloquante, fichier de recette transféré au stockage mémoire, pas de réception avant confirmation finale, dossier et pièce visibles dans le portail. |
| Connexion | Reprise après indisponibilité, refus de compte, changement de mot de passe, liens directs, changement de compte et déconnexion entre onglets. Un nouveau scénario vérifie qu’un refus du service de déconnexion supprime malgré tout la session locale. |

## Défaut confirmé et correction proposée

Dans un récapitulatif long sur mobile, l’erreur de sauvegarde est ajoutée sous le contenu, hors de la zone visible. Le bouton de confirmation reste affiché dans la barre fixe. Le test de visibilité trouve une intersection nulle entre le message et la zone visible (`viewport ratio 0`). La sauvegarde est correctement refusée ; c’est son retour visuel qui est insuffisant.

La correction proposée donne le focus au message d’erreur et fait défiler le formulaire jusqu’à lui, sans changer les valeurs ni soumettre à nouveau. Le patch est préparé dans `docs/proposals/ERREUR_FORMULAIRE_VISIBLE_2026-10-22.patch` et passe `git apply --check`. Il n’est pas appliqué : l’accord sur ce changement visible a été demandé conformément aux instructions du projet. Le test de régression reste volontairement en échec tant que ce défaut n’est pas corrigé ; il ne doit pas être présenté comme une suite intégralement verte.

## Limites fonctionnelles constatées

- Le parcours guidé actuel ne propose plus la création séparée des UE/composants ni leur archivage. Leurs protections SQL sont testées, mais cela ne rétablit pas ces commandes dans l’interface.
- La modification d’une matière porte sur son identité ; les crédits et le coefficient se saisissent lors de sa création, sans commande de modification dédiée dans ce parcours.
- Un rechargement complet d’un compte multirôle peut revenir à son rôle par défaut. La recette sélectionne explicitement Informaticien lorsque nécessaire ; elle ne prétend pas vérifier la mémorisation du rôle entre rechargements.
- L’impression relit les relevés déjà établis et complets. Elle ne crée pas de décisions de jury ni de nouveaux documents officiels.

## Vérifications et artefacts

- Build de production réussi : `ESCEN_BUILD_DIR=tmp/next-manual-review npm run build` (60 pages générées).
- `npm test` : workflows et 183 groupes de contrôles PostgreSQL réussis.
- TypeScript : `npx tsc --noEmit --incremental false`, sans erreur.
- ESLint : `npm run lint`, aucune erreur et deux avertissements préexistants.
- Configuration intégrée : `tests/ui/business-screen-review.config.ts` ; le site public doit être lancé séparément et `ESCEN_TEST_WEBSITE_URL` fourni pour inclure sa candidature dans la recette.
- Captures et PDF : `tmp/screenshots/business-review/`. Les captures de programme et de pièces existent à 390 et 1440 px. Le PDF `releve.pdf` contient exclusivement une identité et des résultats de recette.
- Reproduction du défaut mobile et traces de la suite : `test-results/business-screen-review/`.

Aucune migration créée ou modifiée, aucune suppression de fichier et aucun push. Le chantier reste ouvert pour la correction du défaut confirmé.

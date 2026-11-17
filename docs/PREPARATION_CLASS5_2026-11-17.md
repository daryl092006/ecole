# Préparation de publication Class5 — 17 novembre 2026

## Version prête

- Projet Vercel existant : `ecole`, équipe `denis-gangnitos-projects`, `prj_k0JnJTNXVrSNIMaK4MOt7cu0xRAR`.
- Source préparée : `f1a751fdf96163248f017c856a83a2524843c4a3`, extraite par `git archive`, incluant les deux commits locaux Class5 et lecture des replays.
- Déploiement préparé : `dpl_6P3j749K7tbsWW1xtZ1nQSCow2eN`, état `READY`.
- URL technique : https://ecole-log73k6jg-denis-gangnitos-projects.vercel.app
- Construction avec les paramètres de production et `--skip-domain`, sans promotion automatique.

## Version publique préservée

Au contrôle du 17 novembre à 19:13 UTC, `portail.escen.university` pointe toujours vers `dpl_84DxQsB1jVygUtwb4289Ne7fyxNg` (https://ecole-8rjp6fd3n-denis-gangnitos-projects.vercel.app), construit depuis `b480dc6d073e6dad3de2f9b14b0a371e125ed227`. Ce commit est bien un ancêtre de la source préparée. L'ancienne version constitue la référence de retour arrière.

La page publique `/connexion` répond HTTP 200. Aucun domaine, DNS ou alias public du portail n'a été basculé par cette préparation.

## Contrôles

- TypeScript sans incrémental, ESLint, `npm test` et 10 tests Playwright étudiants réussis sur la source préparée.
- Contrôle Vercel à blanc : 1156 fichiers, 11258151 octets, aucun fichier d'environnement, répertoire de travail privé, base locale ou fichier de compilation généré inclus.
- Les modifications préexistantes non commitées des éditeurs étudiants et de `ReviewedForm` restent dans le workspace ; elles ne sont pas dans l'archive publiée à Vercel.
- Les variables de production Supabase et Microsoft nécessaires existent ; leurs valeurs n'ont pas été exportées dans la source ni modifiées.
- Vercel confirme l'identifiant du projet, le commit de source en métadonnée et l'état `READY` du déploiement préparé.
- Les quatre requêtes anonymes sur l'URL technique (`/connexion`, `/api/course-resources`, lecture d'une séance et `/api/schedule`) reçoivent HTTP 302 vers la protection Vercel. Elles ne constituent pas des vérifications applicatives du nouveau serveur. La protection est conservée et aucun secret de contournement n'a été créé.

## Périmètre et suite

La version contient Class5 organisateur pour la création automatique des cours, le professeur coorganisateur confirmé et la lecture temporaire des vidéos privées après vérification du groupe, de l'année et de la correspondance exacte vidéo/réunion.

Les sept réunions à venir sont déjà basculées et vérifiées en base et dans Microsoft ; le replay Innovation du 16 novembre est associé. Aucun nouvel envoi d'invitation n'a été effectué pendant cette préparation. La collecte automatique des futurs replays reste à implémenter séparément.

La bascule finale du domaine vers ce déploiement reste à autoriser. Après promotion, contrôler les routes anonymes, l'interface publiée sur mobile et ordinateur, puis le parcours authentifié étudiant si une session de recette autorisée est disponible. Aucun push Git, déploiement de migration SQL ou changement de partage OneDrive n'a été effectué.

Les archives et preuves opérationnelles sont dans `tmp/teams-class5-release-f1a751f/`, hors de la source envoyée.

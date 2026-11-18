# Retrait des coefficients de matière

## Décision et comportement

L’utilisateur a demandé de retirer les coefficients de toute l’application. Les crédits constituent désormais le seul poids des matières pour les calculs de moyenne concernés, conformément au parcours REESAO existant. Les règles Devoir 40 % / Examen 60 %, les notes et les décisions déjà enregistrées ne sont pas modifiées.

Le retrait couvre le catalogue, les anciens écrans de groupes et d’UE encore présents dans le code, les types métier, les réponses de l’API de ressources pédagogiques et les calculs de relevé. Les API de catalogue et de création REESAO refusent un coefficient fourni dans une nouvelle demande. Les données sources historiques et les anciens événements d’audit sont conservés ; le champ n’est plus proposé dans les écrans d’archives.

## Base et périmètre autorisé

Le SQL de `docs/sql-proposals/20261118_remove_subject_coefficients.sql` a été présenté à l’utilisateur. Sa réponse « go » autorise la création et les tests locaux de la migration `202611180113_remove_subject_coefficients.sql`. Elle supprime la colonne `escen.curriculum_components.coefficient` et retire le champ du catalogue de lecture des anciens enseignements.

Aucune migration existante n’a été modifiée. Aucun schéma distant n’a été modifié. Le code n’a pas été poussé ni déployé pour cette étape. La migration et le déploiement de l’application devront être coordonnés : l’ancienne version transmet encore ce champ et la nouvelle ne le transmet plus.

Les deux dictionnaires du schéma ont été régénérés ensemble par `npm run db:describe`, exclusivement dans PGlite local.

## Vérifications

- TypeScript : `npx tsc --noEmit --incremental false`.
- ESLint : `npm run lint`.
- Workflows et PostgreSQL : `npm test`.
- Migration sur base peuplée : `scripts/verify-coefficient-removal.mjs`, intégré à `test:db` ; crédits et rattachements inchangés, anciens audits strictement identiques, création sans coefficient et crédits invalides refusés.
- Calcul : crédits égaux donnant des poids égaux, puis crédits différents donnant une moyenne pondérée différente.
- Catalogue, programmes et relevés : 17 tests navigateur ; les deux tests d’impression ont été adaptés au parcours actuel des documents établis.
- Cours étudiants et délégués : 13 tests navigateur, notamment conservation des liens de cours et replays et absence de droits de gestion supplémentaires.

Les tests de la migration historique 087 utilisent encore un coefficient dans leur ancienne base de test, pour contrôler cette version immuable. Cela ne réintroduit aucun champ dans les parcours actuels.

## Emplois du temps L3

Ce changement retire le coefficient des informations nécessaires à la poursuite de l’import. Il ne fixe ni n’invente les crédits des matières L3 et ne crée pas de séances supplémentaires. La Salle informatique et les trois matières nouvellement identifiées ont été enregistrées lors des étapes de données précédentes. L’anglais commun sans salle reste une consigne confirmée par l’utilisateur, à prendre en compte dans la suite du planning.

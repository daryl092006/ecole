# Synchronisation du portail et des accès aux cours — 13 novembre 2026

## Sources et données vérifiées

Les derniers commits de `origin/main`, jusqu’à `e2f5c2d`, ont été intégrés par fusion en conservant le commit local du compte test Master 2 et les modifications locales préexistantes. Les changements locaux de présentation sont conservés séparément.

La migration 109 des prospects est déjà inscrite dans l’historique distant ; sa table existe. Aucune migration distante n’a été appliquée pendant cette intervention. La migration 108 existante n’a pas été réexécutée : elle désactive des protections et supprime des lignes financières, ce qui ne fait pas partie de cette synchronisation.

Avant correction, l’année 2026-2027 contient 18 séances en ligne de Master 2 : 12 en Finance Digitale et 6 en Management de projets. Douze URL Teams proviennent de l’ancien repli fabriqué à partir de l’UUID de séance ; six séances FD n’ont aucun lien. Aucun enregistrement n’est rattaché en base.

Le compte test `193-ESC-2026` voit bien les 12 séances de son groupe. Le problème n’est pas un manque de permission de consultation, mais l’absence de liens Microsoft confirmés et de replays publiés.

## Corrections du code

- La création Teams résout d’abord l’identifiant Microsoft réel de l’organisateur : l’API refuse un UPN à la place du GUID dans les routes de réunions.
- `createOrGet` emploie l’identifiant de séance comme identifiant externe ; le secours calendrier emploie le même identifiant comme `transactionId` pour éviter les doublons.
- Une création refusée ou un événement calendrier sans lien confirmé produit une erreur explicite HTTP 503. Aucune URL de réunion n’est inventée.
- Les anciennes références `teams-<UUID>` ne sont plus exposées comme liens valides dans l’emploi du temps et l’espace des cours. Les données historiques restent conservées.
- La recherche des enregistrements est limitée à la réunion demandée. Le dernier fichier du dossier OneDrive de l’organisateur n’est plus associé arbitrairement à un cours.
- Une URL de contenu Graph exigeant un jeton applicatif n’est pas présentée comme un lien public de lecture. Lorsqu’un enregistrement est détecté, un lien de lecture OneDrive/SharePoint partagé avec les étudiants doit être associé.

## Synchronisation Microsoft réelle

Les calendriers de novembre des organisateurs ont été consultés sans correspondance initiale exacte pour ces séances. La création directe Teams est refusée pour les trois organisateurs avec HTTP 403 et `No application access policy found`.

La méthode calendrier autorisée a confirmé six réunions Teams du compte `academie@escen.university`, pour les séances FD des 16, 18, 20, 23, 25 et 27 novembre. Leurs vrais liens ont été enregistrés par une RPC transactionnelle existante avec audit et révision vérifiée. Aucun participant ni invitation n’a été envoyé. La création via calendrier ne garantit pas l’activation de l’enregistrement automatique.

Les comptes `b.yvon.coach@escen.university` et `d.arias.coach@escen.university` n’ont pas fourni de lien Teams via calendrier. Deux événements correspondant aux séances du 13 novembre ont été créés sans lien et sans invitation ; aucune URL n’a été ajoutée au portail pour ces comptes. Leur configuration Microsoft reste à régulariser, ou un lien de réunion réel doit être fourni.

Le rattachement de `163-ESC-2026` au groupe `L1 IA`, seul groupe de sa formation annuelle déjà réaffectée, a été rétabli par la RPC auditée existante. Contrats, échéances et paiements ont été comparés avant/après et sont inchangés. Aucun étudiant inscrit de l’année courante ne reste sans groupe après ce contrôle.

Les journaux locaux et les liens de réunions sont sous les chemins `tmp/.env.*`, exclus de Git. Les traces non confidentielles comprennent `tmp/course-access-membership-verification.json`.

## Validation

- TypeScript sans incrémental et ESLint : aucune erreur.
- `npm test` : workflows, 204 groupes PostgreSQL, vérifications complémentaires et prospects réussis.
- Tests de service : refus Microsoft, identifiants organisateurs, liens réels uniquement, idempotence et absence de partage d’un autre enregistrement.
- Playwright : consultation étudiante limitée à son groupe, absence de droits d’édition, lien Teams et replay publié à 390 et 1440 px ; trois tests réussis.
- API Prospects : validation, origine, authentification, droits, année et pagination vérifiés avec les vraies routes et un transport local simulé.
- Les replays ne sont pas annoncés comme disponibles : aucun lien d’enregistrement réel n’est présent dans les séances contrôlées. L’accès automatique aux artefacts nécessite aussi la politique d’accès applicative Teams côté Microsoft.

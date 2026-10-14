# Refonte et consultation des données ESCEN

La navigation sépare l’accueil, le pilotage, les activités de l’établissement et l’administration. Les écrans pédagogiques et financiers consultent les données conservées plutôt que des listes vides ou des valeurs simulées. Recherche, pagination, export de la page et détail des enregistrements permettent de retrouver les dossiers.

## Comptes

- 145 comptes étudiants et 28 comptes du personnel dans des annuaires distincts.
- Classement fondé sur le profil étudiant ou la provenance exacte de la fiche de personnel, jamais sur un rôle supposé.
- `admin@test.com` et `support@neostart.tech` : comptes retirés, accès applicatifs et Auth bloqués, anciennes attributions clôturées ; données originales et audit conservés.
- Désactivation, réactivation, retrait et changement du rôle principal passent par une commande PostgreSQL contrôlée. Les rôles supplémentaires sont conservés. L’utilisateur ne peut pas retirer son propre accès depuis cet écran.
- Les modifications civiles d’un dossier étudiant sont persistantes, limitées aux champs autorisés et auditées ; les données originales de la sauvegarde ne sont pas réécrites.

## Données historiques

Les 49 collections publiées comprennent notamment 145 inscriptions et rattachements, 143 dossiers de frais, 62 paiements, 576 échéances, 640 notes, 33 évaluations, 35 séances prévues et les sujets/réponses aux examens. Après retrait des comptes désignés, 12 526 lignes métier sont consultables. Les 15 566 lignes source restent conservées dans le staging privé.

Les identifiants sont résolus dans leur table et leur archive d’origine. Un identifiant manquant reste manquant ; aucune année, inscription, affectation ou règle de délibération n’est inventée. Les données historiques sont consultables par les comptes de direction générale et d’Informaticien disposant d’une attribution globale ; elles ne remplacent pas des workflows validés dans le modèle relationnel cible. Les autres rôles conservent leurs parcours et restrictions existants.

Les secrets d’authentification, tokens et paramètres techniques sensibles ne sont pas publiés dans les écrans. Les collections hors périmètre (prospection, candidatures, etc.) restent conservées dans les sauvegardes sans création de module métier.

## Pièces

120 références documentaires correspondent exactement à des fichiers transférés. Les 24 références sans fichier transféré sont signalées ; aucun fichier homonyme n’est substitué. Les liens de téléchargement sont privés, autorisés côté serveur et expirent après 60 secondes.

## Validation

- `npm run lint`, `npm run test`, `npm run test:legacy` et build de production passent.
- 26 groupes de contrôles PostgreSQL couvrent aussi le retrait historisé, les commandes refusées, la lecture historique, la redaction et le rapprochement exact des pièces.
- `ESCEN_UI_BUILD_DIR=.tmp/next-data-verification npm run test:ui -- tests/ui/persistent-data.spec.ts` : cinq tests réussis, dont dossiers, annuaires séparés, données financières et notes historiques, rechargement, erreurs, changement de rôle et retrait d’un compte, à 390 et 1440 px.
- Captures avec fixtures isolées : `.tmp/interface/390/refonte-accueil.png` et `.tmp/interface/1440/refonte-accueil.png`, relues ; autres captures dans les mêmes dossiers.
- `npm run db:verify:remote` : 19 migrations, 104 tables métier, 11 tables privées, aucune table sans RLS et refus des RPC anonymes confirmé.
- Vérification distante complémentaire : 145 comptes étudiants, 28 comptes du personnel, deux comptes désignés bloqués dans Auth et absents des annuaires ; téléchargement privé d’une pièce vérifié.

Les rapports privés de retrait restent dans `.tmp/account-retirements/`. Le dictionnaire relationnel est régénéré par `npm run db:describe`.

## Détails, copies et dossiers du personnel

Les détails historiques et les accès des comptes s’ouvrent dans un panneau latéral accessible (focus capturé, Échap, restauration du focus, défilement interne). Les examens proposent « Voir les copies » : réponses regroupées par étudiant, questions et résultats reliés par les identifiants source et le même lot d’archive. Une programmation sans réponse ne produit aucune copie fictive. Les réponses historiques restent en consultation ; aucune correction ou publication n’est simulée comme enregistrée.

La page `/personnel` présente les identités du personnel issues de la base et les profils historiques conservés. « Ouvrir le dossier » affiche contacts, matricule et contrats existants. « Nouveau membre » enregistre une personne et son dossier `staff` dans une transaction auditée. Un matricule officiel unique est obligatoire. Il est possible de compléter une identité du personnel existante plutôt que de créer une seconde personne. Aucun contrat, site, date d’entrée, compte Auth ou rôle n’est créé par supposition. Les accès de connexion restent un parcours distinct.

La migration 19 ajoute uniquement une RPC de lecture des copies, réservée au serveur ; les tables et les originaux historiques restent inchangés. Vérifications ajoutées : isolation des copies par évaluation et archive, création atomique du personnel, rejet des matricules en double, auteur dans l’audit, et parcours navigateur à 390/1440 px.

## Reprise de la consultation des examens

L’écran des examens dispose désormais d’une liste métier (matière, groupe, date, format), puis d’un espace complet de consultation des copies. Le panneau générique contenant les métadonnées source n’est plus utilisé pour les copies. La liste des étudiants reste à gauche sur ordinateur ; un sélecteur permet de changer de copie sur mobile. La recherche porte sur les noms et les enseignements résolus.

Le contrôle des vraies données a identifié 557 questions avec des énoncés HTML et 3 171 réponses JSON. Les énoncés sont rendus avec une liste limitée d’éléments HTML, sans scripts, attributs exécutables ni HTML injecté directement. Les champs `text`, `option_id`, `justification`, `commentaire_correction` et `corrige_le` sont décodés pour afficher les réponses, choix, justifications et corrections. Les questions suivent l’ordre des parties et du sujet. Seules les notes de l’étudiant sélectionné sont affichées ; aucune note finale n’est calculée à partir de réponses incomplètes. Les parcours navigateur vérifient aussi les changements d’étudiant, l’absence de fuite de leurs réponses respectives et la neutralisation des scripts.

## CRUD persistants

Voir [CRUD_PERSISTANTS.md](CRUD_PERSISTANTS.md) pour les écrans connectés, les autorisations, la reprise des référentiels et les workflows restant à porter. La migration 20 est appliquée ; 30 groupes de contrôles PostgreSQL et 14 parcours navigateur passent.

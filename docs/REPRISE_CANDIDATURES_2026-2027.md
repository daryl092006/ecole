# Année cible des candidatures de la sauvegarde

## État actuel : import appliqué et vérifié le 27 octobre 2026

Après accord explicite de l’utilisateur sur le SQL et son application distante,
la migration `202610270051_application_recovery.sql` a été créée à l’identique
de la proposition approuvée, puis appliquée au projet Supabase lié
`zmxapemyktxhppdxenzb`. Son enregistrement dans l’historique est dans la même
transaction que les changements de schéma. Les migrations 049 et 050 restent
absentes de la base distante : elles n’ont pas été appliquées par cette opération.

Le lot métier a ensuite été appliqué dans une opération atomique, avec contrôle
de la révision et de l’auteur, verrouillage et comparaison des dossiers et des
campagnes préexistants. La révision du portail est passée de **37 à 38**.

| Résultat vérifié dans la base active | Nombre |
| --- | ---: |
| Candidatures importées, toutes en 2026-2027 | 93 |
| Dossiers envoyés | 38 |
| Brouillons conservés et consultables | 55 |
| Admissions historiques conservées | 20 |
| Liens exacts avec un étudiant existant | 3 |
| Pièces disponibles importées | 125 |
| Campagnes supplémentaires, conservées fermées | 2 |
| Preuves sources conservées | 271 |
| Correspondances sources vers les dossiers et pièces | 218 |
| Événements d’audit INSERT avec l’auteur prévu | 220 |

Sur les neuf candidatures dont la filière source était absente, cinq dossiers
de Licence sont désormais rattachés à MPN après vérification dans les sauvegardes
antérieures ; les quatre dossiers de Master attendent une décision explicite
(voir le complément ci-dessous). Les 21 pièces introuvables dans le ZIP restent signalées
par des anomalies ; leurs références sources sont conservées. Le chevauchement
d’email est également signalé, sans fusion des identités différentes.

La comparaison après import confirme chaque champ prévu des 93 dossiers,
125 pièces et deux campagnes. Les 107 collections du snapshot général sont
identiques à leur état avant import après comparaison canonique des lignes.
Le brouillon de 2025-2026 déjà présent est intact. Aucun étudiant, compte,
paiement ou inscription annuelle n’a été ajouté par cette reprise.

La lecture authentifiée distante renvoie **93 candidatures pour 2026-2027** ;
l’accès anonyme est refusé (`42501`). Un téléchargement signé a été retesté
avec comparaison de son empreinte. Les 125 empreintes de fichiers avaient déjà
été vérifiées après leur transfert privé. Derniers contrôles distants :
27 octobre 2026, 12:48:32 UTC.

Preuves privées dans `/private/tmp/escen-admissions-20261027/` :
`before-response.json`, `migration-response.json`, `import-response.json`,
`after-response.json`, `remote-verification.json`, `audit-response.json`,
`api-verification.json` et `files-remote.json`. Les données nominatives restent
hors dépôt. Pour rafraîchir un écran ouvert avant l’import, utiliser
« Actualiser les dossiers » dans **Scolarité → Candidatures**.

Les vérifications TypeScript, ESLint, les 186 groupes de contrôles PostgreSQL,
les recettes métier existantes et les neuf contrôles locaux du lot complet
passent avec la nouvelle migration. Les deux documents de schéma ont été
régénérés ensemble avec `npm run db:describe`.

### Complément : filière MPN retrouvée dans les sauvegardes antérieures

Après la demande de poursuivre, les quatre archives ZIP disponibles et le dump
SQL d’août ont été relus. La filière `3` existe dans les sauvegardes du 27 août
et du 29 septembre : « Management de Projet Numérique », code `MPN`.
La filière actuelle « Management de Projets Numériques » porte ce même code,
unique dans les deux états de référence. Sa configuration 2026-2027 comporte
les niveaux Licence 1, 2 et 3.

Les cinq candidatures concernées de Licence ont été rattachées aux campagnes
MPN existantes de leur niveau, dans une transaction auditée. Aucune formation
n’a été créée ou ouverte. La preuve source du 29 septembre est conservée dans
`escen_private.recovery_candidates`, avec le nom de l’archive, son empreinte
SQL et la ligne historique de la filière. Les cinq anomalies correspondantes
sont résolues avec auteur et motif. Les versions des dossiers ont été incrémentées.

La révision est passée de **38 à 39**. Le contrôle distant confirme cinq UPDATE
audités, cinq anomalies résolues et une seule opération de reprise complémentaire.
Les 107 collections du snapshot, les 89 autres candidatures (dont le brouillon
préexistant), les campagnes et toutes les pièces sont inchangées. Les statuts,
admissions, années, identités et liens étudiants des cinq dossiers sont préservés.

Les quatre autres candidatures concernent Master 1 ou Master 2. La filière MPN
ne possède aucune campagne de Master dans l’année cible ; la filière
« Management de Projets & Transformation Digitale » en possède. Aucun changement
automatique de filière ni aucune ouverture de Master MPN n’a été effectué.
Une question a été adressée à l’utilisateur sur ce rattachement métier et reste
en attente de réponse.

Les 21 fichiers manquants sont absents des quatre ZIP disponibles, y compris
après recherche par nom de fichier. Leurs références et anomalies sont conservées.

Recette : `prepare-application-recovery.mjs --follow-up <plan privé>` rejoue
l’import initial puis la correction locale : erreur tardive avec rollback,
réussite des cinq rattachements, audit, autres dossiers inchangés et refus de
seconde application. TypeScript, ESLint et `npm test` passent.
Preuves privées complémentaires : `additional-backup-check.json`,
`missing-files-all-backups.json`, `program-follow-up.json`,
`program-follow-up.sql`, `before-program-recovery.json`,
`after-program-recovery.json`, `program-recovery-verification.json` et
`program-audit-response.json` dans le même répertoire privé.

## Historique de la préparation, avant l’accord et l’application

Décision utilisateur du 27 octobre 2026 : reprendre **toutes les candidatures
de la sauvegarde du 26 octobre dans l’année 2026-2027**. Ne pas déduire leur
année cible de l’année scolaire historique de la ligne source.

L’année cible a été vérifiée par lecture de la base liée :
`cbd8ee33-b322-43b2-9876-99636e5891d8`, année `2026-2027`, état `OUVERTE`.

## Lot vérifié

| Contrôle | Nombre |
| --- | ---: |
| Candidatures sources distinctes | 93 |
| Année historique 2025-2026 | 91 |
| Année historique 2026-2027 | 2 |
| Année cible 2026-2027 | 93 |
| Dossiers envoyés (`soumis_le` renseigné) | 38 |
| Brouillons (`soumis_le` absent) | 55 |
| Admissions historiques | 20 |
| Liens historiques vers un étudiant | 3 |
| Pièces rattachées aux candidatures | 146 |
| Tuteurs rattachés aux candidatures | 32 |

Conserver l’année historique comme provenance. Le changement d’année ne doit
ni envoyer les brouillons, ni créer une admission, une inscription annuelle,
un étudiant ou un paiement. Conserver les décisions historiques et rapprocher
explicitement les trois liens étudiants avant toute création de dossier.

## État de préparation et limite

Un manifeste privé associe chacun des 93 identifiants sources à l’année cible,
à son année d’origine, à ses indicateurs d’envoi/admission et aux identifiants
de ses pièces et tuteurs. Il ne contient ni mots de passe, ni jetons,
ni coordonnées personnelles. Il se trouve hors dépôt :
`/private/tmp/escen-admissions-20261027/year-plan.json`.

SHA-256 du manifeste :
`e768d40c1b6e79fc89132bc8bb92e63ac3c96b0c26c713d758a6a2dd35e7c63e`.

SHA-256 du SQL source lu dans le ZIP :
`114b1f29f40f94b58d791db4667c5523c5f18ee9253bc86d53bf558ac46c4524`.

**Ce manifeste prépare le rattachement ; il n’importe pas encore les dossiers.**
Aucune écriture distante ni migration n’a été exécutée pour cette préparation.
La lecture distante du 27 octobre confirme encore une seule candidature active,
un brouillon de 2025-2026 : ne pas le déplacer automatiquement sans rapprochement
avec la source. Les 93 lignes du manifeste ne doivent pas être annoncées comme
déjà présentes dans l’écran « Site web → Demandes en ligne ».

La reprise opérationnelle reste à construire et à vérifier : rapprochement des
doublons et des formations, conservation des admissions et des liens étudiants,
transfert vérifié des pièces, transaction auditée et contrôle après application.
Le parcours actuel masque les brouillons et n’offre que les états Brouillon,
Reçu, En analyse et Classé ; ne pas transformer les 55 brouillons en dossiers
envoyés pour contourner cette limite d’affichage.

## Lot transactionnel préparé après autorisation de reprise

L’utilisateur a demandé de procéder à l’import. Le lot complet a été construit
et rejoué en local le 27 octobre, à partir d’une lecture distante de révision 37.
Le brouillon déjà en base partage un email avec une candidature source mais
porte des noms différents : il reste intact et une anomalie de rapprochement
est créée, sans fusion automatique fondée sur le seul email.

- 93 candidatures, dont 38 envoyées et 55 brouillons ; les 20 admissions
  restent explicitement identifiées comme historiques, sans création d’étudiant.
- Les trois relations étudiantes sont résolues par les correspondances sources.
- Neuf candidatures envoyées pointent vers la filière source `3`, absente de
  la sauvegarde et des correspondances opérationnelles. Elles doivent conserver
  leur état, avec une formation non attribuée et une anomalie explicite.
- Deux campagnes absentes sont préparées fermées ; les autres sont réutilisées.
- 146 références de documents sont conservées. Le ZIP contient 125 de ces
  fichiers ; les 21 absents donnent lieu à des anomalies, sans faux téléchargement.
- Les 32 tuteurs sont conservés dans les dossiers et comme preuves sources.

Le schéma actuel interdit les dossiers envoyés sans campagne et masque tous les
brouillons. Le SQL proposé dans
`docs/proposals/RECOVER_APPLICATIONS_2026-10-27.sql` ajoute une provenance source,
un état historique et un lien étudiant, autorise uniquement les dossiers
historiques tracés sans campagne, puis inclut leurs brouillons dans la lecture
authentifiée existante. Les brouillons ordinaires restent exclus.
Les permissions existantes sont vérifiées avant toute lecture ; les chemins
privés des pièces restent exclus des listes et leur téléchargement est signé.

**Cette adaptation de schéma reste une proposition : aucune migration nouvelle
n’a été créée et aucune modification de schéma distante n’a été appliquée.**
L’accord spécifique prévu dans `AGENTS.md` est requis avant ces opérations.

Outils préparés :

- `scripts/prepare-application-recovery.mjs` : préparation hors ligne depuis le
  ZIP et une lecture privée de la base, sans accès distant. Produit le plan et
  la transaction dans le répertoire privé puis vérifie les 93 dossiers en PGlite.
- `scripts/upload-application-recovery-files.mjs` : contrôle des empreintes des
  125 fichiers ; `--upload` transfère uniquement dans le stockage privé du projet
  attendu, sans écrasement, puis retélécharge et compare chaque empreinte.

Preuves privées : `application-plan.json`, `application-import.sql`,
`application-validation.json`, `files-local.json`, puis `files-remote.json`
dans `/private/tmp/escen-admissions-20261027/`.

Recette locale : révision périmée et auteur non autorisé refusés, échec tardif
annulant tout le lot, seconde application refusée, 93 dossiers visibles dans
l’année cible, 125 pièces accessibles à la lecture autorisée, 220 événements
d’audit INSERT. Les gardes SQL sont actifs durant la transaction de reprise.
Les références historiques existantes sont copiées dans la base locale ; seul
le garde d’ouverture des campagnes est temporairement suspendu pendant leur
copie initiale, car certaines avaient été ouvertes avant la clôture de leur année.

Contrôles complémentaires réussis : TypeScript sans écriture incrémentale,
ESLint, `npm test` (186 groupes PostgreSQL et recettes existantes), cinq tests
Playwright du menu et des fiches historiques. Aucun compte, aucune inscription
annuelle, aucun paiement et aucune notification ne sont créés par ce lot.

Après accord : créer une nouvelle migration reprenant exactement le SQL approuvé,
vérifier sa compatibilité avec les migrations distantes (sans appliquer les autres
propositions en attente), relire l’état et la révision, appliquer la transaction
auditée et comparer les dossiers, pièces, admissions, anomalies et collections
préexistantes à leur état avant import. Ne pas annoncer l’import terminé avant
ce contrôle distant.

### Stockage privé vérifié

Le transfert autorisé des pièces est terminé : 125 fichiers créés dans le bucket
privé existant `escen-online-applications`, aucun écrasement, puis 125 empreintes
SHA-256 comparées après retéléchargement. Le rapport privé `files-remote.json`
confirme `verified=125`, `uploaded=125`, `reused=0`. Ces objets sont prêts pour
la transaction ; ils ne constituent pas encore des dossiers importés et ne sont
pas accessibles par le parcours public de candidature.

Le SQL métier reste non exécuté et la proposition de migration reste en attente
de l’accord spécifique demandé à l’utilisateur. Dernier commit de préparation :
`25b736c`. Ne pas confondre les 125 écritures de fichiers autorisées avec une
application de migration ou l’import des 93 candidatures.

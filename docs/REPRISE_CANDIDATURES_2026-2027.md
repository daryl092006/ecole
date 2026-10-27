# Année cible des candidatures de la sauvegarde

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

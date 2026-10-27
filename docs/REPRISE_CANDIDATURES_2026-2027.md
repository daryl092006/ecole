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

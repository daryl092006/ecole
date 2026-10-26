# Reprise opérationnelle du 26 octobre 2026 — première phase appliquée

## Données actives : application réelle vérifiée

Après la demande de réaliser la reprise, le premier lot additif a été appliqué
au projet Supabase lié `zmxapemyktxhppdxenzb`, puis vérifié le 26 octobre à
14:56:52 UTC. La révision est passée de 17 à 18.

| Table métier | Créations | Total distant après contrôle |
| --- | ---: | ---: |
| `people` | 2 | 177 |
| `students` | 1 | 146 |
| `staff` | 1 | 20 |
| `teachers` | 1 | 20 |
| `subjects` | 2 | 27 |
| `annual_fee_schedules` | 13 | 22 |

Les 20 lignes sont dans les tables métier actives. Chaque champ créé a été
comparé au plan. Les 101 autres collections du snapshot général sont identiques
à leur état précédent, après tri par identifiant et comparaison d’empreintes.
Le contrôle SQL confirme 20 événements d’audit INSERT avec l’auteur prévu,
20 correspondances de provenance, un seul import et aucune ligne `ARCHIVE_ONLY`.

La nouvelle personne issue du personnel possède son dossier et son profil
enseignant, attesté par le rôle Enseignant de la source. Aucune spécialité n’est
inventée. Le nouvel étudiant possède son identité et son matricule source.
Leur provisionnement Auth et leurs inscriptions/affectations restent des opérations
distinctes ; aucun nouveau compte ni droit n’a été créé dans ce lot.

## Outil et preuves

- `scripts/prepare-operational-recovery.mjs` lit les ZIP sans modifier les sources,
  vérifie le lot initial et prépare le différentiel sur les correspondances exactes.
  Il n’a aucune option d’application distante.
- `scripts/lib/operational-recovery.mjs` prépare les insertions additives et une
  transaction unique utilisant `escen_backend_transaction` et l’audit existants.
- `scripts/verify-operational-recovery.mjs` rejoue les contraintes SQL dans PGlite :
  révision périmée, auteur invalide, échec tardif avec annulation complète,
  réussite auditée et refus des deux formes de seconde application.
- La suite `npm test` inclut aussi les contrôles de préparation : stabilité des
  identifiants, secrets exclus, collision d’email, référence ambiguë, collision de
  tarif et sauvegarde déjà enregistrée.

Le premier envoi a reçu HTTP 413 avant exécution. La lecture distante a confirmé
la révision 17 et l’absence du nouveau lot avant toute nouvelle tentative.
L’envoi réduit contient uniquement les 17 lignes sources qui justifient les
20 créations métier. Le manifeste conserve le nombre total de lignes du ZIP
(16 107) ; cela ne signifie pas que toutes ces lignes ont été reprises. Les
prochaines phases devront ajouter leur propre preuve source sans modifier les
17 preuves immuables déjà enregistrées.

Lot privé appliqué : `/private/tmp/escen-operational-references-20261026-v2/`.
Les fichiers sont privés, hors dépôt ; le répertoire contient le plan, le SQL,
la validation locale, le résultat du CLI, le snapshot après application et les
comparaisons distantes. Le contrôle de l’audit a également été réalisé par CLI.

SHA-256 du SQL appliqué :
`34c8a3f89f90b3bcdae49d84f08728fc321958f31e5efa1698385745ff4b0ac5`.

## Évaluations : retour aux preuves de l’ancienne plateforme

Les captures et relevés DOM du 15 octobre ont été relus, notamment le constructeur,
la création d’évaluation, la fiche de notes et les copies. La sauvegarde récente
confirme cinq types de questions : QCM unique, QCM multiple, vrai/faux, texte court
et texte long ; les études de cas, les points, les choix et les corrections sont
des informations séparées.

Point décisif : les 22 nouvelles lignes de `notes` ont toutes `note=NULL` et
`notation=NULL`. Elles ne représentent aucune nouvelle note numérique.
L’évaluation source 92 comporte 40 réponses de deux étudiants, sans points attribués.
Ces données doivent permettre la correction de copies réelles, sans fabriquer de zéro.

Le champ source `published` est lié à la publication de la programmation.
Le relevé de création ancien affiche « Publier la programmation auprès des
étudiants concernés ». Il ne constitue pas à lui seul une preuve de publication
institutionnelle des résultats. Le premier import avait néanmoins marqué les
évaluations `PUBLIEES` ; le snapshot actuel contient 406 notes vides parmi ses
521 lignes de notes. Cela justifie une revue des états importés, pas une réécriture
générale et automatique des résultats.

Les 22 nouveaux candidats se répartissent sur deux évaluations opérationnelles
correspondant à la source 92. Elles sont `PUBLIEES`, mais n’ont actuellement
aucun candidat et aucune tentative. Le plan privé
`pending-evaluation-complement.json` conserve ce constat. Aucun de ces candidats
ni de ces résultats vides n’a encore été ajouté.

## Corrections du portail préparées dans cette phase

- Le statut historique `published` n’annonce plus automatiquement « Résultats
  publiés ». La date et la remise de correction déterminent le libellé adéquat ;
  le statut opérationnel explicite `PUBLIEES` garde son sens.
- Les copies étudiantes rendent les études de cas et distinguent texte court et
  texte long lorsque le protocole serveur fournit ces informations.
- Les choix QCM et la justification sont conservés ensemble lors d’un changement
  de choix et après reprise de la copie. La consultation enseignant affiche les
  deux éléments ; elle ne masque plus le choix au profit de la justification.
- La composition propose la justification uniquement si le serveur annonce
  explicitement cette capacité. Une requête manuelle incompatible est refusée
  avant toute sauvegarde. Un serveur ancien reste utilisable sans cette option.
- La limite des consignes de partie est alignée sur le schéma de validation.

Ces changements sont locaux ; aucun déploiement du portail n’a été effectué.

## SQL préparé, non exécuté

Le CLI confirme que Supabase s’arrête à **048**. Les migrations **049** (stockage
documentaire étudiant) et **050** (constructeur enrichi) existent déjà dans le
dépôt et n’ont pas été modifiées ni appliquées à distance pendant cette phase.

Deux propositions supplémentaires sont disponibles pour relecture :

1. `docs/proposals/SUBJECT_CAPABILITIES_2026-10-26.sql` : annonce de la capacité
   de justification uniquement après présence vérifiée du protocole enrichi,
   accès RPC réservé au serveur.
2. `docs/proposals/RECOVER_EMPTY_EVALUATIONS_2026-10-26.sql` : événements de
   régularisation immuables et audités, permettant le retour au brouillon d’une
   évaluation importée vide à tort marquée publiée. Refus si candidat, tentative,
   sujet ou transition existent ; preuve source exacte ; auteur IT global avec
   droits ; lot borné et révision contrôlée. Aucun trigger existant désactivé.

Ces propositions ne sont pas des migrations créées, ni une validation PostgreSQL
de leur application. AGENTS.md impose de présenter leur SQL et d’attendre l’accord
avant de créer les migrations. Il interdit aussi leur application distante pendant
le chantier : une dérogation explicite est nécessaire pour les appliquer à Supabase.

## Reste à réaliser

- Régularisation ciblée des deux évaluations vides, puis ajout des 22 candidats et
  résultats vides avec leur preuve source ; reprise fidèle des sujets et copies
  dans les tables actives et recette de la correction.
- Reprise du paiement de 480 000 FCFA et de ses quatre échéances : le lot actuel
  ne change pas les 62 paiements ni les 49 300 000 FCFA déjà encaissés.
  Ne pas contourner l’immutabilité des contrats pour modifier leurs échéances.
- Reprise des candidatures avec conservation de leur admission éventuelle,
  tuteurs, responsables de frais et documents dans les tables métier.
- Traitement des quatre contradictions année/groupe et de la ligne d’année
  « Master » : aucun groupe ni changement d’année inventé.
- Les 35 références sans fichier exact dans le nouveau ZIP n’ont pas été
  retrouvées non plus dans les trois ZIP antérieurs du dossier de sauvegardes.
- Provisionnement Auth des nouvelles identités ; aucune activation automatique
  ni envoi de notification effectué dans cette phase.

La reprise complète n’est donc pas déclarée terminée. Le premier lot est appliqué
et contrôlé ; les étapes SQL, les pièces et les parcours ci-dessus restent à traiter.

## Vérifications finales de phase

- TypeScript sans émission incrémentale : réussi ; lint : réussi.
- `npm test` : réussi, dont 185 groupes PostgreSQL, 10 contrôles enseignants,
  5 contrôles transactionnels de reprise et 6 contrôles de préparation.
- Playwright, configuration `legacy-evaluation-parity.config.ts` : 28 scénarios
  réussis, puis le scénario supplémentaire de consultation enseignant réussi
  après ajout ; 29 scénarios distincts validés. Ils couvrent notamment 390 et
  1440 px, reprise après coupure, concurrence et échéance, protocoles de réponse,
  permissions, navigation et consultation sans note inventée.
- Premiers échecs de lancement Chrome dans le sandbox, puis reprise autorisée
  hors sandbox. Deux nouveaux sélecteurs de test ont été précisés après leurs
  échecs : libellé exact des réponses et portée de la copie ouverte.
- Les propositions SQL nouvelles n’ont pas été exécutées ; leurs tests de base
  seront ajoutés après l’accord autorisant la création des migrations.
- Aucun push, déploiement, email, désactivation de trigger ou migration distante.

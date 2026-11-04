# Préparation des emplois du temps et du répertoire enseignants

## État

Préparation uniquement, aucune écriture distante. Les séances ne sont pas encore visibles dans le portail.
Rapprochement sur le snapshot de révision 93, à renouveler avant application.

La liste transmise comporte 63 entrées. L'adresse confirmée d'Enoc ADUAYOM est
`a.enoc.coach@escen.university`. Le guillemet parasite de l'adresse DOMLAN a été retiré.
Le compte DA d'AGBODJAN (`a.eric@escen.university`) doit être conservé avec ajout
du profil enseignant et du rôle ENS, sans créer de second compte ni supprimer DA.
Les noms existants ne sont pas remplacés automatiquement par ceux de la liste.

## Rapprochement des enseignants

| Résultat | Nombre | Suite |
| --- | ---: | --- |
| Profil enseignant retrouvé par email (dont ancienne adresse Enoc) | 13 | Conserver les identifiants ; examiner les différences de noms et emails |
| Personne retrouvée sans profil enseignant : AGBODJAN | 1 | Compléter sur le compte DA existant |
| Même nom mais adresse différente : KABONGO, KOUAKOU | 2 | Valider les identités avant changement d'adresse |
| Aucun rapprochement exact | 47 | Vérifier les homonymes et compléter les noms avant création |

Ces 47 lignes sont des candidats à la création, pas une preuve d'absence de doublons.
NANACHEVREUIL n'a pas de prénom fourni. Ne pas en inventer.
`b.ata.coach@escen.university` est rattaché à « ata BURCE » et
`amana.coach@escen.university` à « Dr AMANA ». L'email DOGBE est rattaché à
« Jean Pierre DOGBE », alors que la liste indique « DOGBE Kokou Messanh » : ne pas renommer sans confirmation.
La modification Enoc doit concerner de façon cohérente son identité et son utilisateur Auth existants.
Aucun nouveau compte Auth n'a été provisionné et aucun email envoyé.

## Emplois du temps

| Document | Période 2026 | Séances candidates |
| --- | --- | ---: |
| L1 TC | 19–30 octobre | 34 |
| L1 IA & GL | 19–30 octobre | 30 |
| L2 TC | 12–24 octobre | 36 |
| L2 IA & GL | 12–24 octobre | 38 |

Total : 138 occurrences, en répétant la grille sur les deux semaines indiquées.
Cette répétition reste une hypothèse d'import. Les TPE, activités de clubs et plages
libres sont conservés dans les PDF sources mais ne sont pas convertis en cours enseignants.
Une date passée n'atteste ni une présence ni un cours effectivement réalisé.

### Salles confirmées par l'utilisateur

Les cours sont en présentiel (`COURS`). Correspondances confirmées le 4 novembre 2026 :

| Groupe | Salle |
| --- | --- |
| L1 TC | Salle des L1 |
| L1 IA & GL | Salle IA 1 |
| L2 TC | Salle des L2 |
| L2 IA & GL | Salle IA 2 |

Ces libellés sont ajoutés aux séances candidates. Ils ne signifient pas que les salles
ont déjà été créées en base. L'utilisateur a demandé de retirer les bâtiments et
les capacités de l'application ; ces informations ne doivent plus être demandées.
Règle confirmée ensuite par l'utilisateur : lorsqu'un même enseignant dispense le
même cours au même horaire à plusieurs groupes, tous suivent le cours ensemble dans
la salle des L1. Cette exception prime sur la salle habituelle de chaque groupe.
Le fichier `cours-regroupes.json` conserve les groupes et PDF sources de chaque cours.
Des matières ou horaires de fin différents ne sont jamais fusionnés automatiquement.

### Blocages constatés

- 20 créneaux sont des cours communs confirmés, dans la salle des L1.
  Les contraintes `session_teacher_conflict` empêchent l'insertion de séances distinctes.
  Leur représentation persistante doit conserver tous les groupes concernés ; ne pas
  désactiver les contrôles ni supprimer les rattachements des autres groupes.
- Aucune salle n'existe dans le snapshot. Les quatre libellés sont désormais confirmés.
  Correction du constat précédent : site et bâtiment sont déjà facultatifs depuis la
  migration 028. La suppression des contraintes de capacité est intégrée dans la migration
  `202611040086_rooms_without_capacity.sql`, validée dans PGlite local.
  Elle n’a pas été appliquée à distance.
- Correction du constat initial : le groupe L2 IA existe sous le libellé « Licence 2 IA »
  (ID `90e081d0-1e56-4e10-9dc7-7854f155f5ea`), lié à Intelligence Artificielle & Génie Logiciel.
  Réutiliser ce groupe, ne pas créer de doublon. Le rapprochement initial cherchait
  seulement le libellé exact « L2 IA » et concluait à tort à son absence.
- Les maquettes L1 ne comportent pas les matières des PDF. Les groupes TC sont liés
  à plusieurs offres : il faut préciser les rattachements, sans inventer crédits ou coefficients.
- Sept intervenants des PDF sont absents de la liste : DOUSSIMELE, AZIATI, DEGLA,
  GAOU, MODEDZI, POTOKOYE et TETE. Ne pas fabriquer leurs coordonnées.

## Artefacts et reproduction

La source saisie se trouve dans `docs/imports/enseignants-2026-11-04.csv`.
Le script `scripts/prepare-october-timetables.py` ne dispose d'aucune connexion à la base
et ne produit aucun ordre d'écriture. Il exige Python avec PyMuPDF et un snapshot local
issu de la RPC de lecture. Il refuse d'écraser une relecture existante.

```bash
python3 scripts/prepare-october-timetables.py \
  --pdf-directory /Users/gdenis/Downloads \
  --snapshot tmp/integration-planning-2026-11-04/snapshot.json \
  --output tmp/integration-planning-2026-11-04/relecture-v4
```

Le dossier produit contient les empreintes SHA-256 des quatre sources, les séances
datées, les regroupements confirmés, les correspondances d'identité et l'inventaire
des matières par groupe. Les données du snapshot restent dans `tmp/`, hors commit.

L'étape suivante dépend de la création des salles confirmées, du rattachement persistant
des cours communs et des identités manquantes.
Tout SQL de migration devra être présenté avant accord, conformément à AGENTS.md ;
aucune migration distante ne doit être appliquée pendant ce chantier.

## Vérification du planning affiché

Nouvelle lecture distante : révision 93, six séances les 2, 4, 6, 9, 11 et 13 novembre
2026. Aucune séance en octobre. Le calendrier vide en octobre correspond donc aux
données réellement enregistrées, et non à un défaut d'actualisation.
La base ne contient encore aucune salle. Les noms de salles sont confirmés ; aucun
bâtiment ni nombre de places ne sera demandé pour cet import.
Le modèle actuel rattache une séance à une seule affectation et un seul groupe.
Un import fidèle des cours communs exige de traiter ce rattachement dans le modèle,
les contrôles de conflits, les droits d'accès et les feuilles de présence.


## Reprise — contrôle des 114 cours et proposition à valider

Contrôle hors ligne de `relecture-v5/cours-regroupes.json`, sur le snapshot de
révision 93 : 114 cours distincts, dont 20 communs, représentant 138 occurrences
par groupe. Comparaison de toutes les paires le même jour, avec intervalles
semi-ouverts `[début, fin[` : aucun chevauchement de salle, d’enseignant (libellé
source identique) ou de groupe après les regroupements. Ce contrôle ne vérifie
pas les homonymes et ne remplace pas une nouvelle lecture de la base avant import.
La répétition des grilles sur les deux semaines reste à confirmer explicitement.

### Proposition de représentation des cours communs

Une séance physique unique conserve le créneau, la salle et l’enseignant.
Chaque groupe participant conserve son affectation pédagogique et sa formation
via des rattachements explicites à cette séance. Aucun groupe « principal » ne
doit masquer les autres dans le planning ou les feuilles de présence.

Le SQL actuel ne permet pas de simplement ajouter les séances :

- `sessions` impose une seule affectation, formation et groupe par clé étrangère ;
- les exclusions concurrentes protègent enseignant, salle et groupe ;
- `attendances` impose la même formation que la séance ;
- les projections de planning, permissions et présences filtrent ces champs uniques.

L’évolution devra donc couvrir ensemble les rattachements multi-groupes,
les conflits de chacun des groupes, les périodes de chaque affectation, les
présences par inscription et formation, et les accès limités au groupe autorisé.
Les réservations enseignant et salle restent uniques. Les déplacements et
annulations d’un cours commun concernent tous ses groupes et doivent être
récapitulés avant confirmation. Les examens existants doivent conserver leurs
contraintes et leurs parcours actuels.

Cette proposition n’est pas encore implémentée. Avant toute nouvelle migration,
présenter son SQL complet et attendre l’accord ; exécuter ensuite uniquement en
local, avec tests de concurrence, rollback, droits et présences multi-groupes.

### Données encore nécessaires

- Confirmer la répétition hebdomadaire des quatre PDF sur les périodes indiquées.
- Fournir ou valider les rattachements aux matières et maquettes : les maquettes
  L1 et L2 IA du snapshot ne couvrent pas les cours sources, et les TC ont plusieurs
  offres. Ne pas inventer crédits, coefficients ou équivalences de libellés.
- Résoudre les identités des sept intervenants absents de la liste, ainsi que les
  rapprochements ambigus déjà décrits. Aucun compte ni email à créer implicitement.
- Relire un snapshot récent avant de préparer un lot d’écriture final.

Aucun cours, aucune salle et aucun enseignant n’ont été écrits à distance pendant
cette reprise. Les 114 cours restent des candidats à l’import.

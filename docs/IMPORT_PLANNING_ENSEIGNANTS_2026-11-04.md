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

### Blocages constatés

- 20 créneaux ont le même enseignant à la même heure dans plusieurs groupes.
  Les contraintes `session_teacher_conflict` empêchent l'insertion de séances distinctes.
  Les cours communs nécessitent un rattachement approuvé ; ne pas désactiver les contrôles.
- Aucune salle n'existe dans le snapshot. Une séance `COURS` exige une salle.
  Les PDF n'en précisent aucune. Ne pas passer artificiellement les séances en ligne.
- Le groupe L2 IA est absent de 2026-2027.
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
  --output tmp/integration-planning-2026-11-04/relecture-v2
```

Le dossier produit contient les empreintes SHA-256 des quatre sources, les séances
datées, les regroupements à confirmer, les correspondances d'identité et l'inventaire
des matières par groupe. Les données du snapshot restent dans `tmp/`, hors commit.

L'étape suivante dépend des salles, des regroupements et des identités manquantes.
Tout SQL de migration devra être présenté avant accord, conformément à AGENTS.md ;
aucune migration distante ne doit être appliquée pendant ce chantier.

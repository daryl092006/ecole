# Tarifs : cocher plusieurs filières

L’utilisateur confirme une sélection de filières à cocher dans le formulaire
de frais, avec le même niveau, mode et montant. Il demande aussi des icônes seules
pour les actions des listes.

## Comportement

- Les tarifs annuels de préparation proposent « Toutes les filières » ou des
  filières individuelles à cocher. Cocher une filière quitte le tarif général ;
  choisir toutes les filières efface la sélection individuelle. Une sélection
  vide est refusée et ne devient jamais un tarif général implicitement.
- Le récapitulatif affiche les filières concernées avant confirmation. Un tarif
  distinct est enregistré pour chaque filière cochée, avec le même montant,
  niveau et mode. L’option générale conserve une seule ligne à portée commune.
- La modification conserve l’identifiant du tarif initial et ajoute les autres
  tarifs choisis. Les conflits avec des tarifs déjà présents sont refusés avant
  écriture. Les contrats et paiements existants ne sont pas recalculés.
- Les actions de liste reviennent aux icônes seules, avec noms accessibles et
  infobulles. À la demande complémentaire de l’utilisateur, elles restent sur une
  seule ligne, sans retour à la ligne dans les listes du référentiel. Les
  confirmations d’écriture restent explicites.

## Écriture et contrôles

Le schéma existant suffit : aucune migration. La route de catalogue accepte une
sélection bornée à 50 filières et prépare un lot unique pour la RPC transactionnelle
existante. Authentification, droits globaux, permission de finance, année consultée,
révision, références actives, montant et unicité sont vérifiés. Les sélections
dupliquées ou mélangeant portée générale et filières individuelles sont refusées.
L’audit et la transaction existants s’appliquent ; aucune série de sauvegardes
indépendantes n’est déclenchée depuis le navigateur. Le portail s’actualise après
succès et conserve le récapitulatif en cas d’échec.

## Filtrage des filières par niveau

Le premier formulaire à cases proposait toutes les filières actives, sans tenir
compte du niveau : une filière réservée au Master pouvait donc être proposée
en Licence 1. Le niveau est maintenant placé avant les cases et filtre la liste
selon les rattachements actifs du catalogue des programmes de cours. Le filtre
ne déduit aucun niveau du nom d’une filière.

Changer de niveau retire de la sélection les filières devenues incompatibles,
sans les remplacer implicitement par « Toutes les filières ». Si la sélection
devient vide, il faut la compléter. Les deux protocoles d’enregistrement serveur,
tarif simple et sélection multiple, refusent une filière ne proposant pas le
niveau choisi. Une relation de programme archivée ne rend pas ce niveau disponible.
Les consultations et archivages des anciennes lignes restent possibles.

Les tests couvrent Licence 1 face à une filière de Master, le changement de niveau,
l’absence de sélection cachée, les références archivées et le refus serveur avant
transaction, en plus des sauvegardes, confirmations et actions sur une seule ligne.

## Vérification

- TypeScript sans émission incrémentale et ESLint : réussis après les corrections.
- `npm test` : workflows et 185 groupes de contrôles PostgreSQL réussis, ainsi
  que les contrôles enseignants et reprise. Les nouvelles assertions de sélection,
  tarif général, modification, borne de lot, doublons et archivage ont ensuite
  été validées par `node scripts/verify-workflows.cjs`.
- Dernière campagne annuelle après filtrage par niveau : 34 tests réussis,
  configuration `annual-offerings.config.ts`. La création et la modification
  sont vérifiées avec les vraies routes API, Auth et transport RPC simulés
  localement. Les scénarios de tarif couvrent 360, 390 et 1440 px ; le choix des
  filières par niveau est vérifié à 390 et 1440 px.
- Mobile et ordinateur : plusieurs filières, sélection vide refusée, récapitulatif,
  absence d’écriture avant confirmation, refus RPC sans tarif partiel et reprise
  après échec. La liste finale affiche chaque filière et les icônes restent
  accessibles sans débordement.
- Capture mobile inspectée :
  `tmp/screenshots/annual-offerings/390/frais-filieres-cochees.png`.

Un contrôle TypeScript lancé pendant une régénération des types Next.js a signalé
des fichiers temporaires absents ; le contrôle a été repris après arrêt du serveur.
Une annotation de type dans les nouvelles assertions a aussi été corrigée.

Aucun enregistrement distant, changement des données réelles, push ou déploiement.

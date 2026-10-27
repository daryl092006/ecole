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

## Vérification

- TypeScript sans émission incrémentale et ESLint.
- `npm test` : workflows et 185 groupes de contrôles PostgreSQL réussis, ainsi
  que les contrôles enseignants et reprise. Les nouvelles assertions de sélection,
  tarif général, modification, borne de lot, doublons et archivage ont ensuite
  été validées par `node scripts/verify-workflows.cjs`.
- La campagne annuelle comporte 32 scénarios distincts. Le premier passage en
  valide 29 ; les deux nouveaux tests de formulaire sont corrigés pour cibler
  l’alerte de la fenêtre plutôt que l’annonceur Next.js. Le test de présentation
  à 1440 px est repris après un chargement de développement interrompu. Les cinq
  scénarios ciblés passent ensuite. La création et la modification sont vérifiées
  avec les vraies routes API, Auth et transport RPC simulés localement.
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

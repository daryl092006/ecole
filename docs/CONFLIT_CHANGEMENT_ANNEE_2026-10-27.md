# Conflit lors d’un changement d’année

Le journal fourni contient des messages Fast Refresh, un avertissement de défilement
Next.js et une réponse HTTP 409 de `/api/academic-years`. Il ne contient pas le
corps de cette réponse : le motif exact du refus observé par l’utilisateur n’est
donc pas établi à partir de ce seul journal.

Un défaut de révision périmée a été identifié et reproduit : la préparation peut
modifier les paramètres et la révision globale, tandis que le catalogue des années
conserve la révision de son chargement initial. Le parcours d’ouverture depuis la
préparation transmettait alors cette ancienne révision à la commande annuelle.

## Correction

- Avant d’afficher la confirmation d’activation ou de désactivation, une lecture
  authentifiée recharge la révision, les états des années et l’année de travail.
  La vue GET `view=change` reste réservée à la permission de pilotage global.
- La confirmation et la commande utilisent ce même bilan. L’absence d’année de
  travail reste une valeur explicite, sans repli vers un ancien contexte.
- La révision est figée pendant la confirmation : une écriture concurrente après
  ce bilan continue de provoquer un refus. « Actualiser les informations » recharge
  le bilan sans écriture et exige ensuite une nouvelle confirmation.
- Le chemin depuis « Ouvrir l’année » dans la préparation utilise aussi cette
  lecture. Les règles existantes d’ouverture, de préparation et de clôture, les
  RPC, permissions et confirmations sont conservées. Aucun 409 n’est contourné et
  aucune commande n’est rejouée automatiquement.

Le message d’auto-défilement a été vérifié dans le code Next.js installé : il est
émis uniquement en développement quand le routeur ignore un élément fixe ou
collant. Le lien d’accès rapide et les protections `inert` ne sont pas retirés.
Les lignes Fast Refresh correspondent aux recompilations de développement.

## Vérification

- 13 tests Playwright réussis à 390 et 1440 px : révision modifiée avant l’ouverture
  de la confirmation, modification après affichage, actualisation sans écriture,
  ouverture depuis la préparation, contexte sans année de travail, erreurs de
  préparation et authentification/permissions de la nouvelle lecture.
- `npm test` : réussi, dont 186 groupes PostgreSQL et contrôles de reprise.
- ESLint : réussi ; TypeScript sans émission incrémentale : réussi, séparément
  après l’arrêt du serveur de test.
- Captures de contexte déplacées vers `tmp/screenshots/academic-year-context/`
  pour éviter les écritures des anciens tests dans le répertoire protégé `.tmp/`.
  Ce dossier d’artefacts est ignoré par Git.

Les réponses métier des tests sont locales. Aucune activation ou clôture réelle,
migration, écriture distante, notification, publication ou push.

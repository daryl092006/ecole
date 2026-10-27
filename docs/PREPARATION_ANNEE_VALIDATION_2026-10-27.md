# Préparation de l’année : enregistrement et statut

L’utilisateur ne repérait pas comment enregistrer les rubriques ni faire passer
l’encaissement de « À vérifier » à « Prêt ».

Les écritures existaient déjà : les actions de liste étaient des icônes. Le lot
affiche leurs libellés dans la préparation annuelle et conserve les boutons
d’enregistrement du formulaire, puis la confirmation de `ReviewedForm`.
Les listes acceptent le retour à la ligne des actions sur téléphone.
Une aide courte distingue les lignes déjà enregistrées des propositions à valider.
La vue des cinq rubriques explique le calcul automatique et affiche le détail
fourni par le serveur lorsqu’une rubrique reste incomplète.

## Conditions existantes, conservées

| Rubrique | Passage à Prêt |
| --- | --- |
| Formations proposées | Au moins une formation et des références de filière, programme et niveau valides |
| Groupes | Chaque formation annuelle est reliée à un groupe de même année et niveau |
| Scolarité | Un tarif commun ou des tarifs ciblés couvrent toutes les formations annuelles |
| Inscription | Même contrôle de couverture pour les tarifs d’inscription |
| Encaissement | Au moins un moyen de paiement actif enregistré pour l’année |

Le statut ne constitue pas une attestation manuelle que toutes les propositions
ont été validées : il reflète ces contrôles de données existants.
Un élément proposé depuis l’année précédente n’est pas encore enregistré pour
l’année cible. Le passage de 4 à 5 après confirmation du dernier moyen
d’encaissement est vérifié sur téléphone et ordinateur, sans écriture avant
confirmation et sans bouton de validation globale.

## Frais pour plusieurs filières ou groupes

La demande a ensuite été précisée : cocher plusieurs filières pour un même tarif,
avec le niveau et le mode choisis. L’utilisateur a également demandé de revenir
aux icônes seules pour les actions de liste. Cette suite est décrite dans
[la mise en place des cases à cocher](TARIFS_FILIERES_2026-10-27.md).
Les constats et vérifications ci-dessous décrivent le premier lot, avant cette
précision ; ils ne décrivent pas le rendu final des actions de liste.

## Vérifications

- TypeScript sans émission incrémentale et ESLint : réussis.
- Suite `annual-offerings.config.ts` : 27 tests réussis après alignement des
  entrées sur le parcours actuel « Ouvrir l’année », puis « Préparer/Configurer ».
- Ajout de deux scénarios de transition réelle de 4 à 5 rubriques : réussis à
  390 et 1440 px. Leur fixture initiale a été corrigée pour inclure les dates
  obligatoires des années ; une réponse incomplète était rejetée au chargement.
- Les tests d’encaissement et de présentation ont aussi été rejoués après la
  réduction des textes d’aide. Les anciennes attentes imposant quatre icônes
  sur une seule ligne ont été remplacées par la visibilité du libellé « Valider »
  et l’absence de débordement ; les contrôles de sauvegarde et de confirmation
  ont été conservés.
- Inspection de la capture d’encaissement à 390 px : libellés visibles et actions
  disposées sur plusieurs lignes, sans débordement.

Aucun changement backend, SQL, permission ou règle de préparation. Les écritures
restent sur les parcours existants avec actualisation du portail. Aucun push,
déploiement ou enregistrement dans les données réelles.

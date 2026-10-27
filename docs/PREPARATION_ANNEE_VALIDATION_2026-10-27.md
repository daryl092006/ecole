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

## Fin de rubrique explicitée

Après la question complémentaire sur l’encaissement et les autres sections,
le bouton commun « Retour à la préparation » devient « Terminer la rubrique ».
Le nombre d’éléments enregistrés et de propositions non enregistrées reste visible.
L’aide des listes rappelle que chaque élément est sauvegardé après confirmation ;
le formulaire indique aussi de vérifier puis confirmer le récapitulatif.

Le parcours est : Ajouter ou Modifier, enregistrer dans le formulaire, confirmer,
puis terminer la rubrique depuis la liste. Le bilan recharge les contrôles serveur.
Terminer ne marque pas artificiellement une rubrique prête et ne valide pas les
propositions encore en attente. Les tests d’encaissement vérifient le retour
à 4 sur 5 sans écriture, puis à 5 sur 5 après une confirmation réelle, et enfin
la consultation d’un moyen enregistré suivie d’une fin de rubrique sans nouvelle
écriture. Le même bouton est vérifié dans les formations proposées.
Recette de cette clarification : 34 tests Playwright réussis, TypeScript sans
émission incrémentale et ESLint réussis. Les contrôles métier/base avaient aussi
réussi pour la correction précédente empêchant les créations pendant une modification.

## Frais pour plusieurs filières ou groupes

La demande a ensuite été précisée : cocher plusieurs filières pour un même tarif,
avec le niveau et le mode choisis. L’utilisateur a également demandé de revenir
aux icônes seules pour les actions de liste. Cette suite est décrite dans
[la mise en place des cases à cocher](TARIFS_FILIERES_2026-10-27.md).
Les constats et vérifications ci-dessous décrivent le premier lot, avant cette
précision ; ils ne décrivent pas le rendu final des actions de liste.

## Encaissement : retrait conservé après réouverture

Le retrait d’une proposition utilisait seulement l’état React
`excludedPrefilledIds`. Fermer la rubrique détruisait cet état ; la proposition
était alors reconstruite depuis l’année précédente. Ce retrait est désormais
confirmé dans `ReviewedForm` puis enregistré pour l’année cible.

Le schéma existant suffit : une définition inactive de ce moyen conserve le
retrait annuel et son motif. Elle ne devient pas un moyen utilisable et ne compte
pas dans la préparation. Le filtrage des propositions tient déjà compte des
définitions actives ou archivées de l’année cible. La configuration source est
relue côté serveur et reste inchangée. Le serveur refuse une source absente,
archivée ou d’une année non antérieure, un mauvais contexte annuel, une révision
périmée et un acteur sans droit. Un retrait déjà enregistré est sans nouvel effet.
Un moyen actif doit passer par son archivage normal, pas par ce retrait de proposition.

L’écriture utilise la RPC transactionnelle et l’audit existants. Aucun masquage
local n’est annoncé comme réussi avant la réponse du serveur. Un échec laisse
le récapitulatif ouvert et permet de réessayer. Aucun changement de migration,
de permission ou de données distantes.

La recette reproduit le parcours signalé : retirer, confirmer, terminer, rouvrir,
puis recharger la page et rouvrir encore. La proposition reste absente à 390 et
1440 px. L’archivage d’un moyen déjà enregistré est aussi suivi jusqu’à la
réouverture. Les tests PostgreSQL vérifient la définition inactive, l’audit avec
son auteur, la conservation de la source et le rollback en cas d’échec tardif.
Vérifications de ce correctif : 37 tests Playwright, 186 groupes PostgreSQL,
workflows, TypeScript sans émission incrémentale et ESLint réussis. Les anciens
retraits purement locaux ne peuvent pas être reconstitués : leur sélection doit
être confirmée de nouveau par l’utilisateur.

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

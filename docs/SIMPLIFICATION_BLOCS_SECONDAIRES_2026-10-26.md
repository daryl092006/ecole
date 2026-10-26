# Blocs secondaires et fiche étudiant

## Demande appliquée

- Retrait de « Historique du dossier » et « Retirer ce dossier de l’annuaire » dans la fiche étudiant, y compris son ouverture en fenêtre. Les données historiques et les traces d’audit ne sont pas effacées.
- Remplacement des blocs dépliants des modules par un bouton ouvrant une fenêtre `WorkPage` : paiements, affectations, remboursements et avoirs, vérification des pièces, traçabilité des notes, réclamations, archives du personnel, droits d’accès, brochures et exports historiques.
- Même présentation pour les séances dont les dates sont invalides dans le calendrier.
- Le composant partagé `SecondaryDetails` conserve les protections de `DetailDrawer` : focus, fermeture au clavier et protection des formulaires. Les informations secondaires ne s’insèrent plus dans la page principale.

Les règles financières, autorisations et confirmations `ReviewedForm` sont conservées. Aucun changement SQL, API ou service métier. Le menu du compte reste un menu ; les anciens composants de prototype non montés ne font pas partie de cette refonte.

## Vérifications

La suite `tests/ui/secondary-details.config.ts` contrôle la fiche étudiant à 390/820/1440 px, l’ouverture et la fermeture au clavier d’une fenêtre secondaire, les réclamations, encaissements, affectations, annulations, remboursements, avoirs et reçus. Les données de tests financiers ont été alignées : les anciens tests mélangeaient une identité d’archive et des contrats rattachés à un autre identifiant étudiant. Les mutations des tests restent simulées et locales.

Captures : `tmp/screenshots/secondary-details/`. Les modifications préexistantes des sujets et examens sont préservées.

Résultats : 31 tests Playwright réussis ; TypeScript sans écriture incrémentale, ESLint et `git diff --check` réussis. Inspection visuelle de la fiche étudiant à 820 px.

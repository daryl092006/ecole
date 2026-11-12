# Ergonomie des listes — 12 novembre 2026

Les pages `/site-web/demandes` et `/site-web/documents` avaient des filtres collés au cadre, des titres et actions disposés différemment et, pour les formations, des cartes imbriquées par filière. La présence d’un tableau déclenchait une règle CSS globale supprimant les marges internes du conteneur, y compris celles nécessaires aux filtres.

## Corrections

- Nouveau composant partagé `DataPanel` : en-tête, métadonnées, filtres, contenu et décompte disposent chacun d’un emplacement explicite et de marges stables.
- Candidatures : filtres standards par recherche, filière, niveau et statut, réinitialisation commune, référence complète conservée.
- Formations et pièces : deux listes distinctes (pièces par niveau et formations), tableau unique de formations avec pagination, filtres et décompte ; fin des cartes imbriquées par filière. L’action Actualiser rejoint l’en-tête.
- L’ouverture du volet de configuration conserve la page et ses filtres en arrière-plan.
- Le détail financier et la liste native des épreuves utilisent le même panneau ; les exports ont un libellé visible et la recherche reste accessible sur les listes courtes.

Aucune modification des calculs financiers, des permissions, des API ou du schéma. Les formulaires sensibles et leur relecture restent en place. Les données de recette sont simulées ; aucune écriture distante.

## Vérification ciblée

`tests/ui/page-layout.spec.ts` : cinq tests, un par largeur (360, 390, 768, 1024, 1440 px), tous réussis. Ils vérifient les marges et l’absence de débordement, les états sans résultat, la réinitialisation, 18 formations à intitulés longs, les filtres combinés, la pagination 10/8, l’ouverture et la fermeture du volet et l’absence de requête d’écriture.

Captures : `tmp/screenshots/page-layout/<largeur>/demandes.png`, `documents.png` et `documents-bas.png`.

- [Candidatures, ordinateur](../tmp/screenshots/page-layout/1440/demandes.png)
- [Formations, ordinateur](../tmp/screenshots/page-layout/1440/documents.png)
- [Formations, téléphone](../tmp/screenshots/page-layout/360/documents.png)
- [Bas de la liste, téléphone](../tmp/screenshots/page-layout/360/documents-bas.png)

L’absence de débordement ne suffit pas à garantir l’ergonomie de chaque écran : le contrôle visuel porte ici sur les pages citées et la structure partagée. Les autres écrans peuvent encore nécessiter une revue métier et visuelle.

## Vérification générale

TypeScript (`npx tsc --noEmit --incremental false`) et ESLint (`npm run lint`) : aucune erreur. Audit responsive : 77 écrans aux cinq largeurs, soit 385 vues et aucun problème de débordement signalé. Rapports JSON : `tmp/screenshots/page-layout-audit/audit-<largeur>.json`.

La première exécution ciblée attendait à tort 18 lignes simultanément malgré la pagination de dix lignes. Cette assertion a été corrigée ; la nouvelle exécution complète des cinq tests ciblés est réussie. Les cinq tests de l’audit général sont également réussis.

# Adaptation de la référence ESCEN — 25 octobre 2026

À la demande de l’utilisateur, application locale des éléments utiles observés sur https://escendemo.neostart.tech/ : navigation claire par domaine, cartes et indicateurs lisibles, filtres regroupés et tableaux structurés.

## Réalisé

- Navigation latérale blanche, rubriques repérées par une bordure colorée, pictogrammes sur fond léger et page active bleue.
- Plusieurs domaines peuvent rester dépliés simultanément ; changer de page ne replie plus les autres domaines.
- Fond clair du portail, titres de module repérés, barres de recherche et de filtres encadrées.
- Indicateurs avec pictogrammes colorés et lignes de tableaux alternées. Les couleurs existantes de succès et de danger sont conservées.
- Adaptation portée par les styles et la navigation partagés des écrans authentifiés ; aucune règle pédagogique ou financière modifiée.

Cette adaptation ne constitue pas une charte officielle ESCEN ni une déclaration de finalisation de toutes les fonctionnalités. Aucun déploiement ni aucune écriture métier sur le site de référence.

## Vérifié

- `npx tsc --noEmit --incremental false` : aucune erreur.
- `npm run lint` : aucune erreur, deux avertissements préexistants.
- `npx playwright test --config tests/ui/reference-presentation.config.ts` : les 17 tests existants de présentation et de corrections responsives réussis, puis le test ajouté de maintien des domaines ouverts réussi.
- Largeurs couvertes par les tests : 360, 390, 768, 769, 1024 et 1440 px. Consultation des captures du tableau de bord à 390 et 1440 px.
- Captures locales : `tmp/screenshots/visual-refresh/dashboard-390.png` et `dashboard-1440.png`.

Les modifications de documents étudiants et les autres modifications préexistantes sont hors du périmètre de cette adaptation.

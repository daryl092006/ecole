# Simplification transversale du portail — 26 octobre 2026

La direction proposée dans `proposals/SIMPLIFICATION_GLOBALE_2026-10-26.md` a été autorisée par l’utilisateur pour l’ensemble de l’application.

## Modifications

- Navigation commune : chaque domaine ouvre une page directement. Les pages autorisées du domaine sont visibles dans la zone de travail, avec indication de la page active. L’accueil ouvre toujours le tableau de bord ; le domaine Examens ouvre les examens si cette page est autorisée.
- Accueil : tâches explicites pour chacun des 14 rôles, intersectées avec les pages autorisées ; tâches avant les compteurs ; retrait de l’annuaire repliable qui répétait le menu. Les indicateurs détaillés restent dans le pilotage.
- Dossiers : filtres visibles sans ouverture préalable. Depuis les versements, le dossier sélectionné ouvre sa section financière ; depuis les réinscriptions, sa section de parcours. Les autres ouvertures gardent leur comportement habituel.
- Finance actuelle et archives, planning historique : dates de filtrage directement visibles.
- Cours, planning, notes, préparation des années et formations du site : éléments de travail et actions de configuration visibles sans dépliage préalable.
- Écrans génériques : contexte présenté comme du texte, liens pour continuer visibles. Les confirmations d’écriture, l’audit et les contrôles de droits sont conservés.
- Règles académiques : retrait des valeurs numériques proposées, non approuvées, de l’affichage. Aucune règle de calcul n’a changé.

Les historiques et le retrait sensible d’un dossier restent repliables. Aucune migration, nouvelle permission, dépendance ou modification des API dans cette intervention. Les modifications préexistantes relatives aux sujets et épreuves ont été préservées.

## Vérification

- `npx tsc --noEmit --incremental false` : réussi.
- `npm run lint` : réussi.
- `npx playwright test --config tests/ui/simplified-navigation.config.ts` : 15 tests réussis. Navigation, filtres, retour navigateur, ouverture financière et restrictions des rôles Étudiant/Délégué/IT.
- `npx playwright test --config tests/ui/simplified-responsive.config.ts` : 5 tests réussis, soit 17 écrans aux largeurs 360/390/768/1024/1440, sans anomalie détectée.
- Captures et rapports : `tmp/screenshots/simplification-globale/after/`. Inspection visuelle des captures d’accueil et de dossiers sur mobile.

Une première tentative d’audit exhaustif des 72 écrans s’est interrompue à la fermeture inattendue de Chrome. Les 65 premiers écrans à 360 px avaient été enregistrés sans anomalie. La reprise ciblée des 17 écrans touchés est entièrement passée aux cinq largeurs. Les rapports JSON peuvent contenir ces observations initiales en plus des observations de la reprise ; le succès de la reprise concerne précisément les 17 écrans sélectionnés par sa configuration.

## Limites

Cette étape applique une simplification commune à toutes les rubriques et des améliorations dans les écrans cités. Elle ne constitue pas une recette exhaustive de toutes les opérations métier ni l’implémentation des capacités encore absentes. Les compensations, passages de niveau et nouvelles délibérations restent conditionnés aux règles institutionnelles approuvées. Aucun test métier/base n’a été lancé : les changements portent sur la présentation et le contexte d’ouverture des composants existants.

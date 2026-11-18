# Architecture visuelle commune des écrans ESCEN

Référence demandée le 18 novembre 2026 : les pages du portail suivent la même organisation visuelle que Candidatures et Examens, en respectant les besoins propres à chaque métier.

## Structure d’un écran

1. `PageHeader` : contexte, titre, description courte et actions autorisées. L’action principale utilise le bouton primaire ; les autres actions restent secondaires.
2. `WorkspaceSummary`, uniquement si des indicateurs réels et utiles existent. Préciser la période et le périmètre ; distinguer une valeur inconnue d’un zéro. Ne pas ajouter de chiffres ni de règles métier pour remplir une carte.
3. `DataPanel` : titre de la liste, nombre de résultats, filtres, contenu et bilan des résultats. Utiliser ses emplacements `toolbar`, `meta` et `footer` plutôt que des panneaux imbriqués.
4. `ResponsiveTable` dans `.table-wrap` : colonnes lisibles sur ordinateur, défilement local si nécessaire, fiches étiquetées sur mobile. Conserver les en-têtes et les noms accessibles des actions.
5. `WorkPage` / `DetailDrawer` : consultation et édition détaillées. `ReviewedForm` reste obligatoire pour les écritures sensibles.

Les calendriers, éditeurs, parcours personnels et pages publiques gardent leur structure adaptée à leur usage. La cohérence concerne les titres, espaces, champs, boutons, statuts et comportements responsive ; elle n’impose pas un tableau ou des indicateurs sur tous les écrans.

## Styles et adaptation

- Styles sémantiques dans `src/app/globals.css` ; tokens `--workspace-gap`, `--workspace-panel-radius`, `--workspace-accent` et `--workspace-primary-surface` dans le `:root` existant.
- Les styles communs de `PageHeader`, `DataPanel`, `.panel-filter-grid` et `WorkspaceSummary` constituent la base des nouveaux écrans. Limiter les styles propres à une page aux particularités utiles de son métier.
- Grilles fluides avec `minmax`, retour à la ligne des actions et largeur minimale nulle des conteneurs. Ne pas masquer un débordement global pour dissimuler un contenu inaccessible.
- Conserver uniquement les seuils CSS 480, 768 et 1024 px. Une largeur testée supplémentaire n’est pas un nouveau breakpoint.
- À 768 px et moins : filtres en colonne, tableaux en fiches, calendrier en liste, contrôles de saisie d’au moins 16 px et boutons tactiles d’au moins 44 px dans les espaces de travail.
- Sur ordinateur : les tableaux trop larges défilent dans leur conteneur ; la page ne doit pas défiler horizontalement.
- Les fenêtres gardent le focus captif, la fermeture clavier et les protections contre la perte de saisie.
- Ne pas réintroduire de pastilles à initiales pour décorer les lignes des candidatures.

## Vérification

`tests/ui/workspace-layout.spec.ts` parcourt les routes du portail, les accueils de domaine, un dossier étudiant et les principales pages publiques. Les données de recette sont isolées : aucun appel métier distant ni écriture distante.

La matrice vérifie les largeurs 320, 390, 480, 768, 820, 1024, 1440 et 2560 px. Des parcours représentatifs vérifient aussi 479, 481, 600, 767, 769, 1023, 1025, 1280 et 1920 px, avec une hauteur de 600 px, ainsi que l’ouverture et la fermeture clavier de la navigation.

Commande :

```bash
npx playwright test --config tests/ui/workspace-layout.config.ts
```

Captures et diagnostics JSON : `tmp/screenshots/workspace-layout/`. Ces contrôles couvrent un large éventail de formats et les transitions de mise en page ; ils ne constituent pas une garantie sur tous les appareils, navigateurs ou contenus possibles.

## Bilan de la vérification du 18 novembre 2026

- 61 écrans × 8 largeurs : 488 vues contrôlées, aucun débordement détecté.
- 8 parcours représentatifs × 9 largeurs intermédiaires : 72 contrôles supplémentaires et vérification clavier de la navigation mobile.
- Audit responsive : 17 tests Playwright réussis.
- Fenêtres, confirmations, protections de saisie et retours de focus : 11 tests Playwright réussis.
- Recherche, filtres et ouverture des dossiers sur Candidatures et Examens : 4 tests Playwright réussis à 390 et 1440 px après extraction du résumé commun.
- Le sélecteur d’année occupe toute la largeur sur petit écran pour éviter de tronquer l’année consultée.
- La fixture de Prospects prend en charge sa RPC de pagination actuelle ; aucun changement de l’API métier n’a été nécessaire.

Le premier essai complet a été interrompu par une saturation du disque local. L’audit final a été relancé et réussi avec le cache Webpack sur disque désactivé via le paramètre d’audit existant et sans traces de navigateur volumineuses. Les captures et diagnostics sont conservés ; aucune donnée métier distante n’a été modifiée.

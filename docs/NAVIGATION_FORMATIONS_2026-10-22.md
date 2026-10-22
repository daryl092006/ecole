# Navigation vers les formations — 22 octobre 2026

## Problème reproduit

Depuis l’accueil, cliquer sur « Nos formations » changeait l’URL vers `/formations` mais laissait le contenu de page vide. L’ouverture directe de `/formations/` fonctionnait. Le problème a été reproduit à 390 et 1440 px. Les contrôles antérieurs qui ouvraient les pages directement ne couvraient pas cette transition.

L’accueil avait plusieurs éléments racines. Sa sortie sous la transition Vue `out-in` pouvait laisser le composant de page vide. Par ailleurs, « Formations » dans la navigation ordinateur était un bouton sans action au clic ; seul le survol ouvrait les sous-rubriques.

## Corrections

- L’accueil possède une racine HTML unique, compatible avec la transition de page.
- Le menu ordinateur contient un vrai lien « Formations » vers le catalogue. Les sous-rubriques restent accessibles au survol et au focus clavier.
- Le menu mobile propose « Toutes les formations » dans ses sous-rubriques.
- Les cartes du catalogue sont visibles dès le HTML initial, sans dépendre d’un observateur de défilement.

La correction est conservée dans `scripts/website-navigation.mjs` et rejouée par `scripts/connect-website.mjs`. Les formations, leurs informations, leurs brochures et le parcours de candidature restent reliés au portail local. Aucune donnée métier n’a été créée ou modifiée.

## Recette

`tests/ui/website-formations.spec.ts` vérifie le parcours réellement déclenché par les clics : accueil → catalogue → licence → détail d’une formation → candidature, à 390 et 1440 px. Il vérifie aussi le menu principal aux deux largeurs et l’affichage du catalogue sans JavaScript.

Commandes :

```sh
npx tsc --noEmit --incremental false
npm run lint
npx playwright test --config tests/ui/website-review.config.ts
```

Les captures sont dans `tmp/screenshots/website-review/<largeur>/formation-navigation.png`. Le site local a été régénéré ; aucune publication distante n’a été effectuée.

Résultats : 61 tests navigateur réussis, TypeScript sans erreur, ESLint sans erreur (deux avertissements préexistants hors de ce chantier), génération des 77 routes et contrôle d’interconnexion réussis.

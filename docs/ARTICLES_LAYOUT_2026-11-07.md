# Présentation de l’espace articles — 7 novembre 2026

## Constats et correction

Les boutons de modification affichaient le titre complet et débordaient sur les cartes voisines. Les titres héritaient d’une présentation en capitales et les résumés d’une typographie différente. Sur mobile, quatre compteurs empilés repoussaient la liste. Le formulaire plaçait tous les réglages avant ou après le contenu dans une seule colonne.

La liste utilise maintenant des lignes avec titre, résumé, statut, adresse et action « Modifier » courte. Le nom accessible de chaque action conserve le titre de l’article. Les compteurs occupent deux colonnes sur mobile ; recherche et filtres sont regroupés. Un état vide décrit la prochaine action.

La composition présente le titre, le résumé et l’éditeur dans la zone principale, avec les réglages de publication à droite sur grand écran et à la suite sur les petits écrans. La relecture reste accessible pendant le défilement sur ordinateur ; les actions mobiles du tiroir sont conservées. Aucun changement d’API ou de base.

## Vérification

- Captures et contrôles aux largeurs 360, 390, 768, 1024 et 1440 px : absence de débordement horizontal, actions contenues dans chaque ligne, recherche et filtre fonctionnels, largeur de l’éditeur contrôlée.
- 10 tests Playwright éditeur, API et présentation réussis.
- 5 tests de régression publication, retrait, rechargement et actions des fenêtres réussis. Le test facultatif utilisant une copie externe du site n’est pas exécuté, faute de serveur externe configuré.
- TypeScript (`--noEmit --incremental false`), ESLint et `git diff --check` réussis.

Captures locales avant/après : `tmp/screenshots/articles-layout/before/` et `tmp/screenshots/articles-layout/after/`, fichiers `list-<largeur>.png` et `editor-<largeur>.png`. Elles utilisent des données de test, sans écrire dans la base distante ni modifier la session du navigateur de l’utilisateur.

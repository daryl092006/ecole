# Revue responsive et interactions du 22 octobre 2026

## Constats et corrections

- Les contrôles de recherche et de filtrage des épreuves restaient étroits sur téléphone, malgré l’espace disponible. Les champs du composant de barre d’outils occupent maintenant toute la largeur sur mobile, et se répartissent sur ordinateur.
- Le sélecteur d’année tronquait l’année de travail à 360 px. Son libellé occupe une ligne distincte sur mobile ; le champ utilise une police de 16 px pour éviter le zoom automatique des navigateurs mobiles.
- La barre de filtres des dossiers utilisait une propriété de grille alors que son affichage était en flex. Elle passe explicitement en colonne sur mobile.
- Le menu mobile laissait le bandeau interactif derrière sa fenêtre. Le bandeau devient inerte pendant l’ouverture ; la fermeture rend le focus au déclencheur. Le retour au format ordinateur libère le contenu.
- Les fenêtres de saisie ne rendaient inertes que les fenêtres précédentes, laissant la navigation de l’application accessible. La protection couvre maintenant aussi le portail et son lien d’évitement, avec restauration à la fermeture.
- Les panneaux du compte et des notifications pouvaient rester ouverts ensemble. Ils se ferment mutuellement et se ferment lors d’un changement de page, de rôle ou de l’ouverture du menu.
- L’en-tête des fenêtres conserve la largeur du bouton de fermeture. Le bouton du compte occupe moins d’espace dans le bandeau mobile.

## Validation des comportements

Les tests ciblés couvrent les filtres à 360/390/768 px, le menu à ces mêmes largeurs et son retour à 1024 px, les panneaux du bandeau à 390/1024 px, les fenêtres et la restitution du fond.

Les tests de régression couvrent les tableaux et le calendrier au seuil 768/769 px, le défilement des tableaux à 1024 px, les intitulés longs, ainsi que les paiements, inscriptions, notes et articles à 360/390 px. Les parcours conservent la confirmation avant écriture, la protection des saisies et les actions visibles lorsque la hauteur disponible diminue.

Deux corrections de l’outillage accompagnent la revue : transport RPC de lecture des mails ajouté à la fixture d’audit et assertion de succès d’article ciblée sur son message, car le statut du skeleton peut coexister avec le succès pendant la relecture des données.

## Résultats

- Audit : 72 écrans et variantes × 5 largeurs (360, 390, 768, 1024, 1440 px), soit 360 vues ; aucun problème détecté par les contrôles automatisés de largeur, de rendu et de route après correction.
- Interactions et régressions : 32 scénarios distincts validés. Les deux échecs initiaux liés à une assertion ambiguë du succès d’article ont été corrigés puis les deux parcours rejoués avec succès.
- TypeScript : aucune erreur. ESLint : aucune erreur, deux avertissements préexistants (`site` et `_tab`).
- Workflows et PostgreSQL local : succès, 182 groupes de contrôles SQL.
- Build de production et démarrage local : succès.

## Périmètre

Vérifications réalisées avec des données de test et des transports isolés, sans écriture distante. Les scénarios vérifient les règles existantes ; aucune nouvelle règle de passage de niveau, de compensation ou de délibération n’est introduite. Une validation automatique du responsive ne garantit pas à elle seule la qualité de chaque écran sur chaque appareil réel.

Les captures et rapports détaillés sont produits dans `tmp/screenshots/responsive-review/` par `tests/ui/responsive-review.config.ts` ; les interactions sont vérifiées avec `tests/ui/responsive-interactions.config.ts`.

## Aptitude à la production

Le build optimisé `ESCEN_BUILD_DIR=.next-verification npm run build` réussit. TypeScript et ESLint réussissent (deux avertissements préexistants au lint). `npm test` réussit, dont 182 groupes de contrôles PostgreSQL locaux.

Le serveur optimisé démarre en local : connexion HTTP 200 ; campus et relevé sans authentification HTTP 401.

Cela ne suffit pas pour autoriser une exploitation complète. Le code courant laisse encore sans activation complète les nouvelles délibérations et nouveaux relevés officiels, les nouvelles cartes et certificats, les opérations du circuit d’achat, le traitement des tickets et la publication des annonces. Références : `src/components/layout/PortalScreen.tsx`, `src/data/domainWorkspaces.ts`, et `docs/RECETTE_AVANT_EXPLOITATION.md` (document de recette historique à confronter au code actuel).

Les comptes et périmètres réels, le rapprochement des données reprises, les paramètres de l’environnement cible ainsi qu’une sauvegarde suivie d’une restauration n’ont pas été validés pendant cette revue. Aucun déploiement ni changement distant n’a été effectué.

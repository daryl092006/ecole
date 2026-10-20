# Refonte visuelle — socle partagé

## Périmètre

Harmonisation des couleurs partagées, typographie système, navigation active,
cartes, boutons, formulaires, tableaux, états vides et fenêtres de détail dans
`src/app/globals.css`. Conservation des règles de disposition responsive existantes.
Correction de la cascade des boutons de confirmation et de suppression.

Finalisation des modifications de chargement déjà présentes dans le dépôt :
squelettes de tableau et de cartes, chargement compact, écran de connexion,
styles d'animation et réduction des mouvements. Le portail choisit une présentation
en cartes pour l'accueil et le pilotage, en tableau pour les autres rubriques.
Le nombre de lignes de squelette est borné pour éviter un rendu invalide.

## Validation visuelle

Configuration dédiée : `tests/ui/visual-refresh.config.ts`.
Elle utilise un serveur local, les données isolées des fixtures existantes et
un build dans `tmp/next-visual-refresh`. Aucun accès métier distant nécessaire.

- 12 contrôles responsive existants : boutons longs, tableaux défilants,
  calendrier mobile et navigation du compte au clavier.
- 5 contrôles du tableau de bord : 360, 390, 768, 1024 et 1440 px.
- Captures : `tmp/screenshots/visual-refresh/dashboard-<largeur>.png`.
- Inspection visuelle des captures à 390 et 1440 px ; correction de l'espacement
  entre les grilles successives du tableau de bord.

## Limites

Cette étape porte sur les composants et styles partagés. Elle ne constitue pas
une refonte fonctionnelle de chaque écran ni une validation des 71 variantes de
l'audit historique. Les formulaires métier, les droits et les règles de calcul
restent à examiner dans leurs parcours respectifs pour une revue exhaustive.
Les captures utilisent des données de test, pas la base de production.

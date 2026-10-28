# Aperçu des pièces, brochures et téléphone — 28 octobre 2026

## Réalisé

- Bouton « Visualiser » à côté de « Télécharger » dans le dossier candidat.
- Aperçu PDF, JPEG et PNG dans `WorkPage`, avec chargement, erreur et reprise.
  Les autorisations serveur et le filtre d'année restent ceux du téléchargement.
  Les URL privées ne sont pas rendues publiques ; les URL blob sont libérées à
  la fermeture et les requêtes de chargement sont annulées.
- Aucun aperçu des autres formats, notamment HTML ou SVG. Le type du blob
  utilisé par le navigateur est explicitement limité aux formats autorisés.
- Drapeau ajouté aux pays du composant `PhoneInput` partagé : pays, indicatif
  et numéro restent séparés. Aucun pays inventé pour les indicatifs partagés,
  aucune modification automatique des anciens numéros.

## Brochures : cause vérifiée en production, aucune écriture

L'année de travail est 2026–2027. Les neuf brochures existantes sont publiées,
mais rattachées à 2025–2026. La RPC publique ne publie que les brochures de
l'année active : l'API retourne donc correctement une liste vide.

La republication des neuf PDF pour 2026–2027 attend la confirmation qu'ils sont
toujours valables. Aucun PDF n'a été publié, déplacé ou modifié ; les archives
2025–2026 sont conservées.

## Vérifié

- TypeScript sans émission et sans incrémental, ESLint et `npm test` réussis.
- 8 tests navigateur pour les pièces : téléchargement, aperçu PDF à 390 et
  1440 px sans téléchargement automatique, image, fermeture, accès refusé,
  reprise et rejet de contenu actif.
- 7 tests navigateur des téléphones aux largeurs 360/390/768/1440 : drapeaux,
  choix d'indicatif, collage, indicatifs partagés, confirmation et persistance.
- Capture mobile du formulaire étudiant relue : drapeau et indicatif visibles.

La refonte préexistante du dossier et les autres modifications du workspace
sont conservées séparément dans l'arbre de travail. Aucun push ni migration SQL.

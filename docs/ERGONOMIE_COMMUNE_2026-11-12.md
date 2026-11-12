# Ergonomie commune du portail ESCEN

## Navigation et cadre des pages

La navigation du portail est celle d’une application web : barre supérieure, menu latéral et fil d’Ariane. Sur petit écran, le même menu latéral s’ouvre à la demande. Aucune barre de navigation persistante en bas de page.

Les groupes et libellés peuvent refléter l’activité du rôle sélectionné. Le comportement des liens, l’emplacement des commandes et les composants restent communs. Les destinations sont toujours croisées avec `availableTabs` ; une refonte visuelle ne donne aucun accès supplémentaire.

## Composants de référence

| Usage | Composant / convention |
| --- | --- |
| En-tête d’écran | `PageHeader` : contexte, titre, description et commandes regroupées |
| Accès aux activités depuis l’accueil | `WorkspaceActions` : icône, libellé, description et destination autorisée |
| Sections de données | `.card`, `.card-header` et titres hiérarchisés |
| Filtres | `ListFilters`, champs avec libellés visibles, état des filtres conservé |
| Tableaux | `ResponsiveTable`, défilement contenu sur ordinateur, fiches au seuil mobile |
| Édition | `WorkPage` / `DetailDrawer` : focus, Échap et protection contre les modifications perdues |
| Écriture sensible | `ReviewedForm` : récapitulatif et confirmation explicite |
| Chargement et erreur | `LoadingState`, erreur explicite et reprise ; ne pas confondre une erreur avec une liste vide |
| Actualisation | `portal.refreshCampus()` après mutation réussie |

Les styles sémantiques restent dans `globals.css`. Les couleurs utilisent les variables communes de texte, bordure, fond et accent. Les seuils de référence restent 480, 768 et 1024 px. Les en-têtes ne conservent pas une base flex de bureau lorsqu’ils passent en colonne sur téléphone.

## Application de cette intervention

- Retrait de la barre inférieure étudiante, de ses styles et de l’espace qui lui était réservé.
- Retrait de l’en-tête décoratif propre au seul étudiant ; utilisation de `PageHeader`, des cartes et de la palette communes.
- Rétablissement des contextes et descriptions déjà passés à `PageHeader`, auparavant ignorés par ce composant partagé.
- Accueils des 13 rôles du personnel organisés avec les mêmes composants : contexte et profil, activités autorisées, éléments à suivre, indicateurs du périmètre.
- Descriptions des activités communes, liens enseignant et marketing remis sur les routes canoniques existantes.
- Pages détaillées conservant leurs formulaires, filtres, tableaux et contrôles métier existants, avec l’en-tête et le cadre communs. Cette intervention ne constitue pas l’implémentation de fonctionnalités métier encore indisponibles.

Cette décision remplace le choix de barre inférieure décrit dans `ESPACE_ETUDIANT_ERGONOMIE_2026-11-12.md`.

## Recette

La configuration `tests/ui/dashboard-home.config.ts` lance un serveur de production isolé et réunit :

- Neuf tests ciblés des accueils, de la navigation étudiante et du délégué, des séances et des données absentes.
- Cinq tests de 77 écrans aux largeurs 360, 390, 768, 1024 et 1440 px, soit 385 vues.
- Vingt-six tests couvrant les 13 rôles du personnel à 390 et 1440 px. Chaque test parcourt toutes les pages autorisées de son rôle, vérifie les réponses API simulées, le rendu React, les accès et la largeur, puis enregistre une capture et un rapport JSON. Ce parcours représente 540 vues page/rôle/largeur.

Les comptes sont des fixtures isolées à périmètre global. Aucun compte réel ni aucune écriture distante n’est utilisé. La recette de rendu ne prouve pas l’ensemble des transitions métier ou des affectations de comptes réels.

## Captures

- [Accueil personnel sur ordinateur](../tmp/screenshots/dashboard-home/1440.png)
- [Accueil étudiant sur téléphone](../tmp/screenshots/dashboard-home/student-390.png)
- Les captures par rôle et par page sont dans `tmp/screenshots/staff-ergonomics/<ROLE>/<LARGEUR>/` avec leur `audit.json`.
- Les contrôles globaux sont dans `tmp/screenshots/unified-ergonomics/after/`.

Les exports de comptes et les captures restent locaux. Ils ne font pas partie du commit source. Aucune publication GitHub ou Vercel n’est effectuée pendant cette intervention.

## Google Stitch

La demande « Google Stock » a été interprétée provisoirement comme Google Stitch, en attente de précision. Aucune compétence locale correspondante ni aucun connecteur Stitch n’a été trouvé dans la session après recherche. L’outil n’a donc pas été utilisé ; les modifications ont été réalisées dans le code existant.

## Résultats finaux

40 tests Playwright réussis ; 385 vues globales sans anomalie responsive détectée et 540 vues du personnel sans erreur API ni React dans les fixtures. TypeScript, ESLint et tests métier PostgreSQL locaux réussis.

## Accueils par rôle

| Rôle | Pages autorisées par largeur | Téléphone | Ordinateur |
| --- | --- | --- | --- |
| Responsable des achats et de la logistique | 7 | [Capture](../tmp/screenshots/staff-ergonomics/ACHATS/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/ACHATS/1440/home.png) |
| Chargé de clientèle | 16 | [Capture](../tmp/screenshots/staff-ergonomics/CC/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/CC/1440/home.png) |
| Directeur Académique | 20 | [Capture](../tmp/screenshots/staff-ergonomics/DA/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/DA/1440/home.png) |
| Directeur Général | 36 | [Capture](../tmp/screenshots/staff-ergonomics/DG/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/DG/1440/home.png) |
| Directeur Général Adjoint | 28 | [Capture](../tmp/screenshots/staff-ergonomics/DGA/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/DGA/1440/home.png) |
| Enseignant | 13 | [Capture](../tmp/screenshots/staff-ergonomics/ENS/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/ENS/1440/home.png) |
| Informaticien | 48 | [Capture](../tmp/screenshots/staff-ergonomics/IT/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/IT/1440/home.png) |
| Logisticien académique | 21 | [Capture](../tmp/screenshots/staff-ergonomics/LOG/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/LOG/1440/home.png) |
| Responsable marketing | 16 | [Capture](../tmp/screenshots/staff-ergonomics/MKT/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/MKT/1440/home.png) |
| Responsable Administratif et Financier | 21 | [Capture](../tmp/screenshots/staff-ergonomics/RAF/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/RAF/1440/home.png) |
| Responsable du site | 13 | [Capture](../tmp/screenshots/staff-ergonomics/SITE/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/SITE/1440/home.png) |
| Stagiaire | 17 | [Capture](../tmp/screenshots/staff-ergonomics/STG/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/STG/1440/home.png) |
| Surveillant | 14 | [Capture](../tmp/screenshots/staff-ergonomics/SURV/390/home.png) | [Capture](../tmp/screenshots/staff-ergonomics/SURV/1440/home.png) |

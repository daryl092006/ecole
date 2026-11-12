# Graphiques des indicateurs ESCEN — 12 novembre 2026

## Présentation commune

Le composant partagé `KpiChart` propose des barres horizontales et des anneaux, avec une vue des données tabulaires accessible par un bouton. Les libellés et les valeurs exactes restent lisibles sans survol et sans dépendre de la couleur. Les graphiques complètent les cartes de chiffres détaillés sur l’accueil et la vue d’ensemble. L’ordre de l’accueil enregistré en parallèle — cartes, graphiques, suivi, accès rapides — est conservé.

| Périmètre | Graphique |
| --- | --- |
| Personnel ayant accès aux dossiers étudiants | Effectifs par filière, niveau ou groupe, avec changement de regroupement |
| Direction, finance, clientèle et IT selon leurs permissions | Répartition des frais réglés et du reste à régler |
| Gestion des accès | Comptes actifs et inactifs |
| Académie, logistique académique, enseignants et surveillance | Évaluations selon leur état enregistré |
| Achats | Demandes selon les libellés d’état déjà définis par le module achats |
| Communication et site | Publications, programmations, brouillons, retraits et expirations |
| Étudiant et délégué | Uniquement leur situation financière personnelle |
| Situation financière globale | Répartition des frais et couverture des situations financières, synchronisées avec les filtres |

## Fidélité des données

Les graphiques utilisent le snapshot et les projections déjà filtrés par rôle, année et périmètre. Aucun accès supplémentaire ni appel réseau n’est ajouté. Les montants reprennent les projections financières existantes, qui excluent les paiements en attente et tiennent compte des contre-opérations.

Une donnée indisponible ne devient pas zéro. Les valeurs réellement nulles restent visibles dans la légende ou le tableau. Les valeurs négatives ou non finies ne sont pas transformées en barres positives : le graphique signale sa limite et propose la vue des données. Les barres n’ont pas de largeur minimale artificielle.

Dans l’anneau financier, le pourcentage central représente la part réglée dans la somme « réglé + reste à régler » des montants représentés. Il n’est pas présenté comme un indicateur de réussite scolaire ou une évolution historique. Aucune courbe temporelle n’a été fabriquée en l’absence de série historique validée.

Les graphiques n’intègrent aucune dépendance supplémentaire. Le dessin utilise du SVG et des styles sémantiques dans `globals.css`, avec la palette commune et les seuils responsives du projet.

## Validation et isolation

La configuration des audits accepte désormais `ESCEN_AUDIT_PORT` et `ESCEN_AUDIT_BUILD_DIR`, pour éviter de réutiliser le serveur ou la compilation d’une autre intervention. Les requêtes des audits utilisent ce même port configurable.

Un nettoyage concurrent a supprimé le premier dossier de compilation pendant les tests. La validation finale a donc été déplacée dans `/private/tmp/escen-kpi-review-20261112`, une copie des sources et tests sans fichier d’environnement secret. Le serveur utilise le port 3194 et des paramètres publics factices ; toutes les API de données sont interceptées par les fixtures. Aucun email ni aucune écriture distante.

La campagne inclut les tests ciblés des graphiques, les accueils étudiants, les 77 écrans aux cinq largeurs et les pages autorisées des 13 rôles du personnel. Les tests vérifient notamment les montants malgré un paiement supplémentaire en attente, les changements de regroupement, la vue des données, la sélection vide et l’absence de graphiques globaux pour un étudiant.

## Captures

- [Graphiques du tableau de bord sur ordinateur](../tmp/screenshots/kpi-charts/staff-1440.png)
- [Graphiques du tableau de bord sur téléphone](../tmp/screenshots/kpi-charts/staff-390.png)
- [Situation financière globale](../tmp/screenshots/kpi-charts/finance-global.png)
- [Situation personnelle de l’étudiant](../tmp/screenshots/kpi-charts/student-finance.png)

Les captures utilisent des données de test. Les modifications du calendrier, du menu et des candidatures réalisées en parallèle sont préservées ; cette intervention porte sur les graphiques et leur validation.

## Résultats finaux

- 44 tests Playwright réussis dans la copie isolée, dont quatre tests ciblés des graphiques. Après la réorganisation concurrente de l’accueil, les 13 tests d’accueil et de graphiques ont été rejoués avec succès sur son ordre final versionné.
- 385 vues responsive sans anomalie détectée, plus 540 vues des pages autorisées du personnel sans erreur API ni React dans les fixtures.
- TypeScript et ESLint réussis dans le projet ; contrôles également réussis sur la copie isolée en excluant son dossier de compilation généré du lint.
- `npm test` réussi : workflows et PostgreSQL locaux, sans écriture distante.
- Sources des composants et tests de ce commit comparées octet par octet avec la copie validée avant enregistrement. Des compléments supplémentaires à `WorkspaceHome.tsx` sont en cours en parallèle et restent hors de ce commit et de ce bilan.
- Captures et rapports recopiés dans `tmp/screenshots/` ; la copie de validation reste également disponible dans `/private/tmp/escen-kpi-review-20261112`.

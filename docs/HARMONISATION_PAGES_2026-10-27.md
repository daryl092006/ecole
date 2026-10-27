# Reprise de l’harmonisation des pages — 27 octobre 2026

## Demande et état réel

L’utilisateur a confirmé la reprise du chantier transversal sur la lourdeur des
pages. La direction approuvée du 26 octobre reste la référence : contenu utile
visible, actions dans leur contexte et moins de blocs successifs.

Le dépôt était propre au démarrage. Plusieurs propositions anciennes étaient
déjà appliquées : en-tête compact du dossier, séparation des opérations scolaires
et financières, liste unique de notes, versements et présences dédiés. Il ne faut
pas les présenter comme des travaux encore à réaliser.

## Lot appliqué

- Listes mobiles : les tableaux déjà transformés en fiches ne sont plus entourés
  d’une carte supplémentaire. Les fiches conservent leurs bordures, leurs libellés
  et leurs actions ; elles disposent de la largeur libérée. La règle partagée
  concerne le contenu principal aux largeurs de 768 px et moins. Les fenêtres,
  les impressions et les tableaux de bureau gardent leur présentation.
- Présences : le choix de séance et la feuille d’appel sont réunis dans le même
  espace. L’accès aux archives rejoint l’en-tête ; l’action de saisie rejoint
  le contexte de la séance. Présences enseignantes et justificatifs restent
  accessibles en dessous.
- Les barres de recherche sans contenu ne laissent plus un encadré vide lorsque
  les filtres d’une liste courte sont masqués.

Les changements portent sur le rendu des composants existants. Aucun changement
de règle métier, service, API, permission ou SQL.

## Revue et limites

Captures avant : 72 entrées à 390, 768 et 1440 px. Les planches de toutes les
entrées à 390 et 1440 px ont été examinées ; présence, finance, programmes et
support ont également été ouverts en taille complète. Une retouche d’espacement
entre sélection et contexte de séance a suivi cette lecture.

L’inventaire de 72 entrées comprend les pages d’authentification, les contextes
personnel et étudiant, les accueils de domaine, les redirections et des adresses
de catalogue. Ce ne sont pas 72 écrans distincts : les anciennes adresses de
catalogue des programmes ouvrent notamment le même choix de programme. Les
captures ne prouvent pas l’ouverture de chacun des formulaires ou sous-onglets.

Les réponses API sont locales et déterministes. Certaines listes sont courtes
ou vides ; cette recette ne démontre pas la lisibilité sur de grands volumes
réels. La référence manquante d’une demande dans la fixture produit encore
« undefined » sur sa capture ; ce défaut du jeu de test n’est pas une preuve
du même défaut sur les données connectées.

Les captures et rapports sont dans
`tmp/screenshots/page-harmonisation-2026-10-27/`, séparés des anciens audits et
des données protégées de `.tmp/`. La compilation isolée est dans
`tmp/next-page-audit-harmonisation/` ; le build historique versionné n’est pas
utilisé comme preuve du code actuel.

## Prochain lot proposé

1. Notes et résultats : groupe, matière, recherche et compteurs occupent encore
   beaucoup de hauteur sur téléphone avant la liste de travail. Regrouper le
   contexte et alléger les compteurs sans modifier les calculs ou les états.
2. Examens : recherche, groupe, matière et état empilent quatre champs avant les
   épreuves sur téléphone. Préparer une présentation plus courte en conservant
   les filtres actifs visibles et les accès au sujet, à la programmation et aux
   copies.
3. Puis reprendre les écrans de publication et de consultation où une carte
   contient encore une autre liste de cartes, notamment les articles et les
   accueils de domaine.

L’harmonisation complète des parcours n’est pas déclarée terminée. Le point
d’arrêt de fin de phase prévu dans AGENTS.md s’applique après ce lot commun.

## Vérifications finales

- Compilation Next.js de production isolée : réussie.
- `npx tsc --noEmit --incremental false` : réussi.
- `npm run lint` : réussi.
- `npx playwright test --config tests/ui/harmonisation.config.ts` : 41 tests
  réussis. Les cinq tests d’inventaire couvrent chacun les 72 entrées à
  360/390/768/1024/1440 px, sans anomalie de rendu détectée. Les 36 autres
  tests couvrent les présences, les justificatifs, la navigation, les ouvertures
  financières, les confirmations et les protections de saisie.
- `git diff --check` : réussi.

Le premier lancement de Chrome a échoué dans le sandbox ; les recettes ont
ensuite été autorisées et exécutées hors sandbox. Le contrôle avant correction
est passé aux trois largeurs initiales. Une première recette après modification
a validé 39 tests ; après la retouche d’espacement observée visuellement, la
recette finale à cinq largeurs a validé les 41 tests ci-dessus.

La modification automatique de `tsconfig.json` par le build isolé a été retirée ;
le fichier a retrouvé exactement son contenu initial avant les derniers contrôles
TypeScript et lint. Aucun test de base n’était requis pour ce lot de présentation.
Aucun push ni déploiement.

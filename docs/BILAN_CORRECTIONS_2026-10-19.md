# Bilan des corrections ESCEN — 19 octobre 2026

Les phases 1 à 5 sont réalisées dans l'arbre de travail local, avec les exceptions vérifiées ci-dessous. Les modifications préexistantes ont été conservées. Aucun push ni application de migration distante n'a été effectué.

## Résultats

| Périmètre | Résultat |
|---|---|
| Catalogue pédagogique | Création, modification et archivage des semestres, UE et matières du programme ; motif, dépendances, maquette approuvée et décimaux contrôlés. Les lignes archivées sont ignorées par les contrôles de crédits et de pondération. |
| Circuit des notes | Réinscrits inclus, écritures volumineuses par lots atomiques, NON_TRAITE bloquant, ABSENT/JUSTIFIE traités, correction vide distincte de zéro. |
| Sécurité | Écritures d'évaluations sur le snapshot autorisé avec année/groupe/affectation ; changement obligatoire de mot de passe lié à l'opération Auth réussie ; reprise réservée au périmètre global autorisé avec permission d'audit. |
| Enseignants | Création du profil pendant la création du personnel dans la même transaction ; profils, activation/désactivation motivées et affectations avec dates. |
| Planning | Création, modification, déplacement, annulation motivée, remplacement d'enseignant et périodes bloquées, avec vérification des conflits. |
| Présences | Émargement étudiant et enseignant, corrections motivées, acceptation/refus des justificatifs avec audit. |
| Finance | Affectation automatique aux échéances anciennes non soldées, réaffectation, annulation, remboursement, avoir, impression connectée du reçu et projections nettes cohérentes entre SQL et calcul de secours. |
| Responsive | 71 écrans/variantes couvrant les 56 routes source, aux largeurs 360/390/768/1024/1440 : 10 cas problématiques avant, aucun après correction dans la matrice de la phase 4. |
| Nettoyage | Suppression de SupportPanel et JuryPanel après preuve par grep et autorisation, un commit par fichier. Les éléments encore utilisés sont conservés. |
| Disponibilité des fonctions | Message explicite lorsqu'une rubrique authentifiée n'est pas montée ; limites des vues de consultation visibles à l'ouverture. Le journal, l'export, les communications et les réclamations gardent leurs écrans connectés. |
| Documentation | AGENTS.md actualisé ; dictionnaires JSON et Markdown régénérés par PGlite local : 112 tables métier, 13 tables privées, 957 colonnes, 264 FK, 213 CHECK et 4 exclusions. Les champs program_id/cycle des brochures et les nouvelles colonnes sont présents. |

## Correction complémentaire : épreuves personnelles

« Mes épreuves en ligne » est réservé aux rôles Étudiant et Délégué. La permission `exam.take`, également détenue par IT, ne suffit plus à afficher cette rubrique : le filtre du rôle personnel s'applique avant l'exception IT.

L'Informaticien ne voit plus le lien dans les menus et l'accueil, et l'accès direct à `/mon-espace/epreuves` affiche l'accès refusé sans charger les copies. Ses fonctions de gestion dans `/academique/examens` restent accessibles. Un compte cumulant Étudiant et IT retrouve le parcours candidat en choisissant son rôle étudiant ; le passage au rôle IT quitte cette page.

Cette correction de navigation ne nécessite aucune nouvelle migration SQL.

## Constats déjà corrigés ou ne justifiant pas une suppression

- `src/utils/data.ts`, AcademiqueModule, FinancePaymentsPanel, LogisticsModule, MarketingModule et les branches démo de PortalScreen étaient déjà absents lors du contrôle de 5A.
- `src/mocks/data.ts` est encore importé pour ses collections initiales typées vides ; `campusWorkflowService.ts` reste utilisé par l'état global et les tests. `useDemoUsers` et `demoIdentity` ont encore des dépendances dans l'état global. Leur suppression n'a pas été effectuée sous l'hypothèse erronée d'une absence d'usages. Les nouvelles mutations utilisent les API connectées.
- Avant 4B, globals.css avait déjà un seul `:root`, une seule définition de `--sidebar-width`, les seuils 480/768/1024, les tableaux en fiches et le calendrier en liste à 768px. Les cinq classes Tailwind signalées étaient absentes. Les corrections ont porté sur les débordements réellement constatés et les déclarations CSS inutiles.
- Le guide citait une fonction d'audit inexistante : la mise à jour identifie la fonction actuelle `escen_private.record_audit()` et le trigger `audit_event`.

## Vérifications

Les contrôles TypeScript, ESLint et Playwright ont été exécutés par sous-étape. Le tableau précise les résultats consolidés disponibles pour les dernières étapes ; les scénarios métier des phases 1 à 3 sont aussi repris par la validation PostgreSQL finale.

| Commande | Résultat |
|---|---|
| `npx tsc --noEmit --incremental false` | 0 erreur après les corrections ; exécution séparée du build Next.js pour éviter la régénération simultanée des types. |
| `npm run lint` | 0 erreur ; 7 avertissements préexistants dans verify-academic-years, PortalScreen, OnlineAdmissionsPanel et audit-responsive-full.spec. |
| `npm test` | Services et workflows réussis ; 172 groupes de contrôles PostgreSQL locaux réussis. La règle de routage IT a été ajustée dans verify-routing pour respecter l'exclusion du parcours candidat. |
| `npm run db:describe` | Régénération locale réussie, sans connexion Supabase ; champs des brochures et colonnes nouvelles vérifiés. |
| `npx playwright test --config tests/ui/responsive-audit.config.ts` | 5 tests réussis pour le relevé initial de 355 vues. |
| `npx playwright test --config tests/ui/responsive-audit-redirects.config.ts` | 5 tests réussis pour vérifier les redirections et stabiliser leurs captures initiales. |
| `npx playwright test --config tests/ui/responsive-corrections.config.ts` | 12 tests réussis : boutons, tableaux, seuil mobile et menu du compte. |
| `npx playwright test --config tests/ui/responsive-after.config.ts` | 5 tests réussis, 355 vues après correction, aucun problème détecté. |
| `node scripts/report-responsive-audit.mjs after` puis `node scripts/compare-responsive-audit.mjs` | Périmètres identiques, 10 cas corrigés, aucune régression détectée ; existence et taille des 534 images avant et des 534 images après vérifiées. |
| `npx playwright test --config tests/ui/legacy-cleanup.config.ts` | 5 tests réussis après chacune des deux suppressions et pour 5C : 3 vues à 5 largeurs par passage. |
| `npx playwright test --config tests/ui/portal-availability.config.ts` | 13 tests réussis : repli explicite, limites visibles, journal/export/réclamations conservés à 390 et 1440px. |
| `npx playwright test --config tests/ui/personal-exams-navigation.config.ts` | 9 tests réussis : matrice de rôles, IT, Étudiant, Délégué, lien direct et changement de rôle à 390 et 1440px. |

Les premières exécutions ayant échoué ont été corrigées avant le commit de leur sous-étape : attente de fin du build pour TypeScript, reconnaissance des cartes de tableaux défilantes dans l'audit, libellés réels des boutons journal/export dans les tests, et ancienne attente d'accès IT à toutes les routes. Les résultats ci-dessus sont ceux des exécutions finales réussies.

Rapports responsive : [comparatif complet](RESPONSIVE_AVANT_APRES_2026-10-19.md), [avant](RESPONSIVE_AVANT_2026-10-19.md), [après](RESPONSIVE_APRES_2026-10-19.md). Captures : `tmp/screenshots/responsive-audit/`, avec un dossier séparé `cleanup/` pour la phase 5. Les captures reflètent les données isolées des tests et l'arbre de travail, y compris les modifications préexistantes. Les modales et le site public externe ne font pas partie de la matrice des routes.

## Migrations : ordre pour Supabase

Aucune de ces migrations n'a été appliquée à une base distante pendant ce chantier. L'historique distant n'a pas été utilisé pour déduire qu'un fichier était déjà appliqué. L'ordre ci-dessous est celui du dépôt, validé par les tests locaux.

Pour une base déjà à jour jusqu'à `202610170034_audit_journal_read.sql`, les fichiers suivants constituent la suite, dans cet ordre. N'appliquer que les migrations absentes de l'historique cible ; ne jamais modifier les anciennes.

1. `202610180035_curriculum_reference_archival.sql` — archivage du programme pédagogique.
2. `202610180036_atomic_evaluation_batches.sql` — écritures d'évaluations et de notes par lots atomiques.
3. `202610180037_unprocessed_copy_zero.sql` — normalisation des copies non traitées.
4. `202610180038_persistent_exam_deadlines.sql` — échéances et tentatives persistantes d'épreuves.
5. `202610180039_block_unprocessed_grade_submission.sql` — soumission refusée avec NON_TRAITE.
6. `202610180040_teacher_assignment_reasons.sql` — motifs enseignants et affectations.
7. `202610180041_blocked_period_reasons.sql` — motifs des périodes bloquées.
8. `202610180042_coordinated_exam_reschedule.sql` — déplacement coordonné des épreuves.
9. `202610180043_attendance_management.sql` — corrections des présences et décisions de justificatifs.
10. `202610180044_atomic_payment_allocations.sql` — affectations transactionnelles des paiements.
11. `202610180045_payment_adjustments.sql` — annulation, remboursements et avoirs.
12. `202610180046_net_financial_projections.sql` — projections financières nettes.

Les migrations 038 et 042 étaient déjà présentes dans l'arbre de travail ; elles sont incluses pour conserver l'ordre réel des dépendances. Les champs `website_brochures.program_id` et `website_brochures.cycle` proviennent de la migration existante `202610160033_website_brochure_programs.sql` ; aucune migration de brochure supplémentaire n'a été créée pour régénérer le dictionnaire. Si la base cible précède 033 ou 034, appliquer d'abord les migrations antérieures manquantes dans l'ordre complet du dépôt.

## Reste à décider ou à compléter

- Passage de niveau et compensation : règles institutionnelles à demander avant toute implémentation.
- Délibérations : décisions nouvelles et règles de calcul approuvées ; la lecture des données existantes est disponible.
- Documents officiels : génération et validation de nouvelles pièces ; consultation des documents existants conservée.
- Achats : soumission, approbation et réception dans un parcours connecté.
- Support : ouverture et traitement connectés des tickets.
- Annonces : création, publication et retrait dans le parcours connecté de communication.
- Candidatures : conversion d'une demande en dossier étudiant, avec règles et transaction dédiées.
- Comptes : provisionnement Auth et remise des accès ; la gestion des comptes et attributions existants ne vaut pas création automatique d'accès de connexion.

Ces fonctionnalités restantes n'ont pas été implémentées sous des règles supposées. Les modifications préexistantes de ces domaines restent dans l'arbre de travail de l'utilisateur.

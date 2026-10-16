# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js 15 application using the App Router and TypeScript. Route entry points, the root layout, and global styles live in `src/app/`. Reusable UI is grouped by purpose: `src/components/layout/` contains the application shell, `src/components/ui/` contains shared controls such as `RoleGuard`, and `src/components/modules/` contains feature-level screens. Shared state logic belongs in `src/hooks/`, while static or seed data belongs in `src/utils/`. Place browser-served assets in `public/`; do not edit generated `.next/` content or `tsconfig.tsbuildinfo`.

## Build, Test, and Development Commands

- `npm install` installs the locked dependencies from `package-lock.json`.
- `npm run dev` starts the local development server at `http://localhost:3000`.
- `npm run lint` runs ESLint with Next.js Core Web Vitals and TypeScript rules.
- `npm run build` performs the production build and catches type or rendering errors.
- `npm run start` serves a previously completed production build.

Run lint and build before submitting a change.

## Coding Style & Naming Conventions

Use strict TypeScript and functional React components. Follow the existing style: two-space indentation, semicolons, single quotes in TS/TSX, and named props with explicit types. Name components and their files in PascalCase (`FinanceModule.tsx`), hooks in camelCase with a `use` prefix (`useAppState.ts`), and variables/functions in camelCase. Use the `@/` alias for imports from `src/`. Keep feature-specific behavior inside its module and centralize cross-module state in hooks rather than duplicating it.

## Testing Guidelines

Run npm run test to verify critical mock service workflows with Node assertions and the installed TypeScript transpiler. No external test framework is required. For every change, run `npm run lint` and `npm run build`, then manually exercise affected roles, tabs, forms, and responsive layouts in the development server. If adding tests, colocate them as `*.test.ts` or `*.test.tsx`, add the runner and script to `package.json`, and document the command here.

Run `npm run test:ui -- tests/ui/persistent-data.spec.ts` to verify authenticated data loading, reload, errors and role changes using isolated API fixtures at mobile and desktop widths.

Run `npm run test:ui -- tests/ui/navigation-review.spec.ts` to review all portal routes and authentication screens at mobile and desktop widths, capture `.tmp/interface/` screenshots, and verify page search and student filters with isolated API fixtures. The browser build requires the public Supabase variables expected by `tests/ui/persistent-fixture.ts`; use a dummy public key for this isolated review, never a service key.

Run `npm run test:ui -- tests/ui/operational-review.spec.ts` to check imported business records in the ordinary screens, payment statuses, empty results without backup substitution, and click the initially visible actions of every portal page at mobile and desktop widths. The action inventory is written to `.tmp/interface/actions-390.json` and `actions-1440.json`. This inventory complements the form and workflow suites; it does not assert that every possible combination of data or nested action has been exercised. Next.js scripts use `scripts/run-next.mjs` for Windows and Unix compatibility.

Run `npm run test:ui -- tests/ui/business-processes.spec.ts tests/ui/crud.spec.ts tests/ui/persistent-data.spec.ts tests/ui/pedagogy.spec.ts tests/ui/navigation-review.spec.ts` for connected journey review, prerequisites, confirmation before writes, error recovery, role scopes, complete exports and responsive navigation. `npm run test` also verifies the connected field/reference display and process catalog against SQL attributes. Regenerate the UI foreign-key dictionary with `node scripts/generate-ui-references.mjs` after schema changes. See `docs/PARCOURS_METIER_2026-10-15.md` for the distinction between persistent operations and consultation-only workflows.

`npm run test` also runs the colocated exam service assertions in `src/services/examService.test.ts`. Run `ESCEN_UI_DEV=1 npm run test:ui -- tests/ui/exams.spec.ts` to verify paper results, online attempts, expiration, correction and publication at mobile and desktop widths.

`npm run test` also runs `npm run test:db`: the SQL migrations are executed in local PostgreSQL through the development dependency PGlite, with assertions covering relationships, histories, financial allocations, workflows and denied access. `npm run test:legacy` checks the offline backup parser. Python 3 is required for the backup preparation tools. `npm run db:describe` regenerates the relational data dictionary. `npm run db:stage` loads prepared source rows into a new private local staging database under `.tmp/`; it never connects to Supabase and refuses to replace an existing database.

Run `ESCEN_TEST_WEBSITE_URL=http://localhost:3200 npm run test:ui -- tests/ui/website-connection.spec.ts` with the private Nuxt copy and the portal running on ports 3200 and 3000 to verify website-to-portal navigation and return at mobile and desktop widths. See `docs/INTERCONNEXION_SITE_LOCAL.md`; never modify the original Downloads website or copy its secrets.

Run `ESCEN_TEST_WEBSITE_URL=http://localhost:3200 npm run test:ui -- tests/ui/website-exchange.spec.ts` to verify incoming online applications and outgoing website articles at mobile and desktop widths using isolated API fixtures. `npm run test` also checks the website exchange SQL and service validations.

## Commit & Pull Request Guidelines

Git history is unavailable in this working copy, so use concise, imperative commit subjects such as `Add finance export filters`. Keep commits focused. Pull requests should explain the user-facing change, identify affected modules and roles, list verification performed, and link relevant issues. Include before/after screenshots for visual changes and call out configuration, dependency, or data-shape changes explicitly.

## ESCEN Business Rules & Project Constraints

### Phase actuelle : préparation autorisée de la base relationnelle

Instruction explicite du 14 octobre 2026 : corriger les tables, attributs et relations, puis préparer Supabase. Les schémas PostgreSQL, nouvelles migrations, contrôles locaux et outils de reprise non destructifs sont désormais autorisés. Le projet `zmxapemyktxhppdxenzb` est créé et lié au dépôt par la CLI ; la connexion PostgreSQL distante est vérifiée. Les 27 migrations sont appliquées ; les 15 566 lignes source sont conservées dans le staging privé distant et les sauvegardes/fichiers sont transférés dans Storage privé. La reprise initiale des identités historiques crée des comptes inactifs sans liaison Auth ; la reprise des autres domaines reste à réaliser. L’interface charge désormais les identités réelles en lecture via les routes serveur authentifiées. Les données métier historiques sont consultables dans 49 collections via des RPC réservées au serveur authentifié (direction générale et Informaticien global). Les sources restent immuables et les anomalies signalées. Les actions sur les comptes, les informations civiles étudiantes, les CRUD des dossiers étudiants et du personnel ainsi que des référentiels sont persistants et audités ; la composition des sujets préparatoires est persistante et versionnée ; les autres workflows historiques restent en consultation, sans validation ou rattachement inventé. La migration 202610140015 synchronise les 42 permissions de l’Informaticien sans attribuer de rôle ni ouvrir la RLS.

- Conserver les sauvegardes originales et l'ancienne migration académique ; ajouter les évolutions dans de nouveaux fichiers.
- Le schéma cible est `escen`, avec provenance, quarantaines et audits dans `escen_private`. Les données locales de travail restent sous `.tmp/`, ignoré par Git.
- Ne pas inventer les parents absents, règles institutionnelles ou équivalences entre identifiants de tables différentes. Isoler les anomalies et documenter leur résolution.
- Les tables restent fermées par RLS jusqu'à l'implémentation et la validation des parcours d'accès réels. Le catalogue des rôles n'accorde aucun droit à un compte sans attribution explicite.

La connexion du site est autorisée explicitement le 15 octobre 2026 : les inscriptions en ligne arrivent dans la plateforme et les articles partent de la plateforme vers la copie du site. La migration `202610150022_website_exchange.sql` est appliquée ; les dossiers reçus restent distincts des inscriptions académiques et des comptes. Voir `docs/INTERCONNEXION_SITE_LOCAL.md`. Les autres extensions CRM restent hors périmètre.

### Phase initiale : prototype front-end sans persistance (historique)

Les restrictions de cette section décrivent la phase précédente. Elles sont remplacées, pour la préparation de la base, par l'autorisation explicite ci-dessus ; elles restent le contexte de l'interface non encore branchée.

Jusqu'à instruction explicite contraire, le projet doit rester un prototype fonctionnel exclusivement front-end. L'absence de persistance est volontaire et ne constitue pas un défaut à corriger pendant cette phase.

- Ne pas installer, configurer ou introduire Supabase, PostgreSQL, MySQL, SQLite, Prisma, Drizzle, Firebase, un ORM, une API backend, des migrations, une authentification réelle ou un stockage distant.
- Ne pas créer de schéma de base de données et ne pas préparer de migration pour l'instant.
- Utiliser des données mockées dans des fichiers TypeScript et/ou un état React en mémoire. La perte des changements au rafraîchissement est acceptable.
- Structurer néanmoins les accès aux données derrière des services mock locaux par domaine afin qu'une future API puisse remplacer leur implémentation sans réécrire l'interface.
- Séparer progressivement les types métier, données mockées, services, hooks et logique métier, composants UI, modules fonctionnels, utilitaires et règles de permissions.
- Éviter de concentrer toute la logique dans `useAppState.ts` ou `data.ts` ; privilégier une organisation par domaine dans `src/types/`, `src/mocks/`, `src/services/`, `src/hooks/`, `src/components/`, `src/modules/` et `src/utils/`, en tenant compte de la structure existante.
- Le sélecteur de rôle peut rester disponible pour la démonstration. Les menus, données visibles et actions doivent toutefois respecter réellement le rôle sélectionné et le principe du moindre privilège.
- Pendant cette phase, simuler les contrôles d'autorisation dans l'interface et dans la couche de services mock. Les futurs contrôles côté serveur restent une exigence de production, mais ne justifient pas la création anticipée d'un backend.
- Reproduire intégralement les workflows métier, validations, historiques et audits en mémoire, notamment pour les notes, réclamations, emplois du temps et opérations financières.

Les priorités de cette phase sont, dans l'ordre : conception fonctionnelle, expérience utilisateur, workflows, rôles et permissions, cohérence métier, puis qualité et maintenabilité du code front-end.

### Contexte et périmètre

Ce projet est une plateforme intégrée de gestion académique, administrative et financière pour ESCEN.

Le périmètre actuel couvre : étudiants déjà inscrits ; filières et parcours ; niveaux ; groupes ; matières ; enseignants ; affectations pédagogiques ; emplois du temps et leur état ; salles ; jours fériés ; présences ; évaluations ; examens ; notes et leur validation ; réclamations ; délibérations ; relevés ; cartes étudiants ; abandons ; réinscriptions ; finance ; frais de scolarité et d'inscription ; échéanciers ; paiements ; reçus ; bourses ; personnel ; utilisateurs ; rôles et permissions ; communication ; support ; audit ; sauvegardes ; reporting.

Ne pas développer sans instruction explicite : CRM, prospects, campagnes commerciales, candidatures, admission, espace candidat ou portail public.

### Rôles métier et autorisations

Les rôles ESCEN sont : Directeur Général, Directeur Général Adjoint, Directeur Académique, Logisticien académique, Enseignant, Surveillant, Responsable Administratif et Financier, Responsable marketing, Responsable des achats et de la logistique, Responsable du site, Informaticien, Étudiant, Délégué et Stagiaire.

- Appliquer le principe du moindre privilège et contrôler les autorisations côté serveur, jamais uniquement dans l'interface.
- Instruction explicite : l’Informaticien possède tous les accès métier de la plateforme. Les validations et audits restent obligatoires.
- Un Enseignant accède uniquement aux enseignements et groupes qui lui sont affectés.
- Un Étudiant accède uniquement à ses propres données.
- Un Délégué reste un Étudiant avec quelques permissions supplémentaires.
- Le statut Stagiaire n'accorde automatiquement aucune permission métier.

### Notes et réclamations

Le workflow cible des notes est `BROUILLON -> SAISIES -> SOUMISES -> A_CONTROLER -> VALIDEES -> PUBLIEES`. L'Enseignant saisit les notes ; le Directeur Académique ou un rôle autorisé les valide. Une note publiée ne doit jamais être modifiée silencieusement. Toute modification ultérieure conserve l'ancienne valeur, la nouvelle valeur, l'auteur, la date et le motif.

Le workflow des réclamations est `NOUVELLE -> EN_ANALYSE -> TRANSMISE_ENSEIGNANT -> AVIS_ENSEIGNANT -> DECISION_ACADEMIQUE -> CORRECTION_EVENTUELLE -> CLOTUREE`.

### Finance, emplois du temps et groupes

- Ne jamais supprimer silencieusement un paiement. Toute annulation conserve la transaction originale, l'auteur, la date et le motif. Auditer les opérations financières sensibles.
- Avant d'enregistrer une séance, vérifier les conflits de salle, d'enseignant et de groupe, la capacité de la salle, ainsi que les jours fériés ou périodes bloquées.
- Un groupe représente un ensemble d'étudiants ; un groupe n'est jamais une salle.

### Historique, base de données et audit

- Ne jamais écraser l'historique académique lors d'une réinscription. Conserver les anciennes années, niveaux, groupes, notes et décisions.
- Ne supprimer aucune donnée existante et ne lancer aucune migration destructive sans instruction explicite.
- Examiner le schéma existant avant toute évolution. Ne pas modifier une migration déjà appliquée lorsqu'une nouvelle migration peut être créée.
- Toute opération sensible doit tracer l'utilisateur, le rôle, la date/heure, l'action, l'entité, l'ancienne valeur, la nouvelle valeur et, lorsque nécessaire, le motif.

### Méthode de travail

Avant toute modification importante :

1. Analyser l'existant.
2. Identifier les fichiers concernés.
3. Identifier les dépendances.
4. Vérifier le modèle de données.
5. Vérifier les impacts sur les rôles et permissions.
6. Proposer un plan.
7. Implémenter.
8. Lancer le lint, le build et les tests disponibles.
9. Vérifier les régressions.
10. Fournir un résumé des modifications.

Lorsqu'une règle métier est ambiguë, ne pas inventer silencieusement une règle structurante.

La migration `202610150023_academic_year_context.sql` relie la consultation annuelle, le cycle de vie des années et les campagnes du site. Aucune année officielle n’est désignée automatiquement. Voir `docs/ANNEE_DE_TRAVAIL.md`. Recette dédiée : `npm run test:ui -- tests/ui/academic-years.spec.ts`.

Les pages de notes, relevés et documents exigent un dossier étudiant avant d’afficher ou d’exporter les données. Conserver ce contexte dans les sources actuelles et historiques, sans rattachement supposé. Recette : `npm run test:ui -- tests/ui/document-context.spec.ts`.

La migration `202610150024_annual_business_scope.sql` exige une année pour les nouvelles activités de communication, support, achats, mouvements, sujets et documents. Les activités et leurs descendants sont filtrés par année ; les archives sans année confirmée restent conservées hors des vues annuelles. Les identités et référentiels communs restent partagés. Les écritures de sujets et de gestion du site exigent une année précise ; « Toutes les années » sert à consulter.

La migration 25 reprend les années historiques aux dates complètes avec des codes issus des libellés, préserve les codes originaux dupliqués et restaure uniquement le marqueur actif unique de la source si aucune année n’est configurée. Les identités historiques restent consultables par année uniquement via leurs correspondances source exactes, sans création d’inscriptions supposées.

Réinscriptions : pour l’année cible, proposer uniquement les étudiants inscrits l’année scolaire immédiatement précédente et sans inscription dans l’année cible. Ne pas déduire une inscription d’un dossier civil ; utiliser les relations canoniques ou sources exactes autorisées. Test navigateur : `npm run test:ui -- tests/ui/reenrollment.spec.ts`.

Utiliser `LoadingState` pour les lectures asynchrones : aucun état vide avant la fin de la requête, erreur distincte avec reprise, indicateur visible pendant les écritures. Recette des chargements ralentis : `npm run test:ui -- tests/ui/loading-feedback.spec.ts`.

La migration 26 ajoute les tarifs annuels (scolarité/inscription, filière et niveau facultatifs) et le rattachement annuel des matières. Un code matière est unique dans son année ; une matière annuelle ne peut pas entrer dans une offre d’une autre année. Les anciennes références sans année restent conservées et à reprendre explicitement. La configuration des tarifs ne recalcule pas les contrats existants. Recette : `npm run test:ui -- tests/ui/annual-configuration.spec.ts`.

La migration 27 permet la préparation des formations, groupes, matières, tarifs et caisses en brouillon. L’ouverture via le serveur exige la configuration annuelle vérifiée. Les nouvelles inscriptions et réinscriptions sont séparées et créent une inscription, un historique de groupe et un contrat en brouillon atomiques avec les tarifs explicitement choisis. Aucun ancien dossier historique n’est requalifié comme nouveau. La réinscription exige une inscription précédente canonique ; un changement de niveau ou filière reste soumis à décision. Recette : `npm run test:ui -- tests/ui/year-preparation.spec.ts`.

Revue des parcours utilisateurs : conserver une activité principale et un contexte explicite par écran. La préparation annuelle affiche le bilan ou une seule étape, sans empiler les menus génériques du catalogue. Un premier paramètre ouvre directement son formulaire lorsque ses références existent ; les informations indépendantes sont enregistrées avant leurs dépendants, sans renvoi vers une autre page. Le parcours commun calcule cet ordre à partir des références obligatoires ; les références facultatives ne bloquent pas une action. Une étape suivante ne s’ouvre qu’après confirmation de l’enregistrement. Ne pas redemander une année ou une relation déjà déterminée par une référence réelle. Les sites représentent des lieux physiques d’enseignement, distincts du site web. Les rubriques d’un dossier récent doivent rester accessibles et filtrées sur ce dossier, même sans archive historique. Recette : `npm run test:ui -- tests/ui/process-clarity.spec.ts tests/ui/year-preparation.spec.ts tests/ui/navigation-review.spec.ts`. Voir `docs/REVUE_PARCOURS_UTILISATEURS.md` pour la chronologie et les limites des traitements encore consultatifs.

Recette des dépendances : `npm run test` exécute `src/services/catalogDependencyService.test.ts` pour vérifier l’ordre de toutes les collections CRUD. `tests/ui/process-clarity.spec.ts` couvre la préparation de bases vers les formations et la création d’identité pendant l’inscription, sans changement de page.

La migration 28 retire les sites et bâtiments des parcours et prérequis de saisie, sans supprimer les données historiques ni élargir les rôles restreints. La migration 29 permet la reprise opérationnelle de 2025-2026 avec preuve source exacte. Utiliser `node scripts/import-canonical-2025.mjs` pour vérifier le plan et le rejouer localement ; `--refresh-index` actualise les correspondances distantes, `--apply` réalise la transaction autorisée. Une seconde insertion est refusée. Voir `docs/REPRISE_OPERATIONNELLE_2025_2026.md`. Les paiements `PENDING` sont exclus des montants payés ; les contrats repris `EN_COURS` conservent les montants originaux sans approbateur inventé.

Instruction utilisateur : la configuration initiale de l’année centralise formations, groupes, frais et encaissement. Le programme des matières reste dans la gestion pédagogique, hors des conditions de préparation annuelle. Les paramètres centralisés ne doivent plus être proposés dans des écrans de configuration concurrents ; les prérequis rencontrés pendant une inscription ou un paiement ouvrent la même fenêtre annuelle et reviennent au dossier sans redirection.

Un groupe appartient à une année et un niveau et accueille une ou plusieurs filières de ce niveau via plusieurs rattachements `group_offerings`. Chaque étudiant conserve sa propre filière via son inscription ; ne pas imposer une filière unique au groupe. Les listes et fiches de groupes affichent leurs formations rattachées.

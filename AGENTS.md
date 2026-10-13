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

## Commit & Pull Request Guidelines

Git history is unavailable in this working copy, so use concise, imperative commit subjects such as `Add finance export filters`. Keep commits focused. Pull requests should explain the user-facing change, identify affected modules and roles, list verification performed, and link relevant issues. Include before/after screenshots for visual changes and call out configuration, dependency, or data-shape changes explicitly.

## ESCEN Business Rules & Project Constraints

### Phase actuelle : prototype front-end sans persistance

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
- Ne jamais considérer l'Informaticien comme un super-administrateur métier.
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

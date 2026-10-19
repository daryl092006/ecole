# Guide du Projet ESCEN — Instructions pour Agents & Développeurs

Ce fichier constitue la référence technique et normative pour tout agent d'assistance ou développeur intervenant sur la plateforme ESCEN (Next.js 15 App Router, TypeScript strict, PostgreSQL / Supabase, schéma `escen`).

Toutes les informations ci-dessous sont **strictement vérifiées dans le code source du projet**.

---

## 1. Checklist exacte pour ajouter un écran, une permission, une API et une migration

Pour ajouter une nouvelle fonctionnalité de bout en bout, suivre **rigoureusement cet ordre** :

1. **Migration SQL** (`supabase/migrations/<timestamp>_<nom>.sql`) :
   - Créer la table dans le schéma `escen` avec colonnes, contraintes, clés étrangères et index.
   - Activer la sécurité au niveau des lignes : `ALTER TABLE escen.<table_name> ENABLE ROW LEVEL SECURITY;`.
   - Poser le trigger d'audit automatique : `CREATE TRIGGER ... AFTER INSERT OR UPDATE OR DELETE ON escen.<table_name> FOR EACH ROW EXECUTE FUNCTION escen_private.audit_trigger();`.
   - Enregistrer la nouvelle permission dans `escen.permissions` et l'associer aux rôles autorisés dans `escen.role_permissions`.
   - Créer une fonction RPC transactionnelle dans le schéma `escen` (ex. `SECURITY DEFINER` ou vérifiant `auth.role()`) pour les écritures sensibles.
   - *Ne jamais modifier une migration déjà appliquée (migrations 202608130001 à 202610170034).*

2. **Types de permissions** (`src/types/permissions.ts`) :
   - Ajouter le littéral de la permission dans l'union TypeScript `Permission`.
   - Ex. `'mon_module.action.manage'`.

3. **Types métier de l'entité** (`src/types/<domaine>.ts`) :
   - Définir l'interface TypeScript correspondant aux données de la table et aux payloads d'action.

4. **Définition de l'URL et du routage** (`src/constants/portalRoutes.ts`) :
   - Enregistrer la sous-route dans le dictionnaire `PORTAL_ROUTES`.
   - Enregistrer le préfixe du module parent dans `MODULE_PATHS`.

5. **Attribution des permissions aux rôles** (`src/permissions/rolePermissions.ts`) :
   - Associer la nouvelle permission aux rôles habilités dans `ROLE_PERMISSIONS`.
   - *Rappel : le rôle Informaticien (`IT`) dispose de tous les accès métier.*

6. **Visibilité dans la navigation** (`src/permissions/navigation.ts`) :
   - Déclarer le sous-onglet dans `NAV_SUB_TABS` avec son label, sa clé, son icône et sa condition `requiredPermission`.

7. **Organisation dans les menus de travail** (`src/constants/workspaceNavigation.ts`) :
   - Déclarer la section dans les groupes de navigation `WORKSPACE_NAV_GROUPS` pour l'afficher dans les menus latéraux de domaine.

8. **Composant d'interface utilisateur** (`src/components/modules/<Domaine>/<Composant>.tsx`) :
   - Développer le composant React avec chargement asynchrone via `LoadingState`.
   - Utiliser `ReviewedForm` pour toute action modifiant des données sensibles.
   - Utiliser `DetailDrawer` (ou `WorkPage`) pour les fenêtres et volets modaux.
   - Après chaque enregistrement réussi, appeler `portal.refreshCampus()`.

9. **Branchement dans le répartiteur d'écrans** (`src/components/layout/PortalScreen.tsx`) :
   - Ajouter la condition d'aiguillage authentifié **avant les modules démo historiques** (avant la ligne 74) :
     `if (state.session && section === 'ma_section') return <MonComposant />;`

10. **Route Next.js App Router** (`src/app/(portail)/<chemin>/page.tsx`) :
    - Créer le fichier `page.tsx` léger qui délègue au portail principal :
      `<PortalScreen tab="mon_onglet" section="ma_section" />`

11. **Route API serveur authentifiée** (`src/app/api/<endpoint>/route.ts`) :
    - Exiger l'authentification avec `requireAccount(request)`.
    - Exiger l'autorisation avec `requirePermission(context, 'mon_module.action.manage')`.
    - Valider le corps de requête avec un schéma `zod`.
    - Exécuter la RPC Supabase ou l'opération SQL sécurisée et consigner l'audit.

---

## 2. Conventions architecturales et de style

- **Écritures sensibles avec `ReviewedForm`** :
  Toute action impactant les finances, les notes, les contrats, les statuts d'étudiants, les archives ou les paramètres sensibles doit obligatoirement passer par le composant `ReviewedForm` (`src/components/ui/ReviewedForm.tsx`). Ce composant applique une double validation obligatoire : saisie de formulaire -> écran de récapitulatif listant les champs modifiés (avant / après) et les conséquences métier réelles, avec bouton de confirmation explicite.

- **Fenêtres modales avec `DetailDrawer`** :
  Toute modal, tiroir latéral ou fenêtre d'édition doit utiliser `DetailDrawer` (`src/components/ui/DetailDrawer.tsx`) ou `WorkPage` (qui en hérite). `DetailDrawer` gère automatiquement :
  - Le portail dans `document.body`.
  - Le piégeage du focus clavier (`Tab` / `Shift+Tab`) et la fermeture via la touche `Échap`.
  - L'attribut `inert` sur les éléments sous-jacents.
  - La protection anti-perte de données (`discard` alert si l'utilisateur tente de fermer un formulaire modifié).

- **Actualisation après mutation avec `refreshCampus()`** :
  Après toute écriture ou mutation en base réussie, appeler systématiquement `portal.refreshCampus()` (issu du hook `usePortal()`). Cela synchronise l'état réactif global du portail et met à jour les collections sans recharger toute la page navigateur.

- **Aucune classe Tailwind** :
  Tailwind CSS **n'est pas installé** sur ce projet. Ne jamais utiliser de classes utilitaires Tailwind (ex. `flex`, `p-4`, `text-center`, `rounded-md`). Utiliser exclusivement des classes sémantiques CSS déclarées dans `src/app/globals.css`.

- **Styles dans `globals.css` avec breakpoints uniques** :
  Tous les styles responsives et composants globaux sont regroupés dans `src/app/globals.css`.
  Seuls les 3 breakpoints de référence suivants sont autorisés :
  - `--bp-mobile: 480px` : `@media (max-width: 480px)` (mobiles compacts et petits téléphones).
  - `--bp-tablet: 768px` : `@media (max-width: 768px)` (tablettes et rupture de la barre latérale).
  - `--bp-desktop: 1024px` : `@media (max-width: 1024px)` (desktop intermédiaire et ordinateurs portables).

---

## 3. Fichiers à ne jamais modifier sans demande explicite

Les fichiers et répertoires suivants sont strictement protégés et ne doivent jamais être modifiés sans instruction explicite de l'utilisateur :

1. **Migrations SQL existantes** :
   - Tous les fichiers sous `supabase/migrations/` de `202608130001_academic_structure.sql` à `202610170034_audit_journal_read.sql`.
   - Le schéma PostgreSQL et les migrations déjà appliquées sont immuables. Toute évolution de schéma nécessite la création d'un **nouveau** fichier de migration daté.

2. **Scripts d'outillage historique et de reprise de données** :
   - `scripts/prepare-legacy-data.py`
   - `scripts/load-legacy-stage.mjs`
   - `scripts/push-legacy-stage.mjs`
   - `scripts/upload-legacy-archives.mjs`
   - `scripts/restore-legacy-auth-users.mjs`
   - `scripts/import-legacy-identities.mjs`

3. **Données de staging et répertoires de travail temporaires** :
   - `.tmp/*` (ex. `.tmp/escen-staging.db`, captures d'écran Playwright, sauvegardes locales de staging).

4. **Dictionnaires et schémas relationnels générés** :
   - `docs/SCHEMA_BASE_RELATIONNELLE.json` (ce fichier ne s'édite jamais manuellement ; il est uniquement régénéré par la commande `npm run db:describe`).

5. **Spécifications normatives et documents d'architecture validés** :
   - `docs/PARCOURS_METIER_2026-10-15.md`
   - `docs/REPRISE_OPERATIONNELLE_2025_2026.md`
   - `docs/ANNEE_DE_TRAVAIL.md`
   - `docs/INTERCONNEXION_SITE_LOCAL.md`

6. **Fichiers de build et de dépendances** :
   - `.next/*`
   - `tsconfig.tsbuildinfo`
   - `package-lock.json` (sauf instruction explicite d'installation de dépendances).

---

## 4. Commandes de vérification obligatoires avant complétion

Avant de déclarer une tâche ou modification terminée, exécuter obligatoirement les vérifications suivantes :

1. **Vérification TypeScript** :
   ```bash
   npx tsc --noEmit
   ```
   *Exigence : 0 erreur de type.*

2. **Linter ESLint** :
   ```bash
   npm run lint
   ```
   *Exigence : 0 erreur de linting (Core Web Vitals & TypeScript).*

3. **Tests de validation (si modifications backend, SQL ou services métier)** :
   ```bash
   npm run test
   ```
   *(Exécute les assertions des workflows et vérifie l'intégrité de la base locale via PGlite).*

---

## 5. Code mort connu (NE PAS UTILISER, NE PAS COPIER)

Les éléments suivants sont des vestiges de la Phase 1 (prototype initial exclusivement front-end en mémoire). Ils sont conservés pour rétrocompatibilité transitoire mais **ne doivent en aucun cas être réutilisés, importés ou étendus** dans de nouveaux développements :

- **`src/mocks/data.ts`** :
  - *Statut* : Données statiques de démonstration en mémoire (`initialStudents`, `initialClasses`, `initialEvaluations`, etc.).
  - *Consigne* : **Ne pas utiliser, ne pas copier.** Ne pas importer ces constantes pour simuler des données. Toute donnée doit provenir de Supabase via `usePortal()` ou les routes API serveur.

- **`src/services/campusWorkflowService.ts`** :
  - *Statut* : Service de mutations en mémoire locale sans persistance (`executeCampusWorkflow`).
  - *Consigne* : **Ne pas utiliser, ne pas copier.** Les nouvelles mutations doivent passer par les routes d'API serveur (`/api/...`) et les fonctions RPC PostgreSQL sécurisées.

- **`demoIdentity` (dans `src/hooks/useAppState.ts` et `src/types/demoUsers.ts`)** :
  - *Statut* : Mécanisme d'usurpation / simulation d'identité pour le sélecteur de rôle démo en mémoire.
  - *Consigne* : **Ne pas utiliser, ne pas copier.** L'application fonctionne avec des comptes authentifiés réels via `portal.session`. Ne jamais conditionner de logique métier pérenne sur `demoIdentity`.

- **Modules démo de `PortalScreen.tsx` (lignes 75 à 214)** :
  - *Statut* : Branches de secours non persistantes (`FinanceModule`, `PlanningModule`, `PersonnelModule`, `MarketingModule`, `SystemeModule`, etc.) rendues quand aucune session n'est active.
  - *Consigne* : **Ne pas utiliser, ne pas copier.** Ne pas ajouter de nouvelles fonctionnalités dans ces branches démo. Tout nouvel écran doit être branché en amont (lignes 20 à 74 de `PortalScreen.tsx`) avec la condition `state.session`.

---

## Mise à jour vérifiée du 19 octobre 2026

Cette section actualise les constats historiques des sections 1 et 5, notamment le branchement des écrans, la fonction d'audit et les éléments encore utilisés. Les autres consignes restent applicables.

### Travail et points d'arrêt

- Un commit local par sous-étape ; un commit par suppression de fichier. Ne rien pousser.
- Avant chaque migration SQL : présenter son SQL et attendre l'accord. Ne modifier aucune migration existante, y compris les migrations postérieures à 034. Les migrations 035 à 046 existent désormais dans le dépôt.
- N'appliquer les migrations qu'en local ou dans les tests ; aucune application distante pendant ce chantier.
- Avant toute suppression : montrer le grep des usages et attendre l'accord. Avant une règle métier indécise ou un changement visible non encore approuvé : présenter la proposition et attendre l'accord. En fin de phase : bilan fait/testé/reste et autorisation de poursuivre.
- Préserver les modifications préexistantes, y compris celles des fichiers partagés. Si le constat du rapport est faux dans le code actuel, le signaler et passer au suivant.

### Checklist des fichiers et conventions actuelles

- Migration nouvelle et datée dans `supabase/migrations/` : schéma `escen`, contraintes, index, RLS et droits des RPC. Réutiliser l'audit existant : la fonction réellement définie est `escen_private.record_audit()`, avec le trigger `audit_event` après INSERT ou UPDATE ; `escen_private.audit_trigger()` n'existe pas dans les migrations actuelles. Ne pas créer un second audit sur une table déjà couverte.
- Permission : `src/types/permissions.ts`, `src/permissions/rolePermissions.ts` et permissions persistées en SQL ; navigation : `src/permissions/navigation.ts`, `src/constants/workspaceNavigation.ts` et `src/constants/portalRoutes.ts`.
- Écran : types métier, composant dans `src/components/modules/`, branche authentifiée dans `src/components/layout/PortalScreen.tsx`, puis page légère App Router. Les anciennes branches démo de PortalScreen ont déjà été retirées : ne pas se baser sur les anciens numéros de lignes.
- API : `requireAccount`, `requirePermission`, validation Zod, snapshot filtré par rôle et année, vérification du groupe et de l'affectation avant écriture, puis RPC transactionnelle et audit.
- Écritures sensibles avec `ReviewedForm` ; fenêtres avec `DetailDrawer` ou `WorkPage` ; appeler `portal.refreshCampus()` après mutation réussie.
- Styles sémantiques dans `src/app/globals.css` ; aucune nouvelle classe Tailwind. Breakpoints : 480/768/1024 px ; un seul `:root` et une seule définition de `--sidebar-width`. Tableaux en fiches et calendrier en liste au seuil mobile de 768 px. Les tableaux larges sur ordinateur défilent dans leur conteneur.
- Documentation du schéma : régénérer simultanément `docs/SCHEMA_BASE_RELATIONNELLE.json` et `docs/DICTIONNAIRE_BASE_RELATIONNELLE.md` avec `npm run db:describe`. Cette commande applique les migrations dans PGlite local, sans accès à Supabase. Aucune édition manuelle du JSON.

### État réel du code historique

- `src/utils/data.ts` et les anciens modules AcademiqueModule, FinancePaymentsPanel, LogisticsModule et MarketingModule sont déjà absents. Les branches de secours démo de PortalScreen ont également disparu.
- `src/components/modules/SupportPanel.tsx` et `src/components/modules/academic/JuryPanel.tsx` ont été supprimés après preuve par grep et accord utilisateur. Ne pas les réintroduire ; les écrans actuels utilisent les routes connectées.
- `src/mocks/data.ts` reste importé par `useAppState` et `useAcademicReferences` : il fournit des collections initiales typées vides, et non des étudiants ou comptes de démonstration préchargés. Il n'est pas sans usage. Ne pas l'étendre pour de nouvelles données métier.
- `campusWorkflowService.ts` reste utilisé par l'état global, `verify-campus.cjs` et des tests. `runWorkflow` bloque les écritures de démonstration lorsqu'une session est active. Une suppression exige de traiter ces dépendances ; ne pas remplacer une écriture persistante par ce service.
- `useDemoUsers` reste appelé par l'état global. `demoIdentity` reçoit encore l'identité de la session réelle et intervient dans les projections et la clé de PortalShell. `src/types/demoUsers.ts` est absent. Ne pas qualifier ces symboles de code sans usage ni les utiliser dans une nouvelle règle métier.
- Le journal et son export sont montés via `AuditJournalPanel` ; les réclamations via `ComplaintsPanel` pour les rôles autorisés ; la consultation des communications via `ConnectedDomainWorkspace`. Ne pas remplacer ces écrans actifs par une indisponibilité globale.
- « Mes épreuves en ligne » est un parcours personnel réservé aux rôles Étudiant et Délégué. La permission globale `exam.take` de l'Informaticien ne doit pas afficher cette rubrique ni autoriser sa page personnelle ; appliquer ce filtre avant l'exception de navigation IT. Les fonctions d'administration des examens restent accessibles selon les permissions métier. Un compte cumulant IT et Étudiant doit sélectionner son rôle étudiant pour passer ses épreuves.

### Décisions et limites à préserver

- Semestres, UE et matières du programme : `reason` et `archived_at` nullables ; motif d'archivage de 3 à 1000 caractères ; audit existant ; contrôles de crédits et pondérations sur les lignes actives ; aucun archivage dans une maquette approuvée, ni d'un parent ayant des enfants actifs. Pas des crédits : 0.01 ; coefficient : 0.001 ; position entière.
- Notes : REINSCRIT fait partie des candidats ; ABSENT et JUSTIFIE sont traités, NON_TRAITE bloque la soumission ; une correction vide ne devient jamais zéro. Les lots RPC sont bornés et signalent tout échec partiel.
- Finance : affectation automatique à l'échéance non soldée la plus ancienne, réaffectation possible ; annulation par contre-opération motivée ; remboursements et avoirs déduits des projections. Les paiements PENDING et annulés ne comptent pas comme encaissés.
- Passage de niveau et compensation : ne rien implémenter sans règles approuvées. Délibérations, nouveaux documents officiels, circuit d'achat, traitement du support, publication d'annonces, conversion des candidatures et provisionnement des comptes ne sont pas à présenter comme disponibles lorsqu'ils restent consultatifs ou non montés.

### Vérifications et artefacts

- Après chaque sous-étape : `npx tsc --noEmit --incremental false` (évite d'écrire tsconfig.tsbuildinfo), `npm run lint` et les tests Playwright concernés ; ajouter `npm test` pour le backend, SQL ou les services métier. Corriger les échecs avant de poursuivre.
- Ne pas lancer ce contrôle TypeScript en parallèle d'un build Next.js qui régénère les types inclus par tsconfig ; attendre la fin du build pour éviter des fichiers temporairement absents.
- Responsive : rapports `docs/RESPONSIVE_AVANT_2026-10-19.md`, `docs/RESPONSIVE_APRES_2026-10-19.md` et `docs/RESPONSIVE_AVANT_APRES_2026-10-19.md` ; 71 écrans/variantes aux largeurs 360/390/768/1024/1440, 10 cas problématiques avant et aucun après les corrections.
- Captures dans `tmp/screenshots/responsive-audit/`, sans toucher aux données protégées de `.tmp/`. La configuration `tests/ui/legacy-cleanup.config.ts` contrôle support et délibérations et écrit dans un dossier séparé de l'audit initial.

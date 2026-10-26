# Simplification globale du portail ESCEN

Date : 26 octobre 2026. Proposition à valider avant modification visible.

## Objectif

Permettre à chaque utilisateur de comprendre où commencer, de réaliser une tâche complète et de retrouver son résultat. La suppression des flèches ne suffit pas : il faut réduire les changements de contexte et rendre les capacités réelles explicites.

## Constats vérifiés dans le code

| Constat | Preuve | Conséquence |
| --- | --- | --- |
| Navigation à deux niveaux avec ouverture préalable des groupes | `src/components/layout/Sidebar.tsx`, état `expanded` et boutons `aria-expanded` | Un clic peut seulement ouvrir un menu sans avancer dans le travail. |
| L’accueil reproduit les groupes sous forme de blocs repliables | `src/components/modules/WorkspaceHome.tsx`, `home-directory-group` | La même recherche de destination se répète dans deux endroits. |
| L’accueil cumule actions, annuaire de rubriques, indicateurs, répartitions et informations de reprise selon le rôle | `WorkspaceHome.tsx` | Plusieurs intentions se disputent l’attention dès l’entrée. |
| Les actions prioritaires sont assemblées puis limitées par `.slice(0, 6)` | `WorkspaceHome.tsx`, `quickActions` | Les droits et l’ordre de la liste déterminent les actions visibles ; une tâche autorisée peut sortir des six premières. |
| Des écrans génériques exposent des collections comme des sous-rubriques | `src/components/modules/ConnectedDomainWorkspace.tsx`, `record-sections` | Il faut connaître la structure des données pour retrouver une opération métier. |
| L’encaissement ouvre un sélecteur puis le dossier étudiant | `ConnectedDomainWorkspace.tsx`, `paymentPicker` et `paymentDossier` | La destination « Versements » ne constitue pas elle-même un parcours d’encaissement direct. Les contrôles du dossier restent nécessaires. |
| Les filtres de période et les activités liées sont repliables | `ConnectedDomainWorkspace.tsx`, `advanced-record-filters` et `next-activity-panel` | Des outils de travail sont cachés comme s’il s’agissait de détails secondaires. |
| L’écran des règles académiques affiche des seuils tout en précisant qu’ils doivent être confirmés et que leur activation est indisponible | `src/components/layout/PortalScreen.tsx`, branche `acad_settings` | Risque de confondre un cadre proposé avec une règle institutionnelle approuvée. |

### Ne pas confondre ancien descriptif et fonctionnalité actuelle

`PortalScreen.tsx` monte des espaces spécialisés pour les réinscriptions, frais annuels, enseignants, présences, documents, communications, achats et support. Plusieurs descriptions conservées dans `src/data/domainWorkspaces.ts` évoquent encore des limites d’anciens écrans génériques. Elles ne prouvent pas l’absence de ces fonctions dans les espaces actifs.

Les espaces support, achats, communications et documents comportent déjà des actions avec `ReviewedForm`. Ils ne doivent pas être remplacés par des écrans de consultation. L’existence des composants ne constitue toutefois pas une validation de leur fonctionnement de bout en bout.

## Fonctionnement proposé pour toute l’application

### Navigation et accueil

- Une rubrique du menu ouvre directement une destination autorisée ; plus de dépliage nécessaire pour entrer dans le travail.
- Les pages voisines du domaine apparaissent dans une navigation locale visible. Conserver les URL existantes et les contrôles de droits.
- Sur mobile, présenter cette navigation sans débordement et conserver le menu mobile accessible au clavier.
- L’accueil présente d’abord les tâches du rôle actif. L’annuaire complet des rubriques quitte l’accueil principal ; la recherche globale et le menu restent les accès transversaux.
- Réserver les indicateurs détaillés au pilotage. Garder sur l’accueil seulement les informations qui servent à décider de la prochaine tâche.
- Choisir explicitement les tâches par rôle, intersectées avec les droits réels, plutôt que tronquer une liste commune.

### Structure commune des pages

Ordre proposé : titre et contexte année/groupe/dossier, action principale, recherche et filtres usuels, liste de travail, détail d’un élément.

Les données nécessaires à la tâche et les actions usuelles restent visibles. Réserver les blocs repliables aux historiques et détails secondaires. Éviter d’ouvrir une succession de fenêtres pour la même tâche ; garder le formulaire et son récapitulatif dans le même espace de travail.

Conserver les confirmations de `ReviewedForm` pour les écritures sensibles, les protections de `DetailDrawer`/`WorkPage`, les contrôles serveur, l’audit et `refreshCampus()`.

### Parcours à reprendre

| Domaine | Entrée proposée | Résultat attendu et limite |
| --- | --- | --- |
| Scolarité | Rechercher ou créer un dossier ; inscrire/réinscrire depuis le dossier | Retrouver inscription, groupe et pièces dans le même contexte. Vérifier séparément création, réinscription et changement de statut. |
| Finance | « Encaisser un paiement » puis rechercher l’étudiant | Passer au formulaire financier du dossier choisi, sans recherche répétée. Préserver contrat, allocations, reçus et contre-opérations motivées. |
| Cours | Choisir formation/semestre, puis matière et groupe | Conserver le contexte entre programme, affectation, séance et présences. Ne pas élargir les droits d’affectation. |
| Examens | Choisir l’épreuve puis voir les actions disponibles selon son état | Préparer le sujet, programmer, suivre les copies, corriger et traiter les notes sans devoir reconstituer le parcours entre rubriques. Respecter les changements déjà en cours dans ces fichiers. |
| Résultats | Choisir groupe/évaluation ou dossier étudiant | Saisir, contrôler, publier et retrouver une réclamation. Aucun calcul nouveau de compensation ou de passage sans règles approuvées. |
| Étudiant | Épreuves, résultats, documents et paiements personnels | Présenter seulement ses tâches et ses données ; conserver la restriction Étudiant/Délégué pour les épreuves personnelles. |
| Personnel et comptes | Distinguer dossier professionnel et accès utilisateur | Rendre le lien compréhensible sans présenter un compte comme automatiquement provisionné. |
| Communications, support, achats | Liste avec état et action suivante | Mettre en avant les opérations déjà connectées. Ne pas promettre email automatique, règlement d’achat ou mouvement de stock automatique. |
| Administration et archives | Accès dédié, hors tâches quotidiennes | Distinguer journal, export, données historiques et sauvegarde réelle. Ne pas présenter l’export du journal comme une sauvegarde. |
| Site web | Candidatures et contenus dans un espace identifié | Vérifier les actions réellement montées ; ne pas annoncer de conversion de candidature ou de compte automatique sans preuve. |

## Ordre de mise en œuvre proposé

1. Socle commun : menu direct, navigation locale et accueil par rôle, sans modification métier ni SQL.
2. Scolarité et finance : continuité du dossier et accès direct aux actions existantes.
3. Cours, examens et résultats : contexte commun et parcours lisible de bout en bout.
4. Services et administration : harmonisation des listes, filtres, actions et messages de disponibilité.

Chaque lot doit aboutir à un parcours utilisable ; éviter une refonte simultanée de toutes les pages. Aucun fichier existant à supprimer dans le premier lot.

## Validation prévue par lot

- TypeScript sans écriture incrémentale et ESLint.
- Playwright sur les parcours touchés, liens directs, historique navigateur, droits par rôle et navigation clavier.
- Contrôle mobile 390/768 px et ordinateur 1024/1440 px ; aucun tableau débordant hors de son conteneur.
- Tests métier et base si un lot touche le backend ou un service métier.
- Pour les tâches représentatives, relever les étapes avant/après jusqu’au résultat ; aucun gain chiffré annoncé avant mesure.

## État de cette étape

Fait : lecture des points d’entrée, de la navigation commune, de l’accueil et des branches actives ; proposition transversale et lots définis.

Non fait : audit visuel en session authentifiée, exécution des parcours par rôle et validation de toutes les API. Cette proposition est un diagnostic du code, pas une recette fonctionnelle complète.

À valider : le fonctionnement proposé et le démarrage du lot 1. Aucun changement visible ou règle métier nouvelle n’a été appliqué.

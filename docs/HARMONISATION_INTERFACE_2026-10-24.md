# Harmonisation de l’interface ESCEN — 24 octobre 2026

> Rectification après revue visuelle : les chiffres ci-dessous décrivent un
> contrôle automatique de géométrie, pas une revue complète des pages.
> Plusieurs variantes de catalogue affichaient le même écran initial, et les
> écrans d’erreur de Personnel et Données n’étaient pas rejetés par le test.
> La réponse de test de l’historique et le contrôle des erreurs ont été corrigés.
> La reprise détaillée est suivie dans `REVUE_VISUELLE_PAGE_PAR_PAGE_2026-10-24.md`.

## Périmètre

Harmonisation des styles partagés de toutes les rubriques du portail et des
pages d’authentification, en conservant le logo et la palette déjà présents.
La charte graphique officielle n’a pas encore été fournie : cette intervention
ne constitue donc pas une certification de conformité à cette charte.

- Titres et descriptions : hiérarchie régulière, paragraphes plus lisibles,
  espacements et retours à la ligne adaptés.
- Navigation : sous-rubriques plus lisibles sur le menu sombre, repère actif
  conservé, fil d’Ariane mieux séparé du contenu.
- Accueil et pages de modules : cartes arrondies de façon cohérente, libellés
  et liens plus lisibles, indicateurs numériques alignés.
- Formulaires : champs de 44 px minimum, labels agrandis, états invalides
  identifiables, champs mobiles à 16 px pour éviter le zoom automatique iOS.
- Tableaux : en-têtes en casse courante, lignes aérées, chiffres tabulaires ;
  les mécanismes existants de fiches mobiles et de défilement sont conservés.
- Fenêtres et confirmations : titres et récapitulatifs mieux structurés.
- Connexion et récupération de compte : titres, textes d’aide et cartes harmonisés.

Les nouveaux styles sont limités au média écran. Les mises en page des
documents officiels et de leurs impressions ne sont pas modifiées.
Les règles métier, permissions et écritures serveur ne sont pas modifiées.
Les changements préexistants dans `globals.css` et `WorkspaceHome.tsx` sont conservés.

## Vérifications

- `npx.cmd tsc --noEmit --incremental false` : aucune erreur.
- `npm.cmd run lint` : aucune erreur ; deux avertissements préexistants
  (`site` dans `verify-academic-years.mjs`, `_tab` dans `PortalScreen.tsx`).
- Campagne de présentation : `npx.cmd playwright test --config tests/ui/campus-presentation.config.ts`.
  Elle couvre 72 écrans et variantes à 360, 390, 768, 1024 et 1440 px,
  ainsi que les contrôles ciblés des tableaux, du calendrier, des boutons longs
  et du menu de compte au clavier.
  Résultat des diagnostics : 72/72 écrans sans anomalie pour chacune des cinq
  largeurs, soit 360 vérifications. Les tests ciblés devenus obsolètes ont été
  corrigés et relancés séparément ; les cinq captures de présentation passent.
- Fenêtres : `npx.cmd playwright test --config tests/ui/window-safety.config.ts window-safety.spec.ts` :
  11 tests réussis (paiements, inscriptions, notes, articles, confirmations,
  protection des saisies et actions mobiles).

Les attentes historiques des tests ont été actualisées à partir du code :
les adresses évaluations/rattrapages redirigent vers Examens, et le bouton
d’encaissement se trouve dans la section « Frais et versements » du dossier.
Le tableau des matières nécessite le choix de la filière, du niveau et du
semestre ; la configuration des pièces du site web se fait désormais par niveau.
Le tableau actuel des matières comporte cinq colonnes et tient parfois sans
défilement ; le test vérifie alors qu’il tient dans son conteneur et que sa
dernière cellule est accessible. Les tableaux larges doivent toujours défiler.
Les assertions de sécurité et de responsive sont conservées.

Les tests utilisent des réponses API de test locales pour les comptes personnel
et étudiant. Ils ne constituent pas une validation de tous les jeux de données
réels ni de chaque combinaison de rôles.

Captures et diagnostics : `tmp/screenshots/campus-presentation/after/`.
Les cinq fichiers `audit-<largeur>.json` décrivent les pages vérifiées.

## Suite

Comparer l’identité conservée à la charte officielle lorsqu’elle sera disponible,
puis ajuster les éléments concernés avec validation de l’établissement.
Aucune publication distante n’est effectuée dans cette phase.

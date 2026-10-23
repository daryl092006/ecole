# Observation page par page du portail ESCEN — 23 octobre 2026

Cette revue porte sur le code présent et les pages réellement rendues dans Chrome local. Elle n’est pas une validation de toutes les données et configurations du Supabase distant. Aucun dossier réel, migration, service email ou déploiement n’a été modifié.

## Méthode et preuves

- Inventaire : 46 destinations du portail, quatre accueils de domaine, un dossier individuel, quatre variantes Auth, une redirection historique d’actualités, la racine et 14 URLs de référentiels : 72 entrées de capture. Certaines URLs de référentiels affichent désormais le même parcours guidé ; 72 ne signifie donc pas 72 fonctions distinctes.
- Deux passages détaillés : 51 pages/accueils/dossier à 390 et 1440 px, inventaire des titres, champs, actions, liens et messages, et 39 ouvertures de fenêtres par largeur. Aucun champ visible sans nom accessible ni perte de focus initiale n’a été relevé dans ces fenêtres.
- Captures aux largeurs 360, 390, 768, 1024 et 1440 px ; parties basses capturées si défilement. Les planches mobiles et ordinateur ainsi que des captures individuelles ont été inspectées visuellement. Les chiffres définitifs des tests figurent en fin de rapport.
- Scénarios navigateur des formulaires, erreurs et permissions, avec transport isolé et, selon les suites, véritables gestionnaires API ou PostgreSQL local. Aucun test de mutation n’a utilisé une base distante.
- Galerie consultable : [72 entrées avec choix de largeur](../tmp/screenshots/page-audit-20261023/index.html). Inventaire consolidé : `tmp/screenshots/page-audit-20261023/audit-consolide.json` (360 observations).
- Artefacts locaux : `tmp/screenshots/page-audit-20261023/`, inventaires `observation/390/pages.json` et `observation/1440/pages.json`, constats reproductibles `tmp/page-confirmed-findings-20261023.json`.

## Défauts confirmés et corrections proposées

### 1. Liens cassés dans les règles académiques — priorité haute

Dans `/academique/parametres`, « Consulter les maquettes de cours » mène à `/academique/programmes` et « Consulter les jurys enregistrés » à `/academique/jury`. Les deux requêtes retournent HTTP 404. Les routes actuelles sont `/academique/filieres` et `/academique/deliberations`.

Preuve : `src/components/layout/PortalScreen.tsx:93` et `:94`, contrôle HTTP local, inventaire de tous les `href` locaux littéraux. Aucun autre `href` littéral invalide n’a été trouvé dans les composants TSX.

Proposition : remplacer ces deux destinations par les routes actuelles.

### 2. Archives des articles : mauvais contenu — priorité haute

Depuis `/site-web/articles`, « Consulter les archives » monte `ConnectedDomainWorkspace section="comm_news"`. Cette section lit `communications`, `communication_audiences` et `communication_files`, tandis que le calcul `canonical` force la source actuelle. La vérification navigateur montre la communication interne de recette dans l’écran « Articles », à la place d’archives d’articles du site.

Preuve : `src/components/modules/website/WebsiteArticlesPanel.tsx:41`, `src/components/modules/ConnectedDomainWorkspace.tsx:31`, `src/data/domainWorkspaces.ts` et capture `articles-archives.png`.

Proposition : définir le périmètre souhaité des archives d’articles, puis brancher ce bouton sur les articles concernés. Ne pas annoncer un accès aux anciens articles tant que ce parcours n’est pas relié à leur collection réelle.

### 3. Marketing : filières des brochures inaccessibles — priorité haute

Le rôle Responsable marketing a accès aux brochures et peut les gérer, mais le formulaire charge ses filières via `/api/website-management?kind=admissions`. Ce gestionnaire refuse ce rôle. Le composant masque l’échec avec `.catch(() => {})` ; le sélecteur ne propose alors que « Aucune (Brochure générale) », alors qu’une filière existe dans la recette.

Preuve : `src/components/modules/website/WebsiteBrochuresPanel.tsx:41`, `:43` et `:93`, `src/app/api/website-management/route.ts:12`, `src/services/websiteService.ts:42`. Reproduction dans Chrome avec le véritable contrôle API et le rôle marketing : capture `brochures-marketing.png`.

Proposition : exposer uniquement les références publiques de filières nécessaires au formulaire via une lecture autorisée aux gestionnaires de brochures ; conserver les restrictions sur les candidatures. Afficher une erreur récupérable lorsque cette lecture échoue.

### 4. Contrats : titre de fenêtre trompeur — priorité moyenne

Le bouton « Choisir le dossier pour gérer le contrat » ouvre une fenêtre nommée « Choisir le dossier pour encaisser ». La destination est bien le dossier étudiant, mais l’intitulé annonce une autre opération.

Preuve : `src/components/modules/ConnectedDomainWorkspace.tsx:130` et `:131`, inventaires de fenêtres aux deux largeurs.

Proposition : adapter le titre de la fenêtre à la section d’origine.

### 5. Aide des frais personnels rédigée pour la gestion — priorité basse

`/mon-espace/scolarite` reprend le texte de gestion demandant d’ouvrir un dossier étudiant pour encaisser. Pour un étudiant, cette consigne ne correspond pas aux actions disponibles.

Preuve : `DOMAIN_WORKSPACES.espace_finance` reprend `fin_payments`, inventaire de la page sous rôle Étudiant.

Proposition : donner une description dédiée à la consultation personnelle des frais, versements et reçus.

## Relevé individuel des pages

« Parcours connecté » signifie que l’écran et les actions indiquées sont montés ; cela ne certifie pas toutes leurs combinaisons de données en production. Les limites sont distinguées des défauts.

| Page | État observé | Observation |
| --- | --- | --- |
| `/mon-espace/epreuves` | Parcours connecté | Liste personnelle, ouverture/reprise/remise ; la disponibilité de la liste se réactualise avec Actualiser. |
| `/mon-espace` | Consultation | Accueil et raccourcis selon les droits ; aucun indicateur ne remplace une recette métier. |
| `/mon-espace/support` | Limité | Demandes/messages consultables ; ouverture et traitement non activés. |
| `/mon-espace/annonces` | Limité | Publications et destinataires consultables ; pas de création/diffusion connectée. |
| `/mon-espace/documents` | Limité | Pièces et documents existants ; génération de nouvelles cartes/certificats non activée. |
| `/mon-espace/scolarite` | Libellé à adapter | Consultation personnelle disponible ; aide identique à celle de la gestion, avec des consignes d’encaissement inadaptées à un étudiant. |
| `/tableau-de-bord` | Consultation | Indicateurs par rôle et répartition des effectifs ; les montants nets sont couverts par des tests dédiés. |
| `/tableau-de-bord/rapports` | Consultation | Liens vers rapports financiers, contrôle de reprise et export du journal ; pas un générateur universel de rapports. |
| `/academique/filieres` | Parcours connecté | Filière → niveau → version éventuelle → semestre ; gestion des filières et ouverture des formulaires observées. |
| `/academique/referentiel` | Parcours connecté | Années, préparation, ouverture/clôture, rubriques de référentiel et formulaires ; le scénario de réactivation passe lors de sa répétition isolée. |
| `/academique/emploi-du-temps` | Parcours connecté | Planning par groupe, calendrier/liste mobile, création, déplacement, remplacement, annulation et périodes bloquées couverts par recette. |
| `/academique/presences` | Parcours connecté | Séance, présences étudiantes/enseignantes, correction motivée, justificatifs et refus d’écriture selon rôle. |
| `/academique/notes` | Parcours connecté | Vue groupe/matière, évaluations, saisie et corrections ; choix d’un étudiant pour la consultation détaillée. |
| `/academique/reclamations` | Parcours connecté | Dépôt, traitement, avis enseignant, correction et historique ; tests d’erreur et consultation seule. |
| `/academique/evaluations` | Redirection | Ancienne adresse vers /academique/examens?session=controle ; ne constitue pas un écran supplémentaire de saisie. |
| `/academique/rattrapages` | Redirection | Ancienne adresse vers /academique/examens?session=rattrapage ; filtres conservés. |
| `/academique/sujets` | Parcours connecté | Bibliothèque et composition des sujets ; édition et affichage distincts des copies des candidats. |
| `/academique/examens` | Parcours connecté | Un espace avec contrôles continus, session normale et rattrapages ; création, copies et résultats selon permissions. |
| `/academique/deliberations` | Limité | Choix du dossier, décisions et relevés enregistrés ; nouvelles délibérations et règles de passage non activées. |
| `/academique/parametres` | Défaut confirmé | Les deux liens de sortie pointent vers des routes inexistantes (404). Seuils présentés à confirmer ; aucun écran d’activation du règlement. |
| `/etudiants` | Parcours connecté | Recherche et filtres, création du dossier civil, nouvelle inscription et ouverture du dossier en fenêtre. |
| `/etudiants/comptes` | Limité | Annuaire, filtres et gestion des comptes existants ; création d’un dossier étudiant ne provisionne pas un compte Auth. |
| `/etudiants/cartes` | Limité | Choix d’un étudiant, pièces reçues et documents établis ; nouvelles cartes/certificats non générés ici. |
| `/etudiants/parcours` | Parcours partiel | Candidats à la réinscription, distinction des années et statuts ; pas de promotion/changement de filière sans règles approuvées. |
| `/finance` | Consultation | Recherche, filtre de reste à payer, montants établis et exclusion des inconnus ; CSV des situations. |
| `/finance/versements` | Parcours connecté | Transactions/reçus, choix du dossier pour encaisser ; contre-opérations et impression dans la section financière du dossier. |
| `/finance/rapports` | Consultation | Exports de collections et accès aux situations ; ne constitue pas un rapprochement comptable. |
| `/finance/contrats` | Défaut de libellé | Choix du dossier, contrats et bourses ; la fenêtre ouverte se nomme à tort « Choisir le dossier pour encaisser ». |
| `/personnel/utilisateurs` | Parcours connecté | Comptes personnel/étudiants/à classer, recherche, rôles, activation/désactivation/retrait avec relecture. |
| `/personnel/roles` | Consultation | Catalogue de 14 rôles, recherche et détail des permissions ; sélection adaptée au mobile. |
| `/personnel/permissions` | Consultation | Comparaison de deux rôles, domaines, recherche, différences et réinitialisation. |
| `/personnel/enseignants` | Parcours connecté | Profils enseignants et affectations ; création/modification, activation/désactivation et fin motivée selon droits. |
| `/personnel` | Parcours connecté | Dossiers personnel, profils enseignants, fonctions et archivage ; réponse historique de la fixture corrigée pour confirmer le rendu. |
| `/communication/annonces` | Limité | Annonces internes consultables ; création, publication et retrait connectés non activés. |
| `/site-web/articles` | Défaut confirmé | Rédaction et édition d’articles ; le bouton Archives ouvre les communications internes, pas les anciens articles du site. |
| `/site-web/demandes` | Parcours partiel | Recherche, états vides/erreur, détails et suivi reçu/en analyse/classé ; aucune conversion en étudiant officiel. |
| `/site-web/documents` | Parcours connecté | Ouverture des formations, pièces communes par niveau, filtres, année et confirmation ; pas une décision d’admission. |
| `/site-web/brochures` | Défaut confirmé | Brochures par cycle et formulaire PDF ; le marketing ne peut charger les filières, erreur 403 masquée. |
| `/logistique/achats` | Limité | Demandes, lignes, réceptions et dépenses consultables ; circuit de soumission/approbation/réception non activé. |
| `/logistique/fournisseurs` | Parcours connecté | Recherche, détails et formulaires de création/modification/archivage des fournisseurs. |
| `/logistique/inventaire` | Parcours connecté | Recherche, détails et formulaires de création/modification/archivage des équipements. |
| `/systeme/donnees` | Consultation | Navigateur des données historiques, filtres et exports ; rendu confirmé avec une réponse de page historique conforme. |
| `/systeme/journal` | Consultation | Journal actuel/historique, filtres, événements et pagination ; ne pas confondre lecture du journal et sauvegarde. |
| `/systeme/mails` | Hors activation | Écran de suivi observé ; aucun transport ni email activé pendant cette revue, conformément à la demande. |
| `/systeme/export` | Consultation | Export CSV/JSON du journal, avec périmètre annuel ; ne sauvegarde et ne restaure pas la base. |
| `/systeme/support` | Limité | Consultation des tickets et messages ; ouverture et traitement non activés. |
| `/academique` | Accueil | Parcours et liens du domaine académique selon les droits. |
| `/communication` | Accueil | Accès aux communications internes ; distinguer des articles du site. |
| `/logistique` | Accueil | Accès fournisseurs, achats et inventaire ; étapes affichées ne rendent pas le circuit d’achat opérationnel. |
| `/systeme` | Accueil | Accès aux données, journal et support ; liens selon permissions. |
| `/etudiants/ESCEN-TEST-001` | Parcours connecté | Identité, inscriptions, frais/versements, notes et documents ; changement d’onglet nécessaire avant les actions financières. |

## Authentification et adresses secondaires

| Page ou variante | Observation |
| --- | --- |
| `/connexion` | Champs email/mot de passe et erreurs ; normalisation, retour vers le lien demandé, limitation de tentatives et reprise du profil couverts par recette. |
| `/mot-de-passe-oublie` | Formulaire et rendu observés ; aucune livraison réelle d’email certifiée ou déclenchée. |
| `/mot-de-passe-reinitialiser` | Formulaire et erreurs du changement de mot de passe couverts ; ne prouve pas la livraison du lien. |
| `/mot-de-passe-modifier` | Changement obligatoire et blocage avant portail ; refus Auth et reprise vérifiés. |
| `/` | Redirection de connexion observée. |
| `/communication/actualites` | Ancienne adresse redirigée vers `/site-web/articles`. |
| URLs `?collection=…` | 14 variantes capturées. Dans le nouveau parcours Programmes, plusieurs paramètres historiques n’ouvrent plus directement un éditeur ; les formulaires passent par les boutons du parcours guidé. |

## Limites fonctionnelles maintenues

Les jurys et règles de passage, la nouvelle génération de cartes/certificats, le traitement du support, le circuit d’achat et la publication des annonces internes ne doivent pas être présentés comme terminés. Les candidatures reçues ne sont pas automatiquement converties en inscriptions ou comptes Auth. L’export du journal ne constitue pas une sauvegarde de la base. Ces limites sont constatées dans les composants actuels, pas seulement recopiées d’anciens rapports.

## Faux positifs et dette de recette

- Le premier dispositif responsive renvoie un catalogue pour toutes les requêtes `/api/history`, même lorsqu’une page `{records,total,offset,limit}` est attendue. Cela provoque une erreur React dans Personnel et Données. Ces deux pages se rendent avec une réponse de page conforme : ce n’est pas une panne confirmée de leurs données réelles.
- Le premier inventaire capture parfois les anciennes URLs d’évaluation avant la fin de leur redirection. Les scénarios dédiés vérifient correctement les redirections, la conservation des filtres et les onglets de session. Les vues vides transitoires de ce premier inventaire ne sont pas classées comme pages définitivement cassées.
- Des tests cherchent encore « Changer de dossier » au lieu de « Changer d’étudiant », ou « Ajouter une filière » directement sur l’écran guidé. D’autres ouvrent les actions financières avant de sélectionner « Frais et versements ». Ces échecs attestent une dette de recette ; ils ne démontrent pas à eux seuls l’indisponibilité de l’action.
- Les scénarios financiers réutilisent aussi des archives fictives dont les identifiants ne correspondent pas aux inscriptions de leurs fixtures. La recette complémentaire retire ces seules archives fictives pour exercer les écritures connectées. Les 18 scénarios de contre-opérations, affectations et reçus passent ensuite.
- Trois scénarios de déplacement d’épreuve utilisent les 20 et 21 octobre 2026 sans figer l’horloge : au 23 octobre, le gestionnaire réel renvoie 409 car l’épreuve est déjà ouverte. Le scénario de refus passe. Une date fixe passée ne démontre pas un défaut du déplacement d’une épreuve future.
- Le détecteur de débordement compte parfois le bouton CSV d’un `details` fermé. L’ouverture du menu Exporter a été contrôlée à 1024 et 1440 px : bouton contenu dans l’écran et absence de débordement de page. Ces alertes ne sont pas retenues comme défauts visuels.
- Des copies temporaires de certains tests adaptent uniquement cette navigation, en conservant leurs assertions métier. Les tests et composants existants n’ont pas été modifiés pour rendre la revue artificiellement verte.

## Résultats finaux

- Observation détaillée : **51 pages × 2 largeurs**, **78 ouvertures de fenêtres**, inventaire de **546 boutons visibles** et **390 liens** sur les deux passages. Ce sont des occurrences, pas autant d’actions distinctes.
- Capture consolidée : **72 entrées × 5 largeurs = 360 observations**. Les réponses historiques et les attentes de redirection du premier dispositif ont été corrigées uniquement dans la recette complémentaire. Les alertes du bouton CSV masqué ont été vérifiées contradictoirement ; aucun débordement de page n’a été confirmé dans les écrans capturés. Cela ne certifie pas tous les contenus et toutes les fenêtres possibles.
- Suite navigateur existante de 26 fichiers : **161 réussites, 39 échecs, aucun test ignoré**. Elle n’est donc pas verte et ne doit pas être annoncée comme telle.
- Complément avec navigation et archives fictives cohérentes : **34 scénarios réussis sur 34** (contextes individuels, projections financières, annulations/remboursements/avoirs, allocations, reçus, approbation de contrat et changement de groupe). Aucun composant produit n’a été modifié.
- Réactivation de formation annuelle à 390 px : premier échec sur assertion immédiatement après la confirmation, **répétition isolée réussie**. La première exécution reste conservée dans le rapport brut ; une fragilité temporelle de recette reste à traiter.
- Confirmations ciblées : deux liens 404, mauvais périmètre des archives d’articles, sélecteur de filières sous marketing, rendu Personnel/Données avec page historique conforme, menus d’export à 1024/1440 px.
- Contrôle final : `npx tsc --noEmit --incremental false` réussi (zéro erreur) ; `npm run lint` réussi (zéro erreur, deux avertissements préexistants : `site` et `_tab`). Les tests métier et PostgreSQL lancés juste avant cette revue sont réussis : 185 groupes PostgreSQL et 10 contrôles de régularisation enseignants. Aucun code métier n’a changé depuis.

### Répartition des 39 échecs de la suite existante

| Famille | Nombre | Qualification |
| --- | ---: | --- |
| Formations annuelles | 1 | Assertion immédiate après confirmation ; répétition isolée réussie. |
| CRUD des filières | 2 | Scénario antérieur au bouton d’entrée « Gérer les filières et leurs niveaux ». |
| Contexte individuel | 6 | Ancien libellé « Changer de dossier » ; les scénarios passent avec « Changer d’étudiant ». |
| Projections financières | 2 | Le test n’ouvre pas « Frais et versements » ; montants et export vérifiés dans le complément. |
| Contre-opérations | 7 | Navigation et archives fictives incohérentes ; sept scénarios réussis dans le complément. |
| Affectations financières | 6 | Même problème de recette ; six scénarios réussis dans le complément. |
| Reçus | 5 | Même problème de recette ; cinq scénarios réussis dans le complément. |
| Déplacement d’épreuve liée | 3 | Dates fixes désormais passées ; 409 de protection, aucune mutation. |
| Opérations étudiantes | 5 | Archives fictives sans inscription correspondante ; cinq scénarios réussis avec fixture isolée cohérente. |
| Fenêtres d’encaissement | 2 | Le test attend l’action financière dans l’onglet identité du dossier. Pas de nouveau défaut produit établi par ces deux échecs. |

Les premières recettes complémentaires, avant qualification des archives fictives, ont elles aussi échoué ; la réussite finale ci-dessus correspond à une exécution complète isolée des 34 scénarios. Les erreurs de lancement de Chrome dans le sandbox et la reprise après arrêt du premier serveur de capture sont des problèmes d’environnement, pas des résultats fonctionnels.

### Portée restante

La navigation générale a été observée principalement avec le rôle IT, les pages personnelles avec le rôle Étudiant. Les scénarios dédiés exercent notamment DG, DGA, DA, RAF, enseignant, logisticien, délégué et marketing. Toutes les combinaisons des 14 rôles, des périmètres, des données historiques et des années n’ont pas été exercées sur le Supabase distant. Une validation métier en production et une recette de restauration restent distinctes de cette observation des pages.


Le serveur de revue a été arrêté. L’ajout automatique du dossier de types Next dans `tsconfig.json` a été retiré ; ce fichier est identique à son état initial. Les modifications préexistantes sont conservées. Seul ce rapport est destiné au commit local ; les captures et scripts de recette restent dans `tmp/`.

Aucune correction visible n’a été appliquée. Les cinq propositions ci-dessus sont prêtes à être examinées avant modification, conformément au point d’arrêt du guide projet.

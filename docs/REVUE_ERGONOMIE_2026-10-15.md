# Revue visuelle et navigation — 15 octobre 2026

> Relevé initial. Les corrections et l’état actuel des parcours sont décrits dans [Parcours métier](PARCOURS_METIER_2026-10-15.md). Les constats ci-dessous sont conservés comme point de comparaison.

## Périmètre et méthode

Revue des 41 routes fonctionnelles, des quatre entrées de module et d’un dossier étudiant : **46 écrans du portail**, aux largeurs 390 et 1440 pixels. Les quatre écrans de connexion et de mot de passe sont également relevés. Les captures et textes des pages sont produits par `tests/ui/navigation-review.spec.ts` sous `.tmp/interface/`.

Les API sont remplacées par des fixtures locales authentifiées : un dossier étudiant, des comptes, des archives et des référentiels vides ou à compléter. Les nombres affichés ne décrivent donc pas la base distante. Cette revue vérifie les dispositions, les intitulés, les liens, les recherches et les états disponibles ; elle ne valide pas tous les workflows métier ou tous les rôles. Aucun enregistrement distant n’est modifié.

Le constat principal est structurel : la plateforme mélange des écrans de gestion, des écrans de consultation d’archives et des entrées de navigation. Une page peut porter le nom d’une activité alors qu’elle affiche une collection historique. La réussite technique des tests ne signifie pas que ce décalage est résolu.

## Corrections effectuées pendant la revue

- Remplacement de la longue barre de liens horizontaux par un sélecteur des pages autorisées de la rubrique. La page sélectionnée est toujours visible sur mobile.
- Déplacement de l’état de chargement des données et de son bouton d’actualisation après le contenu ; les erreurs et les chargements restent affichés avant celui-ci.
- Noms des liens de sous-menu issus du même catalogue que le fil d’Ariane. Titres des pages historiques stables lorsqu’on change de collection.
- Distinction entre accueil, vue d’ensemble et index des rapports. Les trois routes ne rendent plus le même écran.
- Accueil mobile présenté en raccourcis compacts, au lieu de grandes cartes empilées.
- Recherche étudiante immédiatement disponible ; filtres niveau/filière/groupe regroupés dans un panneau dépliable avec compteur des filtres actifs. Export traité comme action secondaire.
- Sélecteur de rôle sur la page de consultation des rôles sur mobile, pour atteindre les droits sans traverser les 14 cartes du catalogue.
- Pagination historique masquée lorsqu’il n’y a qu’une page ; fiches mobiles moins espacées.
- Historique du dossier étudiant titré en niveau 2, pour conserver un seul titre principal.
- Préchargement automatique des dossiers retiré des liens de l’annuaire : une ouverture intermittente a été observée sur ordinateur avec le préchargement actif. Après ce changement, le parcours complet concerné a réussi cinq exécutions consécutives.

Ces corrections portent sur l’ergonomie. Elles ne créent pas de publication persistante, de ticket, de délibération, de contrat ou de validation historique.

## Relevé page par page

« À reprendre » désigne un écart restant après les corrections communes ci-dessus.

| Page | Constat et suite |
| --- | --- |
| `/mon-espace` | Les grandes cartes rendaient l’accueil mobile très long. Raccourcis compactés. Les indicateurs restent des effectifs chargés et des volumes d’archives. |
| `/mon-espace/support` | Pour les rôles disposant des archives, l’écran expose les catégories de support, pas un parcours de demande d’aide. À reprendre : expliquer ce périmètre et concevoir le parcours réellement disponible. |
| `/mon-espace/annonces` | Publications et informations urgentes sont des collections séparées. À reprendre : lecture éditoriale des annonces plutôt qu’un navigateur générique de données. |
| `/mon-espace/documents` | En rôle Informaticien, le titre et le contenu concernent les cartes de tous les étudiants malgré l’intitulé personnel. À reprendre : distinguer espace personnel et outils d’administration. |
| `/mon-espace/scolarite` | En rôle Informaticien, écran personnel sans inscription dans le périmètre. À reprendre : rendre la destination pertinente selon l’identité connectée. |
| `/tableau-de-bord` | Affichait l’accueil. Corrigé : vue d’ensemble des volumes disponibles et des contrôles, sans répéter les raccourcis des modules. |
| `/tableau-de-bord/rapports` | Affichait également l’accueil. Corrigé : index des rapports et exports autorisés. Cela ne produit pas de nouveaux rapports consolidés. |
| `/academique/filieres` | Filières, parcours et matières réunis derrière un sélecteur de collection. À reprendre : expliquer les relations et guider la création dans le bon ordre. |
| `/academique/referentiel` | Sept collections de même importance apparente. À reprendre : organiser années/cycles/niveaux/groupes et sites/bâtiments/salles en deux ensembles compréhensibles. |
| `/academique/emploi-du-temps` | Présentation en liste d’archives, pas en calendrier. À reprendre : vue semaine/jour et filtres groupe/enseignant/salle, sans inventer les références absentes. |
| `/academique/presences` | Consultation des séances historiques. À reprendre : distinguer séance, feuille de présence et état de saisie. |
| `/academique/notes` | La lecture d’archives prend la place d’un écran centré sur groupe, enseignement et année. Titre stabilisé. À reprendre : filtres métier et contexte des évaluations. |
| `/academique/reclamations` | État vide correct dans les fixtures, mais cette revue ne démontre pas de traitement persistant des réclamations historiques. À reprendre : rendre explicite le périmètre de traitement. |
| `/academique/evaluations` | L’action de composition est accessible ; l’état vide emploie encore « examen » au lieu de « contrôle continu ». À reprendre : libellés et liens de préparation adaptés à la nature de l’épreuve. |
| `/academique/rattrapages` | Distinction de la seconde session visible. À reprendre : liens vers l’épreuve initiale et libellés des états vides, en conservant les références manquantes signalées. |
| `/academique/sujets` | Le menu indique « Composition des épreuves », la page commence par « Bibliothèque des sujets ». À reprendre : harmoniser le vocabulaire bibliothèque/composition et mieux distinguer versions, aperçu et corrigé. |
| `/academique/examens` | Sessions et copies accessibles ; « Composer une épreuve » et « Composer le sujet » se concurrencent. À reprendre : séparer clairement préparation d’un sujet et consultation d’une session. |
| `/academique/deliberations` | Le titre évoque délibérations et relevés, mais les données visibles sont des relevés historiques. À reprendre : annoncer les opérations disponibles sans suggérer une délibération active. |
| `/academique/parametres` | Écran d’attente de validation des règles. À reprendre : le présenter comme état d’avancement, pas comme un formulaire de paramètres déjà disponible. |
| `/etudiants` | Le formulaire de filtres repoussait la première fiche très bas sur mobile. Corrigé : recherche prioritaire et filtres avancés dépliables. Les colonnes financières indisponibles restent à alléger. |
| `/etudiants/comptes` | Les boutons de catégorie permettent de consulter le personnel depuis la route étudiante sans changer d’URL. À reprendre : refléter la catégorie dans la navigation et séparer compte de connexion et dossier. |
| `/etudiants/cartes` | La destination promet des cartes/certificats, mais affiche surtout les documents historiques et leur configuration. À reprendre : séparer émission des documents et consultation des pièces archivées. |
| `/etudiants/parcours` | Inscription et groupe sont consultables, pas un parcours opérationnel de réinscription. À reprendre : chronologie des années et décisions disponibles. |
| `/finance` | La situation financière ouvre une collection de frais, sans synthèse métier. À reprendre : définir les indicateurs à partir des seules relations vérifiées. |
| `/finance/versements` | Paiements, échéances et échéanciers sont des collections voisines sans parcours commun. À reprendre : lecture d’une transaction avec contexte, pièces et liens vérifiés. |
| `/finance/rapports` | Présentation proche de la liste de paiements. À reprendre : périodes, périmètre et rapports réellement calculables, sans inventer les allocations historiques. |
| `/finance/contrats` | Cinq collections de frais et bourses, sans distinction claire entre tarif, frais étudiant et contrat. À reprendre : organisation par objet métier et contexte étudiant. |
| `/personnel/utilisateurs` | Annuaire lisible mais titre de route initial différent du titre de page ; la catégorie peut changer sans changement d’URL. À reprendre : navigation cohérente entre comptes et dossiers. |
| `/personnel/roles` | Sur mobile, le catalogue des 14 rôles précédait les droits. Corrigé : sélection compacte du rôle ; le catalogue détaillé reste disponible sur ordinateur. |
| `/personnel/permissions` | Comparaison utile, mais matrice longue avec défilement horizontal sur mobile. À reprendre : synthèse des différences avant le détail et comparaison plus adaptée au petit écran. |
| `/personnel/enseignants` | Collection d’affectations historiques et profils, sans vue enseignant/groupes/enseignements unifiée. À reprendre : contexte et liens explicites. |
| `/personnel` | Gestion des dossiers distincte des comptes. À reprendre : rendre l’ouverture du dossier prioritaire et les actions d’archivage moins dominantes visuellement. |
| `/communication/annonces` | L’intitulé « Publier une annonce » débouche, pour les rôles d’archives, sur des données historiques en consultation. À reprendre en priorité : ne pas promettre une action absente. |
| `/communication/actualites` | Publications, urgences, albums, photos et commentaires sont présentés comme cinq collections équivalentes. À reprendre : fil de lecture et détail d’une publication. |
| `/logistique/achats` | Création repliée et suivi réunis dans la page ; état vide lisible. À reprendre : mieux distinguer nouvelle demande et suivi, puis indiquer le niveau de persistance disponible. |
| `/logistique/fournisseurs` | CRUD avec recherche et archives. À reprendre : retirer le bouton de collection unique et donner un état vide orienté vers l’ajout autorisé. |
| `/logistique/inventaire` | Même structure que les fournisseurs. À reprendre : filtres site/localisation/état et contextualisation des équipements. |
| `/systeme/donnees` | Le navigateur technique de collections est pertinent ici. À reprendre : séparer contrôle des anomalies et exploration générale ; conserver les sources et signalements. |
| `/systeme/journal` | Lecture du journal historique. À reprendre : filtres auteur/action/période et distinction entre audit actuel et archives. |
| `/systeme/export` | Répète largement le journal avec une seconde collection. À reprendre : indiquer clairement le périmètre de l’export, actuellement limité à la page consultée. |
| `/systeme/support` | Le « centre » affiche surtout des catégories de support historiques. À reprendre : distinguer paramétrage et traitement des demandes. |
| `/academique` | Douze cartes de même poids ; aucun regroupement par préparation, planning ou résultats. À reprendre : ordre et ensembles d’activités. |
| `/communication` | Deux entrées simples, mais celle de publication ne correspond pas au contenu historique pour tous les rôles. À reprendre avec la page d’annonces. |
| `/logistique` | Trois entrées identifiables. À reprendre : ajouter une courte description de chaque activité pour guider le premier usage. |
| `/systeme` | Quatre entrées identifiables. À reprendre : expliciter données, audit, export et support pour éviter leur confusion. |
| `/etudiants/[matricule]` | Formulaire civil puis historique très long, avec archivage visible dès le titre. Corrigé : un seul titre principal. À reprendre : consultation avant édition, sections du dossier et emplacement des actions sensibles. |

## Écrans d’accès

| Page | Point de contrôle |
| --- | --- |
| `/connexion` | Formulaire et liens d’aide identifiables. Un grand vide sépare le logo et le formulaire sur mobile : réduire cet espace, notamment quand le clavier est ouvert. |
| `/mot-de-passe-oublie` | Retour à la connexion accessible. Le texte évoque une demande d’aide alors que le bouton annonce l’envoi d’un lien : harmoniser l’explication. Aucun email envoyé pendant la revue. |
| `/mot-de-passe-reinitialiser` | Formulaire lisible ; titre sur plusieurs lignes et grand espace supérieur sur mobile. Aucun lien réel ni changement de mot de passe testé. |
| `/mot-de-passe-modifier` | Motif du changement obligatoire explicite ; grand espace supérieur sur mobile à réduire. Session de fixture, aucune modification réelle. |

## Priorités de la suite

1. Faire correspondre le nom d’une destination à ce qu’elle permet réellement : support, publication, documents, rapports et délibérations.
2. Donner une structure métier aux listes historiques : planning, notes, finance, affectations. Les sources restent immuables et les données manquantes restent signalées.
3. Structurer le dossier étudiant et les dossiers du personnel en lecture, édition et actions sensibles distinctes.
4. Organiser le module académique par activités et dépendances, plutôt qu’en douze entrées de même poids.

## Vérification reproductible

Le build utilisé pour les tests de navigateur doit disposer des deux variables publiques Supabase. En revue isolée, utiliser l’URL du projet attendue par `persistent-fixture.ts` et une clé publique factice ; les appels Auth et API sont interceptés. Aucune clé serveur n’est requise. Ne pas confondre ce build de vérification avec un déploiement configuré pour les utilisateurs.

- `npm run lint`
- `npm run build` (lancement direct de Next sous PowerShell lorsque le script POSIX n’est pas interprété)
- `node scripts/verify-workflows.cjs`
- `npm run test:ui -- tests/ui/navigation-review.spec.ts tests/ui/persistent-data.spec.ts`

`npm run test` inclut aussi les tests SQL. La dépendance locale `@electric-sql/pglite` est absente dans cet environnement ; cette partie ne constitue pas une validation acquise.

Résultats : lint, build et assertions des services métier réussis ; six tests de revue et de navigation réussis, sept tests CRUD réussis. La suite groupée avait 19 tests réussis sur 20 avant la correction du préchargement ; le parcours restant a ensuite été vérifié cinq fois avec succès. Les 50 captures par largeur et les relevés JSON restent sous `.tmp/interface/`.

# Statut fonctionnel ESCEN

Mise à jour : 15 octobre 2026.

## Phase actuelle

[Inscriptions et articles du site](INTERCONNEXION_SITE_LOCAL.md) : le formulaire en quatre étapes de la copie Nuxt envoie ses dossiers à la plateforme, avec reprise de brouillon, consentement, pièces privées et référence de réception. Le panneau « Inscriptions en ligne » permet la consultation et le suivi motivé ; les formations publiables sont configurées explicitement à partir des référentiels canoniques. « Actualités institutionnelles » permet de rédiger, publier et retirer les articles affichés par le site. Les migrations 22 et 23 sont appliquées. Aucun compte ni inscription académique officielle n’est créé par la réception. Le site original en production reste inchangé.

La [réorganisation pédagogique](ORGANISATION_PEDAGOGIE.md) sépare les contrôles continus, examens, rattrapages, sujets et notes. Les formulaires et détails de gestion utilisent une page centrale. Les références ne sont plus présentées deux fois après reprise. La composition des épreuves (parties, questions, QCM, barème, corrigé, aperçu et impression) enregistre des versions dans Supabase. La migration 21 est appliquée. Les sujets préparatoires restent en brouillon ; ils n’ouvrent pas automatiquement une session. Validation : lint, build, 31 groupes PostgreSQL, 18 tests navigateur et contrôle distant.

Les [CRUD persistants](CRUD_PERSISTANTS.md) sont branchés pour les étudiants, le personnel, dix référentiels académiques, l’inventaire et les fournisseurs. La migration 20 est appliquée. Les référentiels historiques peuvent être repris avec provenance avant modification, sans altérer les originaux. Les CRUD incluent des validations serveur, un contrôle de concurrence et un archivage motivé. Les anciens workflows de démonstration ne peuvent plus annoncer une écriture réelle via `runWorkflow`. Validation : lint, build, 30 groupes PostgreSQL, 14 tests navigateur et contrôle distant. Les autres workflows persistants restent à porter comme détaillé dans le document lié.

## Historique des étapes précédentes

Refonte de l’espace de gestion : navigation regroupée, accueil avec données réelles, annuaires séparés (145 comptes étudiants, 28 comptes du personnel). Les comptes `admin@test.com` et `support@neostart.tech` sont retirés des annuaires, leurs accès Auth bloqués et leurs attributions clôturées ; les traces historiques sont conservées. La consultation historique couvre 49 collections et 12 526 lignes métier. Les anomalies sont visibles, sans création de parents manquants. Les 18 migrations sont appliquées, la RLS reste fermée et les RPC réservées au serveur. Les modifications de comptes et des informations civiles sont persistantes ; les archives métier restent en lecture. Les 120 pièces retrouvées peuvent être téléchargées par lien privé temporaire ; 24 références sans fichier transféré sont signalées.

Validation de la refonte : lint, build de production isolé, tests métier, 26 groupes de contrôles PostgreSQL, préparateur de sauvegarde et cinq tests navigateur à 390 et 1440 px réussis. Captures de l’accueil mobile et ordinateur relues. Contrôles distants : deux comptes retirés et interdits d’accès, 173 comptes visibles, source de 15 566 lignes conservée, téléchargement privé vérifié et accès anonymes refusés.

Correction du chargement : les écrans chargent désormais les identités réelles via `/api/campus` après authentification. La migration additive `202610140015_it_full_platform_access.sql` synchronise les 42 permissions de l’Informaticien. Vérification distante : 145 dossiers étudiants et 175 comptes visibles pour ce rôle ; aucune inscription encore reprise. Les erreurs de chargement sont visibles et réessayables. Les données financières absentes ne sont pas présentées comme des soldes nuls. Les commandes métier restent en mémoire ; la reprise des autres domaines et leur projection complète restent à réaliser.

Validation de cette correction : `npm run lint`, `npm run test`, build de production isolé sous `.tmp/next-data-reviewed`, quatre tests `tests/ui/persistent-data.spec.ts` réussis à 390 et 1440 px (dossiers, annuaire, rechargement, finances inconnues, erreurs et changement de rôle). Captures `.tmp/interface/390/donnees-etudiants.png` et `.tmp/interface/1440/donnees-annuaire.png` ; capture mobile relue. `npm run db:verify:remote` confirme 15 migrations, les 42 permissions IT, les 15 566 lignes source conservées et le refus anonyme. Le filtre serveur et la projection ont été vérifiés sur les données réelles : 145 étudiants, 175 comptes, aucun identifiant Auth exposé.

Base et Supabase autorisés le 14 octobre : le [modèle relationnel corrigé](BASE_RELATIONNELLE_ESCEN.md) est déployé sur Espace Etudiant ESCEN (`zmxapemyktxhppdxenzb`), avec 14 migrations appliquées, 104 tables métier et 10 tables privées. Les 15 566 lignes source restent en staging distant ; 175 profils, 145 étudiants et 176 attributions de rôles ont été repris avec comptes désactivés, 264 diagnostics et 3 suggestions restent à traiter. Les quatre sauvegardes et 139 fichiers historiques sont transférés dans Storage privé. Les routes serveur exigent un compte Auth réellement attribué et filtrent les lectures. Aucun compte historique n’est lié à Auth ; le POST générique refuse les écritures jusqu’au portage des commandes. Les services de l'interface restent en mémoire : les limites front-end ci-dessous s'appliquent encore. La normalisation des dossiers historiques, les décisions métier manquantes et le branchement des écrans restent à terminer.

Les écrans utilisent encore l’état de démonstration en mémoire ; leur connexion à Supabase et leur persistance par domaine restent à réaliser. La plateforme ne doit pas être présentée comme opérationnelle avec des comptes de production.

Le guide interactif, son bouton d’aide, les surbrillances d’onboarding et les emojis décoratifs sont retirés. Les étapes visibles dans les notes décrivent uniquement leur état de traitement.

La [revue de lisibilité](REVUE_LISIBILITE.md) reprend les 35 pages : introductions répétées retirées, formulaires secondaires dépliables, compteurs et filtres compacts sur mobile, catalogue des rôles avec fiche directement accessible. Les listes affichent la filière étudiante, le nom du payeur, les modifications des accès et les inscriptions par année. Le planning utilise un seul tableau avec filtres et actions ; les règles et historiques restent consultables.

Correction de navigation du 14 octobre : la flèche déplie une rubrique sans changer de page ni fermer le panneau mobile. Le nom de la rubrique ouvre toujours sa première page ; choisir une sous-page ferme le panneau. La rubrique dépliée et la page active sont distinguées, et les menus restent filtrés par rôle.

Les modules et sous-écrans ont des routes Next.js distinctes, avec dossiers étudiants accessibles par matricule. `/connexion` vérifie des identifiants de démonstration, puis ouvre une session en mémoire. Les accès directs, retours du navigateur et menus respectent les autorisations simulées. La déconnexion ferme l’accès au portail. `/mot-de-passe-oublie` crée un ticket local sans envoyer d’email. Une page 404 traite les URL inconnues. Le logo fourni est intégré à la connexion, au portail et aux documents imprimables.

## Couverture

| Domaine | Parcours disponibles |
|---|---|
| Référentiel | Années avec ouverture et clôture, filières, parcours, niveaux LMD, semestres, UE, matières, groupes, enseignants et affectations. Dates, doublons et budgets de crédits contrôlés. |
| Étudiants | Création des dossiers inscrits, recherche, filtres, export CSV, modification des informations civiles et affectation à un groupe compatible. |
| Pièces | Dépôt JPEG, PNG ou PDF, limite de 5 Mo, contrôle de conformité avec motif et historique. Dépôt personnel limité à son dossier. |
| Documents | Carte d’étudiant et certificat utilisant l’année réelle ; relevés après décision de jury ; impression et enregistrement en PDF par le navigateur. Photo conforme utilisée pour la carte imprimée. |
| Parcours annuel | Réinscription dans une nouvelle année, conservation des inscriptions, groupes historiques, notes, décisions et créances. Abandon, suspension, reprise et diplôme avec motif. |
| Planning | Salles, capacité, conflits enseignant/groupe/salle, périodes bloquées, déplacement et annulation tracés, filtre par date et export CSV. |
| Présences | Appel par séance, enregistrement partagé, audit et restriction aux affectations de l’enseignant ou du surveillant. |
| Examens | Épreuves papier et en ligne, première session et rattrapage ; conflits, surveillant, émargement et résultats papier. Sujet autorisé par le DA, tentative personnelle chronométrée, remise et expiration, correction puis circuit de publication des notes. |
| Notes | Brouillon → saisie → soumission → contrôle → validation → publication. Notes de devoir, examen, projet, TP et rattrapage. Consultation personnelle après publication, export CSV et historique. |
| Réclamations | Dépôt personnel, analyse, transmission, avis enseignant, décision académique, correction avec ancienne/nouvelle valeur et clôture. Formulaires intégrés à la page. |
| Jury | Pondération contrôle continu/examen, seuils, compensation et budget semestriel configurables. Calcul des moyennes et crédits ; décision du DA avec motif et instantané des règles et notes. Export CSV et relevé imprimable. |
| Contrats | Scolarité annuelle, frais d’inscription et annexes ; bourse sur la scolarité ; révision motivée sans effacement des encaissements ; échéances et reliquat. |
| Versements | Montants entiers en FCFA, référence unique, versements partiels, reçu, solde par année et règlement d’une créance antérieure. Modes espèces, Mobile money, virement, chèque et carte. |
| Annulations financières | DG uniquement, motif obligatoire ; transaction, reçu et historique conservés, solde de l’année concernée recalculé. |
| Personnel | Annuaire filtrable, activation et changement de rôle motivés avec historique ; catalogue des 14 rôles et matrice comparative des droits ; dossiers permanents/vacataires/stagiaires et export CSV. |
| Logistique | Demande d’achat par les achats, approbation/refus DG ou RAF, réception par les achats. Inventaire par les achats ou le responsable de site. Exports CSV. |
| Communication | Diffusion générale, étudiants/délégués, enseignants ou surveillants. Date d’expiration facultative, retrait motivé sans suppression et historique de diffusion. Filtrage par audience dans le service mock et les espaces personnels. |
| Support et audit | Tickets personnels, prise en charge et résolution motivées par l’Informaticien ; journal d’activité et export JSON du journal. |
| Pilotage | Effectifs, abandons, semestres admis, recouvrement, synthèse par année et filière. Données calculées, sans indicateurs de démonstration inventés. |

## Politique métier de cette version

- Le DA ouvre et clôture les années, valide les règles de délibération et prend les décisions de jury.
- Le Logisticien crée les dossiers, groupes, affectations et séances, puis gère les réinscriptions et statuts courants. Il ne valide plus les notes.
- Le RAF gère contrats, bourses et versements. Le DG annule les paiements avec motif.
- Le DG attribue les rôles sensibles de direction, finance et administration technique ; l’Informaticien ne dispose d’aucun pouvoir financier ou académique.
- Les paramètres initiaux de calcul sont proposés avec `rulesApproved = false`. Une validation explicite du règlement est requise avant délibération.
- Un semestre doit posséder tous ses crédits et les notes de contrôle continu et d’examen publiées pour chaque matière avant décision.
- La compensation entre UE est optionnelle ; une note sous le seuil éliminatoire empêche la validation de l’UE. Le rattrapage conserve la meilleure moyenne entre la première session et sa note.
- Le passage au niveau suivant exige une admission pour les deux semestres de l’année précédente. Le même niveau reste disponible pour un redoublement.
- La déclaration de diplôme exige la dernière année du cycle et 180 crédits de licence ou 120 crédits de master dans les décisions conservées.

Ces choix sont des règles de fonctionnement de l’interface à confronter au règlement de l’établissement, et ne constituent pas une validation réglementaire ou une habilitation de diplôme.

## Parcours de contrôle

1. DG : ajouter un utilisateur de rôle Surveillant.
2. DA : créer une année, l’ouvrir, ajouter une filière, ses semestres, UE et matières.
3. Logisticien : créer un groupe, un enseignant, une affectation et un dossier étudiant ; créer une salle.
4. Logisticien ou DA : planifier un examen avec un surveillant. Surveillant : sélectionner son identité et saisir les présences de cette séance.
5. Enseignant : choisir son identité, créer les évaluations et soumettre les notes. DA : contrôler, valider et publier.
6. DA : approuver les règles pédagogiques, délibérer et éditer le relevé. Étudiant : consulter notes, relevé et documents personnels.
7. RAF : définir le contrat avec frais d’inscription et bourse, enregistrer un versement et éditer le reçu. DG : tester l’annulation motivée.
8. Logisticien : réinscrire dans une nouvelle année compatible et vérifier l’historique. RAF : régler une créance de l’ancienne année sans modifier le nouveau contrat.
9. Étudiant : déposer une pièce et une réclamation. DA/Logisticien : vérifier la pièce ; Enseignant/DA : traiter la réclamation.
10. Achats, RAF/DG et Site : demander, décider, réceptionner et suivre l’inventaire.
11. Marketing : diffuser une annonce ciblée. Informaticien : traiter un ticket et exporter le journal.

## Vérifications et limites

Vérification du 14 octobre 2026 : `npm run test`, `npm run lint` et `ESCEN_BUILD_DIR=.next-verification npm run build` passent. Les 27 tests navigateur passent sur ce build de production (3 minutes), dont les examens papier et en ligne à 390 et 1440 px, les pages autorisées des 14 rôles à 320, 640, 768, 1024 et 1440 px, ainsi que les parcours métier complets. Résultats : `.tmp/ui-results/` ; captures : `.tmp/interface/`. La capture de correction des examens à 390 px a été relue. Chrome a nécessité une exécution hors du sandbox ; l’échec initial au lancement du navigateur ne concernait pas l’application.

La [revue page par page](REVUE_PAGE_PAR_PAGE.md) détaille désormais les 35 pages du portail, les autres routes, les actions exercées et les limites. Lint, build et tests métier passent ; les 22 tests navigateur passent sur le build de production, avec relevés individuels à 390 et 1440 px et contrôle des 14 rôles aux quatre tailles. La nouvelle [revue du portail de référence](reference-escen/REVUE_PERSONNEL_2026-10-13.md) documente les 53 pages consultées et les améliorations Personnel : annuaire, changement de rôle audité, catalogue et matrice reposant sur les droits réellement appliqués dans les services mock. Résultats après la revue de lisibilité : `.tmp/clarity-final-results/` (22 réussites, 5,5 minutes).

La revue transversale couvre les pages autorisées des 14 rôles à 320, 768, 1024 et 1440 px : erreurs JavaScript, débordements, libellés des champs et explications des tableaux vides. Le parcours des annonces vérifie également la diffusion ciblée, la visibilité pour les étudiants et délégués, le refus pour les enseignants et le retrait conservé avec motif, à 320 et 1440 px. Les assertions du service contrôlent les dates invalides, l’expiration après la date incluse, les permissions de retrait et la conservation du contenu et de l’historique.

Les assertions de services, le lint et le build vérifient les parcours et les types. La suite Playwright couvre les menus des 14 rôles, l’absence de guide/emoji, un parcours métier complet et la navigation/recherche à 390 px. Les résultats d’exécution doivent être distingués de la couverture déclarée par les tests.

Vérification précédente du 13 octobre 2026 : `npm run lint`, `npm run test` et `npm run build` avec `ESCEN_BUILD_DIR=.next-verification` passent. Les 17 tests navigateur passent sur ce build de production (4,3 minutes), avec Chrome : pages autorisées des 14 rôles aux quatre tailles, parcours métier à 390 et 1440 px, annonces ciblées et retrait conservé, connexion/déconnexion, refus d’accès, historique du navigateur, recherche et navigation au clavier. Les captures des annonces à 320 px et du contrat financier à 390 px ont été relues. Résultats Playwright : `.tmp/final-ui-results/` ; captures : `.tmp/interface/`.

Les premières exécutions sur le serveur de développement ont été interrompues par des redémarrages automatiques à son seuil de mémoire pendant la compilation à la demande. Elles ne constituent pas une validation. Le résultat final ci-dessus provient du serveur de production isolé. Le test transversal attend aussi la redirection après un changement de rôle avant d’ouvrir le menu mobile.

Le backend, l’authentification, le stockage des fichiers, les sauvegardes/restaurations de données et les contrôles de permissions côté serveur restent à intégrer après validation du front. L’export du journal ne sauvegarde pas les dossiers. Mobile money est un mode de comptabilisation d’un versement déjà reçu, sans appel à un opérateur de paiement.

L’admission/CRM et le portail public restent hors périmètre. Les transferts de crédits externes, diplômes nationaux, paie complète et comptabilité générale nécessitent des parcours spécifiques avant d’être considérés comme couverts.

## Contexte annuel connecté — 15 octobre 2026

Les pages Notes et résultats, Délibérations et relevés et Documents étudiants commencent par le choix d’un dossier étudiant. Les listes, détails et exports sont ensuite limités à ce dossier et au contexte annuel existant, aussi bien dans les archives que dans les données actuelles. Les relations passent par les inscriptions, candidats, notes et décisions réelles ; un dossier sans archive reliée affiche cette absence sans présenter toutes les archives. Les types de pièces et exigences partagés ne sont plus mélangés aux documents personnels. La consultation technique transversale reste dans Données et contrôle de reprise, pour les rôles autorisés. Recette mobile et ordinateur : `npm run test:ui -- tests/ui/document-context.spec.ts`.

Le sélecteur « Année » distingue la consultation personnelle et l’année de travail institutionnelle. Les routes serveur filtrent les données annuelles selon les relations réelles et les droits existants. Ouverture, désignation et clôture sont persistantes, motivées, auditées et protégées contre les modifications concurrentes. Les campagnes du site et leurs dossiers conservent leur année. Aucune année officielle n’est choisie automatiquement ; les archives sans rattachement confirmé restent accessibles en consultation globale aux rôles autorisés. Les autres workflows historiques ne deviennent pas persistants par cette évolution. Voir [les règles et limites](ANNEE_DE_TRAVAIL.md).

## Revue comparative des parcours — 15 octobre 2026

La [revue du portail de référence](reference-escen/REVUE_PARCOURS_2026-10-15.md) couvre ses 53 destinations de menu, des formulaires et fiches représentatives. Elle confirme que les navigateurs de collections actuels ne remplacent pas les parcours pédagogiques, documentaires et financiers. Le choix individuel d’un étudiant reste insuffisant pour traiter les notes d’un groupe et les relevés d’un semestre. La refonte de ces parcours reste à réaliser ; les tests existants ne la certifient pas. Le mélange des collections dans les onglets du dossier étudiant a été corrigé et fait l’objet d’un test navigateur dédié.

## Année scolaire obligatoire pour les activités — migration 24

Les racines métier de communication, support, achats, mouvements, sujets, documents et articles portent désormais une année ; les données dérivées suivent leurs parents réels. Les dossiers sans inscription annuelle et les éléments dont l’année est inconnue sont conservés mais exclus d’une vue annuelle. Sans année de travail configurée, l’interface demande une année au lieu de montrer toutes les activités implicitement. Une consultation transversale reste explicite ; les écritures de sujets et du site exigent une année précise. Les identités et catalogues communs restent partagés. Voir `ANNEE_DE_TRAVAIL.md`. Cette évolution ne réalise pas les écritures métier encore en consultation.

## Liste de réinscription par année cible

La page Réinscriptions compare les inscriptions de l’année immédiatement précédente avec celles de l’année sélectionnée. Seuls les étudiants présents l’année précédente et sans inscription cible sont proposés ; les correspondances historiques exactes sont utilisées uniquement pour les rôles autorisés aux archives. Une année précédente absente ou ambiguë empêche le calcul, sans substitution par une année plus ancienne. La liste utilise une route serveur dédiée pour examiner les deux années avec les droits du compte, indépendamment du filtre du campus cible. Aucune écriture de réinscription n’est activée par ce changement. Tests : `npm run test` et `npm run test:ui -- tests/ui/reenrollment.spec.ts`.

## Chargements et enregistrements visibles

Un composant partagé affiche une animation, un libellé explicite et des lignes de préparation pendant les chargements des dossiers, référentiels, personnel, finances, planning, examens, copies, archives, sujets, réinscriptions, articles et inscriptions du site. Les animations respectent la préférence de réduction des mouvements. Les formulaires avec relecture et les pages de saisie signalent l’enregistrement en cours ; les champs partagés sont désactivés pendant la requête. Les erreurs de lecture des articles sont séparées de la liste vide et proposent une reprise ; les réponses annulées ne remplacent plus la nouvelle consultation du site. Après une mutation de référentiel, le contexte partagé et les archives sont actualisés. Les écritures métier encore indisponibles restent en consultation : ce travail ne les active pas. Recette : `npm run test:ui -- tests/ui/loading-feedback.spec.ts tests/ui/crud.spec.ts tests/ui/persistent-data.spec.ts tests/ui/website-exchange.spec.ts`.

## Dossiers sans multiplication des pages

La liste Étudiants et les candidats à la réinscription ouvrent leur dossier dans une fenêtre latérale, sans navigation ni perte des filtres. Les détails d’archives utilisent également cette présentation. La fiche directe reste accessible pour les liens existants. Si le dossier ne figure pas dans le campus de l’année cible, une route serveur charge ses informations civiles après contrôle des droits et filtre ses données annuelles ; l’absence dans la liste cible ne constitue plus à elle seule une erreur d’accès. Les fenêtres demandent confirmation avant abandon de saisie et bloquent la fermeture pendant les enregistrements partagés. Test : `npm run test:ui -- tests/ui/student-dialog.spec.ts`.

## Situation du dossier étudiant

La fiche distingue l’inscription officielle annuelle, les références historiques et les montants financiers établis. Un statut Réinscrit exige une inscription annuelle enregistrée ; un paiement ne constitue pas une réinscription. En l’absence de reprise financière vérifiée, les montants restent non établis et ne sont pas affichés comme zéro. La lecture serveur conserve le lien d’identité historique exact même lorsque l’étudiant ne possède pas d’inscription dans l’année cible ; les relations pédagogiques consultées restent filtrées par année. La réinscription et l’encaissement connectés restent à implémenter, et cette limite est indiquée dans la fiche.

## Commandes dans le dossier étudiant

Une inscription officielle dans l’année sélectionnée permet désormais un versement connecté (permission `payment.record`) et un changement de statut limité à suspension, abandon ou reprise (permission `student.lifecycle.manage`). La route serveur contrôle le dossier, les permissions et l’année, puis utilise la transaction existante avec révision concurrente : paiement et reçu sont atomiques ; changement de statut et événement motivé sont atomiques. Les anciens paiements sont conservés. Le montant présenté dans ce panneau est la somme des versements enregistrés non annulés, sans prétendre constituer le solde d’un contrat ni la reprise de tous les versements historiques. Les commandes refusent les dossiers sans inscription canonique cible. La reprise des inscriptions historiques, la réinscription, l’approbation des contrats, les allocations et la génération imprimable du reçu restent des parcours distincts à terminer. Aucune de ces opérations n’a été exécutée sur un dossier réel pendant la validation. Tests : `npm run test:ui -- tests/ui/student-operations.spec.ts`.

## Configuration annuelle des frais et matières

Tarifs annuels persistants pour scolarité et inscription, communs ou propres à une filière et éventuellement à un niveau. Les contrats et bourses restent dans une vue distincte. Les matières créées portent une année et leur code peut être réutilisé dans une autre année ; les maquettes refusent les matières rattachées à une autre année d’offre. Les anciens catalogues sans année ne sont pas arbitrairement réaffectés. Les examens et notes suivent déjà leurs offres et inscriptions annuelles. Cette configuration ne crée pas les maquettes/offres manquantes ni les contrats et ne choisit pas automatiquement entre des tarifs concurrents. Migration 26 ; recette `tests/ui/annual-configuration.spec.ts`.

## Préparation avant ouverture et distinction des inscriptions

Le référentiel annuel possède un contrôle de préparation avec liens de configuration. Les paramètres peuvent être saisis dans une année en brouillon ; l’ouverture via le serveur exige offres annuelles, groupes reliés, matières, frais et modes/caisses de paiement. Deux commandes séparées gèrent nouvelle inscription et réinscription. Elles créent atomiquement l’inscription annuelle, le groupe, l’événement motivé et un contrat en brouillon contenant les tarifs choisis. Les dossiers historiques ne sont jamais présentés comme de nouveaux entrants. L’ancien étudiant dont l’inscription précédente n’est pas encore reprise reste bloqué avec une indication explicite. La promotion/changement de filière, l’approbation des contrats et les allocations financières restent à terminer ; le nouveau parcours ne les simule pas. Voir `ANNEE_DE_TRAVAIL.md`. Recette : `tests/ui/year-preparation.spec.ts`, services de préparation et assertions SQL en brouillon.

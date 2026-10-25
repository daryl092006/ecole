# Comparaison fonctionnelle globale ESCEN — 25 octobre 2026

## Périmètre

La demande concerne toute l’application : reprendre les fonctions et les parcours utiles du site de référence, pas seulement son apparence ni les examens. Ce document remplace comme état de travail les conclusions devenues obsolètes du rapport du 15 octobre ; les anciens rapports sont conservés.

Référence : https://escendemo.neostart.tech/. Les 53 destinations distinctes du menu ont été consultées avec le compte Informaticien autorisé. Les captures `review-00` à `review-52`, sauf `04` et `31` remplacées par `04-profil` et `31-roles`, en constituent la preuve locale dans `tmp/screenshots/reference-demo-2026-10-25/`. Des formulaires et détails ont été approfondis : inscription, candidature, personnel, enseignant, étudiant, tarifs et examens. Les captures contiennent des données personnelles et ne sont pas jointes au dépôt.

Aucune écriture métier n’est effectuée sur la référence. Une interface observée ne prouve ni sa sauvegarde ni les droits d’autres comptes. Les fonctions locales sont vérifiées dans les composants montés, leurs API et leurs services ; les tables et anciens composants isolés ne sont pas comptés comme parcours opérationnels. La recette d’ouverture locale ne remplace pas les tests d’écriture de chaque métier.

## Bilan par domaine

| Domaine | Bon parcours observé sur la référence | Ce qui est réellement présent ici | Écarts et adaptation à terminer |
| --- | --- | --- | --- |
| Accueil et pilotage | Indicateurs et accès par domaine ; tableaux de bord distincts finance/candidatures/communication | `WorkspaceHome`, indicateurs selon rôle et données accessibles, `FinanceOverview` | Approfondir le pilotage admissions et communication ; distinguer zéro réel, donnée inconnue et erreur. Ne pas inventer de chiffres. |
| Dossier étudiant | Recherche niveau/filière/groupe, fiche et onglets, inscription avec identité/contact/tuteurs/cursus | Liste et filtres, création du dossier civil, fiche annuelle, inscription/réinscription connectées | Import guidé avec prévisualisation non repéré dans le parcours courant ; liaison admission → inscription à fiabiliser ; ne pas confondre création civile et inscription. |
| Candidatures | Dépôt en étapes, dossiers incomplets, étude, admissibles/admis et inscription finale | Site public et brouillons persistants ; pièces, offres, consultation et suivi RECU/EN_ANALYSE/CLASSE ; conversion montée | La conversion fait encore deux écritures : création de l’étudiant puis classement. Risque de résultat partiel et de doublon à la reprise. Les files de décision de la référence n’ont pas toutes une équivalence locale. |
| Réinscription et statuts | Recherche de l’étudiant, nouvelle année/classe, reprise des bourses et affichage des frais | `ReenrollmentWorkspace`, candidats de l’année précédente, `EnrollmentDialog`, changements de statut tracés | Séparer réinscription administrative et décision de passage académique ; aucune promotion automatique sans règlement approuvé. |
| Programmes et référentiels | Filière/niveau/semestre/matière, groupes reliés aux formations | `ProgramsCoursesWorkspace`, préparation de l’année, affectations, archivage contrôlé | Vérifier toutes les continuités groupe → matière → enseignant → séance ; les catalogues techniques ne doivent pas devenir l’entrée principale du travail quotidien. |
| Emploi du temps et présence | Calendrier, recherche par groupe, export par groupe/type/période | Planning connecté avec conflits et périodes bloquées, vues responsives, saisie de présences et traitement des justificatifs | Export PDF/Excel du planning à comparer précisément ; affectation des surveillants d’examens non montée. Ne pas remplacer les conflits serveur par une simple sélection visuelle. |
| Examens et notes | Programmation, anonymat, constructeur, copies, correction par question et publication | Création et candidats, sujet versionné, composition persistante, lecture des copies, note globale et circuit de validation | Correction détaillée, anonymat, surveillants, échéance de correction et publication distincte du calendrier. Voir le rapport d’examens dédié, qui n’est qu’une partie de cette comparaison. |
| Réclamations académiques | Liste filtrable par étudiant/matière et statut | `ComplaintsPanel`, dépôt et circuit connecté, correction motivée de la note publiée | Vérifier les accès depuis l’évaluation et le dossier ; ne pas remplacer ce parcours actif par une indisponibilité générale. |
| Relevés et jurys | Préparation par année/groupe/semestre, sélection, génération et liste des documents | Consultation des jurys/décisions enregistrés ; lecture/impression de relevés déjà conservés via API | Préparation et émission nouvelles restent incomplètes. Modèle officiel et règles de décision requis ; ne pas calculer compensation/passage avec des valeurs proposées. |
| Pièces et cartes étudiantes | Album du dossier, relevés distincts, génération de cartes en lot avec filtres et aperçu | Dépôt/remplacement/vérification des pièces et liens privés, tests PostgreSQL et navigateur réussis, commit local `3c20236` ; consultation des documents émis préservée | La génération officielle des cartes/certificats est distincte et nécessite son modèle approuvé. Ne pas appeler une pièce justificative une carte générée. |
| Tarifs institutionnels | Tarifs par année/niveau/filière/mode, frais d’inscription séparés, duplication d’année | Paramètres annuels dans la préparation de l’année, tarifs lus par l’inscription ; contrats/bourses consultables dans `AnnualFeesWorkspace` | L’écran Contrats n’est pas un éditeur complet des tarifs ni un circuit d’attribution de bourse. Rendre la configuration annuelle plus directement accessible et recetter les critères de sélection. |
| Encaissement et contrats | Indicateurs attendus/encaissés/restants, frais et bourses contextualisés | Inscriptions et contrats, échéances, encaissement depuis dossier, reçus et contre-opérations via les opérations étudiant | Améliorer les transitions entre tarif → inscription → contrat → paiement → reçu ; ne pas déclarer la finance absente sur la base de l’ancien rapport. Les PENDING et annulations restent exclus de l’encaissé. |
| Personnel et enseignants | Listes et formulaires distincts ; enseignant avec informations fiscales/professionnelles et justificatifs | `PersonnelDossiers`, dossiers et fonctions historisées, profils enseignants et affectations connectés | Documents professionnels et toutes les informations fiscales de la référence non couverts par le formulaire courant ; compte de connexion séparé du dossier. |
| Comptes, rôles et permissions | Annuaire, création, rôles, matrice et réinitialisation d’accès | Gestion de comptes existants : rôle, activation, désactivation, retrait ; catalogue et matrice | Nouveau provisionnement Auth et création d’accès non montés. Créer un enseignant n’accorde pas automatiquement un accès. Ne pas assimiler un compte activé sans identité Auth à un accès utilisable. |
| Annonces internes | Annonce, audience, bibliothèque/fil d’activité | `CommunicationsWorkspace`, brouillons, audiences, publication/retrait et consultation connectés | Pièces jointes et accusés de lecture non ajoutés dans ce lot. Séparer annonce interne et article public. |
| Site public et recrutement | Articles, messages, prospects/brochures, informations urgentes, partenaires, newsletter, galerie | Articles publiables, offres et candidatures publiques, brochures ; lecture de certaines données historiques | Pas d’équivalence montée complète pour messagerie de contact, qualification des prospects, newsletter, galerie et partenaires. Un écran historique ne vaut pas traitement ou publication connecté. |
| Support | Tickets, états, échanges et suivi | `SupportWorkspace`, création, échanges, prise en charge et résolution persistantes, tests de permissions et concurrence | Ne pas annoncer ce module absent. Les transitions historiques WAITING/CLOSED ne sont pas transformées arbitrairement en nouveaux circuits. |
| Paramètres de l’école | Identité/logo/contacts, direction des études, options pédagogiques et candidatures ; catalogues | Référentiels métier et préparation de l’année, catalogues de pièces/offres | Pas d’écran équivalent complet de configuration institutionnelle. Champs obligatoires, moyens de connaissance et types de diplôme de la référence ne sont pas tous administrables dans le parcours local. |
| Journal et sauvegardes | Journal filtrable et sauvegardes SQL/ZIP séparées | `AuditJournalPanel`, consultation/export réel ; suivi de mails distinct | `/systeme/export` est un export du journal, pas une sauvegarde/restauration de base. Aucun parcours de restauration monté repéré. Ne pas exposer des téléchargements de base à des rôles métier sans politique approuvée. |
| Achats et matériel | Pas de rubrique d’achat comparable repérée parmi les 53 entrées du menu autorisé | `PurchasesWorkspace`, création/approbation/refus/réceptions ; fournisseurs/inventaire séparés | Préserver ce périmètre local utile. Une réception ne déclenche pas automatiquement un règlement ni un mouvement de stock. L’absence de menu dans la référence ne prouve pas l’absence du métier dans l’école. |

## Priorités de réalisation transversales

1. **Continuité des dossiers** : candidature → admission atomique → dossier → inscription annuelle → contrat, sans double création lors d’une reprise.
2. **Accès utilisables** : dossier personnel/enseignant/étudiant → compte préparé → identité de connexion → rôle et périmètre ; distinguer activation et provisionnement.
3. **Documents** : le lot de pièces privées est désormais enregistré localement ; définir ensuite les modèles et conditions d’émission des cartes/certificats/relevés officiels.
4. **Opérations quotidiennes** : préparer/corriger les examens, retrouver une présence depuis la séance, un paiement depuis le contrat, une réclamation depuis la note ; terminer les transitions, pas seulement ajouter des listes.
5. **Communication et administration** : traiter les messages/prospects, séparer les publications et audiences, compléter les paramètres institutionnels et distinguer export/audit/sauvegarde.

Les décisions de jury, règles de passage/compensation et nouveaux modèles officiels restent soumis aux décisions de l’établissement. La référence aide à concevoir un parcours ; elle ne constitue pas une approbation de ces règles.

## Preuves et contrôles

- Référence : captures des 53 destinations et formulaires complémentaires ; aucune validation métier distante.
- Application locale : revue navigateur des 56 routes/contextes, sous-onglets et fenêtres repérés, à 390 et 1440 px avec `tests/ui/global-reference-review.config.ts` : 169 états mobile et 164 états ordinateur, soit 333 états, sans échec lors des passages finaux. Entrée et page introuvable également vérifiées. Cela ne couvre pas chaque enregistrement ni toutes les combinaisons de filtres ou d’autorisations.
- Le premier passage ordinateur a rencontré une expiration de navigation de 15 secondes sur `/mon-espace`, pendant les contrôles parallèles. La navigation de l’audit attend désormais le DOM avec 45 secondes maximum, puis conserve tous les contrôles de disponibilité, erreurs et géométrie. Le passage ordinateur complet a ensuite réussi.
- Vérifications du lot de pièces : trois tests dédiés réussis et contrôle PostgreSQL supplémentaire de réponse perdue après commit ; `npm test` réussi avec 185 groupes PostgreSQL et 10 contrôles de régularisation enseignants. TypeScript et ESLint sans erreur, deux avertissements préexistants.
- La fixture de cette revue inclut maintenant les pièces étudiantes, en lecture seule. Les écritures inattendues y sont refusées.
- Le rapport des examens est conservé dans `docs/COMPARAISON_EXAMENS_REFERENCE_2026-10-25.md`, et non utilisé comme bilan de toute l’application.
- Le détail étudiant ciblé lors de cette nouvelle lecture distante n’a pas fourni de contenu exploitable. L’organisation de ses onglets est connue du rapport précédent, mais n’est pas annoncée comme revalidée par cette capture vide.
- Les erreurs HTTP 500 relevées sur des paramètres de la référence et les appels de licence d’un éditeur tiers bloqués par notre inspection ne constituent pas une preuve d’absence de données métier. Aucun enregistrement n’a été tenté pour les contourner.

L’inventaire ci-dessous relie chaque entrée de la référence à son équivalent ou à un écart local. « Consulté » décrit l’observation de l’écran, pas le succès de ses écritures.

## Inventaire des 53 destinations de référence

| N° | Destination de référence consultée | Équivalent local | Constat |
| --- | --- | --- | --- |
| 1 | / | /tableau-de-bord | Pilotage connecté selon rôle |
| 2 | /actualites | /site-web/articles · /communication/annonces | Article public et annonce interne distincts |
| 3 | /annonces | /communication/annonces · /mon-espace/annonces | Brouillon, audiences, publication et retrait connectés |
| 4 | /emploi-du-temps | /academique/emploi-du-temps | Planning connecté |
| 5 | /profile/info | Aucun écran personnel équivalent dédié repéré | Profil de session et annuaire ne remplacent pas une fiche personnelle |
| 6 | /reclamations | /academique/reclamations | Circuit connecté |
| 7 | /evaluations/professeur/mes-examens | /academique/examens · /academique/sujets | Préparation et correction détaillée encore partielles |
| 8 | /emploi-du-temps/exporter | /academique/emploi-du-temps | Export groupe/type/période à compléter ou recetter |
| 9 | /filieres/liste | /academique/filieres | Programme relié aux formations |
| 10 | /uvs/liste | /academique/filieres | Matières contextualisées |
| 11 | /evaluations/liste | /academique/examens | Parcours partiel ; rapport examens dédié |
| 12 | /salles | /academique/referentiel | Catalogue des salles et planning |
| 13 | /groupes | /academique/referentiel | Groupes et offres de formation |
| 14 | /admin/jours-feries | /academique/emploi-du-temps | Périodes bloquées ; pas de duplication automatique des règles de la référence |
| 15 | /admin/liste-des-etudiants | /etudiants | Dossiers, filtres et inscriptions connectés |
| 16 | /admin/releves-globaux | /academique/deliberations | Nouvelle émission et décisions incomplètes |
| 17 | /admin/liste-des-releves | /academique/deliberations · dossier étudiant | Consultation/impression de relevés conservés |
| 18 | /admin/etudiants/cartes | /etudiants/cartes | Pièces privées en chantier ; génération officielle des cartes distincte |
| 19 | /admin/etudiants/abandons | /etudiants/parcours | Statuts et réinscriptions ; aucune promotion automatique |
| 20 | /finance/dashboard | /finance | Situation financière connectée aux projections |
| 21 | /frais-de-scolarite/liste | Préparation de l’année · inscription | Tarifs lus par inscription ; consultation contrats séparée |
| 22 | /frais-inscription/liste-des-frais-inscription | Préparation de l’année · inscription | Tarifs d’inscription annuels ; pas une page de contrats |
| 23 | /bourses/liste | /finance/contrats | Bourses et attributions consultables ; circuit complet à finir |
| 24 | /candidatures/dashboard | /site-web/demandes | Pas de tableau de pilotage recrutement équivalent complet |
| 25 | /admin/candidatures/inscription | Site public · /site-web/demandes | Dépôt en étapes et suivi administratif |
| 26 | /candidatures/etude-dossier | /site-web/demandes | Étude et statut ; conversion non atomique à corriger |
| 27 | /candidatures/dossiers-incomplets | /site-web/demandes | Pas de file complète de relance équivalente montée |
| 28 | /candidatures/admis | /site-web/demandes · /etudiants | Admission puis inscription ; continuité à fiabiliser |
| 29 | /admin/etudiants/reinscription | /etudiants/parcours | Réinscription annuelle connectée |
| 30 | /personnel/utilisateurs | /personnel · /personnel/utilisateurs | Dossier civil distinct du compte de connexion |
| 31 | /personnel/enseignants | /personnel/enseignants · /personnel | Profils et affectations ; documents professionnels incomplets |
| 32 | /roles/liste | /personnel/roles · /personnel/permissions | Catalogue et matrice ; gestion des comptes existants |
| 33 | /journal-activite/liste | /systeme/journal | Journal authentifié et filtré |
| 34 | /sauvegardes/liste | Aucune sauvegarde/restauration équivalente montée | /systeme/export exporte le journal |
| 35 | /admin/communications/dashboard | /communication · /tableau-de-bord | Pilotage de communication partiel |
| 36 | /admin/communications | /communication/annonces | Annonces internes connectées ; pièces jointes non ajoutées |
| 37 | /messages | Aucune messagerie de contacts équivalente montée | Ne pas confondre suivi des mails et messagerie métier |
| 38 | /admin/prospects | /site-web/brochures | Brochures disponibles ; qualification des prospects à finir |
| 39 | /publications/liste | /site-web/articles | Publication d’articles connectée |
| 40 | /info-urgente/liste | /communication/annonces · /site-web/articles | Pas de circuit spécifique complet d’information urgente |
| 41 | /partenaires/liste | Aucun écran de gestion équivalent repéré | Contenu public ne prouve pas une gestion de partenaires |
| 42 | /communications/newsletter | Aucun circuit newsletter équivalent monté | Ne pas annoncer une campagne ou un envoi disponible |
| 43 | /galerie | Aucun écran de gestion équivalent repéré | Consultation d’archives éventuelle distincte de publication |
| 44 | /support/ticket | /systeme/support · /mon-espace/support | Tickets, échanges, prise en charge et résolution connectés |
| 45 | /parametre/liste | Référentiels et préparation de l’année | Configuration institutionnelle complète manquante |
| 46 | /parametre/mon-activite | /systeme/journal | Journal autorisé ; rubrique personnelle distincte à préciser |
| 47 | /annee-scolaire/liste | /academique/referentiel | Année de travail, préparation et clôture selon permissions |
| 48 | /periodes/liste/ | /academique/referentiel · /academique/filieres | Semestres et programme reliés |
| 49 | /parametre/niveaux | /academique/referentiel | Niveaux et offres |
| 50 | /parametre/champs-obligatoires | /site-web/documents | Pièces exigées par formation ; champs civils dynamiques non équivalents |
| 51 | /parametre/types-diplome | Aucun éditeur de catalogue équivalent repéré | À distinguer des diplômes officiels émis |
| 52 | /parametre/moyens-connaissance | Aucun éditeur équivalent repéré | Acquisition/recrutement à compléter |
| 53 | /parametre/types-documents | /site-web/documents · /academique/referentiel | Types de pièces, exigences et dépôts distincts |

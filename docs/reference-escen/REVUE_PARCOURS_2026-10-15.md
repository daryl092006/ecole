# Revue du portail ESCEN et comparaison des parcours

Date : 15 octobre 2026. Référence : [portail de démonstration ESCEN](https://escendemo.neostart.tech/). Revue réalisée avec le compte fourni, rôle Informaticien.

## Résultat

Le problème de notre interface est structurel : plusieurs pages présentent les collections de la base plutôt que le travail à effectuer. Ajouter un filtre ou demander partout un étudiant ne suffit pas. La consultation individuelle et le traitement pédagogique d’un groupe sont deux entrées nécessaires. Les anciens rapports et tests ne prouvent pas que ces parcours sont correctement organisés.

## Étendue et limites

Les 53 destinations distinctes du menu ont été ouvertes et capturées. Une seconde lecture séquentielle avec la navigation interne a permis de charger les listes réelles après les premiers échecs. Quinze destinations secondaires supplémentaires ont été ouvertes, notamment les formulaires d’étudiant, d’enseignant, de personnel, d’évaluation, de publication et d’annonce ; certaines destinations `/admin` affichent une erreur ou un écran incomplet. Les formulaires de filière, matière, groupe, semestre et scolarité ont été ouverts sans enregistrement. Une évaluation a été examinée dans ses détails, sa fiche de notes, son constructeur et sa destination de copies ; un dossier étudiant a été ouvert, avec ses onglets Informations, Relevés de notes et Dossier (Album). Cela ne signifie pas que tous les enregistrements individuels ni chaque combinaison de filtres ont été examinés.

Aucun formulaire métier n’a été soumis, aucun statut ni droit modifié, aucune note enregistrée ou publiée, aucun paiement effectué et aucun relevé généré sur la référence. La connexion est la seule soumission effectuée. Les captures et relevés DOM restent dans `.tmp/reference-review-2026-10-15/`, ignoré par Git ; aucun identifiant de connexion ni contenu personnel n’est recopié dans ce rapport. La session locale temporaire a été supprimée après la revue.

Des réponses HTTP 500 et 429 ont été observées sur des services du portail de référence. Certains tableaux ont d’abord affiché zéro ou un chargement avant de présenter leurs données. Un écran vide n’a donc pas été interprété comme une absence réelle de données. La destination des copies est restée sans contenu exploitable lors de la première lecture. Les écritures et autorisations serveur de la référence n’ont pas été testées. Le compte Informaticien ne permet pas de conclure à l’expérience effective de chaque autre rôle.

## Comparaison et travail à réaliser

| Parcours | Référence observée | Écart confirmé chez nous et résultat attendu |
| --- | --- | --- |
| Notes | La fiche de notes appartient à une évaluation et affiche matière, date, horaires, session, effectif et lignes étudiantes ; la programmation, le sujet et les copies disposent de destinations séparées. | Le choix systématique d’un étudiant est insuffisant pour l’enseignant. Entrée par enseignement/groupe puis évaluation, avec liste des étudiants concernés. La consultation personnelle reste dans le dossier. |
| Relevés et délibérations | Année scolaire, groupe/promotion et période/semestre précèdent la sélection des étudiants et la génération. La liste des relevés reste filtrable par ces mêmes contextes. | Le sélecteur annuel global ne remplace pas le contexte semestre/groupe. Séparer préparation de jury, décision conservée et document émis. Aucune génération sur notes manquantes ou règle non confirmée. |
| Documents étudiants | La fiche individuelle sépare Informations, Relevés de notes et Dossier (Album). La génération de cartes dispose de sa page et de filtres niveau/filière/groupe. | Les pièces reçues, documents émis, cartes et catalogue des types ne doivent pas constituer une liste interchangeable. Le dossier doit rester le point de consultation individuelle. |
| Étudiants et inscription | L’inscription distingue identité/contact, tuteur, responsable financier et cursus ; le formulaire affiche les frais correspondants. La liste filtre niveau/filière/groupe et ouvre une fiche individuelle. | Le CRUD civil actuel ne constitue pas une inscription complète. La provenance et les relations annuelles doivent être reprises avant de calculer ou de confirmer les frais. |
| Pédagogie | Le catalogue de matières se filtre par filière, niveau et semestre ; les groupes relient niveau et filières. | Exposer les formations et enseignements reliés, puis leurs groupes, affectations et évaluations. Réserver les tables techniques au contrôle de reprise. |
| Planning et présences | L’export exige un groupe et propose type et dates ; le calendrier a une présentation distincte. | Une présence doit s’ouvrir depuis une séance contextualisée, avec groupe, enseignant et horaire, plutôt que depuis plusieurs collections indépendantes. |
| Finance | Les frais de scolarité affichent année, mode, niveau, filière et montant. Le formulaire distingue genre optionnel, mode de formation et plan de paiement. | Séparer tarifs institutionnels, contrat de l’étudiant, échéancier, versements et reçus ; maintenir le contexte inscription/année à chaque passage. Les écritures financières connectées restent à réaliser. |
| Réclamations | Liste de suivi avec étudiant/matière et statut. | Ouvrir le dossier depuis la note et l’évaluation concernées ; afficher le circuit et ses décisions dans la même fiche. |
| Personnel et accès | Enseignant, membre administratif et rôle ont leurs propres listes/formulaires. | Relier enseignant → affectations → groupes/enseignements sans confondre personne, compte, rôle et fonction. Conserver les droits ESCEN autorisés, dont l’accès global métier de l’Informaticien. |
| Candidatures | Dépôt en étapes, étude par dossier et files par état ; le dossier reçu est distinct de l’inscription académique. | Relier réception du site → étude du dossier → décision autorisée → inscription officielle, sans créer un compte ou une inscription à la réception. L’étude complète et la décision connectées restent à réaliser. |
| Communication | Publications, annonces, messages, galerie et newsletter ont des destinations différentes. | Conserver la distinction article public, annonce interne et destinataires. La connexion articles/site existe ; elle ne réalise pas à elle seule les autres workflows. |
| Paramètres et système | Années, semestres, niveaux, documents, activité, sauvegardes et configuration sont séparés. | Un journal exporté n’est pas une sauvegarde. Un catalogue de pièces n’est pas un dossier étudiant. Les outils de reprise doivent rester dans l’espace technique. |

L’année affichée par défaut dans plusieurs formulaires de référence est 2025–2026, alors que son tableau de bord mentionne 2026 et que d’autres années existent. Cela confirme qu’une année de travail ne se déduit pas de l’année civile ou de la dernière date. Aucune configuration distante n’a été copiée automatiquement dans notre base ; les dates et rattachements doivent être confirmés à partir des sources.

## Correction réalisée pendant cette revue

Dans notre fiche étudiant, les onglets Années et groupes, Frais et versements, Notes et Pièces utilisaient le même navigateur de collections. Un onglet pouvait ainsi présenter un autre domaine. Chaque onglet possède désormais ses seules collections métier, avec l’étudiant et le lot d’origine conservés. Ce correctif ne remplace pas la refonte pédagogique et documentaire décrite ci-dessus.

Vérification : lint, build et tests métier/SQL ; tests navigateur `tests/ui/document-context.spec.ts`, dont un scénario dédié aux rubriques du dossier. Les tests confirment des comportements précis, pas une disponibilité complète de la plateforme.

## Ordre de reprise

1. Refaire les entrées pédagogiques : enseignement/groupe → évaluation → fiche de notes → copies/corrections ; dossier individuel en accès complémentaire.
2. Organiser les relevés par année → formation/groupe → semestre → décision → document ; distinguer consultation, préparation et émission.
3. Faire du dossier étudiant le point d’accès aux pièces et documents émis, et conserver la génération de cartes comme traitement séparé.
4. Relier inscription annuelle → contrat → échéancier → versement → reçu ; reprendre les parents historiques confirmés avant les commandes persistantes.
5. Rattacher présences à leurs séances, réclamations à leurs notes, affectations aux enseignants et communications à leurs destinataires.
6. Recetter ensuite chaque parcours avec ses rôles et ses erreurs réelles, à 390 et 1440 px ; conserver les décisions, audits et années historiques.

Critère commun : un écran indique l’entité et l’année traitées, propose les actions pertinentes et conserve ce contexte jusqu’au détail, au retour et à l’export. Une opération encore indisponible reste annoncée comme telle.

## Inventaire des destinations du menu

« Ouvert » décrit la navigation et l’affichage observé, sans validation d’une écriture. Les listes initialement vides ont été relues après chargement.

| Destination | Écran observé | Visite |
| --- | --- | --- |
| `/` | Tableau de bord | Ouvert |
| `/actualites` | Actualités & Communiqués | Ouvert |
| `/annonces` | Communications | Ouvert |
| `/emploi-du-temps` | Mon emploi du temps | Ouvert |
| `/profile/info` | Profil : identité, coordonnées, compte et rôles | Ouvert |
| `/reclamations` | Gestion des réclamations | Ouvert |
| `/evaluations/professeur/mes-examens` | Mes examens | Ouvert |
| `/emploi-du-temps/exporter` | Emplois du temps | Ouvert |
| `/filieres/liste` | Liste des filières | Ouvert |
| `/uvs/liste` | Catalogue des matières | Ouvert |
| `/evaluations/liste` | Liste des évaluations | Ouvert |
| `/salles` | Gestion des Salles | Ouvert |
| `/groupes` | Liste des groupes | Ouvert |
| `/admin/jours-feries` | Gestion des Jours Fériés | Ouvert |
| `/admin/liste-des-etudiants` | Liste des étudiants | Ouvert |
| `/admin/releves-globaux` | Génération des relevés par année, groupe et semestre | Ouvert |
| `/admin/liste-des-releves` | Liste des relevés émis | Ouvert |
| `/admin/etudiants/cartes` | Écran sans titre principal | Ouvert |
| `/admin/etudiants/abandons` | Liste des abandons | Ouvert |
| `/finance/dashboard` | Dashboard financier | Ouvert |
| `/frais-de-scolarite/liste` | Gestion des frais de scolarité | Ouvert |
| `/frais-inscription/liste-des-frais-inscription` | Frais d'inscription | Ouvert |
| `/bourses/liste` | Gestion des bourses | Ouvert |
| `/candidatures/dashboard` | Tableau de Bord des Candidatures | Ouvert |
| `/admin/candidatures/inscription` | Nouvelle candidature | Ouvert |
| `/candidatures/etude-dossier` | Étude des Dossiers | Ouvert |
| `/candidatures/dossiers-incomplets` | Dossiers incomplets | Ouvert |
| `/candidatures/admis` | Écran sans titre principal | Ouvert |
| `/admin/etudiants/reinscription` | Réinscription & Promotion | Ouvert |
| `/personnel/utilisateurs` | Liste des membres de l'administration | Ouvert |
| `/personnel/enseignants` | Liste des enseignants | Ouvert |
| `/roles/liste` | Rôles | Ouvert |
| `/journal-activite/liste` | Journal d'activité | Ouvert |
| `/sauvegardes/liste` | Sauvegardes & Sécurité | Ouvert |
| `/admin/communications/dashboard` | Tableau de bord - Communication | Ouvert |
| `/admin/communications` | Gestion de la Communication | Ouvert |
| `/messages` | Liste des messages | Ouvert |
| `/admin/prospects` | Liste des prospects (Brochures) | Ouvert |
| `/publications/liste` | Liste des publications | Ouvert |
| `/info-urgente/liste` | Liste des actualités | Ouvert |
| `/partenaires/liste` | Liste des partenaires | Ouvert |
| `/communications/newsletter` | Abonnés Newsletter | Ouvert |
| `/galerie` | Galerie multimédia | Ouvert |
| `/support/ticket` | Assistance & Support | Ouvert |
| `/parametre/liste` | Configuration générale de l'établissement | Ouvert |
| `/parametre/mon-activite` | Mon activité | Ouvert |
| `/annee-scolaire/liste` | Liste des années scolaire | Ouvert |
| `/periodes/liste/` | Liste des semestres | Ouvert |
| `/parametre/niveaux` | Gestion des niveaux scolaires | Ouvert |
| `/parametre/champs-obligatoires` | Champs obligatoires du formulaire de candidature | Ouvert |
| `/parametre/types-diplome` | Types de diplôme (dernier diplôme obtenu) | Ouvert |
| `/parametre/moyens-connaissance` | Moyens de connaissance de l'établissement | Ouvert |
| `/parametre/types-documents` | Catalogue des Documents | Ouvert |

# Référence ESCEN : revue actuelle et améliorations Personnel

Date : 13 octobre 2026. Source : [portail ESCEN de démonstration](https://escendemo.neostart.tech/).

## Périmètre réellement consulté

Connexion avec le compte fourni, affiché comme Informaticien. Les 53 routes des menus ont été ouvertes en lecture. Les listes d’utilisateurs et d’enseignants, leurs formulaires d’ajout, le profil, le catalogue des rôles et cinq fiches de permissions ont été examinés plus précisément. Des captures et un relevé DOM sont conservés localement dans .tmp/reference-audit/, ignoré par Git. Les identifiants, cookies et jetons ne sont pas enregistrés dans le code ou ce rapport.

Aucun formulaire n’a été soumis hors connexion. Aucun paiement, note, utilisateur, rôle ou droit n’a été créé, modifié ou supprimé volontairement sur le portail externe. Le portail peut journaliser automatiquement les consultations. Cette visite ne valide ni ses enregistrements ni ses contrôles serveur et ne teste pas les autres comptes.

## Personnel, rôles et permissions

| Écran de référence | Observation actuelle | Choix pour notre front |
|---|---|---|
| [Utilisateurs](https://escendemo.neostart.tech/personnel/utilisateurs) | Liste administrative de 30 entrées, recherche, filtre de rôle, colonnes et pagination ; formulaire civil séparé avec choix de rôles. | Annuaire filtrable par nom/email/rôle et statut, compteurs explicites, accès individuels et historique. |
| [Enseignants](https://escendemo.neostart.tech/personnel/enseignants) | 19 entrées ; formulaire distinct pour informations personnelles, fiscales, professionnelles et documents. | Conserver l’annuaire pédagogique et les affectations séparés de la gestion des accès. Les champs fiscaux ne sont pas ajoutés pendant cette revue. |
| [Rôles](https://escendemo.neostart.tech/roles/liste) | 24 rôles, recherche et compteurs de permissions ; ajout, modification et accès à la fiche des droits proposés. | Catalogue des 14 rôles métier ESCEN, fiches par domaine et périmètre lisible. Pas d’import des rôles commerciaux ni de création libre de privilèges. |
| [Permissions Informaticien](https://escendemo.neostart.tech/roles/informaticien/permissions) | 221 droits affichés comme accordés sur 221, dans 97 domaines. | Administration technique, annuaire et support ; aucun accès aux notes ni aux opérations financières. |
| [Permissions DGA](https://escendemo.neostart.tech/roles/directeur-general-adjoint/permissions) | 221 droits affichés sur 221. | Suivi opérationnel et consultation selon la politique existante ; ne pas lui copier tous les pouvoirs du DG. |
| [Permissions enseignant](https://escendemo.neostart.tech/roles/enseignant/permissions) | La fiche affiche 24 droits ; la liste des rôles affichait 26. | Même source de permissions pour les compteurs, les fiches, la matrice et les services mock. Limiter les données aux enseignements affectés. |
| [Permissions étudiant](https://escendemo.neostart.tech/roles/etudiant/permissions) | La fiche affiche 4 droits ; la liste des rôles affichait 7. | Même source de vérité ; données personnelles uniquement. |
| [Permissions RAF](https://escendemo.neostart.tech/roles/responsable-administratif-et-financier/permissions) | 37 droits affichés ; domaines et droits sont distingués. | Afficher ses droits financiers et administratifs effectifs ; annulation d’un paiement réservée au DG. |
| [Profil](https://escendemo.neostart.tech/profile/info) | L’en-tête indique Étudiant alors que le rôle affiché dans le menu et l’onglet Rôles est Informaticien. | Afficher le rôle réellement attribué et son périmètre sans le confondre avec un type de dossier. |

Les divergences de compteurs sont des observations d’interface, pas une preuve d’erreur d’autorisation serveur. La sélection de plusieurs rôles proposée par la référence n’a pas été enregistrée ni validée. Notre prototype conserve un rôle principal par utilisateur ; définir un cumul et les règles de séparation des responsabilités demanderait une règle métier explicite.

## Pages parcourues

Cette liste décrit l’affichage observé, pas une validation de chaque action. Les écrans CRM, admission et portail public sont consultés uniquement comme référence et restent exclus de notre développement.

| Route | Présentation observée | Visite |
|---|---|---|
| `/` | Tableau de bord | Consulté |
| `/actualites` | Actualités & Communiqués | Consulté |
| `/annonces` | Communications | Consulté |
| `/emploi-du-temps` | Préparation de votre emploi du temps... | Consulté |
| `/profile/info` | Informations personnelles et rôles | Consulté |
| `/reclamations` | Gestion des réclamations | Consulté |
| `/evaluations/professeur/mes-examens` | Mes examens | Consulté |
| `/emploi-du-temps/exporter` | Emplois du temps | Consulté |
| `/filieres/liste` | Liste des filières | Consulté |
| `/uvs/liste` | Catalogue des matières | Consulté |
| `/evaluations/liste` | Liste des évaluations | Consulté |
| `/salles` | Gestion des Salles | Consulté |
| `/groupes` | Liste des groupes | Consulté |
| `/admin/jours-feries` | Gestion des Jours Fériés | Consulté |
| `/admin/liste-des-etudiants` | Liste des étudiants | Consulté |
| `/admin/releves-globaux` | Écran affiché | Consulté |
| `/admin/liste-des-releves` | Écran affiché | Consulté |
| `/admin/etudiants/cartes` | Écran affiché | Consulté |
| `/admin/etudiants/abandons` | Liste des abandons | Consulté |
| `/finance/dashboard` | Dashboard financier | Consulté |
| `/frais-de-scolarite/liste` | Gestion des frais de scolarité | Consulté |
| `/frais-inscription/liste-des-frais-inscription` | Frais d'inscription | Consulté |
| `/bourses/liste` | Gestion des bourses | Consulté |
| `/candidatures/dashboard` | Tableau de Bord des Candidatures | Consulté |
| `/admin/candidatures/inscription` | Nouvelle candidature | Consulté |
| `/candidatures/etude-dossier` | Étude des Dossiers | Consulté |
| `/candidatures/dossiers-incomplets` | Dossiers incomplets | Consulté |
| `/candidatures/admis` | Écran affiché | Consulté |
| `/admin/etudiants/reinscription` | Réinscription & Promotion | Consulté |
| `/personnel/utilisateurs` | Liste des membres de l'administration | Consulté |
| `/personnel/enseignants` | Liste des enseignants | Consulté |
| `/roles/liste` | Rôles | Consulté |
| `/journal-activite/liste` | Journal d'activité | Consulté |
| `/sauvegardes/liste` | Sauvegardes & Sécurité | Consulté |
| `/admin/communications/dashboard` | Tableau de bord - Communication | Consulté |
| `/admin/communications` | Gestion de la Communication | Consulté |
| `/messages` | Liste des messages | Consulté |
| `/admin/prospects` | Liste des prospects (Brochures) | Consulté |
| `/publications/liste` | Liste des publications | Consulté |
| `/info-urgente/liste` | Liste des actualités | Consulté |
| `/partenaires/liste` | Liste des partenaires | Consulté |
| `/communications/newsletter` | Abonnés Newsletter | Consulté |
| `/galerie` | Galerie multimédia | Consulté |
| `/support/ticket` | Assistance & Support | Consulté |
| `/parametre/liste` | Configuration générale de l'établissement | Consulté |
| `/parametre/mon-activite` | Mon activité | Consulté |
| `/annee-scolaire/liste` | Liste des années scolaire | Consulté |
| `/periodes/liste/` | Liste des semestres | Consulté |
| `/parametre/niveaux` | Gestion des niveaux scolaires | Consulté |
| `/parametre/champs-obligatoires` | Champs obligatoires du formulaire de candidature | Consulté |
| `/parametre/types-diplome` | Types de diplôme (dernier diplôme obtenu) | Consulté |
| `/parametre/moyens-connaissance` | Moyens de connaissance de l'établissement | Consulté |
| `/parametre/types-documents` | Catalogue des Documents | Consulté |

## Changements réalisés localement

- /personnel/utilisateurs : annuaire, filtres de rôle et statut, détails des accès, activation motivée, changement de rôle motivé et ancienne/nouvelle attribution conservées avec auteur et date.
- /personnel/roles : catalogue des 14 rôles, effectifs attribués, droits par domaine et périmètres des données.
- /personnel/permissions : comparaison de deux rôles, recherche, filtre par domaine et différences uniquement. Cette page consulte la politique ; elle ne permet pas d’attribuer arbitrairement des droits.
- Services mock : le DG reste seul à administrer les rôles sensibles ; l’Informaticien ne peut pas promouvoir un utilisateur vers ces rôles. Les changements de statut et de rôle sont audités.
- Les droits de personnel, achats et inventaire déjà présents dans les workflows sont déclarés explicitement dans le catalogue. Les mêmes acteurs conservent leurs actions ; une permission de modification de dossier étudiant explicite remplace l’utilisation indirecte de la permission d’affectation.

Le stockage reste en mémoire. Aucune donnée personnelle du portail externe n’est importée dans les mocks, aucun backend ni aucune authentification réelle ne sont ajoutés.

## Vérification du prototype

Lint, tests métier et build de production passent. Les 22 tests navigateur passent en 5,1 minutes : 35 pages à 390 et 1440 px, 14 rôles à quatre tailles et parcours métier, dont changement de rôle avec historique et comparaison des permissions. Résultats locaux : `.tmp/personnel-final-results/`. Captures relues : `.tmp/interface/390/personnel-matrice-finance.png` et `.tmp/interface/1440/personnel-role-historique.png`.

## Limites de la consultation externe

Des ouvertures directes ont été lentes ; la visite utilise ensuite les liens internes et attend les chargements. Certaines ressources d’images ont été bloquées par le navigateur et une requête utilisateur s’est interrompue lors d’une navigation ; ces incidents sont distingués des pages consultées et ne sont pas attribués aux écrans visités ultérieurement. La validité des exports, impressions, sauvegardes et modifications du portail distant n’est pas testée.

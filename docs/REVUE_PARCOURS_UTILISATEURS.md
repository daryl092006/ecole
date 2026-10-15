# Revue des parcours ESCEN — 15 octobre 2026

## Diagnostic commun

La navigation exposait les collections techniques et les étapes métier au même niveau. Une préparation d’année affichait simultanément six étapes, leurs sous-rubriques, l’introduction générique du catalogue, la recherche, les archives et une liste vide. Un dossier étudiant répétait la situation, les actions de scolarité et les bandeaux d’archives dans chaque onglet. La sauvegarde pouvait fermer le contexte et perdre la rubrique sélectionnée. Les modèles historiques et les traitements connectés ont des niveaux d’avancement différents : une liste consultable n’est pas une opération de gestion achevée.

## Ordre des opérations

| Domaine | Parcours utilisateur | Contrôle et contexte |
| --- | --- | --- |
| Préparation annuelle | Filières, cycles, lieux et année → niveaux → programmes de formation → formations annuelles → groupes et cours → tarifs et moyens d’encaissement → ouverture | Année explicitement transmise aux lectures/écritures. Bilan distinct de l’étape en cours. Références communes réutilisées. |
| Nouvelle inscription | Rechercher l’identité → créer le dossier si absent → choisir formation/groupe et tarifs → vérifier → enregistrer | Aucun ancien dossier requalifié en nouveau. Contrat initial en brouillon, paiement distinct. |
| Réinscription | Choisir l’année cible → vérifier l’inscription de l’année précédente → sélectionner l’ancien étudiant non inscrit dans la cible → confirmer | Historique conservé ; décision de passage ou transfert non inventée. |
| Finance | Définir les tarifs → rattacher le contrat au dossier et à l’année → encaisser → conserver le reçu → suivre les échéances et exports | L’encaissement se fait dans le dossier inscrit. Annulation et allocations ne sont pas simulées dans les écrans consultatifs. |
| Enseignement | Programme → affectation enseignant/groupe → séance/salle → présence | Les locaux servent au planning. Les contrôles de conflits ne sont pas remplacés par des formulaires de catalogue. |
| Évaluation | Préparer le sujet → organiser le contrôle ou examen → copies → correction → contrôle des notes → publication | Ne pas présenter la composition d’un sujet comme une évaluation publiée. Les parcours connectés incomplets restent annoncés. |
| Réclamation et jury | Choisir dossier/évaluation → traiter la réclamation → décision et correction tracée → délibération → relevé | Pas de calcul ou publication de résultats incomplets. |
| Personnel et accès | Dossier professionnel → affectations → compte → rôle et permissions | Identité et accès séparés ; filtrage du menu par droits existants. |
| Achats et locaux | Fournisseur → demande → décision → réception → inventaire ; lieux → bâtiments → salles pour le planning | Les sites sont des lieux physiques, sans lien avec le site web. Aucune création de lieu supposé. |
| Site web | Campagne annuelle → réception du dossier en ligne → examen du dossier ; article brouillon → relecture → publication | Le dépôt public n’est ni une inscription académique ni un compte utilisateur. |
| Communication et support | Choisir l’année → publication ou demande → suivi dans son contexte | Ne pas confondre catégories historiques et tickets réellement envoyés. |
| Pilotage et administration | Choisir l’année et le périmètre → indicateurs vérifiables → export ; journal et reprise dans l’administration | Les volumes d’archives et anomalies ne doivent pas encombrer l’accueil de travail quotidien. |

## Corrections transversales réalisées

- Préparation : bilan à part ; une seule étape affichée, retour explicite, suite proposée, confirmation puis fermeture de l’étape. Pas de titres et menus de catalogue empilés dans cette étape.
- Référentiels : une rubrique sélectionnée, sans bande de neuf onglets ; prérequis accessibles lorsqu’ils manquent. Une référence requise unique est présélectionnée ; le lieu d’enseignement unique reste indiqué sans question redondante dans la préparation.
- Navigation : les pages de chaque module sont regroupées par activité selon le même catalogue de parcours que les accueils de modules. Les droits existants restent inchangés.
- Dossier étudiant : archives intégrées sans leur introduction générale ; actions de scolarité présentes dans la vue principale, sans répétition dans chaque onglet ; modification civile et encaissement en popup.
- Accueil : les tableaux de reprise et qualité des données sont réservés à la vue d’ensemble ; les activités liées deviennent secondaires dans les écrans de consultation.
- Sauvegardes : fermeture sur succès, saisie conservée sur erreur, actualisation sans réinitialisation de la rubrique lorsque le contexte de sécurité est inchangé.

## Limites fonctionnelles à traiter séparément

La reprise canonique des inscriptions historiques, l’approbation finale des contrats, les échéanciers et allocations, les décisions de passage, la saisie/validation/publication connectées des notes et plusieurs traitements de planning, achats et support restent incomplets. Leur réorganisation visuelle ne les rend pas opérationnels. Les migrations, données originales, permissions serveur et règles de validation ne sont pas assouplies par cette revue.

## Vérification

Lint, build, assertions métier/PostgreSQL et parcours navigateur à 390 et 1440 pixels. Les recettes de préparation, dossiers, paiements, documents et navigation utilisent des données isolées ; aucune inscription, aucun encaissement ni compte réel n’est créé par la recette.

La recette visuelle a aussi corrigé deux défauts transversaux : des styles réaffichaient des contrôles marqués `hidden`, et les liens du menu regroupé devaient conserver une disposition verticale. Les rubriques secondaires des dossiers utilisent un seul sélecteur ; les rubriques principales restent accessibles sur mobile par défilement horizontal. Le niveau d’une formation et celui d’un rattachement de groupe sont déduits de leurs références réelles, sans seconde saisie contradictoire. L’enregistrement d’un prérequis revient à sa tâche d’origine ; la création d’un groupe mène à son rattachement à la formation.

## Ordre des saisies commun aux modules

La création ne renvoie plus l’utilisateur vers des pages de références. `catalogTaskOrder` examine les références obligatoires de l’action et place les éléments indépendants avant ceux qui en dépendent. Ainsi, si toutes les bases manquent, une formation annuelle demande les filières, cycles et lieux avant les niveaux, puis le programme de formation et enfin la formation de l’année. Pour une salle, le parcours enregistre le lieu, puis le bâtiment et enfin la salle. Les éléments déjà présents sont réutilisés ; les liens facultatifs ne déclenchent aucune création imposée.

Chaque formulaire reste dans une popup. La relecture ne déclenche aucune écriture ; la confirmation enregistre l’étape et recharge ses références avant de poursuivre. Une erreur conserve le formulaire. Si l’utilisateur ferme le parcours, les éléments qu’il a déjà explicitement enregistrés restent disponibles ; aucune autre opération dépendante n’est supposée réalisée. Les contrôles de révision, droits, relations et audits restent ceux des API existantes.

Dans Nouvelle inscription et Réinscription, les choix apparaissent dans l’ordre : dossier, formation, groupe, tarifs puis date et motif. Une identité manquante se crée sur place et revient sélectionnée dans l’inscription. Les formations, groupes, tarifs et moyens d’encaissement manquants utilisent le même parcours, selon les permissions du rôle. La configuration des campagnes du site permet également de compléter les filières et niveaux sur place en conservant le formulaire commencé.

Une année précise est demandée pour une opération annuelle si le contexte n’en fournit aucune. Sa création éventuelle ne désigne aucune année de travail institutionnelle. Aucun parent absent n’est inventé, aucun lien entre archive et donnée canonique n’est déduit et aucun paiement ou compte n’est créé implicitement.

Recettes : `npm run test` et `npm run test:ui -- tests/ui/process-clarity.spec.ts tests/ui/year-preparation.spec.ts tests/ui/business-processes.spec.ts tests/ui/crud.spec.ts tests/ui/navigation-review.spec.ts`.

## Retrait des sites et bâtiments physiques

À la demande explicite du 15 octobre 2026, les sites et bâtiments ne sont plus des rubriques, champs ou prérequis de l’application. Les salles sont saisies directement avec code, nom et capacité. Les formations, groupes, équipements, achats, dépenses et contrats du personnel fonctionnent sans site. La migration 28 rend les anciennes relations facultatives et conserve les données antérieures ainsi que les restrictions des autorisations existantes. Les doublons restent interdits pour les salles, groupes et formations sans localisation. Cette évolution concerne les lieux physiques ; la connexion du site web conserve ses fonctions.

## Configuration annuelle unique

La fenêtre de préparation annuelle conserve cinq étapes : formations proposées, groupes, scolarité, inscription et encaissement. Le programme des matières appartient à la gestion pédagogique ; il ne bloque plus l’ouverture de l’année ou l’inscription. Les contrôles propres aux enseignements et aux examens restent applicables.

Les listes de formations annuelles, groupes, tarifs et moyens d’encaissement ne sont plus proposées comme rubriques génériques concurrentes. Finance présente les contrats et bourses des étudiants. Depuis une inscription ou un dossier étudiant, un prérequis manquant ouvre la même fenêtre de configuration de l’année sélectionnée ; sa fermeture reprend le dossier en cours sans redirection.

### Consultation des paramètres enregistrés

« Consulter » ouvre la liste de l’année et de la catégorie choisies, sans lancer la création ni la saisie des prérequis. « Voir » affiche la fiche ; seuls « Ajouter » et « Modifier » ouvrent un formulaire. Les groupes et leurs rattachements restent accessibles depuis cette liste. La création guidée demeure disponible pour une étape à configurer. Une liste vide en mode consultation ne déclenche jamais automatiquement un formulaire.

### Groupes partagés entre filières

Le groupe appartient à une année et un niveau. Plusieurs formations annuelles de ce niveau peuvent lui être rattachées, une par filière (ou variante de formation). La liste et la fiche du groupe présentent les filières accueillies. Ajouter un rattachement conserve les rattachements existants. L’inscription de chaque étudiant garde sa formation propre ; un rattachement à une formation d’un autre niveau est refusé par les relations PostgreSQL.

La création d’un groupe propose directement les formations de l’année et du niveau sélectionnés sous forme de cases à cocher. Au moins une sélection est requise. Le serveur vérifie les rattachements et enregistre le groupe et toutes ses filières dans une transaction unique. La confirmation revient au bilan annuel sans ouvrir un second formulaire de rattachement.

La configuration annuelle présente une seule rubrique « Groupes ». L’onglet séparé « Groupes et formations » est retiré ; les formations associées restent affichées dans la liste et la fiche du groupe et choisies lors de sa création.

Les anciens accès à `group_offerings` affichent désormais la liste des groupes, une ligne par groupe. Les formations associées utilisent des libellés courts sans répéter l’année, le niveau et la version de maquette. Une filière absente est explicitement indiquée « Filière non renseignée ».

Contrôle de la source 2025-2026 : 13 groupes, 29 associations reprises. Les associations issues des inscriptions étudiantes peuvent diverger des rattachements `filiere_group` et du nom du groupe (notamment M1 Management de projets, Finance digitale et Marketing). Ces divergences ne permettent pas de confirmer les affectations métier ni de les corriger automatiquement ; aucune réaffectation n’a été effectuée.

### Années et calendrier

La page des années affiche une seule liste opérationnelle, avec dates, état, consultation, modification et actions du cycle de vie. Le tableau CRUD et l’archivage générique ne sont plus affichés en parallèle. Les anciennes années sans dates confirmées restent dans une rubrique repliée. Le sélecteur supérieur porte le libellé « Année consultée » et indique séparément l’année de travail.

Les séances courantes et historiques sont présentées dans un calendrier mensuel avec navigation, choix du mois et ouverture du détail. Les séances sans date valide restent explicitement accessibles hors de la grille. Les filtres historiques et la consultation détaillée sont conservés ; aucun déplacement ou changement de programmation n’est effectué par le calendrier. Recette : `npm run test:ui -- tests/ui/year-calendar.spec.ts`.

### Présentation des données importées

Les rubriques métier n’affichent plus de sélecteur « Archives conservées / Données actuelles ». Elles ouvrent directement les données opérationnelles lorsqu’elles existent, ou les données disponibles via le lecteur source pour les rubriques pas encore reprises. Les listes et les séances ne portent plus de badge d’archive. Les anomalies restent signalées par élément ; la provenance technique et les sources originales restent conservées pour le contrôle de reprise. Ce changement d’affichage ne crée pas de nouveaux droits d’écriture et ne complète aucune relation manquante.

Le calendrier est borné par les dates de l’année consultée : seuls les jours et séances de cette période sont affichés, le sélecteur de mois et les flèches ne sortent pas de ses limites, et « Aujourd’hui » est désactivé hors période. Le changement d’année réinitialise le mois consulté. Les séances datées hors période ne sont pas reclassées en séances sans date. Une année aux dates invalides affiche une demande de correction au lieu d’un calendrier non borné.

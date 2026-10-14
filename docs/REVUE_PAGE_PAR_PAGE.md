# Revue page par page du front-end ESCEN

Date : 13 octobre 2026. Prototype en mémoire, sans backend ni persistance.

## Méthode et portée

Chaque URL du portail est ouverte dans une session de démonstration autorisée à 390 et 1440 px. Le relevé contrôle l’URL, un titre principal unique, les libellés des champs, les boutons, l’absence de liens factices, les explications des tableaux vides, les débordements et les erreurs JavaScript. Les pages sont photographiées individuellement. La suite transversale couvre en complément les 14 rôles à 320, 768, 1024 et 1440 px.

Le relevé individuel commence avec des données vides. Les parcours métier créent ensuite leurs données par les formulaires et vérifient les écrans remplis. La colonne suivante distingue les actions effectivement exercées de la vérification d’affichage ; elle ne certifie pas chaque combinaison possible de données ou de boutons.

La [revue de lisibilité](REVUE_LISIBILITE.md) précise les changements de présentation par page. Le relevé ouvre et referme chaque formulaire dépliable, contrôle ses champs sur mobile et ordinateur et vérifie que le planning présente un seul tableau. Les rapports structurés incluent les actions dépliables et le nombre de mots affichés.

## Pages du portail

| URL | Contrôle fonctionnel complémentaire au relevé d’affichage |
|---|---|
| `/mon-espace` | Identité personnelle, notes publiées, dépôt d’une réclamation et absence de données avant sélection d’identité. |
| `/mon-espace/support` | Création d’un ticket personnel et suivi de son historique. |
| `/mon-espace/annonces` | Audience étudiant/délégué, exclusion d’un enseignant, retrait de l’annonce des espaces destinataires. |
| `/mon-espace/documents` | Contenu des cartes, certificats et relevés imprimables ; dépôt d’une pièce PDF. La boîte d’impression du système est neutralisée pendant le test. |
| `/mon-espace/scolarite` | Consultation du paiement personnel ; absence du bouton d’encaissement. |
| `/tableau-de-bord` | Effectifs actifs après suspension ; données calculées plutôt que chiffres inventés. |
| `/tableau-de-bord/rapports` | Synthèse annuelle, effectifs et état vide ; boutons d’export inspectés. |
| `/academique/filieres` | Catalogue et état vide ; les créations sont exercées depuis le référentiel partagé. |
| `/academique/referentiel` | Création et ouverture d’année, filière, semestre, UE, matière, groupe, enseignant et affectation ; sept sections inspectées pour les rôles autorisés. |
| `/academique/emploi-du-temps` | Formulaires de séance, salles et périodes bloquées inspectés ; conflits, déplacement et annulation vérifiés dans les services mock. |
| `/academique/presences` | Appel d’une séance affectée au surveillant, enregistrement et limitation au périmètre autorisé. |
| `/academique/notes` | Saisie enseignant, soumission, contrôle, validation, publication et consultation personnelle après publication. |
| `/academique/reclamations` | Analyse, transmission, avis enseignant, décision, correction motivée et clôture. |
| `/academique/examens` | Création d’examen avec salle et surveillant ; annulation et cohérence avec le planning vérifiées par les assertions de services. |
| `/academique/deliberations` | Calcul du semestre, décision du jury après validation des règles et présence du relevé. |
| `/academique/parametres` | Validation explicite du règlement avant délibération. |
| `/etudiants` | Création de dossiers, liste et accès individuel ; recherche et filtres couverts par les assertions de services. |
| `/etudiants/cartes` | Liste, recherche, boutons et états vides inspectés ; génération documentaire exercée depuis l’espace personnel. |
| `/etudiants/parcours` | Suspension et reprise via formulaire ; réinscription et conservation des créances/années précédentes vérifiées dans les services mock. |
| `/finance` | Soldes par année et après annulation, bourses courantes et état vide. |
| `/finance/versements` | Versement, rejet d’un montant excessif, annulation DG motivée, reçu conservé et document imprimable marqué ANNULÉ. |
| `/finance/rapports` | Filtres et export inspectés ; classement et allocation des paiements vérifiés par assertions. Les frais inclus dans le contrat sont explicitement annoncés. |
| `/finance/contrats` | Scolarité, inscription, bourse, échéances, total net et conservation des encaissements. |
| `/personnel/utilisateurs` | Création d’un surveillant ; le DG peut créer et administrer un DGA, l’Informaticien ne peut ni lui attribuer ce rôle ni changer son activation. Restrictions vérifiées dans l’interface et les services. |
| `/personnel/enseignants` | Annuaire et affectations inspectés ; données créées dans le référentiel partagé. |
| `/personnel/roles` | Catalogue des 14 rôles, recherche, effectifs, droits et périmètres ; Stagiaire sans permission. |
| `/personnel/permissions` | Comparaison de deux rôles, filtres de domaine, recherche et différences ; Informaticien sans privilèges financiers ou académiques. |
| `/personnel` | Formulaire, recherche, modification et export inspectés ; sauvegarde et permissions vérifiées dans le service mock. |
| `/communication/annonces` | Publication ciblée, expiration validée dans le service, retrait motivé, conservation du contenu et historique. |
| `/communication/actualites` | Affichage des seules annonces actives et état vide. |
| `/logistique/achats` | Demande achats, approbation RAF et réception achats avec motifs. |
| `/logistique/inventaire` | Création d’équipement par le responsable de site, modification et passage en maintenance. |
| `/systeme/journal` | Affichage, état vide et accès selon les permissions ; contenu des événements conservé en mémoire. |
| `/systeme/export` | Téléchargement du journal JSON ; l’interface indique qu’il ne restaure pas les dossiers. |
| `/systeme/support` | Prise en charge et résolution par l’Informaticien ; historique, compte rendu et auteur. |

## Autres routes

| URL | Contrôle |
|---|---|
| `/` | Point d’entrée et redirection vers l’espace ou la connexion. |
| `/connexion` | Identifiants de démonstration, retour vers une page autorisée, logo, mobile, connexion/déconnexion. |
| `/mot-de-passe-oublie` | Demande locale d’aide, confirmation et absence d’envoi d’email. |
| `/etudiants/[matricule]` | Deux dossiers successifs par navigation interne : les champs du premier ne contaminent pas le second ; vérification d’une pièce et historique. |
| `/academique`, `/communication`, `/logistique`, `/systeme` | Ouverture du premier sous-écran autorisé, y compris après connexion. |
| URL inconnue | Page 404 et retour à la connexion. |
| URL interdite au rôle | Refus d’accès sans contenu métier, y compris après retour du navigateur. |

## Corrections de cette revue

- Inscriptions annuelles : ajout de `SUSPENDU` et `REINSCRIT` au type existant. Le statut courant est synchronisé sans modifier les inscriptions des anciennes années ; une opération financière conserve la suspension.
- Pilotage : les effectifs actifs comptent les étudiants inscrits ou réinscrits, en excluant les suspensions, abandons et diplômes.
- Dossier individuel : le formulaire est recréé lors d’un changement de matricule pour éviter de présenter les valeurs d’un autre étudiant.
- Support : les limites de longueur du formulaire sont aussi appliquées par le service ; le traitement conserve l’identité de l’auteur, distincte de son rôle.
- Rapport financier : le texte et « Contrat soldé » décrivent le contrat net réellement calculé, incluant les frais inscrits au contrat.
- Utilisateurs : le DGA rejoint la liste existante des rôles de direction réservés au DG. Cette liste est partagée entre l’interface et le service mock.

## Preuves et limites

Résultats actuels après la revue de lisibilité : lint, tests métier et build de production passent. Les 22 tests navigateur passent en 5,5 minutes, dont les 35 pages individuelles à 390 et 1440 px, l’ouverture des formulaires dépliables et les parcours Personnel. Le changement de rôle conserve le motif, l’auteur, la date et les anciennes/nouvelles valeurs ; recherche, filtres et comparaison des permissions sont exercés sur mobile et ordinateur. Résultats : `.tmp/clarity-final-results/`. Les tests de suspension/reprise ouvrent explicitement le formulaire à chaque nouvelle visite.

Les relevés structurés se trouvent dans `.tmp/page-review/390.json` et `.tmp/page-review/1440.json`, avec les URL, rôles, titres, champs et boutons réellement observés. Les captures individuelles sont dans `.tmp/page-review/390/` et `.tmp/page-review/1440/`. Ces fichiers locaux sont ignorés par Git.

Les impressions contrôlent le document HTML préparé ; elles ne valident pas une imprimante physique ni un fichier PDF produit par le système. Les exports sont des téléchargements locaux. L’authentification réelle, les contrôles serveur et la persistance restent hors de cette phase.

## Correction de navigation — 14 octobre

Les flèches de rubriques sont des boutons de dépliage indépendants des liens. Sur mobile, ouvrir une rubrique conserve le panneau et la page courante ; sélectionner une sous-page ferme le panneau. Les liens directs, l’état actif, le changement de rôle et le confinement du focus au clavier restent contrôlés.

Lint, build et tests métier passent. Les 12 contrôles existants de connexion, permissions, navigation et pages des 14 rôles aux quatre tailles passent (`.tmp/navigation-fix-results/`). Les deux nouveaux parcours à 390 et 1440 px vérifient six changements de rubrique au clavier, la conservation d’un utilisateur créé et l’absence du menu Finance pour l’Informaticien. Leur premier sélecteur confondait les deux liens vers la liste étudiants ; il cible maintenant explicitement la sous-page (`.tmp/navigation-recheck-results/`). Une vérification sur le serveur de développement confirme trois changements de rubrique sur mobile sans erreur JavaScript. Capture : `.tmp/interface/390/navigation-choix-rubrique.png`.

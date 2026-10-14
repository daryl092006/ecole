# Revue de lisibilité du front ESCEN

13 octobre 2026. Cette revue porte sur notre prototype et ses 35 pages de portail.

Les titres ne sont plus suivis de phrases qui les reformulent. Les listes, statuts, identités et montants passent avant les explications. Les formulaires secondaires se déplient à la demande ; les boutons Modifier ouvrent et ciblent automatiquement leur formulaire. Les règles utiles, motifs et historiques restent accessibles.

| Page | Informations prioritaires et correction |
|---|---|
| `/mon-espace` | Identité, prochaines séances, notes et liens directs ; contexte personnel conservé. |
| `/mon-espace/support` | Liste et statut des demandes ; formulaire Nouvelle demande replié. |
| `/mon-espace/annonces` | Titre, contenu, date, auteur et audience ; introduction retirée. |
| `/mon-espace/documents` | Identité, année et actions carte/certificat/relevé ; introduction retirée. |
| `/mon-espace/scolarite` | Soldes par année et transactions personnelles ; identité complète dans les transactions. |
| `/tableau-de-bord` | Effectifs et indicateurs calculés ; introduction retirée. |
| `/tableau-de-bord/rapports` | Table annuelle et export ; introduction retirée. |
| `/academique/filieres` | Matière, filière, niveau, enseignant et coefficient ; introduction retirée. |
| `/academique/referentiel` | Domaines de gestion directement accessibles ; explications génériques sur années, niveaux et groupes retirées. |
| `/academique/emploi-du-temps` | Un seul tableau avec date, groupe, enseignant, salle, état et actions ; formulaires séance et ressources repliés. |
| `/academique/presences` | Séance, date, salle, état de l’appel et accès à la feuille ; introduction retirée. |
| `/academique/notes` | Notes et statut courant visibles ; schéma complet de validation dépliable. |
| `/academique/reclamations` | Demande, état, dernier avis et prochaine action ; introduction retirée. |
| `/academique/examens` | Épreuve, horaire, salle, surveillant et état ; formulaire de planification replié. |
| `/academique/deliberations` | Moyenne, crédits, décision et relevé ; avertissement de règlement non validé conservé. |
| `/academique/parametres` | Valeurs du règlement et validation ; explication des calculs raccourcie. |
| `/etudiants` | Filière réellement affichée avec niveau et groupe ; ajout et affectation repliés, statut visuel corrigé. |
| `/etudiants/cartes` | Identité, année et documents à imprimer ; introduction retirée. |
| `/etudiants/parcours` | Une ligne par inscription annuelle avec année, niveau, groupe et statut ; opération de parcours repliée. |
| `/finance` | Contrats nets, encaissements, reste et taux ; périmètre Toutes les années explicite. |
| `/finance/versements` | Nom et matricule dans les transactions ; filtre étudiant commun aux transactions et soldes ; nouveau versement replié. |
| `/finance/rapports` | Totaux distincts des contrats nets, encaissements, reste et échu impayé ; méthode de calcul dépliable. |
| `/finance/contrats` | Contrats, année, bourse et reste visibles ; création/révision repliée, ouverture automatique depuis Définir/Réviser. |
| `/personnel/utilisateurs` | Identité, rôle, état, dernière modification et auteur ; création repliée et droits détaillés à la demande. |
| `/personnel/roles` | Catalogue compact et fiche du rôle à côté sur ordinateur ; sélection cible directement la fiche sur mobile. |
| `/personnel/permissions` | Comparaison, compteurs et matrice ; périmètres dépliables et introductions répétées retirées. |
| `/personnel/enseignants` | Annuaire, spécialité, affectations et état ; formulaire enseignant replié. |
| `/personnel` | Fonction, contacts, contrat et état ; ajout/modification repliés. |
| `/communication/annonces` | Formulaire de publication, destinataires et flux ; texte sur l’expiration raccourci. |
| `/communication/actualites` | Actualités actives, contenu, auteur et date ; introduction retirée. |
| `/logistique/achats` | Objet, fournisseur, montant, statut et décision ; nouvelle demande repliée. |
| `/logistique/inventaire` | Équipement, localisation, quantité et état ; formulaire replié et ouvert depuis Modifier. |
| `/systeme/journal` | Colonnes date/heure, auteur/rôle et action, avec recherche ; valeurs détaillées dépliables. |
| `/systeme/export` | Téléchargement JSON et limite de restauration ; introduction générique retirée. |
| `/systeme/support` | Demandes et état du traitement ; nouveau ticket replié. |

Le périmètre du rôle est consultable dans une ligne dépliable ; le texte de rappel répété en bas du menu est retiré. Sur mobile, les compteurs et les filtres utilisent deux colonnes pour rapprocher les listes du haut de page. Les écrans de connexion et d’aide restent disponibles avec leurs instructions de démonstration. Les dossiers étudiants conservent leur identité et leur contexte académique. Aucun changement de permissions ni de persistance n’est introduit par cette revue.

## Vérification

Lint, tests métier et build de production passent. Les 22 tests navigateur passent en 5,5 minutes, avec ouverture et fermeture des formulaires à 390 et 1440 px, revue des 35 pages et contrôle des 14 rôles à 320, 768, 1024 et 1440 px. Les parcours métier vérifient aussi les écrans remplis et les modifications depuis les listes. Résultats : `.tmp/clarity-final-results/` ; relevés par page : `.tmp/page-review/` ; captures : `.tmp/interface/`.

Après le dernier ajustement de largeur de la date, le build et le lint passent à nouveau. Un contrôle ciblé du rapport financier à 320 px confirme une date de 259 px de large, l’ouverture des règles de calcul, l’absence d’erreur JavaScript et de débordement. Capture relue : `.tmp/interface/320/finance-rapport-lisible-final.png`.

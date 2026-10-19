# Audit responsive ESCEN — après corrections (4C)

Date : 2026-10-19. 56 routes source couvertes, 71 écrans et variantes, 355 captures principales.

Build local optimisé, Chrome headless, hauteur 900 px, animations réduites. Une capture du haut de chaque écran et une capture complémentaire en bas lorsqu’il défile. Ce format conserve le défilement interne du portail. Données isolées et comptes authentifiés simulés ; aucun accès distant, aucune mutation.

Les captures reflètent l’arbre de travail actuel, y compris les modifications préexistantes à cette sous-étape.

Le périmètre couvre les routes du dépôt, les vues personnelles avec un compte étudiant et les collections du référentiel. Le site public distinct de cette application ne fait pas partie de ce dépôt. Les écrans modaux ne sont pas couverts par cette matrice des routes.

« OK » signifie : pas de débordement détecté, aucun contrôle hors largeur, pas de texte masqué détecté, tableaux et calendrier adaptés au seuil mobile, aucun échec de lecture ou de rendu. Les régions avec défilement horizontal volontaire sont relevées séparément. Ce relevé ne remplace pas une recette d’accessibilité complète.

| Écran | Route | 360 | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|---|
| Connexion | `/connexion` | OK | OK | OK | OK | OK |
| Mot de passe oublié | `/mot-de-passe-oublie` | OK | OK | OK | OK | OK |
| Réinitialiser le mot de passe | `/mot-de-passe-reinitialiser` | OK | OK | OK | OK | OK |
| Changement obligatoire du mot de passe | `/mot-de-passe-modifier` | OK | OK | OK | OK | OK |
| Mes épreuves en ligne | `/mon-espace/epreuves` | OK | OK | OK | OK | OK |
| Mon espace | `/mon-espace` | OK | OK | OK | OK | OK |
| Support technique | `/mon-espace/support` | OK | OK | OK | OK | OK |
| Annonces et actualités | `/mon-espace/annonces` | OK | OK | OK | OK | OK |
| Mes documents | `/mon-espace/documents` | OK | OK | OK | OK | OK |
| Mes frais et paiements | `/mon-espace/scolarite` | OK | OK | OK | OK | OK |
| Vue d’ensemble | `/tableau-de-bord` | OK | OK | OK | OK | OK |
| Rapports de pilotage | `/tableau-de-bord/rapports` | OK | OK | OK | OK | OK |
| Programmes de cours et matières | `/academique/filieres` | OK | OK | OK | OK | OK |
| Préparer et gérer l’année | `/academique/referentiel` | OK | OK | OK | OK | OK |
| Emploi du temps | `/academique/emploi-du-temps` | OK | OK | OK | OK | OK |
| Feuilles de présence | `/academique/presences` | OK | OK | OK | OK | OK |
| Notes et résultats | `/academique/notes` | OK | OK | OK | OK | OK |
| Réclamations académiques | `/academique/reclamations` | OK | OK | OK | OK | OK |
| Contrôles continus | `/academique/evaluations` | OK | OK | OK | OK | OK |
| Rattrapages | `/academique/rattrapages` | OK | OK | OK | OK | OK |
| Composition des épreuves | `/academique/sujets` | OK | OK | OK | OK | OK |
| Examens | `/academique/examens` | OK | OK | OK | OK | OK |
| Délibérations et relevés | `/academique/deliberations` | OK | OK | OK | OK | OK |
| Règles académiques à confirmer | `/academique/parametres` | OK | OK | OK | OK | OK |
| Dossiers et inscriptions | `/etudiants` | OK | OK | OK | OK | OK |
| Comptes étudiants | `/etudiants/comptes` | OK | OK | OK | OK | OK |
| Documents étudiants | `/etudiants/cartes` | OK | OK | OK | OK | OK |
| Réinscriptions et statuts | `/etudiants/parcours` | OK | OK | OK | OK | OK |
| Situation financière | `/finance` | OK | OK | OK | OK | OK |
| Versements et reçus | `/finance/versements` | OK | OK | OK | OK | OK |
| Rapports financiers | `/finance/rapports` | OK | OK | OK | OK | OK |
| Contrats étudiants et bourses | `/finance/contrats` | OK | OK | OK | OK | OK |
| Comptes du personnel | `/personnel/utilisateurs` | OK | OK | OK | OK | OK |
| Rôles ESCEN | `/personnel/roles` | OK | OK | OK | OK | OK |
| Matrice des permissions | `/personnel/permissions` | OK | OK | OK | OK | OK |
| Enseignants et affectations | `/personnel/enseignants` | OK | OK | OK | OK | OK |
| Dossiers du personnel | `/personnel` | OK | OK | OK | OK | OK |
| Annonces | `/communication/annonces` | OK | OK | OK | OK | OK |
| Articles | `/site-web/articles` | OK | OK | OK | OK | OK |
| Demandes en ligne | `/site-web/demandes` | OK | OK | OK | OK | OK |
| Formations et pièces | `/site-web/documents` | OK | OK | OK | OK | OK |
| Brochures | `/site-web/brochures` | OK | OK | OK | OK | OK |
| Demandes d’achat | `/logistique/achats` | OK | OK | OK | OK | OK |
| Fournisseurs | `/logistique/fournisseurs` | OK | OK | OK | OK | OK |
| Inventaire du site | `/logistique/inventaire` | OK | OK | OK | OK | OK |
| Données et contrôle de reprise | `/systeme/donnees` | OK | OK | OK | OK | OK |
| Journal d’activité | `/systeme/journal` | OK | OK | OK | OK | OK |
| Export du journal | `/systeme/export` | OK | OK | OK | OK | OK |
| Centre de support | `/systeme/support` | OK | OK | OK | OK | OK |
| Accueil academique | `/academique` | OK | OK | OK | OK | OK |
| Accueil marketing | `/communication` | OK | OK | OK | OK | OK |
| Accueil logistique | `/logistique` | OK | OK | OK | OK | OK |
| Accueil systeme | `/systeme` | OK | OK | OK | OK | OK |
| Dossier individuel étudiant | `/etudiants/ESCEN-TEST-001` | OK | OK | OK | OK | OK |
| Accueil étudiant | `/mon-espace` | OK | OK | OK | OK | OK |
| Ancienne adresse des actualités | `/communication/actualites` | OK | OK | OK | OK | OK |
| Racine du site | `/` | OK | OK | OK | OK | OK |
| Référentiel · Filières | `/academique/filieres?collection=programs` | OK | OK | OK | OK | OK |
| Référentiel · Parcours | `/academique/filieres?collection=tracks` | OK | OK | OK | OK | OK |
| Référentiel · Matières | `/academique/filieres?collection=subjects` | OK | OK | OK | OK | OK |
| Référentiel · Programmes de formation | `/academique/filieres?collection=curricula` | OK | OK | OK | OK | OK |
| Référentiel · Semestres du programme | `/academique/filieres?collection=curriculum_semesters` | OK | OK | OK | OK | OK |
| Référentiel · Unités d’enseignement | `/academique/filieres?collection=teaching_units` | OK | OK | OK | OK | OK |
| Référentiel · Matières du programme | `/academique/filieres?collection=curriculum_components` | OK | OK | OK | OK | OK |
| Référentiel · Années universitaires | `/academique/referentiel?collection=academic_years` | OK | OK | OK | OK | OK |
| Référentiel · Formations de l’année | `/academique/referentiel?collection=academic_offerings` | OK | OK | OK | OK | OK |
| Référentiel · Cycles | `/academique/referentiel?collection=cycles` | OK | OK | OK | OK | OK |
| Référentiel · Niveaux | `/academique/referentiel?collection=levels` | OK | OK | OK | OK | OK |
| Référentiel · Groupes | `/academique/referentiel?collection=groups` | OK | OK | OK | OK | OK |
| Référentiel · Groupes et formations | `/academique/referentiel?collection=group_offerings` | OK | OK | OK | OK | OK |
| Référentiel · Salles | `/academique/referentiel?collection=rooms` | OK | OK | OK | OK | OK |

## Problèmes constatés

Aucun problème détecté par les contrôles automatisés.

## Vérification des constats CSS dans le code actuel

- Définitions de `:root` dans globals.css : 1.
- Définitions de `--sidebar-width` : 1.
- Seuils max-width de globals.css : 480, 768, 1024 px.
- La transformation des tableaux en fiches et la liste du calendrier mobile sont contrôlées dans les pages où ces composants sont présents.

## Défilements horizontaux internes

- Annonces et actualités — 360px : nav.record-sections Données disponibles
- Mes documents — 360px : nav.record-sections Données disponibles
- Mes frais et paiements — 360px : nav.record-sections Données disponibles
- Versements et reçus — 360px : nav.record-sections Données disponibles
- Rapports financiers — 360px : nav.record-sections Données disponibles
- Contrats étudiants et bourses — 360px : nav.record-sections Données disponibles
- Matrice des permissions — 360px : div.table-wrap DomaineActionInformaticienDirecteur GénéralRéférentiel académique
- Demandes d’achat — 360px : nav.record-sections Données disponibles
- Dossier individuel étudiant — 360px : nav.record-sections Sections du dossier étudiant
- Annonces et actualités — 390px : nav.record-sections Données disponibles
- Mes documents — 390px : nav.record-sections Données disponibles
- Mes frais et paiements — 390px : nav.record-sections Données disponibles
- Versements et reçus — 390px : nav.record-sections Données disponibles
- Contrats étudiants et bourses — 390px : nav.record-sections Données disponibles
- Matrice des permissions — 390px : div.table-wrap DomaineActionInformaticienDirecteur GénéralRéférentiel académique
- Demandes d’achat — 390px : nav.record-sections Données disponibles
- Dossier individuel étudiant — 390px : nav.record-sections Sections du dossier étudiant
- Mes frais et paiements — 1024px : div.table-wrap InscriptionPayeurMontant FCFAÉtatDate du versementMode de paiemen
- Emploi du temps — 1024px : div.schedule-calendar-scroll LundiMardiMercrediJeudiVendrediSamediDimanche12345678910111213141
- Contrôles continus — 1024px : section.card.card-full Rechercher une épreuveFiltrer par groupeTous les groupes (1)Group
- Examens — 1024px : section.card.card-full Rechercher une épreuveFiltrer par groupeTous les groupes (2)Group
- Dossiers et inscriptions — 1024px : div.table-wrap MatriculeNom completNationalitéFilière / NiveauSituation financiè
- Situation financière — 1024px : section.card.card-full Rechercher un étudiant ou une formationMontant contractuel1 200 F
- Versements et reçus — 1024px : div.table-wrap InscriptionPayeurMontant FCFAÉtatDate du versementMode de paiemen
- Rapports financiers — 1024px : div.table-wrap InscriptionPayeurMontant FCFAÉtatDate du versementMode de paiemen
- Référentiel · Matières du programme — 1024px : section.card.card-full RechercherAfficherEnregistrements disponiblesEnregistrements arch

Captures et index visuel : `tmp/screenshots/responsive-audit/after/index.html`.

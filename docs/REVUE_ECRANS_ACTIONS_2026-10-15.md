# Revue des écrans et actions — 15 octobre 2026

## Périmètre et preuves

Revue locale du portail sur ordinateur (1440 px) et mobile (390 px), avec API et identités de test isolées. Les opérations sensibles sont exercées dans ces fixtures et dans PostgreSQL local, sans écriture distante sur les dossiers réels. Le contrôle des routes et captures complète les scénarios de formulaires, confirmations, erreurs, rechargement, rôles et contexte annuel.

L’inventaire des clics porte sur les boutons initialement visibles de chaque page. Les tests spécialisés couvrent les étapes suivantes des parcours. Cela ne constitue pas une preuve de toutes les combinaisons possibles de données, permissions ou fenêtres imbriquées.

- 390 px : 45 URL, 124 actions inventoriées, 7 actions désactivées, 0 erreur JavaScript.
- 1440 px : 45 URL, 138 actions inventoriées, 7 actions désactivées, 0 erreur JavaScript.

Preuves : `.tmp/interface/actions-390.json`, `actions-1440.json`, `review-390.json`, `review-1440.json` et captures dans `.tmp/interface/390/` et `.tmp/interface/1440/`.

## Défauts corrigés

- Les compteurs d’accueil lisaient les sauvegardes, y compris des lignes non reprises. Ils lisent désormais les tables métier de la consultation courante.
- Les pages de finance et de notes pouvaient substituer des données source à un résultat métier vide. Un résultat vide reste maintenant vide dans ces rubriques ; aucun changement silencieux d’origine.
- Le support affichait des catégories source à la place des demandes lorsqu’aucun ticket n’existait. Il affiche les demandes réelles, même si la liste est vide.
- Les évaluations reprises dans les tables métier étaient masquées par la priorité donnée à l’ancien lecteur. Elles sont consultables dans les pages ordinaires : catégorie, formation, groupe, statut, recherche, export, candidats, notes et présence. Les copies utilisent une correspondance de provenance exacte ; les liens directs existants restent utilisables. Lorsqu’un lien correspond à plusieurs formations, l’utilisateur choisit explicitement l’épreuve ; aucune première correspondance n’est choisie arbitrairement.
- La situation financière affichait une liste technique de contrats. Elle affiche désormais contrats, montants payés et soldes par inscription et année, avec filtres et export. Les situations non établies sont signalées et exclues des totaux. Les paiements en attente restent exclus des montants payés.
- Le statut des paiements manquait dans les listes et exports financiers. Il est affiché. Les filtres de période et exports de tous les résultats sont conservés sur les données métier.
- Un dossier neuf sans inscription était présenté comme une inscription « à reprendre », avec un « historique financier à consulter ». Les libellés décrivent maintenant l’absence réelle d’inscription ou de situation établie.
- Le rechargement après création pouvait interrompre l’ouverture du nouveau dossier sur mobile. Le rafraîchissement préserve maintenant l’écran. Les doubles rechargements dans la validation des propositions annuelles ont aussi été retirés.
- 97 emplacements d’actions compactes utilisent un composant d’icône commun avec nom accessible, infobulle, focus visible et cible tactile de 44 px. Les confirmations conservent leurs libellés explicites.
- Les référentiels présentent les enregistrements dans la même liste avec les informations manquantes à compléter, sans qualifier les données importées d’archives dans leurs actions ordinaires. Le menu Finance renvoie la configuration des tarifs à la préparation annuelle.
- La recherche générale avait son texte sous la loupe à cause de la priorité du style universel des champs. Le retrait gauche est rétabli.
- Les API publiques du site validaient leur configuration serveur avant de refuser une origine ou un jeton invalide. Les entrées invalides sont maintenant refusées avant l’accès au service.
- Les scripts Next.js utilisaient une syntaxe de variables Unix inexécutable sous Windows. Le lanceur Node fonctionne sur les deux systèmes. Le contrôle du catalogue prend désormais en compte les colonnes ajoutées par migration.

## Comportements encore incomplets

Les points ci-dessous restent des limites fonctionnelles réelles. Leur affichage en consultation ne prouve pas un parcours de gestion complet. La présente correction ne les transforme pas en écritures simulées ou en validations institutionnelles inventées.

| Rubrique | Limite constatée |
| --- | --- |
| Emploi du temps | Création, déplacement et annulation connectés non activés. |
| Présences | Saisie et validation connectées non activées. |
| Notes | Saisie, contrôle, validation, publication et corrections connectés non activés dans cet écran. |
| Réclamations | Dépôt et traitement connectés non activés. |
| Jurys et règlement | Délibération et activation du règlement non disponibles ; règles institutionnelles à confirmer. |
| Documents étudiants | Génération et validation de cartes et certificats non activées. |
| Achats | Soumission, approbation et réception connectées non activées. |
| Support | Ouverture et traitement connectés des tickets non activés. |
| Annonces | Publication connectée non activée ; les articles du site disposent de leur parcours distinct. |
| Export système | Export de journal, pas une sauvegarde complète ni une restauration de la base. |
| Sources non reprises | Les relations manquantes restent à vérifier. Les données originales sont préservées et aucune inscription ou équivalence n’est inventée. |

La copie Nuxt du site doit être démarrée séparément pour les scénarios de bout en bout avec `ESCEN_TEST_WEBSITE_URL`. Les fixtures du portail ne valident pas cette connexion réelle.

## Inventaire par écran

| URL | Écran | Actions initiales distinctes inventoriées (ordinateur) |
| --- | --- | ---: |
| /mon-espace | Votre espace de gestion | 1 |
| /mon-espace/support | Support technique | 4 |
| /mon-espace/annonces | Annonces et actualités | 3 |
| /mon-espace/documents | Mes documents | 1 |
| /mon-espace/scolarite | Ma scolarité | 1 |
| /tableau-de-bord | Vue d’ensemble | 1 |
| /tableau-de-bord/rapports | Rapports de pilotage | 1 |
| /academique/filieres | Filières, parcours et matières | 4 |
| /academique/referentiel | Années scolaires | 2 |
| /academique/emploi-du-temps | Emploi du temps | 7 |
| /academique/presences | Feuilles de présence | 1 |
| /academique/notes | Notes et résultats | 2 |
| /academique/reclamations | Réclamations académiques | 4 |
| /academique/evaluations | Contrôles continus | 1 |
| /academique/rattrapages | Rattrapages | 1 |
| /academique/sujets | Bibliothèque des sujets | 2 |
| /academique/examens | Examens | 2 |
| /academique/deliberations | Délibérations et relevés | 2 |
| /academique/parametres | Règles académiques à confirmer | 1 |
| /etudiants | Dossiers étudiants | 6 |
| /etudiants/comptes | Comptes étudiants | 7 |
| /etudiants/cartes | Documents étudiants | 2 |
| /etudiants/parcours | Réinscriptions | 3 |
| /finance | Situation financière | 2 |
| /finance/versements | Versements et reçus | 6 |
| /finance/rapports | Rapports financiers | 5 |
| /finance/contrats | Contrats, frais et bourses | 5 |
| /personnel/utilisateurs | Comptes du personnel | 7 |
| /personnel/roles | Rôles ESCEN | 15 |
| /personnel/permissions | Matrice des permissions | 2 |
| /personnel/enseignants | Enseignants et affectations | 3 |
| /personnel | Dossiers du personnel | 2 |
| /communication/annonces | Annonces | 3 |
| /communication/actualites | Actualités institutionnelles | 4 |
| /logistique/achats | Demandes d’achat | 6 |
| /logistique/fournisseurs | Fournisseurs | 2 |
| /logistique/inventaire | Inventaire | 2 |
| /systeme/donnees | Données et contrôle de reprise | 2 |
| /systeme/journal | Journal d’activité | 1 |
| /systeme/export | Export du journal | 3 |
| /systeme/support | Centre de support | 4 |
| /academique | Pédagogie | 1 |
| /communication | Communication | 1 |
| /logistique | Achats & Logistique | 1 |
| /systeme | Administration | 1 |
| /etudiants/ESCEN-TEST-001 | Alice Exemple | 0 |

La fiche individuelle est exercée par les recettes de dossier, CRUD, contexte documentaire, clarté des parcours et opérations étudiantes ; ses boutons ne sont pas compris dans l’inventaire automatique des 45 URL.

## Validation

- `npm run lint` et `npm run build` réussis sur la dernière version.
- `npm run test` réussi : contrôles des services et 44 groupes de contrôles PostgreSQL locaux.
- Série élargie : 103 scénarios navigateur exécutés, 100 réussis et 3 ignorés car la copie Nuxt externe n’est pas lancée. Trace textuelle : `.tmp/operational-final.log`.
- Recette après les derniers libellés : 17 tests réussis, aucune erreur ni instabilité, rapport `.tmp/operational-recheck-results.json`.
- Recette finale des données métier et liens partagés entre formations : 2 tests réussis, aucune erreur ni instabilité, rapport `.tmp/operational-native-final-results.json`.

Le premier lancement élargi est resté bloqué pendant l’arrêt automatique du serveur Windows après la fin des scénarios et a été interrompu. Les relances utilisent un serveur lancé séparément et se terminent avec leurs rapports JSON.

Captures avec données de test : [situation financière mobile](../.tmp/interface/390/finance-operationnelle.png), [situation financière ordinateur](../.tmp/interface/1440/finance-operationnelle.png), [épreuve sur ordinateur](../.tmp/interface/1440/epreuve-operationnelle.png).

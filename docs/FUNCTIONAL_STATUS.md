# Statut fonctionnel ESCEN

Mise à jour : 13 octobre 2026.

## Phase actuelle

Front-end fonctionnel en mémoire, conformément à la demande de terminer d’abord l’interface. Aucun serveur de données ni système de connexion réel n’est intégré. Les données et pièces jointes sont perdues au rafraîchissement. L’interface ne doit pas être présentée comme une application de production avec sauvegarde.

Le guide interactif, son bouton d’aide, les surbrillances d’onboarding et les emojis décoratifs sont retirés. Les étapes visibles dans les notes décrivent uniquement leur état de traitement.

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
| Examens | Planification de première session et de rattrapage, compte surveillant actif, conflits, séance liée et annulation cohérente ; feuille d’émargement imprimable. |
| Notes | Brouillon → saisie → soumission → contrôle → validation → publication. Notes de devoir, examen, projet, TP et rattrapage. Consultation personnelle après publication, export CSV et historique. |
| Réclamations | Dépôt personnel, analyse, transmission, avis enseignant, décision académique, correction avec ancienne/nouvelle valeur et clôture. Formulaires intégrés à la page. |
| Jury | Pondération contrôle continu/examen, seuils, compensation et budget semestriel configurables. Calcul des moyennes et crédits ; décision du DA avec motif et instantané des règles et notes. Export CSV et relevé imprimable. |
| Contrats | Scolarité annuelle, frais d’inscription et annexes ; bourse sur la scolarité ; révision motivée sans effacement des encaissements ; échéances et reliquat. |
| Versements | Montants entiers en FCFA, référence unique, versements partiels, reçu, solde par année et règlement d’une créance antérieure. Modes espèces, Mobile money, virement, chèque et carte. |
| Annulations financières | DG uniquement, motif obligatoire ; transaction, reçu et historique conservés, solde de l’année concernée recalculé. |
| Personnel | Utilisateurs simulés, activation/désactivation motivée, consultation des autorisations, dossiers permanents/vacataires/stagiaires et export CSV. |
| Logistique | Demande d’achat par les achats, approbation/refus DG ou RAF, réception par les achats. Inventaire par les achats ou le responsable de site. Exports CSV. |
| Communication | Diffusion générale, étudiants/délégués, enseignants ou surveillants. Filtrage des annonces selon l’audience. |
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

Les assertions de services, le lint et le build vérifient les parcours et les types. La suite Playwright couvre les menus des 14 rôles, l’absence de guide/emoji, un parcours métier complet et la navigation/recherche à 390 px. Les résultats d’exécution doivent être distingués de la couverture déclarée par les tests.

Vérification du 13 octobre 2026 : `npm run lint`, `npm run test` et le build de production isolé passent. Les sept tests d’interface passent également (19,4 secondes) : 14 rôles, parcours de création jusqu’à la délibération et au dépôt d’une pièce, navigation à 390 px, connexion et déconnexion, accès directs et historique, refus selon le rôle, aide au mot de passe et page 404. Cette exécution utilise Chrome hors sandbox, le sandbox empêchant son démarrage. Les captures de connexion et du portail sur ordinateur/mobile ont été relues lors de la vérification précédente ; cette reprise confirme les assertions automatisées.

Le backend, l’authentification, le stockage des fichiers, les sauvegardes/restaurations de données et les contrôles de permissions côté serveur restent à intégrer après validation du front. L’export du journal ne sauvegarde pas les dossiers. Mobile money est un mode de comptabilisation d’un versement déjà reçu, sans appel à un opérateur de paiement.

L’admission/CRM et le portail public restent hors périmètre. Les transferts de crédits externes, diplômes nationaux, paie complète et comptabilité générale nécessitent des parcours spécifiques avant d’être considérés comme couverts.

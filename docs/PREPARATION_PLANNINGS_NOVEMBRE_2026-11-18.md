# Préparation des emplois du temps de novembre — 18 novembre 2026

## Sources et lecture

Sept PDF d’emplois du temps récemment téléchargés ont été examinés dans le dossier Téléchargements. Les grilles ont été extraites avec PyMuPDF puis contrôlées visuellement. Les documents originaux sont conservés ; les copies rendues, empreintes SHA-256, textes extraits, grilles et plan détaillé sont dans `tmp/timetables-november-2026/`.

La lecture du contenu prime sur le nom du fichier. Pour L3 IA & GL, la révision spécifique du 16 au 21 novembre remplace la partie correspondante du planning plus large du 9 au 21 novembre, y compris ses cases vides. Aucun cours de l’ancien samedi 21 novembre ne doit être reconduit.

## Résultat préparé avant insertion

- 101 occurrences de cours, avant regroupement des cours communs.
- 2 occurrences d’examen T.E.E.O. et 1 devoir de statistiques, le 16 novembre, pour les groupes L1 concernés.
- 16 cases de grille ANCI, correspondant à la participation des groupes L2 et L3 IA & GL les 19 et 20 novembre à l’Hôtel Sarakawa ; elles ne représentent pas 16 événements distincts.
- 48 occurrences de cours ont déjà une affectation exacte dans le portail. Les autres nécessitent un rapprochement ou des données pédagogiques supplémentaires.

## Points à confirmer avant insertion

1. Le fichier `EMPLOI DU TEMPS L2 IA & GL Sem3 Nov 2026.pdf` mentionne dans son contenu la période du 12 au 24 octobre 2026. Il est exclu de la proposition de novembre en attendant confirmation.
2. La route actuelle de programmation impose une adresse personnelle de l’enseignant. Les enseignants déjà affectés aux 48 occurrences reconnues ont principalement leur adresse ESCEN. L’utilisateur a explicitement autorisé une exception limitée à cet import, sans création de compte ni notification. Le contrôle de l’application reste inchangé.
3. Les profils de GBENYEDI, LAOUROU, ATSU, ADODO et du professeur d’ALMEIDA n’ont pas été identifiés dans le portail ni confirmés par l’annuaire Microsoft. Les comptes étudiants portant le nom d’ALMEIDA ne sont pas des profils enseignants et ne doivent pas être réutilisés.
4. La maquette active de Licence 3 IA ne contient pas encore les UE, composants et affectations nécessaires à ces PDF. Les crédits, coefficients et regroupements pédagogiques ne doivent pas être inventés.
5. `Pratique de Gestion Financière d’un Projet E-Commerce` et `Exposé sur la Transformation digitale Avancée` ne sont pas assimilés automatiquement aux intitulés différents déjà présents dans les affectations L2 TC.
6. Les épreuves et l’événement ANCI nécessitent une organisation distincte des cours ordinaires. Aucun faux cours ANCI ni sujet d’examen n’a été créé.

## Outils et vérifications

`prepare-timetable-import.py` produit uniquement un plan de relecture, vérifie l’intégrité des sources et refuse les versions concurrentes de même priorité. Il ne possède aucun accès en écriture au portail.

`verify-timetable-import.py` contrôle les 120 occurrences extraites, l’année, les groupes, les affectations reconnues, l’absence de doublons, l’exclusion de la date contradictoire et la priorité de la révision L3. Les données de snapshot restent dans `tmp/` et ne sont pas ajoutées au dépôt.

## Insertion autorisée et effectuée

La réponse « oui oui go » à la demande explicite d’exception autorise l’import des occurrences déjà rattachées avec les profils enseignants existants. `import-reviewed-november-timetable.mjs` limite son périmètre aux 48 occurrences reconnues, contrôle les empreintes des PDF et recharge les données en ligne avant toute écriture.

Le contrôle a identifié six occurrences incompatibles : anglais des L1 TC, L1 IA et L2 IA, les 16 et 17 novembre à 15 h. Les affectations L1 et L2 utilisent deux identifiants de matière distincts ; les fusionner dépasse l’import et créer des séances séparées placerait le même enseignant en conflit. Les six occurrences restent donc en attente, sans modification des matières ou des affectations.

Les 42 autres occurrences ont été insérées dans une seule transaction auditée, de la révision 210 à la révision 211 : 40 séances et deux participants supplémentaires. Les deux séances communes de statistiques des L1, les 18 et 19 novembre à 12 h 30, ont chacune deux groupes participants. Les salles reprennent les correspondances déjà confirmées pour octobre ; les cours communs utilisent la Salle des L1.

Le script vérifie les conflits de groupe, d’enseignant et de salle, les périodes bloquées, les réservations d’examen, les dates d’affectation, l’année ouverte et les profils actifs. Les contraintes SQL existantes restent actives, notamment les dates de semestre et la compatibilité des participants. La relecture après écriture confirme les champs des séances et leurs participants. Une nouvelle préparation reconnaît les séances existantes sans proposer de doublons.

Aucun compte, enseignant, matière, affectation, lien Teams ou notification n’a été créé. Aucune migration n’a été appliquée. L’application relit les séances persistées via son actualisation habituelle ; aucun changement de code déployé n’est nécessaire. Les 53 occurrences sans affectation, les six occurrences d’anglais, les évaluations, l’ANCI et le PDF aux dates contradictoires restent en attente.

Les reçus et snapshots privés sont conservés sous `tmp/timetables-november-2026/` ; ils ne sont pas versionnés.

Vérifications réussies : `npx tsc --noEmit --incremental false`, `npm run lint`, `npm test` (dont les contraintes et RPC de planning et de cours communs), relecture en ligne et seconde préparation proposant zéro opération pour les 40 séances existantes. Aucun écran n’a été modifié.

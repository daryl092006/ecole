# Préparation des emplois du temps de novembre — 18 novembre 2026

## Sources et lecture

Sept PDF d’emplois du temps récemment téléchargés ont été examinés dans le dossier Téléchargements. Les grilles ont été extraites avec PyMuPDF puis contrôlées visuellement. Les documents originaux sont conservés ; les copies rendues, empreintes SHA-256, textes extraits, grilles et plan détaillé sont dans `tmp/timetables-november-2026/`.

La lecture du contenu prime sur le nom du fichier. Pour L3 IA & GL, la révision spécifique du 16 au 21 novembre remplace la partie correspondante du planning plus large du 9 au 21 novembre, y compris ses cases vides. Aucun cours de l’ancien samedi 21 novembre ne doit être reconduit.

## Résultat préparé — aucune écriture en ligne à ce stade

- 101 occurrences de cours, avant regroupement des cours communs.
- 2 occurrences d’examen T.E.E.O. et 1 devoir de statistiques, le 16 novembre, pour les groupes L1 concernés.
- 16 cases de grille ANCI, correspondant à la participation des groupes L2 et L3 IA & GL les 19 et 20 novembre à l’Hôtel Sarakawa ; elles ne représentent pas 16 événements distincts.
- 48 occurrences de cours ont déjà une affectation exacte dans le portail. Les autres nécessitent un rapprochement ou des données pédagogiques supplémentaires.

## Points à confirmer avant insertion

1. Le fichier `EMPLOI DU TEMPS L2 IA & GL Sem3 Nov 2026.pdf` mentionne dans son contenu la période du 12 au 24 octobre 2026. Il est exclu de la proposition de novembre en attendant confirmation.
2. La route actuelle de programmation impose une adresse personnelle de l’enseignant. Les enseignants déjà affectés aux 48 occurrences reconnues ont principalement leur adresse ESCEN. Une demande explicite d’exception pour cet import, sans création de compte ni notification, a été présentée à l’utilisateur ; aucune exception n’est présumée acquise.
3. Les profils de GBENYEDI, LAOUROU, ATSU, ADODO et du professeur d’ALMEIDA n’ont pas été identifiés dans le portail ni confirmés par l’annuaire Microsoft. Les comptes étudiants portant le nom d’ALMEIDA ne sont pas des profils enseignants et ne doivent pas être réutilisés.
4. La maquette active de Licence 3 IA ne contient pas encore les UE, composants et affectations nécessaires à ces PDF. Les crédits, coefficients et regroupements pédagogiques ne doivent pas être inventés.
5. `Pratique de Gestion Financière d’un Projet E-Commerce` et `Exposé sur la Transformation digitale Avancée` ne sont pas assimilés automatiquement aux intitulés différents déjà présents dans les affectations L2 TC.
6. Les épreuves et l’événement ANCI nécessitent une organisation distincte des cours ordinaires. Aucun faux cours ANCI ni sujet d’examen n’a été créé.

## Outils et vérifications

`prepare-timetable-import.py` produit uniquement un plan de relecture, vérifie l’intégrité des sources et refuse les versions concurrentes de même priorité. Il ne possède aucun accès en écriture au portail.

`verify-timetable-import.py` contrôle les 120 occurrences extraites, l’année, les groupes, les affectations reconnues, l’absence de doublons, l’exclusion de la date contradictoire et la priorité de la révision L3. Les données de snapshot restent dans `tmp/` et ne sont pas ajoutées au dépôt.

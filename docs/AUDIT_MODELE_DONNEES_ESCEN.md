# Audit des tables, attributs et relations ESCEN

Date : 14 octobre 2026. Analyse demandée avant la création du projet Supabase.

## Conclusion

Le modèle source possède une vraie structure métier, mais il ne doit pas être repris tel quel. Des relations importantes ne sont pas protégées, certaines contraintes sont incorrectes et des références orphelines existent déjà dans les données. Le modèle TypeScript du prototype est plus simple et ne représente pas toute la richesse de la source. Brancher directement l'un ou l'autre à Supabase reproduirait ces lacunes.

L'absence de persistance du prototype était volontaire ; elle n'est pas comptée comme un défaut de conception dans cet audit. Le problème examiné est la qualité des entités, attributs, cardinalités, contraintes et historiques.

## Sources et méthode

- Lecture des 140 CREATE TABLE de `database.sql` dans la sauvegarde complète du 14 octobre à 11 h 41 ; aucun SQL exécuté, aucune restauration.
- Inventaire des 1 361 colonnes, clés primaires, clés uniques, index et 68 clés étrangères explicites. Le dump ne contient pas d'ALTER TABLE complémentaire.
- Analyse des 207 instructions INSERT : 15 566 lignes, réparties dans 68 tables non vides. Ce total inclut les données techniques, les historiques et les options/réponses d'examens ; il ne représente pas un effectif étudiant.
- Vérification des 68 relations explicites, de relations métier inférées par leurs attributs, de plusieurs unicités attendues, de concordances d'année/niveau/UE et de bornes simples.
- Comparaison avec `src/types/academic.ts`, `student.ts`, `finance.ts`, `schedule.ts`, `application.ts`, `user.ts` et les services métier du prototype.
- Aucun nom, email, mot de passe, jeton ou contenu de document n'est reproduit dans ce rapport ou ses annexes.

Annexes : [inventaire complet](INVENTAIRE_SCHEMA_ESCEN_2026-10-14.md), [résultats agrégés des contrôles](CONTROLES_DONNEES_ESCEN_2026-10-14.json).

Une référence métier inférée n'est pas une FK déclarée. Une relation polymorphe nécessite de connaître son type ; elle ne peut pas être contrôlée en comparant seulement son identifiant. Le code du backend d'origine n'est pas disponible : des validations applicatives peuvent exister, mais elles ne corrigent pas les anomalies présentes dans l'export.

## Anomalies constatées dans les données

| Constat | Nombre | Conséquence |
|---|---:|---|
| `notes.etudiant_id` absent de `etudiants.id` | 60 lignes de notes | Notes sans étudiant retrouvable dans cet export. |
| `notes.evaluation_id` absent de `evaluations.id` | 71 lignes de notes | Épreuve, barème et contexte impossibles à retrouver par cette relation. |
| `releve_notes.etudiant_id` absent de `etudiants.id` | 14 relevés sur 15 | Rattachement étudiant à résoudre avant reprise des résultats. |
| `unite_valeurs.filiere_id` absent de `filieres.id` | 4 UV | Maquette pédagogique incomplètement rattachée. |
| `filiere_group.filiere_id` absent de `filieres.id` | 1 association | Groupe associé à une filière absente. |
| `role_user.role_id` absent de `roles.id` | 4 attributions | Droits impossibles à interpréter complètement. |
| Couples permission/rôle répétés dans `permission_role` | 17 lignes surnuméraires | Absence d'unicité fonctionnelle dans la matrice de droits. |
| `etudiant_group.annee_scolaire_id` différent de l'année de `groups` | 2 inscriptions | Deux années contradictoires pour une même affectation. |
| Attribution `bourse_etudiants` sans étudiant et sans bourse retrouvables | 1 attribution | L'unique attribution présente pointe vers deux parents absents ; la table `bourses` est vide. |
| `candidatures.filiere_id` absent de `filieres.id` | 9 candidatures | Données historiques à conserver ; domaine hors périmètre actuel, sans développement de l'admission. |

Ces comptes peuvent concerner les mêmes enregistrements : ils ne doivent pas être additionnés comme un nombre de dossiers distincts. Ils prouvent des références absentes dans cette sauvegarde, pas la cause de leur disparition. Suppression passée, export incomplet ou autre mécanisme : à investiguer.

Les contrôles n'ont pas trouvé de parent absent pour les 68 FK effectivement déclarées. Aucun doublon de matricule étudiant, email non vide ou couple note/évaluation/étudiant n'a été détecté dans les contrôles effectués. Les notes présentes sont dans [0,20], les 62 paiements ont des montants positifs, une année et une référence, et les annulations présentes ne manquent pas de motif/date/auteur. Ces résultats ne certifient pas l'intégralité des calculs financiers ou pédagogiques.

## Défauts structurels prioritaires

### 1. Présences : une clé unique interdit le fonctionnement normal — P0

`presences` contient `UNIQUE cours_etudiant_unique_presence(etudiant_id)`, en plus de `UNIQUE(seance_id, etudiant_id)`. La première contrainte interdit une deuxième ligne de présence pour le même étudiant, même pour une autre séance. Ce défaut est certain d'après le DDL ; la table est vide, il n'est donc pas observé sur un parcours enregistré.

La présence doit être rattachée à une occurrence de séance et à une inscription/candidat. Prévoir une unicité adaptée à cette occurrence ; une FK de séance nullable demande aussi de traiter le cas sans séance, sinon l'unicité composite laisse passer certains doublons.

### 2. Identité des étudiants dans les examens — P0

`exam_sessions.etudiant_id` référence `users.id`, tandis que `exam_submissions.etudiant_id` référence `etudiants.id`. Les deux espaces d'identifiants sont indépendants. Cette divergence doit être résolue explicitement. `exam_sessions` est vide ; aucun rattachement erroné de session n'est démontré dans les données. En revanche, 3 171 réponses sont présentes dans `exam_submissions`.

Séparer le compte de connexion, le profil étudiant et son inscription annuelle ; relier une tentative au candidat et au compte autorisé sans supposer que leurs identifiants sont interchangeables.

### 3. Relations critiques non contraintes — P0

Exemples : `notes` n'a aucune FK malgré ses identifiants étudiant, année, UV et évaluation ; `etudiant_group` protège filière et niveau, mais pas étudiant, groupe et année ; `frais_etudiants`, `echeanciers`, `echeances`, `user_unite_valeur` n'ont pas de FK ; `paiements` ne protège explicitement que l'année.

Un index nommé `..._foreign` accélère une recherche, mais ne vérifie ni l'existence du parent ni la suppression. Les anomalies constatées montrent que cette distinction est matérielle. Les liens doivent être documentés puis contraints après résolution des données orphelines.

### 4. Suppressions en cascade incompatibles avec la conservation métier — P0

Le dump déclare 38 FK avec `ON DELETE CASCADE`. Toutes ne sont pas incorrectes, mais certaines sont sensibles : supprimer une année supprime ses paiements ; supprimer un niveau supprime ses lignes `etudiant_group` ; supprimer une matière supprime ses UV ; supprimer une évaluation ou une question supprime des réponses d'examen.

Définir pour chaque relation la politique de suppression. Années, inscriptions, paiements, notes et copies doivent conserver leur historique ; une désactivation ou un archivage avec restriction de suppression sera généralement nécessaire. Ne pas changer les cascades globalement sans analyser leurs usages.

### 5. Année, filière et niveau répétés sans garantie de concordance — P0

Année et contexte pédagogique sont répétés dans groupes, inscriptions, périodes, UE, UV, évaluations et notes. Une FK simple garantit l'existence d'une année, mais pas sa concordance avec celle du parent. Les deux inscriptions contradictoires en sont un exemple réel.

Choisir les relations qui font autorité. Les attributs répétés comme instantané historique doivent être identifiés et figés ; les attributs relationnels doivent respecter des contraintes de concordance. Ne pas déduire le cursus d'une note à partir du groupe actuel de l'étudiant.

### 6. Inscription annuelle et changement de groupe insuffisamment modélisés — P1

`etudiant_group` rassemble étudiant, groupe, filière, niveau, année, mode de formation et statut. Il manque une date d'inscription, un auteur, un motif et des dates d'effet pour reconstruire les mouvements. Aucune unicité autre que `id` n'est déclarée. Un doublon peut être une erreur ou un changement de groupe légitime : la règle ne doit pas être devinée.

Le prototype ajoute `Enrollment`, mais stocke filière et niveau comme textes et duplique la situation courante dans `Student`. Il faut distinguer inscription annuelle, parcours choisi et historique des affectations à un groupe. Définir les cardinalités pour redoublement, réorientation et changement en cours d'année.

### 7. Maquette pédagogique et capitalisation des crédits — P1

Points solides de la source : séparation `matieres` / `unite_valeurs` / `unite_enseignements`, périodes, coefficients, volume horaire et pondérations. Points faibles : filière reliée directement à une année et simultanément par `annee_filiere` ; UE sans niveau direct ; UV avec période par défaut à 1, UE nullable, coefficient nullable et heures CM/TD/TP/EC en `varchar`. Aucun crédit propre à l'UV n'est déclaré, alors que `uv_validations.credit_obtenu` existe.

Il faut une maquette annuelle/versionnée par formation, parcours, niveau et semestre, et une règle explicite de distribution des crédits entre UE et éléments constitutifs. Le prototype ne possède pas les volumes horaires ni une maquette de parcours ; `Subject.credits` existe, mais n'est pas une équivalence automatique avec le schéma source.

### 8. Affectations enseignants sans périmètre de groupe complet — P1

`user_unite_valeur` relie enseignant/UV/année sans groupe, dates d'effet ou volume affecté. `matiere__users` propose un second rattachement dont les types `int` diffèrent des `bigint unsigned` des parents supposés. Les deux modèles doivent être expliqués, pas fusionnés automatiquement.

Le prototype dispose de `TeachingAssignment` avec enseignant, matière, groupe, semestre et année : c'est une amélioration de périmètre. Il manque encore un rattachement explicite entre compte utilisateur et enseignant, les remplacements et les dates de validité.

### 9. Notes, publication et réclamations : statuts trop pauvres dans la source — P1

`evaluations.published` et deux dates de correction ne représentent pas les six états du workflow des notes. `reclamations.statut` n'a que `en_attente`, `approuvee`, `rejetee`, sans les sept étapes requises. `notes` n'a pas d'unicité étudiant/évaluation ni de contrôle de borne de note. `notes.ue_id` est un texte, pas une relation typée vers une UE.

`notes_historique` conserve ancienne/nouvelle note, auteur et réclamation, mais pas de motif dédié ; `note_variations` stocke des valeurs anciennes/nouvelles sous forme de textes. Ces historiques constituent des sources à préserver et à rapprocher, pas une garantie commune de journal complet.

Le prototype possède les états et corrections motivées. Il reste à matérialiser note, état, transition, décision et version de publication dans un modèle relationnel, et à rattacher explicitement les rattrapages à leur première session.

### 10. Deux familles concurrentes pour les examens en ligne — P1

La source possède `parts` / `evaluation_questions` / `evaluation_question_options` / `evaluation_submissions` / `evaluation_answers`, et une autre famille `exam_parts` / `exam_questions` / `exam_question_options` / `exam_sessions` / `exam_submissions` avec plusieurs types spécialisés.

Leur coexistence ne prouve pas qu'elles sont interchangeables. Déterminer lesquelles sont utilisées, la correspondance des questions/réponses et la règle des tentatives. `exam_submissions` impose une réponse par évaluation/étudiant/question, mais ne référence pas une tentative ; `exam_sessions` ne déclare pas d'unicité évaluation/étudiant. Les réponses ne permettent donc pas à elles seules de distinguer plusieurs tentatives.

Le prototype prend en charge QCM simple et texte ; il ne représente pas toutes les structures spécialisées de la source. Une reprise limitée à ses types pourrait perdre des sujets ou réponses.

### 11. Finance : contrat, lignes de frais et allocation des paiements — P1

La source possède tarifs, contrats étudiants, inscription, bourses, tranches et échéanciers. C'est plus riche que le `Fee` générique du prototype. Cependant, `paiements.payable_type/payable_id` est polymorphe, sans FK ; aucune table explicite d'allocation paiement/échéance n'apparaît. `echeances.montant_paye` est un cumul stocké, sans détail d'allocation visible dans le schéma.

Le prototype agrège inscription, scolarité et autres frais dans un contrat et répartit cumulativement les paiements selon les échéances. Il ne peut pas restituer automatiquement une affectation historique précise à une nature de frais. Il manque des lignes de contrat identifiables, des allocations et des versions de contrat/échéancier.

La source autorise des bourses en pourcentage ou montant fixe ; le formulaire du prototype ne propose qu'un pourcentage. La règle de cumul, les dates d'effet, l'approbateur et les conditions de retrait ne sont pas suffisamment représentés. Les remboursements, avoirs et trop-perçus demandent un modèle et des décisions métier explicites.

### 12. Paiement, reçu et état d'annulation — P1

`paiements` conserve montant, référence, justificatif et informations d'annulation, ce qui est utile. Mais `status` et `annule` peuvent diverger ; ni référence ni numéro de reçu ne sont uniques dans le DDL. Aucun attribut explicite d'auteur de l'encaissement n'apparaît sur le paiement ; une trace peut exister dans `activity_log`, à rapprocher.

Prévoir un état faisant autorité, une référence adaptée au prestataire, un reçu numéroté, le bénéficiaire et le payeur, l'auteur, la date métier distincte de la date d'enregistrement, ainsi qu'une trace immuable d'annulation. La source conserve les frais Mobile money, absents du modèle de paiement du prototype. Le choix comptable de ces frais doit être validé.

### 13. Planning prévu, occurrences et réalisé — P1

La séparation source `emploi_du_temps` / `seances` permet récurrence, prévu/réel, remplacement et annulation. C'est une base pertinente que le prototype réduit à `Session` avec date, horaires, salle et statut. Le prototype ne conserve pas le volume réalisé, la récurrence ou le remplacement.

La source impose une séance par programme et date : cela interdit deux occurrences le même jour pour un même programme, si ce cas métier est autorisé. `enseignant_presences` impose une ligne par programme/date sans enseignant dans la clé : à revoir en cas de coenseignement ou remplacement. Les relations salle/groupe/enseignant et les contraintes d'horaires/capacité ne sont pas intégralement garanties par le DDL.

### 14. Jury, versions des résultats et diplôme — P1

`releve_notes`, `uv_validations`, `ue_validations` et `releves` distinguent calculs et documents, ce qui est utile. Les uniques étudiant/année/période ou étudiant/UE/année/période ne permettent pas plusieurs versions dans la même clé. Aucune table dédiée de jury, membres, décision signée, règlement versionné ou diplôme n'apparaît parmi les 140 tables ; des données peuvent être stockées dans les métadonnées, mais ce n'est pas une relation explicite.

Le prototype conserve des instantanés `JuryDecision`, mais les rattachements au règlement et aux notes restent des objets imbriqués. Une correction après décision doit ouvrir une version/revue explicite, sans écraser les crédits déjà capitalisés ou un relevé publié.

### 15. Comptes, rôles, personnel et mandats — P1

La sauvegarde contient 30 rôles et 317 permissions ; notre prototype définit 14 rôles et un catalogue fixe. Il faut une correspondance métier, pas une reprise des droits par nom. `role_user` est polymorphe ; vérifier `user_type` avant d'interpréter `user_id`. Cette table et `permission_role` ne possèdent ni FK, ni unicité métier, ni dates de validité, ni historique intégré.

Dans le prototype, `DemoUser`, `Teacher` et `StaffRecord` sont des entités distinctes sans lien obligatoire. Un compte créé comme Enseignant n'est pas automatiquement un enseignant affecté. Le délégué est simulé par un rôle, alors que la source possède `class_committee_members` par groupe. Le mandat doit être lié à un étudiant, un groupe et une période ; le statut stagiaire ne doit pas produire de droits implicites.

### 16. Documents et personnes responsables — P1

La source possède `document_types`, `document_requirements`, `documents`, `albums`, des chemins dans `users`/`etudiants` et des relations polymorphes `tuteurs`/`responsable_frais`. Le prototype réduit les pièces à cinq catégories et ne modélise pas les tuteurs ni le responsable financier. Ce sont des écarts concrets à résoudre avant reprise.

Prévoir type documentaire, exigence selon cursus, propriétaire explicite, métadonnées du fichier, version, contrôle de conformité, auteur et dates. Les chemins d'un ancien serveur ne sont pas des identifiants Storage. L'existence de chaque fichier référencé et sa correspondance au propriétaire n'ont pas été certifiées par cet audit.

### 17. Communications et support : équivalences à ne pas présumer — P2

`announcements` contient annonceur, type de contrat et candidature étudiante : ce n'est pas l'équivalent direct de nos annonces internes. Les tables `communications` et `urgent_infos` sont plus proches de ce besoin. Les audiences, destinataires et lectures doivent être distingués.

La source possède `tickets` et `support_tickets` avec messages, catégories et pièces jointes. Le prototype possède un ticket et son historique, sans discussion complète ni pièces jointes. Définir une seule autorité par usage, en conservant les anciens identifiants.

### 18. Logistique, site et dépenses — P2

Le prototype possède achats, équipements et personnel, mais aucun lien achat/réception/équipement, aucune ligne de commande, réception partielle, quantité réceptionnée ou sortie de stock. La source possède `depenses`, mais pas une table d'achats ou d'inventaire explicitement équivalente. Un paiement fournisseur ne doit pas être déduit d'une simple transition « reçu ».

Le périmètre mentionne des responsables de site ; ni la source ni le Dataset ne possèdent de référentiel explicite de sites/bâtiments. La localisation est essentiellement textuelle. C'est une décision structurante à préciser selon le nombre de sites et leur périmètre de gestion.

### 19. Types, bornes, dates et audit — P1/P2

Le dump ne contient pas de CHECK métier hors validation JSON. Cela laisse les bornes de montants, notes, crédits, pourcentages, capacité et l'ordre des dates à d'autres couches. Notes et points utilisent parfois DOUBLE, les heures pédagogiques des textes, certaines années des textes et d'autres des FK. Harmoniser selon le sens métier ; une date civile ne doit pas être traitée comme un instant de connexion.

`activity_log` est une base d'audit utile, mais auteur et entité y sont polymorphes et le rôle n'est pas une colonne dédiée. La présence de `properties` ne garantit pas que chaque action possède avant/après/motif. Le journal du prototype est lui aussi hétérogène. Définir les attributs obligatoires et la politique de conservation pour chaque action sensible.

## Relations centrales à formaliser

Ces relations sont une proposition conceptuelle de travail, pas un schéma SQL décidé.

| Relation | Cardinalité envisagée | Règle à expliciter |
|---|---|---|
| Étudiant → inscription annuelle | 1 vers N | Une ou plusieurs inscriptions par année selon cursus multiples autorisés. |
| Inscription → affectations de groupe | 1 vers N datées | Nombre d'affectations simultanées et date de mouvement. |
| Formation/parcours → version de maquette | 1 vers N | Version par année/niveau ; stabilité des anciennes maquettes. |
| Maquette → semestre → UE → élément constitutif | 1 vers N à chaque étape | Budgets de crédits, coefficients, volumes et compensation. |
| Compte ↔ profil enseignant/étudiant/personnel | À définir | Une identité peut cumuler plusieurs fonctions ; aucun identifiant partagé implicitement. |
| Enseignant ↔ enseignement/groupe | N vers N par affectation | Année, semestre, période de validité, remplacement. |
| Programmation → occurrence de séance | 1 vers N | Récurrence, prévu/réel, salle et enseignant effectifs. |
| Séance ↔ étudiant inscrit | N vers N par présence | Une présence par occurrence/candidat, corrections tracées. |
| Évaluation ↔ inscription | N vers N par candidat | Liste admissible figée, absences et exclusions définies. |
| Candidat → tentative → réponses | 1 vers N puis 1 vers N | Nombre de tentatives, délai, version de sujet, remise. |
| Évaluation/candidat → note → révisions | À définir puis 1 vers N | Note unique par composante/tentative retenue, statut et publication. |
| Inscription → contrat → lignes et versions | À définir puis 1 vers N | Nature des frais, bourse, année, révision et dette ancienne. |
| Paiement ↔ lignes/échéances | N vers N par allocation | Somme allouée, annulation, remboursement et trop-perçu. |
| Jury → décision → relevé/version | 1 vers N | Règlement et notes utilisés, correction après décision. |
| Étudiant ↔ responsable financier/tuteur | N vers N si autorisé | Qualité, priorité, dates d'effet et confidentialité. |
| Compte ↔ rôle | N vers N si cumul autorisé | Autorité d'attribution, dates et périmètre de site/année/groupe. |

## Ordre recommandé avant Supabase

1. Résoudre les P0 : présence, identité des examens, références orphelines, années contradictoires et cascades sensibles. Conserver les lignes en anomalie et leurs identifiants d'origine ; ne rien supprimer pour faire passer l'import.
2. Valider les cardinalités structurantes : inscription, cursus, groupes, rôles cumulés, sites, tentatives et contrats. Documenter les questions sans inventer les règles ESCEN.
3. Construire un dictionnaire cible : pour chaque entité, ses attributs, type, nullabilité, défaut, PK, FK, UNIQUE, CHECK, index, état, auteur, dates, historique et politique de suppression.
4. Produire une correspondance exhaustive source/cible, notamment pour les deux familles d'examens, les documents et les historiques. Les domaines hors périmètre restent conservés dans les archives, sans nouveaux écrans.
5. Seulement ensuite préparer les migrations PostgreSQL et les permissions Supabase, puis tester une restauration de travail et comparer les effectifs, relations, résultats et montants.

Aucun projet Supabase, aucune migration, aucune suppression, aucun changement du code applicatif et aucune opération distante n'ont été réalisés pour cet audit.

## Limites de la validation

L'inventaire couvre toutes les tables et leurs attributs. Les contrôles des données couvrent toutes les FK explicites et une sélection étendue de relations inférées ; ils ne constituent pas une validation exhaustive de chaque attribut et calcul métier. Aucune simulation du backend source n'a été effectuée. Les valeurs polymorphes, métadonnées JSON, règles institutionnelles, paiements affectés à différentes natures et fichiers référencés nécessitent une seconde analyse ciblée avant migration.

# Inventaire du schéma ESCEN — sauvegarde du 14 octobre 2026

Source : `sauvegarde-complete-2026-10-14_11-41-02.zip`, entrée `database.sql`. Lecture locale uniquement, aucun SQL exécuté.

140 tables, 1 361 colonnes, 68 clés étrangères explicites. Les nombres de lignes proviennent des instructions INSERT analysées, sans publier leurs valeurs.

Cet inventaire décrit le schéma source. Il ne constitue pas un schéma cible ni une migration. Les index nommés « foreign » sans contrainte FOREIGN KEY ne sont pas des clés étrangères.

## Tables

| Table | Colonnes | Lignes exportées | FK explicites |
|---|---:|---:|---:|
| [absences](#absences) | 7 | 0 | 0 |
| [activity_log](#activity-log) | 12 | 1708 | 0 |
| [advertisers](#advertisers) | 8 | 1 | 0 |
| [agendas](#agendas) | 9 | 2 | 0 |
| [albums](#albums) | 16 | 32 | 0 |
| [annee_filiere](#annee-filiere) | 7 | 1 | 0 |
| [annee_scolaires](#annee-scolaires) | 7 | 4 | 0 |
| [announcement_etudiant](#announcement-etudiant) | 8 | 0 | 0 |
| [announcements](#announcements) | 15 | 0 | 0 |
| [blog_comments](#blog-comments) | 9 | 1 | 0 |
| [blogs](#blogs) | 8 | 7 | 0 |
| [bourse_etudiants](#bourse-etudiants) | 7 | 1 | 0 |
| [bourses](#bourses) | 8 | 0 | 0 |
| [buses](#buses) | 7 | 0 | 0 |
| [cahier_textes](#cahier-textes) | 18 | 0 | 0 |
| [candidature_field_configs](#candidature-field-configs) | 7 | 15 | 0 |
| [candidatures](#candidatures) | 59 | 88 | 4 |
| [class_committee_members](#class-committee-members) | 7 | 0 | 0 |
| [club_etudiants](#club-etudiants) | 6 | 0 | 0 |
| [clubs](#clubs) | 7 | 0 | 0 |
| [comments](#comments) | 6 | 0 | 0 |
| [communication_attachments](#communication-attachments) | 8 | 0 | 1 |
| [communication_user](#communication-user) | 6 | 0 | 2 |
| [communications](#communications) | 15 | 0 | 1 |
| [comportements](#comportements) | 14 | 0 | 3 |
| [concours_matieres](#concours-matieres) | 5 | 0 | 0 |
| [concours_notes](#concours-notes) | 7 | 0 | 3 |
| [concours_session_matieres](#concours-session-matieres) | 8 | 0 | 4 |
| [concours_sessions](#concours-sessions) | 13 | 0 | 1 |
| [configurations](#configurations) | 8 | 31 | 0 |
| [contacts](#contacts) | 9 | 8 | 0 |
| [conversation_users](#conversation-users) | 8 | 0 | 1 |
| [conversations](#conversations) | 10 | 0 | 0 |
| [current_envs](#current-envs) | 3 | 2 | 0 |
| [cursuses](#cursuses) | 5 | 0 | 0 |
| [depenses](#depenses) | 12 | 0 | 2 |
| [devoirs](#devoirs) | 9 | 0 | 0 |
| [document_requirements](#document-requirements) | 8 | 32 | 1 |
| [document_types](#document-types) | 8 | 20 | 0 |
| [documentation_accesses](#documentation-accesses) | 6 | 0 | 0 |
| [documentations](#documentations) | 5 | 0 | 0 |
| [documents](#documents) | 9 | 144 | 0 |
| [echeances](#echeances) | 12 | 576 | 0 |
| [echeanciers](#echeanciers) | 8 | 143 | 0 |
| [emploi_du_temps](#emploi-du-temps) | 16 | 35 | 1 |
| [enseignant_presences](#enseignant-presences) | 20 | 0 | 0 |
| [etudiant_fiche_de_presence](#etudiant-fiche-de-presence) | 5 | 0 | 0 |
| [etudiant_group](#etudiant-group) | 8 | 145 | 2 |
| [etudiants](#etudiants) | 24 | 145 | 1 |
| [evaluation_anonymouses](#evaluation-anonymouses) | 7 | 0 | 0 |
| [evaluation_answers](#evaluation-answers) | 7 | 0 | 0 |
| [evaluation_case_study_contexts](#evaluation-case-study-contexts) | 7 | 0 | 0 |
| [evaluation_question_options](#evaluation-question-options) | 6 | 0 | 0 |
| [evaluation_questions](#evaluation-questions) | 11 | 0 | 0 |
| [evaluation_room_students](#evaluation-room-students) | 3 | 0 | 0 |
| [evaluation_room_supervisors](#evaluation-room-supervisors) | 3 | 0 | 0 |
| [evaluation_rooms](#evaluation-rooms) | 4 | 0 | 0 |
| [evaluation_submissions](#evaluation-submissions) | 9 | 0 | 0 |
| [evaluations](#evaluations) | 22 | 33 | 1 |
| [evenements](#evenements) | 12 | 0 | 0 |
| [exam_parts](#exam-parts) | 10 | 66 | 1 |
| [exam_question_complex_data](#exam-question-complex-data) | 10 | 0 | 1 |
| [exam_question_guided_writing](#exam-question-guided-writing) | 8 | 0 | 1 |
| [exam_question_multi_parts](#exam-question-multi-parts) | 6 | 0 | 1 |
| [exam_question_options](#exam-question-options) | 8 | 1864 | 1 |
| [exam_question_structured_data](#exam-question-structured-data) | 8 | 0 | 1 |
| [exam_questions](#exam-questions) | 11 | 557 | 1 |
| [exam_sessions](#exam-sessions) | 11 | 0 | 2 |
| [exam_submissions](#exam-submissions) | 13 | 3171 | 3 |
| [failed_jobs](#failed-jobs) | 7 | 0 | 0 |
| [fiche_de_presence_user](#fiche-de-presence-user) | 4 | 0 | 0 |
| [fiche_de_presences](#fiche-de-presences) | 7 | 0 | 0 |
| [filiere_group](#filiere-group) | 5 | 20 | 0 |
| [filieres](#filieres) | 7 | 5 | 0 |
| [frais_etudiants](#frais-etudiants) | 17 | 143 | 0 |
| [frais_inscriptions](#frais-inscriptions) | 9 | 1 | 3 |
| [frais_scolarites](#frais-scolarites) | 12 | 7 | 0 |
| [gallery_albums](#gallery-albums) | 10 | 1 | 0 |
| [gallery_photos](#gallery-photos) | 13 | 1 | 0 |
| [grades](#grades) | 8 | 0 | 0 |
| [gratifications](#gratifications) | 12 | 0 | 0 |
| [groups](#groups) | 5 | 15 | 0 |
| [historique_presences](#historique-presences) | 10 | 0 | 2 |
| [jobs](#jobs) | 7 | 0 | 0 |
| [jours_feries](#jours-feries) | 9 | 0 | 1 |
| [justificatifs](#justificatifs) | 14 | 0 | 3 |
| [matiere__users](#matiere--users) | 5 | 0 | 0 |
| [matieres](#matieres) | 4 | 25 | 0 |
| [message_attachments](#message-attachments) | 9 | 0 | 1 |
| [message_reads](#message-reads) | 5 | 0 | 1 |
| [messages](#messages) | 13 | 0 | 2 |
| [migrations](#migrations) | 3 | 308 | 0 |
| [moyens_connaissances](#moyens-connaissances) | 6 | 6 | 0 |
| [newsletter_subscribers](#newsletter-subscribers) | 5 | 1 | 0 |
| [niveau_periode](#niveau-periode) | 5 | 9 | 0 |
| [niveaux](#niveaux) | 7 | 6 | 0 |
| [note_variations](#note-variations) | 8 | 0 | 0 |
| [notes](#notes) | 11 | 640 | 0 |
| [notes_historique](#notes-historique) | 9 | 0 | 0 |
| [notifications](#notifications) | 8 | 2432 | 0 |
| [paiements](#paiements) | 23 | 62 | 1 |
| [parts](#parts) | 9 | 0 | 0 |
| [password_reset_tokens](#password-reset-tokens) | 3 | 23 | 0 |
| [periodes](#periodes) | 8 | 6 | 0 |
| [permission_role](#permission-role) | 3 | 1200 | 0 |
| [permissions](#permissions) | 4 | 317 | 0 |
| [personal_access_tokens](#personal-access-tokens) | 10 | 851 | 0 |
| [presences](#presences) | 24 | 0 | 2 |
| [prospects](#prospects) | 10 | 133 | 0 |
| [reclamations](#reclamations) | 15 | 0 | 0 |
| [releve_notes](#releve-notes) | 12 | 15 | 0 |
| [releves](#releves) | 11 | 0 | 0 |
| [reorientations](#reorientations) | 8 | 0 | 0 |
| [responsable_frais](#responsable-frais) | 12 | 34 | 0 |
| [role_user](#role-user) | 4 | 268 | 0 |
| [roles](#roles) | 4 | 30 | 0 |
| [salles](#salles) | 9 | 4 | 0 |
| [sanctions](#sanctions) | 7 | 0 | 0 |
| [seances](#seances) | 17 | 2 | 3 |
| [semoa_call_backs](#semoa-call-backs) | 4 | 0 | 0 |
| [semoa_gateways](#semoa-gateways) | 10 | 6 | 0 |
| [student_uv_statuses](#student-uv-statuses) | 11 | 0 | 0 |
| [support_attachments](#support-attachments) | 9 | 0 | 1 |
| [support_categories](#support-categories) | 10 | 5 | 0 |
| [support_messages](#support-messages) | 9 | 0 | 2 |
| [support_tickets](#support-tickets) | 16 | 0 | 2 |
| [syllabuses](#syllabuses) | 12 | 0 | 0 |
| [tickets](#tickets) | 8 | 0 | 0 |
| [tranche_paiements](#tranche-paiements) | 8 | 28 | 0 |
| [tuteurs](#tuteurs) | 13 | 32 | 0 |
| [type_diplome_champs](#type-diplome-champs) | 6 | 9 | 1 |
| [type_diplomes](#type-diplomes) | 6 | 4 | 0 |
| [ue_validations](#ue-validations) | 13 | 0 | 0 |
| [unite_enseignements](#unite-enseignements) | 8 | 1 | 0 |
| [unite_valeurs](#unite-valeurs) | 14 | 26 | 2 |
| [urgent_infos](#urgent-infos) | 16 | 1 | 1 |
| [user_unite_valeur](#user-unite-valeur) | 6 | 26 | 0 |
| [users](#users) | 29 | 30 | 0 |
| [uv_validations](#uv-validations) | 15 | 0 | 0 |
| [uv_weightings](#uv-weightings) | 8 | 1 | 0 |

## absences

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `cours_id` | `bigint(20) unsigned NOT NULL` |
| `date_absence` | `date NOT NULL` |
| `motif` | `varchar(191) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `absences_etudiant_id_foreign` (`etudiant_id`)
KEY `absences_cours_id_foreign` (`cours_id`)
```


## activity_log

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `log_name` | `varchar(191) DEFAULT NULL` |
| `description` | `text NOT NULL` |
| `subject_type` | `varchar(191) DEFAULT NULL` |
| `event` | `varchar(191) DEFAULT NULL` |
| `subject_id` | `bigint(20) unsigned DEFAULT NULL` |
| `causer_type` | `varchar(191) DEFAULT NULL` |
| `causer_id` | `bigint(20) unsigned DEFAULT NULL` |
| `properties` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`properties`))` |
| `batch_uuid` | `char(36) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `subject` (`subject_type`,`subject_id`)
KEY `causer` (`causer_type`,`causer_id`)
KEY `activity_log_log_name_index` (`log_name`)
```


## advertisers

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(127) NOT NULL` |
| `details` | `longtext NOT NULL` |
| `site` | `varchar(127) DEFAULT NULL` |
| `ville` | `varchar(63) NOT NULL` |
| `email` | `varchar(31) NOT NULL` |
| `logo` | `varchar(191) DEFAULT NULL` |
| `slug` | `varchar(255) NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## agendas

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `user_id` | `bigint(20) unsigned NOT NULL` |
| `titre` | `varchar(191) NOT NULL` |
| `description` | `text DEFAULT NULL` |
| `start_time` | `datetime NOT NULL` |
| `end_time` | `datetime NOT NULL` |
| `alerte` | `tinyint(1) NOT NULL DEFAULT 1` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `agendas_user_id_foreign` (`user_id`)
```


## albums

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `lettre` | `varchar(191) DEFAULT NULL` |
| `naissance` | `varchar(191) DEFAULT NULL` |
| `diplome` | `varchar(191) DEFAULT NULL` |
| `nationalite` | `varchar(191) DEFAULT NULL` |
| `photo` | `varchar(191) DEFAULT NULL` |
| `type_diplome` | `varchar(191) DEFAULT NULL` |
| `certificat_medical` | `varchar(191) DEFAULT NULL` |
| `coupon` | `varchar(255) DEFAULT NULL` |
| `cv` | `varchar(255) DEFAULT NULL` |
| `owner_id` | `bigint(20) unsigned NOT NULL` |
| `owner_type` | `varchar(255) NOT NULL` |
| `bulletins_lycee_paths` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `releve_bac1_path` | `varchar(191) DEFAULT NULL` |
| `releve_bac2_path` | `varchar(191) DEFAULT NULL` |
| `lettre_motivation` | `varchar(191) DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## annee_filiere

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `filiere_id` | `bigint(20) unsigned NOT NULL` |
| `date_debut` | `date DEFAULT NULL` |
| `date_fin` | `date DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `annee_filiere_annee_scolaire_id_filiere_id_unique` (`annee_scolaire_id`,`filiere_id`)
KEY `annee_filiere_filiere_id_foreign` (`filiere_id`)
```


## annee_scolaires

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `date_debut` | `date DEFAULT NULL` |
| `date_fin` | `date DEFAULT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `code` | `varchar(255) NOT NULL` |
| `active` | `tinyint(1) NOT NULL DEFAULT 0` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## announcement_etudiant

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `cv_path` | `varchar(191) DEFAULT NULL` |
| `lettre_path` | `varchar(191) DEFAULT NULL` |
| `announcement_id` | `bigint(20) unsigned NOT NULL` |
| `applied` | `tinyint(1) DEFAULT 0` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## announcements

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `type` | `varchar(191) DEFAULT NULL` |
| `type_annonce` | `enum('Plein temps','Temps partiel','Télétravail') NOT NULL` |
| `ville` | `varchar(63) NOT NULL` |
| `content` | `longtext NOT NULL` |
| `status` | `tinyint(1) NOT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `advertiser_id` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `file_path` | `varchar(255) DEFAULT NULL` |
| `title` | `varchar(255) NOT NULL` |
| `type_contrat` | `enum('Contrat à Durée Déterminée','Contrat à Durée Indéterminée','Alternance') NOT NULL` |
| `duration` | `varchar(63) DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## blog_comments

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `blog_id` | `bigint(20) unsigned NOT NULL` |
| `author_name` | `varchar(191) NOT NULL` |
| `author_email` | `varchar(191) DEFAULT NULL` |
| `content` | `text NOT NULL` |
| `rating` | `int(11) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `status` | `varchar(191) NOT NULL DEFAULT 'pending'` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `blog_comments_blog_id_foreign` (`blog_id`)
```


## blogs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `title` | `varchar(255) NOT NULL` |
| `author_name` | `varchar(191) DEFAULT NULL` |
| `image` | `varchar(255) DEFAULT NULL` |
| `content` | `longtext NOT NULL` |
| `status` | `enum('published','draft') NOT NULL DEFAULT 'draft'` |
| `publication_date` | `timestamp NULL DEFAULT NULL` |
| `slug` | `varchar(255) NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## bourse_etudiants

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `bourse_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `bourse_etudiants_etudiant_id_bourse_id_annee_scolaire_id_unique` (`etudiant_id`,`bourse_id`,`annee_scolaire_id`)
KEY `bourse_etudiants_bourse_id_foreign` (`bourse_id`)
KEY `bourse_etudiants_annee_scolaire_id_foreign` (`annee_scolaire_id`)
```


## bourses

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `nom` | `varchar(191) NOT NULL` |
| `type` | `enum('pourcentage','montant_fixe') NOT NULL` |
| `valeur` | `decimal(10,2) NOT NULL` |
| `description` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## buses

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `code` | `varchar(255) NOT NULL` |
| `nb_place` | `int(11) NOT NULL` |
| `heure_depart` | `timestamp NOT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `buses_code_unique` (`code`)
```


## cahier_textes

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `emploi_du_temps_id` | `bigint(20) unsigned NOT NULL` |
| `titre` | `varchar(191) NOT NULL` |
| `contenu` | `text NOT NULL` |
| `piece_jointe` | `varchar(191) DEFAULT NULL` |
| `created_by_user_id` | `bigint(20) unsigned DEFAULT NULL` |
| `created_by_role` | `varchar(191) DEFAULT NULL` |
| `approved_by_user_id` | `bigint(20) unsigned DEFAULT NULL` |
| `approved_at` | `timestamp NULL DEFAULT NULL` |
| `remarks` | `text DEFAULT NULL` |
| `group_id` | `bigint(20) unsigned DEFAULT NULL` |
| `niveau_id` | `bigint(20) unsigned DEFAULT NULL` |
| `etudiant_id` | `bigint(20) unsigned DEFAULT NULL` |
| `incoherent` | `tinyint(1) NOT NULL DEFAULT 0` |
| `incoherence_notes` | `text DEFAULT NULL` |
| `notified_at` | `timestamp NULL DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `cahier_textes_emploi_du_temps_id_foreign` (`emploi_du_temps_id`)
```


## candidature_field_configs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `champ_key` | `varchar(191) NOT NULL` |
| `label` | `varchar(191) NOT NULL` |
| `afficher` | `tinyint(1) NOT NULL DEFAULT 1` |
| `obligatoire` | `tinyint(1) NOT NULL DEFAULT 0` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `candidature_field_configs_champ_key_unique` (`champ_key`)
```


## candidatures

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(191) DEFAULT NULL` |
| `nom_jeune_fille` | `varchar(255) DEFAULT NULL` |
| `prenom` | `varchar(191) DEFAULT NULL` |
| `numero_table` | `varchar(191) DEFAULT NULL` |
| `annee_bac` | `smallint(5) unsigned DEFAULT NULL` |
| `serie` | `varchar(5) DEFAULT NULL` |
| `mention_bac` | `varchar(191) DEFAULT NULL` |
| `etablissement_diplome` | `varchar(191) DEFAULT NULL` |
| `lettre_motivation` | `text DEFAULT NULL` |
| `genre` | `varchar(191) DEFAULT NULL` |
| `date_naissance` | `timestamp NULL DEFAULT NULL` |
| `lieu_naissance` | `varchar(191) DEFAULT NULL` |
| `adresse` | `varchar(191) DEFAULT NULL` |
| `nationalite` | `varchar(191) DEFAULT NULL` |
| `pays_residence` | `varchar(191) DEFAULT NULL` |
| `dernier_diplome` | `varchar(191) DEFAULT NULL` |
| `type_diplome_id` | `bigint(20) unsigned DEFAULT NULL` |
| `moyen_connaissance_id` | `bigint(20) unsigned DEFAULT NULL` |
| `moyen_connaissance_precision` | `varchar(191) DEFAULT NULL` |
| `numero_bordereau` | `varchar(191) DEFAULT NULL` |
| `tel` | `varchar(191) DEFAULT NULL` |
| `tel2` | `varchar(191) DEFAULT NULL` |
| `tel3` | `varchar(191) DEFAULT NULL` |
| `bp` | `varchar(255) DEFAULT NULL` |
| `fax` | `varchar(255) DEFAULT NULL` |
| `hobbit` | `text DEFAULT NULL` |
| `email` | `varchar(191) DEFAULT NULL` |
| `password` | `varchar(255) NOT NULL` |
| `dossier_valide` | `tinyint(1) NOT NULL DEFAULT 0` |
| `transmis_academie` | `tinyint(1) NOT NULL DEFAULT 0` |
| `transmis_academie_date` | `timestamp NULL DEFAULT NULL` |
| `validation_date` | `timestamp NULL DEFAULT NULL` |
| `frais_paye` | `tinyint(1) NOT NULL DEFAULT 0` |
| `frai_paye_date` | `timestamp NULL DEFAULT NULL` |
| `participation` | `tinyint(1) NOT NULL DEFAULT 0` |
| `participation_date` | `timestamp NULL DEFAULT NULL` |
| `admission` | `tinyint(1) NOT NULL DEFAULT 0` |
| `admission_date` | `timestamp NULL DEFAULT NULL` |
| `motif` | `text DEFAULT NULL` |
| `rectification_expected` | `tinyint(1) NOT NULL DEFAULT 0` |
| `slug` | `varchar(255) NOT NULL` |
| `draft_token` | `varchar(64) DEFAULT NULL` |
| `soumis_le` | `timestamp NULL DEFAULT NULL` |
| `code` | `varchar(255) DEFAULT NULL` |
| `matricule_concours` | `varchar(191) DEFAULT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `concours_session_id` | `bigint(20) unsigned DEFAULT NULL` |
| `remember_token` | `varchar(100) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `acceptation_date` | `timestamp NULL DEFAULT NULL` |
| `end_accessibility_date` | `timestamp NULL DEFAULT NULL` |
| `etudiant_id` | `bigint(20) unsigned DEFAULT NULL` |
| `niveau_id` | `bigint(20) unsigned DEFAULT NULL` |
| `filiere_id` | `bigint(20) unsigned DEFAULT NULL` |
| `email_verified_at` | `timestamp NULL DEFAULT NULL` |
| `advertiser_id` | `bigint(20) unsigned DEFAULT NULL` |
| `promotion` | `varchar(191) DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `candidatures_email_unique` (`email`)
UNIQUE KEY `candidatures_matricule_concours_unique` (`matricule_concours`)
UNIQUE KEY `candidatures_numero_bordereau_unique` (`numero_bordereau`)
UNIQUE KEY `candidatures_draft_token_unique` (`draft_token`)
KEY `candidatures_tel_index` (`tel`)
KEY `candidatures_advertiser_id_foreign` (`advertiser_id`)
KEY `candidatures_concours_session_id_foreign` (`concours_session_id`)
KEY `candidatures_type_diplome_id_foreign` (`type_diplome_id`)
KEY `candidatures_moyen_connaissance_id_foreign` (`moyen_connaissance_id`)
CONSTRAINT `candidatures_advertiser_id_foreign` FOREIGN KEY (`advertiser_id`) REFERENCES `advertisers` (`id`) ON DELETE SET NULL
CONSTRAINT `candidatures_concours_session_id_foreign` FOREIGN KEY (`concours_session_id`) REFERENCES `concours_sessions` (`id`) ON DELETE SET NULL
CONSTRAINT `candidatures_moyen_connaissance_id_foreign` FOREIGN KEY (`moyen_connaissance_id`) REFERENCES `moyens_connaissances` (`id`) ON DELETE SET NULL
CONSTRAINT `candidatures_type_diplome_id_foreign` FOREIGN KEY (`type_diplome_id`) REFERENCES `type_diplomes` (`id`) ON DELETE SET NULL
```


## class_committee_members

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `group_id` | `bigint(20) unsigned NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `role` | `enum('delegue','delegue_adjoint','secretaire','secretaire_adjoint') NOT NULL` |
| `active` | `tinyint(1) NOT NULL DEFAULT 1` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `uniq_group_role` (`group_id`,`role`)
KEY `class_committee_members_etudiant_id_group_id_index` (`etudiant_id`,`group_id`)
```


## club_etudiants

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `club_id` | `bigint(20) unsigned NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `date_adhesion` | `date DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `club_etudiants_club_id_foreign` (`club_id`)
KEY `club_etudiants_etudiant_id_foreign` (`etudiant_id`)
```


## clubs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(191) NOT NULL` |
| `description` | `text DEFAULT NULL` |
| `responsable_id` | `bigint(20) unsigned NOT NULL` |
| `date_creation` | `date NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `clubs_responsable_id_foreign` (`responsable_id`)
```


## comments

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evenement_id` | `bigint(20) unsigned NOT NULL` |
| `content` | `text NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `user_id` | `bigint(20) unsigned DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `comments_evenement_id_foreign` (`evenement_id`)
KEY `comments_user_id_foreign` (`user_id`)
```


## communication_attachments

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `communication_id` | `bigint(20) unsigned NOT NULL` |
| `file_path` | `varchar(191) NOT NULL` |
| `file_name` | `varchar(191) NOT NULL` |
| `file_type` | `varchar(191) DEFAULT NULL` |
| `file_size` | `int(11) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `communication_attachments_communication_id_foreign` (`communication_id`)
CONSTRAINT `communication_attachments_communication_id_foreign` FOREIGN KEY (`communication_id`) REFERENCES `communications` (`id`) ON DELETE CASCADE
```


## communication_user

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `communication_id` | `bigint(20) unsigned NOT NULL` |
| `user_id` | `bigint(20) unsigned NOT NULL` |
| `read_at` | `timestamp NULL DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `communication_user_communication_id_user_id_unique` (`communication_id`,`user_id`)
KEY `communication_user_user_id_foreign` (`user_id`)
CONSTRAINT `communication_user_communication_id_foreign` FOREIGN KEY (`communication_id`) REFERENCES `communications` (`id`) ON DELETE CASCADE
CONSTRAINT `communication_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
```


## communications

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `uuid` | `char(36) NOT NULL` |
| `title` | `varchar(191) NOT NULL` |
| `content` | `longtext NOT NULL` |
| `type` | `varchar(191) NOT NULL DEFAULT 'info'` |
| `target_type` | `varchar(191) NOT NULL DEFAULT 'all'` |
| `target_data` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `is_published` | `tinyint(1) NOT NULL DEFAULT 0` |
| `published_at` | `timestamp NULL DEFAULT NULL` |
| `expires_at` | `timestamp NULL DEFAULT NULL` |
| `author_id` | `bigint(20) unsigned NOT NULL` |
| `slug` | `varchar(191) NOT NULL` |
| `deleted_at` | `timestamp NULL DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `communications_uuid_unique` (`uuid`)
UNIQUE KEY `communications_slug_unique` (`slug`)
KEY `communications_author_id_foreign` (`author_id`)
CONSTRAINT `communications_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
```


## comportements

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `presence_id` | `bigint(20) unsigned DEFAULT NULL` |
| `user_id` | `bigint(20) unsigned NOT NULL` |
| `type` | `enum('positif','negatif','neutre','alerte') NOT NULL` |
| `categorie` | `varchar(191) NOT NULL` |
| `libelle` | `varchar(191) NOT NULL` |
| `description` | `text DEFAULT NULL` |
| `intensite` | `int(11) NOT NULL DEFAULT 1` |
| `a_communiquer_parents` | `tinyint(1) NOT NULL DEFAULT 0` |
| `a_remonter_conseil` | `tinyint(1) NOT NULL DEFAULT 0` |
| `traite_le` | `datetime DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `comportements_etudiant_id_foreign` (`etudiant_id`)
KEY `comportements_presence_id_foreign` (`presence_id`)
KEY `comportements_user_id_foreign` (`user_id`)
CONSTRAINT `comportements_etudiant_id_foreign` FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants` (`id`)
CONSTRAINT `comportements_presence_id_foreign` FOREIGN KEY (`presence_id`) REFERENCES `presences` (`id`)
CONSTRAINT `comportements_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
```


## concours_matieres

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(191) NOT NULL` |
| `code` | `varchar(191) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## concours_notes

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `candidature_id` | `bigint(20) unsigned NOT NULL` |
| `concours_session_matiere_id` | `bigint(20) unsigned NOT NULL` |
| `note` | `decimal(5,2) DEFAULT NULL` |
| `saisi_par` | `bigint(20) unsigned DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `concours_note_unique` (`candidature_id`,`concours_session_matiere_id`)
KEY `concours_notes_concours_session_matiere_id_foreign` (`concours_session_matiere_id`)
KEY `concours_notes_saisi_par_foreign` (`saisi_par`)
CONSTRAINT `concours_notes_candidature_id_foreign` FOREIGN KEY (`candidature_id`) REFERENCES `candidatures` (`id`) ON DELETE CASCADE
CONSTRAINT `concours_notes_concours_session_matiere_id_foreign` FOREIGN KEY (`concours_session_matiere_id`) REFERENCES `concours_session_matieres` (`id`) ON DELETE CASCADE
CONSTRAINT `concours_notes_saisi_par_foreign` FOREIGN KEY (`saisi_par`) REFERENCES `users` (`id`) ON DELETE SET NULL
```


## concours_session_matieres

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `concours_session_id` | `bigint(20) unsigned NOT NULL` |
| `concours_matiere_id` | `bigint(20) unsigned NOT NULL` |
| `niveau_id` | `bigint(20) unsigned NOT NULL` |
| `filiere_id` | `bigint(20) unsigned DEFAULT NULL` |
| `coefficient` | `decimal(5,2) NOT NULL DEFAULT 1.00` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `concours_session_matiere_unique` (`concours_session_id`,`concours_matiere_id`,`niveau_id`,`filiere_id`)
KEY `concours_session_matieres_concours_matiere_id_foreign` (`concours_matiere_id`)
KEY `concours_session_matieres_niveau_id_foreign` (`niveau_id`)
KEY `concours_session_matieres_filiere_id_foreign` (`filiere_id`)
CONSTRAINT `concours_session_matieres_concours_matiere_id_foreign` FOREIGN KEY (`concours_matiere_id`) REFERENCES `concours_matieres` (`id`) ON DELETE CASCADE
CONSTRAINT `concours_session_matieres_concours_session_id_foreign` FOREIGN KEY (`concours_session_id`) REFERENCES `concours_sessions` (`id`) ON DELETE CASCADE
CONSTRAINT `concours_session_matieres_filiere_id_foreign` FOREIGN KEY (`filiere_id`) REFERENCES `filieres` (`id`) ON DELETE SET NULL
CONSTRAINT `concours_session_matieres_niveau_id_foreign` FOREIGN KEY (`niveau_id`) REFERENCES `niveaux` (`id`) ON DELETE CASCADE
```


## concours_sessions

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `libelle` | `varchar(191) NOT NULL` |
| `avec_epreuve_ecrite` | `tinyint(1) NOT NULL DEFAULT 0` |
| `date_debut_depot` | `date DEFAULT NULL` |
| `date_fin_depot` | `date DEFAULT NULL` |
| `date_epreuve` | `date DEFAULT NULL` |
| `date_publication_resultats` | `date DEFAULT NULL` |
| `statut` | `varchar(191) NOT NULL DEFAULT 'brouillon'` |
| `est_publiee` | `tinyint(1) NOT NULL DEFAULT 0` |
| `communique` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `concours_sessions_annee_scolaire_id_unique` (`annee_scolaire_id`)
CONSTRAINT `concours_sessions_annee_scolaire_id_foreign` FOREIGN KEY (`annee_scolaire_id`) REFERENCES `annee_scolaires` (`id`) ON DELETE CASCADE
```


## configurations

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `key` | `varchar(191) NOT NULL` |
| `value` | `text DEFAULT NULL` |
| `valueKey` | `varchar(191) DEFAULT NULL` |
| `options` | `text DEFAULT NULL` |
| `type` | `enum('text','boolean','integer','file','select','textarea') DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `configurations_key_unique` (`key`)
```


## contacts

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `email` | `varchar(255) NOT NULL` |
| `tel` | `varchar(255) NOT NULL` |
| `message` | `longtext NOT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `status` | `tinyint(1) NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## conversation_users

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `conversation_id` | `bigint(20) unsigned NOT NULL` |
| `participant_type` | `varchar(191) NOT NULL` |
| `participant_id` | `bigint(20) unsigned NOT NULL` |
| `role` | `enum('member','admin') NOT NULL DEFAULT 'member'` |
| `joined_at` | `timestamp NOT NULL DEFAULT current_timestamp()` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `conversation_users_conversation_id_foreign` (`conversation_id`)
KEY `conversation_users_participant_type_participant_id_index` (`participant_type`,`participant_id`)
CONSTRAINT `conversation_users_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE
```


## conversations

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(191) DEFAULT NULL` |
| `description` | `varchar(191) DEFAULT NULL` |
| `type` | `enum('private','group','channel') NOT NULL` |
| `admin_only` | `tinyint(1) NOT NULL DEFAULT 0` |
| `created_by` | `bigint(20) unsigned DEFAULT NULL` |
| `last_message_at` | `timestamp NULL DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `deleted_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## current_envs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `valeur` | `varchar(255) NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## cursuses

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `annee` | `varchar(255) NOT NULL` |
| `etablissement` | `varchar(255) NOT NULL` |
| `niveau` | `varchar(255) NOT NULL` |
| `candidature_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## depenses

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `titre` | `varchar(191) NOT NULL` |
| `montant` | `decimal(12,0) NOT NULL` |
| `date_depense` | `date NOT NULL` |
| `categorie` | `varchar(191) DEFAULT NULL` |
| `description` | `text DEFAULT NULL` |
| `reference` | `varchar(191) DEFAULT NULL` |
| `mode_paiement` | `varchar(191) NOT NULL DEFAULT 'especes'` |
| `user_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `depenses_user_id_foreign` (`user_id`)
KEY `depenses_annee_scolaire_id_foreign` (`annee_scolaire_id`)
CONSTRAINT `depenses_annee_scolaire_id_foreign` FOREIGN KEY (`annee_scolaire_id`) REFERENCES `annee_scolaires` (`id`)
CONSTRAINT `depenses_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
```


## devoirs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `emploi_du_temps_id` | `bigint(20) unsigned NOT NULL` |
| `titre` | `varchar(191) NOT NULL` |
| `consignes` | `text NOT NULL` |
| `fichier` | `varchar(191) DEFAULT NULL` |
| `date_limite` | `date NOT NULL` |
| `correction` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `devoirs_emploi_du_temps_id_foreign` (`emploi_du_temps_id`)
```


## document_requirements

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `niveau_id` | `bigint(20) unsigned NOT NULL` |
| `filiere_id` | `bigint(20) unsigned DEFAULT NULL` |
| `is_obligatoire` | `tinyint(1) NOT NULL DEFAULT 1` |
| `description` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `document_type_id` | `bigint(20) unsigned DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `document_requirements_niveau_id_foreign` (`niveau_id`)
KEY `document_requirements_filiere_id_foreign` (`filiere_id`)
KEY `document_requirements_document_type_id_foreign` (`document_type_id`)
CONSTRAINT `document_requirements_document_type_id_foreign` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`) ON DELETE CASCADE
```


## document_types

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom_affichage` | `varchar(191) NOT NULL` |
| `document_key` | `varchar(191) NOT NULL` |
| `is_multiple` | `tinyint(1) NOT NULL DEFAULT 0` |
| `is_photo` | `tinyint(1) NOT NULL DEFAULT 0` |
| `accepted_formats` | `varchar(191) NOT NULL DEFAULT 'all' COMMENT 'Options: image, pdf, all'` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `document_types_document_key_unique` (`document_key`)
```


## documentation_accesses

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `documentation_id` | `bigint(20) unsigned NOT NULL` |
| `access_type` | `varchar(191) NOT NULL` |
| `access_id` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `documentation_accesses_documentation_id_foreign` (`documentation_id`)
KEY `documentation_accesses_access_type_access_id_index` (`access_type`,`access_id`)
```


## documentations

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `title` | `varchar(191) NOT NULL` |
| `path` | `varchar(191) NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## documents

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `owner_type` | `varchar(191) NOT NULL` |
| `owner_id` | `bigint(20) unsigned NOT NULL` |
| `document_key` | `varchar(191) NOT NULL` |
| `file_path` | `text NOT NULL` |
| `statut` | `varchar(191) NOT NULL DEFAULT 'en_attente'` |
| `motif_rejet` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `documents_owner_type_owner_id_index` (`owner_type`,`owner_id`)
```


## echeances

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `echeancier_id` | `bigint(20) unsigned DEFAULT NULL` |
| `frais_etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `libelle` | `varchar(191) NOT NULL` |
| `montant` | `decimal(12,0) NOT NULL` |
| `montant_paye` | `decimal(12,0) NOT NULL DEFAULT 0` |
| `date_limite` | `date NOT NULL` |
| `ordre` | `int(11) NOT NULL DEFAULT 0` |
| `statut` | `enum('en_attente','partiel','paye','en_retard') NOT NULL DEFAULT 'en_attente'` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `echeances_slug_unique` (`slug`)
KEY `echeances_echeancier_id_foreign` (`echeancier_id`)
KEY `echeances_frais_etudiant_id_statut_index` (`frais_etudiant_id`,`statut`)
KEY `echeances_date_limite_statut_index` (`date_limite`,`statut`)
```


## echeanciers

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `frais_etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `date_creation` | `timestamp NOT NULL DEFAULT current_timestamp()` |
| `created_by` | `bigint(20) unsigned DEFAULT NULL` |
| `commentaire` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `echeanciers_slug_unique` (`slug`)
KEY `echeanciers_frais_etudiant_id_foreign` (`frais_etudiant_id`)
KEY `echeanciers_created_by_foreign` (`created_by`)
```


## emploi_du_temps

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `debut` | `timestamp NULL DEFAULT NULL` |
| `fin` | `timestamp NULL DEFAULT NULL` |
| `uv_id` | `bigint(20) unsigned DEFAULT NULL` |
| `type_programme` | `enum('Cours','Évaluation','Événement') NOT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `salle_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `details` | `text DEFAULT NULL` |
| `recurrence_type` | `enum('aucune','hebdomadaire','quotidienne') NOT NULL DEFAULT 'aucune'` |
| `recurrence_days` | `varchar(20) DEFAULT NULL` |
| `recurrence_end_date` | `date DEFAULT NULL` |
| `evenement_id` | `bigint(20) unsigned DEFAULT NULL` |
| `group_id` | `bigint(20) unsigned NOT NULL` |
| `owner_id` | `bigint(20) unsigned DEFAULT NULL` |
| `owner_type` | `varchar(255) DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `emploi_du_temps_uv_id_foreign` (`uv_id`)
CONSTRAINT `emploi_du_temps_uv_id_foreign` FOREIGN KEY (`uv_id`) REFERENCES `unite_valeurs` (`id`)
```


## enseignant_presences

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `emploi_du_temps_id` | `bigint(20) unsigned NOT NULL` |
| `date_cours` | `date DEFAULT NULL` |
| `heure_debut_prevue` | `time DEFAULT NULL` |
| `heure_fin_prevue` | `time DEFAULT NULL` |
| `enseignant_id` | `bigint(20) unsigned NOT NULL` |
| `statut` | `varchar(10) NOT NULL DEFAULT 'present'` |
| `heure_arrivee` | `time DEFAULT NULL` |
| `heure_depart` | `time DEFAULT NULL` |
| `heure_depart_reelle` | `time DEFAULT NULL` |
| `duree_calculee_minutes` | `int(11) DEFAULT NULL` |
| `duree_reelle_minutes` | `int(11) DEFAULT NULL` |
| `type_pointage` | `enum('arrivee','depart_complete','depart_tronque') NOT NULL DEFAULT 'arrivee'` |
| `arrivee_enregistree_at` | `timestamp NULL DEFAULT NULL` |
| `depart_enregistree_at` | `timestamp NULL DEFAULT NULL` |
| `est_termine` | `tinyint(1) NOT NULL DEFAULT 0` |
| `meta_data` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `commentaire` | `varchar(500) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `unique_presence_par_jour` (`emploi_du_temps_id`,`date_cours`)
KEY `enseignant_presences_emploi_du_temps_id_index` (`emploi_du_temps_id`)
KEY `enseignant_presences_enseignant_id_index` (`enseignant_id`)
KEY `enseignant_presences_date_cours_index` (`date_cours`)
KEY `enseignant_presences_enseignant_id_date_cours_index` (`enseignant_id`,`date_cours`)
```


## etudiant_fiche_de_presence

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `fiche_de_presence_id` | `bigint(20) unsigned NOT NULL` |
| `was_present` | `tinyint(1) NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## etudiant_group

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `group_id` | `bigint(20) unsigned NOT NULL` |
| `filiere_id` | `bigint(20) unsigned DEFAULT 1` |
| `niveau_id` | `bigint(20) unsigned DEFAULT 1` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `mode_formation` | `varchar(191) NOT NULL DEFAULT 'Présentiel'` |
| `statut_scolaire` | `varchar(191) NOT NULL DEFAULT 'actif'` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `etudiant_group_niveau_id_foreign` (`niveau_id`)
KEY `etudiant_group_filiere_id_foreign` (`filiere_id`)
CONSTRAINT `etudiant_group_filiere_id_foreign` FOREIGN KEY (`filiere_id`) REFERENCES `filieres` (`id`) ON DELETE SET NULL
CONSTRAINT `etudiant_group_niveau_id_foreign` FOREIGN KEY (`niveau_id`) REFERENCES `niveaux` (`id`) ON DELETE CASCADE
```


## etudiants

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(255) NOT NULL` |
| `nom` | `varchar(255) NOT NULL` |
| `nom_jeune_fille` | `varchar(255) DEFAULT NULL` |
| `prenom` | `varchar(255) NOT NULL` |
| `email` | `varchar(255) NOT NULL` |
| `tel` | `varchar(191) DEFAULT NULL` |
| `password` | `varchar(255) NOT NULL` |
| `must_change_password` | `tinyint(1) NOT NULL DEFAULT 0` |
| `matricule` | `varchar(255) NOT NULL` |
| `statut` | `varchar(191) NOT NULL DEFAULT 'actif'` |
| `image` | `varchar(191) DEFAULT NULL` |
| `date_naissance` | `timestamp NULL DEFAULT NULL` |
| `lieu_naissance` | `varchar(191) DEFAULT NULL` |
| `nationalite` | `varchar(191) DEFAULT NULL` |
| `annee_admission` | `varchar(4) NOT NULL` |
| `genre` | `enum('Masculin','Féminin') NOT NULL` |
| `email_verified_at` | `timestamp NULL DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `remember_token` | `varchar(100) DEFAULT NULL` |
| `cv` | `longtext DEFAULT NULL` |
| `advertiser_id` | `bigint(20) unsigned DEFAULT NULL` |
| `promotion` | `varchar(191) DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `etudiants_email_unique` (`email`)
UNIQUE KEY `etudiants_matricule_unique` (`matricule`)
KEY `etudiants_advertiser_id_foreign` (`advertiser_id`)
CONSTRAINT `etudiants_advertiser_id_foreign` FOREIGN KEY (`advertiser_id`) REFERENCES `advertisers` (`id`) ON DELETE SET NULL
```


## evaluation_anonymouses

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evaluation_id` | `bigint(20) unsigned NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `anonymous_code` | `varchar(10) NOT NULL` |
| `salle_nom` | `varchar(191) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `evaluation_anonymouses_anonymous_code_unique` (`anonymous_code`)
KEY `evaluation_anonymouses_etudiant_id_foreign` (`etudiant_id`)
KEY `evaluation_anonymouses_evaluation_id_etudiant_id_index` (`evaluation_id`,`etudiant_id`)
KEY `evaluation_anonymouses_anonymous_code_index` (`anonymous_code`)
```


## evaluation_answers

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `submission_id` | `bigint(20) unsigned NOT NULL` |
| `question_id` | `bigint(20) unsigned NOT NULL` |
| `answer_text` | `longtext DEFAULT NULL` |
| `answer_options` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `evaluation_answers_submission_id_foreign` (`submission_id`)
KEY `evaluation_answers_question_id_foreign` (`question_id`)
```


## evaluation_case_study_contexts

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `part_id` | `bigint(20) unsigned DEFAULT NULL` |
| `problematic` | `text NOT NULL` |
| `resources` | `text DEFAULT NULL` |
| `instructions` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `evaluation_case_study_contexts_part_id_unique` (`part_id`)
```


## evaluation_question_options

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `question_id` | `bigint(20) unsigned NOT NULL` |
| `label` | `varchar(191) NOT NULL` |
| `is_correct` | `tinyint(1) NOT NULL DEFAULT 0` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `evaluation_question_options_question_id_foreign` (`question_id`)
```


## evaluation_questions

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evaluation_id` | `bigint(20) unsigned NOT NULL` |
| `part_id` | `bigint(20) unsigned DEFAULT NULL` |
| `title` | `varchar(191) NOT NULL` |
| `statement` | `longtext NOT NULL` |
| `type` | `enum('text','textarea','choice_single','choice_multiple') NOT NULL` |
| `order_in_part` | `int(11) NOT NULL DEFAULT 0` |
| `order` | `int(11) NOT NULL DEFAULT 0` |
| `points` | `double DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `evaluation_questions_evaluation_id_foreign` (`evaluation_id`)
KEY `evaluation_questions_part_id_foreign` (`part_id`)
```


## evaluation_room_students

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evaluation_room_id` | `bigint(20) unsigned NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `evaluation_room_students_evaluation_room_id_etudiant_id_unique` (`evaluation_room_id`,`etudiant_id`)
KEY `evaluation_room_students_etudiant_id_foreign` (`etudiant_id`)
```


## evaluation_room_supervisors

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evaluation_room_id` | `bigint(20) unsigned NOT NULL` |
| `user_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `evaluation_room_supervisors_evaluation_room_id_user_id_unique` (`evaluation_room_id`,`user_id`)
KEY `evaluation_room_supervisors_user_id_foreign` (`user_id`)
```


## evaluation_rooms

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evaluation_id` | `bigint(20) unsigned NOT NULL` |
| `salle_id` | `bigint(20) unsigned NOT NULL` |
| `assigned_capacity` | `int(10) unsigned NOT NULL DEFAULT 0` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `evaluation_rooms_evaluation_id_foreign` (`evaluation_id`)
KEY `evaluation_rooms_salle_id_foreign` (`salle_id`)
```


## evaluation_submissions

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evaluation_id` | `bigint(20) unsigned NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `started_at` | `timestamp NULL DEFAULT NULL` |
| `submitted_at` | `timestamp NULL DEFAULT NULL` |
| `focus_lost_count` | `int(11) NOT NULL DEFAULT 0` |
| `status` | `enum('in_progress','submitted','timeout') NOT NULL DEFAULT 'in_progress'` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `evaluation_submissions_evaluation_id_foreign` (`evaluation_id`)
KEY `evaluation_submissions_etudiant_id_foreign` (`etudiant_id`)
```


## evaluations

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(255) NOT NULL` |
| `emploi_du_temps_id` | `bigint(20) unsigned DEFAULT NULL` |
| `group_id` | `bigint(20) unsigned NOT NULL` |
| `niveau_id` | `bigint(20) unsigned DEFAULT NULL` |
| `semestre` | `tinyint(3) unsigned DEFAULT NULL` |
| `unite_valeur_id` | `bigint(20) unsigned NOT NULL` |
| `salle_id` | `bigint(20) unsigned NOT NULL` |
| `published` | `tinyint(1) NOT NULL DEFAULT 0` |
| `type` | `enum('Devoir','Examen','Interrogation','TP','Exposé') NOT NULL` |
| `session_type` | `enum('normale','rattrapage') NOT NULL DEFAULT 'normale'` |
| `date` | `date DEFAULT NULL` |
| `debut` | `datetime NOT NULL` |
| `fin` | `datetime NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `has_anonymat` | `tinyint(1) DEFAULT 0` |
| `correction_end_date` | `timestamp NULL DEFAULT NULL` |
| `correction_submission_date` | `timestamp NULL DEFAULT NULL` |
| `is_online` | `tinyint(1) NOT NULL DEFAULT 0` |
| `duration_minutes` | `int(11) DEFAULT NULL` |
| `deleted_at` | `timestamp NULL DEFAULT NULL` |
| `parent_id` | `bigint(20) unsigned DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `evaluations_emploi_du_temps_id_foreign` (`emploi_du_temps_id`)
KEY `evaluations_parent_id_foreign` (`parent_id`)
CONSTRAINT `evaluations_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `evaluations` (`id`) ON DELETE SET NULL
```


## evenements

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `details` | `longtext NOT NULL` |
| `image` | `varchar(191) DEFAULT NULL` |
| `type` | `varchar(191) NOT NULL DEFAULT 'internal'` |
| `destination` | `varchar(191) NOT NULL DEFAULT 'all'` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `start_date` | `timestamp NOT NULL` |
| `end_date` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## exam_parts

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evaluation_id` | `bigint(20) unsigned NOT NULL` |
| `titre` | `varchar(191) NOT NULL` |
| `description` | `text DEFAULT NULL` |
| `contexte` | `longtext DEFAULT NULL` |
| `is_case_study` | `tinyint(1) NOT NULL DEFAULT 0` |
| `order` | `int(11) NOT NULL DEFAULT 0` |
| `metadata` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `exam_parts_evaluation_id_order_index` (`evaluation_id`,`order`)
CONSTRAINT `exam_parts_evaluation_id_foreign` FOREIGN KEY (`evaluation_id`) REFERENCES `evaluations` (`id`) ON DELETE CASCADE
```


## exam_question_complex_data

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `question_id` | `bigint(20) unsigned NOT NULL` |
| `data_type` | `varchar(191) NOT NULL DEFAULT 'analyse_risques' COMMENT 'Type de données: analyse_risques, matrice, etc.'` |
| `configuration` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Configuration: grilles, seuils, barèmes, etc.'` |
| `cell_configuration` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `data` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Données de la question (lignes, colonnes, etc.)'` |
| `cell_data` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Configuration cellule par cellule'` |
| `metadata` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Métadonnées additionnelles'` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `exam_question_complex_data_question_id_data_type_index` (`question_id`,`data_type`)
CONSTRAINT `exam_question_complex_data_question_id_foreign` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE
```


## exam_question_guided_writing

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `question_id` | `bigint(20) unsigned NOT NULL` |
| `instructions` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Consignes détaillées'` |
| `criteria` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Critères pour la correction'` |
| `min_words` | `int(11) DEFAULT 50 COMMENT 'Nombre minimum de mots'` |
| `max_words` | `int(11) DEFAULT 500 COMMENT 'Nombre maximum de mots'` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `exam_question_guided_writing_question_id_index` (`question_id`)
CONSTRAINT `exam_question_guided_writing_question_id_foreign` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE
```


## exam_question_multi_parts

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `question_id` | `bigint(20) unsigned NOT NULL` |
| `configuration` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Configuration globale'` |
| `parts` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Tableau des sous-questions avec leurs types et points'` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `exam_question_multi_parts_question_id_index` (`question_id`)
CONSTRAINT `exam_question_multi_parts_question_id_foreign` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE
```


## exam_question_options

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `question_id` | `bigint(20) unsigned NOT NULL` |
| `text` | `text NOT NULL` |
| `is_correct` | `tinyint(1) NOT NULL DEFAULT 0` |
| `metadata` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `order` | `int(11) NOT NULL DEFAULT 0` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `exam_question_options_question_id_order_index` (`question_id`,`order`)
CONSTRAINT `exam_question_options_question_id_foreign` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE
```


## exam_question_structured_data

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `question_id` | `bigint(20) unsigned NOT NULL` |
| `structure_type` | `varchar(191) NOT NULL DEFAULT 'strategies_4t' COMMENT 'Type de structure: strategies_4t, qcm_justifie, etc.'` |
| `structure` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Structure de la question'` |
| `items` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Les items/questions à traiter'` |
| `bareme` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Barème détaillé'` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `exam_question_structured_data_question_id_structure_type_index` (`question_id`,`structure_type`)
CONSTRAINT `exam_question_structured_data_question_id_foreign` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE
```


## exam_questions

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `part_id` | `bigint(20) unsigned NOT NULL` |
| `content` | `longtext NOT NULL` |
| `type` | `enum('qcm_unique','qcm_multiple','texte_court','texte_long','vrai_faux','appariement','ordre','fichier','complex_data','structured_data','multi_parts','guided_writing') NOT NULL` |
| `config` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `points` | `decimal(5,2) NOT NULL DEFAULT 0.00` |
| `order` | `int(11) NOT NULL DEFAULT 0` |
| `is_active` | `tinyint(1) NOT NULL DEFAULT 1` |
| `metadata` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `exam_questions_part_id_order_index` (`part_id`,`order`)
CONSTRAINT `exam_questions_part_id_foreign` FOREIGN KEY (`part_id`) REFERENCES `exam_parts` (`id`) ON DELETE CASCADE
```


## exam_sessions

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evaluation_id` | `bigint(20) unsigned NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `started_at` | `timestamp NOT NULL` |
| `last_activity_at` | `timestamp NOT NULL` |
| `submitted_at` | `timestamp NULL DEFAULT NULL` |
| `status` | `enum('en_cours','termine','interrompu') NOT NULL DEFAULT 'en_cours'` |
| `progress` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `session_token` | `varchar(191) NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `exam_sessions_session_token_unique` (`session_token`)
KEY `exam_sessions_etudiant_id_foreign` (`etudiant_id`)
KEY `exam_sessions_evaluation_id_status_index` (`evaluation_id`,`status`)
KEY `exam_sessions_last_activity_at_index` (`last_activity_at`)
CONSTRAINT `exam_sessions_etudiant_id_foreign` FOREIGN KEY (`etudiant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
CONSTRAINT `exam_sessions_evaluation_id_foreign` FOREIGN KEY (`evaluation_id`) REFERENCES `evaluations` (`id`) ON DELETE CASCADE
```


## exam_submissions

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evaluation_id` | `bigint(20) unsigned NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `question_id` | `bigint(20) unsigned NOT NULL` |
| `reponse` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL` |
| `is_correct` | `tinyint(1) DEFAULT NULL` |
| `points_obtenus` | `double(8,2) DEFAULT NULL` |
| `submitted_at` | `timestamp NULL DEFAULT NULL` |
| `auto_saved_at` | `timestamp NULL DEFAULT NULL` |
| `ip_address` | `varchar(191) DEFAULT NULL` |
| `user_agent` | `varchar(191) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `unique_submission` (`evaluation_id`,`etudiant_id`,`question_id`)
KEY `exam_submissions_etudiant_id_foreign` (`etudiant_id`)
KEY `exam_submissions_question_id_foreign` (`question_id`)
KEY `exam_submissions_evaluation_id_etudiant_id_index` (`evaluation_id`,`etudiant_id`)
KEY `exam_submissions_submitted_at_index` (`submitted_at`)
CONSTRAINT `exam_submissions_etudiant_id_foreign` FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants` (`id`) ON DELETE CASCADE
CONSTRAINT `exam_submissions_evaluation_id_foreign` FOREIGN KEY (`evaluation_id`) REFERENCES `evaluations` (`id`) ON DELETE CASCADE
CONSTRAINT `exam_submissions_question_id_foreign` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE
```


## failed_jobs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `uuid` | `varchar(255) NOT NULL` |
| `connection` | `text NOT NULL` |
| `queue` | `text NOT NULL` |
| `payload` | `longtext NOT NULL` |
| `exception` | `longtext NOT NULL` |
| `failed_at` | `timestamp NOT NULL DEFAULT current_timestamp()` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
```


## fiche_de_presence_user

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `fiche_de_presence_id` | `bigint(20) unsigned NOT NULL` |
| `user_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## fiche_de_presences

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(255) NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `controllable_type` | `varchar(255) NOT NULL` |
| `controllable_id` | `bigint(20) unsigned NOT NULL` |
| `submitted` | `tinyint(1) NOT NULL DEFAULT 0` |
| `processed` | `tinyint(1) NOT NULL DEFAULT 0` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `fiche_de_presences_controllable_type_controllable_id_index` (`controllable_type`,`controllable_id`)
```


## filiere_group

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `filiere_id` | `bigint(20) unsigned NOT NULL` |
| `group_id` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `filiere_group_filiere_id_group_id_unique` (`filiere_id`,`group_id`)
KEY `filiere_group_group_id_foreign` (`group_id`)
```


## filieres

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `code` | `varchar(255) NOT NULL` |
| `image` | `varchar(255) DEFAULT NULL` |
| `description` | `text DEFAULT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## frais_etudiants

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `frais_scolarite_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `montant_initial` | `decimal(12,0) NOT NULL` |
| `montant_apres_bourse` | `decimal(12,0) NOT NULL` |
| `bourse_etudiant_id` | `bigint(20) unsigned DEFAULT NULL` |
| `type_paiement` | `enum('tranches_globales','negociation') NOT NULL DEFAULT 'tranches_globales'` |
| `frequence_paiement` | `enum('annuel','trimestriel','mensuel','bimestriel') NOT NULL DEFAULT 'trimestriel'` |
| `statut` | `varchar(191) NOT NULL DEFAULT 'en_cours'` |
| `est_en_abandon` | `tinyint(1) NOT NULL DEFAULT 0` |
| `date_abandon` | `date DEFAULT NULL` |
| `montant_inscription_du` | `decimal(12,0) DEFAULT NULL` |
| `montant_scolarite_du` | `decimal(12,0) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `frais_etudiants_slug_unique` (`slug`)
UNIQUE KEY `unique_frais_etudiant_annee_frais` (`etudiant_id`,`annee_scolaire_id`,`frais_scolarite_id`)
KEY `frais_etudiants_frais_scolarite_id_foreign` (`frais_scolarite_id`)
KEY `frais_etudiants_annee_scolaire_id_foreign` (`annee_scolaire_id`)
KEY `frais_etudiants_bourse_etudiant_id_foreign` (`bourse_etudiant_id`)
```


## frais_inscriptions

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `annee_scolaire_id` | `bigint(20) unsigned DEFAULT NULL` |
| `montant` | `int(11) NOT NULL` |
| `active` | `tinyint(1) NOT NULL DEFAULT 0` |
| `slug` | `char(36) NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `niveau_id` | `bigint(20) unsigned DEFAULT NULL` |
| `filiere_id` | `bigint(20) unsigned DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `frais_inscriptions_annee_scolaire_id_foreign` (`annee_scolaire_id`)
KEY `frais_inscriptions_niveau_id_foreign` (`niveau_id`)
KEY `frais_inscriptions_filiere_id_foreign` (`filiere_id`)
CONSTRAINT `frais_inscriptions_annee_scolaire_id_foreign` FOREIGN KEY (`annee_scolaire_id`) REFERENCES `annee_scolaires` (`id`) ON DELETE CASCADE
CONSTRAINT `frais_inscriptions_filiere_id_foreign` FOREIGN KEY (`filiere_id`) REFERENCES `filieres` (`id`) ON DELETE SET NULL
CONSTRAINT `frais_inscriptions_niveau_id_foreign` FOREIGN KEY (`niveau_id`) REFERENCES `niveaux` (`id`) ON DELETE SET NULL
```


## frais_scolarites

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) DEFAULT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `niveau_id` | `bigint(20) unsigned DEFAULT NULL` |
| `filiere_id` | `bigint(20) unsigned DEFAULT NULL` |
| `montant` | `int(11) NOT NULL` |
| `genre` | `enum('Masculin','Féminin','Tous') DEFAULT 'Tous'` |
| `mode_formation` | `varchar(191) NOT NULL DEFAULT 'Tous'` |
| `description` | `text DEFAULT NULL` |
| `frequence` | `varchar(191) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `frais_scolarites_annee_scolaire_id_foreign` (`annee_scolaire_id`)
KEY `frais_scolarites_niveau_id_foreign` (`niveau_id`)
KEY `frais_scolarites_filiere_id_foreign` (`filiere_id`)
```


## gallery_albums

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `name` | `varchar(191) NOT NULL` |
| `slug` | `varchar(191) NOT NULL` |
| `description` | `text DEFAULT NULL` |
| `cover_path` | `varchar(191) DEFAULT NULL` |
| `is_published` | `tinyint(1) NOT NULL DEFAULT 1` |
| `published_at` | `timestamp NULL DEFAULT NULL` |
| `created_by` | `bigint(20) unsigned DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `gallery_albums_slug_unique` (`slug`)
KEY `gallery_albums_created_by_foreign` (`created_by`)
```


## gallery_photos

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `gallery_album_id` | `bigint(20) unsigned NOT NULL` |
| `title` | `varchar(191) DEFAULT NULL` |
| `caption` | `text DEFAULT NULL` |
| `file_path` | `varchar(191) NOT NULL` |
| `alt_text` | `varchar(191) DEFAULT NULL` |
| `position` | `int(10) unsigned NOT NULL DEFAULT 0` |
| `is_published` | `tinyint(1) NOT NULL DEFAULT 1` |
| `published_at` | `timestamp NULL DEFAULT NULL` |
| `taken_at` | `timestamp NULL DEFAULT NULL` |
| `created_by` | `bigint(20) unsigned DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `gallery_photos_gallery_album_id_foreign` (`gallery_album_id`)
KEY `gallery_photos_created_by_foreign` (`created_by`)
```


## grades

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `code` | `varchar(255) NOT NULL` |
| `description` | `text DEFAULT NULL` |
| `image` | `varchar(255) DEFAULT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `filiere_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## gratifications

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `unite_enseignement_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `motif` | `text NOT NULL` |
| `type` | `enum('excellence','participation','engagement','amelioration','autre') NOT NULL DEFAULT 'autre'` |
| `validee` | `tinyint(1) NOT NULL DEFAULT 0` |
| `approuvee_par` | `bigint(20) unsigned DEFAULT NULL` |
| `date_approbation` | `timestamp NULL DEFAULT NULL` |
| `observation` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `gratifications_unique` (`etudiant_id`,`unite_enseignement_id`,`annee_scolaire_id`)
KEY `gratifications_unite_enseignement_id_foreign` (`unite_enseignement_id`)
KEY `gratifications_annee_scolaire_id_foreign` (`annee_scolaire_id`)
KEY `gratifications_approuvee_par_foreign` (`approuvee_par`)
```


## groups

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `niveau_id` | `bigint(20) unsigned DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `groups_niveau_id_foreign` (`niveau_id`)
```


## historique_presences

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `presence_id` | `bigint(20) unsigned NOT NULL` |
| `user_id` | `bigint(20) unsigned NOT NULL` |
| `action` | `enum('creation','modification','validation','suppression') NOT NULL` |
| `anciennes_valeurs` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `nouvelles_valeurs` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `ip_address` | `varchar(191) DEFAULT NULL` |
| `user_agent` | `varchar(191) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `historique_presences_presence_id_foreign` (`presence_id`)
KEY `historique_presences_user_id_foreign` (`user_id`)
CONSTRAINT `historique_presences_presence_id_foreign` FOREIGN KEY (`presence_id`) REFERENCES `presences` (`id`)
CONSTRAINT `historique_presences_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
```


## jobs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `queue` | `varchar(255) NOT NULL` |
| `payload` | `longtext NOT NULL` |
| `attempts` | `tinyint(3) unsigned NOT NULL` |
| `reserved_at` | `int(10) unsigned DEFAULT NULL` |
| `available_at` | `int(10) unsigned NOT NULL` |
| `created_at` | `int(10) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `jobs_queue_index` (`queue`)
```


## jours_feries

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `titre` | `varchar(191) NOT NULL` |
| `slug` | `varchar(191) NOT NULL` |
| `date` | `date NOT NULL` |
| `est_recurrent` | `tinyint(1) NOT NULL DEFAULT 0` |
| `annee_scolaire_id` | `bigint(20) unsigned DEFAULT NULL` |
| `description` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `jours_feries_slug_unique` (`slug`)
KEY `jours_feries_annee_scolaire_id_foreign` (`annee_scolaire_id`)
CONSTRAINT `jours_feries_annee_scolaire_id_foreign` FOREIGN KEY (`annee_scolaire_id`) REFERENCES `annee_scolaires` (`id`) ON DELETE CASCADE
```


## justificatifs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `presence_id` | `bigint(20) unsigned DEFAULT NULL` |
| `type` | `enum('certificat_medical','mot_parental','convocation','evenement_familial','autre') NOT NULL` |
| `fichier_path` | `varchar(191) NOT NULL` |
| `description` | `text DEFAULT NULL` |
| `statut` | `enum('en_attente','valide','refuse') NOT NULL DEFAULT 'en_attente'` |
| `valide_par` | `bigint(20) unsigned DEFAULT NULL` |
| `valide_le` | `datetime DEFAULT NULL` |
| `motif_refus` | `text DEFAULT NULL` |
| `date_debut_validite` | `date DEFAULT NULL` |
| `date_fin_validite` | `date DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `justificatifs_etudiant_id_foreign` (`etudiant_id`)
KEY `justificatifs_presence_id_foreign` (`presence_id`)
KEY `justificatifs_valide_par_foreign` (`valide_par`)
CONSTRAINT `justificatifs_etudiant_id_foreign` FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants` (`id`)
CONSTRAINT `justificatifs_presence_id_foreign` FOREIGN KEY (`presence_id`) REFERENCES `presences` (`id`)
CONSTRAINT `justificatifs_valide_par_foreign` FOREIGN KEY (`valide_par`) REFERENCES `users` (`id`)
```


## matiere__users

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `user_id` | `int(11) NOT NULL` |
| `uniteValeur_id` | `int(11) NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `matiere__users_user_id_foreign` (`user_id`)
KEY `matiere__users_unitevaleur_id_foreign` (`uniteValeur_id`)
```


## matieres

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(191) NOT NULL` |
| `code` | `varchar(191) DEFAULT NULL` |
| `slug` | `varchar(191) NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `matieres_slug_unique` (`slug`)
```


## message_attachments

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `message_id` | `bigint(20) unsigned NOT NULL` |
| `file_path` | `varchar(191) NOT NULL` |
| `file_name` | `varchar(191) NOT NULL` |
| `mime_type` | `varchar(191) NOT NULL` |
| `file_extension` | `varchar(10) DEFAULT NULL` |
| `file_size` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `message_attachments_message_id_foreign` (`message_id`)
CONSTRAINT `message_attachments_message_id_foreign` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
```


## message_reads

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `message_id` | `bigint(20) unsigned NOT NULL` |
| `reader_type` | `varchar(191) NOT NULL` |
| `reader_id` | `bigint(20) unsigned NOT NULL` |
| `read_at` | `timestamp NOT NULL DEFAULT current_timestamp()` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `message_reads_message_id_foreign` (`message_id`)
KEY `message_reads_reader_type_reader_id_index` (`reader_type`,`reader_id`)
CONSTRAINT `message_reads_message_id_foreign` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
```


## messages

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `conversation_id` | `bigint(20) unsigned NOT NULL` |
| `sender_type` | `varchar(191) NOT NULL` |
| `sender_id` | `bigint(20) unsigned NOT NULL` |
| `body` | `longtext DEFAULT NULL` |
| `type` | `varchar(100) NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `deleted_at` | `timestamp NULL DEFAULT NULL` |
| `is_edited` | `tinyint(1) NOT NULL DEFAULT 0` |
| `edited_at` | `timestamp NULL DEFAULT NULL` |
| `message_type` | `varchar(191) NOT NULL DEFAULT 'text'` |
| `reply_to_id` | `bigint(20) unsigned DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `messages_conversation_id_foreign` (`conversation_id`)
KEY `messages_sender_type_sender_id_index` (`sender_type`,`sender_id`)
KEY `messages_reply_to_id_foreign` (`reply_to_id`)
CONSTRAINT `messages_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE
CONSTRAINT `messages_reply_to_id_foreign` FOREIGN KEY (`reply_to_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL
```


## migrations

| Attribut | Déclaration source |
|---|---|
| `id` | `int(10) unsigned NOT NULL AUTO_INCREMENT` |
| `migration` | `varchar(255) NOT NULL` |
| `batch` | `int(11) NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## moyens_connaissances

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `libelle` | `varchar(191) NOT NULL` |
| `actif` | `tinyint(1) NOT NULL DEFAULT 1` |
| `ordre` | `int(10) unsigned NOT NULL DEFAULT 0` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## newsletter_subscribers

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `email` | `varchar(191) NOT NULL` |
| `status` | `varchar(191) NOT NULL DEFAULT 'active'` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `newsletter_subscribers_email_unique` (`email`)
```


## niveau_periode

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `niveau_id` | `bigint(20) unsigned NOT NULL` |
| `periode_id` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `niveau_periode_niveau_id_periode_id_unique` (`niveau_id`,`periode_id`)
KEY `niveau_periode_periode_id_foreign` (`periode_id`)
```


## niveaux

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `libelle` | `varchar(191) NOT NULL` |
| `ordre` | `int(11) DEFAULT NULL` |
| `code` | `varchar(191) NOT NULL` |
| `active` | `tinyint(1) NOT NULL DEFAULT 1` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## note_variations

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `from` | `varchar(255) NOT NULL` |
| `to` | `varchar(255) NOT NULL` |
| `motif` | `text NOT NULL` |
| `created_at` | `timestamp NOT NULL` |
| `user_id` | `bigint(20) unsigned NOT NULL` |
| `note_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## notes

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `note` | `double(4,2) DEFAULT NULL` |
| `unite_valeur_id` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `evaluation_id` | `bigint(20) unsigned NOT NULL` |
| `ue_id` | `varchar(255) DEFAULT NULL` |
| `anonymat` | `char(6) DEFAULT NULL` |
| `notation` | `char(1) DEFAULT NULL COMMENT '''R'' pour redoublant'` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `notes_ue_id_foreign` (`unite_valeur_id`)
```


## notes_historique

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `note_id` | `bigint(20) unsigned NOT NULL` |
| `reclamation_id` | `bigint(20) unsigned NOT NULL` |
| `ancienne_note` | `decimal(5,2) NOT NULL` |
| `nouvelle_note` | `decimal(5,2) NOT NULL` |
| `modifiee_par` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `notes_historique_slug_unique` (`slug`)
KEY `notes_historique_modifiee_par_foreign` (`modifiee_par`)
KEY `notes_historique_note_id_index` (`note_id`)
KEY `notes_historique_reclamation_id_index` (`reclamation_id`)
```


## notifications

| Attribut | Déclaration source |
|---|---|
| `id` | `char(36) NOT NULL` |
| `type` | `varchar(255) NOT NULL` |
| `notifiable_type` | `varchar(255) NOT NULL` |
| `notifiable_id` | `bigint(20) unsigned NOT NULL` |
| `data` | `text NOT NULL` |
| `read_at` | `timestamp NULL DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `notifications_notifiable_type_notifiable_id_index` (`notifiable_type`,`notifiable_id`)
```


## paiements

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) DEFAULT NULL` |
| `order` | `int(11) DEFAULT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned DEFAULT NULL` |
| `montant` | `int(11) NOT NULL` |
| `nature_paiement` | `varchar(191) NOT NULL DEFAULT 'scolarite'` |
| `mode_paiement` | `varchar(191) NOT NULL DEFAULT 'especes'` |
| `frais_retrait_mm` | `decimal(12,2) NOT NULL DEFAULT 0.00` |
| `commentaire` | `text DEFAULT NULL` |
| `reference` | `varchar(191) DEFAULT NULL` |
| `justificatif` | `varchar(191) DEFAULT NULL` |
| `status` | `varchar(191) NOT NULL DEFAULT 'valide'` |
| `recu` | `varchar(191) DEFAULT NULL` |
| `annule` | `tinyint(1) NOT NULL DEFAULT 0` |
| `motif_annulation` | `text DEFAULT NULL` |
| `date_annulation` | `timestamp NULL DEFAULT NULL` |
| `annule_par` | `bigint(20) unsigned DEFAULT NULL` |
| `date_paiement` | `date NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `payable_type` | `varchar(191) DEFAULT NULL` |
| `payable_id` | `bigint(20) unsigned DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `paiements_etudiant_id_foreign` (`etudiant_id`)
KEY `paiements_annule_par_foreign` (`annule_par`)
KEY `paiements_payable_type_payable_id_index` (`payable_type`,`payable_id`)
KEY `paiements_annee_scolaire_id_foreign` (`annee_scolaire_id`)
CONSTRAINT `paiements_annee_scolaire_id_foreign` FOREIGN KEY (`annee_scolaire_id`) REFERENCES `annee_scolaires` (`id`) ON DELETE CASCADE
```


## parts

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `evaluation_id` | `bigint(20) unsigned NOT NULL` |
| `identifier` | `varchar(10) NOT NULL` |
| `title` | `varchar(100) NOT NULL` |
| `question_type` | `enum('text','textarea','choice_single','choice_multiple') NOT NULL` |
| `order` | `int(11) NOT NULL DEFAULT 0` |
| `description` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `parts_evaluation_id_identifier_unique` (`evaluation_id`,`identifier`)
```


## password_reset_tokens

| Attribut | Déclaration source |
|---|---|
| `email` | `varchar(255) NOT NULL` |
| `token` | `varchar(255) NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
KEY `password_resets_email_index` (`email`)
```


## periodes

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `description` | `text NOT NULL` |
| `debut` | `timestamp NOT NULL` |
| `fin` | `timestamp NOT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `is_active` | `tinyint(1) NOT NULL DEFAULT 1` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## permission_role

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `permission_id` | `bigint(20) unsigned NOT NULL` |
| `role_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## permissions

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `slug` | `varchar(191) DEFAULT NULL` |
| `description` | `varchar(255) NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `permissions_slug_unique` (`slug`)
```


## personal_access_tokens

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `tokenable_type` | `varchar(255) NOT NULL` |
| `tokenable_id` | `bigint(20) unsigned NOT NULL` |
| `name` | `varchar(255) NOT NULL` |
| `token` | `varchar(64) NOT NULL` |
| `abilities` | `text DEFAULT NULL` |
| `expires_at` | `timestamp NULL DEFAULT NULL` |
| `last_used_at` | `timestamp NULL DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `personal_access_tokens_token_unique` (`token`)
KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
```


## presences

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `emploi_du_temps_id` | `bigint(20) unsigned DEFAULT NULL` |
| `seance_id` | `bigint(20) unsigned DEFAULT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `date` | `date DEFAULT NULL` |
| `heure_arrivee` | `time DEFAULT NULL` |
| `minutes_retard` | `int(11) DEFAULT NULL` |
| `heure_depart` | `time DEFAULT NULL` |
| `statut` | `enum('present','absent','retard','retard_justifie','absent_justifie','dispense','exclu_temporairement','malade','sortie_anticipee') DEFAULT 'present'` |
| `commentaire` | `text DEFAULT NULL` |
| `justificatif_id` | `bigint(20) unsigned DEFAULT NULL` |
| `participation` | `enum('excellente','bonne','moyenne','faible','nulle','non_concerné') DEFAULT NULL` |
| `attitude` | `enum('exemplaire','correcte','a_surveiller','problematique','perturbateur') DEFAULT NULL` |
| `observations_comportement` | `text DEFAULT NULL` |
| `points_attention` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `points_positifs` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `a_signalement` | `tinyint(1) NOT NULL DEFAULT 0` |
| `a_remonter_conseil` | `tinyint(1) NOT NULL DEFAULT 0` |
| `needs_validation` | `tinyint(1) NOT NULL DEFAULT 0` |
| `validated_by` | `bigint(20) unsigned DEFAULT NULL` |
| `validated_at` | `timestamp NULL DEFAULT NULL` |
| `sanction` | `varchar(191) DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `cours_etudiant_unique_presence` (`etudiant_id`)
UNIQUE KEY `unique_presence_par_seance_etudiant` (`seance_id`,`etudiant_id`)
KEY `cours_presences_emploi_du_temps_id_index` (`emploi_du_temps_id`)
KEY `presences_justificatif_id_foreign` (`justificatif_id`)
CONSTRAINT `presences_justificatif_id_foreign` FOREIGN KEY (`justificatif_id`) REFERENCES `justificatifs` (`id`)
CONSTRAINT `presences_seance_id_foreign` FOREIGN KEY (`seance_id`) REFERENCES `seances` (`id`)
```


## prospects

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(191) NOT NULL` |
| `email` | `varchar(191) NOT NULL` |
| `tel` | `varchar(191) NOT NULL` |
| `formation_visee` | `text DEFAULT NULL` |
| `origine` | `varchar(191) NOT NULL DEFAULT 'Brochure'` |
| `status` | `tinyint(1) NOT NULL DEFAULT 0` |
| `slug` | `varchar(191) NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `prospects_slug_unique` (`slug`)
```


## reclamations

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `evaluation_id` | `bigint(20) unsigned DEFAULT NULL` |
| `note_id` | `bigint(20) unsigned DEFAULT NULL` |
| `motif` | `text NOT NULL` |
| `fichier_justificatif` | `varchar(191) DEFAULT NULL` |
| `statut` | `enum('en_attente','approuvee','rejetee') NOT NULL DEFAULT 'en_attente'` |
| `commentaire_admin` | `text DEFAULT NULL` |
| `nouvelle_note` | `decimal(5,2) DEFAULT NULL` |
| `traitee_par` | `bigint(20) unsigned DEFAULT NULL` |
| `traitee_le` | `timestamp NULL DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `deleted_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `reclamations_slug_unique` (`slug`)
KEY `reclamations_etudiant_id_foreign` (`etudiant_id`)
KEY `reclamations_evaluation_id_foreign` (`evaluation_id`)
KEY `reclamations_traitee_par_foreign` (`traitee_par`)
KEY `reclamations_etudiant_id_statut_index` (`etudiant_id`,`statut`)
KEY `reclamations_evaluation_id_index` (`evaluation_id`)
KEY `reclamations_note_id_index` (`note_id`)
```


## releve_notes

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `periode_id` | `bigint(20) unsigned NOT NULL` |
| `moyenne_generale` | `decimal(5,2) NOT NULL` |
| `total_credits_valides` | `int(11) NOT NULL` |
| `total_credits_non_valides` | `int(11) NOT NULL` |
| `metadata` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `calcule_le` | `timestamp NOT NULL DEFAULT current_timestamp()` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `releve_unique` (`etudiant_id`,`annee_scolaire_id`,`periode_id`)
KEY `releve_notes_annee_scolaire_id_foreign` (`annee_scolaire_id`)
KEY `releve_notes_periode_id_foreign` (`periode_id`)
```


## releves

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `periode_id` | `bigint(20) unsigned NOT NULL` |
| `chemin_pdf` | `varchar(191) NOT NULL` |
| `est_publie` | `tinyint(1) NOT NULL DEFAULT 0` |
| `date_publication` | `timestamp NULL DEFAULT NULL` |
| `qr_hash` | `varchar(191) DEFAULT NULL` |
| `verification_data` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `releves_qr_hash_unique` (`qr_hash`)
KEY `releves_etudiant_id_foreign` (`etudiant_id`)
KEY `releves_annee_scolaire_id_foreign` (`annee_scolaire_id`)
KEY `releves_periode_id_foreign` (`periode_id`)
```


## reorientations

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `candidature_id` | `bigint(20) unsigned NOT NULL` |
| `filiere_id` | `bigint(20) unsigned NOT NULL` |
| `niveau_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `motif` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `reorientations_candidature_id_foreign` (`candidature_id`)
KEY `reorientations_filiere_id_foreign` (`filiere_id`)
KEY `reorientations_niveau_id_foreign` (`niveau_id`)
KEY `reorientations_annee_scolaire_id_foreign` (`annee_scolaire_id`)
```


## responsable_frais

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(191) DEFAULT NULL` |
| `prenom` | `varchar(191) DEFAULT NULL` |
| `email` | `varchar(191) DEFAULT NULL` |
| `profession` | `varchar(191) DEFAULT NULL` |
| `employeur` | `varchar(191) DEFAULT NULL` |
| `adresse` | `varchar(191) DEFAULT NULL` |
| `tel` | `varchar(191) DEFAULT NULL` |
| `bp` | `varchar(255) DEFAULT NULL` |
| `fax` | `varchar(255) DEFAULT NULL` |
| `owner_id` | `bigint(20) unsigned NOT NULL` |
| `owner_type` | `varchar(255) NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## role_user

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `user_id` | `bigint(20) unsigned NOT NULL` |
| `user_type` | `varchar(191) NOT NULL DEFAULT 'AppModelsUser'` |
| `role_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## roles

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `active` | `tinyint(1) NOT NULL DEFAULT 1` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## salles

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `effectif` | `int(11) NOT NULL` |
| `type` | `varchar(191) NOT NULL DEFAULT 'physique'` |
| `lien_reunion` | `varchar(191) DEFAULT NULL` |
| `plateforme` | `varchar(191) DEFAULT NULL` |
| `instructions` | `text DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `salles_nom_unique` (`nom`)
```


## sanctions

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `cours_id` | `bigint(20) unsigned NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `enseignant_id` | `bigint(20) unsigned NOT NULL` |
| `description` | `text NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `sanctions_cours_id_index` (`cours_id`)
KEY `sanctions_etudiant_id_index` (`etudiant_id`)
KEY `sanctions_enseignant_id_index` (`enseignant_id`)
```


## seances

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `emploi_du_temps_id` | `bigint(20) unsigned NOT NULL` |
| `date_seance` | `date NOT NULL` |
| `heure_debut_prevue` | `time DEFAULT NULL` |
| `heure_fin_prevue` | `time DEFAULT NULL` |
| `heure_debut_reelle` | `time DEFAULT NULL` |
| `heure_fin_reelle` | `time DEFAULT NULL` |
| `statut` | `enum('planifie','en_cours','termine','annule','reporte','rattrapage') NOT NULL DEFAULT 'planifie'` |
| `motif_annulation` | `varchar(191) DEFAULT NULL` |
| `remplacant_id` | `bigint(20) unsigned DEFAULT NULL` |
| `salle_reelle_id` | `bigint(20) unsigned DEFAULT NULL` |
| `notes_seance` | `text DEFAULT NULL` |
| `metadata` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `qr_token` | `varchar(191) DEFAULT NULL` |
| `qr_expires_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `unique_seance_par_cours_date` (`emploi_du_temps_id`,`date_seance`)
KEY `seances_remplacant_id_foreign` (`remplacant_id`)
KEY `seances_salle_reelle_id_foreign` (`salle_reelle_id`)
CONSTRAINT `seances_emploi_du_temps_id_foreign` FOREIGN KEY (`emploi_du_temps_id`) REFERENCES `emploi_du_temps` (`id`) ON DELETE CASCADE
CONSTRAINT `seances_remplacant_id_foreign` FOREIGN KEY (`remplacant_id`) REFERENCES `users` (`id`)
CONSTRAINT `seances_salle_reelle_id_foreign` FOREIGN KEY (`salle_reelle_id`) REFERENCES `salles` (`id`)
```


## semoa_call_backs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `data` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## semoa_gateways

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `reference` | `varchar(191) NOT NULL` |
| `libelle` | `varchar(191) NOT NULL` |
| `psp_libelle` | `varchar(191) DEFAULT NULL` |
| `methode` | `varchar(191) DEFAULT NULL` |
| `currency` | `varchar(191) DEFAULT NULL` |
| `logo_url` | `text DEFAULT NULL` |
| `is_active` | `tinyint(1) NOT NULL DEFAULT 1` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `semoa_gateways_reference_unique` (`reference`)
```


## student_uv_statuses

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `uv_id` | `bigint(20) unsigned NOT NULL` |
| `group_id` | `bigint(20) unsigned DEFAULT NULL` |
| `total_sessions` | `int(10) unsigned NOT NULL DEFAULT 0` |
| `absences_count` | `int(10) unsigned NOT NULL DEFAULT 0` |
| `absence_rate` | `double(8,2) NOT NULL DEFAULT 0.00` |
| `warning_level` | `tinyint(3) unsigned NOT NULL DEFAULT 0` |
| `blocked` | `tinyint(1) NOT NULL DEFAULT 0` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `uniq_student_uv_group` (`etudiant_id`,`uv_id`,`group_id`)
KEY `student_uv_statuses_uv_id_group_id_index` (`uv_id`,`group_id`)
```


## support_attachments

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `message_id` | `bigint(20) unsigned NOT NULL` |
| `filename` | `varchar(191) NOT NULL` |
| `original_name` | `varchar(191) NOT NULL` |
| `path` | `varchar(191) NOT NULL` |
| `mime_type` | `varchar(191) NOT NULL` |
| `size` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `support_attachments_message_id_foreign` (`message_id`)
CONSTRAINT `support_attachments_message_id_foreign` FOREIGN KEY (`message_id`) REFERENCES `support_messages` (`id`) ON DELETE CASCADE
```


## support_categories

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `name` | `varchar(191) NOT NULL` |
| `slug` | `varchar(191) NOT NULL` |
| `icon` | `varchar(191) DEFAULT NULL` |
| `color` | `varchar(191) NOT NULL DEFAULT '#6366f1'` |
| `description` | `text DEFAULT NULL` |
| `is_active` | `tinyint(1) NOT NULL DEFAULT 1` |
| `order` | `int(11) NOT NULL DEFAULT 0` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `support_categories_slug_unique` (`slug`)
```


## support_messages

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `ticket_id` | `bigint(20) unsigned NOT NULL` |
| `user_id` | `bigint(20) unsigned NOT NULL` |
| `message` | `text NOT NULL` |
| `type` | `enum('user','informaticien','system') NOT NULL DEFAULT 'user'` |
| `is_read` | `tinyint(1) NOT NULL DEFAULT 0` |
| `read_at` | `timestamp NULL DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `support_messages_user_id_foreign` (`user_id`)
KEY `support_messages_ticket_id_created_at_index` (`ticket_id`,`created_at`)
CONSTRAINT `support_messages_ticket_id_foreign` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE
CONSTRAINT `support_messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
```


## support_tickets

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `reference` | `varchar(191) NOT NULL` |
| `title` | `varchar(191) NOT NULL` |
| `description` | `text DEFAULT NULL` |
| `ticketable_type` | `varchar(191) NOT NULL` |
| `ticketable_id` | `bigint(20) unsigned NOT NULL` |
| `status` | `enum('open','in_progress','waiting','resolved','closed') NOT NULL DEFAULT 'open'` |
| `priority` | `enum('low','medium','high','critical') NOT NULL DEFAULT 'medium'` |
| `category_id` | `bigint(20) unsigned NOT NULL` |
| `assigned_to` | `bigint(20) unsigned DEFAULT NULL` |
| `resolved_at` | `timestamp NULL DEFAULT NULL` |
| `closed_at` | `timestamp NULL DEFAULT NULL` |
| `rating` | `tinyint(3) unsigned DEFAULT NULL` |
| `feedback` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `support_tickets_reference_unique` (`reference`)
KEY `support_tickets_ticketable_type_ticketable_id_index` (`ticketable_type`,`ticketable_id`)
KEY `support_tickets_category_id_foreign` (`category_id`)
KEY `support_tickets_assigned_to_foreign` (`assigned_to`)
KEY `support_tickets_status_priority_index` (`status`,`priority`)
KEY `support_tickets_reference_index` (`reference`)
CONSTRAINT `support_tickets_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
CONSTRAINT `support_tickets_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `support_categories` (`id`)
```


## syllabuses

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `unite_valeur_id` | `bigint(20) unsigned NOT NULL` |
| `description` | `text DEFAULT NULL` |
| `objectifs` | `text DEFAULT NULL` |
| `competences` | `text DEFAULT NULL` |
| `plan_cours` | `longtext DEFAULT NULL` |
| `evaluation` | `text DEFAULT NULL` |
| `ressources` | `text DEFAULT NULL` |
| `files` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `syllabuses_slug_unique` (`slug`)
KEY `syllabuses_unite_valeur_id_foreign` (`unite_valeur_id`)
```


## tickets

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `ticketable_type` | `varchar(191) NOT NULL` |
| `ticketable_id` | `bigint(20) unsigned NOT NULL` |
| `subject` | `varchar(191) NOT NULL` |
| `message` | `text NOT NULL` |
| `status` | `varchar(191) NOT NULL DEFAULT 'open'` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `tickets_ticketable_type_ticketable_id_index` (`ticketable_type`,`ticketable_id`)
```


## tranche_paiements

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `frais_scolarite_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `libelle` | `varchar(191) NOT NULL` |
| `montant` | `int(11) NOT NULL` |
| `date_limite` | `date NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
KEY `tranche_paiements_annee_scolaire_id_foreign` (`annee_scolaire_id`)
KEY `tranche_paiements_frais_scolarite_id_foreign` (`frais_scolarite_id`)
```


## tuteurs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(191) DEFAULT NULL` |
| `prenom` | `varchar(191) DEFAULT NULL` |
| `email` | `varchar(191) DEFAULT NULL` |
| `profession` | `varchar(191) DEFAULT NULL` |
| `employeur` | `varchar(191) DEFAULT NULL` |
| `adresse` | `varchar(191) DEFAULT NULL` |
| `tel` | `varchar(191) DEFAULT NULL` |
| `bp` | `varchar(255) DEFAULT NULL` |
| `responsable_des_frais` | `tinyint(1) NOT NULL DEFAULT 0` |
| `fax` | `varchar(255) DEFAULT NULL` |
| `owner_id` | `bigint(20) unsigned NOT NULL` |
| `owner_type` | `varchar(255) NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## type_diplome_champs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `type_diplome_id` | `bigint(20) unsigned NOT NULL` |
| `champ_key` | `varchar(191) NOT NULL` |
| `obligatoire` | `tinyint(1) NOT NULL DEFAULT 0` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `type_diplome_champs_type_diplome_id_champ_key_unique` (`type_diplome_id`,`champ_key`)
CONSTRAINT `type_diplome_champs_type_diplome_id_foreign` FOREIGN KEY (`type_diplome_id`) REFERENCES `type_diplomes` (`id`) ON DELETE CASCADE
```


## type_diplomes

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(191) NOT NULL` |
| `actif` | `tinyint(1) NOT NULL DEFAULT 1` |
| `ordre` | `int(10) unsigned NOT NULL DEFAULT 0` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## ue_validations

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `unite_enseignement_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `periode_id` | `bigint(20) unsigned NOT NULL` |
| `moyenne` | `decimal(5,2) NOT NULL` |
| `credit_obtenu` | `int(11) NOT NULL` |
| `validee` | `tinyint(1) NOT NULL DEFAULT 0` |
| `type_validation` | `enum('normale','rattrapage','compensation') DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `releve_note_id` | `bigint(20) unsigned DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `ue_validation_unique` (`etudiant_id`,`unite_enseignement_id`,`annee_scolaire_id`,`periode_id`)
KEY `ue_validations_unite_enseignement_id_foreign` (`unite_enseignement_id`)
KEY `ue_validations_annee_scolaire_id_foreign` (`annee_scolaire_id`)
KEY `ue_validations_periode_id_foreign` (`periode_id`)
KEY `ue_validations_releve_note_id_foreign` (`releve_note_id`)
```


## unite_enseignements

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `code` | `varchar(255) NOT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `credit` | `int(11) DEFAULT NULL` |
| `periode_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `filiere_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## unite_valeurs

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) DEFAULT NULL` |
| `periode_id` | `bigint(20) unsigned DEFAULT 1` |
| `volume_horaire` | `int(11) DEFAULT 0` |
| `cm` | `varchar(255) DEFAULT NULL` |
| `td` | `varchar(255) DEFAULT NULL` |
| `tp` | `varchar(255) DEFAULT NULL` |
| `ec` | `varchar(255) DEFAULT NULL` |
| `coefficient` | `int(11) DEFAULT NULL` |
| `unite_enseignement_id` | `bigint(20) unsigned DEFAULT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `filiere_id` | `bigint(20) unsigned DEFAULT NULL` |
| `niveau_id` | `bigint(20) unsigned DEFAULT NULL` |
| `matiere_id` | `bigint(20) unsigned NOT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `unite_valeurs_slug_unique` (`slug`)
KEY `unite_valeurs_unite_enseignement_id_foreign` (`unite_enseignement_id`)
KEY `unite_valeurs_periode_id_foreign` (`periode_id`)
KEY `unite_valeurs_filiere_id_foreign` (`filiere_id`)
KEY `unite_valeurs_niveau_id_foreign` (`niveau_id`)
KEY `unite_valeurs_matiere_id_foreign` (`matiere_id`)
CONSTRAINT `unite_valeurs_matiere_id_foreign` FOREIGN KEY (`matiere_id`) REFERENCES `matieres` (`id`) ON DELETE CASCADE
CONSTRAINT `unite_valeurs_niveau_id_foreign` FOREIGN KEY (`niveau_id`) REFERENCES `niveaux` (`id`) ON DELETE SET NULL
```


## urgent_infos

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `title` | `varchar(191) NOT NULL` |
| `slug` | `varchar(191) DEFAULT NULL` |
| `summary` | `text DEFAULT NULL` |
| `file_url` | `varchar(191) DEFAULT NULL` |
| `file_path` | `varchar(191) DEFAULT NULL` |
| `is_published` | `tinyint(1) NOT NULL DEFAULT 0` |
| `published_at` | `timestamp NULL DEFAULT NULL` |
| `created_by` | `bigint(20) unsigned DEFAULT NULL` |
| `deleted_at` | `timestamp NULL DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `image` | `varchar(191) DEFAULT NULL` |
| `attachments` | `longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL` |
| `target_audience` | `enum('all','students','teachers','administration','group') NOT NULL DEFAULT 'all'` |
| `target_group_id` | `bigint(20) unsigned DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `urgent_infos_slug_unique` (`slug`)
KEY `urgent_infos_created_by_foreign` (`created_by`)
KEY `urgent_infos_target_group_id_foreign` (`target_group_id`)
CONSTRAINT `urgent_infos_target_group_id_foreign` FOREIGN KEY (`target_group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
```


## user_unite_valeur

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `user_id` | `bigint(20) unsigned NOT NULL` |
| `unite_valeur_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
```


## users

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `nom` | `varchar(255) NOT NULL` |
| `prenom` | `varchar(255) NOT NULL` |
| `password` | `varchar(255) NOT NULL` |
| `must_change_password` | `tinyint(1) NOT NULL DEFAULT 0` |
| `email` | `varchar(255) DEFAULT NULL` |
| `genre` | `enum('Masculin','Féminin') NOT NULL` |
| `email_verified_at` | `timestamp NULL DEFAULT NULL` |
| `image` | `varchar(255) DEFAULT NULL` |
| `matricule` | `varchar(255) DEFAULT NULL` |
| `biographie` | `longtext DEFAULT NULL` |
| `annee_admission` | `text DEFAULT NULL` |
| `remember_token` | `varchar(100) DEFAULT NULL` |
| `slug` | `varchar(255) NOT NULL` |
| `supervisor_type` | `enum('interne','externe','non_surveillant') NOT NULL DEFAULT 'non_surveillant'` |
| `supervisor_notes` | `text DEFAULT NULL` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |
| `tel` | `varchar(255) DEFAULT NULL` |
| `nom_jeune_fille` | `varchar(255) DEFAULT NULL` |
| `date_naissance` | `timestamp NULL DEFAULT NULL` |
| `lieu_naissance` | `varchar(255) DEFAULT NULL` |
| `nationalite` | `varchar(255) DEFAULT NULL` |
| `group_id` | `bigint(20) unsigned DEFAULT NULL` |
| `nif` | `varchar(191) DEFAULT NULL` |
| `identity_document_path` | `varchar(191) DEFAULT NULL` |
| `nif_document_path` | `varchar(191) DEFAULT NULL` |
| `diploma_document_path` | `varchar(191) DEFAULT NULL` |
| `cv_document_path` | `varchar(191) DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `users_email_unique` (`email`)
UNIQUE KEY `users_matricule_unique` (`matricule`)
```


## uv_validations

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `slug` | `varchar(191) NOT NULL` |
| `etudiant_id` | `bigint(20) unsigned NOT NULL` |
| `releve_note_id` | `bigint(20) unsigned DEFAULT NULL` |
| `unite_valeur_id` | `bigint(20) unsigned NOT NULL` |
| `annee_scolaire_id` | `bigint(20) unsigned NOT NULL` |
| `periode_id` | `bigint(20) unsigned NOT NULL` |
| `moyenne` | `decimal(5,2) NOT NULL` |
| `note_devoir` | `decimal(5,2) DEFAULT NULL` |
| `note_examen` | `decimal(5,2) DEFAULT NULL` |
| `coefficient` | `int(11) NOT NULL` |
| `credit_obtenu` | `int(11) DEFAULT NULL` |
| `validee` | `tinyint(1) NOT NULL DEFAULT 0` |
| `created_at` | `timestamp NULL DEFAULT NULL` |
| `updated_at` | `timestamp NULL DEFAULT NULL` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `uv_validation_unique` (`etudiant_id`,`unite_valeur_id`,`annee_scolaire_id`,`periode_id`)
KEY `uv_validations_unite_valeur_id_foreign` (`unite_valeur_id`)
KEY `uv_validations_annee_scolaire_id_foreign` (`annee_scolaire_id`)
KEY `uv_validations_periode_id_foreign` (`periode_id`)
KEY `uv_validations_releve_note_id_foreign` (`releve_note_id`)
```


## uv_weightings

| Attribut | Déclaration source |
|---|---|
| `id` | `bigint(20) unsigned NOT NULL AUTO_INCREMENT` |
| `unite_valeur_id` | `bigint(20) unsigned NOT NULL` |
| `filiere_id` | `bigint(20) unsigned NOT NULL` |
| `devoir` | `tinyint(3) unsigned NOT NULL DEFAULT 0` |
| `interrogation` | `tinyint(3) unsigned NOT NULL DEFAULT 0` |
| `examen` | `tinyint(3) unsigned NOT NULL DEFAULT 0` |
| `tp` | `tinyint(3) unsigned NOT NULL DEFAULT 0` |
| `expose` | `tinyint(3) unsigned NOT NULL DEFAULT 0` |

Clés, index et contraintes :

```sql
PRIMARY KEY (`id`)
UNIQUE KEY `uv_weightings_unique_uv_filiere` (`unite_valeur_id`,`filiere_id`)
```

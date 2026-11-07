# Retrait des motifs — état du 7 novembre 2026

Demande utilisateur : supprimer les champs de motif des formulaires et de la base, sans les remplacer par des motifs cachés ou générés automatiquement.

## Base de départ

GitHub récupéré en avance rapide : `6dc7a82` (37 commits). Aucun changement local suivi préexistant ; `tmp/` préservé.

Inventaire obtenu en appliquant les migrations existantes dans PGlite local puis en interrogeant le catalogue PostgreSQL : **72 colonnes**, **40 fonctions** mentionnant les motifs. Aucun changement distant.

## Ordre nécessaire

L’éditeur visuel d’articles est implémenté dans le commit local `1ebaba7`, sans dépendance supplémentaire. Les articles existants en texte restent compatibles. Le nouveau contenu est un document structuré validé par Zod ; le HTML public est reconstruit depuis des balises autorisées, avec échappement des textes et adresses HTTPS. Le parcours conserve une relecture explicite via ReviewedForm.

Vérifications de cette étape : TypeScript sans génération incrémentale, ESLint, `npm test` complet (dont 201 groupes PostgreSQL et les vérifications supplémentaires du dépôt), deux tests Playwright réussis aux largeurs 390 et 1440 px. Les tests couvrent mise en forme, aperçu, refus d’adresse dangereuse, confirmation, reprise après erreur concurrente et réouverture du contenu enregistré.

SQL articles approuvé par l’utilisateur le 7 novembre 2026. La migration `202611070092_remove_article_reason.sql` retire réellement la colonne ; le formulaire, le type métier et le schéma API ne contiennent plus le motif. Aucun motif automatique n’est transmis. Le script de reprise des articles et les tests existants ont été adaptés. Aucun push GitHub, déploiement ou changement distant effectué.

1. Adapter les RPC, triggers, contraintes et projections dépendants ; garder leurs contrôles de droits, année, concurrence, montants et états.
2. Retirer les paramètres et validations de motif dans les API/services et les formulaires. Ne pas envoyer une valeur automatique pour satisfaire un ancien contrôle.
3. Supprimer les colonnes par de nouvelles migrations. Ne modifier aucune migration existante. Ne pas utiliser `CASCADE`.
4. Vérifier les workflows sans motif, les refus d’accès et les contre-opérations, puis régénérer les deux documents du schéma.

Le premier SQL complet proposé est `PROPOSITION_SQL_RETRAIT_MOTIF_ARTICLES_2026-11-07.sql`. Il retire uniquement la dépendance du parcours articles ; le retrait global n’est pas encore réalisé. Son contenu approuvé a été repris dans la nouvelle migration 092 et appliqué uniquement dans les bases de test locales. Les autres domaines doivent recevoir leurs migrations et adaptations propres avant suppression des colonnes.

L’audit continuera à conserver l’auteur, la date, l’action et les valeurs avant/après. Aucune purge des anciennes charges JSON d’audit n’est incluse dans la proposition.

## Inventaire initial des colonnes (71 restantes après les articles)

- `escen.absence_justifications.reason`
- `escen.absence_justifications.review_reason`
- `escen.academic_offerings.reason`
- `escen.academic_rule_versions.reason`
- `escen.academic_working_year.reason`
- `escen.academic_years.reason`
- `escen.accounts.reason`
- `escen.allocation_reversals.reason`
- `escen.annual_fee_schedules.reason`
- `escen.annual_payment_channels.reason`
- `escen.answer_corrections.reason`
- `escen.application_documents.reason`
- `escen.application_events.reason`
- `escen.application_registration_payments.reason`
- `escen.asset_movements.reason`
- `escen.assets.reason`
- `escen.attendances.reason`
- `escen.blocked_periods.reason`
- `escen.buildings.reason`
- `escen.communications.withdrawal_reason`
- `escen.complaint_events.reason`
- `escen.complaints.reason`
- `escen.contract_discounts.reason`
- `escen.contract_versions.reason`
- `escen.course_resources.reason`
- `escen.credit_notes.reason`
- `escen.curricula.reason`
- `escen.curriculum_components.reason`
- `escen.curriculum_semesters.reason`
- `escen.cycles.reason`
- `escen.document_reviews.reason`
- `escen.email_outbox.reason`
- `escen.enrollment_events.reason`
- `escen.enrollment_groups.reason`
- `escen.evaluation_candidates.eligibility_reason`
- `escen.evaluation_transitions.reason`
- `escen.evaluations.cancellation_reason`
- `escen.exam_deliveries.reason`
- `escen.exam_papers.reason`
- `escen.grade_revisions.reason`
- `escen.group_offerings.reason`
- `escen.groups.reason`
- `escen.jury_decisions.reason`
- `escen.levels.reason`
- `escen.online_applications.reason`
- `escen.payment_reversals.reason`
- `escen.programs.reason`
- `escen.purchase_receipts.reason`
- `escen.purchases.reason`
- `escen.refunds.reason`
- `escen.role_grants.reason`
- `escen.rooms.reason`
- `escen.scholarship_awards.reason`
- `escen.scholarship_awards.revocation_reason`
- `escen.session_participants.reason`
- `escen.sessions.reason`
- `escen.sites.reason`
- `escen.staff.reason`
- `escen.students.reason`
- `escen.subjects.reason`
- `escen.suppliers.reason`
- `escen.teachers.reason`
- `escen.teaching_assignments.reason`
- `escen.teaching_units.reason`
- `escen.tracks.reason`
- `escen.website_articles.reason` — retirée par la migration 092
- `escen.website_brochures.reason`
- `escen.website_intakes.reason`
- `escen.website_level_document_rules.reason`
- `escen_private.audit_events.reason`
- `escen_private.import_issues.resolution_reason`
- `escen_private.source_mappings.reason`

## Fonctions dépendantes

- `escen.change_shared_course`
- `escen.create_shared_course`
- `escen_private.application_event`
- `escen_private.application_json`
- `escen_private.apply_evaluation_transition`
- `escen_private.assert_exam_reschedule`
- `escen_private.auto_assign_enrollment_group`
- `escen_private.check_context_stability`
- `escen_private.guard_attendance_correction_reason`
- `escen_private.guard_email_outbox`
- `escen_private.guard_exam_content`
- `escen_private.guard_exam_reschedule`
- `escen_private.guard_personnel_change_reason`
- `escen_private.move_session_exam`
- `escen_private.record_audit`
- `escen_private.restore_source_academic_years`
- `escen_private.review_absence_justification`
- `escen_private.sync_session_participants`
- `escen_private.sync_website_offerings`
- `public.escen_academic_year_command`
- `public.escen_application_command`
- `public.escen_application_submit`
- `public.escen_audit_journal_page`
- `public.escen_brochures_manage`
- `public.escen_candidate_dossier`
- `public.escen_catalog_resume`
- `public.escen_delegate_attendance_transaction`
- `public.escen_email_claim`
- `public.escen_email_complete`
- `public.escen_email_enqueue`
- `public.escen_email_page`
- `public.escen_email_retry`
- `public.escen_manage_account`
- `public.escen_payment_adjustment`
- `public.escen_payment_transaction`
- `public.escen_shared_course_change`
- `public.escen_shared_course_create`
- `public.escen_website_level_documents`
- `public.escen_website_manage_before_annual_scope`
- `public.escen_website_public_before_annual_scope`

## Vérification du retrait des motifs des articles

- Tests PostgreSQL : absence physique de la colonne, création/publication/retrait sans motif, droits et concurrence conservés, audit sans nouveau motif. Migration sur une base peuplée : contenu existant conservé, ancien audit strictement inchangé.
- API : enregistrement sans motif, champ ancien refusé par le schéma strict, absence de motif généré dans le payload RPC, permission et version obligatoires.
- Interface : aucun champ motif ; rédaction, aperçu, relecture, sauvegarde, réouverture, reprise après conflit, publication et retrait. Contrôles mobiles des actions et des messages de succès conservés.
- Documentation du schéma régénérée avec `npm run db:describe` : 1097 colonnes au lieu de 1098.
- Le retrait des motifs des autres domaines et leur application distante restent à faire.

Bilan de la migration 092 : `npm test` complet réussi, dont 202 groupes de contrôles PostgreSQL ; 5 tests Playwright éditeur/API et 5 tests de régression publication/retrait/fenêtres réussis. Un test facultatif de lecture depuis une copie externe du site est ignoré faute de serveur externe configuré. TypeScript et ESLint sans erreur.

# Dictionnaire de la base relationnelle corrigée

Généré avec `npm run db:describe` en exécutant les migrations dans PostgreSQL local (PGlite). Aucun accès à Supabase ou aux données de la sauvegarde.

104 tables métier, 11 tables privées, 824 colonnes, 227 clés étrangères, 163 CHECK de tables et 4 exclusions. Les domaines ajoutent les bornes des notes, des montants FCFA et des textes obligatoires.

Toutes les tables ont RLS activée, sans accès applicatif permis à ce stade. Les noms techniques ne sont pas des libellés à afficher dans l’interface.

| Schéma | Table | Colonnes | FK | RLS |
|---|---|---:|---:|---|
| escen | absence_justifications | 8 | 3 | Oui |
| escen | academic_offerings | 5 | 3 | Oui |
| escen | academic_rule_versions | 6 | 1 | Oui |
| escen | academic_years | 8 | 0 | Oui |
| escen | accounts | 8 | 2 | Oui |
| escen | allocation_reversals | 5 | 2 | Oui |
| escen | answer_corrections | 6 | 2 | Oui |
| escen | assessment_weights | 5 | 1 | Oui |
| escen | asset_movements | 7 | 3 | Oui |
| escen | assets | 8 | 1 | Oui |
| escen | attendances | 11 | 3 | Oui |
| escen | blocked_periods | 7 | 2 | Oui |
| escen | buildings | 6 | 1 | Oui |
| escen | communication_audiences | 6 | 4 | Oui |
| escen | communication_files | 3 | 2 | Oui |
| escen | communication_reads | 4 | 2 | Oui |
| escen | communications | 8 | 1 | Oui |
| escen | complaint_events | 7 | 2 | Oui |
| escen | complaints | 7 | 2 | Oui |
| escen | contract_discounts | 6 | 2 | Oui |
| escen | contract_lines | 7 | 3 | Oui |
| escen | contract_versions | 8 | 3 | Oui |
| escen | credit_awards | 5 | 2 | Oui |
| escen | credit_notes | 6 | 2 | Oui |
| escen | curricula | 9 | 4 | Oui |
| escen | curriculum_components | 11 | 2 | Oui |
| escen | curriculum_semesters | 5 | 1 | Oui |
| escen | cycles | 5 | 0 | Oui |
| escen | delegate_mandates | 6 | 2 | Oui |
| escen | document_requirements | 4 | 2 | Oui |
| escen | document_reviews | 6 | 2 | Oui |
| escen | document_types | 6 | 0 | Oui |
| escen | enrollment_events | 7 | 2 | Oui |
| escen | enrollment_groups | 8 | 3 | Oui |
| escen | enrollments | 7 | 3 | Oui |
| escen | evaluation_candidates | 7 | 2 | Oui |
| escen | evaluation_transitions | 7 | 2 | Oui |
| escen | evaluations | 12 | 3 | Oui |
| escen | exam_answers | 6 | 2 | Oui |
| escen | exam_attempts | 9 | 2 | Oui |
| escen | exam_deliveries | 6 | 2 | Oui |
| escen | exam_options | 5 | 1 | Oui |
| escen | exam_papers | 15 | 4 | Oui |
| escen | exam_parts | 6 | 1 | Oui |
| escen | exam_questions | 8 | 1 | Oui |
| escen | exam_room_candidates | 4 | 2 | Oui |
| escen | exam_room_supervisors | 3 | 2 | Oui |
| escen | exam_rooms | 5 | 2 | Oui |
| escen | expenses | 9 | 4 | Oui |
| escen | fee_rates | 8 | 3 | Oui |
| escen | fee_types | 5 | 0 | Oui |
| escen | file_objects | 9 | 1 | Oui |
| escen | financial_contracts | 5 | 1 | Oui |
| escen | generated_documents | 11 | 5 | Oui |
| escen | grade_revisions | 9 | 3 | Oui |
| escen | grades | 8 | 3 | Oui |
| escen | group_offerings | 6 | 4 | Oui |
| escen | groups | 7 | 3 | Oui |
| escen | installments | 6 | 1 | Oui |
| escen | juries | 6 | 3 | Oui |
| escen | jury_decisions | 13 | 5 | Oui |
| escen | jury_grade_inputs | 5 | 2 | Oui |
| escen | jury_members | 4 | 2 | Oui |
| escen | levels | 7 | 1 | Oui |
| escen | offering_semesters | 6 | 2 | Oui |
| escen | payment_allocations | 10 | 6 | Oui |
| escen | payment_documents | 3 | 2 | Oui |
| escen | payment_reversals | 5 | 2 | Oui |
| escen | payments | 13 | 3 | Oui |
| escen | people | 15 | 0 | Oui |
| escen | permissions | 3 | 0 | Oui |
| escen | programs | 7 | 0 | Oui |
| escen | purchase_lines | 5 | 1 | Oui |
| escen | purchase_receipts | 7 | 2 | Oui |
| escen | purchases | 8 | 3 | Oui |
| escen | receipts | 6 | 2 | Oui |
| escen | refunds | 7 | 2 | Oui |
| escen | role_grants | 11 | 7 | Oui |
| escen | role_permissions | 3 | 2 | Oui |
| escen | roles | 4 | 0 | Oui |
| escen | rooms | 9 | 2 | Oui |
| escen | schedule_series | 6 | 1 | Oui |
| escen | scholarship_awards | 10 | 3 | Oui |
| escen | scholarships | 7 | 0 | Oui |
| escen | session_supervisors | 3 | 2 | Oui |
| escen | sessions | 18 | 5 | Oui |
| escen | sites | 7 | 0 | Oui |
| escen | staff | 5 | 1 | Oui |
| escen | staff_contracts | 7 | 2 | Oui |
| escen | student_contacts | 8 | 2 | Oui |
| escen | student_documents | 8 | 5 | Oui |
| escen | students | 7 | 1 | Oui |
| escen | subjects | 6 | 0 | Oui |
| escen | suppliers | 8 | 0 | Oui |
| escen | support_categories | 4 | 0 | Oui |
| escen | support_files | 3 | 2 | Oui |
| escen | support_messages | 5 | 2 | Oui |
| escen | support_tickets | 10 | 3 | Oui |
| escen | syllabuses | 11 | 2 | Oui |
| escen | teacher_attendances | 7 | 3 | Oui |
| escen | teachers | 4 | 1 | Oui |
| escen | teaching_assignments | 8 | 4 | Oui |
| escen | teaching_units | 6 | 1 | Oui |
| escen | tracks | 7 | 1 | Oui |
| escen_private | archive_objects | 11 | 1 | Oui |
| escen_private | audit_events | 13 | 1 | Oui |
| escen_private | history_catalog | 2 | 0 | Oui |
| escen_private | import_batches | 6 | 0 | Oui |
| escen_private | import_issues | 7 | 2 | Oui |
| escen_private | import_runs | 7 | 2 | Oui |
| escen_private | legacy_rows | 6 | 1 | Oui |
| escen_private | model_decisions | 6 | 1 | Oui |
| escen_private | portal_revision | 5 | 1 | Oui |
| escen_private | recovery_candidates | 7 | 1 | Oui |
| escen_private | source_mappings | 9 | 3 | Oui |

## escen.absence_justifications

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| attendance_id | uuid | NO | — | NEVER |
| file_id | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| status | text | NO | 'EN_ATTENTE'::text | NEVER |
| reviewed_by | uuid | YES | — | NEVER |
| reviewed_at | timestamptz | YES | — | NEVER |
| review_reason | text | YES | — | NEVER |

Contraintes :

```sql
absence_justifications_attendance_id_fkey: FOREIGN KEY (attendance_id) REFERENCES escen.attendances(id) ON DELETE RESTRICT
absence_justifications_attendance_id_not_null: NOT NULL attendance_id
absence_justifications_check: CHECK (((status = 'EN_ATTENTE'::text) OR ((reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL) AND (review_reason IS NOT NULL) AND (length(btrim(review_reason)) > 0))))
absence_justifications_file_id_fkey: FOREIGN KEY (file_id) REFERENCES escen.file_objects(id) ON DELETE RESTRICT
absence_justifications_file_id_not_null: NOT NULL file_id
absence_justifications_id_not_null: NOT NULL id
absence_justifications_pkey: PRIMARY KEY (id)
absence_justifications_reason_not_null: NOT NULL reason
absence_justifications_reviewed_by_fkey: FOREIGN KEY (reviewed_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
absence_justifications_status_check: CHECK ((status = ANY (ARRAY['EN_ATTENTE'::text, 'VALIDE'::text, 'REFUSE'::text])))
absence_justifications_status_not_null: NOT NULL status
```

Index :

```sql
CREATE UNIQUE INDEX absence_justifications_pkey ON escen.absence_justifications USING btree (id)
CREATE INDEX fk_18873 ON escen.absence_justifications USING btree (attendance_id)
CREATE INDEX fk_18878 ON escen.absence_justifications USING btree (file_id)
CREATE INDEX fk_18883 ON escen.absence_justifications USING btree (reviewed_by)
```

## escen.academic_offerings

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| curriculum_id | uuid | NO | — | NEVER |
| academic_year_id | uuid | NO | — | NEVER |
| level_id | uuid | NO | — | NEVER |
| site_id | uuid | NO | — | NEVER |

Contraintes :

```sql
academic_offerings_academic_year_id_fkey: FOREIGN KEY (academic_year_id) REFERENCES escen.academic_years(id) ON DELETE RESTRICT
academic_offerings_academic_year_id_not_null: NOT NULL academic_year_id
academic_offerings_curriculum_id_academic_year_id_site_id_key: UNIQUE (curriculum_id, academic_year_id, site_id)
academic_offerings_curriculum_id_level_id_fkey: FOREIGN KEY (curriculum_id, level_id) REFERENCES escen.curricula(id, level_id) ON DELETE RESTRICT
academic_offerings_curriculum_id_not_null: NOT NULL curriculum_id
academic_offerings_id_academic_year_id_level_id_key: UNIQUE (id, academic_year_id, level_id)
academic_offerings_id_curriculum_id_key: UNIQUE (id, curriculum_id)
academic_offerings_id_not_null: NOT NULL id
academic_offerings_id_site_id_key: UNIQUE (id, site_id)
academic_offerings_level_id_not_null: NOT NULL level_id
academic_offerings_pkey: PRIMARY KEY (id)
academic_offerings_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
academic_offerings_site_id_not_null: NOT NULL site_id
```

Index :

```sql
CREATE UNIQUE INDEX academic_offerings_curriculum_id_academic_year_id_site_id_key ON escen.academic_offerings USING btree (curriculum_id, academic_year_id, site_id)
CREATE UNIQUE INDEX academic_offerings_id_academic_year_id_level_id_key ON escen.academic_offerings USING btree (id, academic_year_id, level_id)
CREATE UNIQUE INDEX academic_offerings_id_curriculum_id_key ON escen.academic_offerings USING btree (id, curriculum_id)
CREATE UNIQUE INDEX academic_offerings_id_site_id_key ON escen.academic_offerings USING btree (id, site_id)
CREATE UNIQUE INDEX academic_offerings_pkey ON escen.academic_offerings USING btree (id)
CREATE INDEX fk_16952 ON escen.academic_offerings USING btree (academic_year_id)
CREATE INDEX fk_16957 ON escen.academic_offerings USING btree (site_id)
CREATE INDEX fk_16962 ON escen.academic_offerings USING btree (curriculum_id, level_id)
```

## escen.academic_rule_versions

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| version | int4 | NO | — | NEVER |
| rules | jsonb | NO | — | NEVER |
| approved_by | uuid | NO | — | NEVER |
| approved_at | timestamptz | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |

Contraintes :

```sql
academic_rule_versions_approved_at_not_null: NOT NULL approved_at
academic_rule_versions_approved_by_fkey: FOREIGN KEY (approved_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
academic_rule_versions_approved_by_not_null: NOT NULL approved_by
academic_rule_versions_id_not_null: NOT NULL id
academic_rule_versions_pkey: PRIMARY KEY (id)
academic_rule_versions_reason_not_null: NOT NULL reason
academic_rule_versions_rules_not_null: NOT NULL rules
academic_rule_versions_version_check: CHECK ((version > 0))
academic_rule_versions_version_key: UNIQUE (version)
academic_rule_versions_version_not_null: NOT NULL version
```

Index :

```sql
CREATE UNIQUE INDEX academic_rule_versions_pkey ON escen.academic_rule_versions USING btree (id)
CREATE UNIQUE INDEX academic_rule_versions_version_key ON escen.academic_rule_versions USING btree (version)
CREATE INDEX fk_18033 ON escen.academic_rule_versions USING btree (approved_by)
```

## escen.academic_years

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| starts_on | date | NO | — | NEVER |
| ends_on | date | NO | — | NEVER |
| status | text | NO | 'BROUILLON'::text | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
academic_years_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
academic_years_check: CHECK ((ends_on > starts_on))
academic_years_code_key: UNIQUE (code)
academic_years_code_not_null: NOT NULL code
academic_years_ends_on_not_null: NOT NULL ends_on
academic_years_id_not_null: NOT NULL id
academic_years_name_not_null: NOT NULL name
academic_years_pkey: PRIMARY KEY (id)
academic_years_starts_on_not_null: NOT NULL starts_on
academic_years_status_check: CHECK ((status = ANY (ARRAY['BROUILLON'::text, 'OUVERTE'::text, 'EN_CLOTURE'::text, 'CLOTUREE'::text])))
academic_years_status_not_null: NOT NULL status
```

Index :

```sql
CREATE UNIQUE INDEX academic_years_code_key ON escen.academic_years USING btree (code)
CREATE UNIQUE INDEX academic_years_pkey ON escen.academic_years USING btree (id)
```

## escen.accounts

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| person_id | uuid | NO | — | NEVER |
| auth_user_id | uuid | YES | — | NEVER |
| active | bool | NO | false | NEVER |
| created_at | timestamptz | NO | now() | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |
| last_modified_by | uuid | YES | — | NEVER |

Contraintes :

```sql
accounts_active_not_null: NOT NULL active
accounts_auth_user_id_key: UNIQUE (auth_user_id)
accounts_created_at_not_null: NOT NULL created_at
accounts_id_not_null: NOT NULL id
accounts_last_modified_by_fkey: FOREIGN KEY (last_modified_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
accounts_person_id_fkey: FOREIGN KEY (person_id) REFERENCES escen.people(id) ON DELETE RESTRICT
accounts_person_id_key: UNIQUE (person_id)
accounts_person_id_not_null: NOT NULL person_id
accounts_pkey: PRIMARY KEY (id)
archived_account_inactive: CHECK (((archived_at IS NULL) OR (NOT active)))
```

Index :

```sql
CREATE UNIQUE INDEX accounts_auth_user_id_key ON escen.accounts USING btree (auth_user_id)
CREATE INDEX accounts_modified_by_fk ON escen.accounts USING btree (last_modified_by)
CREATE UNIQUE INDEX accounts_person_id_key ON escen.accounts USING btree (person_id)
CREATE UNIQUE INDEX accounts_pkey ON escen.accounts USING btree (id)
CREATE INDEX fk_16571 ON escen.accounts USING btree (person_id)
```

## escen.allocation_reversals

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| allocation_id | uuid | NO | — | NEVER |
| actor_id | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| reversed_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
allocation_reversals_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
allocation_reversals_actor_id_not_null: NOT NULL actor_id
allocation_reversals_allocation_id_fkey: FOREIGN KEY (allocation_id) REFERENCES escen.payment_allocations(id) ON DELETE RESTRICT
allocation_reversals_allocation_id_key: UNIQUE (allocation_id)
allocation_reversals_allocation_id_not_null: NOT NULL allocation_id
allocation_reversals_id_not_null: NOT NULL id
allocation_reversals_pkey: PRIMARY KEY (id)
allocation_reversals_reason_not_null: NOT NULL reason
allocation_reversals_reversed_at_not_null: NOT NULL reversed_at
```

Index :

```sql
CREATE UNIQUE INDEX allocation_reversals_allocation_id_key ON escen.allocation_reversals USING btree (allocation_id)
CREATE UNIQUE INDEX allocation_reversals_pkey ON escen.allocation_reversals USING btree (id)
CREATE INDEX fk_18657 ON escen.allocation_reversals USING btree (allocation_id)
CREATE INDEX fk_18662 ON escen.allocation_reversals USING btree (actor_id)
```

## escen.answer_corrections

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| answer_id | uuid | NO | — | NEVER |
| points | numeric | NO | — | NEVER |
| corrected_by | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| corrected_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
answer_corrections_answer_id_fkey: FOREIGN KEY (answer_id) REFERENCES escen.exam_answers(id) ON DELETE RESTRICT
answer_corrections_answer_id_not_null: NOT NULL answer_id
answer_corrections_corrected_at_not_null: NOT NULL corrected_at
answer_corrections_corrected_by_fkey: FOREIGN KEY (corrected_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
answer_corrections_corrected_by_not_null: NOT NULL corrected_by
answer_corrections_id_not_null: NOT NULL id
answer_corrections_pkey: PRIMARY KEY (id)
answer_corrections_points_check: CHECK ((points >= (0)::numeric))
answer_corrections_points_not_null: NOT NULL points
answer_corrections_reason_not_null: NOT NULL reason
```

Index :

```sql
CREATE UNIQUE INDEX answer_corrections_pkey ON escen.answer_corrections USING btree (id)
CREATE INDEX fk_17882 ON escen.answer_corrections USING btree (answer_id)
CREATE INDEX fk_17887 ON escen.answer_corrections USING btree (corrected_by)
```

## escen.assessment_weights

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| curriculum_id | uuid | NO | — | NEVER |
| component_id | uuid | NO | — | NEVER |
| evaluation_kind | text | NO | — | NEVER |
| percent | numeric | NO | — | NEVER |

Contraintes :

```sql
assessment_weights_component_id_curriculum_id_fkey: FOREIGN KEY (component_id, curriculum_id) REFERENCES escen.curriculum_components(id, curriculum_id) ON DELETE RESTRICT
assessment_weights_component_id_evaluation_kind_key: UNIQUE (component_id, evaluation_kind)
assessment_weights_component_id_not_null: NOT NULL component_id
assessment_weights_curriculum_id_not_null: NOT NULL curriculum_id
assessment_weights_evaluation_kind_check: CHECK ((evaluation_kind = ANY (ARRAY['DEVOIR'::text, 'EXAMEN'::text, 'INTERROGATION'::text, 'TP'::text, 'EXPOSE'::text, 'PROJET'::text])))
assessment_weights_evaluation_kind_not_null: NOT NULL evaluation_kind
assessment_weights_id_not_null: NOT NULL id
assessment_weights_percent_check: CHECK (((percent > (0)::numeric) AND (percent <= (100)::numeric)))
assessment_weights_percent_not_null: NOT NULL percent
assessment_weights_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE INDEX assessment_component_fk ON escen.assessment_weights USING btree (component_id, curriculum_id)
CREATE UNIQUE INDEX assessment_weights_component_id_evaluation_kind_key ON escen.assessment_weights USING btree (component_id, evaluation_kind)
CREATE UNIQUE INDEX assessment_weights_pkey ON escen.assessment_weights USING btree (id)
```

## escen.asset_movements

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| asset_id | uuid | NO | — | NEVER |
| receipt_id | uuid | YES | — | NEVER |
| quantity | numeric | NO | — | NEVER |
| actor_id | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| happened_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
asset_movements_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
asset_movements_actor_id_not_null: NOT NULL actor_id
asset_movements_asset_id_fkey: FOREIGN KEY (asset_id) REFERENCES escen.assets(id) ON DELETE RESTRICT
asset_movements_asset_id_not_null: NOT NULL asset_id
asset_movements_happened_at_not_null: NOT NULL happened_at
asset_movements_id_not_null: NOT NULL id
asset_movements_pkey: PRIMARY KEY (id)
asset_movements_quantity_check: CHECK ((quantity <> (0)::numeric))
asset_movements_quantity_not_null: NOT NULL quantity
asset_movements_reason_not_null: NOT NULL reason
asset_movements_receipt_id_fkey: FOREIGN KEY (receipt_id) REFERENCES escen.purchase_receipts(id) ON DELETE RESTRICT
```

Index :

```sql
CREATE UNIQUE INDEX asset_movements_pkey ON escen.asset_movements USING btree (id)
CREATE INDEX fk_19231 ON escen.asset_movements USING btree (asset_id)
CREATE INDEX fk_19236 ON escen.asset_movements USING btree (receipt_id)
CREATE INDEX fk_19241 ON escen.asset_movements USING btree (actor_id)
```

## escen.assets

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| site_id | uuid | NO | — | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| location | text | YES | — | NEVER |
| status | text | NO | — | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
assets_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
assets_code_key: UNIQUE (code)
assets_code_not_null: NOT NULL code
assets_id_not_null: NOT NULL id
assets_name_not_null: NOT NULL name
assets_pkey: PRIMARY KEY (id)
assets_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
assets_site_id_not_null: NOT NULL site_id
assets_status_check: CHECK ((status = ANY (ARRAY['DISPONIBLE'::text, 'MAINTENANCE'::text, 'HORS_SERVICE'::text])))
assets_status_not_null: NOT NULL status
```

Index :

```sql
CREATE UNIQUE INDEX assets_code_key ON escen.assets USING btree (code)
CREATE UNIQUE INDEX assets_pkey ON escen.assets USING btree (id)
CREATE INDEX fk_19210 ON escen.assets USING btree (site_id)
```

## escen.attendances

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| session_id | uuid | NO | — | NEVER |
| enrollment_id | uuid | NO | — | NEVER |
| offering_id | uuid | NO | — | NEVER |
| status | text | NO | — | NEVER |
| arrived_at | timestamptz | YES | — | NEVER |
| left_at | timestamptz | YES | — | NEVER |
| late_minutes | int4 | YES | — | NEVER |
| recorded_by | uuid | NO | — | NEVER |
| recorded_at | timestamptz | NO | now() | NEVER |
| comment | text | YES | — | NEVER |

Contraintes :

```sql
attendances_check: CHECK (((left_at IS NULL) OR ((arrived_at IS NOT NULL) AND (left_at >= arrived_at))))
attendances_enrollment_id_not_null: NOT NULL enrollment_id
attendances_enrollment_id_offering_id_fkey: FOREIGN KEY (enrollment_id, offering_id) REFERENCES escen.enrollments(id, offering_id) ON DELETE RESTRICT
attendances_id_not_null: NOT NULL id
attendances_late_minutes_check: CHECK ((late_minutes >= 0))
attendances_offering_id_not_null: NOT NULL offering_id
attendances_pkey: PRIMARY KEY (id)
attendances_recorded_at_not_null: NOT NULL recorded_at
attendances_recorded_by_fkey: FOREIGN KEY (recorded_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
attendances_recorded_by_not_null: NOT NULL recorded_by
attendances_session_id_enrollment_id_key: UNIQUE (session_id, enrollment_id)
attendances_session_id_not_null: NOT NULL session_id
attendances_session_id_offering_id_fkey: FOREIGN KEY (session_id, offering_id) REFERENCES escen.sessions(id, offering_id) ON DELETE RESTRICT
attendances_status_check: CHECK ((status = ANY (ARRAY['PRESENT'::text, 'ABSENT'::text, 'RETARD'::text, 'ABSENT_JUSTIFIE'::text, 'RETARD_JUSTIFIE'::text, 'DISPENSE'::text])))
attendances_status_not_null: NOT NULL status
```

Index :

```sql
CREATE UNIQUE INDEX attendances_pkey ON escen.attendances USING btree (id)
CREATE UNIQUE INDEX attendances_session_id_enrollment_id_key ON escen.attendances USING btree (session_id, enrollment_id)
CREATE INDEX fk_17529 ON escen.attendances USING btree (recorded_by)
CREATE INDEX fk_17534 ON escen.attendances USING btree (session_id, offering_id)
CREATE INDEX fk_17539 ON escen.attendances USING btree (enrollment_id, offering_id)
```

## escen.blocked_periods

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| site_id | uuid | YES | — | NEVER |
| academic_year_id | uuid | YES | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| kind | text | NO | — | NEVER |
| starts_at | timestamptz | NO | — | NEVER |
| ends_at | timestamptz | NO | — | NEVER |

Contraintes :

```sql
blocked_periods_academic_year_id_fkey: FOREIGN KEY (academic_year_id) REFERENCES escen.academic_years(id) ON DELETE RESTRICT
blocked_periods_check: CHECK ((ends_at > starts_at))
blocked_periods_ends_at_not_null: NOT NULL ends_at
blocked_periods_id_not_null: NOT NULL id
blocked_periods_kind_check: CHECK ((kind = ANY (ARRAY['JOUR_FERIE'::text, 'VACANCES'::text, 'FERMETURE'::text, 'EXAMEN'::text, 'AUTRE'::text])))
blocked_periods_kind_not_null: NOT NULL kind
blocked_periods_name_not_null: NOT NULL name
blocked_periods_pkey: PRIMARY KEY (id)
blocked_periods_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
blocked_periods_starts_at_not_null: NOT NULL starts_at
```

Index :

```sql
CREATE UNIQUE INDEX blocked_periods_pkey ON escen.blocked_periods USING btree (id)
CREATE INDEX fk_17403 ON escen.blocked_periods USING btree (site_id)
CREATE INDEX fk_17408 ON escen.blocked_periods USING btree (academic_year_id)
```

## escen.buildings

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| site_id | uuid | NO | — | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
buildings_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
buildings_code_not_null: NOT NULL code
buildings_id_not_null: NOT NULL id
buildings_id_site_id_key: UNIQUE (id, site_id)
buildings_name_not_null: NOT NULL name
buildings_pkey: PRIMARY KEY (id)
buildings_site_id_code_key: UNIQUE (site_id, code)
buildings_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
buildings_site_id_not_null: NOT NULL site_id
```

Index :

```sql
CREATE UNIQUE INDEX buildings_id_site_id_key ON escen.buildings USING btree (id, site_id)
CREATE UNIQUE INDEX buildings_pkey ON escen.buildings USING btree (id)
CREATE UNIQUE INDEX buildings_site_id_code_key ON escen.buildings USING btree (site_id, code)
CREATE INDEX fk_16656 ON escen.buildings USING btree (site_id)
```

## escen.communication_audiences

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| communication_id | uuid | NO | — | NEVER |
| role_id | uuid | YES | — | NEVER |
| group_id | uuid | YES | — | NEVER |
| site_id | uuid | YES | — | NEVER |
| all_accounts | bool | NO | false | NEVER |

Contraintes :

```sql
communication_audiences_all_accounts_not_null: NOT NULL all_accounts
communication_audiences_check: CHECK (((((
CASE
    WHEN (role_id IS NULL) THEN 0
    ELSE 1
END +
CASE
    WHEN (group_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN (site_id IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN all_accounts THEN 1
    ELSE 0
END) = 1))
communication_audiences_communication_id_fkey: FOREIGN KEY (communication_id) REFERENCES escen.communications(id) ON DELETE RESTRICT
communication_audiences_communication_id_not_null: NOT NULL communication_id
communication_audiences_group_id_fkey: FOREIGN KEY (group_id) REFERENCES escen.groups(id) ON DELETE RESTRICT
communication_audiences_id_not_null: NOT NULL id
communication_audiences_pkey: PRIMARY KEY (id)
communication_audiences_role_id_fkey: FOREIGN KEY (role_id) REFERENCES escen.roles(id) ON DELETE RESTRICT
communication_audiences_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
```

Index :

```sql
CREATE UNIQUE INDEX communication_audiences_pkey ON escen.communication_audiences USING btree (id)
CREATE INDEX fk_18939 ON escen.communication_audiences USING btree (communication_id)
CREATE INDEX fk_18944 ON escen.communication_audiences USING btree (role_id)
CREATE INDEX fk_18949 ON escen.communication_audiences USING btree (group_id)
CREATE INDEX fk_18954 ON escen.communication_audiences USING btree (site_id)
```

## escen.communication_files

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| communication_id | uuid | NO | — | NEVER |
| file_id | uuid | NO | — | NEVER |

Contraintes :

```sql
communication_files_communication_id_file_id_key: UNIQUE (communication_id, file_id)
communication_files_communication_id_fkey: FOREIGN KEY (communication_id) REFERENCES escen.communications(id) ON DELETE RESTRICT
communication_files_communication_id_not_null: NOT NULL communication_id
communication_files_file_id_fkey: FOREIGN KEY (file_id) REFERENCES escen.file_objects(id) ON DELETE RESTRICT
communication_files_file_id_not_null: NOT NULL file_id
communication_files_id_not_null: NOT NULL id
communication_files_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX communication_files_communication_id_file_id_key ON escen.communication_files USING btree (communication_id, file_id)
CREATE UNIQUE INDEX communication_files_pkey ON escen.communication_files USING btree (id)
CREATE INDEX fk_18993 ON escen.communication_files USING btree (communication_id)
CREATE INDEX fk_18998 ON escen.communication_files USING btree (file_id)
```

## escen.communication_reads

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| communication_id | uuid | NO | — | NEVER |
| account_id | uuid | NO | — | NEVER |
| read_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
communication_reads_account_id_fkey: FOREIGN KEY (account_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
communication_reads_account_id_not_null: NOT NULL account_id
communication_reads_communication_id_account_id_key: UNIQUE (communication_id, account_id)
communication_reads_communication_id_fkey: FOREIGN KEY (communication_id) REFERENCES escen.communications(id) ON DELETE RESTRICT
communication_reads_communication_id_not_null: NOT NULL communication_id
communication_reads_id_not_null: NOT NULL id
communication_reads_pkey: PRIMARY KEY (id)
communication_reads_read_at_not_null: NOT NULL read_at
```

Index :

```sql
CREATE UNIQUE INDEX communication_reads_communication_id_account_id_key ON escen.communication_reads USING btree (communication_id, account_id)
CREATE UNIQUE INDEX communication_reads_pkey ON escen.communication_reads USING btree (id)
CREATE INDEX fk_18972 ON escen.communication_reads USING btree (communication_id)
CREATE INDEX fk_18977 ON escen.communication_reads USING btree (account_id)
```

## escen.communications

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| title | escen.nonempty_text | NO | — | NEVER |
| content | escen.nonempty_text | NO | — | NEVER |
| author_id | uuid | NO | — | NEVER |
| published_at | timestamptz | YES | — | NEVER |
| expires_at | timestamptz | YES | — | NEVER |
| withdrawn_at | timestamptz | YES | — | NEVER |
| withdrawal_reason | text | YES | — | NEVER |

Contraintes :

```sql
communications_author_id_fkey: FOREIGN KEY (author_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
communications_author_id_not_null: NOT NULL author_id
communications_check: CHECK (((expires_at IS NULL) OR ((published_at IS NOT NULL) AND (expires_at > published_at))))
communications_check1: CHECK (((withdrawn_at IS NULL) OR ((withdrawal_reason IS NOT NULL) AND (length(btrim(withdrawal_reason)) > 0))))
communications_content_not_null: NOT NULL content
communications_id_not_null: NOT NULL id
communications_pkey: PRIMARY KEY (id)
communications_title_not_null: NOT NULL title
```

Index :

```sql
CREATE UNIQUE INDEX communications_pkey ON escen.communications USING btree (id)
CREATE INDEX fk_18923 ON escen.communications USING btree (author_id)
```

## escen.complaint_events

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| complaint_id | uuid | NO | — | NEVER |
| from_status | text | NO | — | NEVER |
| to_status | text | NO | — | NEVER |
| actor_id | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| happened_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
complaint_events_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
complaint_events_actor_id_not_null: NOT NULL actor_id
complaint_events_complaint_id_fkey: FOREIGN KEY (complaint_id) REFERENCES escen.complaints(id) ON DELETE RESTRICT
complaint_events_complaint_id_not_null: NOT NULL complaint_id
complaint_events_from_status_not_null: NOT NULL from_status
complaint_events_happened_at_not_null: NOT NULL happened_at
complaint_events_id_not_null: NOT NULL id
complaint_events_pkey: PRIMARY KEY (id)
complaint_events_reason_not_null: NOT NULL reason
complaint_events_to_status_not_null: NOT NULL to_status
```

Index :

```sql
CREATE UNIQUE INDEX complaint_events_pkey ON escen.complaint_events USING btree (id)
CREATE INDEX fk_17973 ON escen.complaint_events USING btree (complaint_id)
CREATE INDEX fk_17978 ON escen.complaint_events USING btree (actor_id)
```

## escen.complaints

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| candidate_id | uuid | NO | — | NEVER |
| grade_id | uuid | NO | — | NEVER |
| status | text | NO | 'NOUVELLE'::text | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| created_at | timestamptz | NO | now() | NEVER |
| closed_at | timestamptz | YES | — | NEVER |

Contraintes :

```sql
complaints_candidate_id_fkey: FOREIGN KEY (candidate_id) REFERENCES escen.evaluation_candidates(id) ON DELETE RESTRICT
complaints_candidate_id_not_null: NOT NULL candidate_id
complaints_check: CHECK (((status = 'CLOTUREE'::text) = (closed_at IS NOT NULL)))
complaints_created_at_not_null: NOT NULL created_at
complaints_grade_id_fkey: FOREIGN KEY (grade_id) REFERENCES escen.grades(id) ON DELETE RESTRICT
complaints_grade_id_not_null: NOT NULL grade_id
complaints_id_not_null: NOT NULL id
complaints_pkey: PRIMARY KEY (id)
complaints_reason_not_null: NOT NULL reason
complaints_status_check: CHECK ((status = ANY (ARRAY['NOUVELLE'::text, 'EN_ANALYSE'::text, 'TRANSMISE_ENSEIGNANT'::text, 'AVIS_ENSEIGNANT'::text, 'DECISION_ACADEMIQUE'::text, 'CORRECTION_EVENTUELLE'::text, 'CLOTUREE'::text])))
complaints_status_not_null: NOT NULL status
```

Index :

```sql
CREATE UNIQUE INDEX complaints_pkey ON escen.complaints USING btree (id)
CREATE INDEX fk_17946 ON escen.complaints USING btree (candidate_id)
CREATE INDEX fk_17951 ON escen.complaints USING btree (grade_id)
CREATE UNIQUE INDEX one_open_complaint_per_grade ON escen.complaints USING btree (grade_id) WHERE (status <> 'CLOTUREE'::text)
```

## escen.contract_discounts

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| line_id | uuid | NO | — | NEVER |
| version_id | uuid | NO | — | NEVER |
| scholarship_award_id | uuid | YES | — | NEVER |
| amount | escen.xof_amount | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |

Contraintes :

```sql
contract_discounts_amount_check: CHECK (((amount)::numeric > (0)::numeric))
contract_discounts_amount_not_null: NOT NULL amount
contract_discounts_id_not_null: NOT NULL id
contract_discounts_line_id_not_null: NOT NULL line_id
contract_discounts_line_id_version_id_fkey: FOREIGN KEY (line_id, version_id) REFERENCES escen.contract_lines(id, version_id) ON DELETE RESTRICT
contract_discounts_pkey: PRIMARY KEY (id)
contract_discounts_reason_not_null: NOT NULL reason
contract_discounts_scholarship_award_id_fkey: FOREIGN KEY (scholarship_award_id) REFERENCES escen.scholarship_awards(id) ON DELETE RESTRICT
contract_discounts_version_id_not_null: NOT NULL version_id
```

Index :

```sql
CREATE UNIQUE INDEX contract_discounts_pkey ON escen.contract_discounts USING btree (id)
CREATE INDEX fk_18460 ON escen.contract_discounts USING btree (scholarship_award_id)
CREATE INDEX fk_18465 ON escen.contract_discounts USING btree (line_id, version_id)
```

## escen.contract_lines

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| contract_id | uuid | NO | — | NEVER |
| version_id | uuid | NO | — | NEVER |
| fee_type_id | uuid | NO | — | NEVER |
| rate_id | uuid | YES | — | NEVER |
| description | escen.nonempty_text | NO | — | NEVER |
| amount | escen.xof_amount | NO | — | NEVER |

Contraintes :

```sql
contract_lines_amount_not_null: NOT NULL amount
contract_lines_contract_id_not_null: NOT NULL contract_id
contract_lines_description_not_null: NOT NULL description
contract_lines_fee_type_id_fkey: FOREIGN KEY (fee_type_id) REFERENCES escen.fee_types(id) ON DELETE RESTRICT
contract_lines_fee_type_id_not_null: NOT NULL fee_type_id
contract_lines_id_contract_id_key: UNIQUE (id, contract_id)
contract_lines_id_not_null: NOT NULL id
contract_lines_id_version_id_key: UNIQUE (id, version_id)
contract_lines_pkey: PRIMARY KEY (id)
contract_lines_rate_id_fkey: FOREIGN KEY (rate_id) REFERENCES escen.fee_rates(id) ON DELETE RESTRICT
contract_lines_version_id_contract_id_fkey: FOREIGN KEY (version_id, contract_id) REFERENCES escen.contract_versions(id, contract_id) ON DELETE RESTRICT
contract_lines_version_id_not_null: NOT NULL version_id
```

Index :

```sql
CREATE UNIQUE INDEX contract_lines_id_contract_id_key ON escen.contract_lines USING btree (id, contract_id)
CREATE UNIQUE INDEX contract_lines_id_version_id_key ON escen.contract_lines USING btree (id, version_id)
CREATE UNIQUE INDEX contract_lines_pkey ON escen.contract_lines USING btree (id)
CREATE INDEX fk_18431 ON escen.contract_lines USING btree (fee_type_id)
CREATE INDEX fk_18436 ON escen.contract_lines USING btree (rate_id)
CREATE INDEX fk_18441 ON escen.contract_lines USING btree (version_id, contract_id)
```

## escen.contract_versions

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| contract_id | uuid | NO | — | NEVER |
| version | int4 | NO | — | NEVER |
| status | text | NO | 'DRAFT'::text | NEVER |
| supersedes_id | uuid | YES | — | NEVER |
| approved_by | uuid | YES | — | NEVER |
| approved_at | timestamptz | YES | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |

Contraintes :

```sql
contract_versions_approved_by_fkey: FOREIGN KEY (approved_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
contract_versions_check: CHECK (((supersedes_id IS NULL) OR (supersedes_id <> id)))
contract_versions_check1: CHECK (((status = 'DRAFT'::text) OR ((approved_by IS NOT NULL) AND (approved_at IS NOT NULL))))
contract_versions_contract_id_fkey: FOREIGN KEY (contract_id) REFERENCES escen.financial_contracts(id) ON DELETE RESTRICT
contract_versions_contract_id_not_null: NOT NULL contract_id
contract_versions_contract_id_version_key: UNIQUE (contract_id, version)
contract_versions_id_contract_id_key: UNIQUE (id, contract_id)
contract_versions_id_not_null: NOT NULL id
contract_versions_pkey: PRIMARY KEY (id)
contract_versions_reason_not_null: NOT NULL reason
contract_versions_status_check: CHECK ((status = ANY (ARRAY['DRAFT'::text, 'APPROVED'::text, 'SUPERSEDED'::text])))
contract_versions_status_not_null: NOT NULL status
contract_versions_supersedes_id_contract_id_fkey: FOREIGN KEY (supersedes_id, contract_id) REFERENCES escen.contract_versions(id, contract_id) ON DELETE RESTRICT
contract_versions_version_check: CHECK ((version > 0))
contract_versions_version_not_null: NOT NULL version
```

Index :

```sql
CREATE UNIQUE INDEX contract_versions_contract_id_version_key ON escen.contract_versions USING btree (contract_id, version)
CREATE UNIQUE INDEX contract_versions_id_contract_id_key ON escen.contract_versions USING btree (id, contract_id)
CREATE UNIQUE INDEX contract_versions_pkey ON escen.contract_versions USING btree (id)
CREATE INDEX fk_18397 ON escen.contract_versions USING btree (contract_id)
CREATE INDEX fk_18402 ON escen.contract_versions USING btree (approved_by)
CREATE INDEX fk_18407 ON escen.contract_versions USING btree (supersedes_id, contract_id)
CREATE UNIQUE INDEX one_approved_contract_version ON escen.contract_versions USING btree (contract_id) WHERE (status = 'APPROVED'::text)
```

## escen.credit_awards

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| decision_id | uuid | NO | — | NEVER |
| component_id | uuid | NO | — | NEVER |
| credits | numeric | NO | — | NEVER |
| award_kind | text | NO | — | NEVER |

Contraintes :

```sql
credit_awards_award_kind_check: CHECK ((award_kind = ANY (ARRAY['NORMALE'::text, 'RATTRAPAGE'::text, 'COMPENSATION'::text, 'TRANSFERT'::text])))
credit_awards_award_kind_not_null: NOT NULL award_kind
credit_awards_component_id_fkey: FOREIGN KEY (component_id) REFERENCES escen.curriculum_components(id) ON DELETE RESTRICT
credit_awards_component_id_not_null: NOT NULL component_id
credit_awards_credits_check: CHECK ((credits > (0)::numeric))
credit_awards_credits_not_null: NOT NULL credits
credit_awards_decision_id_component_id_key: UNIQUE (decision_id, component_id)
credit_awards_decision_id_fkey: FOREIGN KEY (decision_id) REFERENCES escen.jury_decisions(id) ON DELETE RESTRICT
credit_awards_decision_id_not_null: NOT NULL decision_id
credit_awards_id_not_null: NOT NULL id
credit_awards_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX credit_awards_decision_id_component_id_key ON escen.credit_awards USING btree (decision_id, component_id)
CREATE UNIQUE INDEX credit_awards_pkey ON escen.credit_awards USING btree (id)
CREATE INDEX fk_18187 ON escen.credit_awards USING btree (decision_id)
CREATE INDEX fk_18192 ON escen.credit_awards USING btree (component_id)
```

## escen.credit_notes

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| line_id | uuid | NO | — | NEVER |
| amount | escen.xof_amount | NO | — | NEVER |
| actor_id | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| issued_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
credit_notes_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
credit_notes_actor_id_not_null: NOT NULL actor_id
credit_notes_amount_check: CHECK (((amount)::numeric > (0)::numeric))
credit_notes_amount_not_null: NOT NULL amount
credit_notes_id_not_null: NOT NULL id
credit_notes_issued_at_not_null: NOT NULL issued_at
credit_notes_line_id_fkey: FOREIGN KEY (line_id) REFERENCES escen.contract_lines(id) ON DELETE RESTRICT
credit_notes_line_id_not_null: NOT NULL line_id
credit_notes_pkey: PRIMARY KEY (id)
credit_notes_reason_not_null: NOT NULL reason
```

Index :

```sql
CREATE UNIQUE INDEX credit_notes_pkey ON escen.credit_notes USING btree (id)
CREATE INDEX fk_18712 ON escen.credit_notes USING btree (line_id)
CREATE INDEX fk_18717 ON escen.credit_notes USING btree (actor_id)
```

## escen.curricula

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| program_id | uuid | NO | — | NEVER |
| track_id | uuid | YES | — | NEVER |
| level_id | uuid | NO | — | NEVER |
| version | int4 | NO | — | NEVER |
| status | text | NO | 'DRAFT'::text | NEVER |
| approved_by | uuid | YES | — | NEVER |
| approved_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
curricula_approved_by_fkey: FOREIGN KEY (approved_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
curricula_check: CHECK (((status = 'DRAFT'::text) OR ((approved_by IS NOT NULL) AND (approved_at IS NOT NULL))))
curricula_id_level_id_key: UNIQUE (id, level_id)
curricula_id_not_null: NOT NULL id
curricula_level_id_fkey: FOREIGN KEY (level_id) REFERENCES escen.levels(id) ON DELETE RESTRICT
curricula_level_id_not_null: NOT NULL level_id
curricula_pkey: PRIMARY KEY (id)
curricula_program_id_fkey: FOREIGN KEY (program_id) REFERENCES escen.programs(id) ON DELETE RESTRICT
curricula_program_id_not_null: NOT NULL program_id
curricula_program_id_track_id_level_id_version_key: UNIQUE NULLS NOT DISTINCT (program_id, track_id, level_id, version)
curricula_status_check: CHECK ((status = ANY (ARRAY['DRAFT'::text, 'APPROVED'::text, 'ARCHIVED'::text])))
curricula_status_not_null: NOT NULL status
curricula_track_id_program_id_fkey: FOREIGN KEY (track_id, program_id) REFERENCES escen.tracks(id, program_id) ON DELETE RESTRICT
curricula_version_check: CHECK ((version > 0))
curricula_version_not_null: NOT NULL version
```

Index :

```sql
CREATE UNIQUE INDEX curricula_id_level_id_key ON escen.curricula USING btree (id, level_id)
CREATE UNIQUE INDEX curricula_pkey ON escen.curricula USING btree (id)
CREATE UNIQUE INDEX curricula_program_id_track_id_level_id_version_key ON escen.curricula USING btree (program_id, track_id, level_id, version) NULLS NOT DISTINCT
CREATE INDEX fk_16822 ON escen.curricula USING btree (program_id)
CREATE INDEX fk_16827 ON escen.curricula USING btree (level_id)
CREATE INDEX fk_16832 ON escen.curricula USING btree (approved_by)
CREATE INDEX fk_16837 ON escen.curricula USING btree (track_id, program_id)
```

## escen.curriculum_components

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| subject_id | uuid | NO | — | NEVER |
| unit_id | uuid | NO | — | NEVER |
| curriculum_id | uuid | NO | — | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| coefficient | numeric | NO | — | NEVER |
| credits | numeric | NO | — | NEVER |
| cm_hours | numeric | NO | 0 | NEVER |
| td_hours | numeric | NO | 0 | NEVER |
| tp_hours | numeric | NO | 0 | NEVER |
| other_hours | numeric | NO | 0 | NEVER |

Contraintes :

```sql
curriculum_components_cm_hours_check: CHECK ((cm_hours >= (0)::numeric))
curriculum_components_cm_hours_not_null: NOT NULL cm_hours
curriculum_components_code_not_null: NOT NULL code
curriculum_components_coefficient_check: CHECK ((coefficient > (0)::numeric))
curriculum_components_coefficient_not_null: NOT NULL coefficient
curriculum_components_credits_check: CHECK ((credits >= (0)::numeric))
curriculum_components_credits_not_null: NOT NULL credits
curriculum_components_curriculum_id_not_null: NOT NULL curriculum_id
curriculum_components_id_curriculum_id_key: UNIQUE (id, curriculum_id)
curriculum_components_id_not_null: NOT NULL id
curriculum_components_other_hours_check: CHECK ((other_hours >= (0)::numeric))
curriculum_components_other_hours_not_null: NOT NULL other_hours
curriculum_components_pkey: PRIMARY KEY (id)
curriculum_components_subject_id_fkey: FOREIGN KEY (subject_id) REFERENCES escen.subjects(id) ON DELETE RESTRICT
curriculum_components_subject_id_not_null: NOT NULL subject_id
curriculum_components_td_hours_check: CHECK ((td_hours >= (0)::numeric))
curriculum_components_td_hours_not_null: NOT NULL td_hours
curriculum_components_tp_hours_check: CHECK ((tp_hours >= (0)::numeric))
curriculum_components_tp_hours_not_null: NOT NULL tp_hours
curriculum_components_unit_id_code_key: UNIQUE (unit_id, code)
curriculum_components_unit_id_curriculum_id_fkey: FOREIGN KEY (unit_id, curriculum_id) REFERENCES escen.teaching_units(id, curriculum_id) ON DELETE RESTRICT
curriculum_components_unit_id_not_null: NOT NULL unit_id
```

Index :

```sql
CREATE UNIQUE INDEX curriculum_components_id_curriculum_id_key ON escen.curriculum_components USING btree (id, curriculum_id)
CREATE UNIQUE INDEX curriculum_components_pkey ON escen.curriculum_components USING btree (id)
CREATE UNIQUE INDEX curriculum_components_unit_id_code_key ON escen.curriculum_components USING btree (unit_id, code)
CREATE INDEX fk_16923 ON escen.curriculum_components USING btree (subject_id)
CREATE INDEX fk_16928 ON escen.curriculum_components USING btree (unit_id, curriculum_id)
```

## escen.curriculum_semesters

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| curriculum_id | uuid | NO | — | NEVER |
| position | int2 | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| target_credits | numeric | NO | — | NEVER |

Contraintes :

```sql
curriculum_semesters_curriculum_id_fkey: FOREIGN KEY (curriculum_id) REFERENCES escen.curricula(id) ON DELETE RESTRICT
curriculum_semesters_curriculum_id_not_null: NOT NULL curriculum_id
curriculum_semesters_curriculum_id_position_key: UNIQUE (curriculum_id, "position")
curriculum_semesters_id_curriculum_id_key: UNIQUE (id, curriculum_id)
curriculum_semesters_id_not_null: NOT NULL id
curriculum_semesters_name_not_null: NOT NULL name
curriculum_semesters_pkey: PRIMARY KEY (id)
curriculum_semesters_position_check: CHECK (("position" > 0))
curriculum_semesters_position_not_null: NOT NULL "position"
curriculum_semesters_target_credits_check: CHECK ((target_credits > (0)::numeric))
curriculum_semesters_target_credits_not_null: NOT NULL target_credits
```

Index :

```sql
CREATE UNIQUE INDEX curriculum_semesters_curriculum_id_position_key ON escen.curriculum_semesters USING btree (curriculum_id, "position")
CREATE UNIQUE INDEX curriculum_semesters_id_curriculum_id_key ON escen.curriculum_semesters USING btree (id, curriculum_id)
CREATE UNIQUE INDEX curriculum_semesters_pkey ON escen.curriculum_semesters USING btree (id)
CREATE INDEX fk_16861 ON escen.curriculum_semesters USING btree (curriculum_id)
```

## escen.cycles

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
cycles_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
cycles_code_key: UNIQUE (code)
cycles_code_not_null: NOT NULL code
cycles_id_not_null: NOT NULL id
cycles_name_not_null: NOT NULL name
cycles_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX cycles_code_key ON escen.cycles USING btree (code)
CREATE UNIQUE INDEX cycles_pkey ON escen.cycles USING btree (id)
```

## escen.delegate_mandates

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| enrollment_group_id | uuid | NO | — | NEVER |
| role | text | NO | — | NEVER |
| starts_on | date | NO | — | NEVER |
| ends_on | date | YES | — | NEVER |
| approved_by | uuid | NO | — | NEVER |

Contraintes :

```sql
delegate_mandates_approved_by_fkey: FOREIGN KEY (approved_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
delegate_mandates_approved_by_not_null: NOT NULL approved_by
delegate_mandates_check: CHECK (((ends_on IS NULL) OR (ends_on > starts_on)))
delegate_mandates_enrollment_group_id_fkey: FOREIGN KEY (enrollment_group_id) REFERENCES escen.enrollment_groups(id) ON DELETE RESTRICT
delegate_mandates_enrollment_group_id_not_null: NOT NULL enrollment_group_id
delegate_mandates_enrollment_group_id_role_starts_on_key: UNIQUE (enrollment_group_id, role, starts_on)
delegate_mandates_id_not_null: NOT NULL id
delegate_mandates_pkey: PRIMARY KEY (id)
delegate_mandates_role_check: CHECK ((role = ANY (ARRAY['DELEGUE'::text, 'ADJOINT'::text, 'SECRETAIRE'::text, 'SECRETAIRE_ADJOINT'::text])))
delegate_mandates_role_not_null: NOT NULL role
delegate_mandates_starts_on_not_null: NOT NULL starts_on
```

Index :

```sql
CREATE UNIQUE INDEX delegate_mandates_enrollment_group_id_role_starts_on_key ON escen.delegate_mandates USING btree (enrollment_group_id, role, starts_on)
CREATE UNIQUE INDEX delegate_mandates_pkey ON escen.delegate_mandates USING btree (id)
CREATE INDEX fk_17378 ON escen.delegate_mandates USING btree (enrollment_group_id)
CREATE INDEX fk_17383 ON escen.delegate_mandates USING btree (approved_by)
```

## escen.document_requirements

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| curriculum_id | uuid | NO | — | NEVER |
| document_type_id | uuid | NO | — | NEVER |
| required | bool | NO | — | NEVER |

Contraintes :

```sql
document_requirements_curriculum_id_document_type_id_key: UNIQUE (curriculum_id, document_type_id)
document_requirements_curriculum_id_fkey: FOREIGN KEY (curriculum_id) REFERENCES escen.curricula(id) ON DELETE RESTRICT
document_requirements_curriculum_id_not_null: NOT NULL curriculum_id
document_requirements_document_type_id_fkey: FOREIGN KEY (document_type_id) REFERENCES escen.document_types(id) ON DELETE RESTRICT
document_requirements_document_type_id_not_null: NOT NULL document_type_id
document_requirements_id_not_null: NOT NULL id
document_requirements_pkey: PRIMARY KEY (id)
document_requirements_required_not_null: NOT NULL required
```

Index :

```sql
CREATE UNIQUE INDEX document_requirements_curriculum_id_document_type_id_key ON escen.document_requirements USING btree (curriculum_id, document_type_id)
CREATE UNIQUE INDEX document_requirements_pkey ON escen.document_requirements USING btree (id)
CREATE INDEX fk_18779 ON escen.document_requirements USING btree (curriculum_id)
CREATE INDEX fk_18784 ON escen.document_requirements USING btree (document_type_id)
```

## escen.document_reviews

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| document_id | uuid | NO | — | NEVER |
| status | text | NO | — | NEVER |
| actor_id | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| reviewed_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
document_reviews_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
document_reviews_actor_id_not_null: NOT NULL actor_id
document_reviews_document_id_fkey: FOREIGN KEY (document_id) REFERENCES escen.student_documents(id) ON DELETE RESTRICT
document_reviews_document_id_not_null: NOT NULL document_id
document_reviews_id_not_null: NOT NULL id
document_reviews_pkey: PRIMARY KEY (id)
document_reviews_reason_not_null: NOT NULL reason
document_reviews_reviewed_at_not_null: NOT NULL reviewed_at
document_reviews_status_check: CHECK ((status = ANY (ARRAY['CONFORME'::text, 'NON_CONFORME'::text])))
document_reviews_status_not_null: NOT NULL status
```

Index :

```sql
CREATE UNIQUE INDEX document_reviews_pkey ON escen.document_reviews USING btree (id)
CREATE INDEX fk_18847 ON escen.document_reviews USING btree (document_id)
CREATE INDEX fk_18852 ON escen.document_reviews USING btree (actor_id)
```

## escen.document_types

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| multiple | bool | NO | false | NEVER |
| accepted_mime_types | _text | NO | — | NEVER |
| max_byte_size | int8 | NO | — | NEVER |

Contraintes :

```sql
document_types_accepted_mime_types_check: CHECK ((cardinality(accepted_mime_types) > 0))
document_types_accepted_mime_types_not_null: NOT NULL accepted_mime_types
document_types_code_key: UNIQUE (code)
document_types_code_not_null: NOT NULL code
document_types_id_not_null: NOT NULL id
document_types_max_byte_size_check: CHECK ((max_byte_size > 0))
document_types_max_byte_size_not_null: NOT NULL max_byte_size
document_types_multiple_not_null: NOT NULL multiple
document_types_name_not_null: NOT NULL name
document_types_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX document_types_code_key ON escen.document_types USING btree (code)
CREATE UNIQUE INDEX document_types_pkey ON escen.document_types USING btree (id)
```

## escen.enrollment_events

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| enrollment_id | uuid | NO | — | NEVER |
| old_status | text | YES | — | NEVER |
| new_status | text | NO | — | NEVER |
| actor_id | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| happened_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
enrollment_events_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
enrollment_events_actor_id_not_null: NOT NULL actor_id
enrollment_events_enrollment_id_fkey: FOREIGN KEY (enrollment_id) REFERENCES escen.enrollments(id) ON DELETE RESTRICT
enrollment_events_enrollment_id_not_null: NOT NULL enrollment_id
enrollment_events_happened_at_not_null: NOT NULL happened_at
enrollment_events_id_not_null: NOT NULL id
enrollment_events_new_status_check: CHECK ((new_status = ANY (ARRAY['INSCRIT'::text, 'REINSCRIT'::text, 'SUSPENDU'::text, 'ABANDON'::text, 'DIPLOME'::text])))
enrollment_events_new_status_not_null: NOT NULL new_status
enrollment_events_pkey: PRIMARY KEY (id)
enrollment_events_reason_not_null: NOT NULL reason
```

Index :

```sql
CREATE UNIQUE INDEX enrollment_events_pkey ON escen.enrollment_events USING btree (id)
CREATE INDEX fk_17169 ON escen.enrollment_events USING btree (enrollment_id)
CREATE INDEX fk_17174 ON escen.enrollment_events USING btree (actor_id)
```

## escen.enrollment_groups

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| enrollment_id | uuid | NO | — | NEVER |
| offering_id | uuid | NO | — | NEVER |
| group_id | uuid | NO | — | NEVER |
| valid_from | date | NO | — | NEVER |
| valid_until | date | YES | — | NEVER |
| changed_by | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |

Contraintes :

```sql
enrollment_group_period_conflict: EXCLUDE USING gist (enrollment_id WITH =, group_id WITH =, daterange(valid_from, valid_until, '[)'::text) WITH &&)
enrollment_groups_changed_by_fkey: FOREIGN KEY (changed_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
enrollment_groups_changed_by_not_null: NOT NULL changed_by
enrollment_groups_check: CHECK (((valid_until IS NULL) OR (valid_until > valid_from)))
enrollment_groups_enrollment_id_group_id_valid_from_key: UNIQUE (enrollment_id, group_id, valid_from)
enrollment_groups_enrollment_id_not_null: NOT NULL enrollment_id
enrollment_groups_enrollment_id_offering_id_fkey: FOREIGN KEY (enrollment_id, offering_id) REFERENCES escen.enrollments(id, offering_id) ON DELETE RESTRICT
enrollment_groups_group_id_not_null: NOT NULL group_id
enrollment_groups_group_id_offering_id_fkey: FOREIGN KEY (group_id, offering_id) REFERENCES escen.group_offerings(group_id, offering_id) ON DELETE RESTRICT
enrollment_groups_id_not_null: NOT NULL id
enrollment_groups_offering_id_not_null: NOT NULL offering_id
enrollment_groups_pkey: PRIMARY KEY (id)
enrollment_groups_reason_not_null: NOT NULL reason
enrollment_groups_valid_from_not_null: NOT NULL valid_from
```

Index :

```sql
CREATE INDEX enrollment_group_period_conflict ON escen.enrollment_groups USING gist (enrollment_id, group_id, daterange(valid_from, valid_until, '[)'::text))
CREATE UNIQUE INDEX enrollment_groups_enrollment_id_group_id_valid_from_key ON escen.enrollment_groups USING btree (enrollment_id, group_id, valid_from)
CREATE UNIQUE INDEX enrollment_groups_pkey ON escen.enrollment_groups USING btree (id)
CREATE INDEX fk_17138 ON escen.enrollment_groups USING btree (changed_by)
CREATE INDEX fk_17143 ON escen.enrollment_groups USING btree (enrollment_id, offering_id)
CREATE INDEX fk_17148 ON escen.enrollment_groups USING btree (group_id, offering_id)
```

## escen.enrollments

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| student_id | uuid | NO | — | NEVER |
| offering_id | uuid | NO | — | NEVER |
| status | text | NO | — | NEVER |
| enrolled_on | date | YES | — | NEVER |
| created_by | uuid | YES | — | NEVER |
| created_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
enrollments_created_at_not_null: NOT NULL created_at
enrollments_created_by_fkey: FOREIGN KEY (created_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
enrollments_id_not_null: NOT NULL id
enrollments_id_offering_id_key: UNIQUE (id, offering_id)
enrollments_id_student_id_key: UNIQUE (id, student_id)
enrollments_offering_id_fkey: FOREIGN KEY (offering_id) REFERENCES escen.academic_offerings(id) ON DELETE RESTRICT
enrollments_offering_id_not_null: NOT NULL offering_id
enrollments_pkey: PRIMARY KEY (id)
enrollments_status_check: CHECK ((status = ANY (ARRAY['INSCRIT'::text, 'REINSCRIT'::text, 'SUSPENDU'::text, 'ABANDON'::text, 'DIPLOME'::text])))
enrollments_status_not_null: NOT NULL status
enrollments_student_id_fkey: FOREIGN KEY (student_id) REFERENCES escen.students(id) ON DELETE RESTRICT
enrollments_student_id_not_null: NOT NULL student_id
enrollments_student_id_offering_id_key: UNIQUE (student_id, offering_id)
```

Index :

```sql
CREATE UNIQUE INDEX enrollments_id_offering_id_key ON escen.enrollments USING btree (id, offering_id)
CREATE UNIQUE INDEX enrollments_id_student_id_key ON escen.enrollments USING btree (id, student_id)
CREATE UNIQUE INDEX enrollments_pkey ON escen.enrollments USING btree (id)
CREATE UNIQUE INDEX enrollments_student_id_offering_id_key ON escen.enrollments USING btree (student_id, offering_id)
CREATE INDEX fk_17105 ON escen.enrollments USING btree (student_id)
CREATE INDEX fk_17110 ON escen.enrollments USING btree (offering_id)
CREATE INDEX fk_17115 ON escen.enrollments USING btree (created_by)
```

## escen.evaluation_candidates

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| evaluation_id | uuid | NO | — | NEVER |
| enrollment_id | uuid | NO | — | NEVER |
| offering_id | uuid | NO | — | NEVER |
| eligibility | text | NO | 'PENDING'::text | NEVER |
| eligibility_reason | text | YES | — | NEVER |
| anonymous_code | text | YES | — | NEVER |

Contraintes :

```sql
evaluation_candidates_check: CHECK (((eligibility <> 'EXCLUDED'::text) OR ((eligibility_reason IS NOT NULL) AND (length(btrim(eligibility_reason)) > 0))))
evaluation_candidates_eligibility_check: CHECK ((eligibility = ANY (ARRAY['PENDING'::text, 'ELIGIBLE'::text, 'EXCLUDED'::text])))
evaluation_candidates_eligibility_not_null: NOT NULL eligibility
evaluation_candidates_enrollment_id_not_null: NOT NULL enrollment_id
evaluation_candidates_enrollment_id_offering_id_fkey: FOREIGN KEY (enrollment_id, offering_id) REFERENCES escen.enrollments(id, offering_id) ON DELETE RESTRICT
evaluation_candidates_evaluation_id_anonymous_code_key: UNIQUE (evaluation_id, anonymous_code)
evaluation_candidates_evaluation_id_enrollment_id_key: UNIQUE (evaluation_id, enrollment_id)
evaluation_candidates_evaluation_id_not_null: NOT NULL evaluation_id
evaluation_candidates_evaluation_id_offering_id_fkey: FOREIGN KEY (evaluation_id, offering_id) REFERENCES escen.evaluations(id, offering_id) ON DELETE RESTRICT
evaluation_candidates_id_evaluation_id_key: UNIQUE (id, evaluation_id)
evaluation_candidates_id_not_null: NOT NULL id
evaluation_candidates_offering_id_not_null: NOT NULL offering_id
evaluation_candidates_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX evaluation_candidates_evaluation_id_anonymous_code_key ON escen.evaluation_candidates USING btree (evaluation_id, anonymous_code)
CREATE UNIQUE INDEX evaluation_candidates_evaluation_id_enrollment_id_key ON escen.evaluation_candidates USING btree (evaluation_id, enrollment_id)
CREATE UNIQUE INDEX evaluation_candidates_id_evaluation_id_key ON escen.evaluation_candidates USING btree (id, evaluation_id)
CREATE UNIQUE INDEX evaluation_candidates_pkey ON escen.evaluation_candidates USING btree (id)
CREATE INDEX fk_17692 ON escen.evaluation_candidates USING btree (evaluation_id, offering_id)
CREATE INDEX fk_17697 ON escen.evaluation_candidates USING btree (enrollment_id, offering_id)
```

## escen.evaluation_transitions

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| evaluation_id | uuid | NO | — | NEVER |
| from_status | text | NO | — | NEVER |
| to_status | text | NO | — | NEVER |
| actor_id | uuid | NO | — | NEVER |
| reason | text | YES | — | NEVER |
| happened_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
evaluation_transitions_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
evaluation_transitions_actor_id_not_null: NOT NULL actor_id
evaluation_transitions_check: CHECK ((from_status <> to_status))
evaluation_transitions_evaluation_id_fkey: FOREIGN KEY (evaluation_id) REFERENCES escen.evaluations(id) ON DELETE RESTRICT
evaluation_transitions_evaluation_id_not_null: NOT NULL evaluation_id
evaluation_transitions_from_status_not_null: NOT NULL from_status
evaluation_transitions_happened_at_not_null: NOT NULL happened_at
evaluation_transitions_id_not_null: NOT NULL id
evaluation_transitions_pkey: PRIMARY KEY (id)
evaluation_transitions_to_status_not_null: NOT NULL to_status
```

Index :

```sql
CREATE UNIQUE INDEX evaluation_transitions_pkey ON escen.evaluation_transitions USING btree (id)
CREATE INDEX fk_17633 ON escen.evaluation_transitions USING btree (evaluation_id)
CREATE INDEX fk_17638 ON escen.evaluation_transitions USING btree (actor_id)
```

## escen.evaluations

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| assignment_id | uuid | NO | — | NEVER |
| offering_id | uuid | NO | — | NEVER |
| component_id | uuid | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| kind | text | NO | — | NEVER |
| parent_evaluation_id | uuid | YES | — | NEVER |
| status | text | NO | 'BROUILLON'::text | NEVER |
| cancelled_at | timestamptz | YES | — | NEVER |
| cancellation_reason | text | YES | — | NEVER |
| created_by | uuid | NO | — | NEVER |
| created_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
evaluations_assignment_id_not_null: NOT NULL assignment_id
evaluations_assignment_id_offering_id_component_id_fkey: FOREIGN KEY (assignment_id, offering_id, component_id) REFERENCES escen.teaching_assignments(id, offering_id, component_id) ON DELETE RESTRICT
evaluations_check: CHECK (((parent_evaluation_id IS NULL) OR (parent_evaluation_id <> id)))
evaluations_check1: CHECK (((kind <> 'RATTRAPAGE'::text) OR (parent_evaluation_id IS NOT NULL)))
evaluations_check2: CHECK (((cancelled_at IS NULL) OR ((status = 'BROUILLON'::text) AND (cancellation_reason IS NOT NULL) AND (length(btrim(cancellation_reason)) > 0))))
evaluations_component_id_not_null: NOT NULL component_id
evaluations_created_at_not_null: NOT NULL created_at
evaluations_created_by_fkey: FOREIGN KEY (created_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
evaluations_created_by_not_null: NOT NULL created_by
evaluations_id_not_null: NOT NULL id
evaluations_id_offering_id_component_id_key: UNIQUE (id, offering_id, component_id)
evaluations_id_offering_id_key: UNIQUE (id, offering_id)
evaluations_kind_check: CHECK ((kind = ANY (ARRAY['DEVOIR'::text, 'EXAMEN'::text, 'INTERROGATION'::text, 'TP'::text, 'EXPOSE'::text, 'PROJET'::text, 'RATTRAPAGE'::text])))
evaluations_kind_not_null: NOT NULL kind
evaluations_name_not_null: NOT NULL name
evaluations_offering_id_not_null: NOT NULL offering_id
evaluations_parent_evaluation_id_offering_id_component_id_fkey: FOREIGN KEY (parent_evaluation_id, offering_id, component_id) REFERENCES escen.evaluations(id, offering_id, component_id) ON DELETE RESTRICT
evaluations_pkey: PRIMARY KEY (id)
evaluations_status_check: CHECK ((status = ANY (ARRAY['BROUILLON'::text, 'SAISIES'::text, 'SOUMISES'::text, 'A_CONTROLER'::text, 'VALIDEES'::text, 'PUBLIEES'::text])))
evaluations_status_not_null: NOT NULL status
```

Index :

```sql
CREATE UNIQUE INDEX evaluations_id_offering_id_component_id_key ON escen.evaluations USING btree (id, offering_id, component_id)
CREATE UNIQUE INDEX evaluations_id_offering_id_key ON escen.evaluations USING btree (id, offering_id)
CREATE UNIQUE INDEX evaluations_pkey ON escen.evaluations USING btree (id)
CREATE INDEX fk_17602 ON escen.evaluations USING btree (created_by)
CREATE INDEX fk_17607 ON escen.evaluations USING btree (assignment_id, offering_id, component_id)
CREATE INDEX fk_17612 ON escen.evaluations USING btree (parent_evaluation_id, offering_id, component_id)
```

## escen.exam_answers

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| attempt_id | uuid | NO | — | NEVER |
| question_id | uuid | NO | — | NEVER |
| paper_id | uuid | NO | — | NEVER |
| response | jsonb | NO | — | NEVER |
| saved_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
exam_answers_attempt_id_not_null: NOT NULL attempt_id
exam_answers_attempt_id_paper_id_fkey: FOREIGN KEY (attempt_id, paper_id) REFERENCES escen.exam_attempts(id, paper_id) ON DELETE RESTRICT
exam_answers_attempt_id_question_id_key: UNIQUE (attempt_id, question_id)
exam_answers_id_not_null: NOT NULL id
exam_answers_paper_id_not_null: NOT NULL paper_id
exam_answers_pkey: PRIMARY KEY (id)
exam_answers_question_id_not_null: NOT NULL question_id
exam_answers_question_id_paper_id_fkey: FOREIGN KEY (question_id, paper_id) REFERENCES escen.exam_questions(id, paper_id) ON DELETE RESTRICT
exam_answers_response_not_null: NOT NULL response
exam_answers_saved_at_not_null: NOT NULL saved_at
```

Index :

```sql
CREATE UNIQUE INDEX exam_answers_attempt_id_question_id_key ON escen.exam_answers USING btree (attempt_id, question_id)
CREATE UNIQUE INDEX exam_answers_pkey ON escen.exam_answers USING btree (id)
CREATE INDEX fk_17856 ON escen.exam_answers USING btree (attempt_id, paper_id)
CREATE INDEX fk_17861 ON escen.exam_answers USING btree (question_id, paper_id)
```

## escen.exam_attempts

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| candidate_id | uuid | NO | — | NEVER |
| evaluation_id | uuid | NO | — | NEVER |
| paper_id | uuid | NO | — | NEVER |
| attempt_number | int4 | NO | — | NEVER |
| started_at | timestamptz | NO | — | NEVER |
| deadline_at | timestamptz | NO | — | NEVER |
| submitted_at | timestamptz | YES | — | NEVER |
| status | text | NO | — | NEVER |

Contraintes :

```sql
exam_attempts_attempt_number_check: CHECK ((attempt_number > 0))
exam_attempts_attempt_number_not_null: NOT NULL attempt_number
exam_attempts_candidate_id_attempt_number_key: UNIQUE (candidate_id, attempt_number)
exam_attempts_candidate_id_evaluation_id_fkey: FOREIGN KEY (candidate_id, evaluation_id) REFERENCES escen.evaluation_candidates(id, evaluation_id) ON DELETE RESTRICT
exam_attempts_candidate_id_not_null: NOT NULL candidate_id
exam_attempts_check: CHECK ((deadline_at > started_at))
exam_attempts_check1: CHECK ((((status = ANY (ARRAY['REMISE'::text, 'EXPIREE'::text])) AND (submitted_at IS NOT NULL)) OR ((status <> ALL (ARRAY['REMISE'::text, 'EXPIREE'::text])) AND (submitted_at IS NULL))))
exam_attempts_check2: CHECK (((submitted_at IS NULL) OR (submitted_at >= started_at)))
exam_attempts_deadline_at_not_null: NOT NULL deadline_at
exam_attempts_evaluation_id_not_null: NOT NULL evaluation_id
exam_attempts_id_not_null: NOT NULL id
exam_attempts_id_paper_id_key: UNIQUE (id, paper_id)
exam_attempts_paper_id_evaluation_id_fkey: FOREIGN KEY (paper_id, evaluation_id) REFERENCES escen.exam_papers(id, evaluation_id) ON DELETE RESTRICT
exam_attempts_paper_id_not_null: NOT NULL paper_id
exam_attempts_pkey: PRIMARY KEY (id)
exam_attempts_started_at_not_null: NOT NULL started_at
exam_attempts_status_check: CHECK ((status = ANY (ARRAY['EN_COURS'::text, 'REMISE'::text, 'EXPIREE'::text, 'INTERROMPUE'::text])))
exam_attempts_status_not_null: NOT NULL status
```

Index :

```sql
CREATE UNIQUE INDEX exam_attempts_candidate_id_attempt_number_key ON escen.exam_attempts USING btree (candidate_id, attempt_number)
CREATE UNIQUE INDEX exam_attempts_id_paper_id_key ON escen.exam_attempts USING btree (id, paper_id)
CREATE UNIQUE INDEX exam_attempts_pkey ON escen.exam_attempts USING btree (id)
CREATE INDEX fk_17829 ON escen.exam_attempts USING btree (candidate_id, evaluation_id)
CREATE INDEX fk_17834 ON escen.exam_attempts USING btree (paper_id, evaluation_id)
```

## escen.exam_deliveries

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| evaluation_id | uuid | NO | — | NEVER |
| session_id | uuid | NO | — | NEVER |
| access_opens_at | timestamptz | NO | — | NEVER |
| access_closes_at | timestamptz | NO | — | NEVER |
| duration_minutes | int4 | YES | — | NEVER |

Contraintes :

```sql
exam_deliveries_access_closes_at_not_null: NOT NULL access_closes_at
exam_deliveries_access_opens_at_not_null: NOT NULL access_opens_at
exam_deliveries_check: CHECK ((access_closes_at > access_opens_at))
exam_deliveries_duration_minutes_check: CHECK ((duration_minutes > 0))
exam_deliveries_evaluation_id_fkey: FOREIGN KEY (evaluation_id) REFERENCES escen.evaluations(id) ON DELETE RESTRICT
exam_deliveries_evaluation_id_key: UNIQUE (evaluation_id)
exam_deliveries_evaluation_id_not_null: NOT NULL evaluation_id
exam_deliveries_id_evaluation_id_key: UNIQUE (id, evaluation_id)
exam_deliveries_id_not_null: NOT NULL id
exam_deliveries_pkey: PRIMARY KEY (id)
exam_deliveries_session_id_fkey: FOREIGN KEY (session_id) REFERENCES escen.sessions(id) ON DELETE RESTRICT
exam_deliveries_session_id_key: UNIQUE (session_id)
exam_deliveries_session_id_not_null: NOT NULL session_id
```

Index :

```sql
CREATE UNIQUE INDEX exam_deliveries_evaluation_id_key ON escen.exam_deliveries USING btree (evaluation_id)
CREATE UNIQUE INDEX exam_deliveries_id_evaluation_id_key ON escen.exam_deliveries USING btree (id, evaluation_id)
CREATE UNIQUE INDEX exam_deliveries_pkey ON escen.exam_deliveries USING btree (id)
CREATE UNIQUE INDEX exam_deliveries_session_id_key ON escen.exam_deliveries USING btree (session_id)
CREATE INDEX fk_17660 ON escen.exam_deliveries USING btree (evaluation_id)
CREATE INDEX fk_17665 ON escen.exam_deliveries USING btree (session_id)
```

## escen.exam_options

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| question_id | uuid | NO | — | NEVER |
| label | escen.nonempty_text | NO | — | NEVER |
| is_correct | bool | NO | — | NEVER |
| position | int4 | NO | — | NEVER |

Contraintes :

```sql
exam_options_id_not_null: NOT NULL id
exam_options_is_correct_not_null: NOT NULL is_correct
exam_options_label_not_null: NOT NULL label
exam_options_pkey: PRIMARY KEY (id)
exam_options_position_check: CHECK (("position" > 0))
exam_options_position_not_null: NOT NULL "position"
exam_options_question_id_fkey: FOREIGN KEY (question_id) REFERENCES escen.exam_questions(id) ON DELETE RESTRICT
exam_options_question_id_not_null: NOT NULL question_id
exam_options_question_id_position_key: UNIQUE (question_id, "position")
```

Index :

```sql
CREATE UNIQUE INDEX exam_options_pkey ON escen.exam_options USING btree (id)
CREATE UNIQUE INDEX exam_options_question_id_position_key ON escen.exam_options USING btree (question_id, "position")
CREATE INDEX fk_17799 ON escen.exam_options USING btree (question_id)
```

## escen.exam_papers

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| evaluation_id | uuid | YES | — | NEVER |
| version | int4 | NO | — | NEVER |
| status | text | NO | 'BROUILLON'::text | NEVER |
| authorized_by | uuid | YES | — | NEVER |
| authorized_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |
| title | text | YES | — | NEVER |
| instructions | text | YES | — | NEVER |
| duration_minutes | int4 | YES | — | NEVER |
| purpose | text | NO | 'EXAMEN'::text | NEVER |
| author_id | uuid | YES | — | NEVER |
| source_evaluation_row_id | uuid | YES | — | NEVER |
| library_id | uuid | NO | gen_random_uuid() | NEVER |
| archived_at | timestamptz | YES | — | NEVER |

Contraintes :

```sql
exam_papers_author_id_fkey: FOREIGN KEY (author_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
exam_papers_authorized_by_fkey: FOREIGN KEY (authorized_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
exam_papers_check: CHECK (((status = 'BROUILLON'::text) OR ((authorized_by IS NOT NULL) AND (authorized_at IS NOT NULL))))
exam_papers_duration_minutes_check: CHECK ((duration_minutes > 0))
exam_papers_evaluation_id_fkey: FOREIGN KEY (evaluation_id) REFERENCES escen.evaluations(id) ON DELETE RESTRICT
exam_papers_evaluation_id_version_key: UNIQUE (evaluation_id, version)
exam_papers_id_evaluation_id_key: UNIQUE (id, evaluation_id)
exam_papers_id_not_null: NOT NULL id
exam_papers_library_id_not_null: NOT NULL library_id
exam_papers_pkey: PRIMARY KEY (id)
exam_papers_purpose_check: CHECK ((purpose = ANY (ARRAY['CONTROLE_CONTINU'::text, 'EXAMEN'::text, 'RATTRAPAGE'::text])))
exam_papers_purpose_not_null: NOT NULL purpose
exam_papers_source_evaluation_row_id_fkey: FOREIGN KEY (source_evaluation_row_id) REFERENCES escen_private.legacy_rows(id) ON DELETE RESTRICT
exam_papers_status_check: CHECK ((status = ANY (ARRAY['BROUILLON'::text, 'AUTORISE'::text, 'RETIRE'::text])))
exam_papers_status_not_null: NOT NULL status
exam_papers_version_check: CHECK ((version > 0))
exam_papers_version_not_null: NOT NULL version
standalone_subject_draft: CHECK (((evaluation_id IS NOT NULL) OR ((status = 'BROUILLON'::text) AND (author_id IS NOT NULL) AND (title IS NOT NULL) AND (length(btrim(title)) > 0))))
subject_library_version: UNIQUE (library_id, version)
subject_single_evaluation_reference: CHECK (((evaluation_id IS NULL) OR (source_evaluation_row_id IS NULL)))
```

Index :

```sql
CREATE UNIQUE INDEX exam_papers_evaluation_id_version_key ON escen.exam_papers USING btree (evaluation_id, version)
CREATE UNIQUE INDEX exam_papers_id_evaluation_id_key ON escen.exam_papers USING btree (id, evaluation_id)
CREATE UNIQUE INDEX exam_papers_pkey ON escen.exam_papers USING btree (id)
CREATE INDEX fk_17722 ON escen.exam_papers USING btree (evaluation_id)
CREATE INDEX fk_17727 ON escen.exam_papers USING btree (authorized_by)
CREATE INDEX subject_author_fk ON escen.exam_papers USING btree (author_id)
CREATE UNIQUE INDEX subject_library_version ON escen.exam_papers USING btree (library_id, version)
CREATE INDEX subject_source_fk ON escen.exam_papers USING btree (source_evaluation_row_id)
```

## escen.exam_parts

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| paper_id | uuid | NO | — | NEVER |
| title | escen.nonempty_text | NO | — | NEVER |
| instructions | text | YES | — | NEVER |
| context | jsonb | YES | — | NEVER |
| position | int4 | NO | — | NEVER |

Contraintes :

```sql
exam_parts_id_not_null: NOT NULL id
exam_parts_id_paper_id_key: UNIQUE (id, paper_id)
exam_parts_paper_id_fkey: FOREIGN KEY (paper_id) REFERENCES escen.exam_papers(id) ON DELETE RESTRICT
exam_parts_paper_id_not_null: NOT NULL paper_id
exam_parts_paper_id_position_key: UNIQUE (paper_id, "position")
exam_parts_pkey: PRIMARY KEY (id)
exam_parts_position_check: CHECK (("position" > 0))
exam_parts_position_not_null: NOT NULL "position"
exam_parts_title_not_null: NOT NULL title
```

Index :

```sql
CREATE UNIQUE INDEX exam_parts_id_paper_id_key ON escen.exam_parts USING btree (id, paper_id)
CREATE UNIQUE INDEX exam_parts_paper_id_position_key ON escen.exam_parts USING btree (paper_id, "position")
CREATE UNIQUE INDEX exam_parts_pkey ON escen.exam_parts USING btree (id)
CREATE INDEX fk_17749 ON escen.exam_parts USING btree (paper_id)
```

## escen.exam_questions

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| paper_id | uuid | NO | — | NEVER |
| part_id | uuid | NO | — | NEVER |
| kind | text | NO | — | NEVER |
| prompt | escen.nonempty_text | NO | — | NEVER |
| points | numeric | NO | — | NEVER |
| position | int4 | NO | — | NEVER |
| configuration | jsonb | NO | '{}'::jsonb | NEVER |

Contraintes :

```sql
exam_questions_configuration_not_null: NOT NULL configuration
exam_questions_id_not_null: NOT NULL id
exam_questions_id_paper_id_key: UNIQUE (id, paper_id)
exam_questions_kind_check: CHECK ((kind = ANY (ARRAY['QCM_SIMPLE'::text, 'QCM_MULTIPLE'::text, 'TEXTE'::text, 'REDACTION_GUIDEE'::text, 'STRUCTURE'::text, 'MULTIPARTIE'::text, 'COMPLEXE'::text])))
exam_questions_kind_not_null: NOT NULL kind
exam_questions_paper_id_not_null: NOT NULL paper_id
exam_questions_part_id_not_null: NOT NULL part_id
exam_questions_part_id_paper_id_fkey: FOREIGN KEY (part_id, paper_id) REFERENCES escen.exam_parts(id, paper_id) ON DELETE RESTRICT
exam_questions_part_id_position_key: UNIQUE (part_id, "position")
exam_questions_pkey: PRIMARY KEY (id)
exam_questions_points_check: CHECK ((points > (0)::numeric))
exam_questions_points_not_null: NOT NULL points
exam_questions_position_check: CHECK (("position" > 0))
exam_questions_position_not_null: NOT NULL "position"
exam_questions_prompt_not_null: NOT NULL prompt
```

Index :

```sql
CREATE UNIQUE INDEX exam_questions_id_paper_id_key ON escen.exam_questions USING btree (id, paper_id)
CREATE UNIQUE INDEX exam_questions_part_id_position_key ON escen.exam_questions USING btree (part_id, "position")
CREATE UNIQUE INDEX exam_questions_pkey ON escen.exam_questions USING btree (id)
CREATE INDEX fk_17778 ON escen.exam_questions USING btree (part_id, paper_id)
```

## escen.exam_room_candidates

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| exam_room_id | uuid | NO | — | NEVER |
| candidate_id | uuid | NO | — | NEVER |
| evaluation_id | uuid | NO | — | NEVER |

Contraintes :

```sql
exam_room_candidates_candidate_id_evaluation_id_fkey: FOREIGN KEY (candidate_id, evaluation_id) REFERENCES escen.evaluation_candidates(id, evaluation_id) ON DELETE RESTRICT
exam_room_candidates_candidate_id_not_null: NOT NULL candidate_id
exam_room_candidates_evaluation_id_candidate_id_key: UNIQUE (evaluation_id, candidate_id)
exam_room_candidates_evaluation_id_not_null: NOT NULL evaluation_id
exam_room_candidates_exam_room_id_evaluation_id_fkey: FOREIGN KEY (exam_room_id, evaluation_id) REFERENCES escen.exam_rooms(id, evaluation_id) ON DELETE RESTRICT
exam_room_candidates_exam_room_id_not_null: NOT NULL exam_room_id
exam_room_candidates_id_not_null: NOT NULL id
exam_room_candidates_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE INDEX exam_room_candidate_fk ON escen.exam_room_candidates USING btree (candidate_id, evaluation_id)
CREATE INDEX exam_room_candidate_room_fk ON escen.exam_room_candidates USING btree (exam_room_id, evaluation_id)
CREATE UNIQUE INDEX exam_room_candidates_evaluation_id_candidate_id_key ON escen.exam_room_candidates USING btree (evaluation_id, candidate_id)
CREATE UNIQUE INDEX exam_room_candidates_pkey ON escen.exam_room_candidates USING btree (id)
```

## escen.exam_room_supervisors

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| exam_room_id | uuid | NO | — | NEVER |
| account_id | uuid | NO | — | NEVER |

Contraintes :

```sql
exam_room_supervisors_account_id_fkey: FOREIGN KEY (account_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
exam_room_supervisors_account_id_not_null: NOT NULL account_id
exam_room_supervisors_exam_room_id_account_id_key: UNIQUE (exam_room_id, account_id)
exam_room_supervisors_exam_room_id_fkey: FOREIGN KEY (exam_room_id) REFERENCES escen.exam_rooms(id) ON DELETE RESTRICT
exam_room_supervisors_exam_room_id_not_null: NOT NULL exam_room_id
exam_room_supervisors_id_not_null: NOT NULL id
exam_room_supervisors_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE INDEX exam_room_supervisor_fk ON escen.exam_room_supervisors USING btree (account_id)
CREATE INDEX exam_room_supervisor_room_fk ON escen.exam_room_supervisors USING btree (exam_room_id)
CREATE UNIQUE INDEX exam_room_supervisors_exam_room_id_account_id_key ON escen.exam_room_supervisors USING btree (exam_room_id, account_id)
CREATE UNIQUE INDEX exam_room_supervisors_pkey ON escen.exam_room_supervisors USING btree (id)
```

## escen.exam_rooms

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| delivery_id | uuid | NO | — | NEVER |
| evaluation_id | uuid | NO | — | NEVER |
| room_id | uuid | NO | — | NEVER |
| assigned_capacity | int4 | NO | — | NEVER |

Contraintes :

```sql
exam_rooms_assigned_capacity_check: CHECK ((assigned_capacity > 0))
exam_rooms_assigned_capacity_not_null: NOT NULL assigned_capacity
exam_rooms_delivery_id_evaluation_id_fkey: FOREIGN KEY (delivery_id, evaluation_id) REFERENCES escen.exam_deliveries(id, evaluation_id) ON DELETE RESTRICT
exam_rooms_delivery_id_not_null: NOT NULL delivery_id
exam_rooms_delivery_id_room_id_key: UNIQUE (delivery_id, room_id)
exam_rooms_evaluation_id_not_null: NOT NULL evaluation_id
exam_rooms_id_evaluation_id_key: UNIQUE (id, evaluation_id)
exam_rooms_id_not_null: NOT NULL id
exam_rooms_pkey: PRIMARY KEY (id)
exam_rooms_room_id_fkey: FOREIGN KEY (room_id) REFERENCES escen.rooms(id) ON DELETE RESTRICT
exam_rooms_room_id_not_null: NOT NULL room_id
```

Index :

```sql
CREATE INDEX exam_room_delivery_fk ON escen.exam_rooms USING btree (delivery_id, evaluation_id)
CREATE INDEX exam_room_room_fk ON escen.exam_rooms USING btree (room_id)
CREATE UNIQUE INDEX exam_rooms_delivery_id_room_id_key ON escen.exam_rooms USING btree (delivery_id, room_id)
CREATE UNIQUE INDEX exam_rooms_id_evaluation_id_key ON escen.exam_rooms USING btree (id, evaluation_id)
CREATE UNIQUE INDEX exam_rooms_pkey ON escen.exam_rooms USING btree (id)
```

## escen.expenses

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| site_id | uuid | NO | — | NEVER |
| academic_year_id | uuid | YES | — | NEVER |
| purchase_id | uuid | YES | — | NEVER |
| amount | escen.xof_amount | NO | — | NEVER |
| reference | escen.nonempty_text | NO | — | NEVER |
| description | escen.nonempty_text | NO | — | NEVER |
| paid_on | date | NO | — | NEVER |
| recorded_by | uuid | NO | — | NEVER |

Contraintes :

```sql
expenses_academic_year_id_fkey: FOREIGN KEY (academic_year_id) REFERENCES escen.academic_years(id) ON DELETE RESTRICT
expenses_amount_check: CHECK (((amount)::numeric > (0)::numeric))
expenses_amount_not_null: NOT NULL amount
expenses_description_not_null: NOT NULL description
expenses_id_not_null: NOT NULL id
expenses_paid_on_not_null: NOT NULL paid_on
expenses_pkey: PRIMARY KEY (id)
expenses_purchase_id_fkey: FOREIGN KEY (purchase_id) REFERENCES escen.purchases(id) ON DELETE RESTRICT
expenses_recorded_by_fkey: FOREIGN KEY (recorded_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
expenses_recorded_by_not_null: NOT NULL recorded_by
expenses_reference_key: UNIQUE (reference)
expenses_reference_not_null: NOT NULL reference
expenses_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
expenses_site_id_not_null: NOT NULL site_id
```

Index :

```sql
CREATE UNIQUE INDEX expenses_pkey ON escen.expenses USING btree (id)
CREATE UNIQUE INDEX expenses_reference_key ON escen.expenses USING btree (reference)
CREATE INDEX fk_19264 ON escen.expenses USING btree (site_id)
CREATE INDEX fk_19269 ON escen.expenses USING btree (academic_year_id)
CREATE INDEX fk_19274 ON escen.expenses USING btree (purchase_id)
CREATE INDEX fk_19279 ON escen.expenses USING btree (recorded_by)
```

## escen.fee_rates

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| fee_type_id | uuid | NO | — | NEVER |
| offering_id | uuid | NO | — | NEVER |
| amount | escen.xof_amount | NO | — | NEVER |
| valid_from | date | NO | — | NEVER |
| valid_until | date | YES | — | NEVER |
| eligibility | jsonb | NO | '{}'::jsonb | NEVER |
| approved_by | uuid | NO | — | NEVER |

Contraintes :

```sql
fee_rates_amount_not_null: NOT NULL amount
fee_rates_approved_by_fkey: FOREIGN KEY (approved_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
fee_rates_approved_by_not_null: NOT NULL approved_by
fee_rates_check: CHECK (((valid_until IS NULL) OR (valid_until > valid_from)))
fee_rates_eligibility_not_null: NOT NULL eligibility
fee_rates_fee_type_id_fkey: FOREIGN KEY (fee_type_id) REFERENCES escen.fee_types(id) ON DELETE RESTRICT
fee_rates_fee_type_id_not_null: NOT NULL fee_type_id
fee_rates_id_not_null: NOT NULL id
fee_rates_offering_id_fkey: FOREIGN KEY (offering_id) REFERENCES escen.academic_offerings(id) ON DELETE RESTRICT
fee_rates_offering_id_not_null: NOT NULL offering_id
fee_rates_pkey: PRIMARY KEY (id)
fee_rates_valid_from_not_null: NOT NULL valid_from
```

Index :

```sql
CREATE UNIQUE INDEX fee_rates_pkey ON escen.fee_rates USING btree (id)
CREATE INDEX fk_18278 ON escen.fee_rates USING btree (fee_type_id)
CREATE INDEX fk_18283 ON escen.fee_rates USING btree (offering_id)
CREATE INDEX fk_18288 ON escen.fee_rates USING btree (approved_by)
```

## escen.fee_types

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| category | text | NO | — | NEVER |
| active | bool | NO | true | NEVER |

Contraintes :

```sql
fee_types_active_not_null: NOT NULL active
fee_types_category_check: CHECK ((category = ANY (ARRAY['SCOLARITE'::text, 'INSCRIPTION'::text, 'ANNEXE'::text])))
fee_types_category_not_null: NOT NULL category
fee_types_code_key: UNIQUE (code)
fee_types_code_not_null: NOT NULL code
fee_types_id_not_null: NOT NULL id
fee_types_name_not_null: NOT NULL name
fee_types_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX fee_types_code_key ON escen.fee_types USING btree (code)
CREATE UNIQUE INDEX fee_types_pkey ON escen.fee_types USING btree (id)
```

## escen.file_objects

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| bucket | escen.nonempty_text | NO | — | NEVER |
| object_path | escen.nonempty_text | NO | — | NEVER |
| original_name | escen.nonempty_text | NO | — | NEVER |
| mime_type | escen.nonempty_text | NO | — | NEVER |
| byte_size | int8 | NO | — | NEVER |
| sha256 | text | YES | — | NEVER |
| uploaded_by | uuid | NO | — | NEVER |
| uploaded_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
file_objects_bucket_not_null: NOT NULL bucket
file_objects_bucket_object_path_key: UNIQUE (bucket, object_path)
file_objects_byte_size_check: CHECK ((byte_size > 0))
file_objects_byte_size_not_null: NOT NULL byte_size
file_objects_id_not_null: NOT NULL id
file_objects_mime_type_not_null: NOT NULL mime_type
file_objects_object_path_not_null: NOT NULL object_path
file_objects_original_name_not_null: NOT NULL original_name
file_objects_pkey: PRIMARY KEY (id)
file_objects_sha256_check: CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text))
file_objects_uploaded_at_not_null: NOT NULL uploaded_at
file_objects_uploaded_by_fkey: FOREIGN KEY (uploaded_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
file_objects_uploaded_by_not_null: NOT NULL uploaded_by
```

Index :

```sql
CREATE UNIQUE INDEX file_objects_bucket_object_path_key ON escen.file_objects USING btree (bucket, object_path)
CREATE UNIQUE INDEX file_objects_pkey ON escen.file_objects USING btree (id)
CREATE INDEX fk_18743 ON escen.file_objects USING btree (uploaded_by)
```

## escen.financial_contracts

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| enrollment_id | uuid | NO | — | NEVER |
| reference | escen.nonempty_text | NO | — | NEVER |
| currency | text | NO | 'XOF'::text | NEVER |
| created_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
financial_contracts_created_at_not_null: NOT NULL created_at
financial_contracts_currency_check: CHECK ((currency = 'XOF'::text))
financial_contracts_currency_not_null: NOT NULL currency
financial_contracts_enrollment_id_fkey: FOREIGN KEY (enrollment_id) REFERENCES escen.enrollments(id) ON DELETE RESTRICT
financial_contracts_enrollment_id_key: UNIQUE (enrollment_id)
financial_contracts_enrollment_id_not_null: NOT NULL enrollment_id
financial_contracts_id_enrollment_id_key: UNIQUE (id, enrollment_id)
financial_contracts_id_not_null: NOT NULL id
financial_contracts_pkey: PRIMARY KEY (id)
financial_contracts_reference_key: UNIQUE (reference)
financial_contracts_reference_not_null: NOT NULL reference
```

Index :

```sql
CREATE UNIQUE INDEX financial_contracts_enrollment_id_key ON escen.financial_contracts USING btree (enrollment_id)
CREATE UNIQUE INDEX financial_contracts_id_enrollment_id_key ON escen.financial_contracts USING btree (id, enrollment_id)
CREATE UNIQUE INDEX financial_contracts_pkey ON escen.financial_contracts USING btree (id)
CREATE UNIQUE INDEX financial_contracts_reference_key ON escen.financial_contracts USING btree (reference)
CREATE INDEX fk_18370 ON escen.financial_contracts USING btree (enrollment_id)
```

## escen.generated_documents

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| student_id | uuid | NO | — | NEVER |
| enrollment_id | uuid | YES | — | NEVER |
| decision_id | uuid | YES | — | NEVER |
| kind | text | NO | — | NEVER |
| reference | escen.nonempty_text | NO | — | NEVER |
| version | int4 | NO | — | NEVER |
| supersedes_id | uuid | YES | — | NEVER |
| content_snapshot | jsonb | NO | — | NEVER |
| issued_by | uuid | NO | — | NEVER |
| issued_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
generated_documents_check: CHECK (((kind <> 'RELEVE'::text) OR (decision_id IS NOT NULL)))
generated_documents_content_snapshot_not_null: NOT NULL content_snapshot
generated_documents_decision_id_fkey: FOREIGN KEY (decision_id) REFERENCES escen.jury_decisions(id) ON DELETE RESTRICT
generated_documents_enrollment_id_student_id_fkey: FOREIGN KEY (enrollment_id, student_id) REFERENCES escen.enrollments(id, student_id) ON DELETE RESTRICT
generated_documents_id_not_null: NOT NULL id
generated_documents_issued_at_not_null: NOT NULL issued_at
generated_documents_issued_by_fkey: FOREIGN KEY (issued_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
generated_documents_issued_by_not_null: NOT NULL issued_by
generated_documents_kind_check: CHECK ((kind = ANY (ARRAY['CARTE'::text, 'CERTIFICAT'::text, 'RELEVE'::text, 'DIPLOME'::text])))
generated_documents_kind_not_null: NOT NULL kind
generated_documents_pkey: PRIMARY KEY (id)
generated_documents_reference_key: UNIQUE (reference)
generated_documents_reference_not_null: NOT NULL reference
generated_documents_student_id_fkey: FOREIGN KEY (student_id) REFERENCES escen.students(id) ON DELETE RESTRICT
generated_documents_student_id_not_null: NOT NULL student_id
generated_documents_supersedes_id_fkey: FOREIGN KEY (supersedes_id) REFERENCES escen.generated_documents(id) ON DELETE RESTRICT
generated_documents_version_check: CHECK ((version > 0))
generated_documents_version_not_null: NOT NULL version
```

Index :

```sql
CREATE INDEX fk_18219 ON escen.generated_documents USING btree (student_id)
CREATE INDEX fk_18224 ON escen.generated_documents USING btree (decision_id)
CREATE INDEX fk_18229 ON escen.generated_documents USING btree (supersedes_id)
CREATE INDEX fk_18234 ON escen.generated_documents USING btree (issued_by)
CREATE INDEX fk_18239 ON escen.generated_documents USING btree (enrollment_id, student_id)
CREATE UNIQUE INDEX generated_documents_pkey ON escen.generated_documents USING btree (id)
CREATE UNIQUE INDEX generated_documents_reference_key ON escen.generated_documents USING btree (reference)
```

## escen.grade_revisions

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| grade_id | uuid | NO | — | NEVER |
| complaint_id | uuid | YES | — | NEVER |
| old_value | escen.mark | NO | — | NEVER |
| new_value | escen.mark | NO | — | NEVER |
| actor_id | uuid | NO | — | NEVER |
| actor_role | escen.nonempty_text | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| happened_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
grade_revisions_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
grade_revisions_actor_id_not_null: NOT NULL actor_id
grade_revisions_actor_role_not_null: NOT NULL actor_role
grade_revisions_check: CHECK (((old_value)::numeric <> (new_value)::numeric))
grade_revisions_complaint_id_fkey: FOREIGN KEY (complaint_id) REFERENCES escen.complaints(id) ON DELETE RESTRICT
grade_revisions_grade_id_fkey: FOREIGN KEY (grade_id) REFERENCES escen.grades(id) ON DELETE RESTRICT
grade_revisions_grade_id_not_null: NOT NULL grade_id
grade_revisions_happened_at_not_null: NOT NULL happened_at
grade_revisions_id_not_null: NOT NULL id
grade_revisions_new_value_not_null: NOT NULL new_value
grade_revisions_old_value_not_null: NOT NULL old_value
grade_revisions_pkey: PRIMARY KEY (id)
grade_revisions_reason_not_null: NOT NULL reason
```

Index :

```sql
CREATE INDEX fk_18001 ON escen.grade_revisions USING btree (grade_id)
CREATE INDEX fk_18006 ON escen.grade_revisions USING btree (complaint_id)
CREATE INDEX fk_18011 ON escen.grade_revisions USING btree (actor_id)
CREATE UNIQUE INDEX grade_revisions_pkey ON escen.grade_revisions USING btree (id)
```

## escen.grades

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| candidate_id | uuid | NO | — | NEVER |
| value | escen.mark | YES | — | NEVER |
| absence_status | text | YES | — | NEVER |
| revision | int4 | NO | 1 | NEVER |
| entered_by | uuid | NO | — | NEVER |
| last_modified_by | uuid | NO | — | NEVER |
| entered_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
grades_absence_status_check: CHECK ((absence_status = ANY (ARRAY['ABSENT'::text, 'JUSTIFIE'::text, 'NON_TRAITE'::text])))
grades_candidate_id_fkey: FOREIGN KEY (candidate_id) REFERENCES escen.evaluation_candidates(id) ON DELETE RESTRICT
grades_candidate_id_key: UNIQUE (candidate_id)
grades_candidate_id_not_null: NOT NULL candidate_id
grades_check: CHECK (((absence_status IS NULL) OR (value IS NULL)))
grades_entered_at_not_null: NOT NULL entered_at
grades_entered_by_fkey: FOREIGN KEY (entered_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
grades_entered_by_not_null: NOT NULL entered_by
grades_id_not_null: NOT NULL id
grades_last_modified_by_fkey: FOREIGN KEY (last_modified_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
grades_last_modified_by_not_null: NOT NULL last_modified_by
grades_pkey: PRIMARY KEY (id)
grades_revision_check: CHECK ((revision > 0))
grades_revision_not_null: NOT NULL revision
```

Index :

```sql
CREATE INDEX fk_17913 ON escen.grades USING btree (candidate_id)
CREATE INDEX fk_17918 ON escen.grades USING btree (entered_by)
CREATE INDEX fk_17923 ON escen.grades USING btree (last_modified_by)
CREATE UNIQUE INDEX grades_candidate_id_key ON escen.grades USING btree (candidate_id)
CREATE UNIQUE INDEX grades_pkey ON escen.grades USING btree (id)
```

## escen.group_offerings

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| group_id | uuid | NO | — | NEVER |
| offering_id | uuid | NO | — | NEVER |
| academic_year_id | uuid | NO | — | NEVER |
| level_id | uuid | NO | — | NEVER |
| site_id | uuid | NO | — | NEVER |

Contraintes :

```sql
group_offerings_academic_year_id_not_null: NOT NULL academic_year_id
group_offerings_group_id_academic_year_id_level_id_fkey: FOREIGN KEY (group_id, academic_year_id, level_id) REFERENCES escen.groups(id, academic_year_id, level_id) ON DELETE RESTRICT
group_offerings_group_id_not_null: NOT NULL group_id
group_offerings_group_id_offering_id_key: UNIQUE (group_id, offering_id)
group_offerings_group_id_site_id_fkey: FOREIGN KEY (group_id, site_id) REFERENCES escen.groups(id, site_id) ON DELETE RESTRICT
group_offerings_id_not_null: NOT NULL id
group_offerings_level_id_not_null: NOT NULL level_id
group_offerings_offering_id_academic_year_id_level_id_fkey: FOREIGN KEY (offering_id, academic_year_id, level_id) REFERENCES escen.academic_offerings(id, academic_year_id, level_id) ON DELETE RESTRICT
group_offerings_offering_id_not_null: NOT NULL offering_id
group_offerings_offering_id_site_id_fkey: FOREIGN KEY (offering_id, site_id) REFERENCES escen.academic_offerings(id, site_id) ON DELETE RESTRICT
group_offerings_pkey: PRIMARY KEY (id)
group_offerings_site_id_not_null: NOT NULL site_id
```

Index :

```sql
CREATE INDEX fk_17042 ON escen.group_offerings USING btree (group_id, academic_year_id, level_id)
CREATE INDEX fk_17047 ON escen.group_offerings USING btree (offering_id, academic_year_id, level_id)
CREATE INDEX fk_17052 ON escen.group_offerings USING btree (group_id, site_id)
CREATE INDEX fk_17057 ON escen.group_offerings USING btree (offering_id, site_id)
CREATE UNIQUE INDEX group_offerings_group_id_offering_id_key ON escen.group_offerings USING btree (group_id, offering_id)
CREATE UNIQUE INDEX group_offerings_pkey ON escen.group_offerings USING btree (id)
```

## escen.groups

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| academic_year_id | uuid | NO | — | NEVER |
| level_id | uuid | NO | — | NEVER |
| site_id | uuid | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
groups_academic_year_id_fkey: FOREIGN KEY (academic_year_id) REFERENCES escen.academic_years(id) ON DELETE RESTRICT
groups_academic_year_id_not_null: NOT NULL academic_year_id
groups_academic_year_id_site_id_level_id_name_key: UNIQUE (academic_year_id, site_id, level_id, name)
groups_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
groups_id_academic_year_id_level_id_key: UNIQUE (id, academic_year_id, level_id)
groups_id_not_null: NOT NULL id
groups_id_site_id_key: UNIQUE (id, site_id)
groups_level_id_fkey: FOREIGN KEY (level_id) REFERENCES escen.levels(id) ON DELETE RESTRICT
groups_level_id_not_null: NOT NULL level_id
groups_name_not_null: NOT NULL name
groups_pkey: PRIMARY KEY (id)
groups_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
groups_site_id_not_null: NOT NULL site_id
```

Index :

```sql
CREATE INDEX fk_17013 ON escen.groups USING btree (academic_year_id)
CREATE INDEX fk_17018 ON escen.groups USING btree (level_id)
CREATE INDEX fk_17023 ON escen.groups USING btree (site_id)
CREATE UNIQUE INDEX groups_academic_year_id_site_id_level_id_name_key ON escen.groups USING btree (academic_year_id, site_id, level_id, name)
CREATE UNIQUE INDEX groups_id_academic_year_id_level_id_key ON escen.groups USING btree (id, academic_year_id, level_id)
CREATE UNIQUE INDEX groups_id_site_id_key ON escen.groups USING btree (id, site_id)
CREATE UNIQUE INDEX groups_pkey ON escen.groups USING btree (id)
```

## escen.installments

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| version_id | uuid | NO | — | NEVER |
| position | int4 | NO | — | NEVER |
| due_on | date | NO | — | NEVER |
| amount | escen.xof_amount | NO | — | NEVER |
| description | escen.nonempty_text | NO | — | NEVER |

Contraintes :

```sql
installments_amount_check: CHECK (((amount)::numeric > (0)::numeric))
installments_amount_not_null: NOT NULL amount
installments_description_not_null: NOT NULL description
installments_due_on_not_null: NOT NULL due_on
installments_id_not_null: NOT NULL id
installments_id_version_id_key: UNIQUE (id, version_id)
installments_pkey: PRIMARY KEY (id)
installments_position_check: CHECK (("position" > 0))
installments_position_not_null: NOT NULL "position"
installments_version_id_fkey: FOREIGN KEY (version_id) REFERENCES escen.contract_versions(id) ON DELETE RESTRICT
installments_version_id_not_null: NOT NULL version_id
installments_version_id_position_key: UNIQUE (version_id, "position")
```

Index :

```sql
CREATE INDEX fk_18490 ON escen.installments USING btree (version_id)
CREATE UNIQUE INDEX installments_id_version_id_key ON escen.installments USING btree (id, version_id)
CREATE UNIQUE INDEX installments_pkey ON escen.installments USING btree (id)
CREATE UNIQUE INDEX installments_version_id_position_key ON escen.installments USING btree (version_id, "position")
```

## escen.juries

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| offering_semester_id | uuid | NO | — | NEVER |
| rules_id | uuid | NO | — | NEVER |
| held_at | timestamptz | NO | — | NEVER |
| minutes | text | YES | — | NEVER |
| chaired_by | uuid | NO | — | NEVER |

Contraintes :

```sql
juries_chaired_by_fkey: FOREIGN KEY (chaired_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
juries_chaired_by_not_null: NOT NULL chaired_by
juries_held_at_not_null: NOT NULL held_at
juries_id_not_null: NOT NULL id
juries_id_offering_semester_id_key: UNIQUE (id, offering_semester_id)
juries_offering_semester_id_fkey: FOREIGN KEY (offering_semester_id) REFERENCES escen.offering_semesters(id) ON DELETE RESTRICT
juries_offering_semester_id_not_null: NOT NULL offering_semester_id
juries_pkey: PRIMARY KEY (id)
juries_rules_id_fkey: FOREIGN KEY (rules_id) REFERENCES escen.academic_rule_versions(id) ON DELETE RESTRICT
juries_rules_id_not_null: NOT NULL rules_id
```

Index :

```sql
CREATE INDEX fk_18053 ON escen.juries USING btree (offering_semester_id)
CREATE INDEX fk_18058 ON escen.juries USING btree (rules_id)
CREATE INDEX fk_18063 ON escen.juries USING btree (chaired_by)
CREATE UNIQUE INDEX juries_id_offering_semester_id_key ON escen.juries USING btree (id, offering_semester_id)
CREATE UNIQUE INDEX juries_pkey ON escen.juries USING btree (id)
```

## escen.jury_decisions

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| jury_id | uuid | NO | — | NEVER |
| offering_semester_id | uuid | NO | — | NEVER |
| offering_id | uuid | NO | — | NEVER |
| enrollment_id | uuid | NO | — | NEVER |
| supersedes_id | uuid | YES | — | NEVER |
| decision | text | NO | — | NEVER |
| average | escen.mark | NO | — | NEVER |
| earned_credits | numeric | NO | — | NEVER |
| required_credits | numeric | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| decided_by | uuid | NO | — | NEVER |
| decided_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
jury_decisions_average_not_null: NOT NULL average
jury_decisions_check: CHECK ((earned_credits <= required_credits))
jury_decisions_check1: CHECK (((supersedes_id IS NULL) OR (supersedes_id <> id)))
jury_decisions_decided_at_not_null: NOT NULL decided_at
jury_decisions_decided_by_fkey: FOREIGN KEY (decided_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
jury_decisions_decided_by_not_null: NOT NULL decided_by
jury_decisions_decision_check: CHECK ((decision = ANY (ARRAY['ADMIS'::text, 'RATTRAPAGE'::text, 'AJOURNE'::text])))
jury_decisions_decision_not_null: NOT NULL decision
jury_decisions_earned_credits_check: CHECK ((earned_credits >= (0)::numeric))
jury_decisions_earned_credits_not_null: NOT NULL earned_credits
jury_decisions_enrollment_id_not_null: NOT NULL enrollment_id
jury_decisions_enrollment_id_offering_id_fkey: FOREIGN KEY (enrollment_id, offering_id) REFERENCES escen.enrollments(id, offering_id) ON DELETE RESTRICT
jury_decisions_id_not_null: NOT NULL id
jury_decisions_jury_id_not_null: NOT NULL jury_id
jury_decisions_jury_id_offering_semester_id_fkey: FOREIGN KEY (jury_id, offering_semester_id) REFERENCES escen.juries(id, offering_semester_id) ON DELETE RESTRICT
jury_decisions_offering_id_not_null: NOT NULL offering_id
jury_decisions_offering_semester_id_not_null: NOT NULL offering_semester_id
jury_decisions_offering_semester_id_offering_id_fkey: FOREIGN KEY (offering_semester_id, offering_id) REFERENCES escen.offering_semesters(id, offering_id) ON DELETE RESTRICT
jury_decisions_pkey: PRIMARY KEY (id)
jury_decisions_reason_not_null: NOT NULL reason
jury_decisions_required_credits_check: CHECK ((required_credits > (0)::numeric))
jury_decisions_required_credits_not_null: NOT NULL required_credits
jury_decisions_supersedes_id_fkey: FOREIGN KEY (supersedes_id) REFERENCES escen.jury_decisions(id) ON DELETE RESTRICT
```

Index :

```sql
CREATE UNIQUE INDEX decision_successor_unique ON escen.jury_decisions USING btree (supersedes_id) WHERE (supersedes_id IS NOT NULL)
CREATE INDEX fk_18118 ON escen.jury_decisions USING btree (supersedes_id)
CREATE INDEX fk_18123 ON escen.jury_decisions USING btree (decided_by)
CREATE INDEX fk_18128 ON escen.jury_decisions USING btree (jury_id, offering_semester_id)
CREATE INDEX fk_18133 ON escen.jury_decisions USING btree (offering_semester_id, offering_id)
CREATE INDEX fk_18138 ON escen.jury_decisions USING btree (enrollment_id, offering_id)
CREATE UNIQUE INDEX jury_decisions_pkey ON escen.jury_decisions USING btree (id)
```

## escen.jury_grade_inputs

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| decision_id | uuid | NO | — | NEVER |
| grade_id | uuid | NO | — | NEVER |
| grade_revision | int4 | NO | — | NEVER |
| value | escen.mark | NO | — | NEVER |

Contraintes :

```sql
jury_grade_inputs_decision_id_fkey: FOREIGN KEY (decision_id) REFERENCES escen.jury_decisions(id) ON DELETE RESTRICT
jury_grade_inputs_decision_id_grade_id_key: UNIQUE (decision_id, grade_id)
jury_grade_inputs_decision_id_not_null: NOT NULL decision_id
jury_grade_inputs_grade_id_fkey: FOREIGN KEY (grade_id) REFERENCES escen.grades(id) ON DELETE RESTRICT
jury_grade_inputs_grade_id_not_null: NOT NULL grade_id
jury_grade_inputs_grade_revision_check: CHECK ((grade_revision > 0))
jury_grade_inputs_grade_revision_not_null: NOT NULL grade_revision
jury_grade_inputs_id_not_null: NOT NULL id
jury_grade_inputs_pkey: PRIMARY KEY (id)
jury_grade_inputs_value_not_null: NOT NULL value
```

Index :

```sql
CREATE INDEX fk_18160 ON escen.jury_grade_inputs USING btree (decision_id)
CREATE INDEX fk_18165 ON escen.jury_grade_inputs USING btree (grade_id)
CREATE UNIQUE INDEX jury_grade_inputs_decision_id_grade_id_key ON escen.jury_grade_inputs USING btree (decision_id, grade_id)
CREATE UNIQUE INDEX jury_grade_inputs_pkey ON escen.jury_grade_inputs USING btree (id)
```

## escen.jury_members

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| jury_id | uuid | NO | — | NEVER |
| account_id | uuid | NO | — | NEVER |
| capacity | escen.nonempty_text | NO | — | NEVER |

Contraintes :

```sql
jury_members_account_id_fkey: FOREIGN KEY (account_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
jury_members_account_id_not_null: NOT NULL account_id
jury_members_capacity_not_null: NOT NULL capacity
jury_members_id_not_null: NOT NULL id
jury_members_jury_id_account_id_key: UNIQUE (jury_id, account_id)
jury_members_jury_id_fkey: FOREIGN KEY (jury_id) REFERENCES escen.juries(id) ON DELETE RESTRICT
jury_members_jury_id_not_null: NOT NULL jury_id
jury_members_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE INDEX fk_18082 ON escen.jury_members USING btree (jury_id)
CREATE INDEX fk_18087 ON escen.jury_members USING btree (account_id)
CREATE UNIQUE INDEX jury_members_jury_id_account_id_key ON escen.jury_members USING btree (jury_id, account_id)
CREATE UNIQUE INDEX jury_members_pkey ON escen.jury_members USING btree (id)
```

## escen.levels

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| cycle_id | uuid | NO | — | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| position | int2 | NO | — | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
levels_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
levels_code_key: UNIQUE (code)
levels_code_not_null: NOT NULL code
levels_cycle_id_fkey: FOREIGN KEY (cycle_id) REFERENCES escen.cycles(id) ON DELETE RESTRICT
levels_cycle_id_not_null: NOT NULL cycle_id
levels_cycle_id_position_key: UNIQUE (cycle_id, "position")
levels_id_not_null: NOT NULL id
levels_name_not_null: NOT NULL name
levels_pkey: PRIMARY KEY (id)
levels_position_check: CHECK (("position" > 0))
levels_position_not_null: NOT NULL "position"
```

Index :

```sql
CREATE INDEX fk_16743 ON escen.levels USING btree (cycle_id)
CREATE UNIQUE INDEX levels_code_key ON escen.levels USING btree (code)
CREATE UNIQUE INDEX levels_cycle_id_position_key ON escen.levels USING btree (cycle_id, "position")
CREATE UNIQUE INDEX levels_pkey ON escen.levels USING btree (id)
```

## escen.offering_semesters

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| offering_id | uuid | NO | — | NEVER |
| curriculum_id | uuid | NO | — | NEVER |
| curriculum_semester_id | uuid | NO | — | NEVER |
| starts_on | date | NO | — | NEVER |
| ends_on | date | NO | — | NEVER |

Contraintes :

```sql
offering_semesters_check: CHECK ((ends_on >= starts_on))
offering_semesters_curriculum_id_not_null: NOT NULL curriculum_id
offering_semesters_curriculum_semester_id_curriculum_id_fkey: FOREIGN KEY (curriculum_semester_id, curriculum_id) REFERENCES escen.curriculum_semesters(id, curriculum_id) ON DELETE RESTRICT
offering_semesters_curriculum_semester_id_not_null: NOT NULL curriculum_semester_id
offering_semesters_ends_on_not_null: NOT NULL ends_on
offering_semesters_id_not_null: NOT NULL id
offering_semesters_id_offering_id_key: UNIQUE (id, offering_id)
offering_semesters_offering_id_curriculum_id_fkey: FOREIGN KEY (offering_id, curriculum_id) REFERENCES escen.academic_offerings(id, curriculum_id) ON DELETE RESTRICT
offering_semesters_offering_id_curriculum_semester_id_key: UNIQUE (offering_id, curriculum_semester_id)
offering_semesters_offering_id_not_null: NOT NULL offering_id
offering_semesters_pkey: PRIMARY KEY (id)
offering_semesters_starts_on_not_null: NOT NULL starts_on
```

Index :

```sql
CREATE INDEX fk_16984 ON escen.offering_semesters USING btree (offering_id, curriculum_id)
CREATE INDEX fk_16989 ON escen.offering_semesters USING btree (curriculum_semester_id, curriculum_id)
CREATE UNIQUE INDEX offering_semesters_id_offering_id_key ON escen.offering_semesters USING btree (id, offering_id)
CREATE UNIQUE INDEX offering_semesters_offering_id_curriculum_semester_id_key ON escen.offering_semesters USING btree (offering_id, curriculum_semester_id)
CREATE UNIQUE INDEX offering_semesters_pkey ON escen.offering_semesters USING btree (id)
```

## escen.payment_allocations

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| payment_id | uuid | NO | — | NEVER |
| enrollment_id | uuid | NO | — | NEVER |
| contract_id | uuid | NO | — | NEVER |
| version_id | uuid | NO | — | NEVER |
| line_id | uuid | NO | — | NEVER |
| installment_id | uuid | YES | — | NEVER |
| amount | escen.xof_amount | NO | — | NEVER |
| allocated_by | uuid | NO | — | NEVER |
| allocated_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
payment_allocations_allocated_at_not_null: NOT NULL allocated_at
payment_allocations_allocated_by_fkey: FOREIGN KEY (allocated_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
payment_allocations_allocated_by_not_null: NOT NULL allocated_by
payment_allocations_amount_check: CHECK (((amount)::numeric > (0)::numeric))
payment_allocations_amount_not_null: NOT NULL amount
payment_allocations_contract_id_enrollment_id_fkey: FOREIGN KEY (contract_id, enrollment_id) REFERENCES escen.financial_contracts(id, enrollment_id) ON DELETE RESTRICT
payment_allocations_contract_id_not_null: NOT NULL contract_id
payment_allocations_enrollment_id_not_null: NOT NULL enrollment_id
payment_allocations_id_not_null: NOT NULL id
payment_allocations_installment_id_version_id_fkey: FOREIGN KEY (installment_id, version_id) REFERENCES escen.installments(id, version_id) ON DELETE RESTRICT
payment_allocations_line_id_not_null: NOT NULL line_id
payment_allocations_line_id_version_id_fkey: FOREIGN KEY (line_id, version_id) REFERENCES escen.contract_lines(id, version_id) ON DELETE RESTRICT
payment_allocations_payment_id_enrollment_id_fkey: FOREIGN KEY (payment_id, enrollment_id) REFERENCES escen.payments(id, enrollment_id) ON DELETE RESTRICT
payment_allocations_payment_id_not_null: NOT NULL payment_id
payment_allocations_pkey: PRIMARY KEY (id)
payment_allocations_version_id_contract_id_fkey: FOREIGN KEY (version_id, contract_id) REFERENCES escen.contract_versions(id, contract_id) ON DELETE RESTRICT
payment_allocations_version_id_not_null: NOT NULL version_id
```

Index :

```sql
CREATE INDEX fk_18611 ON escen.payment_allocations USING btree (allocated_by)
CREATE INDEX fk_18616 ON escen.payment_allocations USING btree (payment_id, enrollment_id)
CREATE INDEX fk_18621 ON escen.payment_allocations USING btree (contract_id, enrollment_id)
CREATE INDEX fk_18626 ON escen.payment_allocations USING btree (version_id, contract_id)
CREATE INDEX fk_18631 ON escen.payment_allocations USING btree (line_id, version_id)
CREATE INDEX fk_18636 ON escen.payment_allocations USING btree (installment_id, version_id)
CREATE UNIQUE INDEX payment_allocations_pkey ON escen.payment_allocations USING btree (id)
```

## escen.payment_documents

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| payment_id | uuid | NO | — | NEVER |
| file_id | uuid | NO | — | NEVER |

Contraintes :

```sql
payment_documents_file_id_fkey: FOREIGN KEY (file_id) REFERENCES escen.file_objects(id) ON DELETE RESTRICT
payment_documents_file_id_not_null: NOT NULL file_id
payment_documents_id_not_null: NOT NULL id
payment_documents_payment_id_file_id_key: UNIQUE (payment_id, file_id)
payment_documents_payment_id_fkey: FOREIGN KEY (payment_id) REFERENCES escen.payments(id) ON DELETE RESTRICT
payment_documents_payment_id_not_null: NOT NULL payment_id
payment_documents_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE INDEX fk_18899 ON escen.payment_documents USING btree (payment_id)
CREATE INDEX fk_18904 ON escen.payment_documents USING btree (file_id)
CREATE UNIQUE INDEX payment_documents_payment_id_file_id_key ON escen.payment_documents USING btree (payment_id, file_id)
CREATE UNIQUE INDEX payment_documents_pkey ON escen.payment_documents USING btree (id)
```

## escen.payment_reversals

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| payment_id | uuid | NO | — | NEVER |
| actor_id | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| reversed_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
payment_reversals_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
payment_reversals_actor_id_not_null: NOT NULL actor_id
payment_reversals_id_not_null: NOT NULL id
payment_reversals_payment_id_fkey: FOREIGN KEY (payment_id) REFERENCES escen.payments(id) ON DELETE RESTRICT
payment_reversals_payment_id_key: UNIQUE (payment_id)
payment_reversals_payment_id_not_null: NOT NULL payment_id
payment_reversals_pkey: PRIMARY KEY (id)
payment_reversals_reason_not_null: NOT NULL reason
payment_reversals_reversed_at_not_null: NOT NULL reversed_at
```

Index :

```sql
CREATE INDEX fk_18553 ON escen.payment_reversals USING btree (payment_id)
CREATE INDEX fk_18558 ON escen.payment_reversals USING btree (actor_id)
CREATE UNIQUE INDEX payment_reversals_payment_id_key ON escen.payment_reversals USING btree (payment_id)
CREATE UNIQUE INDEX payment_reversals_pkey ON escen.payment_reversals USING btree (id)
```

## escen.payments

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| enrollment_id | uuid | NO | — | NEVER |
| payer_person_id | uuid | YES | — | NEVER |
| payer_name | escen.nonempty_text | NO | — | NEVER |
| amount | escen.xof_amount | NO | — | NEVER |
| method | text | NO | — | NEVER |
| provider | escen.nonempty_text | NO | — | NEVER |
| reference | escen.nonempty_text | NO | — | NEVER |
| paid_on | date | NO | — | NEVER |
| recorded_by | uuid | NO | — | NEVER |
| recorded_at | timestamptz | NO | now() | NEVER |
| withdrawal_fee | escen.xof_amount | NO | 0 | NEVER |
| comment | text | YES | — | NEVER |

Contraintes :

```sql
payments_amount_check: CHECK (((amount)::numeric > (0)::numeric))
payments_amount_not_null: NOT NULL amount
payments_enrollment_id_fkey: FOREIGN KEY (enrollment_id) REFERENCES escen.enrollments(id) ON DELETE RESTRICT
payments_enrollment_id_not_null: NOT NULL enrollment_id
payments_id_enrollment_id_key: UNIQUE (id, enrollment_id)
payments_id_not_null: NOT NULL id
payments_method_check: CHECK ((method = ANY (ARRAY['ESPECES'::text, 'VIREMENT'::text, 'CARTE'::text, 'MOBILE_MONEY'::text, 'CHEQUE'::text])))
payments_method_not_null: NOT NULL method
payments_paid_on_not_null: NOT NULL paid_on
payments_payer_name_not_null: NOT NULL payer_name
payments_payer_person_id_fkey: FOREIGN KEY (payer_person_id) REFERENCES escen.people(id) ON DELETE RESTRICT
payments_pkey: PRIMARY KEY (id)
payments_provider_not_null: NOT NULL provider
payments_provider_reference_key: UNIQUE (provider, reference)
payments_recorded_at_not_null: NOT NULL recorded_at
payments_recorded_by_fkey: FOREIGN KEY (recorded_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
payments_recorded_by_not_null: NOT NULL recorded_by
payments_reference_not_null: NOT NULL reference
payments_withdrawal_fee_not_null: NOT NULL withdrawal_fee
```

Index :

```sql
CREATE INDEX fk_18522 ON escen.payments USING btree (enrollment_id)
CREATE INDEX fk_18527 ON escen.payments USING btree (payer_person_id)
CREATE INDEX fk_18532 ON escen.payments USING btree (recorded_by)
CREATE UNIQUE INDEX payments_id_enrollment_id_key ON escen.payments USING btree (id, enrollment_id)
CREATE UNIQUE INDEX payments_pkey ON escen.payments USING btree (id)
CREATE UNIQUE INDEX payments_provider_reference_key ON escen.payments USING btree (provider, reference)
```

## escen.people

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| firstname | escen.nonempty_text | NO | — | NEVER |
| lastname | escen.nonempty_text | NO | — | NEVER |
| maiden_name | text | YES | — | NEVER |
| birth_date | date | YES | — | NEVER |
| birth_place | text | YES | — | NEVER |
| nationality | text | YES | — | NEVER |
| gender | text | YES | — | NEVER |
| email | text | YES | — | NEVER |
| phone | text | YES | — | NEVER |
| address | text | YES | — | NEVER |
| city | text | YES | — | NEVER |
| country | text | YES | — | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| created_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
people_created_at_not_null: NOT NULL created_at
people_firstname_not_null: NOT NULL firstname
people_id_not_null: NOT NULL id
people_lastname_not_null: NOT NULL lastname
people_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX people_pkey ON escen.people USING btree (id)
```

## escen.permissions

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| description | escen.nonempty_text | NO | — | NEVER |

Contraintes :

```sql
permissions_code_key: UNIQUE (code)
permissions_code_not_null: NOT NULL code
permissions_description_not_null: NOT NULL description
permissions_id_not_null: NOT NULL id
permissions_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX permissions_code_key ON escen.permissions USING btree (code)
CREATE UNIQUE INDEX permissions_pkey ON escen.permissions USING btree (id)
```

## escen.programs

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| description | text | YES | — | NEVER |
| active | bool | NO | true | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
programs_active_not_null: NOT NULL active
programs_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
programs_code_key: UNIQUE (code)
programs_code_not_null: NOT NULL code
programs_id_not_null: NOT NULL id
programs_name_not_null: NOT NULL name
programs_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX programs_code_key ON escen.programs USING btree (code)
CREATE UNIQUE INDEX programs_pkey ON escen.programs USING btree (id)
```

## escen.purchase_lines

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| purchase_id | uuid | NO | — | NEVER |
| description | escen.nonempty_text | NO | — | NEVER |
| quantity | numeric | NO | — | NEVER |
| unit_amount | escen.xof_amount | NO | — | NEVER |

Contraintes :

```sql
purchase_lines_description_not_null: NOT NULL description
purchase_lines_id_not_null: NOT NULL id
purchase_lines_id_purchase_id_key: UNIQUE (id, purchase_id)
purchase_lines_pkey: PRIMARY KEY (id)
purchase_lines_purchase_id_fkey: FOREIGN KEY (purchase_id) REFERENCES escen.purchases(id) ON DELETE RESTRICT
purchase_lines_purchase_id_not_null: NOT NULL purchase_id
purchase_lines_quantity_check: CHECK ((quantity > (0)::numeric))
purchase_lines_quantity_not_null: NOT NULL quantity
purchase_lines_unit_amount_not_null: NOT NULL unit_amount
```

Index :

```sql
CREATE INDEX fk_19162 ON escen.purchase_lines USING btree (purchase_id)
CREATE UNIQUE INDEX purchase_lines_id_purchase_id_key ON escen.purchase_lines USING btree (id, purchase_id)
CREATE UNIQUE INDEX purchase_lines_pkey ON escen.purchase_lines USING btree (id)
```

## escen.purchase_receipts

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| purchase_id | uuid | NO | — | NEVER |
| line_id | uuid | NO | — | NEVER |
| quantity | numeric | NO | — | NEVER |
| received_by | uuid | NO | — | NEVER |
| received_at | timestamptz | NO | now() | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |

Contraintes :

```sql
purchase_receipts_id_not_null: NOT NULL id
purchase_receipts_line_id_not_null: NOT NULL line_id
purchase_receipts_line_id_purchase_id_fkey: FOREIGN KEY (line_id, purchase_id) REFERENCES escen.purchase_lines(id, purchase_id) ON DELETE RESTRICT
purchase_receipts_pkey: PRIMARY KEY (id)
purchase_receipts_purchase_id_not_null: NOT NULL purchase_id
purchase_receipts_quantity_check: CHECK ((quantity > (0)::numeric))
purchase_receipts_quantity_not_null: NOT NULL quantity
purchase_receipts_reason_not_null: NOT NULL reason
purchase_receipts_received_at_not_null: NOT NULL received_at
purchase_receipts_received_by_fkey: FOREIGN KEY (received_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
purchase_receipts_received_by_not_null: NOT NULL received_by
```

Index :

```sql
CREATE INDEX fk_19184 ON escen.purchase_receipts USING btree (received_by)
CREATE INDEX fk_19189 ON escen.purchase_receipts USING btree (line_id, purchase_id)
CREATE UNIQUE INDEX purchase_receipts_pkey ON escen.purchase_receipts USING btree (id)
```

## escen.purchases

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| site_id | uuid | NO | — | NEVER |
| supplier_id | uuid | YES | — | NEVER |
| reference | escen.nonempty_text | NO | — | NEVER |
| requested_by | uuid | NO | — | NEVER |
| status | text | NO | 'DEMANDE'::text | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| created_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
purchases_created_at_not_null: NOT NULL created_at
purchases_id_not_null: NOT NULL id
purchases_pkey: PRIMARY KEY (id)
purchases_reason_not_null: NOT NULL reason
purchases_reference_key: UNIQUE (reference)
purchases_reference_not_null: NOT NULL reference
purchases_requested_by_fkey: FOREIGN KEY (requested_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
purchases_requested_by_not_null: NOT NULL requested_by
purchases_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
purchases_site_id_not_null: NOT NULL site_id
purchases_status_check: CHECK ((status = ANY (ARRAY['DEMANDE'::text, 'APPROUVE'::text, 'REFUSE'::text, 'RECEPTION_PARTIELLE'::text, 'RECU'::text])))
purchases_status_not_null: NOT NULL status
purchases_supplier_id_fkey: FOREIGN KEY (supplier_id) REFERENCES escen.suppliers(id) ON DELETE RESTRICT
```

Index :

```sql
CREATE INDEX fk_19131 ON escen.purchases USING btree (site_id)
CREATE INDEX fk_19136 ON escen.purchases USING btree (supplier_id)
CREATE INDEX fk_19141 ON escen.purchases USING btree (requested_by)
CREATE UNIQUE INDEX purchases_pkey ON escen.purchases USING btree (id)
CREATE UNIQUE INDEX purchases_reference_key ON escen.purchases USING btree (reference)
```

## escen.receipts

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| payment_id | uuid | NO | — | NEVER |
| reference | escen.nonempty_text | NO | — | NEVER |
| snapshot | jsonb | NO | — | NEVER |
| issued_by | uuid | NO | — | NEVER |
| issued_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
receipts_id_not_null: NOT NULL id
receipts_issued_at_not_null: NOT NULL issued_at
receipts_issued_by_fkey: FOREIGN KEY (issued_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
receipts_issued_by_not_null: NOT NULL issued_by
receipts_payment_id_fkey: FOREIGN KEY (payment_id) REFERENCES escen.payments(id) ON DELETE RESTRICT
receipts_payment_id_key: UNIQUE (payment_id)
receipts_payment_id_not_null: NOT NULL payment_id
receipts_pkey: PRIMARY KEY (id)
receipts_reference_key: UNIQUE (reference)
receipts_reference_not_null: NOT NULL reference
receipts_snapshot_not_null: NOT NULL snapshot
```

Index :

```sql
CREATE INDEX fk_18582 ON escen.receipts USING btree (payment_id)
CREATE INDEX fk_18587 ON escen.receipts USING btree (issued_by)
CREATE UNIQUE INDEX receipts_payment_id_key ON escen.receipts USING btree (payment_id)
CREATE UNIQUE INDEX receipts_pkey ON escen.receipts USING btree (id)
CREATE UNIQUE INDEX receipts_reference_key ON escen.receipts USING btree (reference)
```

## escen.refunds

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| payment_id | uuid | NO | — | NEVER |
| amount | escen.xof_amount | NO | — | NEVER |
| reference | escen.nonempty_text | NO | — | NEVER |
| actor_id | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| refunded_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
refunds_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
refunds_actor_id_not_null: NOT NULL actor_id
refunds_amount_check: CHECK (((amount)::numeric > (0)::numeric))
refunds_amount_not_null: NOT NULL amount
refunds_id_not_null: NOT NULL id
refunds_payment_id_fkey: FOREIGN KEY (payment_id) REFERENCES escen.payments(id) ON DELETE RESTRICT
refunds_payment_id_not_null: NOT NULL payment_id
refunds_pkey: PRIMARY KEY (id)
refunds_reason_not_null: NOT NULL reason
refunds_reference_key: UNIQUE (reference)
refunds_reference_not_null: NOT NULL reference
refunds_refunded_at_not_null: NOT NULL refunded_at
```

Index :

```sql
CREATE INDEX fk_18686 ON escen.refunds USING btree (payment_id)
CREATE INDEX fk_18691 ON escen.refunds USING btree (actor_id)
CREATE UNIQUE INDEX refunds_pkey ON escen.refunds USING btree (id)
CREATE UNIQUE INDEX refunds_reference_key ON escen.refunds USING btree (reference)
```

## escen.role_grants

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| account_id | uuid | NO | — | NEVER |
| role_id | uuid | NO | — | NEVER |
| site_id | uuid | YES | — | NEVER |
| academic_year_id | uuid | YES | — | NEVER |
| group_id | uuid | YES | — | NEVER |
| granted_by | uuid | YES | — | NEVER |
| valid_from | timestamptz | NO | — | NEVER |
| valid_until | timestamptz | YES | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| legacy_source_row_id | uuid | YES | — | NEVER |

Contraintes :

```sql
role_grant_actor_provenance_check: CHECK ((((granted_by IS NOT NULL) AND (legacy_source_row_id IS NULL)) OR ((granted_by IS NULL) AND (legacy_source_row_id IS NOT NULL))))
role_grants_academic_year_id_fkey: FOREIGN KEY (academic_year_id) REFERENCES escen.academic_years(id) ON DELETE RESTRICT
role_grants_account_id_fkey: FOREIGN KEY (account_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
role_grants_account_id_not_null: NOT NULL account_id
role_grants_account_id_role_id_site_id_academic_year_id_gro_key: UNIQUE NULLS NOT DISTINCT (account_id, role_id, site_id, academic_year_id, group_id, valid_from)
role_grants_check: CHECK (((valid_until IS NULL) OR (valid_until > valid_from)))
role_grants_granted_by_fkey: FOREIGN KEY (granted_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
role_grants_group_id_fkey: FOREIGN KEY (group_id) REFERENCES escen.groups(id) ON DELETE RESTRICT
role_grants_id_not_null: NOT NULL id
role_grants_legacy_source_row_id_fkey: FOREIGN KEY (legacy_source_row_id) REFERENCES escen_private.legacy_rows(id) ON DELETE RESTRICT
role_grants_legacy_source_row_id_key: UNIQUE (legacy_source_row_id)
role_grants_pkey: PRIMARY KEY (id)
role_grants_reason_not_null: NOT NULL reason
role_grants_role_id_fkey: FOREIGN KEY (role_id) REFERENCES escen.roles(id) ON DELETE RESTRICT
role_grants_role_id_not_null: NOT NULL role_id
role_grants_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
role_grants_valid_from_not_null: NOT NULL valid_from
```

Index :

```sql
CREATE INDEX fk_17331 ON escen.role_grants USING btree (account_id)
CREATE INDEX fk_17336 ON escen.role_grants USING btree (role_id)
CREATE INDEX fk_17341 ON escen.role_grants USING btree (site_id)
CREATE INDEX fk_17346 ON escen.role_grants USING btree (academic_year_id)
CREATE INDEX fk_17351 ON escen.role_grants USING btree (group_id)
CREATE INDEX fk_17356 ON escen.role_grants USING btree (granted_by)
CREATE UNIQUE INDEX role_grants_account_id_role_id_site_id_academic_year_id_gro_key ON escen.role_grants USING btree (account_id, role_id, site_id, academic_year_id, group_id, valid_from) NULLS NOT DISTINCT
CREATE UNIQUE INDEX role_grants_legacy_source_row_id_key ON escen.role_grants USING btree (legacy_source_row_id)
CREATE UNIQUE INDEX role_grants_pkey ON escen.role_grants USING btree (id)
```

## escen.role_permissions

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| role_id | uuid | NO | — | NEVER |
| permission_id | uuid | NO | — | NEVER |

Contraintes :

```sql
role_permissions_id_not_null: NOT NULL id
role_permissions_permission_id_fkey: FOREIGN KEY (permission_id) REFERENCES escen.permissions(id) ON DELETE RESTRICT
role_permissions_permission_id_not_null: NOT NULL permission_id
role_permissions_pkey: PRIMARY KEY (id)
role_permissions_role_id_fkey: FOREIGN KEY (role_id) REFERENCES escen.roles(id) ON DELETE RESTRICT
role_permissions_role_id_not_null: NOT NULL role_id
role_permissions_role_id_permission_id_key: UNIQUE (role_id, permission_id)
```

Index :

```sql
CREATE INDEX fk_16615 ON escen.role_permissions USING btree (role_id)
CREATE INDEX fk_16620 ON escen.role_permissions USING btree (permission_id)
CREATE UNIQUE INDEX role_permissions_pkey ON escen.role_permissions USING btree (id)
CREATE UNIQUE INDEX role_permissions_role_id_permission_id_key ON escen.role_permissions USING btree (role_id, permission_id)
```

## escen.roles

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| active | bool | NO | true | NEVER |

Contraintes :

```sql
roles_active_not_null: NOT NULL active
roles_code_key: UNIQUE (code)
roles_code_not_null: NOT NULL code
roles_id_not_null: NOT NULL id
roles_name_not_null: NOT NULL name
roles_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX roles_code_key ON escen.roles USING btree (code)
CREATE UNIQUE INDEX roles_pkey ON escen.roles USING btree (id)
```

## escen.rooms

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| building_id | uuid | NO | — | NEVER |
| site_id | uuid | NO | — | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| capacity | int4 | NO | — | NEVER |
| status | text | NO | 'AVAILABLE'::text | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
rooms_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
rooms_building_id_not_null: NOT NULL building_id
rooms_building_id_site_id_fkey: FOREIGN KEY (building_id, site_id) REFERENCES escen.buildings(id, site_id) ON DELETE RESTRICT
rooms_capacity_check: CHECK ((capacity > 0))
rooms_capacity_not_null: NOT NULL capacity
rooms_code_not_null: NOT NULL code
rooms_id_not_null: NOT NULL id
rooms_id_site_id_key: UNIQUE (id, site_id)
rooms_name_not_null: NOT NULL name
rooms_pkey: PRIMARY KEY (id)
rooms_site_id_code_key: UNIQUE (site_id, code)
rooms_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
rooms_site_id_not_null: NOT NULL site_id
rooms_status_check: CHECK ((status = ANY (ARRAY['AVAILABLE'::text, 'MAINTENANCE'::text, 'UNAVAILABLE'::text])))
rooms_status_not_null: NOT NULL status
```

Index :

```sql
CREATE INDEX fk_16683 ON escen.rooms USING btree (site_id)
CREATE INDEX fk_16688 ON escen.rooms USING btree (building_id, site_id)
CREATE UNIQUE INDEX rooms_id_site_id_key ON escen.rooms USING btree (id, site_id)
CREATE UNIQUE INDEX rooms_pkey ON escen.rooms USING btree (id)
CREATE UNIQUE INDEX rooms_site_id_code_key ON escen.rooms USING btree (site_id, code)
```

## escen.schedule_series

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| assignment_id | uuid | NO | — | NEVER |
| recurrence_rule | text | YES | — | NEVER |
| timezone | text | NO | 'Africa/Lome'::text | NEVER |
| valid_from | date | NO | — | NEVER |
| valid_until | date | YES | — | NEVER |

Contraintes :

```sql
schedule_series_assignment_id_fkey: FOREIGN KEY (assignment_id) REFERENCES escen.teaching_assignments(id) ON DELETE RESTRICT
schedule_series_assignment_id_not_null: NOT NULL assignment_id
schedule_series_check: CHECK (((valid_until IS NULL) OR (valid_until >= valid_from)))
schedule_series_id_not_null: NOT NULL id
schedule_series_pkey: PRIMARY KEY (id)
schedule_series_timezone_not_null: NOT NULL timezone
schedule_series_valid_from_not_null: NOT NULL valid_from
```

Index :

```sql
CREATE INDEX fk_17427 ON escen.schedule_series USING btree (assignment_id)
CREATE UNIQUE INDEX schedule_series_pkey ON escen.schedule_series USING btree (id)
```

## escen.scholarship_awards

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| scholarship_id | uuid | NO | — | NEVER |
| enrollment_id | uuid | NO | — | NEVER |
| valid_from | date | NO | — | NEVER |
| valid_until | date | YES | — | NEVER |
| terms_snapshot | jsonb | NO | — | NEVER |
| granted_by | uuid | NO | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| revoked_at | timestamptz | YES | — | NEVER |
| revocation_reason | text | YES | — | NEVER |

Contraintes :

```sql
scholarship_awards_check: CHECK (((valid_until IS NULL) OR (valid_until > valid_from)))
scholarship_awards_check1: CHECK (((revoked_at IS NULL) OR ((revocation_reason IS NOT NULL) AND (length(btrim(revocation_reason)) > 0))))
scholarship_awards_enrollment_id_fkey: FOREIGN KEY (enrollment_id) REFERENCES escen.enrollments(id) ON DELETE RESTRICT
scholarship_awards_enrollment_id_not_null: NOT NULL enrollment_id
scholarship_awards_granted_by_fkey: FOREIGN KEY (granted_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
scholarship_awards_granted_by_not_null: NOT NULL granted_by
scholarship_awards_id_enrollment_id_key: UNIQUE (id, enrollment_id)
scholarship_awards_id_not_null: NOT NULL id
scholarship_awards_pkey: PRIMARY KEY (id)
scholarship_awards_reason_not_null: NOT NULL reason
scholarship_awards_scholarship_id_enrollment_id_valid_from_key: UNIQUE (scholarship_id, enrollment_id, valid_from)
scholarship_awards_scholarship_id_fkey: FOREIGN KEY (scholarship_id) REFERENCES escen.scholarships(id) ON DELETE RESTRICT
scholarship_awards_scholarship_id_not_null: NOT NULL scholarship_id
scholarship_awards_terms_snapshot_not_null: NOT NULL terms_snapshot
scholarship_awards_valid_from_not_null: NOT NULL valid_from
```

Index :

```sql
CREATE INDEX fk_18333 ON escen.scholarship_awards USING btree (scholarship_id)
CREATE INDEX fk_18338 ON escen.scholarship_awards USING btree (enrollment_id)
CREATE INDEX fk_18343 ON escen.scholarship_awards USING btree (granted_by)
CREATE UNIQUE INDEX scholarship_awards_id_enrollment_id_key ON escen.scholarship_awards USING btree (id, enrollment_id)
CREATE UNIQUE INDEX scholarship_awards_pkey ON escen.scholarship_awards USING btree (id)
CREATE UNIQUE INDEX scholarship_awards_scholarship_id_enrollment_id_valid_from_key ON escen.scholarship_awards USING btree (scholarship_id, enrollment_id, valid_from)
```

## escen.scholarships

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| kind | text | NO | — | NEVER |
| percent | numeric | YES | — | NEVER |
| amount | escen.xof_amount | YES | — | NEVER |
| active | bool | NO | true | NEVER |

Contraintes :

```sql
scholarships_active_not_null: NOT NULL active
scholarships_check: CHECK ((((kind = 'POURCENTAGE'::text) AND (percent IS NOT NULL) AND (amount IS NULL)) OR ((kind = 'MONTANT_FIXE'::text) AND (amount IS NOT NULL) AND ((amount)::numeric > (0)::numeric) AND (percent IS NULL))))
scholarships_code_key: UNIQUE (code)
scholarships_code_not_null: NOT NULL code
scholarships_id_not_null: NOT NULL id
scholarships_kind_check: CHECK ((kind = ANY (ARRAY['POURCENTAGE'::text, 'MONTANT_FIXE'::text])))
scholarships_kind_not_null: NOT NULL kind
scholarships_name_not_null: NOT NULL name
scholarships_percent_check: CHECK (((percent > (0)::numeric) AND (percent <= (100)::numeric)))
scholarships_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX scholarships_code_key ON escen.scholarships USING btree (code)
CREATE UNIQUE INDEX scholarships_pkey ON escen.scholarships USING btree (id)
```

## escen.session_supervisors

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| session_id | uuid | NO | — | NEVER |
| account_id | uuid | NO | — | NEVER |

Contraintes :

```sql
session_supervisors_account_id_fkey: FOREIGN KEY (account_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
session_supervisors_account_id_not_null: NOT NULL account_id
session_supervisors_id_not_null: NOT NULL id
session_supervisors_pkey: PRIMARY KEY (id)
session_supervisors_session_id_account_id_key: UNIQUE (session_id, account_id)
session_supervisors_session_id_fkey: FOREIGN KEY (session_id) REFERENCES escen.sessions(id) ON DELETE RESTRICT
session_supervisors_session_id_not_null: NOT NULL session_id
```

Index :

```sql
CREATE INDEX fk_17498 ON escen.session_supervisors USING btree (session_id)
CREATE INDEX fk_17503 ON escen.session_supervisors USING btree (account_id)
CREATE UNIQUE INDEX session_supervisors_pkey ON escen.session_supervisors USING btree (id)
CREATE UNIQUE INDEX session_supervisors_session_id_account_id_key ON escen.session_supervisors USING btree (session_id, account_id)
```

## escen.sessions

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| series_id | uuid | YES | — | NEVER |
| assignment_id | uuid | NO | — | NEVER |
| offering_id | uuid | NO | — | NEVER |
| group_id | uuid | NO | — | NEVER |
| teacher_id | uuid | NO | — | NEVER |
| room_id | uuid | YES | — | NEVER |
| starts_at | timestamptz | NO | — | NEVER |
| ends_at | timestamptz | NO | — | NEVER |
| mode | text | NO | — | NEVER |
| status | text | NO | 'PLANIFIE'::text | NEVER |
| actual_starts_at | timestamptz | YES | — | NEVER |
| actual_ends_at | timestamptz | YES | — | NEVER |
| replacement_teacher_id | uuid | YES | — | NEVER |
| actual_room_id | uuid | YES | — | NEVER |
| reason | text | YES | — | NEVER |
| effective_teacher_id | uuid | YES | — | ALWAYS |
| effective_room_id | uuid | YES | — | ALWAYS |

Contraintes :

```sql
session_group_conflict: EXCLUDE USING gist (group_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE ((status <> ALL (ARRAY['ANNULE'::text, 'REPORTE'::text])))
session_room_conflict: EXCLUDE USING gist (effective_room_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE ((status <> ALL (ARRAY['ANNULE'::text, 'REPORTE'::text])))
session_teacher_conflict: EXCLUDE USING gist (effective_teacher_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE ((status <> ALL (ARRAY['ANNULE'::text, 'REPORTE'::text])))
sessions_actual_room_id_fkey: FOREIGN KEY (actual_room_id) REFERENCES escen.rooms(id) ON DELETE RESTRICT
sessions_assignment_id_not_null: NOT NULL assignment_id
sessions_assignment_id_offering_id_group_id_teacher_id_fkey: FOREIGN KEY (assignment_id, offering_id, group_id, teacher_id) REFERENCES escen.teaching_assignments(id, offering_id, group_id, teacher_id) ON DELETE RESTRICT
sessions_check: CHECK ((ends_at > starts_at))
sessions_check1: CHECK (((actual_ends_at IS NULL) OR ((actual_starts_at IS NOT NULL) AND (actual_ends_at > actual_starts_at))))
sessions_check2: CHECK ((((mode = 'EN_LIGNE'::text) AND (room_id IS NULL)) OR ((mode <> 'EN_LIGNE'::text) AND (room_id IS NOT NULL))))
sessions_check3: CHECK (((status <> ALL (ARRAY['ANNULE'::text, 'REPORTE'::text])) OR ((reason IS NOT NULL) AND (length(btrim(reason)) > 0))))
sessions_ends_at_not_null: NOT NULL ends_at
sessions_group_id_not_null: NOT NULL group_id
sessions_id_assignment_id_key: UNIQUE (id, assignment_id)
sessions_id_not_null: NOT NULL id
sessions_id_offering_id_key: UNIQUE (id, offering_id)
sessions_mode_check: CHECK ((mode = ANY (ARRAY['PAPIER'::text, 'EN_LIGNE'::text, 'COURS'::text])))
sessions_mode_not_null: NOT NULL mode
sessions_offering_id_not_null: NOT NULL offering_id
sessions_pkey: PRIMARY KEY (id)
sessions_replacement_teacher_id_fkey: FOREIGN KEY (replacement_teacher_id) REFERENCES escen.teachers(id) ON DELETE RESTRICT
sessions_room_id_fkey: FOREIGN KEY (room_id) REFERENCES escen.rooms(id) ON DELETE RESTRICT
sessions_series_id_fkey: FOREIGN KEY (series_id) REFERENCES escen.schedule_series(id) ON DELETE RESTRICT
sessions_series_id_starts_at_key: UNIQUE (series_id, starts_at)
sessions_starts_at_not_null: NOT NULL starts_at
sessions_status_check: CHECK ((status = ANY (ARRAY['PLANIFIE'::text, 'EN_COURS'::text, 'TERMINE'::text, 'ANNULE'::text, 'REPORTE'::text])))
sessions_status_not_null: NOT NULL status
sessions_teacher_id_not_null: NOT NULL teacher_id
```

Index :

```sql
CREATE INDEX fk_17462 ON escen.sessions USING btree (series_id)
CREATE INDEX fk_17467 ON escen.sessions USING btree (room_id)
CREATE INDEX fk_17472 ON escen.sessions USING btree (replacement_teacher_id)
CREATE INDEX fk_17477 ON escen.sessions USING btree (actual_room_id)
CREATE INDEX fk_17482 ON escen.sessions USING btree (assignment_id, offering_id, group_id, teacher_id)
CREATE INDEX session_group_conflict ON escen.sessions USING gist (group_id, tstzrange(starts_at, ends_at, '[)'::text)) WHERE (status <> ALL (ARRAY['ANNULE'::text, 'REPORTE'::text]))
CREATE INDEX session_room_conflict ON escen.sessions USING gist (effective_room_id, tstzrange(starts_at, ends_at, '[)'::text)) WHERE (status <> ALL (ARRAY['ANNULE'::text, 'REPORTE'::text]))
CREATE INDEX session_teacher_conflict ON escen.sessions USING gist (effective_teacher_id, tstzrange(starts_at, ends_at, '[)'::text)) WHERE (status <> ALL (ARRAY['ANNULE'::text, 'REPORTE'::text]))
CREATE UNIQUE INDEX sessions_id_assignment_id_key ON escen.sessions USING btree (id, assignment_id)
CREATE UNIQUE INDEX sessions_id_offering_id_key ON escen.sessions USING btree (id, offering_id)
CREATE UNIQUE INDEX sessions_pkey ON escen.sessions USING btree (id)
CREATE UNIQUE INDEX sessions_series_id_starts_at_key ON escen.sessions USING btree (series_id, starts_at)
```

## escen.sites

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| address | text | YES | — | NEVER |
| active | bool | NO | true | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
sites_active_not_null: NOT NULL active
sites_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
sites_code_key: UNIQUE (code)
sites_code_not_null: NOT NULL code
sites_id_not_null: NOT NULL id
sites_name_not_null: NOT NULL name
sites_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX sites_code_key ON escen.sites USING btree (code)
CREATE UNIQUE INDEX sites_pkey ON escen.sites USING btree (id)
```

## escen.staff

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| person_id | uuid | NO | — | NEVER |
| employee_number | escen.nonempty_text | NO | — | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
staff_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
staff_employee_number_key: UNIQUE (employee_number)
staff_employee_number_not_null: NOT NULL employee_number
staff_id_not_null: NOT NULL id
staff_person_id_fkey: FOREIGN KEY (person_id) REFERENCES escen.people(id) ON DELETE RESTRICT
staff_person_id_key: UNIQUE (person_id)
staff_person_id_not_null: NOT NULL person_id
staff_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE INDEX fk_17224 ON escen.staff USING btree (person_id)
CREATE UNIQUE INDEX staff_employee_number_key ON escen.staff USING btree (employee_number)
CREATE UNIQUE INDEX staff_person_id_key ON escen.staff USING btree (person_id)
CREATE UNIQUE INDEX staff_pkey ON escen.staff USING btree (id)
```

## escen.staff_contracts

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| staff_id | uuid | NO | — | NEVER |
| site_id | uuid | NO | — | NEVER |
| contract_type | text | NO | — | NEVER |
| position | escen.nonempty_text | NO | — | NEVER |
| starts_on | date | NO | — | NEVER |
| ends_on | date | YES | — | NEVER |

Contraintes :

```sql
staff_contracts_check: CHECK (((ends_on IS NULL) OR (ends_on >= starts_on)))
staff_contracts_contract_type_check: CHECK ((contract_type = ANY (ARRAY['PERMANENT'::text, 'VACATAIRE'::text, 'STAGIAIRE'::text])))
staff_contracts_contract_type_not_null: NOT NULL contract_type
staff_contracts_id_not_null: NOT NULL id
staff_contracts_pkey: PRIMARY KEY (id)
staff_contracts_position_not_null: NOT NULL "position"
staff_contracts_site_id_fkey: FOREIGN KEY (site_id) REFERENCES escen.sites(id) ON DELETE RESTRICT
staff_contracts_site_id_not_null: NOT NULL site_id
staff_contracts_staff_id_fkey: FOREIGN KEY (staff_id) REFERENCES escen.staff(id) ON DELETE RESTRICT
staff_contracts_staff_id_not_null: NOT NULL staff_id
staff_contracts_starts_on_not_null: NOT NULL starts_on
```

Index :

```sql
CREATE INDEX fk_17245 ON escen.staff_contracts USING btree (staff_id)
CREATE INDEX fk_17250 ON escen.staff_contracts USING btree (site_id)
CREATE UNIQUE INDEX staff_contracts_pkey ON escen.staff_contracts USING btree (id)
```

## escen.student_contacts

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| student_id | uuid | NO | — | NEVER |
| person_id | uuid | NO | — | NEVER |
| relationship | escen.nonempty_text | NO | — | NEVER |
| financial_responsibility | bool | NO | false | NEVER |
| emergency_contact | bool | NO | false | NEVER |
| valid_from | date | NO | — | NEVER |
| valid_until | date | YES | — | NEVER |

Contraintes :

```sql
student_contacts_check: CHECK (((valid_until IS NULL) OR (valid_until > valid_from)))
student_contacts_emergency_contact_not_null: NOT NULL emergency_contact
student_contacts_financial_responsibility_not_null: NOT NULL financial_responsibility
student_contacts_id_not_null: NOT NULL id
student_contacts_person_id_fkey: FOREIGN KEY (person_id) REFERENCES escen.people(id) ON DELETE RESTRICT
student_contacts_person_id_not_null: NOT NULL person_id
student_contacts_pkey: PRIMARY KEY (id)
student_contacts_relationship_not_null: NOT NULL relationship
student_contacts_student_id_fkey: FOREIGN KEY (student_id) REFERENCES escen.students(id) ON DELETE RESTRICT
student_contacts_student_id_not_null: NOT NULL student_id
student_contacts_student_id_person_id_valid_from_key: UNIQUE (student_id, person_id, valid_from)
student_contacts_valid_from_not_null: NOT NULL valid_from
```

Index :

```sql
CREATE INDEX fk_17199 ON escen.student_contacts USING btree (student_id)
CREATE INDEX fk_17204 ON escen.student_contacts USING btree (person_id)
CREATE UNIQUE INDEX student_contacts_pkey ON escen.student_contacts USING btree (id)
CREATE UNIQUE INDEX student_contacts_student_id_person_id_valid_from_key ON escen.student_contacts USING btree (student_id, person_id, valid_from)
```

## escen.student_documents

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| student_id | uuid | NO | — | NEVER |
| enrollment_id | uuid | YES | — | NEVER |
| document_type_id | uuid | NO | — | NEVER |
| file_id | uuid | NO | — | NEVER |
| supersedes_id | uuid | YES | — | NEVER |
| version | int4 | NO | — | NEVER |
| status | text | NO | 'A_VERIFIER'::text | NEVER |

Contraintes :

```sql
student_documents_document_type_id_fkey: FOREIGN KEY (document_type_id) REFERENCES escen.document_types(id) ON DELETE RESTRICT
student_documents_document_type_id_not_null: NOT NULL document_type_id
student_documents_enrollment_id_student_id_fkey: FOREIGN KEY (enrollment_id, student_id) REFERENCES escen.enrollments(id, student_id) ON DELETE RESTRICT
student_documents_file_id_fkey: FOREIGN KEY (file_id) REFERENCES escen.file_objects(id) ON DELETE RESTRICT
student_documents_file_id_not_null: NOT NULL file_id
student_documents_id_not_null: NOT NULL id
student_documents_pkey: PRIMARY KEY (id)
student_documents_status_check: CHECK ((status = ANY (ARRAY['A_VERIFIER'::text, 'CONFORME'::text, 'NON_CONFORME'::text])))
student_documents_status_not_null: NOT NULL status
student_documents_student_id_fkey: FOREIGN KEY (student_id) REFERENCES escen.students(id) ON DELETE RESTRICT
student_documents_student_id_not_null: NOT NULL student_id
student_documents_supersedes_id_fkey: FOREIGN KEY (supersedes_id) REFERENCES escen.student_documents(id) ON DELETE RESTRICT
student_documents_version_check: CHECK ((version > 0))
student_documents_version_not_null: NOT NULL version
```

Index :

```sql
CREATE INDEX fk_18806 ON escen.student_documents USING btree (student_id)
CREATE INDEX fk_18811 ON escen.student_documents USING btree (document_type_id)
CREATE INDEX fk_18816 ON escen.student_documents USING btree (file_id)
CREATE INDEX fk_18821 ON escen.student_documents USING btree (supersedes_id)
CREATE INDEX fk_18826 ON escen.student_documents USING btree (enrollment_id, student_id)
CREATE UNIQUE INDEX student_documents_pkey ON escen.student_documents USING btree (id)
```

## escen.students

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| person_id | uuid | NO | — | NEVER |
| matricule | escen.nonempty_text | NO | — | NEVER |
| admitted_on | date | YES | — | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| created_at | timestamptz | NO | now() | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
student_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
students_created_at_not_null: NOT NULL created_at
students_id_not_null: NOT NULL id
students_matricule_key: UNIQUE (matricule)
students_matricule_not_null: NOT NULL matricule
students_person_id_fkey: FOREIGN KEY (person_id) REFERENCES escen.people(id) ON DELETE RESTRICT
students_person_id_key: UNIQUE (person_id)
students_person_id_not_null: NOT NULL person_id
students_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE INDEX fk_17079 ON escen.students USING btree (person_id)
CREATE UNIQUE INDEX students_matricule_key ON escen.students USING btree (matricule)
CREATE UNIQUE INDEX students_person_id_key ON escen.students USING btree (person_id)
CREATE UNIQUE INDEX students_pkey ON escen.students USING btree (id)
```

## escen.subjects

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| active | bool | NO | true | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
subjects_active_not_null: NOT NULL active
subjects_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
subjects_code_key: UNIQUE (code)
subjects_code_not_null: NOT NULL code
subjects_id_not_null: NOT NULL id
subjects_name_not_null: NOT NULL name
subjects_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX subjects_code_key ON escen.subjects USING btree (code)
CREATE UNIQUE INDEX subjects_pkey ON escen.subjects USING btree (id)
```

## escen.suppliers

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| tax_identifier | text | YES | — | NEVER |
| email | text | YES | — | NEVER |
| phone | text | YES | — | NEVER |
| active | bool | NO | true | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
suppliers_active_not_null: NOT NULL active
suppliers_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
suppliers_id_not_null: NOT NULL id
suppliers_name_not_null: NOT NULL name
suppliers_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX suppliers_pkey ON escen.suppliers USING btree (id)
```

## escen.support_categories

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| active | bool | NO | true | NEVER |

Contraintes :

```sql
support_categories_active_not_null: NOT NULL active
support_categories_code_key: UNIQUE (code)
support_categories_code_not_null: NOT NULL code
support_categories_id_not_null: NOT NULL id
support_categories_name_not_null: NOT NULL name
support_categories_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE UNIQUE INDEX support_categories_code_key ON escen.support_categories USING btree (code)
CREATE UNIQUE INDEX support_categories_pkey ON escen.support_categories USING btree (id)
```

## escen.support_files

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| message_id | uuid | NO | — | NEVER |
| file_id | uuid | NO | — | NEVER |

Contraintes :

```sql
support_files_file_id_fkey: FOREIGN KEY (file_id) REFERENCES escen.file_objects(id) ON DELETE RESTRICT
support_files_file_id_not_null: NOT NULL file_id
support_files_id_not_null: NOT NULL id
support_files_message_id_file_id_key: UNIQUE (message_id, file_id)
support_files_message_id_fkey: FOREIGN KEY (message_id) REFERENCES escen.support_messages(id) ON DELETE RESTRICT
support_files_message_id_not_null: NOT NULL message_id
support_files_pkey: PRIMARY KEY (id)
```

Index :

```sql
CREATE INDEX fk_19089 ON escen.support_files USING btree (message_id)
CREATE INDEX fk_19094 ON escen.support_files USING btree (file_id)
CREATE UNIQUE INDEX support_files_message_id_file_id_key ON escen.support_files USING btree (message_id, file_id)
CREATE UNIQUE INDEX support_files_pkey ON escen.support_files USING btree (id)
```

## escen.support_messages

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| ticket_id | uuid | NO | — | NEVER |
| author_id | uuid | NO | — | NEVER |
| body | escen.nonempty_text | NO | — | NEVER |
| created_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
support_messages_author_id_fkey: FOREIGN KEY (author_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
support_messages_author_id_not_null: NOT NULL author_id
support_messages_body_not_null: NOT NULL body
support_messages_created_at_not_null: NOT NULL created_at
support_messages_id_not_null: NOT NULL id
support_messages_pkey: PRIMARY KEY (id)
support_messages_ticket_id_fkey: FOREIGN KEY (ticket_id) REFERENCES escen.support_tickets(id) ON DELETE RESTRICT
support_messages_ticket_id_not_null: NOT NULL ticket_id
```

Index :

```sql
CREATE INDEX fk_19068 ON escen.support_messages USING btree (ticket_id)
CREATE INDEX fk_19073 ON escen.support_messages USING btree (author_id)
CREATE UNIQUE INDEX support_messages_pkey ON escen.support_messages USING btree (id)
```

## escen.support_tickets

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| author_id | uuid | NO | — | NEVER |
| assigned_to | uuid | YES | — | NEVER |
| category_id | uuid | YES | — | NEVER |
| reference | escen.nonempty_text | NO | — | NEVER |
| title | escen.nonempty_text | NO | — | NEVER |
| description | text | YES | — | NEVER |
| status | text | NO | 'OPEN'::text | NEVER |
| priority | text | NO | — | NEVER |
| created_at | timestamptz | NO | now() | NEVER |

Contraintes :

```sql
support_tickets_assigned_to_fkey: FOREIGN KEY (assigned_to) REFERENCES escen.accounts(id) ON DELETE RESTRICT
support_tickets_author_id_fkey: FOREIGN KEY (author_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
support_tickets_author_id_not_null: NOT NULL author_id
support_tickets_category_id_fkey: FOREIGN KEY (category_id) REFERENCES escen.support_categories(id) ON DELETE RESTRICT
support_tickets_created_at_not_null: NOT NULL created_at
support_tickets_id_not_null: NOT NULL id
support_tickets_pkey: PRIMARY KEY (id)
support_tickets_priority_check: CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])))
support_tickets_priority_not_null: NOT NULL priority
support_tickets_reference_key: UNIQUE (reference)
support_tickets_reference_not_null: NOT NULL reference
support_tickets_status_check: CHECK ((status = ANY (ARRAY['OPEN'::text, 'IN_PROGRESS'::text, 'WAITING'::text, 'RESOLVED'::text, 'CLOSED'::text])))
support_tickets_status_not_null: NOT NULL status
support_tickets_title_not_null: NOT NULL title
```

Index :

```sql
CREATE INDEX fk_19039 ON escen.support_tickets USING btree (author_id)
CREATE INDEX fk_19044 ON escen.support_tickets USING btree (assigned_to)
CREATE INDEX fk_19049 ON escen.support_tickets USING btree (category_id)
CREATE UNIQUE INDEX support_tickets_pkey ON escen.support_tickets USING btree (id)
CREATE UNIQUE INDEX support_tickets_reference_key ON escen.support_tickets USING btree (reference)
```

## escen.syllabuses

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| curriculum_id | uuid | NO | — | NEVER |
| component_id | uuid | NO | — | NEVER |
| version | int4 | NO | — | NEVER |
| description | text | YES | — | NEVER |
| objectives | text | YES | — | NEVER |
| competencies | text | YES | — | NEVER |
| course_plan | jsonb | YES | — | NEVER |
| resources | jsonb | YES | — | NEVER |
| approved_by | uuid | YES | — | NEVER |
| approved_at | timestamptz | YES | — | NEVER |

Contraintes :

```sql
syllabuses_approved_by_fkey: FOREIGN KEY (approved_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
syllabuses_check: CHECK (((approved_by IS NULL) = (approved_at IS NULL)))
syllabuses_component_id_curriculum_id_fkey: FOREIGN KEY (component_id, curriculum_id) REFERENCES escen.curriculum_components(id, curriculum_id) ON DELETE RESTRICT
syllabuses_component_id_not_null: NOT NULL component_id
syllabuses_component_id_version_key: UNIQUE (component_id, version)
syllabuses_curriculum_id_not_null: NOT NULL curriculum_id
syllabuses_id_not_null: NOT NULL id
syllabuses_pkey: PRIMARY KEY (id)
syllabuses_version_check: CHECK ((version > 0))
syllabuses_version_not_null: NOT NULL version
```

Index :

```sql
CREATE INDEX syllabus_component_fk ON escen.syllabuses USING btree (component_id, curriculum_id)
CREATE UNIQUE INDEX syllabuses_component_id_version_key ON escen.syllabuses USING btree (component_id, version)
CREATE UNIQUE INDEX syllabuses_pkey ON escen.syllabuses USING btree (id)
```

## escen.teacher_attendances

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| session_id | uuid | NO | — | NEVER |
| teacher_id | uuid | NO | — | NEVER |
| arrived_at | timestamptz | YES | — | NEVER |
| left_at | timestamptz | YES | — | NEVER |
| recorded_by | uuid | NO | — | NEVER |
| comment | text | YES | — | NEVER |

Contraintes :

```sql
teacher_attendances_check: CHECK (((left_at IS NULL) OR ((arrived_at IS NOT NULL) AND (left_at > arrived_at))))
teacher_attendances_id_not_null: NOT NULL id
teacher_attendances_pkey: PRIMARY KEY (id)
teacher_attendances_recorded_by_fkey: FOREIGN KEY (recorded_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
teacher_attendances_recorded_by_not_null: NOT NULL recorded_by
teacher_attendances_session_id_fkey: FOREIGN KEY (session_id) REFERENCES escen.sessions(id) ON DELETE RESTRICT
teacher_attendances_session_id_not_null: NOT NULL session_id
teacher_attendances_session_id_teacher_id_key: UNIQUE (session_id, teacher_id)
teacher_attendances_teacher_id_fkey: FOREIGN KEY (teacher_id) REFERENCES escen.teachers(id) ON DELETE RESTRICT
teacher_attendances_teacher_id_not_null: NOT NULL teacher_id
```

Index :

```sql
CREATE INDEX fk_17559 ON escen.teacher_attendances USING btree (session_id)
CREATE INDEX fk_17564 ON escen.teacher_attendances USING btree (teacher_id)
CREATE INDEX fk_17569 ON escen.teacher_attendances USING btree (recorded_by)
CREATE UNIQUE INDEX teacher_attendances_pkey ON escen.teacher_attendances USING btree (id)
CREATE UNIQUE INDEX teacher_attendances_session_id_teacher_id_key ON escen.teacher_attendances USING btree (session_id, teacher_id)
```

## escen.teachers

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| staff_id | uuid | NO | — | NEVER |
| specialty | text | YES | — | NEVER |
| active | bool | NO | true | NEVER |

Contraintes :

```sql
teachers_active_not_null: NOT NULL active
teachers_id_not_null: NOT NULL id
teachers_pkey: PRIMARY KEY (id)
teachers_staff_id_fkey: FOREIGN KEY (staff_id) REFERENCES escen.staff(id) ON DELETE RESTRICT
teachers_staff_id_key: UNIQUE (staff_id)
teachers_staff_id_not_null: NOT NULL staff_id
```

Index :

```sql
CREATE INDEX fk_17269 ON escen.teachers USING btree (staff_id)
CREATE UNIQUE INDEX teachers_pkey ON escen.teachers USING btree (id)
CREATE UNIQUE INDEX teachers_staff_id_key ON escen.teachers USING btree (staff_id)
```

## escen.teaching_assignments

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| teacher_id | uuid | NO | — | NEVER |
| offering_id | uuid | NO | — | NEVER |
| group_id | uuid | NO | — | NEVER |
| curriculum_id | uuid | NO | — | NEVER |
| component_id | uuid | NO | — | NEVER |
| valid_from | date | NO | — | NEVER |
| valid_until | date | YES | — | NEVER |

Contraintes :

```sql
teaching_assignments_check: CHECK (((valid_until IS NULL) OR (valid_until >= valid_from)))
teaching_assignments_component_id_curriculum_id_fkey: FOREIGN KEY (component_id, curriculum_id) REFERENCES escen.curriculum_components(id, curriculum_id) ON DELETE RESTRICT
teaching_assignments_component_id_not_null: NOT NULL component_id
teaching_assignments_curriculum_id_not_null: NOT NULL curriculum_id
teaching_assignments_group_id_not_null: NOT NULL group_id
teaching_assignments_group_id_offering_id_fkey: FOREIGN KEY (group_id, offering_id) REFERENCES escen.group_offerings(group_id, offering_id) ON DELETE RESTRICT
teaching_assignments_id_not_null: NOT NULL id
teaching_assignments_id_offering_id_component_id_key: UNIQUE (id, offering_id, component_id)
teaching_assignments_id_offering_id_group_id_teacher_id_key: UNIQUE (id, offering_id, group_id, teacher_id)
teaching_assignments_offering_id_curriculum_id_fkey: FOREIGN KEY (offering_id, curriculum_id) REFERENCES escen.academic_offerings(id, curriculum_id) ON DELETE RESTRICT
teaching_assignments_offering_id_not_null: NOT NULL offering_id
teaching_assignments_pkey: PRIMARY KEY (id)
teaching_assignments_teacher_id_fkey: FOREIGN KEY (teacher_id) REFERENCES escen.teachers(id) ON DELETE RESTRICT
teaching_assignments_teacher_id_group_id_offering_id_compon_key: UNIQUE (teacher_id, group_id, offering_id, component_id, valid_from)
teaching_assignments_teacher_id_not_null: NOT NULL teacher_id
teaching_assignments_valid_from_not_null: NOT NULL valid_from
```

Index :

```sql
CREATE INDEX fk_17294 ON escen.teaching_assignments USING btree (teacher_id)
CREATE INDEX fk_17299 ON escen.teaching_assignments USING btree (group_id, offering_id)
CREATE INDEX fk_17304 ON escen.teaching_assignments USING btree (offering_id, curriculum_id)
CREATE INDEX fk_17309 ON escen.teaching_assignments USING btree (component_id, curriculum_id)
CREATE UNIQUE INDEX teaching_assignments_id_offering_id_component_id_key ON escen.teaching_assignments USING btree (id, offering_id, component_id)
CREATE UNIQUE INDEX teaching_assignments_id_offering_id_group_id_teacher_id_key ON escen.teaching_assignments USING btree (id, offering_id, group_id, teacher_id)
CREATE UNIQUE INDEX teaching_assignments_pkey ON escen.teaching_assignments USING btree (id)
CREATE UNIQUE INDEX teaching_assignments_teacher_id_group_id_offering_id_compon_key ON escen.teaching_assignments USING btree (teacher_id, group_id, offering_id, component_id, valid_from)
```

## escen.teaching_units

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| semester_id | uuid | NO | — | NEVER |
| curriculum_id | uuid | NO | — | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| credits | numeric | NO | — | NEVER |

Contraintes :

```sql
teaching_units_code_not_null: NOT NULL code
teaching_units_credits_check: CHECK ((credits > (0)::numeric))
teaching_units_credits_not_null: NOT NULL credits
teaching_units_curriculum_id_not_null: NOT NULL curriculum_id
teaching_units_id_curriculum_id_key: UNIQUE (id, curriculum_id)
teaching_units_id_not_null: NOT NULL id
teaching_units_name_not_null: NOT NULL name
teaching_units_pkey: PRIMARY KEY (id)
teaching_units_semester_id_code_key: UNIQUE (semester_id, code)
teaching_units_semester_id_curriculum_id_fkey: FOREIGN KEY (semester_id, curriculum_id) REFERENCES escen.curriculum_semesters(id, curriculum_id) ON DELETE RESTRICT
teaching_units_semester_id_not_null: NOT NULL semester_id
```

Index :

```sql
CREATE INDEX fk_16885 ON escen.teaching_units USING btree (semester_id, curriculum_id)
CREATE UNIQUE INDEX teaching_units_id_curriculum_id_key ON escen.teaching_units USING btree (id, curriculum_id)
CREATE UNIQUE INDEX teaching_units_pkey ON escen.teaching_units USING btree (id)
CREATE UNIQUE INDEX teaching_units_semester_id_code_key ON escen.teaching_units USING btree (semester_id, code)
```

## escen.tracks

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| program_id | uuid | NO | — | NEVER |
| code | escen.nonempty_text | NO | — | NEVER |
| name | escen.nonempty_text | NO | — | NEVER |
| active | bool | NO | true | NEVER |
| archived_at | timestamptz | YES | — | NEVER |
| reason | text | YES | — | NEVER |

Contraintes :

```sql
tracks_active_not_null: NOT NULL active
tracks_archive_reason: CHECK (((archived_at IS NULL) OR ((reason IS NOT NULL) AND (length(btrim(reason)) >= 3))))
tracks_code_not_null: NOT NULL code
tracks_id_not_null: NOT NULL id
tracks_id_program_id_key: UNIQUE (id, program_id)
tracks_name_not_null: NOT NULL name
tracks_pkey: PRIMARY KEY (id)
tracks_program_id_code_key: UNIQUE (program_id, code)
tracks_program_id_fkey: FOREIGN KEY (program_id) REFERENCES escen.programs(id) ON DELETE RESTRICT
tracks_program_id_not_null: NOT NULL program_id
```

Index :

```sql
CREATE INDEX fk_16781 ON escen.tracks USING btree (program_id)
CREATE UNIQUE INDEX tracks_id_program_id_key ON escen.tracks USING btree (id, program_id)
CREATE UNIQUE INDEX tracks_pkey ON escen.tracks USING btree (id)
CREATE UNIQUE INDEX tracks_program_id_code_key ON escen.tracks USING btree (program_id, code)
```

## escen_private.archive_objects

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| batch_id | uuid | NO | — | NEVER |
| source_name | text | NO | — | NEVER |
| kind | text | NO | — | NEVER |
| bucket | text | NO | — | NEVER |
| object_path | text | NO | — | NEVER |
| byte_size | int8 | NO | — | NEVER |
| sha256 | text | NO | — | NEVER |
| storage_manifest | jsonb | YES | — | NEVER |
| uploaded_at | timestamptz | NO | now() | NEVER |
| database_actor | text | NO | SESSION_USER | NEVER |

Contraintes :

```sql
archive_objects_batch_id_fkey: FOREIGN KEY (batch_id) REFERENCES escen_private.import_batches(id) ON DELETE RESTRICT
archive_objects_batch_id_not_null: NOT NULL batch_id
archive_objects_bucket_not_null: NOT NULL bucket
archive_objects_bucket_object_path_key: UNIQUE (bucket, object_path)
archive_objects_byte_size_check: CHECK ((byte_size > 0))
archive_objects_byte_size_not_null: NOT NULL byte_size
archive_objects_database_actor_not_null: NOT NULL database_actor
archive_objects_id_not_null: NOT NULL id
archive_objects_kind_check: CHECK ((kind = ANY (ARRAY['BACKUP'::text, 'DOCUMENT'::text, 'CONFIGURATION'::text])))
archive_objects_kind_not_null: NOT NULL kind
archive_objects_object_path_not_null: NOT NULL object_path
archive_objects_pkey: PRIMARY KEY (id)
archive_objects_sha256_check: CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text))
archive_objects_sha256_not_null: NOT NULL sha256
archive_objects_source_name_not_null: NOT NULL source_name
archive_objects_uploaded_at_not_null: NOT NULL uploaded_at
```

Index :

```sql
CREATE INDEX archive_batch_fk ON escen_private.archive_objects USING btree (batch_id)
CREATE INDEX archive_document_source_lookup ON escen_private.archive_objects USING btree (batch_id, source_name) WHERE (kind = 'DOCUMENT'::text)
CREATE UNIQUE INDEX archive_objects_bucket_object_path_key ON escen_private.archive_objects USING btree (bucket, object_path)
CREATE UNIQUE INDEX archive_objects_pkey ON escen_private.archive_objects USING btree (id)
```

## escen_private.audit_events

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| table_schema | text | NO | — | NEVER |
| table_name | text | NO | — | NEVER |
| entity_id | uuid | NO | — | NEVER |
| action | text | NO | — | NEVER |
| actor_id | uuid | YES | — | NEVER |
| role_codes | _text | NO | '{}'::text[] | NEVER |
| database_actor | text | NO | — | NEVER |
| reason | text | YES | — | NEVER |
| old_value | jsonb | YES | — | NEVER |
| new_value | jsonb | NO | — | NEVER |
| happened_at | timestamptz | NO | clock_timestamp() | NEVER |
| transaction_id | int8 | NO | txid_current() | NEVER |

Contraintes :

```sql
audit_events_action_check: CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text])))
audit_events_action_not_null: NOT NULL action
audit_events_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
audit_events_database_actor_not_null: NOT NULL database_actor
audit_events_entity_id_not_null: NOT NULL entity_id
audit_events_happened_at_not_null: NOT NULL happened_at
audit_events_id_not_null: NOT NULL id
audit_events_new_value_not_null: NOT NULL new_value
audit_events_pkey: PRIMARY KEY (id)
audit_events_role_codes_not_null: NOT NULL role_codes
audit_events_table_name_not_null: NOT NULL table_name
audit_events_table_schema_not_null: NOT NULL table_schema
audit_events_transaction_id_not_null: NOT NULL transaction_id
```

Index :

```sql
CREATE UNIQUE INDEX audit_events_pkey ON escen_private.audit_events USING btree (id)
CREATE INDEX fk_20239 ON escen_private.audit_events USING btree (actor_id)
```

## escen_private.history_catalog

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| table_name | text | NO | — | NEVER |
| definition | jsonb | NO | — | NEVER |

Contraintes :

```sql
history_catalog_definition_not_null: NOT NULL definition
history_catalog_pkey: PRIMARY KEY (table_name)
history_catalog_table_name_not_null: NOT NULL table_name
```

Index :

```sql
CREATE UNIQUE INDEX history_catalog_pkey ON escen_private.history_catalog USING btree (table_name)
```

## escen_private.import_batches

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| source_name | text | NO | — | NEVER |
| archive_sha256 | text | NO | — | NEVER |
| sql_sha256 | text | NO | — | NEVER |
| imported_at | timestamptz | NO | now() | NEVER |
| source_rows | int4 | NO | — | NEVER |

Contraintes :

```sql
import_batches_archive_sha256_check: CHECK ((archive_sha256 ~ '^[a-f0-9]{64}$'::text))
import_batches_archive_sha256_key: UNIQUE (archive_sha256)
import_batches_archive_sha256_not_null: NOT NULL archive_sha256
import_batches_id_not_null: NOT NULL id
import_batches_imported_at_not_null: NOT NULL imported_at
import_batches_pkey: PRIMARY KEY (id)
import_batches_source_name_not_null: NOT NULL source_name
import_batches_source_rows_check: CHECK ((source_rows >= 0))
import_batches_source_rows_not_null: NOT NULL source_rows
import_batches_sql_sha256_check: CHECK ((sql_sha256 ~ '^[a-f0-9]{64}$'::text))
import_batches_sql_sha256_not_null: NOT NULL sql_sha256
```

Index :

```sql
CREATE UNIQUE INDEX import_batches_archive_sha256_key ON escen_private.import_batches USING btree (archive_sha256)
CREATE UNIQUE INDEX import_batches_pkey ON escen_private.import_batches USING btree (id)
```

## escen_private.import_issues

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| row_id | uuid | NO | — | NEVER |
| code | text | NO | — | NEVER |
| details | jsonb | NO | — | NEVER |
| resolved_at | timestamptz | YES | — | NEVER |
| resolved_by | uuid | YES | — | NEVER |
| resolution_reason | text | YES | — | NEVER |

Contraintes :

```sql
import_issues_check: CHECK (((resolved_at IS NULL) OR ((resolved_by IS NOT NULL) AND (resolution_reason IS NOT NULL) AND (length(btrim(resolution_reason)) > 0))))
import_issues_code_not_null: NOT NULL code
import_issues_details_not_null: NOT NULL details
import_issues_id_not_null: NOT NULL id
import_issues_pkey: PRIMARY KEY (id)
import_issues_resolved_by_fkey: FOREIGN KEY (resolved_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
import_issues_row_id_code_key: UNIQUE (row_id, code)
import_issues_row_id_fkey: FOREIGN KEY (row_id) REFERENCES escen_private.legacy_rows(id) ON DELETE RESTRICT
import_issues_row_id_not_null: NOT NULL row_id
```

Index :

```sql
CREATE INDEX fk_20158 ON escen_private.import_issues USING btree (row_id)
CREATE INDEX fk_20163 ON escen_private.import_issues USING btree (resolved_by)
CREATE UNIQUE INDEX import_issues_pkey ON escen_private.import_issues USING btree (id)
CREATE UNIQUE INDEX import_issues_row_id_code_key ON escen_private.import_issues USING btree (row_id, code)
```

## escen_private.import_runs

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| batch_id | uuid | NO | — | NEVER |
| run_code | text | NO | — | NEVER |
| started_at | timestamptz | NO | now() | NEVER |
| database_actor | text | NO | SESSION_USER | NEVER |
| actor_account_id | uuid | YES | — | NEVER |
| counts | jsonb | NO | — | NEVER |

Contraintes :

```sql
import_runs_actor_account_id_fkey: FOREIGN KEY (actor_account_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
import_runs_batch_id_fkey: FOREIGN KEY (batch_id) REFERENCES escen_private.import_batches(id) ON DELETE RESTRICT
import_runs_batch_id_not_null: NOT NULL batch_id
import_runs_batch_id_run_code_key: UNIQUE (batch_id, run_code)
import_runs_counts_not_null: NOT NULL counts
import_runs_database_actor_not_null: NOT NULL database_actor
import_runs_id_not_null: NOT NULL id
import_runs_pkey: PRIMARY KEY (id)
import_runs_run_code_not_null: NOT NULL run_code
import_runs_started_at_not_null: NOT NULL started_at
```

Index :

```sql
CREATE UNIQUE INDEX import_runs_batch_id_run_code_key ON escen_private.import_runs USING btree (batch_id, run_code)
CREATE UNIQUE INDEX import_runs_pkey ON escen_private.import_runs USING btree (id)
```

## escen_private.legacy_rows

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| batch_id | uuid | NO | — | NEVER |
| source_table | text | NO | — | NEVER |
| source_id | text | NO | — | NEVER |
| payload | jsonb | NO | — | NEVER |
| status | text | NO | 'PENDING'::text | NEVER |

Contraintes :

```sql
legacy_rows_batch_id_fkey: FOREIGN KEY (batch_id) REFERENCES escen_private.import_batches(id) ON DELETE RESTRICT
legacy_rows_batch_id_not_null: NOT NULL batch_id
legacy_rows_batch_id_source_table_source_id_key: UNIQUE (batch_id, source_table, source_id)
legacy_rows_id_not_null: NOT NULL id
legacy_rows_payload_not_null: NOT NULL payload
legacy_rows_pkey: PRIMARY KEY (id)
legacy_rows_source_id_not_null: NOT NULL source_id
legacy_rows_source_table_not_null: NOT NULL source_table
legacy_rows_status_check: CHECK ((status = ANY (ARRAY['PENDING'::text, 'QUARANTINED'::text, 'MAPPED'::text, 'ARCHIVE_ONLY'::text])))
legacy_rows_status_not_null: NOT NULL status
```

Index :

```sql
CREATE INDEX fk_20138 ON escen_private.legacy_rows USING btree (batch_id)
CREATE UNIQUE INDEX legacy_rows_batch_id_source_table_source_id_key ON escen_private.legacy_rows USING btree (batch_id, source_table, source_id)
CREATE UNIQUE INDEX legacy_rows_pkey ON escen_private.legacy_rows USING btree (id)
```

## escen_private.model_decisions

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| code | text | NO | — | NEVER |
| question | text | NO | — | NEVER |
| resolution | text | YES | — | NEVER |
| decided_by | uuid | YES | — | NEVER |
| decided_at | timestamptz | YES | — | NEVER |

Contraintes :

```sql
model_decisions_check: CHECK ((((resolution IS NULL) AND (decided_at IS NULL) AND (decided_by IS NULL)) OR ((resolution IS NOT NULL) AND (decided_at IS NOT NULL) AND (decided_by IS NOT NULL))))
model_decisions_code_key: UNIQUE (code)
model_decisions_code_not_null: NOT NULL code
model_decisions_decided_by_fkey: FOREIGN KEY (decided_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
model_decisions_id_not_null: NOT NULL id
model_decisions_pkey: PRIMARY KEY (id)
model_decisions_question_not_null: NOT NULL question
```

Index :

```sql
CREATE INDEX fk_20212 ON escen_private.model_decisions USING btree (decided_by)
CREATE UNIQUE INDEX model_decisions_code_key ON escen_private.model_decisions USING btree (code)
CREATE UNIQUE INDEX model_decisions_pkey ON escen_private.model_decisions USING btree (id)
```

## escen_private.portal_revision

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| singleton | bool | NO | true | NEVER |
| revision | int8 | NO | 0 | NEVER |
| changed_at | timestamptz | NO | now() | NEVER |
| actor_id | uuid | YES | — | NEVER |

Contraintes :

```sql
portal_revision_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES escen.accounts(id) ON DELETE RESTRICT
portal_revision_changed_at_not_null: NOT NULL changed_at
portal_revision_id_not_null: NOT NULL id
portal_revision_pkey: PRIMARY KEY (id)
portal_revision_revision_check: CHECK ((revision >= 0))
portal_revision_revision_not_null: NOT NULL revision
portal_revision_singleton_check: CHECK (singleton)
portal_revision_singleton_key: UNIQUE (singleton)
portal_revision_singleton_not_null: NOT NULL singleton
```

Index :

```sql
CREATE INDEX portal_revision_actor_fk ON escen_private.portal_revision USING btree (actor_id)
CREATE UNIQUE INDEX portal_revision_pkey ON escen_private.portal_revision USING btree (id)
CREATE UNIQUE INDEX portal_revision_singleton_key ON escen_private.portal_revision USING btree (singleton)
```

## escen_private.recovery_candidates

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| batch_id | uuid | NO | — | NEVER |
| source_archive | text | NO | — | NEVER |
| source_sql_sha256 | text | NO | — | NEVER |
| source_table | text | NO | — | NEVER |
| source_id | text | NO | — | NEVER |
| payload | jsonb | NO | — | NEVER |

Contraintes :

```sql
recovery_candidates_batch_id_fkey: FOREIGN KEY (batch_id) REFERENCES escen_private.import_batches(id) ON DELETE RESTRICT
recovery_candidates_batch_id_not_null: NOT NULL batch_id
recovery_candidates_batch_id_source_archive_source_table_so_key: UNIQUE (batch_id, source_archive, source_table, source_id)
recovery_candidates_id_not_null: NOT NULL id
recovery_candidates_payload_not_null: NOT NULL payload
recovery_candidates_pkey: PRIMARY KEY (id)
recovery_candidates_source_archive_not_null: NOT NULL source_archive
recovery_candidates_source_id_not_null: NOT NULL source_id
recovery_candidates_source_sql_sha256_check: CHECK ((source_sql_sha256 ~ '^[a-f0-9]{64}$'::text))
recovery_candidates_source_sql_sha256_not_null: NOT NULL source_sql_sha256
recovery_candidates_source_table_not_null: NOT NULL source_table
```

Index :

```sql
CREATE INDEX recovery_batch_fk ON escen_private.recovery_candidates USING btree (batch_id)
CREATE UNIQUE INDEX recovery_candidates_batch_id_source_archive_source_table_so_key ON escen_private.recovery_candidates USING btree (batch_id, source_archive, source_table, source_id)
CREATE UNIQUE INDEX recovery_candidates_pkey ON escen_private.recovery_candidates USING btree (id)
```

## escen_private.source_mappings

| Attribut | Type | Nullable | Défaut | Généré |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NEVER |
| row_id | uuid | NO | — | NEVER |
| target_table | text | NO | — | NEVER |
| target_id | uuid | NO | — | NEVER |
| mapped_by | uuid | YES | — | NEVER |
| reason | escen.nonempty_text | NO | — | NEVER |
| mapped_at | timestamptz | NO | now() | NEVER |
| mapping_method | text | NO | 'HUMAN_REVIEW'::text | NEVER |
| import_run_id | uuid | YES | — | NEVER |

Contraintes :

```sql
source_mapping_actor_check: CHECK ((((mapping_method = 'HUMAN_REVIEW'::text) AND (mapped_by IS NOT NULL) AND (import_run_id IS NULL)) OR ((mapping_method = 'SOURCE_EXACT'::text) AND (mapped_by IS NULL) AND (import_run_id IS NOT NULL))))
source_mappings_id_not_null: NOT NULL id
source_mappings_import_run_id_fkey: FOREIGN KEY (import_run_id) REFERENCES escen_private.import_runs(id) ON DELETE RESTRICT
source_mappings_mapped_at_not_null: NOT NULL mapped_at
source_mappings_mapped_by_fkey: FOREIGN KEY (mapped_by) REFERENCES escen.accounts(id) ON DELETE RESTRICT
source_mappings_mapping_method_check: CHECK ((mapping_method = ANY (ARRAY['HUMAN_REVIEW'::text, 'SOURCE_EXACT'::text])))
source_mappings_mapping_method_not_null: NOT NULL mapping_method
source_mappings_pkey: PRIMARY KEY (id)
source_mappings_reason_not_null: NOT NULL reason
source_mappings_row_id_fkey: FOREIGN KEY (row_id) REFERENCES escen_private.legacy_rows(id) ON DELETE RESTRICT
source_mappings_row_id_not_null: NOT NULL row_id
source_mappings_row_id_target_table_key: UNIQUE (row_id, target_table)
source_mappings_target_id_not_null: NOT NULL target_id
source_mappings_target_table_not_null: NOT NULL target_table
```

Index :

```sql
CREATE INDEX fk_20186 ON escen_private.source_mappings USING btree (row_id)
CREATE INDEX fk_20191 ON escen_private.source_mappings USING btree (mapped_by)
CREATE UNIQUE INDEX source_mappings_pkey ON escen_private.source_mappings USING btree (id)
CREATE UNIQUE INDEX source_mappings_row_id_target_table_key ON escen_private.source_mappings USING btree (row_id, target_table)
```

## Vues calculées

### escen.active_payment_allocations

```sql
 SELECT id,
    payment_id,
    enrollment_id,
    contract_id,
    version_id,
    line_id,
    installment_id,
    amount,
    allocated_by,
    allocated_at
   FROM escen.payment_allocations a
  WHERE ((NOT (EXISTS ( SELECT 1
           FROM escen.allocation_reversals r
          WHERE (r.allocation_id = a.id)))) AND (NOT (EXISTS ( SELECT 1
           FROM escen.payment_reversals r
          WHERE (r.payment_id = a.payment_id)))));
```

### escen.contract_balances

```sql
 SELECT c.id AS contract_id,
    c.enrollment_id,
    v.id AS version_id,
    ((COALESCE(( SELECT sum((l.amount)::numeric) AS sum
           FROM escen.contract_lines l
          WHERE (l.version_id = v.id)), (0)::numeric) - COALESCE(( SELECT sum((d.amount)::numeric) AS sum
           FROM escen.contract_discounts d
          WHERE (d.version_id = v.id)), (0)::numeric)) - COALESCE(( SELECT sum((n.amount)::numeric) AS sum
           FROM (escen.credit_notes n
             JOIN escen.contract_lines l ON ((l.id = n.line_id)))
          WHERE (l.version_id = v.id)), (0)::numeric)) AS expected,
    (COALESCE(( SELECT sum((p.amount)::numeric) AS sum
           FROM escen.payments p
          WHERE ((p.enrollment_id = c.enrollment_id) AND (NOT (EXISTS ( SELECT 1
                   FROM escen.payment_reversals r
                  WHERE (r.payment_id = p.id)))))), (0)::numeric) - COALESCE(( SELECT sum((f.amount)::numeric) AS sum
           FROM (escen.refunds f
             JOIN escen.payments p ON ((p.id = f.payment_id)))
          WHERE (p.enrollment_id = c.enrollment_id)), (0)::numeric)) AS paid
   FROM (escen.financial_contracts c
     JOIN escen.contract_versions v ON (((v.contract_id = c.id) AND (v.status = 'APPROVED'::text))));
```

### escen.jury_decisions_needing_review

```sql
 SELECT DISTINCT d.id AS decision_id
   FROM ((escen.jury_decisions d
     JOIN escen.jury_grade_inputs i ON ((i.decision_id = d.id)))
     JOIN escen.grades g ON ((g.id = i.grade_id)))
  WHERE (g.revision <> i.grade_revision);
```


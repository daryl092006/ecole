# Revue des pages, examens, corrections et demandes — 19 octobre 2026

71 écrans et variantes visités à 390 et 1440 pixels, soit 142 contrôles de rendu et de navigation. Les captures utilisent des comptes et des données isolés. Les parcours métier prioritaires ont fait l’objet de tests distincts ; la visite générale ne certifie pas toutes les actions de chaque rubrique.

## Demandes en ligne et liaison au site

- Lecture du service connecté : aucune candidature soumise, toutes années confondues ; aucune demande sans année. La liste vide ne masquait donc aucun dossier reçu.
- Année de travail officielle : 2025-2026 ; 19 campagnes ouvertes pour cette année. Les formulaires publics suivent cette année officielle, tandis que le portail permet de consulter une autre année.
- Défaut local confirmé : ESCEN_WEBSITE_URL absent. La réponse publique ne comportait pas l’origine CORS autorisant le site local ; les écritures publiques exigent aussi cette origine. Ajout de http://localhost:3200 à la configuration locale. Lecture HTTP confirmée ensuite : statut 200, origine CORS autorisée et année 2025-2026.
- La liste indique désormais l’année, distingue absence de demande, recherche sans résultat et erreur de chargement, propose une reprise et donne accès aux formations ouvertes. Les dossiers utilisent un tableau responsive avec action en icône.
- Le dépôt public en quatre étapes, les pièces et le suivi interne ont été vérifiés avec des échanges isolés. Aucun dossier de recette n’a été créé en base distante. Le site public déployé sur Internet n’a pas été modifié.

## Examens et correction par les enseignants

- Lecture du service connecté : 82 évaluations, aucune diffusion en ligne ni tentative en ligne. Le manque de copies nouvelles correspond à cet état ; les réponses historiques restent un parcours de consultation séparé.
- Les copies en ligne sont accessibles depuis la ligne de chaque candidat dans la saisie des notes. Le filtre porte sur le candidat et l’évaluation. Les retours à la ligne des réponses sont conservés. Ouvrir puis fermer une copie préserve la note en cours de saisie.
- Circuit conservé : saisie par l’enseignant, soumission, contrôle, validation et publication selon les permissions. Une note publiée se corrige avec motif et récapitulatif ; une valeur vide ne devient pas zéro. Le professeur ne reçoit aucun droit de validation académique supplémentaire.
- La correction en place porte sur la note finale sur 20. Ce chantier n’a pas ajouté de correction automatique par question ou de nouveau barème.
- Passage étudiant testé : sauvegarde, reprise, remise volontaire, échéance, coupure réseau et conflit entre onglets. Navigation personnelle testée pour Étudiant, Délégué et compte cumulant Étudiant et IT.

## Mails après les actions

| Action | Comportement constaté | Mail |
| --- | --- | --- |
| Demande de réinitialisation du mot de passe | Appel Supabase Auth et retour conditionnel à l’utilisateur | Appel branché ; réception réelle non vérifiée |
| Dépôt final d’une candidature | Enregistrement du dossier reçu | Aucun déclencheur métier branché |
| Changement du suivi d’une candidature | Enregistrement motivé et contrôle de version | Aucun déclencheur métier branché |
| Saisie, soumission ou publication des notes | Enregistrement et circuit de validation | Aucun déclencheur métier branché |
| Épreuves, copies et modifications du planning | Parcours persistants propres à ces opérations | Aucun déclencheur métier branché |

Les notifications de session et les confirmations affichées dans le portail ne constituent pas des emails. Aucun transport SMTP ou service de mails métier, aucune file d’envoi et aucun suivi de livraison n’ont été trouvés dans le code inspecté. Le test de réinitialisation intercepte le transport : il vérifie la demande, l’erreur visible et la reprise, sans envoyer de vrai mail.

À préciser pour brancher les mails métier : service d’envoi, adresse expéditrice, événements concernés et destinataires. Une question sur le service et l’adresse a été adressée à l’utilisateur. Aucun secret ne doit être ajouté au code client.

## Fonctions consultatives repérées

Le traitement du support, le circuit des achats, les nouvelles délibérations et documents officiels, ainsi que les règles académiques à confirmer ne sont pas certifiés opérationnels par cette revue. La conversion d’une candidature en inscription ou en compte reste distincte du suivi du dossier. Aucune de ces fonctions n’a été activée implicitement.

## Vérifications

- Revue générale : 71 variantes aux deux largeurs ; contrôle du changement obligatoire de mot de passe corrigé pour attendre la fin réelle du chargement avant la capture.
- 48 scénarios distincts du périmètre ont réussi au cours des passages de validation : examens, notes, navigation personnelle, demandes, site public adapté et réinitialisation. Les huit nouveaux tests de demandes ont d’abord révélé une fixture annuelle incomplète ; les dates requises ont été ajoutées puis les huit tests ont réussi.
- TypeScript : npx tsc --noEmit --incremental false. ESLint : npm run lint. Aucun backend, service métier ou schéma SQL n’a été modifié.
- Captures de cette revue : tmp/screenshots/annual-offerings/portal-review/after/. Les artefacts des anciennes revues et les données protégées de .tmp restent conservés.

Commande de visite générale :

```sh
ESCEN_RESPONSIVE_STAGE=after ESCEN_AUDIT_ARTIFACT_ROOT=tmp/screenshots/annual-offerings/portal-review npx playwright test --config tests/ui/portal-review.config.ts responsive-audit.spec.ts --grep "Captures.*(390|1440)px"
```

Les tests du formulaire externe utilisent ESCEN_TEST_WEBSITE_URL=http://localhost:3200 et le site local servi sur ce port. Le contrôle CORS réel exige le portail sur 127.0.0.1:3000.

## Pages visitées

| Écran ou variante | Adresse | 390 px | 1440 px |
| --- | --- | --- | --- |
| Connexion | /connexion | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/auth_connexion.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/auth_connexion.png) |
| Mot de passe oublié | /mot-de-passe-oublie | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/auth_forgot.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/auth_forgot.png) |
| Réinitialiser le mot de passe | /mot-de-passe-reinitialiser | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/auth_reset.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/auth_reset.png) |
| Changement obligatoire du mot de passe | /mot-de-passe-modifier | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/auth_required.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/auth_required.png) |
| Mes épreuves en ligne | /mon-espace/epreuves | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/espace_exams.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/espace_exams.png) |
| Mon espace | /mon-espace | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/espace_dashboard.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/espace_dashboard.png) |
| Support technique | /mon-espace/support | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/espace_support.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/espace_support.png) |
| Annonces et actualités | /mon-espace/annonces | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/espace_announcements.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/espace_announcements.png) |
| Mes documents | /mon-espace/documents | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/espace_documents.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/espace_documents.png) |
| Mes frais et paiements | /mon-espace/scolarite | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/espace_finance.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/espace_finance.png) |
| Vue d’ensemble | /tableau-de-bord | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/dashboard_kpis.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/dashboard_kpis.png) |
| Rapports de pilotage | /tableau-de-bord/rapports | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/dashboard_reports.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/dashboard_reports.png) |
| Programmes de cours et matières | /academique/filieres | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_program.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_program.png) |
| Préparer et gérer l’année | /academique/referentiel | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_reference.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_reference.png) |
| Emploi du temps | /academique/emploi-du-temps | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_schedule.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_schedule.png) |
| Feuilles de présence | /academique/presences | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_attendance.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_attendance.png) |
| Notes et résultats | /academique/notes | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_grades.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_grades.png) |
| Réclamations académiques | /academique/reclamations | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_complaints.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_complaints.png) |
| Contrôles continus | /academique/evaluations | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_assessments.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_assessments.png) |
| Rattrapages | /academique/rattrapages | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_resits.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_resits.png) |
| Composition des épreuves | /academique/sujets | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_subjects.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_subjects.png) |
| Examens | /academique/examens | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_exams.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_exams.png) |
| Délibérations et relevés | /academique/deliberations | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_jury.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_jury.png) |
| Règles académiques à confirmer | /academique/parametres | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/acad_settings.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/acad_settings.png) |
| Dossiers et inscriptions | /etudiants | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/stud_list.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/stud_list.png) |
| Comptes étudiants | /etudiants/comptes | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/stud_accounts.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/stud_accounts.png) |
| Documents étudiants | /etudiants/cartes | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/stud_cards.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/stud_cards.png) |
| Réinscriptions et statuts | /etudiants/parcours | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/stud_status.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/stud_status.png) |
| Situation financière | /finance | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/fin_kpis.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/fin_kpis.png) |
| Versements et reçus | /finance/versements | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/fin_payments.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/fin_payments.png) |
| Rapports financiers | /finance/rapports | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/fin_reports.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/fin_reports.png) |
| Contrats étudiants et bourses | /finance/contrats | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/fin_contracts.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/fin_contracts.png) |
| Comptes du personnel | /personnel/utilisateurs | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/staff_list.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/staff_list.png) |
| Rôles ESCEN | /personnel/roles | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/staff_roles.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/staff_roles.png) |
| Matrice des permissions | /personnel/permissions | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/staff_permissions.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/staff_permissions.png) |
| Enseignants et affectations | /personnel/enseignants | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/staff_teachers.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/staff_teachers.png) |
| Dossiers du personnel | /personnel | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/staff_records.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/staff_records.png) |
| Annonces | /communication/annonces | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/comm_announcements.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/comm_announcements.png) |
| Articles | /site-web/articles | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/comm_news.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/comm_news.png) |
| Demandes en ligne | /site-web/demandes | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/web_applications.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/web_applications.png) |
| Formations et pièces | /site-web/documents | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/web_documents.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/web_documents.png) |
| Brochures | /site-web/brochures | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/web_brochures.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/web_brochures.png) |
| Demandes d’achat | /logistique/achats | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/log_purchases.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/log_purchases.png) |
| Fournisseurs | /logistique/fournisseurs | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/log_suppliers.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/log_suppliers.png) |
| Inventaire du site | /logistique/inventaire | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/log_assets.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/log_assets.png) |
| Données et contrôle de reprise | /systeme/donnees | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/sys_data.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/sys_data.png) |
| Journal d’activité | /systeme/journal | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/sys_logs.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/sys_logs.png) |
| Export du journal | /systeme/export | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/sys_backups.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/sys_backups.png) |
| Centre de support | /systeme/support | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/sys_support.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/sys_support.png) |
| Accueil academique | /academique | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/module_academique.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/module_academique.png) |
| Accueil marketing | /communication | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/module_marketing.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/module_marketing.png) |
| Accueil logistique | /logistique | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/module_logistique.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/module_logistique.png) |
| Accueil systeme | /systeme | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/module_systeme.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/module_systeme.png) |
| Dossier individuel étudiant | /etudiants/ESCEN-TEST-001 | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/student_record.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/student_record.png) |
| Accueil étudiant | /mon-espace | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/student_home.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/student_home.png) |
| Ancienne adresse des actualités | /communication/actualites | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/alias_actualites.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/alias_actualites.png) |
| Racine du site | / | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/root.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/root.png) |
| Référentiel · Filières | /academique/filieres?collection=programs | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_programs.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_programs.png) |
| Référentiel · Parcours | /academique/filieres?collection=tracks | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_tracks.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_tracks.png) |
| Référentiel · Matières | /academique/filieres?collection=subjects | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_subjects.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_subjects.png) |
| Référentiel · Programmes de formation | /academique/filieres?collection=curricula | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_curricula.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_curricula.png) |
| Référentiel · Semestres du programme | /academique/filieres?collection=curriculum_semesters | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_curriculum_semesters.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_curriculum_semesters.png) |
| Référentiel · Unités d’enseignement | /academique/filieres?collection=teaching_units | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_teaching_units.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_teaching_units.png) |
| Référentiel · Matières du programme | /academique/filieres?collection=curriculum_components | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_curriculum_components.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_curriculum_components.png) |
| Référentiel · Années universitaires | /academique/referentiel?collection=academic_years | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_academic_years.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_academic_years.png) |
| Référentiel · Formations de l’année | /academique/referentiel?collection=academic_offerings | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_academic_offerings.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_academic_offerings.png) |
| Référentiel · Cycles | /academique/referentiel?collection=cycles | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_cycles.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_cycles.png) |
| Référentiel · Niveaux | /academique/referentiel?collection=levels | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_levels.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_levels.png) |
| Référentiel · Groupes | /academique/referentiel?collection=groups | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_groups.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_groups.png) |
| Référentiel · Groupes et formations | /academique/referentiel?collection=group_offerings | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_group_offerings.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_group_offerings.png) |
| Référentiel · Salles | /academique/referentiel?collection=rooms | [OK](../tmp/screenshots/annual-offerings/portal-review/after/390/catalog_rooms.png) | [OK](../tmp/screenshots/annual-offerings/portal-review/after/1440/catalog_rooms.png) |

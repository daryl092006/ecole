# Proposition — demandes de correction du dossier scolaire

Statut : responsables et SQL de routage validés par l'utilisateur le 19 novembre 2026. Routage développé et testé localement. Seconde proposition SQL de correction effective à valider séparément.

## Constat vérifié

La première connexion enregistre les erreurs de filière/niveau dans `support_tickets`, sans catégorie ni destinataire. Seul le rôle Informaticien possède actuellement `system.support.manage`. La demande n'est donc pas distribuée à la scolarité malgré le texte présenté à l'étudiant.

L'API de modification du dossier étudiant traite l'identité et les coordonnées. L'opération de changement de groupe impose une formation et un niveau identiques. Ces actions ne constituent pas un mécanisme existant de correction de filière ou de niveau.

La base interdit également la modification de `enrollments.offering_id` via `enrollment_context_guard`. Les groupes, présences et candidats aux évaluations ont des clés étrangères composites vers l'inscription et sa formation. Un changement direct ne peut donc pas conserver ces rattachements sans traitement métier explicite. Les anciennes migrations de régularisation ciblée ont désactivé des protections : elles ne constituent pas un modèle pour une fonctionnalité de gestion courante.

## Circuit proposé

1. Distinguer les demandes de correction scolaire des incidents techniques, avec un rattachement explicite à l'étudiant et à l'année.
2. Présenter une liste dédiée aux responsables validés : Directeur académique, Logisticien académique et Informaticien. Ne pas leur ouvrir l'ensemble du support technique.
3. Afficher l'identité de l'étudiant, la formation actuelle, sa demande et l'historique des échanges. Permettre la prise en charge et une réponse motivée.
4. L'étudiant conserve l'accès au portail et suit la demande et les réponses depuis son espace.
5. Distinguer le traitement de la demande de la modification effective de l'inscription. Une demande résolue ne prouve pas, à elle seule, qu'une formation a été corrigée ; le compte rendu doit préciser la décision.
6. Préserver les signalements déjà enregistrés. Prévoir leur reconnaissance et leur reprise dans la liste scolaire sans doublon.

## Limites à régler avant une modification de formation

Une correction de filière/niveau peut affecter les groupes, les évaluations et les contrats. Ne pas inventer de transfert automatique, de recalcul financier ni de passage de niveau. Le mécanisme de correction effective doit préciser les cas acceptés et les contrôles des données déjà liées.

Parcours proposé pour la correction effective : ouvrir la demande, examiner l'inscription de l'année concernée, choisir la formation et le groupe corrects, afficher les dépendances et un récapitulatif avant/après, puis confirmer une transaction auditée. Le ticket ne doit pas être présenté comme « corrigé » avant le succès de la transaction. Si des notes, présences ou contrats rendent l'opération incompatible, afficher le blocage et maintenir la demande ouverte pour régularisation ; aucune perte ou réaffectation silencieuse.

SQL complet de la première étape de routage : `docs/sql-proposals/20261119_student_correction_routing.sql`, créé après accord dans `supabase/migrations/202611190115_student_correction_routing.sql`. Il crée un droit dédié, l'associe aux trois rôles validés, ajoute une catégorie scolaire et classe les anciens tickets dont l'identifiant déterministe confirme l'origine première connexion. Il n'effectue aucune modification de formation. Le SQL a été appliqué uniquement dans PGlite local pour les tests.

## Première étape réalisée

- Nouvelle page `/etudiants/corrections` : demandes scolaires uniquement, nom et matricule, recherche, prise en charge, réponse et lien vers le dossier. Les incidents techniques privés ne sont pas ouverts aux responsables scolaires.
- Les nouveaux signalements de première connexion utilisent la catégorie scolaire. Les anciens sont repris par la migration après vérification de leur identifiant déterministe.
- L'étudiant consulte les réponses dans son espace support. Aucun email n'est envoyé.
- Impossible de résoudre une demande scolaire par une simple transition de support : cette action ne doit pas remplacer une correction d'inscription.
- Validation : TypeScript sans incrémental, ESLint, `npm test`, six tests support/corrections (dont parcours à 390 et 1440 px) et sept tests ciblés de première connexion réussis. Deux sélecteurs historiques des tests support ont été adaptés aux libellés actuels. Schéma documentaire régénéré avec `npm run db:describe` sans différence structurelle.
- Aucun push, déploiement ou changement de base distante.

## Seconde étape — proposition refusée, à revoir

L'utilisateur a refusé le blocage systématique le 19 novembre 2026. La présence de notes, présences, contrats, paiements ou historique doit être prise en charge par le circuit de correction et ne doit pas rendre le dossier non traitable. Les paragraphes et le SQL ci-dessous décrivent la proposition refusée, conservée pour traçabilité ; ils ne constituent pas une règle approuvée.

La nouvelle conception distingue la formation corrigée et les rattachements historiques. Après le « go » utilisateur, l'option retenue est la conservation des notes, présences, contrats et paiements, sans recalcul automatique ni transfert des notes vers d'autres matières. Les pièces officielles déjà émises restent inchangées. Le SQL révisé doit encore recevoir un accord explicite avant création de migration.

### Proposition révisée sans blocage des dossiers utilisés

SQL complet : `docs/sql-proposals/20261119_student_program_correction_with_history.sql`, non exécuté et non créé en migration.

- L'identifiant d'inscription est conservé : les contrats, paiements, remboursements, affectations et pièces restent liés au même dossier. Aucun montant n'est recalculé.
- Une table de contextes conserve les formations successives de cette inscription. Les références composites des groupes, présences, candidats et décisions de jury pointent vers ces contextes : les données anciennes gardent leur formation d'origine.
- La formation courante est corrigée. Les anciens groupes sont signalés comme historiques, sans réécrire leurs dates ni invalider les anciennes présences. Une affectation au groupe cible est créée ou réactivée sous contrôle transactionnel.
- Les droits DA/LOG/IT, le contrôle de révision, l'année et le site de l'inscription restent vérifiés. Une correction est auditée avec l'état précédent et le motif, puis le ticket est résolu dans la même transaction.
- La présence de notes, présences, contrats, paiements, documents officiels ou historique de groupes n'est plus un motif de refus.

Adaptations applicatives nécessaires après validation du SQL : bouton et récapitulatif de correction ; choix de la formation et du groupe ; filtres distincts des groupes actuels et historiques ; visibilité des notes et présences anciennes sans élargissement des droits ; nouvelles activités sur la formation courante ; conservation des capacités personnelles et des soldes financiers.

Tests à ajouter : correction d'une inscription peuplée avec notes publiées, présences, contrat approuvé, paiement affecté, document officiel et jury ; comparaison des données avant/après ; lecture étudiante et enseignant après correction ; accès au nouveau groupe et exclusion des nouveaux contenus de l'ancien groupe ; corrections successives et retour à une formation précédente ; révision périmée, autre étudiant, autre année/site et rôle non habilité ; échec tardif annulant formation, groupe, historique, message et résolution.

### Ancienne proposition refusée (conservée pour traçabilité)

SQL complet : `docs/sql-proposals/20261119_student_program_correction.sql`. Ce fichier est une proposition, pas une migration et n'a pas été exécuté.

Le SQL prévoit une RPC réservée aux rôles validés, un historique audité avant/après, la conservation de l'identifiant d'inscription et une mise à jour coordonnée de sa formation et de son groupe. Les protections habituelles restent actives en dehors de cette transaction. La demande et le message de résolution ne sont enregistrés qu'avec le succès de toute la correction.

La correction directe proposée est limitée aux inscriptions sans contrat ni paiement, présence, candidat à une évaluation, décision de jury ou document officiel, avec au plus un groupe non historisé. Elle reste dans la même année ouverte et le même site ; la double diplomation nécessite une régularisation séparée. Les dossiers incompatibles restent ouverts sans modification. Ces limites conservatrices sont à approuver avec le SQL.

Après accord : créer la nouvelle migration, la tester sur une base peuplée, ajouter le choix de l'inscription/formation/groupe et le récapitulatif `ReviewedForm`, brancher la RPC et vérifier les corrections réelles, les refus, les audits et le rollback intégral. La correction effective n'est pas encore disponible dans l'interface actuelle.

## Mise en œuvre après validation

Définir les droits dédiés, la classification persistante et le traitement des demandes existantes. Présenter le SQL complet de toute nouvelle migration avant de la créer. Réutiliser les transactions et l'audit existants, `ReviewedForm` et `WorkPage`, puis actualiser le portail après mutation.

Vérifier les périmètres par rôle et année, l'isolement des incidents techniques, la confidentialité des échanges, les demandes existantes, la concurrence et les parcours étudiant/gestionnaire. Exécuter TypeScript sans incrémental, ESLint, les tests métier et Playwright concernés. Aucune modification distante de données n'est autorisée par cette proposition.

Les emails et les notifications externes ne sont pas inclus dans cette proposition ; aucun message externe ne sera envoyé sans instruction explicite.

# Reprise du parcours admissions — 27 octobre 2026

## Demande validée

Le chargé de clientèle remplace LOG et RAF pour le traitement des candidatures : réception, vérification, compléments, transmission académique, confirmation des frais et création ou liaison du dossier étudiant. La direction académique conserve l’étude et la décision. Les autres fonctions de LOG et RAF restent inchangées.

## Interface préparée

- Cinq repères : réception et vérification, décision académique, frais d’inscription, dossier étudiant, inscription finalisée.
- Chaque dossier indique son responsable actuel, la prochaine action et son résultat après confirmation.
- L’action principale ouvre le formulaire directement sous la progression, avec récapitulatif ReviewedForm et confirmation explicite.
- Compléments et refus restent visibles ; appels et contre-opérations sont dans les autres actions.
- Les anciennes actions intermédiaires de réception, signalement incomplet et attente de paiement restent compatibles côté serveur mais ne sont plus proposées comme boutons supplémentaires.
- Le filtre « dossiers que je peux faire avancer » et la colonne responsable facilitent le travail quotidien.
- Après transmission, le chargé de clientèle voit que la direction académique doit intervenir. Il ne peut pas prendre sa décision.
- L’espace candidat explique ce qu’il doit faire ou attendre à chaque étape.

## Visibilité prévue

| Rôle | Dossiers | Actions |
| --- | --- | --- |
| Chargé de clientèle | Candidatures de l’année sélectionnée | Contrôle, suivi, frais, dossier étudiant ; pas de décision académique |
| Direction académique | Transmis à l’académie et étapes suivantes ; historiques | Étude, admissibilité ou refus |
| DG / DGA | Tous les dossiers du périmètre annuel | Consultation |
| Marketing | Incomplets et à compléter, coordonnées limitées | Appels de suivi ; aucune pièce scolaire |
| Informaticien | Tous les dossiers du périmètre annuel | Toutes les actions avec contrôles et audit |
| Candidat | Son dossier par accès personnel | Suivi, courriers, compléments aux étapes autorisées |
| LOG / RAF | Aucun accès au circuit via les permissions de candidature | Leurs autres fonctions sont conservées |

## Migration approuvée et validation locale

Accord utilisateur reçu le 27 octobre 2026. La proposition est intégrée dans `supabase/migrations/202610270053_customer_admissions.sql`. Aucun compte ni attribution individuelle n’est modifié.

Le retrait des anciennes associations LOG/RAF exige une maintenance du catalogue : verrou exclusif de `role_permissions`, désactivation du seul trigger `no_delete` pendant le retrait approuvé, puis réactivation avant la fin de la même transaction. Un test confirme que les suppressions sont à nouveau bloquées après migration. Les migrations précédentes sont inchangées.

La migration a été exécutée uniquement dans les bases PGlite éphémères des tests et de `npm run db:describe`. Aucun accès distant, déploiement ni envoi de mail réel.

## Vérifications

- `npx tsc --noEmit --incremental false` et `npm run lint` : réussis.
- Recette PostgreSQL admissions : 58 contrôles, dont droits CC, refus LOG/RAF, séparation de la décision académique, destinataires des notifications, pièces privées, années et transactions annulées en cas d’échec.
- Tests navigateur/API : 46 réussis, 3 ignorés (parcours externes du site, hors configuration de cette recette). Interfaces vérifiées à 390 et 1440 px.
- Documentation du schéma régénérée simultanément par `npm run db:describe` ; aucun changement structurel de table à documenter pour cette migration.

## Activation distante — 27 octobre 2026

Après le bilan local, l’utilisateur a autorisé l’activation réelle (« vas y »). La migration `202610270053_customer_admissions.sql` a été appliquée seule sur le projet Supabase lié, dans une transaction avec délais bornés, contrôles avant/après et inscription dans l’historique `supabase_migrations.schema_migrations`. Les autres migrations absentes à distance n’ont pas été appliquées.

Le script de déploiement a été validé sur PGlite avant exécution distante. Les empreintes des candidatures, comptes, attributions de rôles, paiements, notes et inscriptions sont identiques avant/après la transaction. Aucune candidature n’a été déplacée dans le circuit, aucun paiement enregistré, aucun mail envoyé.

Contrôle distant après activation :

- Migration 053 enregistrée ; contexte admissions IT actif ; 94 candidatures présentes.
- CC possède exactement les quatre permissions de consultation, vérification, suivi et confirmation des frais.
- LOG et RAF n’ont plus de permission `application.*` ; les comptes réels de ces rôles sont refusés par le contrôle métier admissions.
- DA conserve consultation et décision ; DG/DGA conservent la consultation ; IT conserve toutes les actions ; MKT conserve consultation et suivi limités.
- Protection `no_delete` du catalogue rétablie.
- Téléchargement des pièces interdit à `anon` et `authenticated`, autorisé à `service_role` sous contrôle du périmètre métier.
- Aucun rôle CC n’a été attribué à un compte automatiquement. L’ancien titulaire historique a été identifié ; le choix du compte actuel est demandé à l’utilisateur avant attribution.

## Reste à décider

Confirmer le compte devant recevoir CC, en précisant si ses autres rôles doivent être conservés. Aucune attribution nominative ni retrait de rôle individuel n’a été effectué pendant l’activation technique.

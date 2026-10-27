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

## Activation restante

Le rôle est défini et testé dans le dépôt ; il n’est pas activé sur la base distante. L’application distante de la migration et l’attribution du rôle à un compte réel restent des opérations distinctes, non effectuées pendant cette phase locale.

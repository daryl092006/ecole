# Déploiement Supabase du 19 octobre 2026

Projet : **Espace Etudiant ESCEN**, référence `zmxapemyktxhppdxenzb`, région `eu-west-1`.

L’utilisateur a explicitement demandé le déploiement Supabase après le chantier local des phases 1 à 5. Cette demande autorise l’application distante des migrations existantes pour cette intervention. Aucune nouvelle migration n’a été écrite et aucune migration existante n’a été modifiée.

## Migrations appliquées

L’historique distant contenait déjà les migrations jusqu’à `202610180041`. La simulation a identifié exactement les cinq fichiers suivants, appliqués dans cet ordre :

| Migration | Évolution |
| --- | --- |
| `202610180042_coordinated_exam_reschedule.sql` | Déplacement coordonné des séances et épreuves, motif et contrôles des conflits. |
| `202610180043_attendance_management.sql` | Corrections de présence motivées, traitement des justificatifs et transaction atomique. |
| `202610180044_atomic_payment_allocations.sql` | Encaissement et affectations des paiements dans une transaction atomique. |
| `202610180045_payment_adjustments.sql` | Annulation, remboursement et avoir avec contrôles financiers et audit. |
| `202610180046_net_financial_projections.sql` | Soldes nets des remboursements et avoirs, exclusion des paiements en attente ou annulés. |

Après application : **46 migrations locales et distantes identiques ; aucune migration en attente**.

## Vérification distante

Les contrôles après déploiement sont exclusivement en lecture. Aucun paiement, compte, dossier, présence ou autre enregistrement métier n’a été créé pour tester la base distante.

- Projet accessible et état `ACTIVE_HEALTHY` lors de la reconnexion.
- Historique distant identique aux versions et noms des 46 fichiers locaux.
- Huit colonnes contrôlées : motifs et archives du programme, motif des présences et des épreuves ; types et nullabilité conformes.
- Quatre triggers contrôlés et actifs : `exam_reschedule_guard`, `session_exam_reschedule`, `attendance_correction_reason`, `absence_justification_review`.
- Trois RPC présentes, `SECURITY DEFINER`, exécutables par `service_role`, sans droit d’exécution pour `anon` ni `authenticated` : `escen_attendance_transaction`, `escen_payment_transaction`, `escen_payment_adjustment`.
- Permission `attendance.review` attribuée uniquement aux rôles DA et IT.
- RLS active sur les **112 tables métier** ; aucune table du schéma `escen` sans RLS.
- Vues `active_payment_allocations` et `contract_balances` en `security_invoker`, avec exclusion des paiements PENDING et annulés ; remboursements et avoirs présents dans les soldes.
- Lecture HTTP du schéma OpenAPI : **200** ; les trois RPC sont disponibles dans le cache de l’API REST.

Les métadonnées vérifiées et leur horodatage figurent dans [DEPLOIEMENT_SUPABASE_2026-10-19.json](DEPLOIEMENT_SUPABASE_2026-10-19.json). Ce fichier ne contient aucun identifiant secret ni donnée personnelle.

## Commandes et résultats

Les commandes Supabase ont été exécutées avec le binaire Go natif installé, en préfixant chaque commande par `--profile supabase` :

```powershell
& 'D:/npm-global/node_modules/supabase/node_modules/@supabase/cli-windows-x64/bin/supabase-go.exe' --profile supabase <commande>
```

| Commande | Résultat |
| --- | --- |
| `migration list --linked` | Migrations présentes jusqu’à 041 ; cinq migrations à appliquer. |
| `db push --linked --dry-run` avant application | Exactement les migrations 042 à 046. |
| `db push --linked --yes` | Cinq migrations appliquées ; sortie 0. |
| `db query --linked --file tmp/supabase-deploy-20261019/migration-history.sql --output json` | Historique distant jusqu’à 046. |
| `db query --linked --file tmp/supabase-deploy-20261019/verify-schema.sql --output json` | Colonnes, triggers, droits, RLS et vues conformes. |
| `node tmp/supabase-deploy-20261019/verify-deployment.mjs` | Assertions sur les métadonnées et disponibilité REST réussies. |
| `db push --linked --dry-run` après application | `Remote database is up to date.` |
| `npx.cmd tsc --noEmit --incremental false` | Sortie 0 ; aucune erreur TypeScript. |
| `npm.cmd run lint` | Sortie 0 ; aucune erreur, sept avertissements préexistants. |
| `npm.cmd test` | Workflows et 172 groupes de contrôles PostgreSQL locaux réussis. |
| `npx.cmd playwright test --config=tmp/supabase-deploy-20261019/playwright.config.ts` | **130 tests réussis** : planning, épreuves, présences, affectations, contre-opérations, projections et navigation personnelle. |

Les tests métier et Playwright utilisent les bases et fixtures locales ; ils ne modifient pas les données Supabase. Le build Next.js de test a été effectué dans le dossier de travail prévu sur D:.

La CLI a signalé un échec de mise en cache locale du catalogue après application, car le moteur Docker local n’est pas disponible. L’application des migrations a réussi ; l’historique, les métadonnées distantes, l’API REST et la simulation finale ont confirmé le résultat.

## Périmètre restant

Le schéma Supabase du dépôt est à jour. Le dépôt ne contient aucune Edge Function à déployer. Les corrections des écrans et de la navigation, dont le retrait de « Mes épreuves en ligne » pour le rôle Informaticien, font partie de l’application Next.js : leur mise en ligne relève du déploiement de cette application. Aucun push Git ni déploiement de l’application web n’a été effectué pendant cette intervention.

Le passage de niveau et la compensation attendent toujours les règles institutionnelles. Les autres limites métier restent celles du [bilan du chantier](BILAN_CORRECTIONS_2026-10-19.md).

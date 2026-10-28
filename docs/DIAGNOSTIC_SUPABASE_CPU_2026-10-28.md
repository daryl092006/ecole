# Incident CPU Supabase du 28 octobre 2026

Projet : `zmxapemyktxhppdxenzb`. Horaires en UTC.

## Cause principale identifiée

Les journaux PostgreSQL entre 13:30 et le moment du diagnostic contiennent
4 506 erreurs « Modification concurrente : actualisez » et 14 expirations
de requêtes. La fenêtre est différente de celle de la capture du tableau de
bord ; ces nombres ne sont donc pas une reproduction des 3 687 erreurs affichées.
Les journaux peuvent être échantillonnés et ne comptent pas toutes les transactions.

L'erreur répétée provient de `public.escen_academic_year_command`, SQLSTATE
`40001`. Deux connexions PostgREST 14.18 la répètent : PID 1502341 et 1503027,
ouvertes le 27 octobre à 11:30:52.415776 et 11:33:47.545324 respectivement.
Les dates des transactions changent continuellement : une durée courte de
`query_start` ne suffit pas à exclure une boucle interne.

Supabase documente précisément cette boucle de relance automatique avec
PostgREST 14 : un conflit métier déterministe ne doit pas lever `40001`.
Le correctif recommandé est un code non relancé, par exemple `PT409` pour HTTP 409.
Les connexions déjà bloquées doivent également être arrêtées.

Source : https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions

## Intervention immédiate réalisée

Les deux connexions ont été arrêtées avec `pg_terminate_backend`, en filtrant
simultanément leur PID, leur date exacte de connexion, le rôle `authenticator`,
l'application PostgREST 14.18 et le nom de la RPC. Les deux appels ont renvoyé
`true`. Aucun changement de données métier, de définition SQL ou de compute
n'a été effectué par cette intervention.

| Relevé | Transactions annulées cumulées | Connexions sur la commande annuelle |
| --- | ---: | ---: |
| 14:43:42.994183 | 137 206 459 | 0 |
| 14:44:39.717584 | 137 206 459 | 0 |
| 14:47:35.833278 | 137 206 459 | 0 |

Le compteur de transactions validées continue d'augmenter : le service n'est
pas arrêté. La boucle observée a cessé pendant les relevés. La mesure CPU du
tableau de bord n'a pas été récupérée : aucune baisse chiffrée de CPU n'est affirmée.
Le défaut peut réapparaître tant que les codes des fonctions ne sont pas corrigés.

## Correctif préparé, non appliqué

`docs/proposals/RPC_CONFLICT_CODES_2026-10-28.sql` remplace seulement les
affectations explicites `errcode = '40001'` dans les fonctions PL/pgSQL des
schémas applicatifs par `errcode = 'PT409'`. Les vraies erreurs de sérialisation
émises par PostgreSQL restent inchangées. `CREATE OR REPLACE FUNCTION` conserve
les signatures, droits et paramètres existants. Aucun contrôle de concurrence,
message métier ou historique n'est supprimé.

L'inventaire distant identifie 14 fonctions concernées :

- `escen_academic_year_command`
- `escen_application_command`
- `escen_backend_transaction`
- `escen_brochures_manage`
- `escen_candidate_dossier`
- `escen_email_complete`
- `escen_email_enqueue`
- `escen_email_retry`
- `escen_manage_account`
- `escen_online_exam`
- `escen_payment_adjustment`
- `escen_payment_transaction`
- `escen_website_level_documents`
- `escen_website_manage_before_annual_scope`

Trois consommateurs TypeScript reconnaissent désormais les deux codes : copie
d'examen, erreurs du site et confirmation des fichiers d'admission. Cela préserve
HTTP 409 et le nettoyage après refus certain, tout en conservant les fichiers
si une erreur de transport ne permet pas de savoir si la transaction a abouti.
Ces modifications restent locales.

Le SQL n'est pas une migration enregistrée et n'a été exécuté ni localement ni
à distance. Accord demandé avant création et application de migration,
conformément à `AGENTS.md`. Une application distante exige également une
autorisation explicite dérogeant à l'interdiction actuelle.

## Vérifications

- `npx tsc --noEmit --incremental false` : succès avant et après adaptations.
- `npm run lint` : succès avant et après adaptations.
- `npx playwright test --config tests/ui/rpc-conflicts.config.ts` : 7 tests réussis.
- `npm test` : échec déjà présent avant adaptations, reproduit après, dans la
  recette du catalogue : « Niveau à retirer : retrait impossible, des cours ou
  des semestres sont encore rattachés à ce niveau. » Le correctif SQL proposé
  n'était pas appliqué lors de ces deux exécutions.

Les tests ciblés vérifient HTTP 409 avec les deux codes, un seul appel d'écriture
pour une copie, le nettoyage des fichiers rejetés et leur conservation en cas
d'issue incertaine. Ils ne valident pas encore le SQL proposé ni le comportement
réel de PostgREST après migration.

## Autres pistes, secondaires à la boucle

`pg_stat_statements` montre un catalogue annuel historique à 5,24 s en moyenne
sur 456 appels et plusieurs entrées du snapshot global entre 481 ms et 1,73 s.
Ces mesures sont cumulatives, pas propres à l'heure de l'incident. Le catalogue
annuel construit le catalogue complet avant filtrage et recomptage : optimisation
possible après résolution du défaut de relance.

La tâche d'expiration des examens est planifiée toutes les dix secondes.
358 exécutions sur la fenêtre récente ont réussi : aucun lien démontré avec
les erreurs répétées. Sa fréquence n'a pas été modifiée.

## Suite nécessaire

Après accord : enregistrer une nouvelle migration, vérifier localement les codes
d'erreur, les refus de concurrence sans mutation, les droits et les paramètres
des fonctions, puis résoudre l'échec général de recette avant livraison.
Régénérer les deux documents du schéma si une migration est enregistrée.
Toute mise en production et tout déploiement de l'application restent à faire.

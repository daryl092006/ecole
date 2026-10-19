# Vérification de la publication GitHub — 19 octobre 2026

Le commit applicatif `6c0a129083a9b799d17d9a866e25337d97341ef6` a été relu directement sur `refs/heads/main` du dépôt `daryl092006/ecole`, puis extrait dans un worktree isolé. Aucun fichier `.env.local` ni source locale non commitée n’a été copié dans cette extraction.

## Oubli corrigé

La configuration Supabase publiée conservait `db.orioledb_version`, alors que sa correction existait uniquement dans le répertoire de travail local. La CLI installée rejetait le fichier publié avec :

```text
failed to parse config: decoding failed due to the following error(s):
'db' has invalid keys: orioledb_version
```

La configuration compatible est incluse dans ce complément de publication, ainsi que la version actuelle du guide `AGENTS.md` fournie dans le répertoire de travail. Aucune source applicative ni migration SQL n’est modifiée par ce complément.

La configuration corrigée a été utilisée pour `db push --linked --dry-run` sur le projet ESCEN : sortie 0, `Remote database is up to date.` Aucune migration n’a été appliquée pendant cette vérification.

## Contrôles sur la copie propre

| Contrôle | Résultat |
| --- | --- |
| Build de production via `scripts/run-next.mjs build` | Réussi ; 59 pages statiques générées, routes API incluses. |
| `npx tsc --noEmit --incremental false` | Réussi ; aucune erreur. |
| `npm run lint` | Réussi ; aucune erreur, trois avertissements existants. |
| `npm test` | Workflows et **172 groupes de contrôles PostgreSQL** réussis dans PGlite local. |
| Tests navigateur sur ce build | **22 réussis** : navigation des épreuves personnelles et disponibilité des écrans connectés. |
| Imports externes de 484 fichiers suivis | Toutes les dépendances importées sont déclarées. |
| 15 dépendances directes installées | Versions identiques à `package-lock.json`. |
| Sources, scripts, fichiers publics, migrations et manifestes | Aucun fichier applicatif non publié détecté dans le répertoire principal. |
| Historique SQL versionné | Les 46 migrations locales sont présentes dans le commit publié. |

Les modules installés ont été partagés avec la copie isolée ; aucun nouveau téléchargement de dépendances n’a été réalisé. Les versions des dépendances directes ont été comparées au lockfile. Les éléments de contrôle sont conservés dans [VERIFICATION_PUBLICATION_2026-10-19.json](VERIFICATION_PUBLICATION_2026-10-19.json).

Le build navigateur utilise le nom public du projet et des clés fictives, sans secret de production. Une première tentative utilisait un autre nom de projet : les fixtures, dont la clé de stockage de session est fixe, ne pouvaient pas authentifier leurs comptes de test. Le nom a été aligné, puis les 22 tests ont été relancés avec succès. Aucune modification de l’application n’a été nécessaire.

Les 130 tests ciblés avant déploiement et les 56 tests supplémentaires avant le premier push avaient également réussi sur les mêmes sources applicatives.

## Éléments volontairement locaux

| Élément | Motif |
| --- | --- |
| Différence résiduelle de `tsconfig.json` | Réordonne un chemin existant ; les deux configurations ont le même contenu fonctionnel, vérifié après normalisation. |
| `docs/REVUE_CLARTE_2026-10-16.md` | Ancienne note de revue ; aucun usage dans l’application, et plusieurs limites historiques ont évolué depuis. |
| `tests/ui/audit-responsive-full.spec.ts` | Ancien outil de capture qui écrit dans `.tmp/` ; les suites responsive actuelles et leurs rapports sont déjà versionnés. |
| `tmp/`, captures, worktree et sorties de vérification | Artefacts locaux de travail et de test. |
| Environnements locaux et identifiants | Configuration extérieure au code, exclue de Git. |

## Limite de la confirmation

Cette vérification confirme le contenu GitHub, sa compilation et les contrôles exécutés. GitHub ne remontait aucun check-run ni statut de déploiement pour le commit applicatif lors de la consultation. La publication Git ne constitue donc pas une confirmation de mise en ligne de l’application chez son hébergeur.

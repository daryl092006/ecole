# Audit des rôles et des comptes — 23 octobre 2026

Les permissions des 14 rôles sont cohérentes entre le code et la base distante. En revanche, les 19 comptes enseignants actifs n'ont aucun profil enseignant : leur accès est bloqué par le contrôle de connexion. L'audit ne permet donc pas de déclarer tous les comptes opérationnels.

Audit en lecture seule sur le projet Supabase lié et configuré par `.env.local`, avec un premier snapshot à 14:09:56 UTC, un contrôle SQL à 14:12:05 UTC, puis une lecture de session pour chacun des 172 comptes actifs. Aucune donnée métier, attribution, migration ou configuration distante n'a été modifiée. Les modifications locales préexistantes ont été préservées.

## Comptes et attributions

| Contrôle | Résultat |
| --- | ---: |
| Comptes applicatifs, archives comprises | 175 |
| Comptes actifs | 172 |
| Compte inactif non archivé | 1 |
| Comptes archivés et inactifs | 2 |
| Utilisateurs Supabase Auth | 175 |
| Comptes actifs sans utilisateur Auth correspondant | 0 |
| Comptes actifs sans rôle courant reconnu | 0 |
| Comptes actifs avec adresse non confirmée ou bannissement Auth courant | 0 |
| Différences entre email Auth et email de la personne, sur les comptes actifs | 0 |
| Utilisateurs Auth sans compte applicatif, archives comprises | 0 |
| Comptes archivés conservant une attribution courante | 0 |
| Attributions enregistrées | 176 |
| Attributions courantes | 173 |
| Attributions expirées | 3 |
| Attributions futures | 0 |
| Doublons d'attribution courante pour le même rôle et périmètre | 0 |

Les 173 attributions courantes concernent 172 comptes : un compte de direction cumule DG et DGA. Les deux attributions sont présentes dans la source historique ; ce cumul n'est pas une invention de la reprise. Sa pertinence organisationnelle actuelle reste à confirmer par ESCEN.

Les 173 attributions courantes n'ont pas de restriction explicite de site, d'année ou de groupe. Cela ne supprime pas les restrictions personnelles : le serveur filtre séparément les données des étudiants, enseignants et surveillants. Le caractère global des rôles administratifs est hérité de la reprise et ne démontre pas à lui seul une anomalie.

Le snapshot applicatif masque les comptes archivés. Une lecture SQL complémentaire a confirmé que les deux utilisateurs Auth absents de ce snapshot correspondent bien aux deux comptes archivés, sans rôle courant ; ce ne sont pas des comptes orphelins.

## Catalogue complet

Comparaison des noms, codes, activation et ensembles exacts de permissions avec `src/types/permissions.ts` et `src/permissions/rolePermissions.ts` : aucun écart. Le catalogue contient 46 permissions distinctes et 145 associations rôle-permission.

| Code | Rôle | Comptes actifs titulaires | Permissions | Constat |
| --- | --- | ---: | ---: | --- |
| DG | Directeur Général | 1 | 17 | Cumul DG/DGA sur le même compte |
| DGA | Directeur Général Adjoint | 1 | 11 | Même compte que DG |
| DA | Directeur Académique | 1 | 15 | Profil de session reconnu |
| LOG | Logisticien académique | 1 | 15 | Profil de session reconnu |
| ENS | Enseignant | 19 | 9 | **19 profils enseignants manquants** |
| SURV | Surveillant | 1 | 3 | Profil de session reconnu ; les affectations opérationnelles ne sont pas attestées par ce contrôle |
| RAF | Responsable Administratif et Financier | 2 | 9 | Profils de session reconnus |
| MKT | Responsable marketing | 1 | 2 | Profil de session reconnu |
| ACHATS | Responsable des achats et de la logistique | 0 | 5 | Aucun titulaire actif |
| SITE | Responsable du site | 0 | 5 | Aucun titulaire actif ; l'ancienne attribution est expirée |
| IT | Informaticien | 1 | 46 | Toutes les permissions métier du catalogue |
| STUD | Étudiant | 145 | 4 | 145 fiches étudiants rattachées |
| DEL | Délégué | 0 | 4 | Aucun titulaire actif |
| STG | Stagiaire | 0 | 0 | Aucun titulaire actif ; aucun droit automatique, conformément au code |

L'absence de titulaire ACHATS, SITE, DEL ou STG n'est pas assimilée à une erreur sans connaître les nominations actuelles. Aucun rôle n'a été attribué par déduction à partir d'un nom ou d'une adresse email.

## Blocage confirmé des enseignants

La base contient zéro ligne dans `escen.staff`, zéro ligne dans `escen.teachers` et zéro affectation dans `escen.teaching_assignments` au moment du relevé.

Les 19 comptes ENS sont actifs, liés à Auth et pourvus de leur rôle, mais la RPC `escen_account_session` retourne `teacher: null`. Le contrôle `requireAccount` de `src/server/auth.ts` refuse alors l'accès avec le message « Votre profil métier doit être complété par ESCEN ».

Le compte signalé, `a.jean.coach@escen.university`, est dans cette situation : rôle ENS uniquement, compte actif, liaison Auth présente, aucune fiche enseignant. Changer son mot de passe ou lui réattribuer le même rôle ne rétablit pas le rattachement manquant.

Lecture réelle de la RPC pour les 172 comptes actifs : zéro erreur RPC, zéro identité de compte incohérente, zéro compte sans rôle, 19 comptes avec profil métier manquant. Les 153 autres comptes satisfont les conditions de rôle et de rattachement examinées. Ce résultat ne constitue pas un essai de connexion avec le mot de passe de chaque personne.

La lecture des scripts historiques explique cette lacune : `prepare-legacy-identities.mjs` et `import-legacy-identities.mjs` reprennent les personnes, comptes, étudiants et rôles, mais ne créent pas les dossiers `staff` et `teachers`. Ces scripts protégés n'ont pas été modifiés.

La régularisation proposée consiste à préparer les 19 dossiers personnel/enseignant sur les **identités déjà existantes**, avec provenance et audit. Elle doit conserver les comptes et les rôles, ne pas inventer de spécialité, de contrat ou d'affectation pédagogique, et vérifier la génération des identifiants du personnel. Même après régularisation des profils, les enseignements nécessiteront des affectations explicites puisqu'aucune n'existe actuellement.

## Fidélité à la reprise historique et limites

Les 176 attributions en base correspondent aux 176 attributions préparées dans les artefacts historiques locaux : aucune attribution absente ou supplémentaire, aucune différence de compte cible ou de rôle cible. Le contrôle SQL des correspondances de rôles via `escen_private.source_mappings` ne trouve aucun écart, ni de correspondance manquante pour les attributions courantes.

Le rapport historique indique aussi 92 lignes d'attribution non reprises sur 268 lignes source. La lecture des diagnostics les répartit ainsi :

- 85 avec utilisateur polymorphe manquant ;
- 3 avec utilisateur et rôle manquants ;
- 1 avec rôle manquant ;
- 3 sans diagnostic de quarantaine, mais hors correspondance reprise.

Ces trois dernières lignes correspondent à deux anciens rôles actifs non représentés dans le catalogue actuel (`collaborateur-commercial` et `charge-de-la-clientele`) et à un rôle historique inactif (`utilisateur-de-la-plateforme`). Les deux personnes concernées par les rôles actifs ont déjà, respectivement, MKT et RAF. Le troisième compte est archivé. Il faut une décision métier pour déterminer si des responsabilités supplémentaires doivent être représentées ; aucun élargissement automatique de droits n'est justifié par ces seules données.

La fidélité à une source historique ne prouve pas que les fonctions professionnelles sont toujours celles d'aujourd'hui. L'organigramme actuel, le cumul DG/DGA et les éventuelles nominations aux rôles sans titulaire restent à valider par les responsables.

## Vérifications exécutées

- `npx tsc --noEmit --incremental false` : réussite, zéro erreur.
- `npm run lint` : zéro erreur ; deux avertissements préexistants (`site` inutilisé dans `scripts/verify-academic-years.mjs`, `_tab` inutilisé dans `src/components/layout/PortalScreen.tsx`).
- `npm test` : assertions de workflows et de permissions réussies ; 185 groupes de contrôles PostgreSQL/PGlite réussis.
- Playwright : 30 tests réussis sur `auth-access.spec.ts`, `auth-session.spec.ts` et `personal-exams-navigation.spec.ts`, avec configuration temporaire et sorties hors de `.tmp/`.
- Les tests confirment notamment les refus d'authentification, la reprise après panne, la déconnexion, le changement de rôle et le parcours candidat réservé aux rôles Étudiant/Délégué, y compris pour un compte cumulant IT et Étudiant.

La première exécution navigateur a été bloquée par le bac à sable au lancement de Chrome ; la réexécution autorisée hors du bac à sable a réussi intégralement. Les tests navigateur utilisent des sessions de test contrôlées, distinctes de la vérification des données réelles en lecture seule.

Les éléments nominatifs détaillés, indicateurs Auth et relevés de sessions ont été conservés uniquement dans le répertoire temporaire privé `/private/tmp/escen-role-audit-20261023/`, hors du dépôt. Aucun mot de passe ou jeton n'a été inclus dans ce rapport.

## Suite proposée

1. Régulariser en priorité les 19 profils enseignants après préparation et validation de la correction, sans changer leurs rôles.
2. Confirmer les titulaires actuels des responsabilités, notamment le cumul DG/DGA et les rôles sans titulaire actif.
3. Décider si les deux responsabilités commerciales historiques doivent être couvertes par les rôles actuels ou par une évolution métier explicite.
4. Vérifier les affectations pédagogiques après régularisation des profils ; un profil enseignant seul ne crée aucun cours.

Cette phase livre un diagnostic ; aucune correction des comptes n'a été appliquée.

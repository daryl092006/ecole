# Régularisation des profils enseignants — 23 octobre 2026

**État : correction appliquée à Supabase après accord explicite, puis vérifiée le 23 octobre 2026 à 14:36:13 UTC.** Les sections de préparation ci-dessous conservent la description du lot approuvé ; le bilan d'application figure en fin de document.

Cette phase fait suite à l'accord de préparer la correction des 19 comptes ENS identifiés dans `AUDIT_ROLES_2026-10-23.md`. Elle ne modifie aucun rôle, aucune migration et aucun script historique protégé.

## Correction préparée

Le lot crée 19 lignes dans `escen.staff` et 19 lignes dans `escen.teachers`, rattachées aux personnes existantes. Il conserve les comptes, leurs liaisons Auth et leurs attributions ENS. Il ne crée aucun contrat ni aucune affectation pédagogique et laisse les spécialités inconnues à `null`.

Les références du personnel suivent le format interne `INT-<UUID v4>` déjà reconnu par `src/utils/staffReference.ts` ; elles ne sont pas présentées comme des matricules métier.

Chaque ligne porte un motif identifiant le compte et l'attribution ENS qui justifient la régularisation. La transaction existante `public.escen_backend_transaction` fournit les 38 événements d'audit avec l'auteur proposé, les valeurs insérées et le motif. Aucun nouveau trigger n'est créé.

L'auteur proposé est l'unique compte Informaticien actif disposant de la permission `staff.manage` et d'une attribution globale. Son identité exacte figure dans le document de relecture privé et doit être confirmée avec le lot avant application.

## Artefacts à relire

Le répertoire privé `/private/tmp/escen-teacher-profile-recovery-20261023/` contient :

- `RELECTURE.md` : liste nominative des 19 comptes, auteur proposé et effet attendu ;
- `plan.json` : identités, attributions existantes et identifiants des nouvelles fiches ;
- `correction.sql` : instruction SQL atomique prête à relire ;
- `validation.json` : résultat de la recette locale et empreinte du SQL.

Révision distante attendue : **16**, relevée le **23 octobre 2026 à 14:26:12 UTC**.

SHA-256 de `correction.sql` :

```text
62b3cb608e434760d7370ef7cb32d2ab2f972a45c242f6ca41cf1fa27d8abd51
```

Les données nominatives restent hors du dépôt, dans un dossier accessible uniquement à son propriétaire (0700, fichiers 0600). Aucun secret Auth n'est enregistré dans les artefacts.

## Contrôles avant et après écriture

Le SQL utilise une instruction `DO` unique : les vérifications, les 38 insertions et les contrôles finaux font partie de la même transaction PostgreSQL. Ce n'est pas une migration de schéma.

Le lot refuse notamment :

- une révision différente de celle de la préparation ;
- un auteur sans compte IT global actif ou sans permission de gestion du personnel ;
- une identité, une liaison Auth ou une attribution ENS différente ;
- un compte ou une personne désactivé/archivé selon les contrôles applicables ;
- une attribution expirée ou un dossier personnel déjà présent ;
- un rattachement de session ou un audit incomplet après insertion.

Les identités et les autorisations sont verrouillées pendant la transaction, avec un délai maximal d'attente de verrou de cinq secondes. Les contraintes d'unicité et le verrou de révision protègent aussi contre une création concurrente. Une seconde application est refusée, sans duplication.

Si la révision ou les comptes évoluent avant l'application, il faut préparer et relire un nouveau lot. Il ne faut pas remplacer manuellement le numéro de révision pour forcer l'ancien SQL.

## Outils livrés

- `scripts/teacher-profile-recovery.mjs` construit un plan borné aux 19 identités auditées et génère uniquement les insertions personnel/enseignant.
- `scripts/prepare-teacher-profile-recovery.mjs` lit le snapshot et les états Auth, effectue une recette PGlite et écrit les artefacts privés. Il n'a **aucune option d'application distante** ; sa seule RPC distante est `escen_backend_snapshot`, en lecture seule.
- `scripts/verify-teacher-profile-recovery.mjs` vérifie la correction et ses refus dans PGlite. Il utilise le véritable `requireAccount`, avec uniquement les transports Auth et base remplacés par des adaptateurs locaux.
- `npm run test:db` inclut maintenant ces contrôles de régularisation, après la suite PostgreSQL existante.

Pour préparer un nouveau lot à partir de l'audit initial, avec un répertoire de sortie encore inexistant :

```bash
node scripts/prepare-teacher-profile-recovery.mjs \
  --audit /private/tmp/escen-role-audit-20261023/identity-snapshot.json \
  --out /private/tmp/escen-teacher-profile-recovery-NOUVEAU_LOT
```

Le script échoue si la liste des 19 comptes, leurs rattachements ou la provenance des attributions ont changé. Les fichiers temporaires doivent être conservés jusqu'à la décision d'application ; leur disparition nécessite une nouvelle préparation.

## Résultats des vérifications

- Recette du lot réel dans PGlite : les 19 enseignants sont refusés avant correction, puis reconnus avec leur nouvel identifiant enseignant après correction ; les 172 comptes actifs passent ensuite le contrôle serveur local.
- Exactement 19 dossiers personnel, 19 profils enseignants et 38 événements d'audit supplémentaires ; une seule incrémentation de révision.
- Identités, comptes, rôles, permissions, attributions et fiches étudiants inchangés. Aucun contrat ni aucune affectation ajouté.
- Échec volontaire sur la dernière insertion : annulation de toutes les insertions précédentes, de leurs audits et de la révision.
- Révision périmée, identité incompatible, auteur invalide, dossier déjà présent et nouvelle tentative après réussite : refus sans écriture partielle.
- `npm test` : workflows réussis, 185 groupes PostgreSQL existants et 10 groupes de recette de régularisation réussis.
- `npx tsc --noEmit --incremental false` : zéro erreur.
- `npm run lint` : zéro erreur, deux avertissements préexistants (`site` et `_tab`).
- Playwright `tests/ui/teacher-management.config.ts` : 20 tests réussis sur les profils, les permissions, les affectations et la validation des formulaires.

Un import `Link` manquant dans des modifications concomitantes de `PortalScreen.tsx` a été ajouté pour débloquer les contrôles globaux. Les autres modifications de ce fichier et du reste de l'espace de travail ont été préservées.

Les vérifications locales ne prétendent pas avoir connecté ces utilisateurs avec leurs mots de passe réels. Les affectations d'enseignement restent un travail distinct : elles ne sont pas déduites du rôle ENS.

## Application distante autorisée et vérifiée

Après l'accord explicite « go » sur le lot présenté, l'empreinte du SQL a été contrôlée à nouveau, ainsi que le projet lié, la révision 16 et les identités des 19 cibles. Le fichier `correction.sql` approuvé a été exécuté une seule fois, sans modification de son contenu. Aucune migration de schéma n'a été appliquée.

| Contrôle distant après application | Résultat |
| --- | --- |
| Révision du portail | 16 → 17 |
| Dossiers personnel créés | 19 |
| Profils enseignants créés et rattachés | 19 |
| Comptes ENS actifs sans profil enseignant | 0 |
| Profils de session des comptes actifs vérifiés par RPC | 172 |
| Compte `a.jean.coach@escen.university` | Profil enseignant rattaché et retourné dans sa session |
| Événements d'audit contrôlés | 38 : 19 pour `staff`, 19 pour `teachers` |
| Audit avec auteur approuvé, action INSERT, motif et valeurs attendus | 38 / 38 |
| Tables métier modifiées dans le snapshot | `staff`, `teachers` uniquement |

Les empreintes de toutes les autres collections du snapshot sont identiques avant et après l'opération, notamment celles des personnes, comptes, rôles, permissions, attributions et étudiants. Les lectures de `escen_account_session` ont confirmé, pour chacun des 172 comptes actifs, l'identité du compte, les attributions présentes et les profils nécessaires selon le rôle. Les 19 identifiants enseignants correspondent exactement au lot approuvé.

Les contrôles TypeScript, ESLint et `npm test` ont été relancés avec succès pendant cette phase : zéro erreur TypeScript/lint, deux avertissements de lint préexistants, 185 groupes PostgreSQL et 10 groupes de régularisation réussis. Les 20 tests Playwright des parcours enseignants avaient été validés pendant la préparation ; aucun code applicatif n'a été modifié pendant l'application distante.

Les preuves privées sont conservées dans le même répertoire de lot : `before-application.json`, `after-application.json`, `verify-application.sql` et `audit-after-application.json`. Le blocage lié au profil manquant est levé pour les 19 enseignants. Une nouvelle tentative de connexion permet de charger les profils rétablis ; aucun mot de passe n'a été changé ou utilisé pour ces contrôles.

# Cours communs — SQL proposé pour relecture

Le fonctionnement « une séance physique, plusieurs groupes » et la répétition
hebdomadaire des quatre grilles sur leurs deux semaines ont été confirmés lors
de la reprise du 4 novembre 2026.

## Livrable et périmètre

Le SQL complet est dans
[`sql-proposals/20261104_shared_course_participants.sql`](sql-proposals/20261104_shared_course_participants.sql).
Il reste hors de `supabase/migrations/`. Aucune ancienne migration n'est modifiée,
aucune base distante n'est touchée. La recette exécute la proposition dans PGlite
jetable après les migrations actuelles.

La proposition ajoute `escen.session_participants`, avec une ligne par affectation
pédagogique participant à la séance. Les colonnes historiques de `sessions` restent
en place pour la compatibilité avec les séances et examens existants. Elles ne
devront pas être utilisées seules pour filtrer ou afficher un cours commun.

Les groupes TC peuvent avoir plusieurs formations : plusieurs rattachements au même
groupe dans une séance sont autorisés, mais une deuxième séance chevauchant ce groupe
est refusée. Chaque affectation conserve sa formation et sa matière de maquette.
Un regroupement exige la même matière référencée, le même enseignant, la même année
et le même site, y compris la cohérence des sites non renseignés. Aucune équivalence
entre libellés de matières n'est inventée.

## Effets du SQL

- Reprise du rattachement de chaque séance existante, y compris annulée, sans changer
  les séances ni les présences historiques ; audit de chaque nouvelle participation.
- Protection de chaque groupe par exclusion PostgreSQL. Les exclusions existantes
  de salle, d'enseignant et de groupe restent présentes.
- Synchronisation transactionnelle des créneaux et de l'état de réservation de tous
  les groupes lorsqu'une séance change. Les dates et semestres de chaque affectation
  sont contrôlés, y compris en cas de réduction ultérieure d'une affectation.
- RPC de création bornée à 2–30 affectations et RPC de déplacement, annulation ou
  remplacement d'enseignant. Chaque commande vérifie les permissions du rôle choisi
  sur **tous** les groupes et la révision attendue. Une erreur annule tout le lot.
- Présence étudiante liée à sa participation et à sa propre formation. La nouvelle
  colonne reste nulle pour les présences anciennes afin de conserver exactement
  leurs statuts, motifs et dates ; le trigger renseigne le lien aux écritures suivantes.
- Adaptation de la RPC délégué : autorisation vérifiée pour chaque étudiant du groupe
  du délégué, sans accès d'écriture aux autres groupes du cours commun.
- RLS sur la nouvelle table, audit existant `record_audit()`, suppression interdite,
  RPC publiques exécutables uniquement par le rôle serveur. Permissions métier
  `schedule.create`, `schedule.update` et `attendance.record` réutilisées.

Le seul retrait de contrainte proposé est celui de
`attendances_session_id_offering_id_fkey`, qui impose la formation historique unique
de la séance. Il est remplacé par une FK vers la séance physique et une FK composée
vers la participation, la séance et la formation. La FK inscription/formation et
l'unicité séance/inscription sont conservées. Aucune ligne métier n'est supprimée.

Les rattachements d'un cours commun ne sont pas modifiables dans cette première
version. Les changements de groupe après émargement sont refusés. Le changement
d'affectation d'une séance simple non émargée reste possible et audité.

## Vérification reproductible

```bash
node scripts/verify-shared-course-proposal.mjs
npx tsc --noEmit --incremental false
npm run lint
npm test
```

Résultat de la relecture locale : **34 contrôles dédiés réussis**, TypeScript sans
erreur, ESLint sans erreur et suite `npm test` réussie sur les migrations actuelles.
Aucun écran n'a été modifié à cette étape ; la recette navigateur multi-groupes
appartient à l'intégration suivante.

La recette dédiée couvre une base déjà peuplée, les parcours API existants de planning
avant/après proposition, les droits SQL, deux formations dans un même cours, les
conflits d'un groupe secondaire, le rollback tardif, les révisions périmées,
les déplacements et annulations, les présences et le délégué du deuxième groupe,
ainsi que le déplacement coordonné d'un examen simple. Elle ne réalise aucun appel
réseau. PGlite ne simule pas plusieurs connexions PostgreSQL concurrentes ; les
exclusions et le verrou de révision sont testés séquentiellement.

## Suite après accord sur ce SQL

1. Ajouter une nouvelle migration sans retoucher les migrations existantes et
   régénérer les deux documents de schéma localement.
2. Adapter ensemble les types, les projections filtrées par rôle et année,
   les routes de planning et de présences et les feuilles du délégué. Chaque
   modification d'un cours commun doit emprunter la RPC qui vérifie tous ses groupes.
   Un accès à une séance commune n'autorise pas la lecture des étudiants des autres groupes.
3. Adapter l'affichage et les formulaires `ReviewedForm` pour présenter tous les groupes
   impactés, puis `portal.refreshCampus()` après mutation. Conserver les parcours d'examens.
4. Tester les parcours API et navigateur multi-groupes, y compris les résultats de
   présence et le filtrage des snapshots. Les assertions comptant exactement les audits
   doivent inclure les nouvelles traces de participation, sans masquer les audits existants.
5. Reprendre les données d'import : maquettes et rattachements de matières, identités
   manquantes et snapshot récent, avant de produire le lot final de 114 cours.

Cette proposition SQL seule ne rend pas l'import disponible dans le portail.
Son ajout aux migrations exige l'accord prévu par AGENTS.md ; aucune application
distante n'est autorisée pendant ce chantier.

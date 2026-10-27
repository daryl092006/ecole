# Présences par le délégué — préparation du 27 octobre 2026

## Périmètre demandé

Le délégué peut faire l’appel des étudiants de son groupe et enregistrer l’arrivée et le départ du professeur de la séance ou de son remplaçant. Il conserve ses droits personnels d’étudiant. Il ne peut pas consulter les autres groupes, décider des justificatifs, attribuer une dispense ou modifier une décision de justification déjà rendue.

Le groupe est déterminé par son inscription et son appartenance au groupe à la date de la séance. Une seule attribution DEL doit couvrir simultanément le site, le groupe et l’année. L’année doit être ouverte ou en clôture pour les écritures. Les séances annulées ou reportées restent non modifiables.

## Application préparée

- Ajout de `attendance.view` et `attendance.record` au catalogue du rôle DEL ; ni `attendance.review` ni `student.view` ne sont ajoutées.
- Accès « Feuilles de présence » via la navigation existante et le raccourci du délégué.
- Saisie des étudiants et du professeur dans l’écran connecté existant, avec récapitulatif ReviewedForm et actualisation du portail après succès.
- Présentation du périmètre ; justificatifs et archives de gestion masqués pour le délégué.
- API filtrée sur ses groupes ; RPC spécifique pour les écritures du délégué avec contrôles SQL prévus.
- Les notes, finances et identités exposées par le snapshot personnel restent personnelles ; les justificatifs privés des camarades sont exclus.

## Migration SQL approuvée et testée en local

`supabase/migrations/202610270054_delegate_attendance.sql` (issue de `docs/proposals/DELEGATE_ATTENDANCE_2026-10-27.sql`) ajoute les deux attributions de permission (`attendance.view`, `attendance.record` au rôle `DEL`) et la RPC transactionnelle `public.escen_delegate_attendance_transaction` contrôlant groupe, année, professeur effectif, champs autorisés et tables autorisées. Elle réutilise les transactions et les triggers d’audit existants.

La migration a été validée dans PGlite local ; aucune application distante n'a été effectuée.

## Vérifications exécutées

- TypeScript (`npx tsc --noEmit --incremental false`) et ESLint (`npm run lint`) : 0 erreur.
- Documentation du schéma régénérée simultanément (`npm run db:describe`) : `docs/SCHEMA_BASE_RELATIONNELLE.json` et `docs/DICTIONNAIRE_BASE_RELATIONNELLE.md`.
- Tests métier et confidentialité du délégué : réussis.
- 43 scénarios Playwright API/interfaces des présences réussis (mobile 390 px et ordinateur 1440 px).
- Recette PostgreSQL dédiée (`scripts/verify-delegate-attendance.mjs` branchée dans `scripts/verify-database.mjs`) : 193 groupes de contrôles PostgreSQL réussis (dont les 7 groupes dédiés au délégué et la révocation de la RPC pour les rôles non privilégiés).

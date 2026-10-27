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

## SQL à approuver

`docs/proposals/DELEGATE_ATTENDANCE_2026-10-27.sql` présente les deux attributions de permission et la RPC transactionnelle contrôlant groupe, année, professeur effectif, champs autorisés et tables autorisées. Elle réutilise les transactions et les triggers d’audit existants.

Aucune nouvelle migration n’a été créée ni appliquée. L’accord demandé dans la conversation reste nécessaire conformément à AGENTS.md. Les droits ne sont donc pas activés en base réelle.

## Vérification de la préparation

- TypeScript et ESLint : sans erreur.
- Tests métier existants : réussite ; test supplémentaire de confidentialité du délégué réussi.
- 41 tests API/interfaces des présences réussis ; les deux tests délégué mobile/ordinateur passent après correction d’une assertion de test sur l’attribut disabled d’une option. Total : 43 scénarios validés.
- Captures dans `tmp/screenshots/delegate-attendance/` à 390 et 1440 px.
- Recette PostgreSQL dédiée préparée dans `scripts/verify-delegate-attendance.mjs` mais non exécutée : elle sera branchée après l’accord SQL, puis vérifiée avec la nouvelle migration dans PGlite.

## Suite après accord

Créer la nouvelle migration datée, brancher et compléter la recette PostgreSQL, corriger les éventuels échecs, régénérer simultanément les deux documents de schéma avec `npm run db:describe`, relancer les vérifications obligatoires et créer le commit local de cette sous-étape. Aucune application distante n’est comprise dans l’accord demandé pour cette validation locale.

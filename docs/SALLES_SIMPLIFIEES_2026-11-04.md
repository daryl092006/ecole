# Salles sans bâtiment ni nombre de places

Demande utilisateur : retirer complètement bâtiments et capacités des parcours applicatifs.

Les formulaires de salles utilisent uniquement code et nom. Les listes de réservation
de cours et d'examens affichent le nom de la salle, sans nombre de places. Les types,
projections et validations applicatives n'exigent plus bâtiment ni capacité. Les
bâtiments ne sont plus fournis par la permission de consultation du planning.
Les conflits de salle, de groupe et d'enseignant, la disponibilité, les dates et l'audit
restent contrôlés.

## Base de données — migration intégrée localement

Site et bâtiment sont déjà facultatifs depuis `202610150028_remove_location_prerequisites.sql`.
La proposition `docs/sql-proposals/20261104_rooms_without_capacity.sql` :

- rend `rooms.capacity` et `exam_rooms.assigned_capacity` facultatifs ;
- retire les contrôles de capacité des séances et des placements d'examen ;
- préserve les colonnes et données historiques, les clés étrangères et les autres contrôles.

Le SQL validé est intégré dans `supabase/migrations/202611040086_rooms_without_capacity.sql`.
La migration est vérifiée dans PGlite local, sans application distante. Les deux documents
de schéma ont été régénérés avec `npm run db:describe`.
**Le déploiement du formulaire simplifié dépend de l'application de cette évolution SQL**.
Aucune ancienne migration n'a été modifiée.

## Vérifications locales

- TypeScript sans incrémental et ESLint.
- Suite `npm test` sur toutes les migrations, y compris 086.
- `node scripts/verify-room-simplification.mjs` : 11 contrôles sur PostgreSQL PGlite
  jetable avec la migration intégrée, dont création par API sans capacité et avec audit,
  conflits de planning conservés, réservations d'examen sans capacité.
- `npx playwright test --config tests/ui/room-simplification.config.ts` : création
  d'une salle à 390 et 1440 px, absence des champs retirés et planning à 390 px.
  Cette configuration utilise le serveur de développement déjà démarré (port 3000
  par défaut, surcharge `ESCEN_ROOM_UI_URL`).

Les 114 cours d'octobre restent à importer. Ne plus demander de bâtiment ni de capacité
pour cet import ; conserver les quatre salles et la règle des cours communs en salle L1.

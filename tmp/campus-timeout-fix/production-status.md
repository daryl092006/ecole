# Incident du portail — 19 novembre 2026

- Migration 202611190118 appliquée et enregistrée en production avec accord utilisateur ; commit local 3d26b45.
- TypeScript, ESLint, npm test et test local de la migration réussis.
- Accord utilisateur distinct pour la mesure opérationnelle suivante, appliquée :

```sql
ALTER ROLE service_role SET statement_timeout = '30s';
NOTIFY pgrst, 'reload config';
```

- Vérification de pg_roles : service_role possède statement_timeout=30s.
- Le premier appel RPC après modification échoue encore : SQLSTATE 57014, 37 153 ms au total côté client.
- La panne n’est pas déclarée résolue. La hausse du délai ne rétablit pas à elle seule le chargement ; la cause de la forte variabilité des temps PostgreSQL reste à établir.
- Aucun mot de passe ni rôle métier modifié lors de cette mesure opérationnelle.

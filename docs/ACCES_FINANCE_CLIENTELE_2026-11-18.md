# Accès financier du Chargé de clientèle — 18 novembre 2026

## Constat et correction autorisée

Les droits `finance.view`, `finance.report.view` et `payment.record` étaient présents dans la définition TypeScript du rôle CC et prévus par la migration historique `202611100100_grant_finance_permissions_to_charge_clientele.sql`, mais absents des permissions effectives de la base en ligne.

L’utilisateur a approuvé le SQL d’ajout des trois associations et son application en ligne le 18 novembre 2026. Les associations manquantes ont été insérées par la passerelle transactionnelle existante `escen_backend_transaction`, avec un administrateur autorisé, le contrôle de révision et le contexte d’audit existant. La révision obtenue est 210.

Seuls les trois liens manquants du rôle CC ont été ajoutés. Les permissions des autres rôles et toutes les attributions individuelles de comptes ont été vérifiées inchangées. La consultation du profil effectif du compte clientèle confirme les trois droits.

## Pérennisation et tests

La nouvelle migration `202611180112_customer_finance_permissions.sql` reprend le SQL approuvé pour régulariser les bases présentant cet écart ; elle est idempotente. Les migrations historiques sont conservées. La mise à jour en ligne a utilisé la passerelle applicative : elle n’a pas enregistré une nouvelle version dans le journal technique des migrations Supabase. Une exécution ultérieure de la migration 112 conservera les associations existantes.

`scripts/verify-customer-finance-permissions.mjs`, inclus dans `npm test`, reproduit l’absence des droits prévue par la migration 100 dans une base PGlite isolée, puis vérifie la correction 112, la lecture du profil effectif, les trois audits, l’idempotence et la conservation des autres rôles et attributions. Aucun accès distant n’est réalisé par ce test.

Les tests `tests/ui/customer-finance-access.spec.ts` vérifient à 390 et 1440 px la rubrique Scolarité et paiements, les pages financières, les rapports et l’ouverture du formulaire de paiement, sans encaissement réel.

La documentation du schéma a été régénérée avec `npm run db:describe` ; aucune modification structurelle n’en résulte. L’application déjà publiée contient les droits TypeScript nécessaires : aucun redéploiement n’est requis pour rendre la correction effective. Le cache serveur des lectures expire après 30 secondes ; une reconnexion permet au navigateur de recharger les capacités du compte.

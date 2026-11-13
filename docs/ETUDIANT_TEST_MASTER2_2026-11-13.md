# Étudiant test Master 2 — 13 novembre 2026

L’utilisateur a demandé un étudiant test de Master 2 puis confirmé la création. Faute de filière précisée, la première option présentée, Finance Digitale, a été annoncée avant exécution.

## Dossier créé

- Identité : prénom `Master 2`, nom `TEST`.
- Matricule automatique : `193-ESC-2026`, calculé par `generateNextStudentMatricule` avec les données vérifiées du snapshot. Les tables du schéma métier n’étant pas directement exposées en REST, la même fonction existante a reçu un adaptateur de lecture du snapshot, sans nouvelle règle de génération.
- Année : 2026-2027, ouverte.
- Formation : Master 2 Finance Digitale ; groupe `Master 2 FD`.
- Inscription : INSCRIT, datée du 13 novembre 2026, avec appartenance au groupe et événement d’inscription.
- Identifiant du portail : `test.master2@escen.university`. Il s’agit uniquement d’un identifiant Auth du portail, sans boîte Microsoft 365 créée.
- Mot de passe initial standard demandé par l’utilisateur, avec changement obligatoire à la première connexion.
- Rôle STUD limité à l’année 2026-2027 et au groupe Master 2 FD. Le compte porte la métadonnée `escen_test_account=true`.

Aucune donnée civile inconnue n’a été inventée. Aucun email personnel, paiement, contrat financier, note ou compte Microsoft 365 n’a été créé. L’adresse Microsoft générée automatiquement à l’insertion est remise à null dans la même transaction, afin de ne pas présenter une adresse Microsoft fictive.

Les huit écritures métier utilisent la RPC transactionnelle existante avec révision vérifiée et acteur administratif habilité `43ce07c4-bb38-5c56-85e6-70e2ffa5b909`. L’intervention est déléguée explicitement par l’utilisateur ; aucune session administrative n’est simulée. Les étapes Auth et métier sont consignées dans `tmp/.env.master2-test-created.json`, exclu de Git.

## Contrôles

- Dossier, inscription, groupe, rôle et session applicative vérifiés après écriture ; absence de contrat financier et d’adresse Microsoft confirmée.
- Connexion réelle sur le portail public réussie : session HTTP 200 pour `193-ESC-2026`, rôle Étudiant, `mustChangePassword=true` ; API campus HTTP 403 avant changement de mot de passe. La session de contrôle a été fermée localement sans personnaliser le mot de passe.
- Aucun changement du code applicatif, déploiement ou migration distante nécessaire. La modification préexistante de `src/app/globals.css` est conservée.
- Vérifications locales obligatoires : TypeScript sans incrémental, ESLint et `npm test` réussis.
- Audit distant : huit événements, une seule transaction, huit événements attribués à l’acteur administratif attendu.

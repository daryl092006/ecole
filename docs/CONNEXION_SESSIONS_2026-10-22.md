# Connexion et sessions — validation du 22 octobre 2026

La connexion distingue les identifiants refusés, la limitation des tentatives et l’indisponibilité du service. Une panne temporaire du chargement du profil conserve la session enregistrée et propose de réessayer sans ressaisir le mot de passe. Un refus d’accès retire la session locale. Le serveur retourne 503 pour une panne Auth et 401 pour un jeton refusé.

Les événements de connexion synchronisent les onglets et rechargent le profil lors d’un changement de compte. La déconnexion utilise la portée locale Supabase. Les liens directs conservent chemin, filtres et fragment après connexion, avec contrôle de l’origine et des droits. Le changement obligatoire de mot de passe garde la priorité. Le formulaire bloque les envois multiples et permet d’afficher ou masquer le mot de passe.

Validation : `npx tsc --noEmit --incremental false`, `npm run lint` (aucune erreur, deux avertissements préexistants), `npm test` (183 groupes PostgreSQL locaux), et 30 tests avec `npx playwright test --config tests/ui/auth-session.config.ts`. Les scénarios navigateur utilisent des réponses de recette interceptées ; ils ne valident pas la disponibilité du service distant. Les captures de connexion et de reprise sont dans `tmp/screenshots/auth-review/`, aux largeurs 360 et 1440 px.

Aucune migration ni opération sur la base distante.

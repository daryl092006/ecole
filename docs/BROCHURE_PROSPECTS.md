# Demandes de brochures et prospects

Le site demande uniquement le nom complet, l’email et le téléphone avant de
présenter le téléchargement choisi. Aucun champ formation n’est demandé ou
enregistré dans le contact. Les associations existantes cycle/filière restent
utilisées pour choisir le bon PDF.

Le formulaire indique que les coordonnées sont conservées pour le suivi ESCEN.
Il n’envoie aucun email, ne crée aucun compte et n’inscrit pas le visiteur.
Les liens PDF restent des ressources publiques ; le formulaire constitue un
parcours de collecte des demandes, pas un mécanisme d’autorisation des fichiers.

## Persistance et accès

- `POST /api/website/public/brochure-requests` : origine autorisée, corps borné,
  validation Zod stricte et limitation existante des écritures publiques.
- La RPC réservée au serveur enregistre dans `escen.website_prospects`, rattache
  le contact à l’année de travail et utilise le trigger d’audit existant.
- Une nouvelle tentative avec le même identifiant de demande ne crée pas de
  doublon, y compris si la première réponse s’est perdue après validation SQL.
- `GET /api/website-prospects` : compte actif, permission
  `website.prospect.view`, attribution globale et filtre par année ; pagination
  par date et identifiant. Accès initial DG, DGA, CC, MKT et IT.
- Consultation dans **Site web → Prospects**, avec email et téléphone cliquables.
  Aucun changement de statut, envoi ou traitement CRM automatique n’est ajouté.
- Les coordonnées sont exclues du snapshot général ; les rôles navigateur ne
  peuvent lire la table ni exécuter directement ses RPC.

## Recette locale

La migration validée est
`supabase/migrations/202611130109_website_brochure_prospects.sql`.
Elle est exécutée uniquement dans PGlite pour la recette de ce chantier.
Les données de test ne sont pas envoyées à Supabase.

```sh
npm test
npm run db:describe
npx tsc --noEmit --incremental false
npm run lint
ESCEN_TEST_WEBSITE_URL=http://127.0.0.1:3200 npx playwright test --config tests/ui/website-prospects.config.ts
```

Les scénarios navigateur utilisent les vraies routes et PostgreSQL local pour
vérifier le formulaire, une réponse perdue, la nouvelle tentative et la
consultation persistante dans le portail à 390 et 1440 px.
Les tests de sélection des brochures simulent uniquement le transport.

## Activation

Le portail hébergé ne dispose pas de cette nouvelle RPC tant que la migration et
l’API ne sont pas publiées. Le site local configuré vers ce portail ne peut donc
pas encore enregistrer de vrais contacts : il conserve les champs et affiche
l’échec, sans annoncer un succès.

La publication du formulaire, de l’API et de la migration doit être coordonnée.
Aucune migration distante ni publication n’est effectuée pendant ce chantier,
conformément à `AGENTS.md`. La recette locale ne vaut pas activation en ligne.

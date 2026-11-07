# Articles publiés absents du site — 7 novembre 2026

## Constat en production (lectures seules)

- `https://escen.university/blogs/` et sa variante www répondent HTTP 200.
- `https://portail.escen.university/api/website/public/blogs` renvoie `[]`, comme le serveur local branché sur la même base.
- La base contient 7 articles `PUBLIE` en 2025–2026 et 1 article `BROUILLON` en 2026–2027.
- L’année de travail est 2026–2027.
- La fonction `escen_website_public_before_offerings` filtre les articles publiés selon l’année de travail. La fonction principale l’appelle et conserve par ailleurs des contrôles sur les formations et les candidatures.
- Les migrations 073 (articles intemporels) et 092 (retrait du motif des articles) ne sont pas inscrites dans l’historique des migrations distantes. Les changements locaux ne sont donc pas entièrement appliqués en production.

## Correction proposée

Le SQL complet est dans `PROPOSITION_SQL_PUBLICATION_ARTICLES_2026-11-07.sql`. Il retire le filtre d’année dans l’enveloppe existante `escen_website_public_before_offerings`. Cette enveloppe continue de déléguer à la fonction qui n’expose que les articles au statut `PUBLIE`. Aucun brouillon ou article retiré n’est publié ; les statuts, années, contenus et auteurs restent inchangés.

La fonction principale de production et ses contrôles des formations/candidatures restent en place. Il n’est pas proposé d’appliquer aveuglément l’ancienne migration 073, qui remplacerait aussi cette fonction principale.

Après validation : créer une nouvelle migration ; tester la chaîne de fonctions de production et le schéma local complet, les années distinctes, les brouillons/retirés et les permissions ; appliquer uniquement cette migration distante si l’utilisateur autorise explicitement l’exception à la règle locale d’AGENTS.md ; contrôler les API publiques et le rendu du site.

Aucun changement distant effectué lors du diagnostic. L’utilisateur a ensuite autorisé explicitement les tests locaux puis l’application de ce SQL en production (« go »).

## Validation locale avant application

La nouvelle migration `202611070093_public_articles_all_years.sql` reprend exactement le SQL approuvé. Le test `scripts/verify-public-article-visibility.mjs` reconstruit la chaîne de production sans la migration 073, reproduit la liste vide puis vérifie sa correction. Il contrôle les publications anciennes et actuelles, l’exclusion des brouillons et retraits, les droits de fonction, l’identité de la fonction principale, les données et audits inchangés ainsi que la réexécution. Il est intégré à `npm test`.

TypeScript, ESLint, suite `npm test` complète et 10 tests Playwright articles réussis. Le schéma documentaire a été régénéré ; aucune structure de table ne change.

## Application et contrôle en production

La migration 093 a été appliquée seule, après les vérifications locales, avec garde sur l’empreinte des fonctions, vérification de la liste publique dans la transaction et enregistrement atomique dans `supabase_migrations.schema_migrations`. La transaction a confirmé 7 articles publics. Les autres migrations locales en attente n’ont pas été appliquées.

- La base conserve ses 8 articles, dont 7 publiés et 1 brouillon. L’empreinte de toutes les lignes articles est identique avant/après : `b9a63a6425005ac30f2184cf266a62f3`.
- L’année de travail reste 2026–2027.
- Les fonctions principale et de base, leurs droits, leurs propriétaires et leur `search_path` restent identiques. Seul le corps de l’enveloppe retirant le filtre annuel change.
- L’API publique renvoie 7 articles, avec l’origine CORS `https://escen.university` autorisée.
- Le navigateur Chrome confirme le chargement des 7 articles et l’affichage du premier sur `https://escen.university/blogs/`, aux largeurs 390 et 1440 px. Les liens d’articles sont présents et l’API de détail du premier article répond HTTP 200 avec le bon identifiant.
- Captures : `tmp/screenshots/public-article-publication/blogs-390.png` et `blogs-1440.png`.

Le correctif ne nécessite ni reconstruction du site ni déploiement du portail : les pages existantes rechargent leur liste depuis l’API publique. Le code et le bilan sont conservés dans des commits locaux, sans push GitHub.

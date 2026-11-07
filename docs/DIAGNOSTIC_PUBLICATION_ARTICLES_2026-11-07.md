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

Application distante prévue uniquement pour 093, avec garde sur l’empreinte des deux fonctions concernées, vérification de la liste publique dans la transaction et enregistrement atomique dans l’historique des migrations. Les autres migrations locales en attente ne font pas partie de cette autorisation.

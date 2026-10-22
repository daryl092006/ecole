# Identité du site, SEO et lisibilité des contenus — 22 octobre 2026

## Identité commune au site et au portail

Le fichier `public/logo-escen.png` du portail constitue la source de l’identité graphique. Le script d’interconnexion le copie sans le modifier dans le site. `WebsiteLogo.vue` l’affiche avec des proportions conservées, une largeur adaptée au contexte et une variante CSS blanche sur les fonds foncés.

Les anciennes images des en-têtes, pieds de page, menu mobile, formulaire de candidature et pages candidat sont remplacées par ce composant. Le lien vers le portail conserve la même identité. Le favicon et le logo déclaré dans les données structurées utilisent également cette source. Aucun logo n’a été généré par IA.

La candidature affiche maintenant un état de chargement distinct d’une campagne fermée. Les quatre libellés d’étapes restent séparés sur mobile. Les validations, les formations et les droits existants ne sont pas modifiés.

## Métadonnées de toutes les pages de contenu

`scripts/website-seo.mjs` produit des titres et descriptions propres à chaque page. Les contenus institutionnels (accueil, contact, brochures, catégories de formations, actualités et documents d’information) disposent de résumés spécifiques. Pour les formations, les informations proviennent des titres, descriptions et durées déjà affichés dans leur page.

Le HTML exporté contient les métadonnées, sans attendre JavaScript : titre, description, URL canonique sans paramètres, Open Graph, cartes de partage et données structurées JSON-LD. Les formulaires et parcours personnels restent `noindex`. L’ancienne page de préparation est un alias de la candidature, sans contenu indépendant à indexer.

Les entités relient explicitement l’établissement, le site et ses pages :

- `EducationalOrganization` : nom de l’école, logo, Lomé/Togo, téléphone, email et liens institutionnels déjà présents sur le site ;
- `WebSite` et `WebPage`, avec `ContactPage` ou `CollectionPage` selon le contenu ;
- `Course` sur les neuf formations détaillées, avec la durée lorsqu’elle est explicitement renseignée ;
- `ItemList` sur les catalogues de formations ;
- `BreadcrumbList` sur les formations et les articles ;
- `BlogPosting` pour les publications, avec titre, résumé, date disponible, image et éditeur ESCEN.

Aucune accréditation, statistique d’insertion, tarif ou réponse d’admission n’a été inventé pour le balisage. Les fichiers JSON-LD sont parsés et contrôlés dans les tests.

## Contenus publics réellement présents dans le HTML

Les pages d’articles et leur liste chargent leurs données publiques avant le rendu serveur. La découverte des routes part exclusivement du catalogue public `/api/website/public/blogs` ; les brouillons et données des candidats ne sont pas exportés. Les sept articles présents lors de cette recette sont prérendus avec un seul H1, leurs métadonnées et leur route dans le sitemap.

La page brochures rend également le catalogue de PDF dans son HTML. Le navigateur revalide ce catalogue après hydratation et le téléchargement revérifie la publication côté serveur. Le cache de l’hydratation ne doit pas absorber cette revalidation : un test modifie le catalogue côté API isolée pour vérifier qu’il est bien relu.

Le site reste un export statique. Les lectures côté navigateur continuent de suivre l’API du portail ; les textes du HTML initial et le sitemap reflètent la dernière génération. Après publication, modification ou retrait d’un article, régénérer puis republier le site pour actualiser aussi cette version destinée aux robots et aux aperçus de partage. Ne pas présenter cet export comme un serveur de rendu dynamique en production.

## Génération et publication

La génération échoue désormais sur les pages en erreur. Cela a permis de corriger des liens vers `/politique-confidentialite` (la page réelle est `/confidentialite`) et de rendre non cliquable une URL d’hébergeur encore à renseigner. Les informations juridiques manquantes doivent être fournies par l’établissement ; aucun hébergeur n’a été supposé.

La préparation production refuse un catalogue d’articles inaccessible ou invalide. Le contrôle avant publication vérifie également que les articles attendus disposent de leur fichier HTML et de leurs métadonnées éditoriales. Les origines HTTPS du site et du portail doivent être renseignées explicitement ; le build local reste interdit à la publication.

Commandes depuis le portail, puis depuis le site :

```sh
node scripts/connect-website.mjs
# Dans ../escen-website
npm run generate
node scripts/verify-connection.mjs --local
```

En production, utiliser les origines publiques réelles et omettre `--local` dans le contrôle. Les règles de CORS du portail doivent autoriser exactement l’origine du site.

## SEO, GEO et limites vérifiables

Le travail porte sur l’accessibilité du contenu, son identité, sa cohérence et son balisage. Les moteurs restent libres de l’indexer et de le citer ; aucun score de visibilité IA n’a été mesuré ou promis. Google indique qu’il n’existe pas de balisage spécial requis pour ses fonctionnalités d’IA : les bases SEO et la cohérence entre contenu et données structurées restent pertinentes.

Références : [fonctionnalités IA et sites web](https://developers.google.com/search/docs/appearance/ai-features), [organisation et logo](https://developers.google.com/search/docs/appearance/structured-data/organization), [formations](https://developers.google.com/search/docs/appearance/structured-data/course), [fils d’Ariane](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).

Le filtrage HTTP 406 observé sur le domaine publié relève toujours de l’hébergement. Ces corrections locales ne lèvent pas une règle WAF distante. Les exports Search Console/Analytics et les journaux de l’hébergeur restent nécessaires pour vérifier les résultats en production.

## Recette

Les contrôles portent sur les métadonnées du HTML initial de chaque page statique de contenu, les sept articles publics, les listes de formations et le catalogue PDF. Les tests de logo comparent l’empreinte du fichier servi avec celle du portail et contrôlent ses proportions et la largeur de la page à 390 et 1440 px. Les captures de la candidature sur mobile et ordinateur ont été relues.

Les écritures des tests de candidatures et de publication restent isolées. Aucune mutation ni migration n’est exécutée sur la base distante.

Résultats : génération statique réussie (77 routes), contrôle de l’interconnexion réussi (374 fichiers et articles attendus), 3 tests Node réussis et 56 tests Playwright réussis à 390 et 1440 px. Le contrôle des métadonnées parcourt les 25 pages statiques de contenu et les 7 articles ; l’alias de préparation n’est pas traité comme une page indépendante. Les neuf formations disposent d’un balisage `Course`. TypeScript ne signale aucune erreur ; ESLint ne signale aucune erreur et conserve les deux avertissements antérieurs hors de ce chantier.

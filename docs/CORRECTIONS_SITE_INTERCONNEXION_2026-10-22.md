# Site public et portail : corrections du 22 octobre 2026

## Périmètre

Les corrections sont versionnées dans `scripts/connect-website.mjs`, `scripts/website-release.mjs`, l’adaptateur et leurs templates. Elles sont appliquées à la copie sœur `../escen-website`, puis compilées dans son dossier `dist`. L’original Downloads, les migrations, les données et les documents normatifs ne sont pas modifiés.

La version publiée de `escen.university` est encore différente : ses candidatures appellent `escen.neostart.tech`, sa connexion affiche l’ancien accès candidat et `/brochures` affiche l’accueil. Aucun déploiement ni aucune écriture de recette distante n’a été effectué.

## Corrections

- Modes local et production explicites. La production exige les deux origines HTTPS publiques ; une configuration locale ne peut pas franchir le contrôle de publication.
- Site local → API du portail `/api/website` pour les brochures, publications et candidatures. Connexion → portail `/connexion`. Les anciens chemins `/candidat/*` redirigent vers cet accès ; les anciens comptes candidats ne deviennent pas des comptes du portail.
- Brochure filtrée par cycle et code de filière ; absence de document explicite, sans proposer la brochure d’un autre cycle. Catalogue complet sur `/brochures`. Délai maximum de chargement, reprise et fermeture clavier avec restitution du focus.
- Titres et descriptions propres aux formations, présents dans le HTML initial ; URL canonique sans filtres ; image de partage sur le domaine du site ; données structurées `EducationalOrganization` et `Course` fondées sur les titres existants. Aucune nouvelle formation, reconnaissance ou statistique institutionnelle n’est inventée.
- Sitemap des pages publiques et `noindex` sur les parcours personnels. Les formations avaient déjà une page et un H1 : ils sont conservés.
- Deux actions stables sur le bandeau d’accueil : « Nos formations » et « Candidater ». Les brochures restent accessibles depuis le pied de page et les pages de formation ; lien WhatsApp utilisant le numéro déjà présent sur le site. Aucun traçage supplémentaire et aucune collecte de contacts pour télécharger un PDF.
- Références de fonds de formation corrigées vers les images existantes, chargement différé des images de présentation et témoignages, compression et cache des ressources statiques prévus dans `.htaccess`.
- Export Apache avec pages réelles et erreur 404, sans repli des URL inconnues vers l’accueil. Workflow FTP corrigé pour publier `dist`, précédé d’un contrôle du build et de ses origines.
- Requêtes Axios bornées à 20 secondes ; géolocalisation facultative bornée à 3 secondes. Un téléphone saisi reste récupérable si son widget n’est pas encore initialisé. Le test choisit explicitement la nationalité, sans dépendre du délai de géolocalisation.

## Reproduire la liaison locale

Depuis `ecole` :

```sh
node scripts/connect-website.mjs
```

Depuis `escen-website` :

```sh
npm run generate
node scripts/verify-connection.mjs --local
```

Puis lancer `../LANCER.command` ou `node scripts/start-local-project.mjs` depuis `ecole`.

- Site : `http://localhost:3200`
- Portail : `http://127.0.0.1:3000`
- Origine autorisée côté portail : `ESCEN_WEBSITE_URL=http://localhost:3200`

Le site statique doit être régénéré après une modification de ses sources. La commande d’adaptation peut être répétée : elle conserve les corrections versionnées. Ne pas remplacer ses fichiers par une copie de l’ancien site.

## Préparer une publication

Il manque encore l’adresse HTTPS réelle du portail et l’accès à l’hébergement. Ne pas inventer un sous-domaine et ne pas publier le build local.

Depuis `ecole`, remplacer les deux valeurs ci-dessous par les origines réellement provisionnées :

```sh
ESCEN_WEBSITE_MODE=production \
ESCEN_PORTAL_URL=https://ADRESSE_REELLE_DU_PORTAIL \
ESCEN_PUBLIC_SITE_URL=https://escen.university \
node scripts/connect-website.mjs
```

Configurer aussi le portail avec `ESCEN_WEBSITE_URL=https://escen.university` au build et à l’exécution. Ce domaine doit correspondre exactement au domaine servi (avec ou sans `www`). Les secrets Supabase restent exclusivement sur le serveur du portail.

Depuis `escen-website`, exécuter `npm run generate`, puis `node scripts/verify-connection.mjs`. Ce contrôle vérifie les pages exportées, le sitemap, la connexion, les adresses locales résiduelles et les références à l’ancienne API. Le workflow ne doit envoyer que ce `dist` validé. La préparation production remplace la configuration de la copie : réexécuter la préparation locale et sa génération pour reprendre le travail local ensuite.

Après publication : contrôler le catalogue et un téléchargement réel, l’aller-retour vers le portail et la configuration publique des candidatures. La création d’un dossier réel relève d’une recette explicitement autorisée ; les tests automatisés isolent les écritures.

## Limites de l’audit et de la correction locale

- HTTP 406 reproduit avec des clients HTTP, tandis que Chrome reçoit 200 sur l’accueil, robots.txt et sitemap.xml. La règle exacte nécessite les journaux Apache/ModSecurity/WAF. Le `.htaccess` fourni ne désactive pas le pare-feu : faire corriger la règle précise par l’hébergeur, puis retester les clients et les outils de recherche. Le blocage de Googlebot lui-même n’a pas été démontré.
- Les métriques DR, backlinks, trafic, rebond et visibilité IA du rapport n’ont pas été reconstituées. Leur validation nécessite les exports datés et les accès Search Console/Analytics. Aucune campagne de désaveu ni promesse de classement n’est effectuée.
- Les articles sont chargés par API. Leur mise en index complète sur cet hébergement statique reste un chantier distinct de rendu/prérendu des publications dynamiques ; les métadonnées des pages de formation sont, elles, présentes dans le HTML exporté.
- Les formulaires de newsletter/commentaires et les services historiques hors brochures, publications, candidatures et accès au portail ne sont pas ajoutés à l’API par cette correction.
- La réception d’une candidature ne crée ni étudiant officiel, ni inscription annuelle, ni paiement, ni compte utilisateur.

## Vérification

```sh
node --test scripts/website-release.test.mjs
npx tsc --noEmit --incremental false
npm run lint
npm test
npx playwright test --config tests/ui/website-review.config.ts
```

Les captures de recette sont dans `tmp/screenshots/website-review/`. Les écritures des scénarios navigateur sont simulées ; les lectures réelles du catalogue, des fichiers et des publications ne créent aucune donnée de recette.

Résultats : génération statique réussie (63 routes), contrôle local du build réussi (367 fichiers), refus du build local par le contrôle de publication confirmé, 2 tests de configuration réussis, TypeScript sans erreur, ESLint sans erreur (2 avertissements préexistants hors de ce chantier), workflows et 182 groupes PostgreSQL réussis, 45 tests navigateur réussis à 390 et 1440 px. Les 9 brochures ont été téléchargées en lecture réelle depuis l’API du portail local : HTTP 200 et signature PDF vérifiée. La capture finale de l’accueil mobile a été relue.

Simplification du bandeau après retour utilisateur : retrait de la rangée ajoutée « Télécharger une brochure / Postuler en ligne » et remplacement du libellé trompeur « Notre pédagogie » qui menait aux formations. Chaque diapositive conserve exactement « Nos formations » et « Candidater ». Les brochures restent dans le pied de page et sur les formations. Nouvelle génération et contrôle local réussis ; 9 tests ciblés réussis, puis vérification des trois diapositives aux deux largeurs réussie. TypeScript et ESLint restent sans erreur.

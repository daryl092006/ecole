# Inscriptions et articles entre le site et la plateforme

État au 15 octobre 2026. La copie de travail est `.tmp/escen-website`, issue de `~/Downloads/escen-website`. L’original est intact. Les secrets, historique Git et anciens builds ont été exclus de la copie initiale. La copie n’est pas publiée sur Internet.

## Parcours disponibles

### Inscriptions en ligne : site → plateforme

Le formulaire existant `/inscription` conserve ses quatre étapes : identité et coordonnées, dernier diplôme, niveau/filière et pièces, puis parents/tuteurs et consentement. Le diplôme est déclaré en texte libre, sans inventer un catalogue de diplômes ni assimiler les identifiants de l’ancienne API aux nouvelles références.

Depuis **Étudiants → Liste des étudiants → Inscriptions en ligne**, un rôle global autorisé configure explicitement les formations proposées : niveau et filière canoniques, libellé, ouverture et pièces obligatoires. Il faut d’abord créer ou reprendre ces références officielles dans les référentiels s’il n’en existe pas. Aucune formation fictive n’est créée pour rendre le formulaire disponible.

Les brouillons possèdent un jeton aléatoire de 256 bits, stocké uniquement sous forme de SHA-256 en base. Ils sont reprenables pendant sept jours. La soumission finale est idempotente : un second envoi conserve la même référence. Une fois soumis, le dossier n’est plus modifiable avec ce jeton.

Les dossiers envoyés apparaissent dans le panneau de réception : identité, contacts, diplôme déclaré, tuteurs et pièces. Le suivi interne propose « Reçu », « En analyse » et « Classé », avec motif et version concurrente. Il ne vaut pas décision d’admission et ne crée pas de dossier étudiant officiel, inscription annuelle, paiement, compte Auth ou rôle. Ces décisions restent séparées.

Les pièces sont privées dans le bucket `escen-online-applications` : PDF, JPEG ou PNG, contrôle de signature et MIME, 5 Mo par pièce, envoi borné et maximum de 24 pièces par dossier. Le téléchargement interne exige une session autorisée puis un lien signé valable 60 secondes. Aucune URL publique de dossier ou de pièce n’est renvoyée au site.

### Articles : plateforme → site

Depuis **Communication → Actualités institutionnelles**, un rôle disposant de `communication.manage` et d’un accès global rédige un article, son adresse, résumé, contenu et éventuellement une URL HTTPS de couverture. La relecture précède la confirmation d’enregistrement. Les états sont « Brouillon privé », « Publié sur le site » et « Retiré du site ».

La liste `/blogs` et la page `/blogs/<adresse>` de la copie chargent les publications de la plateforme. Les brouillons et les articles retirés restent privés. Les révisions et retraits conservent les valeurs avant/après, l’auteur, ses rôles, le motif et l’heure dans l’audit. Le contenu est écrit en texte simple puis échappé côté serveur avant son affichage HTML sur le site. Les anciennes publications restent consultables via « Consulter les archives ».

## Configuration

Depuis la racine du portail :

```sh
node scripts/connect-website.mjs
```

La commande refuse un dossier de copie remplacé par un lien symbolique. `ESCEN_PORTAL_URL` définit l’origine du portail (par défaut `http://127.0.0.1:3000`). `ESCEN_WEBSITE_SOURCE` permet de changer le chemin de l’original. Les adaptations du formulaire sont régénérées depuis l’original à chaque exécution ; ne pas y ajouter manuellement des modifications à conserver sans les reporter dans `scripts/website-adapter.mjs`.

Le client Axios de la copie appelle exclusivement `/api/website` sur le portail. Il n’utilise plus l’ancienne API et ne transmet aucun ancien jeton candidat. Les fonctions de l’ancien site hors inscriptions et articles, comme les commentaires ou la newsletter, ne sont pas reliées par ce changement.

Lancer le portail avec l’origine exacte du site autorisée :

```sh
WATCHPACK_POLLING=true ESCEN_WEBSITE_URL=http://localhost:3200 npm run dev -- --hostname 127.0.0.1 --port 3000
```

`ESCEN_WEBSITE_URL` contrôle l’origine des écritures publiques et CORS, et fournit le lien de retour du portail. Pour une compilation de production, la définir aussi pendant `npm run build`, car les pages de connexion sont prérendues. Aucune clé serveur ne doit figurer dans la copie du site.

Les écritures publiques sont limitées en base à 120 requêtes par heure. Sans proxy de confiance déclaré, la limite est partagée. `ESCEN_TRUSTED_IP_HEADER` ne doit être défini que si le proxy d’hébergement écrase réellement cet en-tête : il permet alors une limite par adresse client. En déploiement, adapter ces limites à la charge attendue et recetter le proxy.

La migration additive `202610150022_website_exchange.sql` est appliquée à Supabase. Elle crée quatre tables métier et deux tables privées, ainsi que le bucket privé. La RLS reste fermée et les RPC réservées au serveur ; seuls les endpoints publics explicitement bornés exposent les articles publiés et reçoivent les dossiers.

Pour servir la copie sans atteindre la limite macOS des fichiers surveillés :

```sh
cd .tmp/escen-website
npm run build
python3 -m http.server 3200 --bind 127.0.0.1 --directory dist
```

## Vérification

```sh
npm run lint
npm run build
npm run test
ESCEN_TEST_WEBSITE_URL=http://localhost:3200 npm run test:ui -- tests/ui/website-exchange.spec.ts
npm run db:verify:remote
```

Les tests PostgreSQL couvrent les accès, les brouillons, la finalisation, les pièces exigées, l’absence de création de comptes, la concurrence, les publications/retraits et l’audit. La recette navigateur utilise des données et API isolées pour les écrans internes et le formulaire original adapté, à 390 et 1440 pixels. Elle ne soumet aucun dossier fictif à la base distante.

Le contrôle distant confirme 24 migrations, 109 tables métier, 13 tables privées, les 15 566 lignes historiques conservées et le refus des fonctions anonymes. Le site original en ligne n’a pas été modifié : seule sa copie locale utilise ces échanges.

Résultats de la recette finale : lint, builds du portail et de la copie réussis ; assertions métier et 34 groupes PostgreSQL réussis ; 36 tests navigateur de régression du portail réussis, puis dix tests de navigation et d’échange site/plateforme réussis. Les captures des articles et dossiers reçus ont été relues à la largeur mobile. Les tests incluent les erreurs de concurrence, le maintien des valeurs saisies et les refus HTTP sans session, origine autorisée ou jeton valide.

La copie cible explicitement `127.0.0.1:3000` pour éviter un autre serveur local écoutant sur `localhost` en IPv6. Les contrôles CORS doivent être vérifiés sur cette même adresse.

La dernière recette confirme aussi la lecture HTTP réelle des articles depuis l’origine de la copie, avec la réponse CORS attendue ; ce contrôle est en lecture seule sur Supabase.

La migration 23 exige une année universitaire ouverte pour chaque nouvelle campagne. Le site affiche uniquement les formations de l’année de travail officielle. Le brouillon conserve son année lors de sa création ; un changement de campagne ne le transfère pas. Les campagnes historiques sans année restent conservées, sans attribution inventée. La désignation initiale reste une action institutionnelle explicite. Voir [Année de travail](ANNEE_DE_TRAVAIL.md).

La migration 24 rattache également les articles à leur année. Le serveur filtre la gestion selon l’année consultée, exige une année précise pour les écritures et expose sur le site les articles publiés de l’année de travail officielle. Les anciens articles sans année restent conservés pour reprise explicite.

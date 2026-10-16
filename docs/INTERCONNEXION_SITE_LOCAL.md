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

## Extension du 16 octobre 2026 : brochures PDF

La copie existante `.tmp/escen-website` est réutilisée ; aucun fichier de l’original dans Downloads n’est modifié. Les adaptations versionnées restent dans `scripts/website-adapter.mjs` et `scripts/website-templates/` et sont réappliquées par `node scripts/connect-website.mjs`.

**Communication → Actualités institutionnelles → Brochures du site** permet d’ajouter un PDF (10 Mo maximum), son titre, son adresse et sa description. Après relecture, la brochure peut rester en brouillon, être publiée ou retirée. La modification conserve les anciennes valeurs dans l’audit ; remplacer un PDF ne supprime pas l’ancien fichier. Une version concurrente est refusée et les informations du formulaire restent disponibles.

La migration additive `202610160031_website_brochures.sql` crée `escen.website_brochures` et le bucket privé `escen-website-brochures`. Les RPC ne sont exécutables que par le serveur. Les droits de communication et l’attribution globale réelle sont vérifiés côté serveur et en SQL. La liste générale du campus exclut les brochures. La gestion suit l’année consultée ; le site expose uniquement les brochures publiées de l’année de travail officielle, comme les articles. Aucun PDF d’exemple n’est publié automatiquement.

Sur la copie, `/brochures` et les fenêtres de téléchargement des formations chargent le catalogue publié. Aucun rapprochement implicite par nom de formation n’est effectué : l’utilisateur choisit le document dans le catalogue. La fenêtre ne collecte plus de coordonnées et n’appelle plus l’ancien endpoint de prospects. Le téléchargement passe par `/api/website/public/brochures/<adresse>/download`, qui revérifie la publication avant de servir le PDF en pièce jointe. Les chemins Storage et URLs signées ne sont pas exposés. Un retrait empêche les nouveaux téléchargements ; les fichiers déjà téléchargés restent évidemment chez leurs destinataires.

Les demandes d’inscription en ligne restent dans `online_applications`, distinctes des dossiers étudiants, inscriptions académiques, comptes et contrats. Leur suivi ne crée aucune de ces entités. La recette SQL vérifie cette séparation.

Déploiement ciblé, sans rejouer les autres migrations du dépôt :

```sh
node scripts/apply-website-brochures.mjs
node scripts/apply-website-brochures.mjs --apply
```

Le script refuse un état distant inattendu et enregistre la migration dans la même transaction. La première commande vérifie uniquement les prérequis ; la seconde crée le schéma, sans publier de contenu.

Recette, avec le portail sur 127.0.0.1:3000 et la copie sur localhost:3200 :

```sh
npm run test
npm run lint
npm run build
ESCEN_TEST_WEBSITE_URL=http://localhost:3200 npm run test:ui -- tests/ui/website-brochures.spec.ts tests/ui/website-exchange.spec.ts tests/ui/website-connection.spec.ts
```

Les écritures de recette navigateur utilisent des API isolées. Le dernier contrôle des articles est une lecture réelle et exige `ESCEN_WEBSITE_URL=http://localhost:3200` sur le portail. Les tests de brochures couvrent confirmation, transfert PDF, publication, retrait, erreur concurrente et téléchargement aux deux largeurs.

La migration 31 a été appliquée au projet lié le 16 octobre 2026. Vérification distante : catalogue HTTP accessible avec l’origine locale autorisée, bucket privé et appels RPC anonymes refusés. Aucun article, brochure ou dossier de recette n’a été créé à distance.

La page `/brochures` affiche directement le catalogue, sans fenêtre intermédiaire. Les boutons des pages de formation réutilisent ce catalogue dans leur fenêtre de téléchargement.

## Emplacement commun

Les projets sont désormais regroupés dans `/Users/gdenis/escen-projet/` : `ecole/` pour le portail et `escen-website/` pour la copie du site. L’original Downloads reste intact. Les anciens chemins sont conservés comme liens de compatibilité. `scripts/connect-website.mjs` privilégie désormais la copie sœur réelle et refuse toujours une cible remplacée par un lien symbolique.

Double-cliquer sur `../LANCER.command` ou exécuter `node scripts/start-local-project.mjs` depuis le portail pour démarrer les serveurs manquants. Le site utilise son build `dist` ; après modification de ses sources, exécuter `npm run build` depuis `../escen-website`. Ouvrir le nouveau dossier `ecole` dans l’outil de développement pour utiliser son emplacement réel.

## Niveaux et filières de l’année active (migration 32)

La liste publique provient désormais des formations exactes (`academic_offerings → curricula → programs`, avec `level_id`) de l’année de travail ouverte. Les campagnes manquantes sont créées automatiquement à l’activation d’une année ou lors de la modification de ses formations/références. Les campagnes déjà configurées conservent leur ouverture/fermeture et leurs pièces obligatoires ; aucune exigence documentaire n’est inventée pour les nouvelles campagnes. Les formations archivées sont exclues à la lecture et refusées lors de l’envoi des pièces ou de la finalisation. Les demandes existantes conservent leur année d’origine.

La migration `202610160032_website_annual_offerings.sql` est appliquée. La vérification distante du 16 octobre retourne six niveaux pour l’année active 2025-2026. Les formations de 2026-2027, encore en brouillon, ne sont pas affichées.

Le formulaire attend la configuration annuelle avant les niveaux et la reprise du brouillon. La fenêtre préparatoire indique l’année, le chargement, l’absence de niveaux ou une erreur avec reprise. Recette : `ESCEN_TEST_WEBSITE_URL=http://localhost:3200 npm run test:ui -- tests/ui/website-levels.spec.ts tests/ui/website-exchange.spec.ts`.

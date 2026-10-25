# Reprise de la revue visuelle ESCEN — 24–25 octobre 2026

## Pourquoi reprendre

Le premier passage harmonisait surtout les styles communs. Son audit automatique
ne démontrait pas une visite visuelle complète : plusieurs URL de catalogue
ouvraient le même écran et deux réponses de test incorrectes produisaient des
écrans d’erreur non rejetés. Le rapport précédent a été rectifié.

## Parcours effectué

Le parcours couvre les entrées de `PORTAL_ROUTES`, les quatre accueils de module,
un dossier étudiant, l’accueil avec un rôle étudiant et les quatre pages
d’authentification. Les anciennes URL évaluations et rattrapages sont conservées
dans l’inventaire comme redirections, pas comptées comme des écrans indépendants.

Les captures ont été examinées sur téléphone (390 px) et ordinateur (1440 px),
en haut et en bas des contenus défilants. Les sous-onglets disponibles, fenêtres
de consultation/création/édition accessibles, sélection d’un programme,
répertoire déplié, rubriques du référentiel et cinq étapes de préparation de
l’année ont également été ouverts. Les copies d’écran et index JSON sont dans
`tmp/screenshots/page-by-page-review/390/` et `1440/`.

La redirection de `/` vers la connexion et la page 404 ont été vérifiées
séparément aux deux largeurs : [404 téléphone](../tmp/screenshots/page-by-page-review/390/404.png)
et [404 ordinateur](../tmp/screenshots/page-by-page-review/1440/404.png).

Les captures du premier audit ont aussi été relues en planches pour identifier
les défauts que le contrôle des dimensions seul ne détectait pas.

## Corrections issues de cette lecture

| Écran ou composant | Défaut observé | Correction |
| --- | --- | --- |
| Rôles ESCEN sur ordinateur | Sélecteur mobile visible et grille décalée | Sélecteur limité au mobile, cartes réalignées |
| Matrice des permissions sur téléphone | Tableau serré et lecture latérale | Présentation en fiches, texte et badges adaptés |
| Année scolaire | Actions trop empilées sur téléphone | Groupe d’actions avec retour à la ligne |
| Planning, présences, programmes | Cartes successives collées | Espacement entre sections et descriptions |
| Examens | Choix de session irréguliers sur téléphone | Trois commandes de même largeur |
| Saisie des notes | Libellés et valeurs des compteurs collés, styles absents | Compteurs en cartes, disposition adaptée à la largeur |
| Saisie des notes | Terme technique « Workflow » | « Étapes de validation des notes » |
| Finance : contrats et paiements | Texte et action de démarrage trop proches | Carte de démarrage espacée et repérée |
| Articles du site | Descriptions, statut et action tassés | Rythme vertical et tailles harmonisés |
| Admissions / formations du site | Introduction et actualisation collées | Espacement des blocs |
| Suivi des mails | Titre et descriptions différents des autres pages | Typographie et marges harmonisées |
| Accueil étudiant | Titre générique de gestion | « Mon espace étudiant » et description adaptée |
| Communication | Colonne « all accounts » | Libellé français « Tous les comptes » |
| En-têtes de cartes mobiles | Alignement central incohérent | Alignement à gauche |
| Tests Personnel et Données | Mauvaise forme de réponse historique | Réponse paginée conforme et rejet des écrans d’erreur |

Le logo et les couleurs existantes sont conservés. La charte officielle n’étant
pas fournie, la conformité complète à cette charte reste à vérifier lorsqu’elle
sera disponible.

## Vérifications

- Compilation de production réussie dans `tmp/next-page-review-build`.
- `npx tsc --noEmit --incremental false` : aucune erreur.
- `npm run lint` : aucune erreur ; deux avertissements préexistants
  (`site` dans `verify-academic-years.mjs`, `_tab` dans `PortalScreen.tsx`).
- Présentation et responsive : 17 tests réussis, largeurs 360, 390, 768, 769,
  1024 et 1440 px selon les cas.
- Fenêtres et confirmations : 11 tests réussis, comprenant notes, paiement,
  inscription, article et protection contre la perte de saisie.
- Parcours page par page : deux tests (390 et 1440 px), plus un test des routes
  d’entrée et de la page introuvable aux deux largeurs.

## Limites précises

La navigation est locale avec des réponses API de test déterministes. Elle ne
prouve pas tous les cas possibles de données réelles, de permissions cumulées,
d’archives ou de documents téléchargés. Les formulaires accessibles sont ouverts
sans soumission dans le parcours visuel ; les confirmations et sauvegardes
simulées sont vérifiées séparément par les tests de fenêtres. Aucune écriture
distante, migration ou publication n’a été réalisée. Les rubriques consultatives
restent présentées avec leurs limites existantes.

## Inventaire des captures

L’index final ci-dessous est issu des rapports du parcours. Chaque lien mène à
la capture initiale ; le JSON associé fournit les états supplémentaires et les
captures en bas de page.
<!-- INVENTORY -->

- 390 px : 56 entrées de parcours, 181 états capturés, aucun écran d’erreur ni débordement de page détecté.
- 1440 px : 56 entrées de parcours, 182 états capturés, aucun écran d’erreur ni débordement de page détecté.

Les entrées incluent les redirections et les deux contextes d’accueil ; les états ne sont pas des pages supplémentaires.

| Entrée | Capture téléphone | Capture ordinateur | États capturés (tél. / ord.) |
| --- | --- | --- | --- |
| /mon-espace/epreuves | [Voir](../tmp/screenshots/page-by-page-review/390/000.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/000.png) | 1 / 1 |
| /mon-espace (personnel) | [Voir](../tmp/screenshots/page-by-page-review/390/001.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/001.png) | 2 / 2 |
| /mon-espace/support | [Voir](../tmp/screenshots/page-by-page-review/390/003.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/003.png) | 3 / 3 |
| /mon-espace/annonces | [Voir](../tmp/screenshots/page-by-page-review/390/006.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/006.png) | 5 / 5 |
| /mon-espace/documents | [Voir](../tmp/screenshots/page-by-page-review/390/011.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/011.png) | 5 / 5 |
| /mon-espace/scolarite | [Voir](../tmp/screenshots/page-by-page-review/390/016.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/016.png) | 6 / 6 |
| /tableau-de-bord | [Voir](../tmp/screenshots/page-by-page-review/390/022.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/022.png) | 1 / 1 |
| /tableau-de-bord/rapports | [Voir](../tmp/screenshots/page-by-page-review/390/023.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/023.png) | 1 / 1 |
| /academique/filieres | [Voir](../tmp/screenshots/page-by-page-review/390/024.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/024.png) | 4 / 4 |
| /academique/referentiel | [Voir](../tmp/screenshots/page-by-page-review/390/028.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/028.png) | 23 / 24 |
| /academique/emploi-du-temps | [Voir](../tmp/screenshots/page-by-page-review/390/051.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/052.png) | 3 / 3 |
| /academique/presences | [Voir](../tmp/screenshots/page-by-page-review/390/054.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/055.png) | 3 / 3 |
| /academique/notes | [Voir](../tmp/screenshots/page-by-page-review/390/057.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/058.png) | 3 / 3 |
| /academique/reclamations | [Voir](../tmp/screenshots/page-by-page-review/390/060.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/061.png) | 2 / 2 |
| /academique/evaluations | [Voir](../tmp/screenshots/page-by-page-review/390/062.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/063.png) | 4 / 4 |
| /academique/rattrapages | [Voir](../tmp/screenshots/page-by-page-review/390/066.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/067.png) | 2 / 2 |
| /academique/sujets | [Voir](../tmp/screenshots/page-by-page-review/390/068.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/069.png) | 2 / 2 |
| /academique/examens | [Voir](../tmp/screenshots/page-by-page-review/390/070.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/071.png) | 4 / 4 |
| /academique/deliberations | [Voir](../tmp/screenshots/page-by-page-review/390/074.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/075.png) | 1 / 1 |
| /academique/parametres | [Voir](../tmp/screenshots/page-by-page-review/390/075.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/076.png) | 1 / 1 |
| /etudiants | [Voir](../tmp/screenshots/page-by-page-review/390/076.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/077.png) | 4 / 4 |
| /etudiants/comptes | [Voir](../tmp/screenshots/page-by-page-review/390/080.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/081.png) | 1 / 1 |
| /etudiants/cartes | [Voir](../tmp/screenshots/page-by-page-review/390/081.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/082.png) | 1 / 1 |
| /etudiants/parcours | [Voir](../tmp/screenshots/page-by-page-review/390/082.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/083.png) | 5 / 5 |
| /finance | [Voir](../tmp/screenshots/page-by-page-review/390/087.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/088.png) | 1 / 1 |
| /finance/versements | [Voir](../tmp/screenshots/page-by-page-review/390/088.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/089.png) | 7 / 7 |
| /finance/rapports | [Voir](../tmp/screenshots/page-by-page-review/390/095.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/096.png) | 6 / 6 |
| /finance/contrats | [Voir](../tmp/screenshots/page-by-page-review/390/101.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/102.png) | 6 / 6 |
| /personnel/utilisateurs | [Voir](../tmp/screenshots/page-by-page-review/390/107.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/108.png) | 2 / 2 |
| /personnel/roles | [Voir](../tmp/screenshots/page-by-page-review/390/109.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/110.png) | 1 / 1 |
| /personnel/permissions | [Voir](../tmp/screenshots/page-by-page-review/390/110.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/111.png) | 1 / 1 |
| /personnel/enseignants | [Voir](../tmp/screenshots/page-by-page-review/390/111.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/112.png) | 7 / 7 |
| /personnel | [Voir](../tmp/screenshots/page-by-page-review/390/118.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/119.png) | 5 / 5 |
| /communication/annonces | [Voir](../tmp/screenshots/page-by-page-review/390/123.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/124.png) | 4 / 4 |
| /site-web/articles | [Voir](../tmp/screenshots/page-by-page-review/390/127.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/128.png) | 3 / 3 |
| /site-web/demandes | [Voir](../tmp/screenshots/page-by-page-review/390/130.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/131.png) | 2 / 2 |
| /site-web/documents | [Voir](../tmp/screenshots/page-by-page-review/390/132.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/133.png) | 3 / 3 |
| /site-web/brochures | [Voir](../tmp/screenshots/page-by-page-review/390/135.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/136.png) | 3 / 3 |
| /logistique/achats | [Voir](../tmp/screenshots/page-by-page-review/390/138.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/139.png) | 6 / 6 |
| /logistique/fournisseurs | [Voir](../tmp/screenshots/page-by-page-review/390/144.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/145.png) | 4 / 4 |
| /logistique/inventaire | [Voir](../tmp/screenshots/page-by-page-review/390/148.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/149.png) | 4 / 4 |
| /systeme/donnees | [Voir](../tmp/screenshots/page-by-page-review/390/152.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/153.png) | 1 / 1 |
| /systeme/journal | [Voir](../tmp/screenshots/page-by-page-review/390/153.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/154.png) | 1 / 1 |
| /systeme/mails | [Voir](../tmp/screenshots/page-by-page-review/390/154.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/155.png) | 1 / 1 |
| /systeme/export | [Voir](../tmp/screenshots/page-by-page-review/390/155.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/156.png) | 1 / 1 |
| /systeme/support | [Voir](../tmp/screenshots/page-by-page-review/390/156.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/157.png) | 4 / 4 |
| /academique | [Voir](../tmp/screenshots/page-by-page-review/390/160.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/161.png) | 1 / 1 |
| /communication | [Voir](../tmp/screenshots/page-by-page-review/390/161.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/162.png) | 1 / 1 |
| /logistique | [Voir](../tmp/screenshots/page-by-page-review/390/162.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/163.png) | 1 / 1 |
| /systeme | [Voir](../tmp/screenshots/page-by-page-review/390/163.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/164.png) | 1 / 1 |
| /etudiants/ESCEN-TEST-001 | [Voir](../tmp/screenshots/page-by-page-review/390/164.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/165.png) | 11 / 11 |
| /mon-espace (étudiant) | [Voir](../tmp/screenshots/page-by-page-review/390/175.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/176.png) | 2 / 2 |
| /connexion | [Voir](../tmp/screenshots/page-by-page-review/390/177.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/178.png) | 1 / 1 |
| /mot-de-passe-oublie | [Voir](../tmp/screenshots/page-by-page-review/390/178.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/179.png) | 1 / 1 |
| /mot-de-passe-reinitialiser | [Voir](../tmp/screenshots/page-by-page-review/390/179.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/180.png) | 1 / 1 |
| /mot-de-passe-modifier | [Voir](../tmp/screenshots/page-by-page-review/390/180.png) | [Voir](../tmp/screenshots/page-by-page-review/1440/181.png) | 1 / 1 |

Index détaillés : [390 px](../tmp/screenshots/page-by-page-review/390/review.json), [1440 px](../tmp/screenshots/page-by-page-review/1440/review.json). Les captures sont des artefacts locaux non versionnés.

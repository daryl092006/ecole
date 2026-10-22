# Formations et pièces — 22 octobre 2026

La liste répétait chaque libellé, niveau, filière, année et action sur plusieurs lignes. Elle n’offrait qu’un filtre par niveau et son actualisation parlait de dossiers. Le compteur global en pied de page ne précisait pas qu’il dénombrait les dossiers étudiants du portail.

La configuration affiche désormais un tableau adapté en fiches sur mobile : formation, niveau, année, ouverture, pièces et action courte « Configurer ». Recherche insensible aux accents, filtres combinables par filière, niveau et ouverture, remise à zéro, tri par filière puis niveau. Compteurs de formations ouvertes/fermées/sans pièce obligatoire et nombre de résultats affichés. Les filtres sont conservés après une sauvegarde et réinitialisés au changement d’année ; l’état vide de l’année est distinct d’une recherche sans résultat et d’une panne de chargement.

L’édition utilise ReviewedForm pour afficher les valeurs avant/après, le motif et les conséquences avant confirmation. Le formulaire conserve ses valeurs après un échec. L’enregistrement utilise la même API sécurisée et actualise le portail ; aucune règle de pièces ni ouverture existante n’a été changée. La connexion au formulaire public est conservée.

Le pied de page indique explicitement qu’il compte les dossiers étudiants chargés dans le portail. Les modifications préexistantes d’authentification de PortalShell sont conservées hors de ce chantier. Le répertoire de compilation locale est exclu d’ESLint, comme les autres sorties Next.js.

Validation : 68 tests navigateur du site et de l’interconnexion passent ; contrôles spécifiques à 390 et 1440 px pour les filtres, les compteurs, la double confirmation, l’erreur et la reprise, la conservation des filtres et le changement d’année. TypeScript et ESLint sans erreur (deux avertissements préexistants). Aucune mutation de données réelles ni publication distante.

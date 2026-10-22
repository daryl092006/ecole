# Erreur 500 du catalogue des groupes — 22 octobre 2026

Constat réel sur le portail local : /api/catalog/groups répondait 500. Le journal Next.js indiquait `TypeError: __webpack_modules__[moduleId] is not a function` au chargement de src/lib/supabase/server.ts, avant l’exécution du gestionnaire de la route. Le serveur sur 3000 utilisait .next-ui-tests, dossier également employé par plusieurs configurations Playwright.

Correction : le lanceur local impose désormais tmp/next-local-portal pour le serveur sur 3000, indépendamment d’une variable ESCEN_BUILD_DIR héritée. Redémarrage du seul serveur concerné, sans effacer les anciens dossiers de compilation et sans modification des données ni des permissions.

Vérification réelle : avant redémarrage, réponse 500 ; après redémarrage, réponse 401 avec « Connexion requise. » pour une requête sans session. La route se compile et atteint donc le contrôle d’authentification. Elle conserve cette réponse après les tests exécutés dans un autre dossier de compilation. La lecture avec la session réelle de l’utilisateur reste à confirmer dans son navigateur.

Les deux tests navigateur de configuration des groupes passent à 390 et 1440 px, avec API simulées. TypeScript et ESLint sans erreur (deux avertissements préexistants).

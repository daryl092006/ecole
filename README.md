# ESCEN — interface de gestion universitaire

Application Next.js et TypeScript pour les parcours académiques, étudiants, financiers, administratifs et logistiques d’une université privée au Togo.

La priorité actuelle est de terminer et valider le front-end. Les données sont conservées en mémoire pendant la session et sont perdues au rafraîchissement. Le sélecteur de rôle et les identités servent à vérifier les parcours ; ils ne constituent pas une authentification. Aucun backend n’est connecté à cette version.

## Démarrer

```bash
npm ci
npm run dev
```

Ouvrir http://localhost:3000/connexion. Sous PowerShell, utiliser npm.cmd si nécessaire.

La page de connexion propose des accès de démonstration dans « Accès de démonstration ». Par exemple : `direction@escen.demo`, mot de passe `EscenDemo2026!`. La session reste en mémoire ; un rafraîchissement demande une nouvelle connexion. L’aide au mot de passe crée une demande de support simulée, sans envoyer d’email.

Les écrans disposent de routes Next.js distinctes : `/mon-espace`, `/academique/notes`, `/finance/contrats`, `/etudiants` et `/etudiants/[matricule]`, notamment. Les liens, l’historique du navigateur et les accès directs respectent le rôle de démonstration sélectionné. Les données restent partagées pendant la navigation interne. Le logo fourni dans `public/logo-escen.png` est utilisé sur la connexion, dans le portail et dans les impressions.

## Vérifier

```bash
npm run lint
npm run test
ESCEN_BUILD_DIR=.next-verification npm run build
npm run test:ui
```

Les tests de services vérifient les permissions, routes, accès de démonstration, notes, corrections, conflits, bourses, réinscriptions, créances historiques, jurys, achats et pièces du dossier. Les tests d’interface utilisent Chrome installé localement et servent le build de vérification sur le port 3105. Pour utiliser Chromium installé par Playwright, définir ESCEN_BROWSER_CHANNEL=chromium.

La revue d’interface parcourt chaque page autorisée pour les 14 rôles à 320, 768, 1024 et 1440 px. Elle contrôle les débordements, les libellés des champs, les tableaux vides, le menu et la recherche au clavier. Deux parcours avec données saisies couvrent les formulaires à 390 et 1440 px, notamment les réclamations, vérifications de pièces, erreurs de paiement, annulations, tickets et achats. Les captures sont enregistrées dans `.tmp/interface/`.

Pour exercer ces parcours sur le serveur de développement avec un dossier de compilation séparé :

```bash
ESCEN_UI_DEV=1 npm run test:ui
```

## Fonctionnalités

- Référentiel LMD : années, filières, parcours, niveaux, semestres, UE, matières, groupes et affectations.
- Planning : salles, capacité, conflits, périodes bloquées, déplacements et annulations avec motif.
- Examens : première session, rattrapage, surveillant affecté et feuille d’émargement imprimable.
- Notes : saisie, contrôle, validation, publication, réclamations et corrections tracées.
- Jury : règles configurables et à approuver, crédits, décisions conservées et relevés imprimables.
- Étudiants : dossier civil, pièces jointes, contrôle de conformité, cartes, certificats, réinscriptions et statuts.
- Finance : scolarité, inscription, frais annexes, bourses, révision de contrat, échéancier, versements, créances des anciennes années, annulations et reçus.
- Personnel et logistique : annuaire, dossiers du personnel, demandes d’achat, approbation, réception et inventaire.
- Pilotage : indicateurs calculés, filtres et exports CSV ; annonces ciblées, support et audit.

L’interface n’inclut plus le guide interactif ni les emojis décoratifs. Les impressions peuvent être enregistrées en PDF depuis le navigateur.

Consulter [le statut fonctionnel](docs/FUNCTIONAL_STATUS.md) pour le parcours de validation et les limites de cette phase.

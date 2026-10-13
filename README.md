# ESCEN — prototype de gestion

Application Next.js et TypeScript pour les parcours académiques, étudiants, financiers et techniques d’ESCEN.

Le prototype est entièrement front-end : il démarre sans données préchargées, utilise un état React en mémoire et perd les modifications au rafraîchissement. Aucune configuration de base de données ni clé d’API n’est nécessaire pour ces parcours.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000. Sous PowerShell, utiliser npm.cmd si la politique d’exécution bloque npm.ps1.

## Vérifier

```bash
npm run lint
npm run test
npm run build
```

Les tests utilisent Node et le transpileur TypeScript installé pour vérifier les services mock : permissions, dossiers, UE, affectations, paiements, notes, corrections, planning et support.

## Démonstration et limites

Le sélecteur de rôle permet de parcourir les 14 rôles ESCEN. Les rôles Enseignant, Étudiant et Délégué disposent d’un sélecteur d’identité ; aucune donnée personnelle n’est affichée tant qu’aucune identité n’est sélectionnée.

Consulter [le statut fonctionnel](docs/FUNCTIONAL_STATUS.md) pour le parcours complet de création des données, les vérifications effectuées et les fonctionnalités qui restent à construire.

Les critères de délibération et l’autorité d’annulation des paiements nécessitent une décision métier. Le prototype ne constitue pas encore une application intégralement terminée.

Pour isoler un build de vérification d’un serveur local qui utilise .next, définir ESCEN_BUILD_DIR=.next-verification avant npm run build et npm run start. Sans cette variable, les commandes utilisent le dossier .next habituel.

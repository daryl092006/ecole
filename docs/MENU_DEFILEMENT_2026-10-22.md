# Menu et défilement — 22 octobre 2026

Correction du menu conservant son apparence générale : navigation de hauteur stable (80 px sur ordinateur, 72 px sur tablette et mobile), logo constant, espace réservé aligné sur la hauteur réelle. Seul le bandeau de contact se replie au défilement. Ses liens sont inaccessibles au clavier lorsqu’il est masqué. Initialisation de l’état au chargement avec écoute passive du défilement.

À 1024 px et moins, utilisation du menu mobile pour éviter le rapprochement du logo et des liens. Sur ordinateur, les liens occupent le flux normal entre le logo et le bouton d’inscription. Styles sémantiques copiés dans le site par le connecteur, sans nouvelles classes utilitaires.

Contrôles : géométrie avant/après défilement aux largeurs 360, 390, 768, 1024 et 1440 px ; absence de débordement et de chevauchement du logo, des liens et du bouton ; parcours des formations et menu mobile. Captures locales dans tmp/screenshots/website-review/. Aucune publication distante.

Résultats : génération réussie, TypeScript et ESLint sans erreur (deux avertissements préexistants). Les 23 premiers contrôles passent ; après le dernier ajustement d’alignement vertical, les 12 tests concernés repassent sans échec.

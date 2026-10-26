# Fiche étudiant : années et groupes

L’onglet « Années et groupes » affichait le même bloc d’opérations que « Frais et versements ». Il proposait donc des paiements, des affectations financières, des remboursements et des avoirs au milieu du parcours scolaire.

Le bloc utilise désormais un contexte explicite : scolaire ou financier. Les changements de statut et de groupe restent dans le contexte scolaire ; les encaissements, contrats, versements et ajustements restent dans le contexte financier. Les confirmations, droits et écritures existants sont conservés.

La consultation scolaire des inscriptions persistées utilise un tableau dédié : année, formation, groupes avec périodes d’affectation disponibles, date d’inscription et statut. Il est filtré sur l’identité du dossier et les données déjà autorisées par le serveur, selon l’année consultée. Aucun sélecteur de collection, export, recherche ou ouverture d’une ligne technique n’est nécessaire. Une date absente reste indiquée comme non renseignée. Les dossiers uniquement historiques conservent leur consultation d’archives existante.

Les tests couvrent la séparation des onglets sur mobile/tablette/ordinateur, les changements de groupe avec confirmation et les parcours financiers conservés. La suite utilise une version compilée dans un dossier de build séparé : le badge de développement Next.js interceptait les clics sur les boutons mobiles. Les erreurs de l’application restent détectables et aucun comportement de développement du produit n’est modifié.

Aucun changement SQL, API, permission ou service métier.

Vérifications : compilation Next.js réussie, 36 tests Playwright réussis, TypeScript sans écriture incrémentale et ESLint réussis. Captures de l’onglet à 390/820/1440 px dans `tmp/screenshots/secondary-details/` ; inspection visuelle à 820 px.

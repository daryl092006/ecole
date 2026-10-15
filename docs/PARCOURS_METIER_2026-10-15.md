# Parcours des modules — 15 octobre 2026

Cette reprise remplace les constats initiaux de la revue ergonomique pour les écrans modifiés. Elle concerne les 41 routes fonctionnelles, les quatre accueils de module, le dossier étudiant et les quatre pages d’authentification. Les captures et relevés sont générés sous `.tmp/interface/` avec des API isolées : ils ne constituent pas une recette des données de production.

## Principes appliqués

- Les accueils regroupent les activités dans leur ordre utile. La recherche du menu et les intitulés utilisent les routes autorisées.
- Les opérations persistantes passent par saisie, récapitulatif avant/après, confirmation, résultat et activité suivante. Aucune écriture ne part pendant la relecture.
- Les erreurs conservent les valeurs ; le retour depuis un formulaire modifié demande de confirmer l’abandon. Les opérations en cours empêchent ce retour.
- Les actions disponibles suivent les permissions effectives renvoyées par le serveur et les restrictions globales des opérations concernées. Les contrôles serveur restent obligatoires.
- Les données actuelles et les archives sont distinguées. Les informations détaillées, références vérifiées et anomalies sont consultables ; aucun rapprochement n’est déduit de numéros semblables.
- Les fonctions dont l’écriture connectée est absente sont explicitement en consultation. Un bouton de prototype ne peut plus annoncer une sauvegarde réelle.

## État par domaine

| Domaine | Parcours disponible | Limite restante |
| --- | --- | --- |
| Accueil et pilotage | Destinations par rôle, vue d’ensemble et rapports distincts | Les volumes chargés ne sont pas des indicateurs financiers certifiés |
| Étudiants | Recherche, filtres avancés, dossier par sections, modification civile, création et archivage relus, résultat conservé après rechargement | Créer une identité ne crée ni inscription annuelle, ni groupe, ni compte Auth |
| Comptes et accès | Catégories dans l’URL, accès existants, permissions futures avant attribution, activation/retrait motivés | Un compte métier ne crée pas automatiquement une identité Auth |
| Personnel | Dossier, contacts, contrats consultables ; création, modification, archivage audités | Gestion connectée des contrats à compléter |
| Référentiels | Dépendances expliquées, prérequis accessibles, saisie et reprise explicite d’archive, relecture, activité suivante | Les anomalies de reprise nécessitent une résolution vérifiée |
| Sujets | Composition structurée, relecture, version enregistrée, aperçu étudiant et corrigé | Un sujet préparatoire ne devient pas une évaluation diffusée |
| Contrôles, examens, rattrapages | Catégories séparées, épreuves et copies consultables selon les droits | Programmation et exécution connectées à terminer |
| Planning | Agenda historique, dates, groupes, détail complet et accès aux présences | Création et déplacement connectés non activés |
| Présences, notes, réclamations, délibérations | Archives et données relationnelles réelles, détails et activités liées | Saisie, validation, publication et décisions connectées à terminer |
| Cartes, documents et parcours étudiant | Consultation des pièces et parcours conservés, identité de l’étudiant explicite | Émission de cartes, réinscription et abandon connectés à terminer |
| Finance | Recherche nominative et par référence, période, anomalies, pagination, export de tous les résultats filtrés | Encaissement, allocations, annulation, contrats et bourses connectés à terminer ; aucun solde inventé |
| Enseignants et affectations | Informations et relations réelles consultables | Affectation connectée à terminer |
| Communication | Lecture des annonces et articles, contenu riche assaini, métadonnées accessibles | Publication connectée non activée |
| Achats et logistique | Référentiels persistants autorisés ; commandes, stock et opérations consultables | Demandes, approbation et réception connectées à terminer |
| Administration et support | Archives, journaux et données réelles selon les droits ; limites explicites | Création de tickets, exécution de sauvegardes et restauration connectées à terminer |
| Authentification | Pages dédiées, explication correcte de la réinitialisation | Recette avec comptes et courriels réels à réaliser dans un environnement autorisé |

## Contrôles reproductibles

`npm run lint`, `npm run build` et `npm run test` vérifient le code, les services et 31 groupes d’assertions PostgreSQL locales. Sous PowerShell, définir `ESCEN_BUILD_DIR`, puis exécuter `node node_modules/next/dist/bin/next build` pour éviter les affectations POSIX du script de build.

`npm run test:ui -- tests/ui/business-processes.spec.ts tests/ui/crud.spec.ts tests/ui/persistent-data.spec.ts tests/ui/pedagogy.spec.ts tests/ui/navigation-review.spec.ts` couvre les parcours persistants simulés, les erreurs, les prérequis, la relecture avant API, les exports complets, les changements de rôle et le relevé des pages à 390 et 1440 pixels. Les captures ne remplacent pas une recette humaine de chaque rôle.

`node scripts/generate-ui-references.mjs` régénère les correspondances de références depuis les clés étrangères SQL. Les tests colocalisés contrôlent les attributs du catalogue et les homonymies d’identifiants entre tables.

Résultats de la dernière vérification : lint réussi, compilation de production réussie, assertions des services et 31 groupes PostgreSQL réussis, **40 tests navigateur réussis** avec les six suites ci-dessus et `tests/ui/global-organisation.spec.ts`. Le relevé couvre 50 écrans à chacune des deux largeurs. Les captures de l’accueil, des référentiels, des comptes, du planning et de la finance ont également été inspectées visuellement.

## Configuration et préparation de production

La réponse `/api/session` inclut désormais `capabilities`, par rôle, avec les permissions effectives et `globalAccess`. Le client refuse les actions privilégiées si cette information manque. Aucune migration ni modification distante n’est nécessaire pour ce changement.

Cette reprise améliore les parcours disponibles ; elle ne certifie pas la plateforme complète pour la production. Les écritures indiquées comme non activées, la reprise des domaines historiques, les règles institutionnelles à approuver et la recette avec les vrais périmètres restent nécessaires avant une exploitation intégrale. Les essais automatisés utilisent des fixtures et ne modifient aucune donnée distante.

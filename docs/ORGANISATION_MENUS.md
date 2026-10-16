# Organisation des menus

La navigation suit les activités de l’établissement. Le menu, les raccourcis de l’accueil, la recherche et le fil d’Ariane utilisent le même classement dans `src/constants/workspaceNavigation.ts`.

| Rubrique | Contenu |
| --- | --- |
| Année scolaire | Préparation de l’année, formations et niveaux disponibles, groupes, tarifs et encaissement via la préparation annuelle ; règles académiques à confirmer |
| Dossiers étudiants | Dossiers et inscriptions, réinscriptions et statuts, documents |
| Cours et présences | Programmes de cours, matières, enseignants et affectations, emploi du temps, présences |
| Examens et résultats | Sujets, contrôles continus, examens, rattrapages, notes, réclamations, délibérations et relevés |
| Scolarité et paiements | Contrats étudiants et bourses, versements et reçus, situation et rapports financiers |
| Personnel | Dossiers professionnels |
| Communication | Annonces et actualités |
| Achats et matériel | Fournisseurs, demandes d’achat et inventaire |
| Comptes et droits d’accès | Comptes étudiants et personnel, rôles et permissions |
| Données et assistance | Reprise des données, journal, export du journal et support |

Mon espace et Pilotage restent en tête. Chaque rubrique disparaît lorsqu’aucune de ses pages n’est autorisée. Le classement ne modifie ni les permissions ni les routes existantes. Les liens directs et les anciens accueils de modules restent accessibles. Une rubrique se déplie sans navigation ; choisir une page ferme le menu mobile. La page active déplie automatiquement sa rubrique.

Les intitulés ne constituent pas une activation des traitements encore consultatifs. Cette modification ne résout pas les lacunes de cycle de vie, de finance ou de réinscription identifiées dans `REVUE_INTERCONNEXIONS_METIER.md`.

Vérifications : `npm run test` contrôle la couverture unique de toutes les pages et la conservation exacte des destinations de chaque rôle. Les suites navigateur `workspace-menu.spec.ts`, `menu-scroll.spec.ts`, `navigation-review.spec.ts` et `global-organisation.spec.ts` couvrent accueil, navigation, recherche, défilement et petits/grands écrans avec des données isolées.

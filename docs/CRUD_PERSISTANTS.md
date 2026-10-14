# CRUD persistants — 14 octobre 2026

## Écrans utilisables

Les opérations ci-dessous écrivent dans Supabase via des routes serveur authentifiées. Les contrôles portent sur le compte actif, les permissions du rôle effectivement attribué, le périmètre global, les champs autorisés, les références et la révision concurrente. Les interfaces relisent les enregistrements après sauvegarde. Les opérations sont auditées avec auteur, rôles, date, ancienne valeur, nouvelle valeur et motif.

| Écran | Création | Consultation | Modification | Retrait |
| --- | --- | --- | --- | --- |
| Étudiants | Dossier civil et matricule officiel | Liste et dossier existants | Informations civiles | Archivage du dossier et révocation de son accès |
| Personnel | Nouvelle identité ou complément d’une identité existante | Annuaire et dossier | Contacts et matricule officiel | Archivage et révocation du compte lié |
| Filières, parcours, matières | Formulaire de chaque collection | Liste et détail | Formulaire prérempli | Archivage motivé |
| Années, cycles, niveaux, groupes | Formulaire avec références réelles | Liste et détail | Formulaire prérempli | Archivage motivé |
| Sites, bâtiments, salles | Formulaire avec parent et capacité | Liste et détail | Formulaire prérempli | Archivage motivé |
| Inventaire | Identité, site, localisation et état d’un équipement | Liste et détail | Formulaire prérempli | Archivage motivé |
| Fournisseurs | Coordonnées et identifiant fiscal | Liste et détail | Formulaire prérempli | Archivage motivé |

Les retraits conservent les lignes, les relations et l’audit. Ils ne constituent pas une suppression physique. Les référentiels archivés se consultent via le filtre « Enregistrements archivés » et ne sont pas proposés pour de nouvelles associations.

La création d’un dossier ne fabrique ni contrat, ni inscription annuelle, ni affectation, ni compte Auth, ni attribution de rôle. Les opérations de publication d’une année ne sont pas assimilées à une modification de ses dates. Les changements de stock restent des mouvements, indépendants de l’édition de l’identité d’un équipement.

Les matricules, codes, dates, cycles, sites et bâtiments absents doivent être renseignés avec les informations officielles. Les incohérences (bâtiment d’un autre site, référence archivée, code unique en double) sont refusées. Les profils combinant étudiant et personnel ne sont pas archivés globalement par une seule catégorie ; leurs statuts et leurs accès doivent être gérés séparément. Une personne ne peut pas archiver son propre dossier. Un compte lié ne peut être révoqué sans les droits d’administration des comptes.

## Reprise des référentiels historiques

Dans les collections historiques « Filières », « Matières », « Années universitaires », « Niveaux », « Groupes » et « Salles », le bouton « Reprendre pour modifier » préremplit les valeurs connues. L’utilisateur confirme les informations et choisit explicitement les parents canoniques requis. Les identifiants source ne sont jamais assimilés à des UUID canoniques.

La création et l’inscription de la provenance constituent une seule transaction. `escen_private.source_mappings` conserve l’identifiant exact de la ligne source (donc son lot d’archive), la table cible, le nouvel UUID, l’auteur, le motif et la méthode `HUMAN_REVIEW`. La ligne source originale reste inchangée. Une seconde reprise du même élément vers la même collection est refusée. Après reprise, la modification s’effectue sur l’enregistrement courant ; l’original reste consultable.

La migration additive `202610140020_reference_archival.sql` ajoute les champs et contraintes d’archivage, ainsi que la RPC serveur de reprise. Elle n’efface aucune donnée et ne modifie aucune migration précédemment appliquée. Les nouvelles routes sont `/api/catalog/[collection]`, `/api/catalog/[collection]/[id]`, `/api/students`, `/api/students/[matricule]` et `/api/staff/[personId]`.

## Périmètre restant

Les copies historiques d’examens restent en consultation. Les workflows persistants de programmation, de publication et de correction des notes, de paiements, de contrats, d’inscriptions annuelles, d’affectations, de communication, de support et de demandes d’achat ne sont pas rendus opérationnels par ces CRUD. Leurs contrôles métier et leurs parents canoniques doivent être portés séparément. La commande générique de démonstration `runWorkflow` refuse désormais les modifications lorsqu’une session réelle est connectée, pour empêcher de présenter une sauvegarde en mémoire comme une sauvegarde en base.

## Vérification

- `npm run lint` et build de production isolé sous `.tmp/next-crud-verification`.
- `npm run test` : validations métier, contrôles des champs injectés, refus des périmètres insuffisants et 30 groupes d’assertions PostgreSQL ; audit d’archivage, reprise exacte, original inchangé et doublon de reprise refusé.
- Tests `tests/ui/crud.spec.ts` et `tests/ui/persistent-data.spec.ts` : 14 parcours réussis, créations/modifications/retraits/rechargements à 390 et 1440 px, copie HTML/JSON et absence de mélange des étudiants, erreurs réessayables et changement de rôle.
- Les routes réelles des nouvelles API refusent les requêtes sans authentification ; les RPC sensibles restent interdites aux rôles anonymes.
- Vérification distante : 20 migrations, 104 tables métier et 11 tables privées, aucune table sans RLS, les 15 566 lignes source conservées. Aucun dossier de test n’est créé sur la base distante.

## Évolution de présentation

La [réorganisation pédagogique](ORGANISATION_PEDAGOGIE.md) remplace les panneaux de détail par des pages de travail et unifie les référentiels. « Modifier » sur une ancienne référence remplace le bouton séparé de reprise. La composition des sujets préparatoires dispose désormais de sa sauvegarde versionnée ; la diffusion et les autres workflows métier restent distincts.

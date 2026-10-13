# Couverture de l’audit fonctionnel ESCEN

Date : 4 octobre 2026. Compte fourni, rôle Informaticien.

« Consulté » signifie que la route et son état affiché ont été examinés ; ce n’est pas une validation des enregistrements ou des règles backend. Les erreurs confirmées et la description métier sont dans AUDIT-FONCTIONNEL-ESCEN.md.

## Navigation principale

| Route | Observation |
|---|---|
| `/` | Consulté |
| `/actualites` | Consulté |
| `/annonces` | Consulté |
| `/emploi-du-temps` | Consulté |
| `/profile/info` | Consulté |
| `/reclamations` | Consulté |
| `/evaluations/professeur/mes-examens` | Consulté |
| `/emploi-du-temps/exporter` | Consulté |
| `/filieres/liste` | Consulté |
| `/uvs/liste` | Consulté |
| `/evaluations/liste` | Consulté |
| `/salles` | Consulté |
| `/groupes` | Consulté |
| `/admin/jours-feries` | Consulté |
| `/admin/liste-des-etudiants` | Consulté |
| `/admin/releves-globaux` | Consulté |
| `/admin/liste-des-releves` | Consulté |
| `/admin/etudiants/cartes` | Consulté |
| `/admin/etudiants/abandons` | Consulté |
| `/finance/dashboard` | Consulté |
| `/frais-de-scolarite/liste` | Consulté |
| `/frais-inscription/liste-des-frais-inscription` | Consulté |
| `/bourses/liste` | Consulté |
| `/candidatures/dashboard` | Consulté |
| `/admin/candidatures/inscription` | Consulté |
| `/candidatures/etude-dossier` | Consulté |
| `/candidatures/dossiers-incomplets` | Consulté |
| `/candidatures/admis` | Consulté |
| `/admin/etudiants/reinscription` | Consulté |
| `/personnel/utilisateurs` | Consulté |
| `/personnel/enseignants` | Consulté |
| `/roles/liste` | Consulté |
| `/journal-activite/liste` | Consulté |
| `/sauvegardes/liste` | Consulté |
| `/admin/communications/dashboard` | Consulté |
| `/admin/communications` | Consulté |
| `/messages` | Consulté |
| `/admin/prospects` | Consulté |
| `/publications/liste` | Consulté |
| `/info-urgente/liste` | Consulté |
| `/partenaires/liste` | Consulté |
| `/communications/newsletter` | Consulté |
| `/galerie` | Consulté |
| `/support/ticket` | Consulté |
| `/parametre/liste` | Consulté |
| `/parametre/mon-activite` | Consulté |
| `/annee-scolaire/liste` | Consulté |
| `/periodes/liste/` | Consulté |
| `/parametre/niveaux` | Consulté |
| `/parametre/champs-obligatoires` | Consulté |
| `/parametre/types-diplome` | Consulté |
| `/parametre/moyens-connaissance` | Consulté |
| `/parametre/types-documents` | Consulté |

## Modules complémentaires

| Route | Observation |
|---|---|
| `/finance/paiements` | Consulté |
| `/finance/depenses` | Consulté |
| `/finance/recouvrement` | Consulté |
| `/finance/configuration-tranche-de-paiement` | Consulté |
| `/finance/parametrage-plan-de-paiement` | Consulté |
| `/admin/negociations` | Consulté ; affiché : `/admin/etudiants/situation` |
| `/admin/paiements/exports/etat-des-paiements` | Consulté |
| `/parametre/concours-sessions` | Consulté |
| `/parametre/concours-matieres` | Consulté |
| `/candidatures/controle-presence` | Consulté |
| `/candidatures/notes-concours` | Consulté |
| `/candidatures/declaration-admission` | Consulté |
| `/candidatures/attribution-groupe` | Consulté |
| `/candidatures/payement` | Consulté |
| `/ues/liste` | Consulté |
| `/matieres/liste` | Consulté |
| `/cours-en-ligne` | Consulté |
| `/Enseignant/mes-cours` | Consulté |
| `/Enseignant/syllabuses` | Consulté |
| `/Enseignant/mes-evaluations` | Consulté |
| `/presences/presences-des-etudiants` | Consulté |
| `/presences/conseil/synthese` | Consulté |
| `/presences-validation` | Consulté |
| `/bulletins-templates` | Consulté |
| `/evenements/liste` | Consulté |
| `/opportunites/liste` | Consulté |
| `/communications/commentaires` | Consulté |
| `/notifications` | Consulté |

## Parcours ciblés

- Recherche d’étudiants sans résultat et retour à la liste.
- Fiche étudiant : identité, relevés et pièces manquantes.
- Formulaire de création d’étudiant et aperçu des frais.
- Cartes : liste, options de filtres et aperçu.
- Situation financière : lien de retard puis filtre explicite, 143 contre 83 résultats.
- Encaissement : sélection d’étudiant par clic réel, résumé de solde, échéances, historique et formulaire sans validation de paiement.
- Plans de paiement : erreur 500 reproduite et état vide affiché.
- Formulaire de création d’évaluation, corbeille et fiche examen.
- Constructeur de questions et mode lecture seule.
- Soumissions d’examen : anonymat, progression et correction en attente.
- Fiche candidat et formulaire en cinq étapes.
- Profil : onglet rôles ; permissions Informaticien.
- Formulaire d’annonce et formulaire de ticket support, sans envoi.
- Emploi du temps : vue liste.
- Liste étudiants avec viewport mobile 390 × 844 px.
- Sources publiques de trois écrans : vérification des données codées en dur.

## Non exécuté

Enregistrements, publications, paiements, emails, changements de permissions, validations, suppressions, génération d’exports et restauration de sauvegarde. Aucun parcours n’a été validé sous un autre compte ou rôle.

# Statut fonctionnel ESCEN

Mise à jour : 4 octobre 2026.

Prototype exclusivement front-end. Les données démarrent vides et restent en mémoire jusqu’au rafraîchissement. Aucun backend, aucune authentification réelle et aucune migration n’ont été ajoutés.

| Domaine | État actuel |
|---|---|
| Référentiel partagé | Années, filières, parcours, niveaux, semestres, groupes, UE, matières, enseignants et affectations partagés entre modules. |
| Semestres | Création avec niveau, dates dans l’année et contrôles de doublon et chevauchement. |
| UE et matières | Crédits, coefficient et rattachement annuel ; contrôle du budget de crédits d’une UE lors de la création des matières. |
| Affectations | Formulaire fonctionnel ; cohérence année ouverte, groupe, niveau, semestre, matière et enseignant. Les affectations alimentent les enseignements. |
| Étudiants inscrits | Création des dossiers et affectation aux groupes compatibles par le Logisticien académique ; historique local. |
| Planning | Création des salles et périodes bloquées ; conflits salle, enseignant et groupe ; capacité ; dates dans le semestre actif. Déplacement et annulation restent à compléter. |
| Présences | Saisie par groupe et enregistrement immuable dans l’état partagé, avec audit. Surveillant : aucune séance affectée par défaut ; processus d’affectation restant à construire. |
| Notes | Saisie vide au départ ; refus des notes incomplètes ; workflow jusqu’à publication ; corrections avec anciennes/nouvelles valeurs, auteur, date et motif. |
| Réclamations | Dépôt sur ses propres notes publiées, suivi, avis enseignant, décision académique et correction éventuelle. |
| Finance | Contrat initial de scolarité, échéancier égal avec reliquat sur la dernière échéance, versements, reçus et allocation cumulative des paiements partiels. Révision des contrats, frais d’inscription et bourses restent à compléter. |
| Annulations financières | Service non destructif présent ; aucune autorité attribuée. Décision métier attendue. |
| Mon Espace | Identité de démonstration enseignant/étudiant ; séances visibles ; notes publiées et réclamations personnelles. |
| Communication | Annonces partagées entre création, actualités et Mon Espace. Audience actuelle : Tous. |
| Utilisateurs | Création de comptes simulés, annuaire, activation/désactivation avec motif, politique de permissions consultable. Les comptes ne constituent pas une authentification. |
| Support | Tickets conservés en mémoire ; auteur limité à ses tickets ; prise en charge et résolution par l’Informaticien, avec historique. |
| Audit et export | Journal horodaté avec identité de démonstration ; export JSON du journal. Aucun mécanisme de restauration ni sauvegarde distante. |
| Reporting | Indicateurs existants alimentés par les dossiers et paiements ; taux de recouvrement calculé. Exports métier et rapports consolidés restant à construire. |
| Délibérations et rattrapages | Règles de passage, compensation et décision attendues avant implémentation. |
| Cartes, réinscriptions, abandons | Workflows et attribution des autorisations restant à compléter. |
| Examens et relevés | Évaluations de type Examen disponibles ; organisation spécifique des examens et relevés officiels restant à compléter. |

## Parcours de démonstration

1. Directeur Académique : créer puis ouvrir une année ; créer une filière, ses semestres et ses UE/matières.
2. Logisticien académique : créer un groupe, un enseignant et une affectation ; ajouter les dossiers d’étudiants déjà inscrits.
3. Logisticien académique : créer une salle et planifier une séance dans le semestre.
4. Enseignant : sélectionner son identité de démonstration ; saisir les présences ; créer une évaluation, saisir toutes les notes et les soumettre.
5. Directeur Académique : contrôler, valider et publier les notes.
6. Étudiant : sélectionner son identité ; consulter ses notes et déposer une réclamation.
7. Directeur Académique et enseignant : traiter les étapes de la réclamation jusqu’à sa clôture.
8. RAF : créer le contrat initial et ses échéances puis enregistrer un paiement.
9. Responsable marketing : publier une annonce ; vérifier sa présence dans Mon Espace.
10. Tout rôle : ouvrir un ticket personnel ; Informaticien : le prendre en charge, le résoudre et consulter le journal.

## Vérifications

- npm run lint : contrôle ESLint.
- npm run build : compilation de production et contrôle des types.
- npm run test : assertions sur les services mock, notamment permissions, dossiers, semestres/affectations, paiements partiels, notes incomplètes, publication, corrections, planning et support.
- Les parcours interactifs et les mises en page doivent également être vérifiés dans un navigateur.

Les demandes de décisions métier ouvertes portent sur l’autorité d’annulation des paiements et les règles de délibération. L’application ne doit pas être présentée comme intégralement terminée tant que les éléments indiqués comme restants ne sont pas achevés.

## Parcours contrôlés dans Chrome

Les 14 sélections de rôle ont été exercées ; contrôle des menus Stagiaire/Informaticien et de l’absence de données sans identité pour Enseignant/Étudiant/Délégué. L’accueil a été contrôlé à 390 px sans débordement horizontal.

Le parcours de création année → filière → semestre → UE/matière → groupe → enseignant → affectation → dossier étudiant → contrat → paiement a été exercé. Le circuit saisie → soumission → contrôle → validation → publication → consultation personnelle → dépôt de réclamation a également été exercé.

Ces contrôles ne couvrent pas toutes les combinaisons de rôles, tous les onglets ni toutes les tailles d’écran.

Le support (ouverture, prise en charge, résolution), la création de comptes simulés et la diffusion des annonces jusqu’à Mon Espace ont également été contrôlés dans Chrome sur le build final.

## Reprise de l’audit externe

La session 01a108cf-6705-75c2-99ee-c99da5695dee a été relue. Voir [la correspondance audit/prototype](REPRISE_AUDIT_ESCEN.md). Recherche et filtres étudiants, export CSV des dossiers, situation financière filtrée et export CSV de scolarité sont désormais disponibles. Les exports métier supplémentaires et rapports consolidés restent à construire.

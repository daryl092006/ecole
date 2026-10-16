# Revue métier du cycle des années scolaires

Date : 15 octobre 2026. Cette revue décrit le code local et les migrations présentes. Elle ne constate pas l’état courant de la base distante et ne change aucune année réelle.

## Règles confirmées

- Une seule année peut être ouverte à la fois : instruction utilisateur explicite, non encore respectée par le cycle existant.
- Une année suivante peut être configurée en brouillon. Préparer ses paramètres ne crée aucune inscription, aucun paiement et aucun passage de niveau.
- La préparation annuelle centralise les filières et niveaux proposés, les modes de formation, les groupes, les frais et les moyens d’encaissement. La création des références manquantes se fait dans ce parcours.
- Le programme détaillé des matières reste dans la gestion pédagogique et ne conditionne pas l’ouverture.
- Les identités et références communes ne sont pas recréées chaque année. Les inscriptions, décisions, activités et opérations gardent leur année réelle.
- Une réinscription ne modifie jamais les anciennes inscriptions, groupes, notes, décisions ou dettes.
- Les données absentes, parents non retrouvés et décisions institutionnelles ne sont pas inventés.
- Les changements sensibles exigent autorisation, motif, confirmation, traçabilité et protection contre les écritures concurrentes.

## Point institutionnel encore à trancher

L’instruction « une seule année ouverte » ne précise pas si une ancienne année peut être en finalisation pendant que la nouvelle est ouverte. Deux possibilités existent :

1. Ancienne année définitivement clôturée avant toute ouverture de la suivante.
2. Une seule année ouverte, avec une ancienne année en finalisation limitée aux opérations explicitement autorisées.

Cette décision détermine le verrou d’ouverture et les opérations de fin d’année autorisées. Elle ne peut pas être déduite des dates du calendrier. La question a été présentée à l’utilisateur ; aucune réponse explicite n’a encore été donnée.

## Écarts constatés dans l’existant

| Point | Constat dans le code | Travail nécessaire |
|---|---|---|
| Unicité de l’année ouverte | La migration 23 autorise plusieurs années `OUVERTE` ; seule la désignation de travail est unique. | Interdire la seconde ouverture en base, y compris en concurrence, et dans les routes serveur. Traiter toute anomalie existante sans choisir une année arbitrairement. |
| Sortie de l’année de travail | La commande accepte le retrait de la désignation, mais l’écran n’en propose pas l’action. La préparation de clôture de l’année désignée est désactivée. | Construire un parcours cohérent permettant de terminer l’ancienne année sans ouvrir une deuxième année. Le retrait ou changement de désignation doit être explicite, motivé et audité. |
| Contrôles d’ouverture | Le serveur contrôle cinq éléments de configuration, mais la commande SQL du cycle ne porte pas ces mêmes contrôles. | Revalider les prérequis dans la transaction qui ouvre l’année, sur les données courantes. |
| Création et dates | L’ancien service en mémoire refuse les chevauchements ; le parcours persistant n’applique pas la même règle. | Définir les contrôles de dates, de doublons et de succession avec l’institution, puis aligner les couches. Ne pas confondre intervalle de dates et statut ouvert. |
| Bilan avant clôture | La commande vérifie les évaluations non publiées/non annulées, les réclamations ouvertes et les tentatives actives. | Présenter un bilan complet, des nombres vérifiables et des accès aux dossiers bloquants. Identifier séparément les obligations concernant jurys, décisions, relevés et pièces. |
| Documents après clôture | Les écritures de documents académiques figurent parmi les opérations protégées. | Distinguer consultation, téléchargement d’un document existant, nouvelle émission et correction officielle. Les exceptions doivent être définies avant leur implémentation. |
| Finance | Les règlements restent possibles sur une inscription ancienne ; cela n’établit pas une clôture comptable complète. | Définir les contrôles financiers de fin d’année, les opérations ultérieures autorisées et leur audit. Ne pas exiger un solde nul sans décision institutionnelle. |
| Communication, support et achats | L’année est obligatoire, mais le contrôle de rattachement n’interdit pas toutes les écritures sur une année clôturée. | Définir puis appliquer une matrice commune des opérations permises, avec les exceptions métier explicites. |
| Réouverture et corrections | Le cycle existant n’autorise aucun retour depuis `CLOTUREE`. | Conserver ce verrou. Tout éventuel parcours exceptionnel demande une règle institutionnelle sur les droits, les motifs et les dossiers concernés. |
| Recette | Des tests et jeux de données existants supposent plusieurs années ouvertes. | Réécrire ces scénarios pour couvrir la contrainte confirmée, sans supprimer les contrôles de relations entre années ni contourner les protections. |

## Parcours à construire

### Création et préparation

L’utilisateur renseigne le nom et les dates de l’année. Le système vérifie leur validité et les doublons. L’année commence en brouillon. Les configurations confirmées d’une année précédente peuvent être proposées, mais aucune proposition ne vaut enregistrement. Les références inconnues sont signalées.

Le bilan de préparation donne un état pour chaque rubrique : filières et niveaux, groupes, scolarité, inscription et encaissement. Un blocage indique le dossier à compléter et permet de le faire sur place. Un tarif modifié ne recalcule pas les contrats existants.

### Ouverture

Avant confirmation : afficher l’année qui va démarrer, le statut de l’ancienne année, les contrôles et les effets sur les inscriptions et le site connecté. L’ouverture doit relire et vérifier ces conditions dans une transaction avec verrouillage. Deux utilisateurs ne doivent pas pouvoir ouvrir deux années différentes simultanément.

La désignation de travail, si elle accompagne l’ouverture, doit faire partie d’une action explicite et auditée. Un changement d’année consultée ne change jamais l’année institutionnelle.

### Finalisation et clôture

Présenter le bilan avant de demander la clôture : dossiers académiques, examens, notes, réclamations, jurys et décisions, documents et éléments financiers selon les règles institutionnelles retenues. Chaque obligation doit avoir une source et un contrôle réellement implémenté. Un élément non contrôlé ne doit pas être marqué « validé ».

Les blocages doivent être consultables, corrigeables par les rôles autorisés et recontrôlés après correction. Une liste devenue obsolète ne permet pas de valider la clôture : le serveur revérifie les conditions au moment de l’enregistrement.

La clôture protège les données annuelles sans les supprimer. Les opérations ultérieures explicitement autorisées restent dans leur année d’origine. La consultation historique continue à appliquer les droits du compte.

## Matrice de permissions par état à préciser

Les verbes suivants doivent être traités séparément pour chaque domaine : consulter, créer, modifier, valider, publier, annuler et exporter. La matrice doit couvrir les inscriptions, réinscriptions, groupes, affectations, séances, présences, examens, notes, réclamations, jurys, relevés, documents, contrats, paiements, bourses, communication, support, achats, stocks et échanges avec le site.

Le choix d’une année n’élargit pas les droits. L’Informaticien conserve ses accès métier autorisés, avec les mêmes validations et audits. Enseignants et étudiants restent limités à leurs dossiers et attributions réels.

## Recette attendue

- Refus d’une seconde ouverture, même pour deux requêtes concurrentes.
- Refus d’une transition interdite ou d’une année non préparée.
- Refus sans rôle autorisé, sans motif ou sur révision obsolète.
- Parcours complet de l’année courante vers la suivante, sans étape impossible.
- Affichage des dossiers réellement bloquants, puis réussite après leur résolution autorisée.
- Contrôle des règles par état côté base et serveur, même si l’interface est contournée.
- Conservation des comptes, historiques, dettes et documents existants.
- Absence de déplacement implicite de dossiers ou de modification d’une année passée.
- Tests des campagnes et dossiers du site lors du changement d’année.
- Reprise après erreur sans perte de saisie ni écriture partielle.
- Contrôle sur mobile et ordinateur.

## Sources examinées

- `src/components/modules/academic/AcademicYearLifecycle.tsx`
- `src/components/modules/academic/YearPreparationPanel.tsx`
- `src/app/api/academic-years/route.ts`
- `src/services/academicYearService.ts`
- `src/services/yearPreparationService.ts`
- `src/server/academicYearContext.ts`
- `supabase/migrations/202610150023_academic_year_context.sql`
- `supabase/migrations/202610150024_annual_business_scope.sql`
- `supabase/migrations/202610150026_annual_fees_and_subjects.sql`
- `supabase/migrations/202610150027_year_preparation.sql`
- `scripts/verify-academic-years.mjs`
- `tests/ui/academic-years.spec.ts`

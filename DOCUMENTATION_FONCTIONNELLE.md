# Documentation fonctionnelle du prototype ESCEN

## 1. Objet du document

Ce document présente l'état réel du portail intégré ESCEN au 13 août 2026. Il distingue les fonctionnalités opérationnelles, les fonctionnalités partielles ou simulées et les éléments restant à concevoir.

Les statuts utilisés sont :

- **Fonctionnel** : le parcours principal existe et modifie correctement l'état local.
- **Partiel** : une partie du processus existe, mais il reste des règles, écrans ou contrôles à ajouter.
- **Démonstration** : l'écran est visible, mais son contenu est fixe ou son action est seulement simulée.
- **Absent** : aucun processus exploitable n'est encore disponible.

## 2. Cadre actuel du projet

Le projet est un prototype front-end réalisé avec Next.js 15, TypeScript et React. Les données sont mockées et les modifications sont conservées uniquement dans la mémoire du navigateur. Elles sont perdues au rafraîchissement.

Le prototype démarre volontairement avec des collections vides : aucune année, filière, étudiant, enseignant, salle, opération financière ou annonce n'est préchargé. Les données sont créées manuellement à travers les processus disponibles.

Le prototype ne contient volontairement ni base de données, ni API backend, ni authentification réelle. Les contrôles d'accès sont simulés dans l'interface et dans les services locaux. Des contrôles serveur seront indispensables avant toute mise en production.

Le périmètre concerne uniquement les étudiants déjà inscrits et la gestion académique, administrative, financière et opérationnelle. Le CRM, les prospects, les candidatures, les admissions et le portail public sont hors périmètre.

## 3. Rôles actuellement reconnus

Les rôles disponibles sont :

- Directeur Général ;
- Directeur Général Adjoint ;
- Directeur Académique ;
- Logisticien académique ;
- Enseignant ;
- Surveillant ;
- Responsable Administratif et Financier ;
- Responsable marketing ;
- Responsable des achats et de la logistique ;
- Responsable du site ;
- Informaticien ;
- Étudiant ;
- Délégué ;
- Stagiaire.

Il n'existe pas de Directeur des études ni de Directeur des Affaires Financières.

À ce stade, le Logisticien académique possède provisoirement les capacités académiques du Directeur Académique, auxquelles s'ajoutent la gestion des groupes, les affectations pédagogiques et la planification.

L'Informaticien n'est pas un administrateur métier. Le Stagiaire ne reçoit aucune permission métier automatique. L'Étudiant et le Délégué n'accèdent pas au module institutionnel Finance.

## 4. Architecture fonctionnelle existante

L'application contient les espaces principaux suivants :

1. Mon Espace ;
2. Tableau de bord global ;
3. Académique ;
4. Étudiants ;
5. Finance ;
6. Personnel ;
7. Communication ;
8. Système et audit.

Les menus, sous-menus, formulaires et boutons sont filtrés par permission. Une navigation ne doit plus ouvrir automatiquement un sous-menu interdit.

Des services mock locaux isolent déjà une partie de la logique métier :

- référentiel académique ;
- emplois du temps ;
- notes ;
- réclamations ;
- finance.

## 5. État détaillé des modules

### 5.1 Mon Espace — Partiel

Déjà présent :

- accueil personnel avec indication du rôle actif ;
- annonces et actualités ;
- filtrage général du périmètre selon le rôle.

Limites :

- le tableau de bord n'est pas encore réellement personnalisé par rôle ;
- l'emploi du temps présenté est codé en dur ;
- le DG et le DGA voient encore un contenu qui ne correspond pas à leur fonction ;
- les annonces ne sont pas filtrées selon leur audience ;
- la situation personnelle de l'Étudiant ou du Délégué n'est pas encore regroupée ici.

À réaliser : tableaux de bord spécifiques au DG, DGA, Directeur Académique, Logisticien, Enseignant, Surveillant, RAF, Étudiant et Délégué.

### 5.2 Tableau de bord global — Démonstration

Déjà présent : indicateurs généraux et écrans de rapports accessibles au DG et au DGA.

À réaliser : calculs réels, filtres par année/filière/niveau, alertes, activités récentes, comparaisons, exports et indicateurs spécifiques à chaque direction.

### 5.3 Années scolaires — Fonctionnel partiel

Déjà présent :

- création d'une année scolaire indépendante avec libellé et dates ;
- modification avec validation et historique local ;
- statuts `BROUILLON`, `OUVERTE`, `EN_CLOTURE` et `CLOTUREE` ;
- contrôle d'unicité, cohérence des dates et non-chevauchement ;
- protection des années clôturées ;
- séparation entre la gestion des années et la configuration académique.

À réaliser :

- règles d'ouverture et de clôture ;
- attribution des transitions aux rôles après décision ESCEN ;
- intégration au futur audit transversal.

### 5.4 Configuration académique guidée — Partiel

Un assistant avec boutons **Précédent** et **Suivant** existe. Il comprend :

1. sélection d'une année scolaire existante ;
2. filières et parcours ;
3. niveaux et semestres ;
4. matières ;
5. groupes ;
6. enseignants ;
7. affectations pédagogiques ;
8. récapitulatif.

L'année scolaire n'est pas créée dans cet assistant : elle sert uniquement de contexte.

Limites : plusieurs créations utilisent encore des fenêtres `prompt`, les validations d'étape sont incomplètes et le récapitulatif ne constitue pas encore une validation métier formelle.

### 5.5 Cycles, niveaux et semestres — Partiel

Les règles validées sont intégrées :

| Cycle | Niveau | Semestres |
|---|---|---|
| Licence | L1 | S1 et S2 |
| Licence | L2 | S3 et S4 |
| Licence | L3 | S5 et S6 |
| Master | M1 | S1 et S2 |
| Master | M2 | S3 et S4 |

Un semestre ne peut plus être créé librement. Les associations sont générées à partir du niveau pour l'année sélectionnée. Les affectations L2 mockées utilisent désormais S3.

À réaliser : dates des semestres, ouverture sélective des niveaux par année, blocage des incohérences et gestion des calendriers différents si cette règle métier est confirmée.

### 5.6 Filières et parcours — Fonctionnel partiel

Déjà présent : création et modification par formulaires intégrés, validation des codes, activation/désactivation et rattachement explicite d'un parcours à une filière. Désactiver une filière désactive également ses parcours afin d'éviter un catalogue incohérent.

Filières L1 actuellement identifiées fonctionnellement :

- Marketing Digital & E-commerce ;
- Management de projets numériques ;
- Finance Digitale ;
- Intelligence Artificielle et Génie Logiciel.

Ces quatre filières disposent maintenant de données de démonstration. La liste reste extensible et non définitive. Il reste à définir leurs niveaux ouverts par année et leur historique annuel.

### 5.7 Matières et crédits — Partiel critique

Déjà présent : code, intitulé, coefficient et état actif/inactif.

Manquant :

- nombre de crédits obligatoire ;
- volume horaire ;
- type obligatoire ou optionnel ;
- unité d'enseignement ;
- rattachement explicite à l'année, la filière, le parcours, le niveau et le semestre ;
- conservation des anciennes valeurs lors d'une évolution annuelle ;
- totalisation des crédits par semestre et année.

### 5.8 Groupes — Partiel

Règles intégrées :

- un groupe est créé par l'administration ;
- il appartient à une année scolaire et à un niveau ;
- il peut concerner plusieurs filières ;
- il ne possède pas de capacité maximale ;
- un groupe n'est jamais une salle ;
- l'affectation d'un étudiant contrôle son année, son niveau et sa filière.

La création permet déjà de sélectionner plusieurs filières. Seuls les groupes compatibles sont proposés pendant une affectation manuelle.

À réaliser :

- menu Groupes indépendant et complet ;
- édition des filières concernées ;
- règles configurables d'affectation automatique ;
- mise à jour cohérente des listes d'étudiants des groupes ;
- historique des affectations et changements ;
- gestion formelle des groupes L1 définis par ESCEN.

### 5.9 Enseignants et affectations pédagogiques — Partiel

Déjà présent : référentiel d'enseignants, activation/désactivation et affectation mock d'un enseignant à une matière, un groupe, un semestre et une année.

À réaliser : vrais formulaires de création et d'affectation, périodes de validité, volumes horaires, contrôles de doublon, consultation de charge, remplacement d'enseignant et historique.

### 5.10 Emplois du temps — Fonctionnel partiel

La création locale d'une séance contrôle :

- le format de la date et des heures ;
- l'ordre des heures ;
- les périodes bloquées ;
- la disponibilité de la salle ;
- la capacité de la salle par rapport à l'effectif réel du groupe ;
- les conflits de salle ;
- les conflits d'enseignant ;
- les conflits de groupe.

À réaliser : calendrier visuel, modification, déplacement et annulation tracés, publication, gestion des jours fériés, périodes bloquées administrables, examens, surveillants, salles et sites.

### 5.11 Présences — Partiel

Déjà présent : ouverture d'une séance, liste des étudiants et statuts Présent, Absent, Retard ou Absent justifié. La saisie est limitée aux rôles disposant de la permission correspondante.

Limites : la modification de la feuille repose encore sur un état local incomplet et le bouton de validation simule une confirmation.

À réaliser : sauvegarde locale structurée, justification, validation/verrouillage, corrections tracées, statistiques et alertes d'absentéisme.

### 5.12 Évaluations et notes — Fonctionnel partiel

Workflow implémenté :

`BROUILLON → SAISIES → SOUMISES → A_CONTROLER → VALIDEES → PUBLIEES`

Déjà présent :

- création d'une évaluation ;
- saisie contrôlée entre 0 et 20 ;
- restriction de l'Enseignant à ses enseignements et groupes ;
- soumission, contrôle, validation et publication selon les permissions ;
- retour à l'Enseignant avec motif obligatoire ;
- historique des transitions ;
- correction encadrée d'une note publiée à travers une réclamation.

À réaliser : pondérations, moyennes, crédits, unités d'enseignement, absences aux examens, rattrapages, verrouillage formel, import/export, calcul des résultats et décisions de jury.

### 5.13 Réclamations — Fonctionnel partiel

Workflow implémenté :

`NOUVELLE → EN_ANALYSE → TRANSMISE_ENSEIGNANT → AVIS_ENSEIGNANT → DECISION_ACADEMIQUE → CORRECTION_EVENTUELLE → CLOTUREE`

Déjà présent : transitions contrôlées, intervention de l'enseignant, décision académique, correction éventuelle, motif et historique.

À réaliser : dépôt par l'étudiant, pièces jointes, délais, notifications, files de traitement, recherche, filtres et tableaux de suivi.

### 5.14 Étudiants — Partiel

Déjà présent : liste, fiche individuelle, données personnelles mockées, bourse, situation financière, aperçu de carte et affectation manuelle à un groupe compatible.

Les écrans de réinscription, abandon et impression de carte sont encore démonstratifs et sont masqués aux rôles sans permission dédiée.

À réaliser : dossier complet, documents, modification contrôlée, inscription d'un étudiant déjà admis, affectation automatique, historique académique annuel, réinscription, abandon avec motif/validation, changement de filière ou niveau et génération réelle des cartes.

### 5.15 Finance — Fonctionnel partiel

Déjà présent :

- indicateurs calculés sur les données mockées ;
- échéanciers ;
- enregistrement d'un paiement positif ne dépassant pas le solde ;
- modes espèces, virement, carte, mobile money et chèque ;
- référence de transaction et reçu ;
- imputation simple sur les échéances ;
- annulation non destructive avec auteur, date et motif ;
- filtrage du module selon les permissions.

À préciser : aucun rôle ne possède actuellement la permission d'annuler un paiement depuis la suppression du Directeur des Affaires Financières. Le rôle compétent doit être décidé.

À réaliser : tarification par année/filière/niveau, séparation inscription/scolarité, création des échéanciers, remises, bourses, pénalités, caisse, rapprochement, reçus PDF, exports, reporting réel et audit financier exhaustif.

### 5.16 Personnel, utilisateurs et rôles — Démonstration

Une liste statique de collaborateurs et d'enseignants existe. L'Informaticien peut voir le module selon ses permissions techniques.

À réaliser : création/modification d'utilisateur, attribution et historique des rôles, activation/désactivation, permissions personnalisées, dossiers du personnel et séparation entre comptes techniques et responsabilités métier.

### 5.17 Communication — Partiel

Déjà présent : création locale d'une annonce, flux et actualités. Le formulaire de publication n'est visible qu'avec la permission de gestion.

À réaliser : audiences par rôle/filière/niveau/groupe, brouillons, programmation, modification, archivage, notifications et historique de diffusion.

### 5.18 Système, audit, sauvegardes et support — Démonstration

Déjà présent : journal local de certaines actions, écrans de sauvegarde et ticket de support fictif. Les sous-menus sont filtrés séparément.

À réaliser : journal complet avec utilisateur, rôle, date, action, entité, ancienne/nouvelle valeur et motif ; filtres ; exports ; véritable gestion des tickets. Les sauvegardes restent nécessairement simulées tant qu'aucune persistance n'existe.

## 6. Modules ou processus encore absents

Les domaines suivants n'ont pas encore de processus complet dédié :

- unités d'enseignement et gestion complète des crédits ;
- examens, sessions et rattrapages ;
- délibérations et jurys ;
- résultats, bulletins et relevés de notes ;
- cartes étudiantes réellement générées ;
- salles et sites administrables ;
- jours fériés, vacances et périodes bloquées administrables ;
- surveillance des examens ;
- abandon et réinscription complets ;
- tarification, frais d'inscription et frais de scolarité ;
- échéanciers configurables ;
- bourses et remises administrables ;
- reporting académique et financier complet ;
- notifications ;
- support opérationnel ;
- historique académique longitudinal ;
- affectation automatique des étudiants aux groupes ;
- espaces personnels réellement adaptés à chaque rôle.

## 7. Décisions métier restant à confirmer

Avant les implémentations correspondantes, ESCEN doit préciser :

1. Qui peut ouvrir et clôturer une année scolaire ?
2. Les dates des semestres sont-elles communes à toutes les filières ?
3. Quel total de crédits est attendu par semestre et par année ?
4. Comment sont structurées les unités d'enseignement ?
5. Quelles règles exactes déterminent automatiquement le groupe d'un étudiant ?
6. Quels sont les trois groupes L1 officiels et quelles filières sont associées à chacun ?
7. Qui peut réinscrire un étudiant ou déclarer un abandon ?
8. Qui peut imprimer ou rééditer une carte étudiante ?
9. Qui peut annuler un paiement ?
10. Quelles actions supplémentaires sont accordées au Délégué ?
11. Quel contenu exact doit apparaître dans Mon Espace pour chaque rôle ?

## 8. Priorités recommandées

### Priorité 1 — Finaliser le socle académique

1. Années scolaires et statuts ;
2. filières et parcours complets ;
3. niveaux et périodes semestrielles ;
4. matières, crédits et unités d'enseignement ;
5. menu Groupes et règles d'affectation ;
6. enseignants et affectations pédagogiques.

### Priorité 2 — Finaliser les opérations académiques

1. Étudiants et historique annuel ;
2. affectation automatique aux groupes ;
3. emplois du temps ;
4. présences ;
5. examens et notes ;
6. réclamations ;
7. délibérations et relevés.

### Priorité 3 — Finaliser les fonctions administratives

1. Finance et tarification ;
2. réinscriptions et abandons ;
3. cartes et documents ;
4. communication ;
5. personnel, rôles et permissions ;
6. audit, support et reporting.

### Priorité transversale — Expérience et sécurité

- remplacer les `prompt` et `alert` par des formulaires et confirmations intégrés ;
- personnaliser Mon Espace par rôle ;
- revoir chaque permission avec ESCEN ;
- conserver les contrôles dans les services, en plus du masquage des boutons ;
- ajouter des tests automatisés ;
- vérifier chaque rôle, menu, action et portée de données.

## 9. Qualité technique et vérification

Le projet utilise TypeScript strict, des composants React fonctionnels et des services mock par domaine. Aucun framework de test applicatif n'est encore configuré.

Les commandes de vérification sont :

```bash
npm run lint
npm run build
```

Avant toute livraison, il faut également tester manuellement chaque rôle, sous-menu, formulaire, action sensible et affichage responsive.

## 10. Conclusion

Le prototype dispose déjà d'un socle utile pour démontrer les rôles, les permissions, le référentiel académique, les groupes, la planification, les notes, les réclamations et les paiements. Les workflows de notes et de réclamations ainsi que plusieurs contrôles de planning et de finance sont réellement implémentés en mémoire.

Le produit n'est toutefois pas encore une application de gestion complète. Les principaux chantiers sont la finalisation du référentiel académique, les crédits, les groupes et leur affectation automatique, l'historique étudiant, les délibérations, les documents, la finance complète et la personnalisation des espaces par rôle.

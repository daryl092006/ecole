# Année de travail et consultation annuelle

État du 15 octobre 2026 — migrations additives 202610150023 et 202610150024 appliquées.

Le champ « Année » indique le contexte consulté. Le choix personnel est conservé par compte et rôle. Il ne change pas l’année officielle de l’établissement. « Toutes les années » permet une consultation transversale dans les limites des droits du compte. Les formulaires ouverts demandent confirmation avant un changement de contexte.

Dans Pédagogie → Référentiel → Années universitaires, les comptes disposant de la permission globale `academic.year.open` peuvent ouvrir une année, la désigner comme année de travail ou engager sa clôture. Chaque commande exige un motif, une confirmation et la révision courante. L’acteur, son rôle et les valeurs avant/après sont audités. Les droits existants sont conservés.

Instruction utilisateur du 15 octobre 2026 : une seule année doit être ouverte à la fois. Le cycle actuellement implémenté permet encore plusieurs années ouvertes et doit être mis en conformité ; seule la désignation de travail est déjà unique. Voir `REVUE_CYCLE_ANNEE_SCOLAIRE.md` pour les écarts et les décisions encore nécessaires. Les dates ne déclenchent aucune ouverture automatique. La migration ne désigne aucune année : en l’absence de configuration, les écrans d’activité demandent une année précise. La consultation transversale exige de choisir explicitement « Toutes les années ».

Le cycle autorisé est BROUILLON → OUVERTE → EN_CLOTURE → CLOTUREE. Avant de préparer la clôture de l’année de travail, il faut désigner une autre année ou retirer sa désignation. La préparation bloque les nouvelles inscriptions, groupes, enseignements, affectations, séances, évaluations et contrats. La clôture exige la résolution des évaluations inachevées, réclamations ouvertes et tentatives actives ; les opérations académiques de l’année close sont protégées. Les anciennes créances restent réglables dans leur année d’origine.

Les données sont filtrées côté serveur par leurs véritables relations annuelles, après contrôle des autorisations. Les informations civiles et catalogues partagés restent communs. Les dossiers sans inscription annuelle confirmée restent conservés dans la base et dans la consultation transversale ; ils ne sont pas présentés comme inscrits à une année sélectionnée. Une réinscription ne remplace ni les anciennes inscriptions, ni les notes, ni les décisions, ni les paiements. Cette évolution ne crée pas automatiquement de réinscription, de promotion ou de décision de jury.

Les archives utilisent uniquement les références confirmées et les correspondances de provenance du même lot. Une année inconnue n’est pas devinée à partir d’un étudiant ou d’un identifiant ressemblant. Ces archives restent dans la consultation transversale autorisée ; leur absence d’une vue annuelle ne signifie pas leur suppression.

Chaque nouvelle formation publiée sur le site exige une année ouverte. Le formulaire public utilise l’année de travail officielle et conserve cette année dans son brouillon et son dossier. Une bascule de campagne ne transfère pas le dossier existant ; le site permet de commencer un nouveau dossier explicitement. Les anciens enregistrements sans année sont conservés sans rattachement inventé. Une candidature reçue ne constitue pas une inscription académique officielle.

Vérifications : `npm run lint`, `npm run build`, `npm run test` (dont les assertions PostgreSQL), `npm run db:verify:remote` et `npm run test:ui -- tests/ui/academic-years.spec.ts tests/ui/website-exchange.spec.ts`.

## Extension à toutes les activités

La migration 24 ajoute une année aux racines métier jusque-là incomplètes : communications, tickets de support, achats, mouvements de stock, sujets, pièces étudiantes, documents émis et articles du site. Les messages, pièces jointes, lignes et versions suivent leur parent réel. Les nouvelles activités exigent une année explicite ou déduite d’un parent confirmé ; un changement ultérieur d’année est refusé. Les versions d’un sujet gardent leur année. Les anciens enregistrements sans année ne sont pas attribués à l’année courante.

Le filtre serveur exige une chaîne de références qui atteint réellement l’année sélectionnée. Une référence absente ou un cycle entre des parents sans année ne constitue pas un rattachement. Les données inconnues restent disponibles en consultation transversale autorisée. Les archives de publications et de journaux sans année ne sont plus considérées comme communes à toutes les années.

L’identité civile, les comptes et rôles, les enseignants, sites, salles et catalogues communs ne sont pas dupliqués chaque année. Ce sont leurs inscriptions, affectations, activités, décisions, documents et opérations qui portent le contexte annuel. Les droits existants restent appliqués ; le choix d’une année n’ajoute aucune permission. Le sélecteur est disponible pour tous les rôles disposant d’activités autorisées, y compris communication et logistique.

Les routes de sujets et de gestion du site exigent une année précise pour les écritures. Les articles publics sont ceux de l’année de travail officielle ; les articles des anciennes années restent stockés. En l’absence d’année officielle, aucun article n’est attribué automatiquement à une campagne. Les autres commandes métier encore indisponibles ne sont pas activées par cette migration.

## Reprise des années historiques — migration 25

Les trois années aux dates complètes sont reprises avec leurs noms et dates exacts ; leur code canonique reprend le libellé annuel car la source duplique `as_2026_2027`. Les archives restent immuables et liées par provenance. Le seul marqueur source `active=1` restaure 2025–2026 comme année ouverte et année de travail, uniquement si aucune configuration actuelle ne doit être préservée. Ce choix ne repose pas sur la date du jour. 2026–2027 et 2027–2028 restent en brouillon ; 2023–2024 reste à compléter sans dates inventées. Le passage institutionnel à une autre année reste une commande explicite.

Pour la direction et l’Informaticien autorisés à consulter les archives, les dossiers déjà repris restent visibles dans leur année lorsque les liens source exacts confirment cette appartenance. Aucune inscription canonique n’est créée par ce pont de consultation.

## Frais et matières annuels — migration 26

Finance → Contrats, frais et bourses → Tarifs de l’année permet de définir séparément scolarité et inscription, avec filière et niveau facultatifs. Sans ces critères le tarif est commun ; les variantes restent explicites. La sélection d’un tarif pour un contrat doit être confirmée : aucune priorité entre un tarif commun et une variante n’est inventée, et aucun contrat existant n’est recalculé. Les mises à jour sont auditées ; les anciennes années et contrats restent conservés. Les montants officiels ne sont pas préremplis à partir d’hypothèses.

Dans Filières, parcours et matières → Matières, l’année est obligatoire pour les créations. Le même code peut être défini dans une autre année. Une définition utilisée par une maquette ne peut être renommée silencieusement ; une matière annuelle doit correspondre à l’année de l’offre. Les anciennes matières sans année restent intactes pour reprise. Le lien examens → offre annuelle et notes → candidat → inscription/évaluation reste contrôlé par les clés étrangères et les garde-fous existants.

## Préparation de l’année — migration 27

Dans Référentiel → Années universitaires, le bouton Préparer ouvre la liste des configurations nécessaires. Les formations annuelles, groupes et rattachements, matières des maquettes, frais de scolarité et d’inscription pour chaque formation, et au moins une caisse ou un mode de paiement sont vérifiés. La création et la mise à jour des paramètres sont autorisées en BROUILLON ; l’ouverture via la commande serveur refuse une configuration incomplète. Les inscriptions et encaissements ne sont pas des opérations de préparation. Les nouvelles inscriptions vérifient à nouveau les paramètres et l’état ouvert, sans se fier au seul affichage de la liste.

Les écrans Filières, parcours et matières permettent de constituer les maquettes, semestres, unités et composantes ; le référentiel permet de créer les offres annuelles et de leur rattacher les groupes. Chaque relation est contrôlée par les références réelles. Les champs obligatoires et budgets SQL restent appliqués. Aucune maquette, filière, matière ou décision historique absente n’est inventée.

Étudiants → Nouvelle inscription propose les dossiers civils sans inscription antérieure et sans origine historique. Réinscriptions → Réinscrire un ancien étudiant propose uniquement les anciens dossiers ; l’inscription précédente doit être canonique, dans l’année immédiatement précédente et non ambiguë. Les dossiers historiques non encore repris sont signalés et restent non sélectionnables. La reconduction au même niveau et dans la même filière est disponible ; les promotions ou réorientations nécessitent un parcours de décision à terminer, elles ne sont pas autorisées par défaut.

Après relecture, l’inscription, l’affectation au groupe, l’événement motivé, le contrat et ses lignes de frais sont enregistrés dans une même transaction avec révision concurrente. Les deux tarifs sont choisis explicitement parmi les tarifs compatibles ; les montants sont figés dans le contrat en brouillon, sans recalcul des anciennes années. La personne doit déjà avoir son dossier civil ; créer cette identité ne vaut pas inscription. La commande combinant inscription et préparation du contrat requiert les droits de gestion du parcours et d’enregistrement financier, sans modifier les attributions de rôle.

L’inscription ne crée ni paiement, ni reçu, ni compte Auth. Les encaissements ultérieurs sont distincts et contrôlent les modes/caisses configurés pour l’année. Les anciennes dettes d’une année clôturée restent réglables sans créer de nouvelle inscription. L’approbation finale du contrat, les échéanciers, les allocations comptables et les décisions de passage restent des parcours distincts à compléter. Aucun dossier réel n’a été inscrit ou encaissé pendant cette recette.

### Configuration dans une popup

La préparation s’ouvre dans une popup portant le nom de l’année choisie, indépendamment de l’année de consultation affichée derrière. Les lectures et écritures du catalogue transmettent explicitement cette année au serveur. Le formulaire affiche l’année et la catégorie de frais déjà connues, sans demander de les sélectionner à nouveau. Les référentiels partagés existants sont réutilisés ; seuls les prérequis absents invitent à les compléter. Un tarif commun peut couvrir plusieurs formations.

Après une sauvegarde réussie, le formulaire et l’étape sont fermés, puis le bilan est rechargé. En cas d’erreur, la saisie reste disponible. Le composant partagé des formulaires utilise également une popup, avec protection des saisies, blocage de fermeture pendant l’enregistrement et gestion du focus et de la touche Échap pour les fenêtres superposées. Recette : `npm run test:ui -- tests/ui/year-preparation.spec.ts tests/ui/crud.spec.ts tests/ui/business-processes.spec.ts`.

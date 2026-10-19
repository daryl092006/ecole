# Mails après les actions — proposition du 19 octobre 2026

Statut : périmètre étendu selon la demande de l’utilisateur du 19 octobre : résultats disponibles, examen soumis, cours programmés, scolarité payée et notifications concernant les professeurs. Aucun envoi métier ni changement de base activé ; le service d’envoi et l’accord sur le SQL restent nécessaires.

## Messages proposés

| Événement confirmé | Destinataire | Contenu |
| --- | --- | --- |
| Dépôt final d’une candidature | Candidat ayant déposé le dossier | Référence, année et accusé de réception ; aucune promesse d’admission |
| Changement du suivi d’une candidature | Candidat concerné | Nouveau suivi : reçu, en analyse ou classé ; aucune décision d’admission implicite |
| Copie d’examen remise volontairement | Étudiant concerné | Confirmation de remise, épreuve, année et heure de remise ; aucune promesse de note |
| Copie remise automatiquement à l’échéance | Étudiant concerné | Remise automatique ; seules les réponses reçues par le serveur sont incluses |
| Copie remise, volontairement ou à l’échéance | Professeur affecté à l’évaluation | Copie disponible dans son espace ; aucune réponse de l’étudiant dans le mail |
| Affectation pédagogique enregistrée | Professeur affecté | Matière, groupe, année et période d’affectation ; ce message ne remplace pas la programmation des séances |
| Cours programmé | Étudiants inscrits au groupe et professeur affecté | Date, horaire en heure de Lomé, salle ou mode de passage et lien vers le planning |
| Cours déplacé ou annulé | Étudiants et professeur concernés | Nouvel horaire ou annulation de la séance précise |
| Examen programmé, déplacé ou annulé | Candidats de l’évaluation et professeur affecté | Épreuve, année, horaire et lien vers le planning |
| Soumission des notes | Responsables académiques autorisés pour le groupe, le site et l’année | Évaluation et lien vers le contrôle ; aucune note chiffrée dans le mail |
| Retour des notes à l’enseignant | Professeur affecté | Demande de reprise des notes et lien vers son espace |
| Validation des notes | Professeur affecté | Confirmation de validation ; les résultats ne sont pas annoncés aux étudiants avant leur publication |
| Publication des résultats | Chaque étudiant concerné et professeur affecté, avec modèles distincts | Résultats disponibles pour l’étudiant ; publication confirmée pour le professeur |
| Paiement effectivement enregistré | Étudiant concerné ; payeur uniquement si son identité et son adresse sont explicitement rattachées au paiement et autorisées | Montant, référence, date et accès au reçu dans l’espace protégé |
| Scolarité soldée | Étudiant concerné ; même condition de rattachement pour un éventuel payeur | Confirmation du solde annuel, distincte de l’accusé d’un versement partiel |

Les brouillons de candidature, frappes dans une copie, sauvegardes intermédiaires de notes et versions préparatoires d’un sujet ne déclencheraient aucun mail. « Examen bien soumis » désigne ici une copie effectivement remise, pas un brouillon de sujet enregistré par un professeur. Aucun destinataire en copie collective. Aucun mot de passe, jeton de dossier ou pièce privée dans les messages. Les mails financiers ne sont pas adressés aux professeurs du seul fait de leur rôle enseignant.

Un versement partiel confirme uniquement le montant reçu. « Scolarité soldée » reprend la situation financière existante : contrat approuvé, solde net nul ou négatif, avec exclusion des paiements en attente ou annulés et prise en compte des remboursements et avoirs. Le message ne part qu’au passage d’un solde positif à une situation soldée ; pas à chaque actualisation. Aucun nouveau calcul financier parallèle n’est introduit. Le SQL utilise la vue existante `escen.contract_balances` comme garde de cohérence.

Aucun envoi rétroactif sur les dossiers, cours, copies ou paiements historiques lors de l’activation. Les changements réellement confirmés après activation produiront les événements. Une absence d’adresse ne doit ni inventer un destinataire ni annuler une opération métier réussie ; le suivi devra la signaler.

L’identification des destinataires doit reprendre les références du dossier, des candidats et des affectations. Une attribution complète doit couvrir le site, le groupe et l’année ; aucun rapprochement par nom ni élargissement à tous les comptes d’un rôle.

[Aperçu local des messages par destinataire](apercu-mails.html). Les noms, références et adresses de cet aperçu sont fictifs ; aucun bouton n’envoie de mail. La source des exemples est `email-preview-data.json` ; régénération avec `node docs/proposals/render-email-previews.mjs`.

## File proposée

[SQL complet proposé](email_outbox.sql), conservé hors de `supabase/migrations/` et non exécuté.

- Une ligne par événement, version et destinataire, avec une contrainte d’unicité contre les doublons.
- Rattachement explicite à une année et à un dossier, une évaluation, une copie, une séance, une affectation, un paiement ou un contrat vérifiés par la RPC.
- États : en attente, traitement, accepté par le prestataire, échec confirmé ou résultat incertain. Une acceptation ne prouve pas la réception dans la boîte du destinataire.
- Une prise en charge verrouille les lignes ; deux processus ne prennent pas le même mail. Un traitement expiré passe en résultat incertain, sans renvoi automatique susceptible de doubler un envoi déjà accepté.
- Consultation proposée au DG et à l’Informaticien avec attribution globale ; reprise d’un échec confirmée et motivée par l’Informaticien. Une erreur incertaine nécessite d’abord une vérification auprès du prestataire.
- RLS, audit existant, RPC réservées au serveur et exclusion de la file du chargement général du campus. Les traitements de mails ne changent pas la révision des notes, du planning ou du référentiel.

Le SQL prépare le stockage et les RPC de la file. Les déclencheurs métier, les routes d’administration, l’écran de suivi et le traitement par le prestataire restent à brancher après validation. Le futur enregistrement d’un événement et de ses messages devra être atomique ; un simple appel d’envoi après la réponse HTTP d’une action ne suffit pas.

## Informations encore nécessaires

1. Service d’envoi de l’école : SMTP, Google Workspace ou prestataire transactionnel, avec adresse expéditrice autorisée.
2. Les événements principaux ont été précisés par l’utilisateur. Les règles détaillées de ciblage ci-dessus devront être conservées dans le branchement transactionnel ; le payeur ne doit pas être déduit d’un simple nom libre.
3. Accord explicite sur le SQL avant création de la migration, comme demandé dans `AGENTS.md`, ligne 179. Une éventuelle installation de dépendance sera soumise séparément si le service choisi l’exige.

Les identifiants et secrets devront être configurés côté serveur ; ne pas les mettre dans les messages, les aperçus, le code client ou un fichier versionné.

## Vérifications à réaliser après accord

Doublon d’événement, refus d’accès et d’une autre année, rollback de l’action sans mail partiel, absence d’adresse, état incertain, reprise concurrente, indisponibilité du prestataire et conservation de l’audit. Ajouter les cas versement partiel, paiement en attente/annulé, remboursement, contrat brouillon, copies en cours, remise automatique et séparation des destinataires enseignant/étudiant/finance. La réception réelle exigera ensuite un envoi de recette explicitement autorisé.

## Vérification de cette préparation

Les 25 modèles sont regroupés par destinataire : étudiant ou candidat, professeur, direction académique. Ils couvrent les confirmations demandées et les variantes de déplacement, annulation et validation. L’aperçu utilise deux sélecteurs pour passer d’un destinataire et d’un événement à l’autre.

Les 25 modèles ont été parcourus dans Chrome à 390 et 1440 pixels : 50 rendus, aucun débordement, aucune erreur JavaScript et aucun appel réseau. Les modèles financiers ne sont pas proposés dans le sélecteur professeur. Captures dans `tmp/screenshots/annual-offerings/<largeur>/mails-proposes/`. TypeScript et ESLint passent sans erreur (deux avertissements préexistants) ; la suite existante passe avec 175 groupes PostgreSQL. Ces contrôles portent sur les aperçus et sur l’application existante : le SQL proposé n’est pas exécuté ni validé en base, conformément au point d’arrêt requis avant migration.

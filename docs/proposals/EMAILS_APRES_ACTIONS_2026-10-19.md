# Mails après les actions — proposition du 19 octobre 2026

Statut : proposition à valider. Aucun envoi métier ni changement de base activé.

## Messages proposés

| Événement confirmé | Destinataire proposé | Contenu |
| --- | --- | --- |
| Dépôt final d’une candidature | Candidat ayant déposé le dossier | Référence, année et accusé de réception ; aucune promesse d’admission |
| Changement du suivi d’une candidature | Candidat concerné | Nouveau suivi : reçu, en analyse ou classé ; aucune décision d’admission implicite |
| Soumission des notes | Responsables académiques autorisés pour le groupe, le site et l’année | Évaluation et lien vers le contrôle ; aucune note chiffrée dans le mail |
| Publication des résultats | Chaque étudiant concerné, individuellement | Disponibilité des résultats et lien vers son espace protégé |
| Modification ou annulation d’une séance d’examen | Candidats et enseignant concernés, individuellement | Épreuve, année, nouvel horaire ou annulation |

Les brouillons de candidature, frappes dans une copie, sauvegardes intermédiaires de notes et versions préparatoires d’un sujet ne déclencheraient aucun mail. Aucun destinataire en copie collective. Aucun mot de passe, jeton de dossier ou pièce privée dans les messages.

L’identification des destinataires doit reprendre les références du dossier, des candidats et des affectations. Une attribution complète doit couvrir le site, le groupe et l’année ; aucun rapprochement par nom ni élargissement à tous les comptes d’un rôle.

[Aperçu local des cinq messages](apercu-mails.html). Les noms, références et adresses de cet aperçu sont fictifs ; aucun bouton n’envoie de mail.

## File proposée

[SQL complet proposé](email_outbox.sql), conservé hors de `supabase/migrations/` et non exécuté.

- Une ligne par événement, version et destinataire, avec une contrainte d’unicité contre les doublons.
- Rattachement explicite à une année et à un dossier, une évaluation ou une séance vérifiés par la RPC.
- États : en attente, traitement, accepté par le prestataire, échec confirmé ou résultat incertain. Une acceptation ne prouve pas la réception dans la boîte du destinataire.
- Une prise en charge verrouille les lignes ; deux processus ne prennent pas le même mail. Un traitement expiré passe en résultat incertain, sans renvoi automatique susceptible de doubler un envoi déjà accepté.
- Consultation proposée au DG et à l’Informaticien avec attribution globale ; reprise d’un échec confirmée et motivée par l’Informaticien. Une erreur incertaine nécessite d’abord une vérification auprès du prestataire.
- RLS, audit existant, RPC réservées au serveur et exclusion de la file du chargement général du campus. Les traitements de mails ne changent pas la révision des notes, du planning ou du référentiel.

Le SQL prépare le stockage et les RPC de la file. Les déclencheurs métier, les routes d’administration, l’écran de suivi et le traitement par le prestataire restent à brancher après validation. Le futur enregistrement d’un événement et de ses messages devra être atomique ; un simple appel d’envoi après la réponse HTTP d’une action ne suffit pas.

## Informations encore nécessaires

1. Service d’envoi de l’école : SMTP, Google Workspace ou prestataire transactionnel, avec adresse expéditrice autorisée.
2. Validation des événements et destinataires proposés ci-dessus.
3. Accord explicite sur le SQL avant création de la migration, comme demandé dans `AGENTS.md`, ligne 179. Une éventuelle installation de dépendance sera soumise séparément si le service choisi l’exige.

Les identifiants et secrets devront être configurés côté serveur ; ne pas les mettre dans les messages, les aperçus, le code client ou un fichier versionné.

## Vérifications à réaliser après accord

Doublon d’événement, refus d’accès et d’une autre année, rollback de l’action sans mail partiel, absence d’adresse, état incertain, reprise concurrente, indisponibilité du prestataire et conservation de l’audit. La réception réelle exigera ensuite un envoi de recette explicitement autorisé.

## Vérification de cette préparation

Les cinq aperçus ont été parcourus dans Chrome à 390 et 1440 pixels : aucun débordement et aucun appel réseau. Captures dans `tmp/screenshots/annual-offerings/<largeur>/mails-proposes/`. TypeScript et ESLint passent sans erreur ; deux avertissements de lint préexistants subsistent. La suite existante passe avec 175 groupes de contrôles PostgreSQL. Ces contrôles portent sur l’application existante : le SQL proposé n’a pas été exécuté ni validé en base, conformément au point d’arrêt requis avant migration.

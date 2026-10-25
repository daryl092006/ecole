# Finalisation des fonctionnalités — constat du 25 octobre 2026

Les anciens rapports ne décrivent pas tous le code actuel. Ce suivi s’appuie
sur les écrans montés, leurs routes API et les transactions SQL existantes.

| Chantier | Constat vérifié | Travail à terminer |
| --- | --- | --- |
| Support | Tables, audit et transaction présents ; écrans auparavant consultatifs | Parcours terminé localement : création personnelle, réponses, prise en charge et résolution motivée ; tests PostgreSQL et navigateur réussis |
| Annonces internes | Lecture filtrée par destinataires ; aucune API d’écriture dédiée | Création et publication ciblée, retrait motivé, droits et audit |
| Achats | Fournisseurs et inventaire modifiables ; demandes et réceptions consultatives | Demande avec lignes, décision autorisée, réception partielle et suivi |
| Pièces et documents étudiants | Consultation et impression de relevés existants ; documents officiels nouveaux non émis depuis ces écrans | Dépôt et conformité des pièces, émission autorisée de cartes et certificats avec instantané conservé |
| Admission des candidatures | Un formulaire de conversion existe déjà | Rendre atomiques la création du dossier et le classement de candidature : deux appels distincts aujourd’hui, risque de succès partiel ; aucune inscription ni identité Auth automatique |
| Nouveaux accès | Comptes existants activables et rôles modifiables ; pas de parcours complet de création d’identité Auth | Invitation / premier accès, rattachement à l’identité vérifiée, échec partiel et audit ; procédure institutionnelle à confirmer |
| Délibérations et passage de niveau | Données consultables, écran de règles non approuvées | Règlement approuvé, version et dates d’effet avant tout calcul ou décision réelle |

## Premier lot : support

- API `/api/support` : authentification réelle, année autorisée, auteur imposé
  par la session, schémas stricts, droits de traitement et concurrence.
- RPC existante `escen_backend_transaction` : état et compte rendu atomiques,
  audit existant, aucune migration nécessaire.
- Deux espaces montés : `/mon-espace/support` et `/systeme/support`.
- Demande personnelle : titre, description, catégorie active facultative, priorité.
- Suivi : messages conservés ; le support prend en charge puis résout avec
  compte rendu. Les états historiques WAITING et CLOSED restent lisibles ;
  aucun nouveau circuit de transition n’est inventé pour eux.
- Consultation « Toutes les années » sans écriture ; périmètres des agents
  restreints contrôlés aussi dans le snapshot général.
- Pas d’envoi d’email, pas de téléchargement de pièces support ajouté dans ce lot.

Validation du lot support : contrôle TypeScript sans erreur, ESLint sans erreur
(deux avertissements préexistants), `npm test` réussi avec 185 groupes PostgreSQL
et régularisation des enseignants. Trois tests dédiés passent : API et transactions
PostgreSQL réelles, puis parcours navigateur à 390 et 1440 px. Les contrôles couvrent
l’auteur imposé, les autres dossiers et années, les droits, les changements concurrents,
l’audit et l’annulation de toute la transaction si une écriture échoue.
Les captures de suivi ont été relues dans `tmp/screenshots/support-completion-390.png`
et `tmp/screenshots/support-completion-1440.png`.

## Décisions nécessaires pour clore les autres chantiers

1. Délibérations : règlement applicable, seuil éliminatoire, pondérations,
   compensation, rattrapage, crédits et conditions exactes de passage/diplôme.
   Les valeurs proposées dans l’écran ne constituent pas des règles approuvées.
2. Accès : confirmer si les nouveaux comptes reçoivent une invitation par email
   pour choisir leur mot de passe ; aucun mot de passe provisoire envoyé en clair.
3. Documents officiels : modèle de carte/certificat, signataire, durée de validité
   et conditions d’émission approuvés par l’établissement.

Toute migration nouvelle sera présentée avec son SQL avant création/application,
conformément à AGENTS.md. Aucune migration existante, donnée distante ou
publication en production n’est modifiée pendant cette finalisation locale.

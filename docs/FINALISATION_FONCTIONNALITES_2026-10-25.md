# Finalisation des fonctionnalités — constat du 25 octobre 2026

Les anciens rapports ne décrivent pas tous le code actuel. Ce suivi s’appuie
sur les écrans montés, leurs routes API et les transactions SQL existantes.

| Chantier | Constat vérifié | Travail à terminer |
| --- | --- | --- |
| Support | Tables, audit et transaction présents ; écrans auparavant consultatifs | Parcours terminé localement : création personnelle, réponses, prise en charge et résolution motivée ; tests PostgreSQL et navigateur réussis |
| Annonces internes | Lecture filtrée par destinataires ; API d’écriture ajoutée | Brouillon, publication ciblée avec expiration facultative, retrait motivé, droits et audit terminés localement et testés |
| Achats | Fournisseurs et inventaire modifiables ; demandes et réceptions maintenant connectées | Demande avec lignes, décision autorisée, réception partielle et suivi terminés localement ; liaison des règlements et mouvements d’inventaire distincte |
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

## Deuxième lot : annonces internes

API `/api/communications` et écrans `/communication/annonces`,
`/mon-espace/annonces`. Les brouillons et audiences sont enregistrés ensemble,
la publication demande une confirmation distincte et le retrait conserve le motif.
Les destinataires restent filtrés par rôle, groupe, année, date et état.
La publication utilise la RPC transactionnelle existante ; aucune migration ni
email envoyé. Les pièces jointes et accusés de lecture ne sont pas ajoutés dans ce lot.

Validation : six tests dédiés support/annonces réussis, dont deux parcours
navigateur annonces (390 et 1440 px). Le contrôle PostgreSQL utilise un vrai compte
étudiant et vérifie les brouillons privés, les autres audiences, les années,
la concurrence, les dates futures/expirées, le retrait et ses trois événements
d’audit. `npm test` passe avec 185 groupes PostgreSQL ; TypeScript et ESLint sans erreur.

## Troisième lot : demandes d’achat et réceptions

- `/api/purchases` et écran `/logistique/achats` : création multi-lignes,
  approbation/refus motivé et réceptions partielles ou complètes.
- Permissions effectives distinctes : `purchase.create`, `purchase.approve`,
  `purchase.receive` ; périmètres de site et d’année, auteur imposé et concurrence.
- Quantités au millième, références de ligne vérifiées, dépassements refusés et
  état « Reçue » uniquement lorsque toutes les quantités sont livrées.
- Demande/lignes puis réceptions/état sauvegardés atomiquement par la RPC existante.
- Correction du filtre général : une réception d’achat n’est plus traitée comme
  une ligne de contrat financier ; lignes et réceptions suivent le bon achat.
- Trois tests dédiés réussis : API PostgreSQL réelle et parcours à 390/1440 px.
  Le test couvre les rôles Achats/RAF/DG, les refus, les autres années, les lots
  invalides, deux livraisons successives, l’audit et la concurrence.
- Aucun règlement financier ou mouvement de stock n’est créé automatiquement
  lors de la réception. Aucune nouvelle migration nécessaire pour ce lot.

Vérification finale des trois lots : neuf tests dédiés réussis avec
`tests/ui/functional-completion.config.ts`, dont six parcours navigateur et trois
contrôles API/PostgreSQL. Compilation de production réussie dans
`tmp/next-support-production`, TypeScript et ESLint sans erreur (deux avertissements
préexistants), tests métier et 185 groupes PostgreSQL réussis. Captures achats
relues à 390 et 1440 px.

## Décisions nécessaires pour clore les autres chantiers

1. Délibérations : règlement applicable, seuil éliminatoire, pondérations,
   compensation, rattrapage, crédits et conditions exactes de passage/diplôme.
   Les valeurs proposées dans l’écran ne constituent pas des règles approuvées.
2. Accès : confirmer si les nouveaux comptes reçoivent une invitation par email
   pour choisir leur mot de passe ; aucun mot de passe provisoire envoyé en clair.
3. Documents officiels : modèle de carte/certificat, signataire, durée de validité
   et conditions d’émission approuvés par l’établissement.

La proposition `docs/proposals/STUDENT_DOCUMENT_STORAGE_2026-10-25.sql` a été
présentée puis autorisée pour le chantier local. La migration nouvelle
`202610250049_student_document_storage.sql` prépare le stockage privé PDF/JPEG/PNG
de 5 Mo. Elle a été vérifiée dans PGlite local, sans application distante.
Les questions sur le règlement et le mode de création des accès restent en attente.

Toute migration nouvelle sera présentée avec son SQL avant création/application,
conformément à AGENTS.md. Aucune migration existante, donnée distante ou
publication en production n’est modifiée pendant cette finalisation locale.

## Quatrième lot : pièces étudiantes privées

- `/api/student-documents`, `/etudiants/cartes`, `/mon-espace/documents` et onglet
  Pièces du dossier : dépôt, remplacement explicite, historique et conformité
  avec motif et confirmation.
- Les fichiers PDF/JPEG/PNG sont contrôlés par signature et taille ; accès privé
  via lien signé court, limité au dossier, au rôle et à l’année autorisés.
- Fichier et pièce enregistrés ensemble par la transaction existante. Nettoyage
  du stockage après échec SQL confirmé ; conservation du fichier si la réponse
  est perdue après un éventuel commit, avec demande d’actualisation avant reprise.
- Les versions précédentes et leurs vérifications restent conservées. Une pièce
  justificative reste distincte d’une carte, d’un certificat ou d’un relevé officiel.
- Trois tests dédiés réussis : API avec PostgreSQL réel, parcours navigateur à
  390 et 1440 px. Test supplémentaire du résultat incertain après commit réel.
- `npm test` : 185 groupes PostgreSQL et 10 contrôles de régularisation enseignants
  réussis ; TypeScript et ESLint sans erreur (deux avertissements préexistants).
- `npm run db:describe` exécuté : dictionnaire et JSON régénérés ensemble, sans
  différence de schéma métier. Aucun stockage distant créé par ce chantier.

La comparaison globale des parcours et les écarts restants sont détaillés dans
`docs/COMPARAISON_GLOBALE_REFERENCE_2026-10-25.md` ; les examens en constituent
un domaine parmi les autres.

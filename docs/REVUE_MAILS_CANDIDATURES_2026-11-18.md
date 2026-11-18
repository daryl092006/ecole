# Revue des mails de candidatures — 18 novembre 2026

## Constat vérifié

Le dossier signalé possède une adresse candidat correcte. Les deux messages de correction lui ont été adressés ; le mail reçu sur l’adresse personnelle d’un membre Marketing était une notification interne distincte. Le code sélectionnait le contact personnel de `people.email` sans consulter l’adresse professionnelle de connexion.

Les mécanismes SQL et serveur préparent tous deux un mail candidat à la réception et à la rectification. Le journal contient des messages acceptés pour ces deux mécanismes. Le statut ACCEPTED indique une acceptation par le service d’envoi, pas une preuve de présence dans la boîte de réception. Les messages UNKNOWN ne doivent pas être renvoyés automatiquement.

Le code actuel peut aussi traiter un compte rendu d’appel ou l’ajout d’une pièce comme une nouvelle demande de correction lorsque le dossier reste au statut A_COMPLETER : le test du statut précède celui de l’action. Les comptes rendus d’appels doivent rester internes, comme prévu par leur visibilité existante. Enfin, un dossier renvoyé par le candidat ne choisit actuellement aucun rôle d’équipe à notifier.

## Adresse professionnelle

Le correctif 114 utilise l’adresse Microsoft institutionnelle liée au compte, puis l’adresse de connexion ESCEN, puis un contact déjà institutionnel. Il ne modifie aucun contact personnel. Sans adresse ESCEN disponible, la notification demeure dans l’application, sans mail personnel de repli. Les destinataires candidats restent ceux de leur dossier. Aucun ancien mail n’est modifié ou renvoyé.

## Circuit proposé pour les étapes

| Événement | Mail candidat proposé | Alerte interne proposée, sur adresse pro |
|---|---|---|
| Dépôt / création à l’accueil | Un accusé de réception regroupant référence, accès et identifiants | Clientèle et Informaticien |
| Demande de complément ou de rectification | Un mail avec les éléments demandés et le lien personnel | Clientèle et Marketing |
| Corrections validées et renvoyées par le candidat | Un accusé de réception des corrections | Clientèle et Marketing |
| Transmission à l’académie | Un mail indiquant que le dossier passe en étude académique | Direction académique et Logistique, comme actuellement |
| Admissibilité | Un mail avec le courrier et le montant des frais d’inscription | Clientèle |
| Paiement partiel confirmé | Un mail indiquant le total confirmé et le reste à régler | Clientèle |
| Admission officielle après paiement complet | Un mail avec le courrier d’admission | Clientèle |
| Refus | Un mail avec le courrier et le motif | Clientèle |
| Annulation d’une confirmation de paiement | Un mail indiquant l’annulation et son motif | Clientèle |
| Compte rendu d’appel, ajout d’une pièce, vérifications techniques | Aucun mail automatique ; conservation des traces autorisées dans l’application | Pas de nouvelle alerte mail |

Les décisions et règles financières ne changent pas. Aucun compte ni document supplémentaire n’est créé par ce circuit.

Le SQL proposé est dans `docs/sql-proposals/20261118_admissions_email_stages.sql`. Pour supprimer les doublons, les appels complémentaires `enqueueCandidateCredentialsEmail` et `enqueueRectificationEmail` devront être retirés du serveur et des deux API de candidature : le mécanisme SQL transactionnel deviendra la source unique des messages de ces étapes. Le grep des usages figure dans les résultats de l’intervention ; aucun de ces appels n’est encore retiré à ce stade.

## CRM

Le portail comporte une consultation des prospects ayant demandé une brochure et un suivi des candidatures. Le compte rendu d’appel Marketing est une trace interne et non une commande d’envoi de mail. Aucune intégration de campagnes CRM n’est configurée dans le code ou les variables locales examinés. L’adresse du CRM externe a été demandée à l’utilisateur pour vérifier son circuit réel et éviter de confondre des mails issus de services différents.

Les exports `rapport_crm_2026-10-15.xlsx` et `rapport_crm_2026-09-22.xlsx` existent dans Téléchargements, mais ne suffisent pas à établir le comportement d’envoi actuel du CRM.

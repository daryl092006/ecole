# Attribution financière des bourses — 4 novembre 2026

L’utilisateur a validé les deux règles soumises lors de la revue :

1. la bourse réduit uniquement les lignes de scolarité ; l’inscription est conservée ;
2. tout cumul avec une réduction ou une autre bourse exige une décision explicite.

## Parcours livré

Dans **Finance → Contrats, frais & Bourses → Attributions → Attribuer une bourse** :

- choix de l’étudiant inscrit, de la bourse active, de la date d’effet et du motif ;
- en présence d’un avantage existant, autorisation explicite du cumul et choix
  de la base brute ou restante ; aucune case n’est cochée automatiquement ;
- calcul serveur, sans écriture, du montant de réduction, du nouveau total,
  du reste à payer et du trop-perçu éventuel ;
- vérification et ajustement des échéances ;
- récapitulatif `ReviewedForm` avec avant/après, puis confirmation distincte.

L’attribution et la réduction sont liées par `scholarship_award_id` dans une
seule transaction `escen_backend_transaction`. L’ancien enregistrement isolé
d’attribution a été remplacé ; l’API exige désormais le récapitulatif financier
et un échéancier cohérent avant toute écriture.

Un contrat approuvé reçoit une nouvelle version approuvée liée à l’ancienne ;
les réductions antérieures sont copiées et les affectations sont contrepassées
puis recalculées. Les paiements, remboursements et reçus ne sont pas réécrits.
Un brouillon reste en brouillon : l’interface précise que son approbation est
nécessaire pour établir le montant dû officiel.

Les conditions de la bourse sont figées lors de l’attribution. La liste indique
si la réduction est réellement appliquée, intégrée au brouillon ou absente.
Les promesses d’échéanciers automatiques non implémentés ont été retirées.

## Contrôles et limites explicites

Le serveur impose lui-même les lignes de scolarité. Le navigateur ne peut pas
substituer des frais d’inscription. Authentification, permissions, groupe,
année ouverte, date d’effet, révision, version et montants relus sont contrôlés.
Les dates d’échéance préexistantes sont conservables même si elles précèdent
la rentrée ; toute nouvelle date doit appartenir à l’année sélectionnée.

Les dossiers sans contrat, historiques, avec plusieurs versions à traiter ou
comportant un avoir signalent la raison du blocage. Ils ne sont pas modifiés
silencieusement. Les lots sont limités à 100 modifications. Une réduction ne
peut pas dépasser les frais restants. Un trop-perçu est conservé ; aucun
remboursement automatique n’est créé.

## Validation locale

- TypeScript sans incrémental et ESLint : aucune erreur.
- `npm test` : workflows et 201 groupes PostgreSQL réussis, dont brouillon,
  avenant, cumul, réduction de 100 %, montant fixe, trop-perçu, affectations
  existantes, date antérieure conservée et rollback d’un échec tardif.
- Playwright : 12 tests réussis, dont attribution sans cumul et avec cumul
  explicite à 390 et 1440 px, API, refus d’un récapitulatif altéré et inscription
  conservée.

Aucune migration SQL supplémentaire n’est nécessaire. Les tests utilisent des
données locales ou simulées et ne créent pas de bourse sur la base distante.

## Publication vérifiée

La version a été publiée sur https://portail.escen.university à partir du commit
`ee1be4fdc31684a03c6ec4a350ea011458d9f6b5`.

- Projet Vercel existant : `ecole`, `prj_k0JnJTNXVrSNIMaK4MOt7cu0xRAR`.
- Déploiement : `dpl_4Hvr2ESBFvjQm1rhoXWeGvtGdeRh`.
- URL technique : https://ecole-dznhcn0t7-denis-gangnitos-projects.vercel.app
- Déploiement précédent conservé : `dpl_4pxGLiv5jENE9JDWjYBAjr9V3ndg`.

Construction de production Ready avant promotion ; aucune variable de production
n’a été remplacée, aucune migration de reprise n’a été appliquée et aucun push
Git n’a été effectué. L’archive source ne contient pas le fichier `.env.local`.

Contrôles sur le domaine public le 4 novembre 2026 à 09:27 UTC : connexion HTTP 200,
API financière sans session HTTP 401, présence du code du nouveau formulaire.
Les quatre tests de saisie, calcul, cumul explicite et confirmation passent sur
ce domaine à 390 et 1440 px. Les appels métier de ces tests sont interceptés avec
des données simulées : aucune attribution réelle n’est créée pour vérifier la
publication. Les résultats sont conservés dans `tmp/scholarship-release/`.

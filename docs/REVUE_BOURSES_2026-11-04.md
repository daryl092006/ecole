# Revue du parcours des bourses — 4 novembre 2026

## Constats vérifiés

Le formulaire d’attribution annonçait un calcul automatique des déductions.
L’API ne créait pourtant qu’une ligne dans `scholarship_awards` : aucune
`contract_discounts`, aucun ajustement des échéances et aucun avenant.

Autres incohérences constatées :

- le résultat de `filterRelationalSnapshot` était ignoré en consultation ;
- l’année et la date d’effet n’étaient pas vérifiées à l’attribution ;
- les droits des boutons incluaient DG, alors que l’API exige `payment.record` ;
- les conditions affichées provenaient du catalogue actuel, au lieu du
  `terms_snapshot` enregistré lors de l’attribution ;
- des découpages de paiement étaient présentés comme automatiquement appliqués
  alors que le parcours d’inscription ne proposait pas ces choix.

Un contrôle distant exclusivement en lecture a retourné : zéro bourse attribuée
active, 101 contrats approuvés et zéro contrat brouillon. Aucun lot de bourses
existantes n’est donc à régulariser sur la base distante consultée.

## Corrections locales et préparation technique

La consultation utilise désormais le périmètre autorisé, les conditions figées
et l’effet financier du contrat actif. Les attributions seules sont distinguées
des réductions réellement intégrées à un contrat approuvé ou à un brouillon.
Les actions de catalogue et les attributions contrôlent leurs autorisations,
l’année ciblée et les dates. Les textes ne promettent plus des traitements absents.

Le nouveau moteur `scholarshipApplicationService` prend des choix explicites :
frais concernés, base brute ou restante, décision de cumul et échéancier validé.
Il ne fixe pas de politique métier par défaut.

Les tests PostgreSQL vérifient :

- calcul au pourcentage ou en montant fixe, refus d’un dépassement ;
- cumul jamais implicite et calcul explicite sur la base restante ;
- lien entre attribution et réduction contractuelle ;
- copie des réductions antérieures et avenant d’un contrat approuvé ;
- conservation des paiements, contrepassation des affectations et réaffectation ;
- trop-perçu conservé sans remboursement inventé ;
- brouillon restant en brouillon ;
- erreur tardive annulant attribution et opérations financières ensemble.

L’API expose un aperçu sans écriture, avec révision et périmètre vérifiés.
**L’enregistrement financier de la nouvelle attribution n’est pas encore branché
au formulaire : le parcours actuel d’attribution seule reste à remplacer.**
Les contrats comportant des avoirs ou plusieurs versions à traiter demandent
un parcours spécifique et ne sont pas réécrits silencieusement.

## Décisions demandées à l’utilisateur

1. La bourse concerne-t-elle uniquement la scolarité, inscription inchangée,
   ou faut-il choisir les frais éligibles ?
2. En présence d’une réduction antérieure : choix explicite avant cumul,
   cumul autorisé et plafonné, ou cumul interdit ?

Proposition soumise : scolarité uniquement et décision explicite avant tout cumul.
Les instructions AGENTS.md imposent de valider les règles métier indécises avant
leur implémentation définitive. Ces deux décisions sont en attente.

## Périmètre de cette phase

Aucune nouvelle migration SQL, aucun changement financier distant et aucun
nouveau déploiement du portail. Les correctifs et le moteur sont locaux.
L’avenant de Marianne, déjà enregistré et vérifié, n’a pas été modifié.

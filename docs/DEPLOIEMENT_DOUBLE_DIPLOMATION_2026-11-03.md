# Activation Supabase de la double diplomation — 3 novembre 2026

Projet : Espace Etudiant ESCEN, `zmxapemyktxhppdxenzb`, production.
Autorisation : demande utilisateur « fais le » après présentation de l’activation distante.

## Périmètre appliqué et vérifié

Les migrations 082, 083 et 084 ont été appliquées dans une transaction unique,
avec leurs sources inscrites dans `supabase_migrations.schema_migrations`.
La transaction a été vérifiée auparavant dans PGlite, sur le schéma arrêté à 072.

- `202611030082_optional_double_degree` : éligibilité IA-GL et choix annuel facultatif.
- `202611030083_double_degree_fee_schedules` : six tarifs Présentiel pour 2026-2027.
- `202611030084_classic_admission_fee_selection` : exclusion des tarifs de double diplomation dans les quatre recherches de frais d’admission.

| Niveau | Inscription FCFA | Scolarité FCFA |
| --- | ---: | ---: |
| L1 | 50 000 | 850 000 |
| L2 | 50 000 | 975 000 |
| L3 | 50 000 | 1 100 000 |

Les vérifications distantes en lecture confirment les six tarifs, le seul code
éligible `IA-GL`, zéro inscription basculée automatiquement, quatre filtres
dans la fonction d’admission, RLS active et les trois triggers d’audit existants.

Des empreintes de toutes les lignes des tables suivantes ont été comparées
avant et après, dans la transaction ; toute différence aurait annulé celle-ci :
`financial_contracts`, `contract_versions`, `contract_lines`, `contract_discounts`,
`installments`, `payments`, `payment_allocations`, `scholarship_awards`.
Les empreintes sont restées identiques.

## Limites constatées

Avant activation, la dernière migration distante était 072. Les migrations
073 à 081 ne font pas partie de cette activation et restent non appliquées.
Ne pas lancer un `db push` global sans revoir ces reprises et régularisations.

Le contrôle du dossier concerné par la discussion a révélé une scolarité
contractuelle distante de 550 000 FCFA et aucune remise contractuelle.
La scolarité de 975 000 FCFA avec remise de 15 % apparaît dans une migration
locale de régularisation non appliquée ; elle n’est donc pas effective sur ce dossier.
Le contrat approuvé n’a pas été modifié. Sa régularisation demande un avenant
contrôlé ; l’activation du catalogue ne régularise pas les contrats existants.

Aucun push Git ni déploiement de l’application Next.js n’a été effectué.
Le code des écrans est disponible dans les commits locaux de cette intervention.

Les scripts de préparation, simulation et contrôle sont conservés dans
`tmp/double-degree-deployment/`. Aucun fichier de `.tmp/` n’a été modifié.

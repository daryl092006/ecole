# Reprise de la session d’audit ESCEN

Session retrouvée : 01a108cf-6705-75c2-99ee-c99da5695dee.
Historique relu localement et utilisé dans ce dépôt ; aucun nouveau processus Codex n’a été lancé et la conversation courante n’a pas été remplacée.

La session porte sur l’audit du portail https://escendemo.neostart.tech/ le 4 octobre 2026. L’audit distingue observations des écrans et validations d’enregistrement. Il ne valide pas tous les rôles ni les transactions du portail externe.

## Sources conservées

- [Synthèse de l’audit public](reference-escen/SYNTHESE_AUDIT_PUBLIC.md).
- [Audit fonctionnel authentifié](reference-escen/AUDIT-FONCTIONNEL-ESCEN.md).
- [Couverture des écrans et parcours](reference-escen/COUVERTURE-FONCTIONNELLE.md).
- [Statut de notre prototype](FUNCTIONAL_STATUS.md).

Les identifiants de connexion, cookies et secrets ne sont pas importés dans le dépôt. Aucune connexion au portail ni opération distante n’a été effectuée pendant cette reprise.

## Application à notre périmètre

| Observation de l’audit | Décision pour notre prototype | État |
|---|---|---|
| Recherche et filtres étudiants ; options parfois vides | Options issues des dossiers autorisés ; recherche tolérante aux accents, niveau, filière, groupe ; décompte filtré/total | Implémenté |
| Lien « étudiants en retard » mal raccordé au filtre | Bouton qui sélectionne effectivement EN_RETARD et réinitialise les autres filtres | Implémenté |
| Périmètre du statut « Soldé » ambigu | Libellé Scolarité soldée ; frais d’inscription explicitement exclus | Implémenté |
| Échéances doublonnées et allocation incertaine | Conserver le contrat déjà validé ; classer les échéances par date et calculer le montant échu restant à partir des versements cumulés | Implémenté |
| Exports financiers par périmètre | Export CSV des résultats filtrés par niveau, filière et situation ; contrôle de permission dans le service | Implémenté |
| Décomptes et pourcentages sans dénominateur | Décompte filtré/total ; périmètre et formule du recouvrement visibles ; intitulé Dossiers étudiants | Implémenté |
| Note absente affichée comme zéro et résultats publiés trop tôt | Notes nulles avant saisie ; workflow explicite ; notes visibles à l’étudiant après publication | Déjà présent, conservé |
| Anciennes maquettes enseignants/présences déconnectées | État partagé, affectations et présence par groupe ; ne pas importer les listes externes codées en dur | Déjà présent, conservé |
| Compte Informaticien doté de tous les droits | Conserver notre politique de moindre privilège, sans privilège métier pour l’Informaticien | Déjà présent, conservé |
| Relevés, cartes, réinscriptions et abandon | Compléter les workflows, avec historique annuel et autorisations précises | À poursuivre |
| Organisation spécifique des examens et rattrapages | Séparer programmation et publication des notes ; définir les règles institutionnelles avant décision automatique | À poursuivre |
| Bourses, frais d’inscription et révision des contrats | Étendre le modèle financier et les workflows audités | À poursuivre |
| Ciblage et expiration des annonces | Étendre les annonces internes et filtrer par destinataire | À poursuivre |
| Pannes API masquées par des listes vides | Distinguer erreur et absence de données si les services mock deviennent asynchrones ; ne pas reproduire les pannes backend | Exigence pour l’évolution future |
| Candidatures, admission, concours de recrutement, CRM, prospects, newsletter commerciale et portail public | Exclus conformément à AGENTS.md | Hors périmètre |
| API, authentification réelle, classes virtuelles distantes et sauvegardes BDD | Aucun ajout de backend, migration ou persistance | Hors phase actuelle |

## Définition du rapport financier

Le rapport utilise le solde actuel et les paiements actuellement enregistrés. La date choisie classe les échéances comme échues ou futures ; elle ne produit pas un historique des soldes à une ancienne date.

- Sans contrat : montant de scolarité attendu nul.
- Scolarité soldée : contrat existant et montant restant nul.
- En retard : au moins une échéance antérieure à la date choisie reste partiellement impayée.
- À jour : contrat non soldé, sans montant échu impayé.

Aucune règle de blocage d’accès, relance automatique, sanction ou autorisation d’annulation n’a été déduite de ces catégories.

## Contrôles

Les tests des services couvrent les recherches sans accents, les filtres incompatibles, les accès refusés à l’Informaticien, l’allocation cumulative des paiements, les catégories financières et l’échappement CSV. Les exports CSV neutralisent les cellules textuelles susceptibles d’être interprétées comme des formules.

Le lint et le build doivent être exécutés avant livraison. Les observations de l’application externe restent datées du 4 octobre 2026 et ne constituent pas un nouvel audit en temps réel.


Vérification de cette reprise : npm run test et npm run lint passent ; npm run build passe avec ESCEN_BUILD_DIR=.next-verification. Chrome a vérifié la création des données nécessaires, la recherche sans résultat puis sa réinitialisation, l’application du filtre EN_RETARD, les téléchargements CSV et l’absence de débordement horizontal du panneau financier à 390 px. Le build isolé évite les collisions observées sur .next ; Next a ajouté son dossier de types à tsconfig.json.

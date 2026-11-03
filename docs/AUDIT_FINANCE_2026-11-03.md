# Audit des régularisations financières

Contrôle local, sans application distante et sans modification des migrations existantes.

## Constats prouvés

- Les commits annoncés existent. L'arbre était propre au début de l'audit.
- `scripts/audit-finance-regularization.mjs` applique les migrations dans une base PGlite jetable : zéro étudiant, contrat et attribution. Les branches conditionnelles des migrations 078 à 081 ne prouvent donc pas les soldes des étudiants.
- Aucun trigger de `scholarship_awards` ne crée une remise ni ne recalcule un échéancier. Les triggers présents concernent l'audit, l'identifiant stable et l'interdiction de suppression.
- L'API d'attribution ajoute uniquement une attribution. Le recalcul automatique promis par le formulaire n'est pas implémenté dans ce chemin.
- La migration 080 vise une version APPROVED, dont les lignes et échéances sont protégées par `guard_contract_content`.
- La position 1 du contrat de Marianne est une inscription dans 078. La migration 080 la transforme en scolarité et supprime les autres positions ; elle ne reconstruit pas l'échéance d'inscription.
- La migration 080 supprime les allocations de la version et recrée seulement la scolarité, sans filtrage explicite du statut du paiement.
- La migration 081 ajoute des attributions mais ne relie pas directement les remises contractuelles. Les contrats de 078 contiennent déjà des montants nets : appliquer de nouveau les pourcentages risquerait une double remise.

## Corrections à préparer après décision

Préserver les contrats approuvés et leur historique ; utiliser leur mécanisme de versionnement pour toute correction. Reconstituer séparément inscription et scolarité, puis affecter les paiements effectifs sans dépasser les montants nets. Relier les remises à leurs attributions sans déduire deux fois une réduction déjà incluse.

La source des montants bruts et des remises doit être retrouvée avant une correction globale. Les valeurs du journal de conversation ne remplacent pas la preuve de l'état courant des contrats et des paiements.

Toute nouvelle migration sera présentée intégralement avant création, conformément à AGENTS.md. Aucun solde distant n'a été vérifié ou corrigé par cet audit.

## Outillage

Node.js 22 portable téléchargé dans `tmp/finance-audit-runtime/`, sans modification du verrou de dépendances. Node.js 16 embarqué par Adobe ne suffit pas à exécuter les workflows.

Le test PostgreSQL utilisait une fermeture fictive le 3 novembre 2026, en conflit avec l'épreuve utilisant l'horloge réelle. Cette fixture est désormais isolée dans une transaction annulée après les assertions de fermeture.

## Résultats des contrôles

- TypeScript strict sans incrément : succès.
- ESLint global : succès.
- Workflows : succès.
- Base relationnelle : 194 groupes de contrôles PostgreSQL réussis après correction de la fixture.
- Conflits RPC, récupération enseignants, reprise opérationnelle et admissions : succès.
- Les commandes ont été exécutées avec Node portable directement, npm étant absent du PATH.
- Aucun test navigateur réalisé : aucun écran modifié.

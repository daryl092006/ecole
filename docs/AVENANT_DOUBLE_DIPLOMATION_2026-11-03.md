# Avenant de double diplomation

Le dossier étudiant dispose d’une action **Régulariser la double diplomation**,
dans **Frais et versements**, lorsque le contrat et l’inscription sont éligibles.
La remise est saisie explicitement : aucune remise de 15 % n’est généralisée.

Le formulaire `ReviewedForm` présente l’étudiant, le changement de parcours,
les anciens et nouveaux montants, la remise individuelle, la date d’échéance
et le motif avant la confirmation finale.

L’API exige un compte authentifié, l’accès au dossier pour l’année sélectionnée,
les droits financiers et de gestion du parcours, ainsi qu’une attribution globale.
La version attendue et la révision du portail protègent des confirmations répétées.

La transaction utilise la RPC existante `escen_backend_transaction` :

- création d’une nouvelle version liée par `supersedes_id` ;
- conservation de l’ancienne version et de ses lignes ;
- enregistrement de la remise individuelle dans le nouveau contrat ;
- nouvel échéancier à la date explicitement saisie ;
- approbation par le compte connecté et inscription en double diplomation ;
- affectation des paiements effectifs existants sans créer de paiement ou de reçu.

Le parcours est limité aux contrats simples comportant une inscription et une
scolarité, sans remise antérieure, avoir, remboursement, affectation active ou
autre brouillon. Ces situations demandent un traitement distinct ; elles ne sont
pas écrasées. Les lots sont bornés à 100 modifications.

## Cas discuté et vérification

La lecture distante du dossier `018-ESC-2025` pour 2026-2027 confirme :
contrat initial approuvé à 600 000 FCFA au total, deux versements effectifs de
50 000 et 828 750 FCFA, aucune affectation et aucune remise.

Avec un tarif de scolarité de 975 000 FCFA et la remise validée de 15 % :
remise de 146 250 FCFA, scolarité nette de 828 750 FCFA et total de 878 750 FCFA,
inscription comprise. Les paiements existants couvrent ce total.

Les tests locaux vérifient la conservation des paiements et de l’ancien contrat,
la nouvelle version approuvée, les allocations, le refus d’un tarif étranger,
la concurrence et l’annulation atomique d’une erreur tardive.

Cette intervention ne modifie pas encore le contrat distant. La confirmation
doit être réalisée dans le formulaire par un compte autorisé. L’hébergement
de l’application Next.js doit également être identifié pour publier l’écran.
Aucune migration SQL supplémentaire n’est nécessaire.

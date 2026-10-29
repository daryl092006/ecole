# Reprise du tableau financier 2026–2027

## Constat vérifié en lecture seule

La base est à la révision 72. La formation L1 existe sous le code `IA-GL`,
et non `IAGL`. Le tableau utilise `IA`. Le rapprochement distingue aussi
`MPN` en licence de `MP-TD` en master. Aucune formation ne manque dans
le rapprochement actuel.

Le tableau contient 102 lignes, dont 73 avec des sommes encaissées,
pour un total brut de 8 796 450 FCFA. Ce total n'est pas un encaissement
validé : les doublons potentiels doivent être contrôlés. L'ancien script
écartait automatiquement une ligne ATIKLEME ; le rapport la conserve.
52 lignes n'ont pas de rapprochement unique par matricule ou nom complet.
Cela ne signifie pas qu'il faut créer 52 étudiants : les différences
d'orthographe et les noms incomplets doivent être vérifiés.

## Préparation sans écriture distante

`scripts/review-spreadsheet-finances.mjs source.tsv rapport.json` lit le
tableau et le snapshot Supabase. Il n'appelle aucune RPC d'écriture.
Le fichier de sortie doit être nouveau pour ne pas écraser une revue.
Les rapports nominatifs restent locaux et ne doivent pas être commités.

Le rapport contient les identités candidates, les montants du contrat,
la modalité, les échéances mensuelles, les montants déjà payés et les
paiements existants à rapprocher, même si le contrat est déjà approuvé.
Les montants invalides sont signalés, jamais transformés silencieusement
en zéro. Les lignes supposées en double ne sont pas supprimées.

Les dates exactes, moyens et références des anciens versements ne figurent
pas dans le tableau : ils restent vides. Le mois d'encaissement est conservé.
La préparation ne fixe pas arbitrairement le 15 du mois ou un paiement en
espèces. Une règle de reprise ou les justificatifs restent nécessaires avant
l'import. L'ancien script externe n'a pas été relancé ni modifié : ses dates
fixes, matricules calculés localement et lots partiels doivent être remplacés
avant toute utilisation.

## Correction dans le portail

Depuis le dossier étudiant, ouvrir « Frais et versements », puis
« Enregistrer un paiement ». Le bouton « Corriger le nom, le prénom ou les
coordonnées » ouvre l'éditeur existant, selon la permission `student.update`.
La correction affiche les valeurs avant/après et demande confirmation.
Le paiement saisi reste en mémoire ; les données et la révision sont relues
après la correction. Les modifications financières restent à confirmer
séparément. Le matricule et l'historique ne sont pas modifiés par cet éditeur.

## Vérifications

- Tests unitaires du rapprochement : `node --test scripts/review-spreadsheet-finances.test.mjs`.
- Parcours paiement/correction sur mobile et ordinateur :
  `npx playwright test --config tests/ui/payment-identity-correction.config.ts`.
- TypeScript, ESLint et suite métier/PGlite habituelle.

Aucune migration, aucun nouveau paiement et aucun changement d'identité
n'ont été appliqués à la base distante pendant cette intervention.

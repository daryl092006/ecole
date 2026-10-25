# Validation de l’application ESCEN — 25 octobre 2026

## Résultat vérifié

| Contrôle | Résultat final |
| --- | --- |
| `npx tsc --noEmit --incremental false` | 0 erreur |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npm test` | Workflows réussis, 185 groupes PostgreSQL réussis et 10 contrôles de régularisation enseignants réussis |
| Compilation de production | Réussie, y compris après correction des redirections |
| Campagne fonctionnelle, 42 fichiers | 333 cas réussis après corrections et reprises ; 6 cas du site public séparé non exécutés |
| Contrôles responsives supplémentaires | 17 tests réussis, largeurs 360/390/768/769/1024/1440 px |
| Recette finale en production locale | 10 tests réussis : 4 nouvelles entrées directes avec filtres, 3 contrôles existants des parcours et 3 revues globales |
| Pages, sous-onglets et fenêtres en production | 56 routes/contextes à 390 et 1440 px ; 163 états mobile et 164 états ordinateur, sans échec lors du passage final ; entrée et page introuvable également vérifiées |

Les quatre nouvelles régressions d’entrée directe s’ajoutent aux 333 cas fonctionnels de la campagne initiale. Les trois autres contrôles de parcours de la recette de production sont également présents dans cette campagne : ces chiffres ne doivent pas être additionnés comme s’ils étaient tous distincts.

## Échecs trouvés et corrections

### Accès direct aux anciennes adresses

La recette sur le build de production a trouvé des entrées directes bloquées sur `/academique/evaluations` et `/academique/rattrapages`, alors que les tests de navigation depuis une page déjà chargée passaient. Les redirections présentes dans les pages ne suffisaient pas dans le cas observé.

Ajout de redirections HTTP dans `next.config.ts`, avant le rendu du portail. Contrôle direct du résultat : HTTP 307 vers `/academique/examens`, session correcte et conservation des filtres, y compris les paramètres répétés. Quatre tests supplémentaires vérifient une première navigation depuis un contexte neuf à 390/1440 px. Le build a été refait puis la recette complète de production a réussi.

### Fiabilité de la recette

- Suivi des mails : un sélecteur global `role=alert` attrapait aussi l’annonceur de navigation de Next.js. La vérification cible maintenant l’alerte située dans le contenu principal, avec le même message attendu et le même contrôle de reprise.
- Planning : les données de test fixaient une épreuve au 20 octobre 2026 et supposaient qu’elle était encore future. Le 25 octobre, les contrôles réels refusaient correctement son déplacement. L’horloge des tests API est désormais fixée au 19 octobre ; les refus d’ouverture, copies, notes et conflits restent testés sans assouplissement métier.
- Dossier étudiant : les anciens scénarios n’alimentaient plus le contexte annuel ni la lecture du dossier canonique ; ils basculaient vers les archives et ne trouvaient plus les commandes attendues. Ils utilisent maintenant la fixture annuelle de revue, en conservant les assertions sur confirmation, appel unique, absence d’encaissement sans inscription, approbation du contrat et changement de groupe.
- Deux variables inutilisées supprimées dans le répartiteur et le script de vérification annuelle : aucun changement de règle métier.

La première campagne s’est arrêtée après 12 échecs, avec 272 réussites et 55 cas non lancés. Les cas corrigés ont été rejoués, puis les 55 cas restants ont été exécutés. Leur résultat est 49 réussites et les six exclusions explicites ci-dessous. Le bilan consolidé comporte donc zéro échec résiduel parmi les cas exécutés ; le premier échec n’est pas masqué par un simple relancement automatique.

## Six cas non exécutés

Ils nécessitent `ESCEN_TEST_WEBSITE_URL` et une copie démarrée du site public séparé. Aucun service correspondant n’était disponible sur `localhost:3200` :

- Catalogue et téléchargement public des brochures à 390/1440 px : 2 cas.
- Ancienne page publique des pièces : 1 cas.
- Niveaux publics, erreur et reprise à 390/1440 px : 2 cas.
- Niveaux publics réels de l’année active : 1 cas.

Les tests d’administration des brochures, demandes et pièces dans le portail ont bien été exécutés. Aucun des six cas publics n’est compté comme réussi.

## Commandes et artefacts

```powershell
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
npm.cmd test
npx.cmd playwright test --config tests/ui/application-validation.config.ts
npx.cmd playwright test --config tests/ui/reference-presentation.config.ts --grep-invert 'domaines restent ouverts'
$env:ESCEN_BUILD_DIR = 'tmp/next-application-validation'
$env:ESCEN_RESPONSIVE_AUDIT = '1'
npm.cmd run build
npx.cmd playwright test --config tests/ui/application-pages.config.ts
```

Le build final de cette session se trouve dans `tmp/next-final-validation-fixed-2026-10-25`. La recette finale a utilisé le port 3121, sélectionné par `ESCEN_VALIDATION_PORT`.

- Résultat fonctionnel consolidé : `test-results/application-validation/consolidated.json` ; les rapports initiaux et de reprise sont conservés séparément.
- Captures et inventaires de pages : `tmp/screenshots/page-by-page-review/390/review.json` et `1440/review.json`.
- Captures responsives : `tmp/screenshots/visual-refresh/`.
- Sous Windows, les deux serveurs de production de recette sont restés bloqués pendant leur fermeture. Leurs processus ont été identifiés par PID, parent et commande, puis seuls ces serveurs ont été arrêtés. La campagne finale a ensuite terminé avec le code 0 et `10 passed`.

La validation est locale : pas de push, de déploiement, de migration distante ni d’envoi de mail réel. Les changements préexistants du tableau de bord et des styles sont préservés.

## Ce que les tests ne déclarent pas terminé

Cette recette valide les comportements présents et les cas exécutés. Elle ne livre pas le provisionnement des nouveaux comptes, l’admission atomique, les modèles officiels manquants, les règles de jury non approuvées ni les autres écarts recensés dans `docs/COMPARAISON_GLOBALE_REFERENCE_2026-10-25.md`.

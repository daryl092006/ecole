# Dossiers du personnel et des enseignants — recette locale du 23 octobre 2026

## Réalisé

- Créations distinctes du personnel administratif et des enseignants, avec filtre de profil et recherche par fonction.
- Fonction obligatoire pour le personnel administratif ; matricule facultatif pour les enseignants. Une référence interne unique satisfait la contrainte SQL existante sans être affichée dans les annuaires et les projections pédagogiques.
- Fonction, type de contrat et date de prise de fonction enregistrés dans `staff_contracts` par la transaction existante. Le remplacement d’une fonction conserve la ligne précédente dans l’historique.
- Confirmation avec récapitulatif, date de prise de fonction et conséquences ; actualisation du portail après enregistrement.
- Correction de la perte du motif d’audit lors d’une modification conservant la référence interne.
- Refus d’un effacement de fonction existante qui aurait précédemment annoncé un succès sans enregistrer ce changement.
- Profil enseignant correctement identifié pour le RAF, même sans permission académique, et conservé lorsqu’un enseignant est inactif. Seuls les dossiers autorisés sont exposés.

## Vérifications

- `npx tsc --noEmit --incremental false` : aucune erreur.
- `npm run lint` : aucune erreur ; deux avertissements préexistants dans `scripts/verify-academic-years.mjs` et `src/components/layout/PortalScreen.tsx`.
- `npm test` : workflows validés et 185 groupes de contrôles PostgreSQL/PGlite réussis. Les contrôles ajoutés vérifient la persistance des fonctions, la stabilité de la référence, le motif d’audit, l’historique et l’absence de mutation sur refus.
- `npx playwright test --config tests/ui/personnel.config.ts` : 28 scénarios réussis ; deux nouveaux scénarios ont nécessité la correction d’un sélecteur de test. Leur relance avec `--last-failed` réussit : les 30 scénarios ciblés sont validés. Parcours personnel à 390 et 1440 px, affectations également à 360 px.
- Les tests API exécutent les véritables routes avec transport simulé ; les tests PGlite vérifient les transactions et l’audit en base locale. Les tests navigateur utilisent des données de test et ne constituent pas une recette Supabase distante.
- Captures locales dans `tmp/screenshots/personnel-review/`. Le lancement de Chrome nécessite une exécution hors bac à sable sur cette machine.

## Périmètre restant

Cette sous-étape est validée localement. La création d’un dossier ne provisionne pas de compte de connexion et ne crée pas d’affectation pédagogique. Une clôture de fonction sans remplacement n’est pas proposée par ce formulaire.

Aucune migration ajoutée ou modifiée, aucune migration distante appliquée, aucun push. Les modifications préexistantes hors personnel restent à part.

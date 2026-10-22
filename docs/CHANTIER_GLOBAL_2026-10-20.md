# Chantier global ESCEN

Ce suivi distingue les constats vérifiés dans le code des fonctionnalités encore
à examiner. Une compilation réussie ne prouve pas qu'un parcours métier est complet.

## Priorité immédiate : fiabilité des synthèses transversales

- Dossier étudiant (`StudentRecordPanel.tsx`) : une moyenne de toutes les notes,
  sans règle de pondération approuvée, avait été ajoutée dans la synthèse.
  Correction réalisée : conserver les comptes de notes et de résultats à traiter,
  retirer cette moyenne globale.
- Enseignants (`TeachersWorkspace.tsx`) : les candidats sans note étaient tous
  appelés « copies à corriger ». Correction réalisée : distinguer la dernière
  tentative en ligne remise/expirée des autres résultats à renseigner ; employer
  le contrôle commun de complétude, y compris pour NON_TRAITE avec zéro stocké.
- Séances : un remplacement était compté pour les deux enseignants et les séances
  annulées entraient dans le compteur. Correction réalisée : enseignant effectif
  et exclusion des annulations, conformément au service de planning existant.

## Décision métier à confirmer

`evaluationGradePolicy.ts` et ses tests convertissent NON_TRAITE/null en zéro
provisoire. Le SQL accepte NON_TRAITE/null et NON_TRAITE/0 et bloque leur soumission.
Le choix entre une note vide et un zéro provisoire a été soumis à l'utilisateur.
Ne pas changer silencieusement cette convention dans une seule vue.

## Prochaines investigations, dans l'ordre

1. Évaluation → sujet → diffusion → tentative → correction → publication → réclamation.
   Le choix d'une évaluation dans SubjectStudio est un état local ; vérifier sa
   persistance réelle et les droits avant de considérer le rattachement comme acquis.
   La recherche dans les composants retrouve la consultation des diffusions, mais
   pas encore un parcours complet de programmation depuis les écrans montés.
2. Dossier étudiant → inscription annuelle → affectations datées → présences.
   Vérifier les périodes d'appartenance au groupe et le changement d'année dans
   chaque écran, ainsi que les liens qui doivent préserver l'étudiant sélectionné.
3. Contrat → échéancier → encaissement → affectation → remboursement → reçu.
   Comparer les montants et droits dans le dossier, les rapports et les actions.
4. Personnel → affectation → planning → charge de correction.
   Faire porter les liens sur le contexte sélectionné, pas seulement sur une page.
5. Interface : revoir chaque parcours sur mobile et ordinateur, y compris les
   erreurs, états vides, formulaires longs et changements de rôle/année.
6. Inventaire des fonctions consultatives et opérations encore absentes : documents,
   support, achats, annonces, admission et accès Auth. Ne pas les annoncer terminées.

## Étape 2 : Harmonisation des chargements et des reprises sur erreur

- Création du composant commun `src/components/ui/ErrorState.tsx` avec titre, message d'erreur clair,
  icône sémantique et bouton « Réessayer » sécurisé.
- Généralisation des variantes de `LoadingState` (`table`, `cards`, `compact`) sur l'ensemble
  des modules métier : présences, planning, sujets d'examen, enseignants, dossiers personnel,
  journal d'audit, suivi des mails, archives historiques, admissions web, actualités, brochures,
  réinscriptions, opérations de scolarité, référentiel académique et préparation annuelle.
- Prise en compte du mobile (390px) et des animations réduites (`prefers-reduced-motion`).
- Contrôles automatisés dans `tests/ui/loading-feedback.spec.ts` validés à 390px et 1440px
  (8/8 tests Playwright réussis).


Une étape cohérente par commit local, aucun push. Préserver les travaux préexistants.
Vérifier TypeScript, ESLint, les tests navigateur pertinents et les tests métier/SQL
selon la portée. Toute migration et suppression reste soumise aux points d'arrêt
d'AGENTS.md. Aucune règle de jury, compensation ou passage de niveau inventée.

## Contrainte locale constatée

Contrôles de la première correction : TypeScript sans erreur ; ESLint sans erreur
(six avertissements préexistants) ; `npm test` réussi, dont 181 groupes PostgreSQL.
Un test navigateur de régression a été ajouté dans `teacher-management.spec.ts`
pour les copies remises, la dernière tentative, le vrai zéro et les remplacements.
Les 15 tests navigateur des parcours étudiants et enseignants passent avec
`tests/ui/interconnection-summary.config.ts`, y compris ce nouveau contrôle.

Le disque C: ne disposait plus que d'environ 14 à 17 Mo. Après accord utilisateur,
seul le cache des tests précédents (`tmp/next-visual-refresh/cache`,
100 207 602 octets) a été supprimé. Les tests suivants désactivent le cache webpack.

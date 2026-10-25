# Mise en place des examens — 25 octobre 2026

La demande porte sur le fonctionnement de préparation des examens observé sur le site de référence, au-delà de la présentation graphique.

## Changements locaux

- La création propose d’abord le groupe puis ses enseignements. La nature initiale suit l’onglet : EXAMEN pour la session normale, RATTRAPAGE pour le rattrapage, DEVOIR pour le contrôle continu.
- La création passe par ReviewedForm : récapitulatif du groupe, de la matière, de la nature et du nombre de candidats avant écriture. L’API transactionnelle existante conserve l’enregistrement atomique évaluation/candidats.
- Après création, ouverture du détail de préparation de l’épreuve. L’utilisateur n’est plus envoyé directement dans la saisie des notes.
- Le détail distingue groupe/candidats, sujet/barème, séance et conditions d’accès en ligne. Il expose les actions existantes de composition, programmation, copies et gestion des notes.
- « Planifier la date et la salle » ouvre le planning avec l’affectation préselectionnée et le mode papier ; le groupe, la matière et l’enseignant sont repris. Le mode reste modifiable. Un lien permet de revenir à l’épreuve.
- En l’absence de séance pour la diffusion, un lien ouvre sa création en mode en ligne pour l’affectation de l’épreuve. Les séances annulées ou archivées sont exclues du choix de diffusion.
- « Modifier le sujet » charge le sujet existant avec ses questions et son corrigé, au lieu de créer un sujet vide. Après sauvegarde, l’URL suit la nouvelle version pour permettre le rechargement.
- Les évaluations retirées et les autres rattrapages sont exclus du sélecteur d’évaluation d’origine côté interface.

## Validation

- TypeScript sans erreur et ESLint sans erreur ; deux avertissements préexistants.
- Huit tests examens réussis : confirmation et absence d’appel avant confirmation, inscrits/réinscrits, échec sans perte de saisie, droits de consultation, catégories, préparation à 390/1440 px, planning préselectionné et retour, conservation du sujet après sauvegarde/rechargement.
- Quatre tests supplémentaires réussis pour affectation/création puis création, modification, déplacement, remplacement et annulation des séances à 360/390/1440 px.
- Quatre tests de déplacement d’une épreuve liée réussis, dont le refus lorsque l’ouverture intervient pendant la confirmation. Leurs fixtures étaient datées d’octobre 2026 : une horloge de test fixe désormais le scénario avant ouverture, sans assouplir la règle réelle.
- Captures relues : `tmp/screenshots/exam-setup-390.png` et `tmp/screenshots/exam-setup-1440.png`.

Commandes de recette ciblée :

```sh
npx playwright test --config tests/ui/exam-setup.config.ts evaluation-candidates.spec.ts exams-workspace.spec.ts exam-setup.spec.ts
npx playwright test --config tests/ui/exam-setup.config.ts schedule-management.spec.ts --grep "Programmer un cours|Séance : créer|Épreuve liée"
```

## Limites

Les écrans réutilisent les API persistantes existantes ; aucune migration ou donnée distante n’est modifiée. La programmation de séance et la diffusion restent des confirmations distinctes. Cette étape n’ajoute pas la date limite de correction ni la publication séparée du calendrier présentes sur la référence. Elle ne définit aucune règle de compensation, de jury ou de passage de niveau et ne prétend pas clore ces chantiers.

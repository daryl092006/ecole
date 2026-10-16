# Filières et niveaux pendant la préparation annuelle

Dans « Préparer l’année → Formations proposées », le formulaire permet de choisir une filière existante ou de la créer sur place. « Définir ses niveaux ici » permet de compléter les niveaux d’une filière existante. Un niveau manquant peut être créé depuis ce même parcours.

Chaque création exige une vérification et une confirmation. Après l’enregistrement, les références sont relues avant le retour au formulaire annuel. Celui-ci conserve l’année et les valeurs déjà saisies. Les nouveaux niveaux ne sont proposés pour l’année qu’après leur sélection et une nouvelle confirmation. Les niveaux déjà liés à une filière sont conservés.

Les filières restent des références communes aux années. Leur création ne crée ni inscription étudiante ni tarif. La préparation annuelle décide des niveaux et des modes de formation proposés pour l’année choisie. Le programme détaillé des matières reste dans la gestion pédagogique.

Vérification avec des API isolées, sur mobile et ordinateur :

```powershell
$env:ESCEN_UI_DEV='1'
npm.cmd run test:ui -- tests/ui/annual-setup-inline.spec.ts tests/ui/annual-offerings.spec.ts tests/ui/process-clarity.spec.ts tests/ui/program-levels.spec.ts
```

Le test `annual-setup-inline.spec.ts` couvre la création d’un niveau et d’une filière sans changement de page, l’ajout de niveaux à une filière existante, l’annulation sans écriture, la conservation du formulaire, la confirmation des écritures et la reprise après une erreur de relecture.

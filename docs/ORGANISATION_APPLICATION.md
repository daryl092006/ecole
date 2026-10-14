# Organisation de l’application

La demande de refonte concerne tous les domaines : étudiants, personnel, finance,
pédagogie, communication, achats et logistique, administration et espace personnel.
La réorganisation pédagogique ne constitue pas à elle seule une refonte complète.

## Parcours communs

- Le menu latéral regroupe les sous-rubriques sous chaque module avec une flèche
  pour déplier ou replier. Le module courant est ouvert automatiquement. Aucune
  barre de sous-navigation n’est affichée au-dessus du contenu, ni signe plus ou moins.
  Sur mobile, le menu se ferme après le choix d’une page.
- L’accueil affiche tous les modules accessibles au rôle actif, à partir du même
  catalogue de navigation que le menu. Il ne propose plus seulement quatre domaines.
- Les entrées Pédagogie, Communication, Achats et Logistique et Administration
  ouvrent une page de choix des rubriques, sans redirection automatique vers la première.
  Étudiants et Personnel ouvrent leurs dossiers ; Finance conserve sa situation financière.
- Les formulaires utilisant le composant partagé ActionPanel s’ouvrent en page centrale
  avec titre et retour à la liste. Les sous-formulaires imbriqués restent dans cette page.
  Cela couvre notamment finance, parcours étudiants, enseignants, achats, inventaire
  et support, en complément des dossiers et référentiels déjà convertis.
- Les annonces sont consultées dans une liste ; créer ou retirer une annonce ouvre
  une page de travail distincte.
- Les messages FormFeedback restent visibles dans la page de travail active :
  une erreur ne doit pas rester derrière le formulaire dans une liste masquée.
- Les raccourcis vers le référentiel et le contrôle de reprise sont affichés seulement
  si la destination est autorisée au rôle actif.

## État fonctionnel

Cette modification harmonise les parcours existants. Elle ne crée pas de nouvelle
API métier et ne remplace pas les opérations bloquées de l’ancien prototype par
une fausse sauvegarde en mémoire. Les dossiers étudiants, personnel, comptes,
référentiels et sujets utilisent leurs services persistants existants.

Restent à réaliser : la reprise et les mutations serveur des autres domaines,
notamment contrats et opérations financières, annonces, tickets, achats, planning,
présences et workflows académiques. Les historiques consultables ne sont pas
convertis automatiquement en opérations modifiables. Les règles institutionnelles,
les parents manquants et les attributions de droits ne sont pas inventés.

## Vérification

`npm run lint`, `npm run build`, `npm run test` et les tests Playwright
`global-organisation.spec.ts`, `crud.spec.ts`, `persistent-data.spec.ts`,
`pedagogy.spec.ts` vérifient les parcours centraux, la navigation par domaine,
les erreurs visibles, la persistance et les régressions à 390 et 1440 pixels.

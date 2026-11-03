# Publication du portail — 3 novembre 2026

Adresse : https://portail.escen.university

La demande utilisateur de publication a été confirmée et le domaine fourni.
Le compte Vercel connecté donne accès au projet existant `ecole`, sous
`denis-gangnitos-projects`, identifié par `prj_k0JnJTNXVrSNIMaK4MOt7cu0xRAR`.
Le domaine était déjà rattaché à ce projet ; aucun DNS n’a été modifié.

## Version publiée

- Source : archive Git du commit `ea4a44b2c810ce92222f9e6f24d93a55d241c7fe`.
- Déploiement : `dpl_4pxGLiv5jENE9JDWjYBAjr9V3ndg`.
- URL technique : https://ecole-es7g78rtr-denis-gangnitos-projects.vercel.app
- Version précédente : `dpl_HfGTEUTaU29gCygoktWHasTMVu1k`.
- URL technique précédente : https://ecole-iaotgsc7c-denis-gangnitos-projects.vercel.app

Le déploiement a été construit avec la configuration de production existante,
sans promotion automatique (`--prod --skip-domain`). La construction Next.js,
les contrôles TypeScript et ESLint ont réussi. Le domaine a ensuite été basculé
par `vercel promote` après confirmation de l’état Ready.

Les protections Vercel de l’adresse technique ont été conservées. Les premières
requêtes sur celle-ci recevaient une redirection Vercel ; elles ne constituent
pas une validation applicative. Les contrôles applicatifs ont été réalisés sur
le domaine public après promotion.

## Contrôles après publication

Vérifiés le 3 novembre 2026 à 23:14 UTC :

- `/connexion` : HTTP 200 et titre « Connexion | ESCEN ».
- `/api/finance/fees-and-scholarships` sans session : HTTP 401.
- `/api/students/018-ESC-2025/operations` sans session : HTTP 401.
- Les fichiers JavaScript servis au dossier étudiant contiennent l’action `amend_contract`.
- Deux tests Playwright sur le domaine public passent à 390 et 1440 px : saisie
  de 15 %, récapitulatif de 828 750 FCFA de scolarité nette et 878 750 FCFA au
  total, puis confirmation unique.

Les tests navigateur interceptent les API avec des données simulées : aucune
mutation financière distante n’a été réalisée pour ces contrôles. Les scripts
et résultats de publication sont dans `tmp/portal-production-release/`.

## État métier restant

Le catalogue Supabase de double diplomation est déjà activé par 082 à 084.
L’interface et l’API de l’avenant sont maintenant publiées. Le contrat existant
de Marianne n’a pas encore été régularisé : un compte autorisé doit confirmer
le formulaire dans **Frais et versements → Régulariser la double diplomation**.

Les migrations 073 à 081 restent non appliquées. Aucun push Git n’a été effectué,
aucune variable de production n’a été remplacée et aucun fichier `.env.local`
n’a été transmis dans l’archive source.

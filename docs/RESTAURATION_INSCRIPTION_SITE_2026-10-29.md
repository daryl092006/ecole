# Inscription sur le site ESCEN — 29 octobre 2026

Demande : reprendre la présentation du formulaire public `https://escen.university/inscription`. Le candidat reste sur le site ; les données sont enregistrées par les API du portail.

## Réalisation

- Page locale `/inscription` sans redirection vers `/candidature` ; présentation reconstituée à partir du rendu public : panneau illustré, progression et quatre étapes (identité, diplôme, documents, tuteurs).
- Styles de présentation et liste des nationalités récupérés dans les ressources publiques ESCEN. Le formulaire Vue est maintenu dans `app/components/registration/` du dépôt du site.
- Téléphones avec indicatifs internationaux, nationalité recherchable, distinction BAC / autres diplômes, campagne scolaire explicite, catalogue et pièces issus des API existantes.
- Enregistrement de l’identité avant passage à l’étape suivante, puis diplôme, formation/pièces et finalisation avec tuteurs et consentement. Les fichiers sont facultatifs pour envoyer la candidature. Confirmation avec référence, sans création directe d’étudiant ni admission automatique.
- La page de préparation des pièces reste consultable sur le site.
- L’adaptateur du portail conserve désormais le formulaire restauré lorsqu’il existe ; une redirection vers le portail exige un choix explicite.
- En développement Nuxt, `/api/website` est relayé vers le portail local sur `127.0.0.1:3000`. Le navigateur utilise une URL de même origine. La version publiée conserve l’API configurée du portail en ligne.
- Les contrôles du portail excluent le dépôt Nuxt indépendant `escen-website`, qui dispose de ses propres vérifications.

## Vérifications

- Deux parcours Playwright complets, à 1440 et 390 px : maintien sur `/inscription`, absence de débordement, quatre appels simulés, formats identité/diplôme compatibles avec les schémas serveur, candidature sans pièce, référence finale et nettoyage du jeton après succès.
- Aucune écriture réelle ni aucun mail envoyé par ces tests.
- Lecture réelle, sans mutation : configuration et niveaux via le relais local répondent HTTP 200 ; campagne 2026-2027.
- TypeScript sans émission et lint des fichiers modifiés dans le portail et dans le site.
- Tests de préparation de publication du site et suite métier/base locale du portail.

## Utilisation locale

- Site : `http://localhost:3200/inscription`.
- API : serveur du portail sur `127.0.0.1:3000`, avec `ESCEN_WEBSITE_URL=http://localhost:3200` et un `ESCEN_BUILD_DIR` local isolé.
- Les API utilisent le projet Supabase configuré dans le portail : un envoi manuel hors tests constitue une véritable candidature.
- Aucun push Git, déploiement du site ni modification de la base distante dans cette intervention. La remise en ligne du site reste une étape séparée.

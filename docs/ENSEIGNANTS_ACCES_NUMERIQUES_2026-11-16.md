# Accès numériques des enseignants

Règle validée le 16 novembre 2026 : l’e-mail personnel est obligatoire lors de la création d’un enseignant, depuis le personnel ou depuis les profils enseignants. L’adresse institutionnelle ESCEN ne remplace pas cet e-mail personnel.

## Comportement

- La création conserve dans une transaction le dossier, le profil et sa demande d’accès. Les profils historiques ne sont pas modifiés rétroactivement.
- La liste des comptes existants est conservée dans `src/data/protectedTeacherAccounts.json`. Elle reprend la liste utilisateur et les enseignants déjà recensés dans l’import du 4 novembre. Les noms sont comparés sans titre, accents ni ordre des mots ; aucun rapprochement partiel par prénom n’est utilisé.
- Les noms ATA Bruce et AMANA complètent les entrées sans nom de l’import. Les deux adresses `a.enoc.coach@escen.university` et `a.enoc.coah@escen.university` sont réservées : le compte réellement trouvé est utilisé, sans recréer l’autre orthographe. Si les deux existent, le rapprochement est refusé pour examen.
- Un compte Microsoft protégé introuvable provoque une activation incomplète : il n’est jamais recréé. Aucun compte Microsoft existant n’est supprimé, recréé, réactivé ou réinitialisé.
- Pour une nouvelle identité, l’adresse suit la convention enseignante `.coach@escen.university`. Une collision réserve un suffixe distinct ; une adresse occupée n’est pas réattribuée sur la seule ressemblance d’un nom.
- Le nouveau compte reçoit une licence faculté. Le SKU facultatif `AZURE_TEACHER_SKU_ID` doit désigner une licence FACULTY ; sinon une licence `STANDARDWOFFPACK_FACULTY` disponible est recherchée. Aucune licence étudiante n’est utilisée.
- Le compte portail est associé à la personne et au rôle ENS. Un compte déjà associé à une autre personne bloque le traitement. Les autres rôles d’un compte existant sont conservés.
- Un seul message est envoyé à l’e-mail personnel : adresse Microsoft 365, mot de passe temporaire uniquement pour un compte Microsoft nouvellement créé, et lien personnel de choix du mot de passe du portail. Un compte Microsoft existant conserve son mot de passe habituel. Aucun mot de passe n’est renvoyé au navigateur ni écrit dans la table de suivi ou les audits.
- L’identité Microsoft est conservée dans les métadonnées serveur du compte Auth. Les réunions et enregistrements Teams utilisent cette identité, le compte institutionnel lié ou la liste protégée, jamais l’adresse personnelle de contact.

Les requêtes de création et d’attribution Microsoft suivent les opérations documentées par Microsoft : [création d’un utilisateur](https://learn.microsoft.com/en-us/graph/api/user-post-users?view=graph-rest-1.0). Les écritures externes ne sont pas automatiquement répétées après une réponse réseau incertaine.

## Traitement des échecs

Le profil reste visible si le fournisseur Microsoft, la licence, Auth, une modification concurrente ou l’envoi du message empêche la fin de l’activation. La réponse de création et le message à l’écran distinguent les accès envoyés d’une activation incomplète ou d’un envoi non confirmé.

La table `escen.teacher_digital_access` conserve les identifiants et un code d’erreur, avec RLS et audit. Elle est exclue du snapshot général. Après un échec ou un résultat incertain, le support doit examiner ce suivi et les comptes déjà créés : ne pas recréer le professeur ni répéter aveuglément la demande. Un mot de passe Microsoft temporaire perdu après un échec d’envoi nécessite une intervention administrateur ; il n’est pas stocké pour réexpédition.

## Installation et validation

La migration nouvelle est `202611160110_teacher_digital_access.sql`. Les anciennes migrations restent inchangées. Elle est appliquée uniquement dans PGlite pour ce chantier ; sa mise en production reste une étape distincte, à autoriser avant le déploiement du code qui l’utilise.

Les secrets Azure et les paramètres d’envoi sont documentés dans `.env.example`. Ils doivent être configurés côté serveur. Les essais automatiques utilisent des transports simulés : ils ne créent ni compte Microsoft réel ni message réel.

Contrôles : TypeScript sans incrémental, ESLint, `npm test`, et `tests/ui/teacher-digital-access.config.ts` (formulaires sur mobile et ordinateur, permissions, réutilisation des comptes protégés, licence refusée, conflit d’identité, envoi incertain et identité Teams).

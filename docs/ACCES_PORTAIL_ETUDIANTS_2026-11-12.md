# Accès au portail étudiant — 12 novembre 2026

L’utilisateur a demandé le mot de passe initial `password` pour tous les accès au portail étudiant, puis signalé le refus de connexion de `g.evynel.etudiant@escen.university`. Les mots de passe Microsoft 365 sont distincts et n’ont pas été modifiés.

## Opérations vérifiées

- Lecture initiale : 184 étudiants non archivés, 156 comptes portail actifs et liés à Auth, 28 étudiants sans compte portail ni utilisateur Auth correspondant.
- Réinitialisation administrative autorisée des 156 comptes existants, avec conservation des métadonnées et `app_metadata.must_change_password=true`. L’un des comptes possède également le rôle Enseignant ; ses rôles ont été conservés.
- Contrôle SQL indépendant juste après réinitialisation : 156 mots de passe conformes et 156 changements obligatoires.
- Création des 28 utilisateurs Auth manquants, avec email institutionnel confirmé et changement obligatoire. Création des comptes applicatifs et des rôles STUD dans un unique lot transactionnel de 56 écritures par `escen_backend_transaction`, après contrôle de révision.
- Acteur administratif habilité vérifié : `43ce07c4-bb38-5c56-85e6-70e2ffa5b909`. Le motif d’audit précise l’intervention déléguée demandée par l’utilisateur ; aucune session administrative n’a été simulée.
- Vérification des 28 sessions applicatives : compte attendu et rôle STUD présents.
- Connexion réelle d’Evynel avec le mot de passe initial : Auth accepté, `/api/session` HTTP 200 avec `mustChangePassword=true`, `/api/campus` HTTP 403 avant changement.
- Contrôle ultérieur : 184 comptes liés ; 172 conservent le mot de passe initial et le marqueur obligatoire. Les comptes ayant déjà personnalisé leur accès n’ont pas été réinitialisés à nouveau.

Les journaux locaux sont sous `tmp/portal-default-password/`. Les exports contenant des identifiants sont exclus de Git par le motif `.env*`. Aucun email n’a été envoyé durant cette intervention et aucune migration distante n’a été appliquée.

## Code et synchronisation

Les sept commits distants jusqu’à `b64ff86` ont été intégrés par avance rapide. Les modifications locales préexistantes ont été sauvegardées puis restaurées ; le conflit du service de provisionnement a été résolu en conservant les nouvelles notifications et le mot de passe initial du portail demandé.

Le service d’admission et les scripts d’activation utilisent désormais `password` pour le portail, avec changement obligatoire. L’admission d’un utilisateur Auth existant conserve son mot de passe. Les messages distinguent les mots de passe du portail et de Microsoft 365 ; un mot de passe Microsoft inconnu n’est pas inventé.

## Validation

- TypeScript sans incrémental et ESLint : aucune erreur.
- `npm test` : workflows et vérifications PostgreSQL locales réussis ; test de régression du provisionnement inclus.
- Parcours première connexion : 55 tests réussis lors du premier passage sur le code synchronisé. Deux attentes anciennes ont été corrigées : sélecteur du nom de compte dans le menu et année accessible utilisée en repli. Ces deux tests passent après correction.
- La colonne `escen.people.nif` nécessaire au code récupéré existe en production. La version de migration 107 n’est pas inscrite dans l’historique distant ; aucune réparation de cet historique n’a été réalisée.

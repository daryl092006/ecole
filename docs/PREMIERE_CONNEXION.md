# Tableau de bord et première connexion

`/mon-espace` affiche les indicateurs du rôle, les éléments à suivre et les
raccourcis autorisés. Les données proviennent du snapshot filtré par rôle et année ;
le chargement est géré par le portail. Les liens des cartes sont filtrés selon la
navigation effective du compte. Le suivi étudiant utilise son matricule de session.

## Parcours obligatoire

Lorsque `ESCEN_FIRST_LOGIN_ENABLED=true`, un compte sans état de première connexion
terminé doit :

1. Choisir un nouveau mot de passe sur `/mot-de-passe-modifier`.
2. Vérifier ses informations administratives (nom, prénoms, filière d’inscription, date de naissance, email de connexion) et compléter ses coordonnées personnelles obligatoires (adresse géographique, email personnel, téléphone avec indicatif, date de naissance si manquante) sur `/premiere-connexion`.
3. Confirmer l'exactitude des informations administratives ou signaler une erreur, puis valider le récapitulatif `ReviewedForm`. En cas de confirmation, les coordonnées personnelles saisies ou modifiées sont enregistrées de façon auditée dans `escen.people`. En cas d’erreur administrative, un signalement est créé dans le centre de support sans altérer les données officielles.

Les API métier refusent les appels directs tant que l’étape requise n’est pas
terminée. Aucune donnée métier n’est chargée dans le navigateur pendant ces étapes.
La confirmation utilise un hash du profil affiché, lié au compte authentifié ; un
profil modifié entre lecture et confirmation est refusé.

Un signalement crée une demande personnelle dans le centre de support, avec le
contexte annuel explicitement choisi parmi les années accessibles, via la transaction auditée existante. L’année de travail est présélectionnée seulement si elle est accessible ; une personne rattachée à une ancienne année peut choisir celle-ci. Il ne modifie
aucun champ officiel. La première connexion est ensuite marquée comme « signalée »,
et non comme une attestation que les informations sont exactes. Si la transaction
échoue, le parcours reste bloqué. Si l’écriture Auth échoue après la création du
ticket, son identifiant déterministe évite une seconde création lors de la reprise.

L’état est conservé dans les `app_metadata` Auth, modifiables par le serveur :
`escen_first_login.version=1`, `password_changed_at`, `profile_reviewed_at`,
`profile_review` (`CONFIRM` ou `REPORT`), `profile_snapshot` et `ticket_id` éventuel.
Le marqueur historique `must_change_password` reste respecté. Les changements Auth
invalident le cache serveur pour permettre la transition immédiate vers l’étape suivante.

## Mise en service sans réimposer le parcours aux comptes déjà utilisés

`node scripts/prepare-first-login.mjs` présente uniquement les totaux, sans écriture
et sans afficher d’identité ou de secret. `--apply` relit chaque compte avant de :

- Préparer les comptes en attente de première connexion avec le mot de passe initial par défaut `password` et demander leur changement de mot de passe obligatoire dès la première connexion.
- Exempter de ce nouveau parcours les comptes ayant déjà une connexion (sauf avec `--reset-all`), tout en
  conservant une éventuelle obligation historique de changer de mot de passe.
- Préserver tout état de première connexion déjà terminé.

La commande initialise le mot de passe par défaut (`password`) uniquement pour les comptes soumis à la première connexion, n’envoie aucun email, ne modifie aucun
rôle et n’applique aucune migration SQL. Elle ne met `ESCEN_FIRST_LOGIN_ENABLED=true`
dans `.env.local` qu’après une préparation sans échec. Les nouveaux comptes créés
ultérieurement seront soumis au parcours par défaut, même sans marqueur initial.
Pour un serveur hébergé distinct, activer également cette variable après préparation.

Vérifications : `npx playwright test --config tests/ui/first-login.config.ts`,
`npx tsc --noEmit --incremental false`, `npm run lint` et `npm test`.

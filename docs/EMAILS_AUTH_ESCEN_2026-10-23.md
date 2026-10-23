# Emails d'authentification ESCEN — 23 octobre 2026

## État et blocage réel

Les six modèles email ESCEN sont préparés en français et testés. **Ils ne sont pas actifs sur le projet distant** : Supabase a refusé leur publication avec HTTP 400 sur `zmxapemyktxhppdxenzb` :

> Email template modification is not available for free tier projects using the default email provider. Please upgrade your plan or configure a custom SMTP provider.

L'activation nécessite un service SMTP personnalisé ou un changement d'offre Supabase. Aucun changement d'offre ni abonnement n'a été effectué. Aucun email réel n'a été envoyé pendant ce travail.

Le service SMTP est aussi nécessaire pour utiliser une adresse ESCEN comme expéditeur. Le DNS public du domaine `escen.university` indique :

- MX : `escen-university.mail.protection.outlook.com` ;
- SPF : `v=spf1 include:spf.protection.outlook.com -all`.

Cela identifie Microsoft 365 comme messagerie publiée du domaine, sans prouver qu'une boîte `noreply@escen.university` existe ou qu'elle autorise un envoi transactionnel. Aucun identifiant SMTP, clé Resend ou accès équivalent n'a été trouvé dans la configuration locale ou dans l'environnement du processus. L'accès au service d'envoi reste à fournir par un administrateur autorisé.

## Modèles prêts

| Parcours | Objet |
| --- | --- |
| Réinitialisation | ESCEN · Réinitialisez votre mot de passe |
| Confirmation d'adresse | ESCEN · Confirmez votre adresse email |
| Invitation | ESCEN · Votre invitation au portail |
| Lien de connexion | ESCEN · Votre lien de connexion |
| Changement d'adresse | ESCEN · Confirmez le changement d’adresse email |
| Vérification d'identité | ESCEN · Votre code de vérification |

Les fichiers sont dans `supabase/templates/auth/` ; leurs objets et chemins sont déclarés dans `supabase/config.toml`. `node scripts/prepare-auth-email-templates.mjs` régénère les six HTML depuis une structure commune.

Les liens utilisent la variable Supabase `{{ .ConfirmationURL }}` sans reconstruction du jeton ou de la redirection. Le parcours de vérification affiche `{{ .Token }}`. Les textes, l'identité ESCEN et la localisation Lomé/Togo sont intégrés au modèle, sans publicité Supabase ajoutée par le HTML local. Les éventuels ajouts du transport restent hors du contrôle du modèle.

Ces modèles utilisent des tableaux de présentation et des styles intégrés pour les clients mail. Ils ne dépendent pas des styles du portail, de JavaScript ou d'images externes. Ils ne créent aucun compte et n'activent aucun nouveau parcours Auth : un modèle d'invitation ne provisionne pas les comptes.

## Tentative de publication

Une copie de configuration distante a été lue dans le répertoire privé `/private/tmp/escen-auth-emails-20261023/`, puis une configuration temporaire minimale a été créée pour ne déclarer que les six modèles email. Aucun `config push` du fichier complet du dépôt n'a été effectué : ce fichier contient d'autres réglages locaux différents de ceux du projet distant.

Le diff préalable a confirmé que les seules valeurs déclarées à modifier étaient les six objets d'email. Le CLI a également chargé les six contenus HTML depuis `content_path` et les a inclus dans la demande Auth. Supabase a refusé cette demande avec le message ci-dessus. Le refus intervient avant l'application des modèles ; aucun réglage de connexion annexe n'a été modifié.

La sauvegarde de configuration dans le répertoire temporaire ne contient aucun jeton d'accès récupéré par les scripts : les lectures du trousseau tentées n'en ont pas retourné. Les commandes de gestion ont utilisé directement la connexion existante du CLI Supabase. Les secrets n'ont pas été affichés.

## Vérifications

- `npx tsc --noEmit --incremental false` : zéro erreur.
- `npm run lint` : zéro erreur, deux avertissements préexistants (`site` et `_tab`).
- `npm test` : workflows réussis, 185 groupes PostgreSQL et 10 groupes de régularisation enseignants réussis.
- `npx playwright test --config tests/ui/auth-email-templates.config.ts` : 12 tests réussis, six modèles à 360 et 768 px. Vérification du français, des liens et jetons, de l'absence de script et de débordement horizontal.
- Aperçus : `tmp/screenshots/auth-email-templates/`, dont `360/recovery.png` inspecté visuellement.

## Informations nécessaires pour terminer

Il faut identifier une boîte ou un service d'envoi autorisé pour ESCEN et disposer de ses paramètres de connexion SMTP : hôte, port, identifiant, secret et adresse expéditrice validée. Les secrets doivent être fournis dans la configuration serveur locale ou un gestionnaire de secrets, jamais dans le dépôt ni dans la conversation.

L'adresse envisagée est `noreply@escen.university`, avec le nom affiché `ESCEN`, sous réserve que cette adresse soit autorisée par le fournisseur choisi. Le seul fait d'exister dans le DNS du domaine ne permet pas d'utiliser une boîte pour l'envoi.

Une fois ce service disponible, compléter une configuration temporaire réduite aux emails, vérifier son diff, puis activer SMTP et les modèles dans Supabase. Vérifier ensuite la configuration distante et, avec un destinataire de test explicitement autorisé, la réception réelle, le nom d'expéditeur et le lien de réinitialisation. Ce raccordement reste à réaliser.

Références : [SMTP personnalisé Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [modèles Auth Supabase](https://supabase.com/docs/guides/auth/auth-email-templates).

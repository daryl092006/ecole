# Emails d’authentification ESCEN par Microsoft Graph

La fonction Supabase `auth-email` reçoit le **Send Email Hook**, vérifie sa
signature Standard Webhooks et envoie les messages par Microsoft Graph depuis
`noreply@escen.university`. Elle fonctionne indépendamment du serveur local du
portail. Supabase continue à créer et vérifier les liens de sécurité ; son service
SMTP n’envoie plus les emails lorsque le hook est activé.

Les modèles français partagés se trouvent dans
`supabase/functions/_shared/auth-email-templates.mjs`. Le générateur historique
`scripts/prepare-auth-email-templates.mjs` réutilise cette même source. Le hook
couvre récupération, invitation, confirmation, connexion par lien, changement
d’email (y compris double confirmation), réauthentification et les sept types de
notification de sécurité Supabase. Il ne change pas les options qui activent ces
notifications dans Auth.

## Configuration et activation

Le script utilise la CLI Supabase déjà authentifiée et les identifiants Microsoft
dans `.env.local`. Il refuse tout projet dont l’URL ne correspond pas à une
référence Supabase, ne journalise pas les secrets et ne lance aucune migration.

1. `node scripts/configure-auth-email.mjs check` : prépare un secret de signature
   indépendant dans `.env.local` s’il manque, vérifie l’authentification Microsoft
   sans email et compare les réglages Auth (noms des paramètres uniquement).
2. `node scripts/configure-auth-email.mjs deploy` : transfère uniquement les cinq
   variables nécessaires, déploie `auth-email`, vérifie qu’une demande non signée
   est refusée. Le hook reste désactivé à cette étape.
3. `node scripts/configure-auth-email.mjs activate` : active uniquement
   `auth.hook.send_email.enabled`, `.uri` et `.secrets`, depuis une configuration
   temporaire minimale. Les autres propriétés distantes restent non déclarées et
   conservées. Ne pas pousser le fichier complet `supabase/config.toml` pour cette opération.

Variables de la fonction : `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`,
`MICROSOFT_CLIENT_SECRET`, `ESCEN_AUTH_EMAIL_HOOK_SECRET`,
`ESCEN_AUTH_EMAIL_ENABLED=true`. `SUPABASE_URL` est fourni par le runtime Supabase.
La clé de signature est au format `v1,whsec_<base64>` ; ce n’est ni le secret client
Microsoft, ni le secret du worker métier. La fonction ne reçoit pas de clé de
service du portail pour son traitement. La vérification JWT de la passerelle est
désactivée pour ce hook ; sa signature HMAC est obligatoire.

Le fichier temporaire de transfert des secrets est créé avec droits `0600`, puis
supprimé. Aucun secret n’est versionné. À l’expiration du secret Microsoft,
remplacer sa valeur puis relancer `deploy`.

## Vérifications et limites

`npx playwright test --config tests/ui/auth-email-hook.config.ts` vérifie les
signatures, les payloads, les erreurs, les modèles et leur lecture mobile sans
envoyer de mail réel. Le délai réseau du hook est borné à 3,5 secondes pour rester
sous les cinq secondes imposées par Auth. Un `202` Graph indique l’acceptation,
pas la réception dans la boîte destinataire.

Les événements répétés sont regroupés pendant cinq minutes dans une instance.
Ce mécanisme ne garantit pas une déduplication entre instances ou après
redémarrage. Les erreurs et réponses ambiguës ne sont pas réessayées par le code ;
elles sont signalées à Auth. Aucun jeton de récupération n’est écrit en base,
dans le journal d’audit ou dans la file d’emails métier.

Après activation, demander un nouveau lien depuis le portail et vérifier
l’expéditeur et le contenu reçus. Les liens déjà envoyés ne changent pas.
Les URL de redirection autorisées dans Auth doivent toujours correspondre aux
origines réellement utilisées pour le portail.

Retour au service SMTP précédent : `node scripts/configure-auth-email.mjs disable`.
Cette commande désactive le hook sans supprimer la fonction ni ses secrets.
`node scripts/configure-auth-email.mjs verify` contrôle la signature de la fonction
déployée avec un payload incomplet qui ne peut envoyer aucun email.

Activation du 28 octobre 2026 : fonction déployée sur le projet
`zmxapemyktxhppdxenzb`, hook activé et absence de différence sur ses paramètres
déclarés vérifiée après application. La fonction répond `401` sans signature et
`400` avec une signature valide sur un payload volontairement incomplet.
L’authentification Microsoft a été vérifiée ; aucun email réel n’a été envoyé
par ces contrôles. La réception doit être confirmée par une nouvelle demande
de récupération depuis le portail.

Références : [Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook),
[budget HTTP de cinq secondes](https://supabase.com/docs/guides/auth/auth-hooks),
[signatures Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md).

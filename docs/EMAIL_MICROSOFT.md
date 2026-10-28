# Envoi des emails par Microsoft Graph

Configuration serveur dans `.env.local` en développement, puis dans les variables
secrètes de l’hébergeur pour chaque environnement déployé :

```dotenv
ESCEN_EMAIL_PROVIDER=microsoft
ESCEN_EMAIL_ENABLED=true
ESCEN_EMAIL_FROM=noreply@escen.university
MICROSOFT_TENANT_ID=<ID du locataire>
MICROSOFT_CLIENT_ID=<ID de l’application>
MICROSOFT_CLIENT_SECRET=<Valeur du secret client, pas son ID>
ESCEN_EMAIL_WORKER_SECRET=<secret indépendant aléatoire d’au moins 32 caractères>
```

Ne jamais versionner ces valeurs ni les préfixer par `NEXT_PUBLIC_`. Renouveler
le secret client avant son expiration et redémarrer le serveur après modification.
`ESCEN_EMAIL_ENABLED=false` suspend le traitement sans prendre de messages en file.
Resend reste compatible avec `ESCEN_EMAIL_PROVIDER=resend` et `RESEND_API_KEY`.

L’application utilise le flux OAuth client credentials avec le scope
`https://graph.microsoft.com/.default`, puis appelle
`POST /v1.0/users/{adresse expéditrice}/sendMail`. Le rôle Exchange
`Application Mail.Send` doit être limité à cette boîte par RBAC. Ne pas ajouter
un droit global `Mail.Send` dans Entra, qui s’ajouterait au périmètre Exchange.

Le traitement existant est déclenché par `POST /api/email-outbox/process` avec
`Authorization: Bearer <ESCEN_EMAIL_WORKER_SECRET>`. Il traite au plus trois
messages par appel ; ce raccordement ne crée aucune planification automatique.
L’API de suivi garde ses contrôles d’accès DG/IT et ses contrôles d’année.

Une réponse Graph `202` vide signifie « accepté », sans garantie de livraison.
La référence enregistrée est l’identifiant de requête Graph, ou l’identifiant
local en repli, préfixé par `microsoft:` ; ce n’est pas un identifiant de message.
Le `client-request-id` permet la corrélation, sans garantie d’idempotence.
Les erreurs d’authentification précèdent l’envoi et sont classées en échec de
configuration. Un timeout pendant l’envoi, un échec serveur ou une réponse
inattendue reste incertain et ne provoque aucun réessai automatique.

Vérification locale sans réseau et sans email réel :
`npx playwright test --config tests/ui/email-transport.config.ts`.
Un test réel nécessite un destinataire explicitement choisi et autorisé.

Références :
- [Authentification par secret client](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Graph sendMail et réponse 202](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0)
- [RBAC Exchange pour les applications](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac)

# Récupération du mot de passe

La demande de réinitialisation ferme la session locale existante avant l’appel
à `resetPasswordForEmail`. Le retour à la connexion ne restaure donc pas cette
ancienne session. Le message de confirmation ne révèle pas l’existence d’un compte
et ne constitue pas une preuve de livraison du courrier.

Le client Supabase du portail ignore les liens de récupération. La page de
réinitialisation vérifie le lien avec un client distinct, sans persistance ni
rafraîchissement automatique. Une session ordinaire enregistrée dans le navigateur
ne permet pas d’utiliser cette page sans lien. Les jetons du fragment sont retirés
de l’URL après lecture, y compris si la vérification échoue. Quitter la page efface
la session de récupération en mémoire ; recharger la page nécessite un nouveau lien.

Après modification, la récupération ferme les sessions Supabase puis exige une
nouvelle connexion. Le parcours de changement obligatoire conserve sa commande
serveur existante pour changer le mot de passe et lever l’obligation ensemble.

## Réception des emails : configuration distincte

Les demandes sont envoyées par **Supabase Auth**, et non par la file métier
Microsoft Graph de `emailTransport.ts`. L’envoi par Graph pour Auth passe par le
hook dédié décrit dans [AUTH_EMAIL_MICROSOFT.md](AUTH_EMAIL_MICROSOFT.md).
Configurer les variables Graph dans `.env.local` ne suffit pas : la fonction doit
être déployée et le hook activé dans Supabase.

Dans le tableau de bord Supabase, vérifier le fournisseur d’envoi Auth, le modèle
de récupération et les URL de redirection autorisées. Chaque origine réellement
utilisée doit autoriser `/mot-de-passe-reinitialiser`. Le serveur SMTP de test de
Supabase limite les destinataires et le débit. Vérifier les journaux Auth pour une
demande réelle et la réception dans la boîte choisie avant de conclure à la livraison.
Ne pas utiliser le secret client Microsoft comme mot de passe SMTP.

Références : [réinitialisation et protection contre l’énumération](https://supabase.com/docs/guides/auth/passwords),
[limites du service SMTP par défaut](https://supabase.com/docs/guides/auth/auth-smtp).

## Vérifications

`npx playwright test --config tests/ui/auth-session.config.ts` couvre les demandes,
la reprise après erreur, la déconnexion, les anciennes sessions, le changement
obligatoire, les liens valides, absents et expirés, et l’absence de session de
portail persistante issue d’un lien de récupération. Les appels Auth sont simulés :
ces tests n’envoient aucun email et ne modifient aucun compte distant.

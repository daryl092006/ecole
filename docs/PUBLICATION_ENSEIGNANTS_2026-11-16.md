# Enseignants et programmation — publication du 16 novembre 2026

La publication a été demandée après validation de la règle suivante : les enseignants historiques peuvent être importés avec leurs comptes Microsoft 365 existants, mais leur e-mail personnel doit être complété avant leur programmation. Il reste obligatoire dès la création d’un nouvel enseignant.

## Données en production

- Les 63 comptes Microsoft 365 de la liste fournie existent et sont actifs. Aucun compte Microsoft n’a été créé, supprimé, réinitialisé ou modifié pendant l’import.
- 41 profils enseignants manquants ont été ajoutés avec leurs dossiers du personnel, comptes portail et rôles ENS. Le lot a produit 205 audits et a été appliqué atomiquement après répétition locale, contrôle des révisions concurrentes et vérification du rollback d’un échec tardif.
- Six profils enseignants existants ont reçu leur compte portail : AYAKPONOU, NYARKO, MESSANH, ALITI, FIOKLOU et AGBETOGLO. Leurs rattachements ont été vérifiés par les sessions serveur.
- Les 61 identités non ambiguës de la liste disposent d’un profil et d’un compte portail cohérents, vérifiés par `escen_account_session` avec le rôle ENS.
- Les contacts personnels absents restent absents : aucune adresse n’a été inventée et aucun e-mail n’a été envoyé pendant l’import. Les comptes portail nouvellement créés utilisent un secret aléatoire non conservé dans les rapports ; le lien de choix du mot de passe est envoyé lors de la collecte du contact personnel.
- Le nom Nana CHEVREUIL est issu du nom affiché par le compte Microsoft `c.nana.coach@escen.university`. Il est reconnu comme variante de l’entrée fournie « Mme NANACHEVREUIL » dans le registre protégé.

Deux cas restent exclus des rapprochements automatiques :

- `d.kokou.coach@escen.university` : DOGBE Kokou Messanh dans Microsoft et la liste, Jean Pierre DOGBE dans le portail.
- LAWSON Bede : possible correspondance avec Fessou Bede LAWSON KPAVUVU, déjà titulaire du compte `l.bede@escen.university` avec le rôle Marketing. Ce compte n’a reçu aucun rôle enseignant pendant cette opération.

Les plans, instantanés, résultats de recette et identifiants techniques sont conservés dans le répertoire local privé `tmp/teacher-list-import/`. Ils ne font pas partie de la source déployée.

## Fonctionnement publié

Le planning exige un contact personnel valide pour créer, modifier, déplacer une séance ou remplacer son enseignant, y compris pour un cours commun. Le formulaire permet de vérifier et confirmer ce contact avant de reprendre la séance conservée. L’API applique aussi ce blocage.

Le parcours de collecte ne permet pas d’écraser un contact personnel déjà valide. Il vérifie l’année, les permissions, l’affectation ou la séance et le périmètre autorisé avant toute écriture. Les instructions d’accès sont envoyées au contact personnel ; l’échec ou l’incertitude d’envoi sont signalés, sans réinitialisation Microsoft ni nouvelle tentative automatique. La vue Liste du calendrier fonctionne aussi sur ordinateur.

Le registre des comptes Microsoft existants est exclusivement importé par des modules serveur. L’absence de ses adresses dans les fichiers JavaScript publics a été vérifiée sur la construction finale.

## Déploiement

- Domaine : https://portail.escen.university
- Source : `7fd4fde8a8097c2cc43188c1e090a259fcdedfd2`, incluant `eed00fa` et `6b736a7`.
- Déploiement : `dpl_DgxJE9Sg4txcepR43QVUd916YDLN`.
- URL technique : https://ecole-8onpqwdom-denis-gangnitos-projects.vercel.app
- Version précédente conservée : `dpl_9ESbAhrcfSyLTGLJWD5g9Z89x2Pv`.
- Construction avec les paramètres de production, sans promotion automatique ; domaine basculé après confirmation de l’état Ready.
- Migration `202611160110_teacher_digital_access.sql` appliquée et version 202611160110 enregistrée dans l’historique distant. Aucune ancienne migration n’a été réexécutée ni modifiée.
- Le contrôle final des ACL a révélé des droits explicites d’exécution issus des privilèges par défaut Supabase sur les fonctions nouvellement créées. Ils ont été retirés immédiatement pour `anon` et `authenticated`, avec vérification que `service_role` conservait l’accès. La migration de suivi 111, appliquée et enregistrée dans l’historique distant, conserve exactement ces restrictions ; sa recette reproduit les privilèges Supabase, contrairement à la première recette sur une base PostgreSQL sans ces droits par défaut.
- Les trois paramètres Azure nécessaires au provisionnement ont été ajoutés comme secrets chiffrés de production. Leurs valeurs ne figurent ni dans l’archive source ni dans les rapports. Une licence faculté dispose d’une capacité libre, contrôlée en lecture seule.
- L’archive est extraite du commit ; elle ne contient aucun `.env.local`, fichier de staging ou instantané privé. Aucun push Git ni changement DNS n’a été réalisé.

## Vérifications

- TypeScript sans incrémental, ESLint et `npm test` réussis.
- 70 tests Playwright locaux réussis : contacts, périmètres, comptes protégés, calendrier, copies, conflits, déplacements et envois incertains.
- Quatre tests sur l’interface publiée réussis à 390 et 1440 px : création enseignant et collecte du contact avec conservation de la séance. Les API de ces essais navigateur sont simulées : aucune séance ni aucun message réel n’a été créé par ces essais.
- Vérification réelle du domaine le 16 novembre à 15:49 UTC : `/connexion` retourne HTTP 200 ; `/api/schedule`, `/api/teachers` et POST `/api/schedule/teacher-contact` retournent HTTP 401 sans session.
- Le projet Vercel confirme que son déploiement de production est celui indiqué ci-dessus. La table de suivi, le trigger de contact et les droits des RPC ont été vérifiés en lecture seule dans Supabase.
- Après correction des ACL, un véritable client Supabase anonyme ne peut plus appeler le snapshot ; le client serveur continue à le lire et le suivi privé reste exclu. Vérification du 16 novembre à 15:56 UTC.

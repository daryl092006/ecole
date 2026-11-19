# Correctif des sauvegardes d’examen — 19 novembre 2026

- Accord explicite utilisateur : conserver les sauvegardes automatiques et retirer leur rechargement global du campus.
- Commit local : 98411c5 ; aucun push Git.
- Base de déploiement : version réellement en production 3c6782dfd4a782aa98434b64e7cbbac4ad6c7a8a, avec uniquement StudentExamsWorkspace.tsx modifié dans le code applicatif.
- Sauvegardes, brouillon local, reprise, idempotence, horloge et délais préservés. refreshCampus() conservé après remise ou réponse indiquant une tentative terminale.
- TypeScript sans écriture incrémentale : réussi.
- ESLint : réussi.
- Sept tests Playwright existants : réussis, y compris réseau perdu, échéance, mode hors ligne et conflit entre onglets.
- Nouveau test : réussi après stabilisation du comptage du rechargement initial ; deux sauvegardes automatiques sans nouvel appel campus, puis remise avec actualisation.
- Déploiement Vercel dpl_G9HF9HdsQjEhDaVb42ptPhTu4VGb : READY, domaine portail.escen.university associé.
- Bundle servi vérifié : 90-1aae1fe9a8f483ae.js ; condition submit ou statut différent de EN_COURS avant refreshCampus().
- Une actualisation du navigateur charge le nouveau code. Ce contrôle du déploiement ne prouve pas à lui seul la résolution de toute la lenteur de PostgreSQL.
- Contrôle RPC après publication : échec SQLSTATE 57014 après 42 428 ms côté client ; le rétablissement global de la base n’est pas confirmé.

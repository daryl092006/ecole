# Diagnostic complémentaire — examens, 19 novembre 2026

## Mécanisme de surcharge confirmé dans le code déployé

- StudentExamsWorkspace.tsx : minuteur de 750 ms ; si les réponses changent, sauvegarde des réponses puis refreshCampus() après chaque succès.
- useAppState.ts : refreshCampus() déclenche un nouveau loadRelationalCampus(), donc GET /api/campus.
- supabase/server.ts : chaque appel escen_online_exam est classé hors RPC en lecture et invalide le cache commun, y compris le snapshot. Les sauvegardes fréquentes font donc perdre le bénéfice du cache.
- exam-attempts/route.ts : ouverture et relecture d’une copie chargent aussi le snapshot complet pour récupérer les instructions d’un seul sujet.
- Vérification du bundle de production /_next/static/chunks/90-1b089a55707d5eea.js : succès de sauvegarde suivi de refreshCampus(), puis contrôle de accepted ; correspond au code local.

Ce mécanisme est une amplification de charge certaine. Son poids exact dans la saturation globale n’est pas mesuré : les métriques de ressources n’ont pas répondu.

## Contrôles de production

- inspect db blocking : aucune transaction bloquante détectée au contrôle.
- Base : 139 Mo ; taux de cache index et tables 1,00 ; aucun indice de gros volume disque.
- Endpoint métriques : deux HTTP 504 après environ 16 s.
- Une requête d’activité administrative : délai de connexion (544) ; une connexion directe : terminaison inattendue.
- Auth health : HTTP 200 en 922 ms ; REST schema : HTTP 200 en 5 558 ms. Le service n’est donc pas totalement arrêté.
- La tâche expire_exam_attempts représente 95,5 % du temps des requêtes de la liste inspectée sur 36 jours ; cette statistique cumulée ne prouve pas qu’elle cause l’incident présent.

## Correction soumise à accord

Le patch exam-autosave-proposed.patch conserve toutes les sauvegardes de copie et leur résultat local, et réserve refreshCampus() à la remise ou à une copie terminale. Il demande une exception explicite à la consigne AGENTS.md de rafraîchissement après toute mutation. Aucun fichier applicatif n’est modifié par ce patch de proposition et aucun déploiement de ce correctif n’a été effectué.

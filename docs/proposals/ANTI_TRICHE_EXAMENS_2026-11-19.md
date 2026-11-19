# Dispositif d’intégrité des épreuves — proposition à valider

Statut : proposition. Aucun changement appliqué aux épreuves ou aux copies.

## Constats vérifiés dans le portail

- La RPC d’examen vérifie l’identité du candidat, son inscription, son admissibilité, son rôle et son périmètre avant l’accès à une copie.
- Le délai est contrôlé côté serveur ; une copie ne peut pas être prolongée par modification de l’horloge du navigateur.
- Les sauvegardes utilisent une révision et un identifiant idempotent : une écriture concurrente est refusée et la réponse perdue peut être rejouée.
- Le retour sur un onglet relit la copie. Ce mécanisme ne constitue pas actuellement un journal anti-triche.
- Aucun journal dédié aux sorties de page, aux collages ou à une surveillance n’a été trouvé dans le parcours inspecté.

## Parcours proposé

1. Avant l’ouverture : l’enseignant précise les ressources autorisées, les règles de collaboration et la politique applicable. Le candidat lit ces règles et confirme son engagement avant de commencer.
2. Configuration facultative d’un ordre différent des questions et des choix. L’ordre reste stable par copie lors des sauvegardes et reprises. Les études de cas et questions liées restent groupées ; les choix dépendant d’un ordre ne sont pas mélangés.
3. Une session d’écriture active par copie, avec reprise explicite après reconnexion ou changement d’appareil. Les coupures réseau ne deviennent pas des incidents de fraude.
4. Signaux annoncés au candidat : passage de l’épreuve en arrière-plan, retour dans l’épreuve, collage dans un champ de réponse et sortie du plein écran lorsque ce mode est activé et pris en charge. Le collage est journalisé sans enregistrer le contenu du presse-papiers.
5. Avertissement informatif au candidat et chronologie consultable par les personnes habilitées. Une sortie de page ou un collage ne constitue pas, à lui seul, une preuve de fraude.
6. Après remise : l’enseignant examine les signaux dans leur contexte et peut demander une explication ou une vérification orale. Toute décision affectant une note doit suivre une règle approuvée et une confirmation via ReviewedForm.

## Contraintes de mise en œuvre

- Préserver la sauvegarde automatique, les brouillons locaux, l’idempotence, les révisions et les échéances serveur.
- Conserver l’identification personnelle des épreuves aux rôles Étudiant et Délégué, y compris pour un compte cumulant IT et Étudiant.
- Les événements sont rattachés côté serveur à la copie authentifiée ; aucun identifiant fourni par le navigateur ne permet d’écrire sur la copie d’un autre candidat.
- Les événements sont regroupés et bornés. Pas de rechargement du campus pour l’envoi d’un événement. L’échec du journal n’empêche pas l’enregistrement des réponses.
- RLS et RPC sécurisées pour les nouveaux objets ; droits de consultation limités à l’épreuve, au groupe et à l’année autorisés ; audit réutilisé conformément à AGENTS.md.
- Le journal porte sur l’activité observable dans la page de l’épreuve. Il n’observe ni le contenu des autres sites, ni un second appareil. Les interruptions du système, du navigateur ou du réseau peuvent produire des signaux sans fraude.
- Le plein écran dépend du navigateur et ne doit pas empêcher une épreuve sur un appareil non compatible.
- Aucune règle nouvelle ne s’applique rétroactivement aux événements non enregistrés.

## Décisions à valider avant développement

- Périmètre : prochaines épreuves, ou ajout explicitement annoncé à l’épreuve en cours.
- Première version : engagement, ordre stable facultatif, contrôle de session et journal avec revue humaine.
- Ressources autorisées, personnes habilitées à consulter les incidents et durée de conservation du journal.
- Éventuelles sanctions : à définir et approuver séparément ; aucun seuil de sanction n’est inventé dans cette proposition.

## Ordre de livraison

Après validation du dispositif : présenter le SQL de la nouvelle migration et attendre l’accord ; puis permissions, types, API, interface de configuration et journal, tests de sauvegarde/reprise/conflit/réseau et contrôle de charge. Déploiement après validation du résultat concret.

## Références techniques

- Page Visibility API : https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- Fullscreen API : https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API

## Première version confirmée dans la conversation

Le mode strict vise les prochaines épreuves : plein écran pour composer, questions masquées lors d’une sortie, avertissements et journal des incidents, restrictions de copie/collage/impression dans la page. Les captures système ne peuvent pas être garanties bloquées et aucun écran n’est enregistré. Les copies déjà ouvertes et l’épreuve actuellement en cours restent exemptées. Les sauvegardes et brouillons restent indépendants du journal.

Le journal est audité et consultable avec les droits existants du journal d’activité (DG/IT) ; aucun accès enseignant ou surveillant supplémentaire n’est accordé automatiquement. Le mélange des questions et le contrôle exclusif de session restent des évolutions distinctes de cette première version.

SQL proposé avant implémentation : `docs/sql-proposals/20261119_exam_strict_mode.sql`. L’activation attend la validation explicite de ce SQL, conformément à AGENTS.md.

Le schéma est installé avec le mode désactivé (`activated_at = infinity`). Après déploiement et vérification de l’interface, le SQL séparé `docs/sql-proposals/20261119_activate_exam_strict_mode.sql` fixe la date d’activation. Aucune copie déjà commencée ne change de mode.

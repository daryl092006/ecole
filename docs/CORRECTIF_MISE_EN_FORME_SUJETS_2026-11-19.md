# Rendu des consignes et du contexte des épreuves

Les consignes générales et les consignes de partie étaient rendues comme des chaînes React ou échappées à l'impression. Un contenu HTML enregistré affichait donc ses balises au lieu des paragraphes et du tableau. Les questions utilisaient déjà le composant de rendu sécurisé.

Les aperçus étudiant/enseignant, l'impression et les consignes de partie dans la copie en ligne utilisent désormais le même filtrage HTML que les questions. Les champs de composition des consignes proposent aussi l'éditeur de mise en forme existant, avec leurs limites respectives de 8000 et 4000 caractères.

La RPC de copie ne renvoie pas les consignes générales du sujet. Après une lecture ou un démarrage autorisé par cette RPC, la route API complète sa réponse avec le seul champ `instructions` du sujet dont l'identifiant est renvoyé par la RPC. Les autres sujets et les corrections du snapshot restent exclus. Une copie refusée ne charge aucun contexte. Les sauvegardes ne déclenchent pas cette lecture supplémentaire ; l'interface conserve le contexte déjà chargé pour le même sujet.

Aucune migration ni mutation du sujet enregistré n'est nécessaire. Le barème, la durée et le statut de diffusion ne sont pas modifiés par ce correctif.

Régressions couvertes : tableau et paragraphes dans les deux aperçus et à l'impression, copie étudiante aux largeurs 390/1440 px, maintien du contexte après sauvegarde, exclusion du corrigé, filtrage des scripts, accès refusé sans lecture du contexte, et lecture d'un seul sujet autorisé. Le transport local des tests PostgreSQL prend en charge la lecture du snapshot et vérifie les consignes réellement enregistrées.

Validation : compilation de production locale, TypeScript sans incrémental, ESLint et `npm test` réussis. Les onze tests ciblés de copie et de mise en forme passent. L'audit global couvre 62 écrans à huit largeurs et neuf transitions : les trois largeurs interrompues par une saturation mémoire (390/480/768 px) ont été reprises seules sur la même compilation et passent toutes. ESLint et les tests métier ont également été relancés séparément après cette saturation ; les 204 groupes PostgreSQL et toute la suite métier passent. Les chemins de types ajoutés automatiquement par Next.js dans tsconfig.json ont été retirés.

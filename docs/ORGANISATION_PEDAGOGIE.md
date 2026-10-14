# Organisation pédagogique et composition des sujets

Mise à jour : 14 octobre 2026.

## Parcours visibles

La navigation pédagogique est regroupée en « Enseignements et planning », « Épreuves et résultats » et « Suivi académique ». Les épreuves et leurs résultats disposent de pages distinctes :

| Page | Contenu |
| --- | --- |
| `/academique/evaluations` | Contrôles continus : devoirs, interrogations, TP, exposés et projets |
| `/academique/examens` | Examens de session normale |
| `/academique/rattrapages` | Épreuves de rattrapage et référence à l’épreuve initiale quand elle est conservée |
| `/academique/sujets` | Bibliothèque et composition des sujets |
| `/academique/notes` | Notes enregistrées, sans onglet supplémentaire d’évaluations |

Les collections historiques sont classées par les valeurs enregistrées de `type` et `session_type`. Un rattrapage ne figure pas simultanément dans la liste des examens normaux. Les épreuves retirées restent consultables séparément. Les références initiales manquantes sont signalées, sans parent fictif. Les données canoniques des autres rôles restent filtrées côté serveur dans leur périmètre.

## Gestion en page

Les détails et formulaires de références, personnel, étudiants, comptes et collections historiques s’ouvrent dans une page centrale avec retour à la liste. Le composant `WorkPage` remplace les panneaux latéraux. La navigation principale reste disponible ; aucun piège de focus ou blocage du défilement de type modal n’est utilisé.

Les référentiels présentent une seule liste réunissant les enregistrements canoniques et les sources non encore reprises. Les liens de provenance empêchent de présenter deux fois un dossier déjà repris. « Modifier » sur une source ouvre le formulaire prérempli et exige les valeurs officielles manquantes avant la reprise. La conservation intégrale des originaux et de l’audit est maintenue. Les informations historiques supplémentaires du personnel sont dépliables plutôt qu’affichées comme une seconde liste par défaut.

## Composer une épreuve

Depuis « Composition des épreuves », choisir « Composer une épreuve », renseigner le titre, la nature, la durée et les consignes ; ajouter des parties, puis des questions. Une seule partie/question est éditée à la fois pour éviter une accumulation de formulaires. Types disponibles : réponse ouverte, QCM à un choix ou à plusieurs choix. Chaque question possède ses points, choix et indications de correction.

L’aperçu étudiant présente le sujet sans bonnes réponses ni corrigé. L’onglet corrigé affiche les indications destinées à l’auteur. Le sujet peut être imprimé, avec l’indication de brouillon. Le barème total est calculé sans imposer arbitrairement un total institutionnel de 20 points.

« Enregistrer le brouillon » écrit dans Supabase. Chaque modification crée une nouvelle version du sujet, de ses parties, questions et choix ; l’ancienne version reste conservée. Un enseignant n’accède qu’à ses propres sujets préparatoires. La direction académique, la direction générale et l’Informaticien peuvent gérer les sujets avec un accès global explicitement attribué. Les étudiants n’ont pas accès à cette API et aux corrigés.

La migration additive 21 réutilise `exam_papers`, `exam_parts`, `exam_questions` et `exam_options`. Elle permet un sujet préparatoire sans `evaluation_id`, avec titre et auteur obligatoires. Un sujet non rattaché ne peut jamais passer à `AUTORISE` ni servir à une tentative. Une référence à une évaluation historique est une provenance explicite, et non une équivalence avec une évaluation canonique. Le rattachement historique vérifie aussi la nature de l’épreuve.

L’API `/api/subjects` contrôle l’identité, les permissions, la propriété du sujet, la structure et la révision concurrente. Les lots de questions sont enregistrés atomiquement et audités, y compris lorsqu’ils dépassent la taille d’un lot interne. Aucune note, copie historique ou inscription n’est modifiée par la composition.

## Limite opérationnelle

La composition et la sauvegarde des sujets préparatoires sont persistantes. La programmation canonique des nouvelles sessions, l’autorisation de diffusion et le passage en ligne ne sont pas activés par la création d’un brouillon. Ils nécessitent leurs enseignements, candidats, règles et fenêtres réels. Les anciens workflows de démonstration restent bloqués pour les sessions authentifiées.

## Vérification

Lint et build de production ; tests métier et 31 groupes PostgreSQL ; 18 tests navigateur à 390/1440 px couvrant la séparation des catégories, les pages de gestion, l’unification des références, la composition, l’aperçu sans corrigé et les versions après rechargement. La migration 21 est appliquée ; la RLS et les refus anonymes sont vérifiés. Aucun sujet de test n’a été créé dans la base distante.

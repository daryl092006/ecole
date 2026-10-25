# Comparaison fonctionnelle des examens — référence et application locale

Observation du 25 octobre 2026, après le commit local `f715d20`.

## Méthode et limites

Référence : https://escendemo.neostart.tech/, avec le compte autorisé par l’utilisateur, affiché comme Informaticien. Huit états lisibles examinés : liste, création, détail, configuration des surveillants, fiche de notes, constructeur de questions, liste des copies et fenêtre de correction individuelle. Le bouton Modifier a également été essayé : réponse HTTP 404 de son endpoint ; aucun formulaire de modification exploitable obtenu.

Les destinations ont été relevées dans le DOM, ouvertes puis capturées. Aucun enregistrement, publication, changement de note ou affectation n’a été soumis. Les requêtes d’écriture sont bloquées après connexion. La présence d’une interface ne prouve pas la réussite de sa sauvegarde. L’expérience réelle d’un étudiant ou d’un enseignant sur la référence n’a pas été testée avec leurs comptes.

Comparaison locale : lecture des composants authentifiés, des API actives, des services et des contraintes SQL existantes, complétée par les recettes de la phase précédente. Les tables présentes en base et les anciens composants isolés ne sont pas comptés comme fonctionnalités montées.

Captures locales de référence : `tmp/screenshots/reference-demo-2026-10-25/`. Elles contiennent des données personnelles et ne sont pas jointes au commit. Aucun secret n’est conservé dans ce document.

## Comparaison détaillée

| Parcours | Référence observée | Application locale actuelle | Écart vérifié |
| --- | --- | --- | --- |
| Liste des évaluations | Filtres niveau, filière, catégorie, session et publication ; actives/corbeille ; actions dédiées | Onglets contrôle/session normale/rattrapage ; filtres groupe, matière, état des notes et épreuves retirées ; export | Publication de programmation et état des notes ne sont pas équivalents. Filtres niveau/filière et restauration non montés ici. |
| Création | Groupe, catégorie, session, matière, salle, date, début/fin, échéance de correction, durée, en ligne, publication de programmation | Groupe/enseignement, nature, intitulé, parent de rattrapage, effectif ; confirmation ; programmation par parcours séparé | Le dernier correctif relie des étapes ; il ne reproduit pas le formulaire de programmation complet. |
| Programmation | Date, horaires, salle et mode visibles dans le détail | Séance persistante avec conflits de groupe/enseignant/salle et fenêtre de diffusion | La création de séance et le rattachement à la diffusion restent distincts. La carte de préparation locale ne prouve pas que tous ces choix sont enregistrés. |
| Surveillants | Configurer ouvre deux sélecteurs de surveillant | Tables `session_supervisors` et `exam_room_supervisors`, protections de conflit ; aucun écran/API d’affectation trouvé dans les parcours actifs | Stockage et contraintes existent, parcours opérationnel à construire. Ne pas réutiliser la liste historique de `campus.supervisors`. |
| Publication du calendrier | Case à la création, filtre et interrupteur de publication ; état publié dans le détail | Autorisation du sujet, fenêtre de composition et publication des notes | Il manque un état explicite de publication de la programmation. Ne pas réutiliser `evaluations.status = PUBLIEES`, qui concerne les notes. |
| Échéance de correction | Champ Date de fin de correction à la création | Aucun champ métier équivalent trouvé sur les évaluations natives ; champ seulement dans le catalogue historique | Donnée et contrôles persistants à prévoir ; aucune règle de blocage ou pénalité à inventer. |
| Anonymat | Codes sur fiche de notes et copies ; recherche par anonymat | `evaluation_candidates.anonymous_code` existe ; pas de génération, recherche ni parcours anonymisé monté trouvé | Une colonne disponible ne constitue pas un circuit d’anonymisation. Le périmètre de masquage de l’identité doit être défini. |
| Organisation du sujet | Parties, description, indicateurs parties/questions/points/complétion | Parties, consignes, questions, points, aperçu étudiant et corrigé ; versions persistantes | Fonction commune existante, avec présentation et indicateurs moins complets ici. |
| Types de questions | QCM unique, QCM multiple, vrai/faux, texte court, texte long | `QCM_SIMPLE`, `QCM_MULTIPLE`, `TEXTE` | Vrai/faux et variantes courte/longue n’ont pas de commandes spécifiques. Une représentation éventuelle par les types existants doit être explicite, pas annoncée comme déjà disponible. |
| Étude de cas et justification | Option étude de cas sur une partie ; demande de justification d’un QCM | Consignes de partie et texte ou choix, sans ces options dédiées | Pas d’équivalence fonctionnelle démontrée. |
| Validation QCM | Message exigeant une bonne réponse dans le constructeur | SQL `guard_paper_options()` exige le corrigé lors de l’autorisation ; schéma de formulaire accepte encore un QCM sans bonne réponse | Protection réelle en base déjà présente. Amélioration nécessaire de la validation et du message avant enregistrement ; ne pas présenter le SQL comme absent. |
| Sujet déjà utilisé | Mode lecture seule affiché après démarrage ; bouton Forcer la modification non actionné | Sujet autorisé immuable en SQL, composition versionnée | Ne pas copier une dérogation de modification sans procédure approuvée. Vérifier aussi la compatibilité du versionnement local avec l’immutabilité du sujet autorisé. |
| Lecture des copies | Liste des soumissions, progression, note, état de correction, dernière activité | `PersistentExamCopies` affiche les tentatives, états de remise, réponses et note globale | La lecture existe ; un tableau de suivi comparable avec filtres n’existe pas encore. |
| Filtres des copies | Recherche par anonymat, partie, correction et tous les inscrits/soumissions reçues | Filtre technique évaluation/candidat ; affichage des tentatives commencées | Pas de recherche utilisateur ni de filtre par partie/correction ; les non-participants ne figurent pas dans cet écran. |
| Correction individuelle | Fenêtre par copie, réponse et choix attendus, points et commentaire par question, total, Enregistrer tout | Lecture des réponses puis saisie d’une note globale dans `EvaluationGradeDialog` | Écart majeur : aucune commande persistante montée pour la correction détaillée par question. `answer_corrections` existe ; `OnlineExamCorrectionPanel` reste isolé et ne constitue pas un parcours actif. |
| Fiche de notes | Recherche nom/prénom/anonymat, export, statistiques moyenne/minimum/maximum | Effectif, copies notées/en attente/absents, saisie globale et corrections motivées | Recherche/export et ces statistiques manquent dans la fiche native, indépendamment de l’export de la liste des épreuves. |
| Validation et publication des résultats | Valider les notes sur les copies ; publier les notes sur la fiche | Saisie → soumission → contrôle → validation → publication, avec permissions et confirmations | Le circuit local existe déjà. Conserver ses contrôles ; le rapprocher d’une correction détaillée sans le remplacer par un seul bouton. |
| Composition étudiante | Non testée sur la référence avec un compte étudiant | Parcours connecté : horloge serveur, démarrage, sauvegarde, remise et échéance automatique ; tests dédiés existants | Aucune conclusion de parité entre rôles à partir du seul compte Informaticien. |

## Constats à ne pas masquer

1. Les corrections du commit `f715d20` sont des améliorations d’enchaînement, pas la finalisation de la gestion des examens.
2. La correction question par question, l’anonymat et le suivi des copies sont des écarts plus importants que l’apparence des cartes.
3. Le constructeur de référence montre une aide IA et une dérogation de modification ; ni leur fonctionnement ni leur politique ne sont validés. Ne pas ajouter de bouton factice pour les imiter.
4. La référence montre des zéros sur la fiche globale alors que la fenêtre d’une copie calcule un total différent. Sans sauvegarde ni requêtes métier supplémentaires, aucune interprétation de ces valeurs n’est établie ; ne pas copier un traitement qui transformerait une absence de correction en zéro.
5. Le bouton Modifier de la référence a renvoyé `404 /api/evaluations/<id>/modifier`. Le site de référence ne peut pas être présenté comme entièrement fonctionnel.

## Reprise prioritaire fondée sur cette comparaison

1. **Correction des copies** : écran filtrable, réponses et barème par question, points/commentaires persistants, récapitulatif avant confirmation et articulation avec la note globale et son circuit. Conserver les réponses originales et contrôler les droits de l’affectation.
2. **Programmation complète** : séance et évaluation clairement reliées, surveillants, mode papier/en ligne, publication de programmation séparée des notes et échéance de correction. Toute évolution SQL doit être présentée avant migration conformément à AGENTS.md.
3. **Anonymat** : définition du périmètre de visibilité, attribution traçable des codes et recherche/export appropriés. Ne pas promettre l’anonymat alors que le nom reste accessible au correcteur.
4. **Constructeur** : validation immédiate des QCM, types de réponse complémentaires, étude de cas/justification, état de préparation et aperçu. Préserver les sujets autorisés et les versions utilisées dans des copies.
5. **Fiche de notes** : recherche, export et statistiques calculées sur les notes réellement traitées, sans remplacer les cases vides par zéro.

Ce document est une comparaison vérifiée et un découpage de reprise. Aucune des fonctions listées comme manquantes n’est annoncée comme livrée. Aucun changement métier supplémentaire n’a été effectué pendant cette comparaison.

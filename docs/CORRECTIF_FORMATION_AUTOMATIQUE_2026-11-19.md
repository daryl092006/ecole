# Formation affichée et proposition automatique

La première connexion choisissait la première inscription de l'étudiant sans filtrer l'année. Une inscription 2025–2026 en Master 1 pouvait donc masquer la réinscription 2026–2027 en Master 2 et provoquer un signalement alors que le dossier courant était correct. La lecture utilise désormais l'année de travail, indépendamment d'une ancienne année sélectionnée dans le navigateur.

Le formulaire de traitement excluait également systématiquement la formation actuelle. Il reconnaît maintenant les demandes dont le texte correspond exactement à une formation du même site et de l'année ouverte, après normalisation des accents, de la ponctuation, de l'ordre des mots et des abréviations M1/M2/L1/L2/L3. Une correspondance multiple, un texte négatif ou une demande libre non reconnue ne déclenche aucune proposition automatique.

Une correspondance unique préremplit la formation et, si unique, son groupe. Si la formation est déjà celle de l'inscription, le formulaire conserve le groupe actuel et propose une vérification motivée via ReviewedForm. La confirmation résout la demande et ajoute un message audité dans une transaction avec contrôle de révision, sans changer l'inscription, les groupes, les notes ou les finances. Le serveur recalcule la correspondance et vérifie les droits, l'auteur de la demande et l'année. La correction effective vers une autre formation conserve son parcours transactionnel existant.

Aucune nouvelle migration et aucune clôture automatique de demandes existantes ne sont nécessaires. La confirmation du responsable reste obligatoire.

Tests de régression : ancienne inscription en premier, année historique dans l'en-tête, trois formulations observées du Master 2 Finance Digitale, correspondance ambiguë ou négative refusée, résolution conforme sans mutation scolaire ou financière, droits et révision, formulaire et récapitulatif sur mobile et ordinateur.

Validation : TypeScript sans incrémental, ESLint et `npm test` réussis ; 15 tests de première connexion réussis ; quatre tests serveur de corrections et les parcours de correction effective et de support à 390/1440 px réussis. Les deux nouveaux parcours de vérification conforme à 390/1440 px passent après correction du sélecteur du champ prérempli dans le test et sélection explicite du rôle scolarité dans la fixture.

Audit responsive global : 17 tests sur 17 réussis sur la compilation de production locale (62 écrans à huit largeurs, neuf variantes de transitions), sans échec ni nouvelle correction de styles. Le chemin de types ajouté automatiquement par Next.js dans tsconfig.json a été retiré.

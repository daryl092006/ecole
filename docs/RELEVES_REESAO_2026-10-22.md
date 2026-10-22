# Codes REESAO et relevés A4 — 22 octobre 2026

## Création d’une matière

Dans **Académique → Filières et programmes → Matières → Ajouter une matière**, renseigner le nom, l’année, le sigle disciplinaire de trois lettres, le semestre du programme, les crédits et le coefficient. Le programme doit être en brouillon et son niveau doit être rattaché à un cycle Licence, Master ou Doctorat identifié.

Le code affiché est calculé automatiquement : `ECN2101` désigne la discipline ECN, le cycle Master (2), le semestre 1 et le numéro 01. Le semestre est calculé dans le cycle à partir de l’ordre du niveau et de la position 1 ou 2 du semestre dans ce niveau. La discipline est renseignée explicitement ; elle n’est pas devinée depuis le nom.

Chaque nouvelle matière constitue une UE à elle seule, conformément à la décision utilisateur. La matière, l’UE et le composant du programme portent le même code et sont enregistrés par une seule transaction existante. Le serveur recalcule le code, vérifie le contexte annuel et refuse une proposition périmée. Les codes déjà attribués, même archivés, restent réservés. Les anciennes matières et les reprises historiques conservent leurs codes.

Référence : [guide REESAO, partie IV, page imprimée 126](https://www.reesao.org/wp-content/uploads/2023/10/REESAO-HARMONISATION-SCIENCES-TECHNOLOGIES.pdf). La convention UE est appliquée ici puisque chaque matière correspond à une UE ; aucun préfixe d’élément constitutif n’est ajouté.

## Impression d’un relevé enregistré

Dans **Documents établis**, ouvrir le détail d’un document de nature `RELEVE`, puis **Imprimer le relevé · A4, une page**. Le bouton est monté dans l’écran connecté utilisé par les documents étudiants et les délibérations, avec les filtres existants de dossier, de rôle et d’année.

Le modèle reprend fidèlement `/Users/gdenis/Downloads/Master FD.docx` : en-tête encadré en deux colonnes avec le nom actualisé du ministère (**MINISTÈRE DE L’ÉDUCATION NATIONALE / MINISTÈRE DÉLÉGUÉ CHARGÉ DE L’ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE** et **REPUBLIQUE TOGOLAISE / Travail – Liberté – Patrie** en Book Antiqua), filigrane ESCEN, logo vertical extrait du Word (`public/logo-escen-releve.png`), agrément centré, bandeau encadré titre/année centré (**RELEVE DE NOTES** / **Année académique**), identité à gauche et formation à droite, côte à côte et alignées en haut selon la demande utilisateur, tableau de cinq colonnes aux proportions du modèle (**CODES**, **UNITE D’ENSEIGNEMENT(UE)**, **CREDITS**, **NOTE/20**, **VALIDEE**), regroupement par semestre avec bandeaux gris, crédits, synthèse et signature. Les noms des enseignements sont en italique.

Les polices Book Antiqua sont extraites du document fourni et servies dans `public/fonts/transcript/`. Le titre et la formation utilisent ces polices, tandis que les autres blocs utilisent Times New Roman comme les runs du Word. Les dimensions de référence du rendu rempli sont reprises : en-tête 151 mm, bandeau titre/année 120 mm, identité 51 mm, tableau 145 mm à 102 mm sous le début de l’en-tête. La signature garde son cadre et sa ligne date/directeur ; son espace vide est ajusté afin de respecter l’exigence d’une seule page.

La hauteur du contenu est mesurée après chargement des styles, du logo et des polices ; l’ensemble est ajusté à la zone imprimable d’une page A4 sans supprimer de ligne. Les documents très longs sont réduits davantage.

L’impression utilise exclusivement `generated_documents.content_snapshot`, avec `decision_id`, `reference` et `issued_at`. Le contrat de contenu figé est défini par `transcriptDocumentSchema` dans `src/services/transcriptDocumentService.ts` :

- `institution` : nom, agrément et ligne de contact facultatifs ; la ligne de contact n’est affichée que si elle est enregistrée dans le document ;
- `student` : nom, matricule, date et lieu de naissance facultatifs ;
- `academicYear`, `level`, `program` ;
- `semesters[]` : nom, `rows[]` (code, nom, crédits, note ou null, validation ou null), total et crédits acquis ;
- totaux généraux, moyenne ou null, mention enregistrée ou null ;
- ville et nom du signataire facultatif.

Une donnée absente ne devient jamais zéro. Aucun nom de directeur ni date de signature du document modèle n’est recopié sur un relevé réel. Les codes en double bloquent l’impression.

**Limite :** ce changement ne crée pas de délibération et n’active pas un circuit d’émission de nouveaux documents officiels. Le schéma existant autorise des snapshots incomplets, par exemple `{ "average": 14 }` ; ils sont refusés avec un message explicite. Ils ne sont pas reconstruits à partir de notes courantes qui pourraient avoir changé depuis la décision du jury. Le producteur de nouveaux relevés devra enregistrer le contenu complet selon le contrat ci-dessus.

## Validation

- TypeScript : `npx tsc --noEmit --incremental false`.
- ESLint : aucune erreur ; deux avertissements préexistants.
- `npm test` : assertions des services et 182 groupes de contrôles PostgreSQL locaux, dont création REESAO via l’API réelle et rollback d’une erreur sur le dernier élément de la transaction.
- Playwright : six tests catalogue et sept tests de contexte de dossier ; six tests REESAO/relevés (formulaire, deux PDF, refus d’un contenu incomplet, déclenchement du bouton connecté et comparaison avec les treize matières du Word). Les tests PDF vérifient aussi l’emplacement du bandeau titre/année, de la formation à droite, de l’identité à gauche alignée en haut sur la formation et du tableau après ces blocs. Le cas Master FD contrôle les ratios de dimensions ci-dessus et l’utilisation de Book Antiqua.
- Configuration : `tests/ui/resao-transcripts.config.ts`, artefacts sous `test-results/resao-transcripts/` ; exemples et capture sous `tmp/screenshots/transcripts/`.
- Comparaison avec le Word : `tmp/screenshots/transcripts/releve-master-fd.pdf`, capture du PDF complet `releve-master-fd-page-a4.png` et copie Word de recette dans `model-source/master-fd-rempli.docx`. Cette copie et ses notes sont des données de test, jamais des relevés étudiants émis.

Aucune migration créée, aucune modification des migrations existantes et aucune application distante.

## Largeur validée du relevé

Le relevé utilise les 190 mm disponibles d’une page A4 entre des marges latérales de 10 mm. L’en-tête, le bandeau titre/année et le tableau occupent cette même largeur. L’identité à gauche et la formation à droite occupent deux colonnes égales séparées de 6 mm, alignées en haut et sur les bords extérieurs du document. La synthèse et le cadre de signature utilisent également toute la largeur disponible. Si un document très long doit être réduit pour tenir sur une page, le contenu réduit reste centré horizontalement. Ces choix remplacent les largeurs et décalages fixes cités plus haut.


## Données réelles et date du relevé

L’impression recharge le document enregistré par `GET /api/transcripts/[id]` avec la session réelle, le rôle sélectionné et l’année consultée. La route exige `grade.view`, applique le filtre annuel avant le filtre de rôle pour préserver les relations nécessaires aux comptes étudiants, puis ne retourne que le contenu imprimable du document autorisé. Les essais couvrent un autre étudiant, une autre année et un compte sans permission.

Les champs affichés viennent du contenu figé du relevé : identité, matricule, naissance, formation, année, semestres, codes et noms des matières, crédits, notes, validation, totaux, moyenne, mention, ville, signataire et coordonnées. La référence et la date d’émission sont lues sur le document enregistré. La date est formatée dans le fuseau Africa/Lome ; une réimpression conserve la date d’émission d’origine. Le titre du signataire peut être fourni dans `signatoryTitle`.

Les dates invalides bloquent l’impression. Une note absente reste distincte de zéro. Les coordonnées du Word ne sont plus utilisées en remplacement des coordonnées absentes : la ligne de contact est affichée seulement si elle est enregistrée dans le document. Les noms, notes et dates des aperçus de recette restent des données de test ; la date des nouveaux aperçus est prise au moment de leur génération.

Ce branchement relit des relevés déjà établis. Il ne crée pas de décision de jury, ne recalcule pas les résultats historiques et n’active pas un circuit d’émission de nouveaux documents officiels.

## Vérification de reprise du 22 octobre 2026

La suite `resao-transcripts.config.ts` cible désormais le parcours guidé actuel (`course-programs.spec.ts`), le contexte des dossiers et les relevés : 18 tests passent, dont les PDF à 14, 40 et 60 matières et la comparaison Master FD. TypeScript passe sans erreur, ESLint sans erreur avec deux avertissements préexistants, et `npm test` avec 183 groupes PostgreSQL locaux.

L’essai initial a également révélé six tests historiques de `curriculum-catalog.spec.ts` devenus incompatibles avec le dernier parcours : ils cherchent le sélecteur « Rubrique » supprimé de cet écran. Ils restent dans le dépôt et nécessitent une adaptation distincte ; ils ne font plus partie de cette suite ciblée. Les contrôles SQL des crédits, pondérations, archivages et maquettes approuvées continuent de passer dans `npm test`.

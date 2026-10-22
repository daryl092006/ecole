# Codes REESAO et relevés A4 — 22 octobre 2026

## Création d’une matière

Dans **Académique → Filières et programmes → Matières → Ajouter une matière**, renseigner le nom, l’année, le sigle disciplinaire de trois lettres, le semestre du programme, les crédits et le coefficient. Le programme doit être en brouillon et son niveau doit être rattaché à un cycle Licence, Master ou Doctorat identifié.

Le code affiché est calculé automatiquement : `ECN2101` désigne la discipline ECN, le cycle Master (2), le semestre 1 et le numéro 01. Le semestre est calculé dans le cycle à partir de l’ordre du niveau et de la position 1 ou 2 du semestre dans ce niveau. La discipline est renseignée explicitement ; elle n’est pas devinée depuis le nom.

Chaque nouvelle matière constitue une UE à elle seule, conformément à la décision utilisateur. La matière, l’UE et le composant du programme portent le même code et sont enregistrés par une seule transaction existante. Le serveur recalcule le code, vérifie le contexte annuel et refuse une proposition périmée. Les codes déjà attribués, même archivés, restent réservés. Les anciennes matières et les reprises historiques conservent leurs codes.

Référence : [guide REESAO, partie IV, page imprimée 126](https://www.reesao.org/wp-content/uploads/2023/10/REESAO-HARMONISATION-SCIENCES-TECHNOLOGIES.pdf). La convention UE est appliquée ici puisque chaque matière correspond à une UE ; aucun préfixe d’élément constitutif n’est ajouté.

## Impression d’un relevé enregistré

Dans **Documents établis**, ouvrir le détail d’un document de nature `RELEVE`, puis **Imprimer le relevé · A4, une page**. Le bouton est monté dans l’écran connecté utilisé par les documents étudiants et les délibérations, avec les filtres existants de dossier, de rôle et d’année.

Le modèle reprend `/Users/gdenis/Downloads/Master FD.docx` : en-tête institutionnel, identité, tableau de cinq colonnes, regroupement par semestre, crédits, synthèse et signature. Le tableau porte l’intitulé **UNITÉ D’ENSEIGNEMENT (UE)**. La hauteur du contenu est mesurée après chargement des styles, du logo et des polices ; l’ensemble est ajusté à la zone imprimable d’une page A4 sans supprimer de ligne. Les documents très longs sont réduits davantage.

L’impression utilise exclusivement `generated_documents.content_snapshot`, avec `decision_id`, `reference` et `issued_at`. Le contrat de contenu figé est défini par `transcriptDocumentSchema` dans `src/services/transcriptDocumentService.ts` :

- `institution` : nom et agrément facultatif ;
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
- Playwright : six tests catalogue et sept tests de contexte de dossier ; cinq tests REESAO/relevés (formulaire, deux PDF, refus d’un contenu incomplet et déclenchement du bouton connecté).
- Configuration : `tests/ui/resao-transcripts.config.ts`, artefacts sous `test-results/resao-transcripts/` ; exemples et capture sous `tmp/screenshots/transcripts/`.

Aucune migration créée, aucune modification des migrations existantes et aucune application distante.

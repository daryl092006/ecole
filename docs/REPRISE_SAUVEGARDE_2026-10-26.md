# Sauvegarde du 26 octobre 2026 : contrôle préalable à la reprise opérationnelle

## Consigne et état

L’utilisateur demande de reprendre les données réelles de l’ancienne solution dans
les tables métier actives. Une conservation en archives ne vaut pas une reprise.
Cette consigne s’applique aux nouveaux dossiers comme aux données déjà présentes
dans les sauvegardes précédentes mais encore absentes des tables métier.

**État de cette étape : audit réalisé, aucune insertion distante, aucune migration
créée ou appliquée.** Les décisions de rattachement ci-dessous restent nécessaires.

## Sources et contrôles

- Source : `/Users/gdenis/Downloads/sauvegarde-complete-2026-10-26_14-12-21.zip`.
- Le dossier décompressé contient `database.sql` ; le ZIP contient également les
  fichiers de stockage. Le ZIP complet est donc la source de l’inventaire.
- SQL : SHA-256 `114b1f29f40f94b58d791db4667c5523c5f18ee9253bc86d53bf558ac46c4524`.
- 140 tables, 16 107 lignes SQL ; intégrité CRC des membres ZIP vérifiée.
- 155 fichiers de stockage, 89 052 870 octets ; empreinte SHA-256 par fichier.
- Comparaison avec `sauvegarde-complete-2026-10-14_11-41-02.zip` : son empreinte
  SQL correspond exactement au manifeste du lot déjà importé.
- Baseline SQL : `54be08b9ee337fe810fb2ef8baabc9c2c714ddd4a01c23ba4fa45cbb04b5affc`.
- Écart : 541 lignes nouvelles, 28 lignes modifiées, aucune ligne absente, sur
  28 tables. Ces nombres incluent journaux, notifications et jetons techniques.
- Lecture réelle du snapshot Supabase : révision 17 ; lecture des 3 500
  correspondances de provenance et du lot source existant. Le nouveau lot n’y
  figure pas. Les domaines du site, exclus du snapshot général, ont été comptés
  séparément en SQL, en lecture seule.
- Le lien de l’ancienne page `/sauvegardes/liste` n’a pas pu être consulté par
  l’outil web. Aucune preuve de fonctionnement de cette page n’est déduite du ZIP.

Les originaux, les migrations, les outils historiques et les fichiers protégés
de `.tmp/` n’ont pas été modifiés. Les données nominatives de travail sont dans
`/private/tmp/escen-backup-review-20261026/`, répertoire 0700, fichiers 0600.
Les exports source de travail masquent les mots de passe et jetons.

## Écarts métier principaux

| Domaine | Base actuelle vérifiée | Sauvegarde du 26 octobre |
| --- | --- | --- |
| Étudiants | 145 | 146 ; une nouvelle identité sans email identique dans les personnes actuelles |
| Inscriptions | 143 | 146 rattachements source : 143 en 2025-2026, 3 en 2026-2027 |
| Versements | 62 | 63 : un paiement validé supplémentaire de 480 000 FCFA |
| Encaissé validé | 49 300 000 FCFA | 49 780 000 FCFA |
| Versements en attente | 325 000 FCFA | 325 000 FCFA ; à exclure de l’encaissé |
| Échéances | 576 | 576 ; quatre soldes augmentent chacun de 120 000 FCFA |
| Notes | 521 | 662 lignes source, dont 22 nouvelles |
| Personnel source | 30 utilisateurs déjà rapprochés | 31 utilisateurs ; une nouvelle identité sans email identique dans les personnes actuelles |
| Candidatures | 1 dossier dans la table active `online_applications` | 93 dossiers source ; 5 nouveaux et 10 modifiés depuis le précédent lot |
| Documents | Pas de `student_documents` ni d’`application_documents` dans les lectures actuelles | 160 lignes source ; 16 nouvelles et 5 changements de propriétaire |

Autres nouveautés : 13 tarifs (3 pour 2025-2026, 10 pour 2026-2027), 2 matières,
2 unités de valeur, 4 entrées de planning, 2 affectations utilisateur–unité de
valeur, 3 tuteurs, 3 responsables de frais, 19 prospects et 5 contacts.
Les associations, statuts et contenus doivent être conservés explicitement :
un simple écart de nombre n’est pas une correspondance d’identité.

## Incohérences qui empêchent une reprise aveugle

### Quatre inscriptions et leurs groupes

| Rattachement source | Année de l’inscription | Groupe source | Année du groupe |
| --- | --- | --- | --- |
| 1493 | 2025-2026 | 51, L1 IA | 2026-2027 |
| 1616 | 2026-2027 | 1, L1 TRONC COMMUN | 2025-2026 |
| 1617 | 2026-2027 | 1, L1 TRONC COMMUN | 2025-2026 |
| 1618 | 2026-2027 | 2, L2 TRONC COMMUN | 2025-2026 |

Le rattachement 1493 existait auparavant avec le groupe 1. Son changement vers
le groupe 51 ne change pas son année source. Il concerne aussi le dossier portant
le nouveau paiement : rejouer simplement l’ancien import ferait perdre la
correspondance de son inscription, de son contrat et du versement.

Proposition soumise à l’utilisateur : préserver l’inscription opérationnelle
existante, ne pas déplacer ses anciennes notes, et traiter séparément les quatre
rattachements après confirmation des années et groupes exacts. Aucune création
de groupe ni correction d’année ne doit être déduite du seul nom de groupe.

La question initiale comptait trois cas ; le contrôle exhaustif en identifie
quatre. La rectification a été communiquée immédiatement.

### Années

La source conserve 2025-2026 comme année active. La date de début de 2026-2027
passe du 12 au 19 octobre 2026 ; la base actuelle conserve le 12 octobre.
Une nouvelle ligne d’année nommée « Master » porte les dates du 9 novembre 2026
au 8 juillet 2027. Son sens doit être confirmé : ne pas la convertir implicitement
en cycle, en année 2026-2027 ou en nouvelle année de travail.

### Notes et évaluations publiées

Les 22 nouvelles notes ont un contexte source cohérent et concernent l’évaluation
source 92. Leurs évaluations cibles sont déjà `PUBLIEES`. Les protections SQL
existantes refusent de compléter directement leurs listes de candidats et notes.
La reprise nécessite un mécanisme spécifique contrôlé et audité ; ne pas désactiver
les triggers ni dépublier artificiellement les évaluations pour contourner ce verrou.

Sur les 662 notes source, 541 ont un contexte source cohérent ; 71 ont une
évaluation absente, 40 une inscription absente ou ambiguë, 10 un groupe ou une
matière incohérent. Cette analyse de relations n’est pas un plan d’insertion :
les notes déjà reprises sont à rapprocher par provenance et à préserver.
La modification de groupe rend désormais incohérents des rattachements source
qui étaient utilisables auparavant ; elle ne justifie aucune suppression en base.

### Pièces jointes

Après normalisation des chemins et des valeurs JSON de chemins, 140 des
175 références vérifiées correspondent exactement à un membre du ZIP ; 35
n’ont pas de membre correspondant : 20 références de documents, 3 images
d’étudiants, 5 fichiers/images du personnel et 7 images d’articles.
Ce contrôle couvre les champs de documents, personnes, paiements et articles
inventoriés ; il ne certifie pas tous les chemins éventuellement embarqués dans
les contenus HTML ou d’autres champs de configuration.

Le ZIP ne contient que `storage/configuration` et `storage/documents` en plus
du SQL. Les chemins absents ne doivent pas être associés à un autre fichier
par ressemblance de nom. Les propriétaires modifiés de cinq documents doivent
être réconciliés avant rattachement. Les originaux présents restent exploitables.

## Plan de reprise proposé

1. **Rapprochement des identités et référentiels** : réutiliser les identifiants
   opérationnels déjà liés à la source ; préparer les nouvelles personnes et
   les références manquantes. Ne réactiver aucun compte retiré ni reproduire
   automatiquement les anciens rôles et permissions. Séparer personnes et
   provisionnement Auth ; ne pas réimporter les sessions ou jetons.
2. **Scolarité et finances** : résoudre les quatre rattachements, préserver les
   inscriptions et contrats existants, reprendre le versement de 480 000 FCFA
   avec ses quatre échéances sans double comptage. Conserver l’année exacte,
   les statuts et les montants ; ne pas recréer les 62 versements existants.
3. **Pédagogie** : préparer les matières et affectations documentées, puis le
   mécanisme de complément des notes publiées. Présenter tout SQL de migration
   avant création conformément à AGENTS.md. Tester atomicité, refus des
   incohérences, conservation des publications et absence de double insertion.
4. **Dossiers et pièces** : reprendre les candidatures, tuteurs, responsables de
   frais et fichiers dans leurs domaines métier. Les 20 candidatures marquées
   admises dans la source ne doivent pas redevenir de simples dossiers reçus ;
   le modèle actuel de suivi ne représente pas directement cette admission.
   Préparer la correspondance de statuts avant insertion, sans inventer de
   conversion ou de compte. Documenter les fichiers réellement absents.
5. **Contrôle final** : recette PostgreSQL locale du lot sur l’état actuel,
   relecture des effets par table, totaux financiers et notes, application
   transactionnelle autorisée puis vérification des écrans avec leurs rôles
   et années. Une provenance technique peut accompagner les lignes actives ;
   elle ne remplace jamais leur disponibilité dans les parcours métier.

L’ancien script `import-canonical-2025.mjs` ne doit pas être relancé tel quel :
il est lié au lot du 14 octobre, à l’année 2025-2026, aux anciens nombres attendus
et à un marqueur empêchant sa seconde application. Changer uniquement le nom
du ZIP ou l’empreinte ferait perdre la stabilité des identifiants calculés.

## Vérifications de cette étape

- Lecture du ZIP et comparaison de l’intégralité des tables source.
- Lecture distante uniquement, snapshot révision 17 et index de provenance.
- Simulation de construction du différentiel canonique avec les identifiants
  stables du lot précédent ; aucun SQL de ce différentiel exécuté.
- `npx tsc --noEmit --incremental false` : réussi.
- `npm run lint` : réussi, aucune erreur ni avertissement affiché.
- `npm test` : réussi, workflows, 185 groupes PostgreSQL et 10 contrôles de
  régularisation enseignants.
- Aucun changement d’interface : aucune nouvelle recette Playwright nécessaire
  pour ce rapport. Ces contrôles ne valident pas un import encore non effectué.

À poursuivre après clarification métier des rattachements. AGENTS.md, section
« Travail et points d’arrêt » : « Avant une règle métier indécise […] présenter
la proposition et attendre l’accord. » Cette règle concerne ici le choix de
l’année et du groupe, pas la consigne déjà donnée de reprendre les données en actif.

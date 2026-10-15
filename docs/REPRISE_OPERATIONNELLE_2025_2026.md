# Données opérationnelles de 2025-2026

La migration 29 et `scripts/import-canonical-2025.mjs` reprennent les données du lot vérifié dans les tables métier normales. Les dossiers utilisent leurs inscriptions, contrats, paiements et notes courants. La provenance reste technique ; elle ne remplace pas les données métier par une vue d’archives.

## Résultat attendu

- 143 inscriptions, appartenances aux groupes, contrats et échéanciers (576 échéances).
- 13 groupes, 25 offres annuelles, 25 matières, 7 tarifs de scolarité et un tarif d’inscription.
- 62 paiements : 60 validés pour 49 300 000 XOF, 2 en attente pour 325 000 XOF. Les paiements en attente ne comptent pas dans le montant payé.
- 521 notes, rattachées aux étudiants et formations exacts. Les 33 évaluations source deviennent 82 évaluations par formation pour respecter les périmètres d’accès ; leurs états de publication et de suppression sont conservés.
- 119 notes non insérées : 111 sans parent disponible et 8 avec un groupe ou une matière incohérents. Les lignes originales restent conservées avec un diagnostic.

Les 42 inscriptions sans filière dans la source conservent cette information manquante. Aucune filière, date d’inscription, validation financière ou identité de payeur n’est inventée. Les contrats repris sont en cours, avec leurs montants d’origine, sans prétendre à une approbation réalisée dans la nouvelle plateforme. Le tarif d’inscription commun provient du paramètre global de l’année active source ; il ne génère aucune charge supplémentaire dans les contrats existants. Les tarifs et offres conservent les variantes Présentiel / En ligne.

## Exécution et contrôles

`node scripts/import-canonical-2025.mjs --refresh-index` lit les correspondances distantes et vérifie le compte importateur. Sans `--apply`, aucun enregistrement distant n’est créé. Le script vérifie l’empreinte du fichier source, produit un plan privé sous `.tmp/legacy-database/`, puis rejoue toutes les migrations et l’intégralité de la reprise dans PostgreSQL local (PGlite).

Après validation, `node scripts/import-canonical-2025.mjs --apply` effectue une transaction unique, auditée et protégée contre une seconde insertion. Les identifiants sont déterministes, les correspondances sont exactes, et les originaux ne sont pas modifiés. Les données déjà créées dans l’application ne sont pas remplacées. Les états publiés sont restaurés à partir de leur preuve source ; les corrections ultérieures restent soumises aux règles ordinaires.

La migration 28 retire les sites et bâtiments des prérequis. Les écrans de gestion ne les proposent plus. Les colonnes historiques et les restrictions des rôles déjà limités à un site sont conservées afin de ne pas élargir leurs droits.

## Vérification après application, 15 octobre 2026

Les migrations 28 et 29 et la transaction de reprise sont appliquées au projet lié. La filière IA-GL déjà saisie a été réutilisée après correspondance exacte du code et du nom, sans remplacer ses attributs : quatre nouvelles filières ont été ajoutées. Les 15 566 lignes source sont intactes. Les contrôles distants confirment 143 inscriptions, 521 notes et les totaux des paiements ; toutes les tables restent sous RLS et les RPC refusent les accès anonymes.

La lecture réelle par le service de la plateforme confirme 143 situations financières disponibles, et le filtre 2025-2026 conserve les notes, évaluations, paiements et échéances attendus. La préparation affiche désormais 4 étapes sur 6 prêtes. La couverture complète des programmes de cours et des tarifs par formation reste à compléter avec les informations institutionnelles manquantes ; elle n’est pas déclarée prête artificiellement.

Validation : lint, build, tests de services et 43 groupes de contrôles PostgreSQL réussis ; 45 tests navigateur réussis au total sur la préparation annuelle, les opérations étudiantes, la clarté des parcours, les CRUD, les tarifs et le contexte des documents.

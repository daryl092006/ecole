# Interconnexion du site : état réellement vérifié le 22 octobre 2026

## Conclusion

L’interconnexion existe sur la copie locale, avec une API commune pour les candidatures, formations, articles et brochures. Elle reste partielle : ni le déploiement en ligne ni le parcours complet d’admission et de création des comptes ne sont validés par cette recette.

## Constats directs

- Le portail local `http://127.0.0.1:3000` répond. Au début de la revue, aucun serveur de site ne répondait sur le port 3200. Le site a été démarré puis reconstruit depuis ses sources actuelles ; il est accessible sur `http://localhost:3200`.
- Le fichier `../escen-website/config.ts` pointe sur `http://127.0.0.1:3000/api/website`, y compris sa valeur nommée `app_prod_url`. Cette configuration locale ne convient pas à un site publié : le navigateur du visiteur chercherait le portail sur sa propre machine.
- Les lectures HTTP réelles renvoient l’année de travail **2025-2026**, six niveaux, sept articles publics et neuf brochures. La revue n’a changé aucune année ni campagne.
- Un téléchargement réel de brochure répond HTTP 200, avec `application/pdf` et la signature `%PDF-`. Les réponses publiques portent l’autorisation CORS pour `http://localhost:3200`.
- Les écritures de recette navigateur sont simulées. Aucun dossier de test, article ou PDF n’a été créé dans la base distante. Les lectures réelles ne constituent pas une preuve de réception de bout en bout d’un nouveau dossier en production.

## État des parcours

| Parcours | État et limite |
| --- | --- |
| Niveaux, filières et pièces de l’année | API et formulaire branchés ; année de travail actuelle exposée au public |
| Candidature en quatre étapes | Formulaire, sauvegarde/reprise et soumission reliés ; parcours navigateur testé avec API isolées |
| Réception et suivi dans le portail | Écrans connectés ; reçu/en analyse/classé restent un suivi interne |
| Admission → inscription annuelle → compte étudiant | Non disponible comme parcours complet depuis la candidature ; aucune création automatique déduite d’un simple dépôt |
| Articles publiés | Lecture réelle vérifiée ; publication et retrait testés avec API isolées |
| Brochures publiées et PDF | Catalogue et téléchargement réels vérifiés ; correction du choix du bon cycle détaillée ci-dessous |
| Connexion au portail | Le lien principal du site rejoint `/connexion` du portail ; aller-retour testé |
| Anciennes pages `/candidat/*` | Toujours présentes dans le site ; elles appellent des chemins tels que `/me-connecter` et `/mon-dossier`, absents de l’API d’échange actuelle |
| Commentaires et newsletter | Actions encore présentes dans le site ; endpoints correspondants non implémentés par le portail |
| Galerie | Store utilisant Axios directement sur des chemins relatifs `/public/galeries` ; hors de l’échange actuel |

## Défauts corrigés pendant cette revue

### Pièces indisponibles présentées comme une absence de pièces

Un échec HTTP du chargement des exigences documentaires laissait une liste vide et permettait de continuer. Le défaut a été reproduit dans le navigateur avant correction.

Le formulaire présente maintenant une erreur avec reprise et bloque la progression pendant le chargement ou l’échec. Les réponses documentaires périmées sont ignorées après une nouvelle requête. Le candidat peut toujours revenir aux étapes précédentes. Aucune liste fictive de pièces n’est inventée.

La correction est versionnée dans `scripts/website-registration-resilience.mjs`, appelée par l’adaptateur. `scripts/repair-website-registration.mjs` permet son application ciblée au formulaire existant sans régénérer les autres fichiers du site.

### Brochure choisie dans un autre cycle

Le composant du site utilisait la ressemblance des titres ou du nom de filière. Avec le catalogue réel et la page « Master Professionnel en Finance Digitale », cet algorithme sélectionnait « Executive Master en Finance Digitale ».

La sélection utilise maintenant les associations explicites des pages avec le cycle et le code canonique de filière : par exemple `MASTER` + `FD`. Le PDF ne devient un choix direct que si une seule brochure correspond exactement. Sinon, le catalogue reste proposé au choix de l’utilisateur. Aucun rapprochement approximatif de noms ne décide du document.

Le correctif est versionné dans `scripts/website-brochure-selection.mjs`, dans le template de la fenêtre et dans le script d’application ciblée `scripts/repair-website-brochures.mjs`. La présentation préexistante du composant a été conservée.

### Écart entre les sources du site et le build servi

Les premiers tests utilisaient un ancien build de la copie. Le composant de brochures présent dans les sources différait de ce build et du template du portail. La reconstruction a révélé cet écart. Le template est maintenant aligné sur le composant préexistant corrigé, afin qu’une régénération n’efface pas ces changements.

Les tests de téléchargement ciblent la brochure par son article et isolent aussi la requête d’une nouvelle fenêtre. Les captures de cette recette sont dirigées vers `tmp/screenshots/website-review/`, distinct des données de staging.

## Reste à traiter avant de déclarer l’interconnexion complète

1. Définir et configurer les origines HTTPS réelles du site et du portail, puis vérifier CORS et les liens sur l’hébergement cible.
2. Unifier les accès personnels : les anciennes pages candidat ne doivent pas rester des parcours qui appellent des API absentes. Le devenir d’un espace candidat distinct doit être décidé explicitement.
3. Définir le circuit métier de réception, décision d’admission, création du dossier étudiant, inscription, compte et notification ; implémenter ses étapes avec droits, confirmation et audit. La réception seule ne vaut pas admission.
4. Raccorder les services publics supplémentaires nécessaires, ou faire approuver leur retrait des parcours visibles.
5. Recetter les parcours avec les véritables rôles et périmètres, les pièces privées, les échecs réseau et le changement d’année, avant toute publication.

Les documents normatifs antérieurs et les migrations n’ont pas été modifiés. Les contrôles PostgreSQL locaux réussissent (182 groupes). Aucun déploiement ni changement de configuration distante n’a été effectué.

## Résultats de la recette finale

- 38 tests navigateur réussis à 390 et 1440 px, comprenant les trois cycles de brochures Finance Digitale et la reprise du chargement des pièces.
- TypeScript : aucune erreur ; ESLint : aucune erreur, deux avertissements préexistants.
- Build Nuxt de la copie : réussite ; ses avertissements existants ne sont pas assimilés à une validation de mise en production.
- `npm test` : réussite, dont 182 groupes PostgreSQL locaux.
- Régénération de l’adaptateur dans un dossier temporaire : formulaire et composant de brochures identiques aux correctifs appliqués, à l’espacement de fin de ligne près.

Commande de recette : `npx playwright test --config tests/ui/website-review.config.ts`, avec le portail sur 3000 et la copie du site sur 3200. Les tests désignent explicitement les lectures HTTP réelles ; les autres scénarios utilisent des API isolées.

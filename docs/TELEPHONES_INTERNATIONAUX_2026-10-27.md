# Téléphones : choix d’un indicatif international

Le dossier étudiant affichait « Téléphone (+228) ». Les API d’identité acceptaient
déjà les autres indicatifs ; la seule expression limitée à `+228` restante était
dans la branche locale non authentifiée de `useAppState`. Le libellé et cette
restriction ont été retirés.

## Champ commun

`PhoneInput` propose un choix de pays/territoire et de code, puis le numéro.
Le champ est utilisé dans la création et la modification des dossiers étudiants,
le personnel, les fournisseurs du référentiel et le formulaire d’admission
existant lorsqu’il est proposé. Les rôles et capacités de ces parcours restent
inchangés.

- Le pays et l’indicatif sont choisis explicitement, sans déduction depuis la
  nationalité ou le pays d’adresse. Aucun `+228` n’est ajouté automatiquement.
- Un numéro déjà international est reconnu. Un collage commençant par `+` ou
  `00` conserve son propre indicatif, sans double préfixe.
- Pour les indicatifs partagés, un numéro existant ne suffit pas à attribuer un
  pays : par exemple `+1` reste « pays non précisé » jusqu’au choix utilisateur.
  Ce choix reste stable pendant la saisie.
- Les espaces et séparateurs usuels sont retirés lors de la composition d’un
  numéro international. Le préfixe national zéro est retiré seulement lorsque
  la métadonnée fournie est un zéro simple sans règle de parsing supplémentaire.
  Le zéro significatif italien et le préfixe `01` béninois sont conservés.
- Les anciennes valeurs locales, formatées ou non normalisées restent intactes
  lorsqu’on modifie un autre champ. Effacer le numéro produit une valeur vide,
  pas un indicatif isolé.
- Les numéros modifiés sont contrôlés sur leur syntaxe et la limite de 15 chiffres.
  Ce contrôle ne certifie ni l’attribution réelle du numéro ni l’ensemble des
  règles nationales de numérotation. Les API existantes ne sont pas durcies sur
  les données historiques.

Les données restent stockées dans les champs téléphone existants. Les écritures
gardent leur récapitulatif `ReviewedForm`, leurs API, leur audit et l’actualisation
du portail après succès. Aucun changement SQL, permission ou dépendance.

## Référentiel et licence

`src/data/phoneCallingCodes.json` contient 254 entrées du référentiel
[Google libphonenumber](https://github.com/google/libphonenumber/blob/8593ab70fa4fadffc042b2714034f4c52bef7daf/resources/PhoneNumberMetadata.xml),
révision `8593ab70fa4fadffc042b2714034f4c52bef7daf` : 245 pays/territoires et les
entrées de services internationaux. Les libellés français ont été produits avec
`Intl.DisplayNames` puis figés dans le fichier, pour un rendu client/serveur stable.
Les entrées conservent leurs codes de région et d’appel ; seules les métadonnées
de préfixe simple nécessaires au champ sont extraites. Le XML source a été lu en
dehors du dépôt ; aucune donnée utilisateur n’est envoyée à ce référentiel.

Source sous licence Apache 2.0 : voir
[la copie de la licence](licenses/libphonenumber-LICENSE.txt). La limite de longueur
est documentée par la recommandation
[UIT-T E.164 (02/2026)](https://www.itu.int/ITU-T/recommendations/rec.aspx?rec=16273).

## Vérifications

- Tests unitaires intégrés à `npm test` : indicatifs, liste sans doublons,
  préfixes nationaux, collage, numéros partagés, valeurs vides, locales et syntaxe.
- 19 tests Playwright réussis : étudiants à 360/390/768/1440 px, confirmation et
  persistance après rechargement, absence d’indicatif forcé sur une ancienne valeur,
  choix Canada/États-Unis non inventé, effacement et fournisseur avec `+233`.
  Les parcours existants personnel et admissions ont aussi été rejoués.
- Inspection visuelle du formulaire étudiant à 390 et 1440 px. Captures dans
  `tmp/screenshots/page-phone-input/` ; pas de débordement de fenêtre détecté.
- `npm test` : réussi, dont 186 groupes PostgreSQL et contrôles de reprise.
- TypeScript sans émission incrémentale et ESLint : réussis.

Aucun enregistrement réel, import, push ou déploiement.

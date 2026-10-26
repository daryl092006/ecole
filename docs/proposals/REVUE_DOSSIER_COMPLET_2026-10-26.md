# Revue des six onglets du dossier étudiant

## Périmètre et état

L’utilisateur n’approuve pas la présentation actuelle. Cette proposition porte sur l’ensemble du dossier ; elle n’est pas une autorisation de poursuivre les changements visibles.

Lecture du code et parcours successif des six onglets à 390, 820 et 1440 px sur des données locales représentatives. Aucun accès au compte réel ni aux données de production. Les captures ne représentent donc pas le dossier réel de Mawuegnon ABALO. La liste des pièces était vide dans ce jeu de capture ; les formulaires et les actions sur une pièce ont été examinés dans le code.

Captures haut/contenu et relevés des textes, champs, actions et colonnes : `tmp/screenshots/student-dossier-review/`.

## Défaut trouvé et corrigé

En passant de Finance à Notes puis Pièces, le bloc « Gestion des paiements » restait dans la page. Le panneau des opérations et le navigateur de données partageaient la même clé React `finance`. La clé du panneau des opérations est désormais distincte (`operations:finance`). Aucun parcours métier, droit ou règle de calcul n’a été changé.

La revue automatisée vérifie désormais l’absence du titre et du bouton d’encaissement dans chaque autre onglet, après des changements successifs d’onglet. Les trois parcours aux trois largeurs passent après cette correction.

## Ce qui reste lourd

Le résumé « Situation scolaire et financière » précède tous les onglets et répète inscription, paiements, assiduité et notes. Dans le jeu observé, il occupe environ 533 px à 390 px de largeur et 298 px à 820 px, avant même la navigation des onglets. Le contenu choisi se retrouve donc très bas dans la page.

| Onglet | Constat actuel | Contenu proposé |
| --- | --- | --- |
| Identité et contacts | Les coordonnées arrivent après tout le résumé scolaire et financier. | Coordonnées immédiatement sous un en-tête compact ; une action « Modifier les informations ». |
| Années et groupes | Deux blocs, l’un d’actions, l’autre de tableau, et inscription déjà répétée dans le résumé. | Un seul espace de scolarité : formation, niveau, groupe, statut et inscription ; changements de groupe/statut dans cet espace, selon les droits. Les autres années restent des lignes de parcours. |
| Assiduité et présences | Sélecteur « Consulter », recherche générique, export, inscription répétée dans chaque ligne, justificatifs à chercher dans une autre collection. | Liste de séances datées avec matière, présence/absence/retard et justificatif associé. Filtres utiles : période et état. Pas de nouvelle sélection de dossier. |
| Frais et versements | Sommes répétées, boutons de plusieurs historiques, puis sélection Versements/Reçus/Échéances/Annulations et nouvelle recherche « étudiant ou référence ». | Situation financière de ce dossier, échéances et versements lisibles ; reçu accessible sur le versement concerné. Encaisser comme action principale ; ajustements rattachés au paiement ou à la ligne de frais concernée, selon les droits. |
| Notes | Une synthèse par épreuve puis un second tableau générique de notes, avec corrections et états techniques dans un sélecteur. | Une seule liste matière/épreuve/note/état. Accès à la copie et à l’évaluation dans la même ligne, selon les droits. Les corrections sont consultables sur la note concernée. Aucun nouveau calcul de moyenne ou de passage. |
| Pièces du dossier | Recherche et actualisation même quand la liste est vide ; documents établis dans une autre vue ; formulaire qui réaffiche un choix d’étudiant alors que le dossier est connu. | Pièces reçues et documents établis dans un espace clair ; type, état et fichier. Étudiant déjà fixé dans le formulaire ; choix d’inscription seulement lorsqu’il est nécessaire. Pas de pièce « manquante » inventée si les exigences ne sont pas connues. |

## Proposition commune à valider

1. Garder un en-tête compact : nom, matricule, formation/groupe et année de consultation. Éviter le gros résumé transversal répété avant tous les contenus.
2. Rendre le contenu propre à l’onglet immédiatement visible. Chaque onglet présente un espace de travail cohérent ; éviter le découpage en plusieurs cartes de commandes et navigateurs techniques.
3. Garder les actions principales sur place ; présenter les opérations secondaires dans le contexte de l’élément concerné. Le simple remplacement d’un accordéon par un bouton de fenêtre ne constitue pas à lui seul une simplification.
4. Conserver confirmations, droits, audit, données historiques et valeurs inconnues. Aucune suppression de données ou activation de règle métier nouvelle.

La présentation proposée n’est pas appliquée dans cette étape. Seul le défaut de mélange des contenus entre onglets a été corrigé.

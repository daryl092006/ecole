# Groupes : rester dans la configuration après enregistrement

Lors de la préparation d’une année, enregistrer un groupe fermait la rubrique et renvoyait immédiatement au récapitulatif de préparation. La notification d’enregistrement était utilisée comme une instruction de navigation.

La création, la modification et la validation d’un groupe laissent désormais la liste des groupes ouverte. Le formulaire initial ne se rouvre pas automatiquement après la sauvegarde. La liste et les indicateurs de préparation sont actualisés ; la confirmation via ReviewedForm et refreshCampus restent inchangées. Le bouton explicite « Retourner à la préparation de l’année » ferme la rubrique, tout comme le bouton de retour et la fermeture du volet.

Les autres étapes conservent leur parcours. Aucune modification des API, permissions, migrations ou données réelles.

Validation : 27 tests Playwright de préparation annuelle réussis, dont les scénarios de groupes aux largeurs 390 et 1440 px : validation d’une proposition, modification, création d’un deuxième groupe, retour volontaire et nouvelle modification depuis la consultation. TypeScript et ESLint sans erreur ; deux avertissements ESLint préexistants.

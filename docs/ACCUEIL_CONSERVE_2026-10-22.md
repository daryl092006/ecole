# Accueil conservé — 22 octobre 2026

À la demande de l’utilisateur, retour à la présentation précédente : diaporama, présentation de l’école, valeurs, vision, témoignages, galerie et partenaires. La proposition de refonte éditoriale a été remplacée.

La structure est conservée dans `scripts/website-templates/home.vue`, appliquée par `scripts/website-homepage.mjs`. Elle possède une racine unique pour éviter une page vide lors des transitions Nuxt. Les améliorations déjà réalisées sont maintenues : deux actions stables dans le diaporama (formations et candidature), logo officiel, brochures reliées au catalogue du portail, métadonnées et navigation corrigées.

Aucune publication distante. Le site reste consultable sur http://localhost:3200/.

Validation : génération statique réussie ; interconnexion vérifiée sur 374 fichiers ; TypeScript sans erreur ; ESLint sans erreur (deux avertissements préexistants). Les 61 tests des parcours existants passent. Après correction du comptage des commandes du diaporama dans le nouveau test, les cinq tests de l’accueil passent également (360, 390, 768, 1024 et 1440 px).

<template>
  <main class="candidate-entry">
    <h1>Candidature à ESCEN</h1>
    <p>Informations personnelles, parents ou tuteurs, puis documents disponibles.</p>
    <p>Les pièces ne sont pas obligatoires pour envoyer votre demande.</p>
    <a :href="destination">Ouvrir le formulaire de candidature</a>
  </main>
</template>
<script setup>
const destination = __ESCEN_CANDIDATE_URL__
onMounted(() => window.location.replace(destination))
</script>
<style scoped>
.candidate-entry { max-width: 760px; margin: 80px auto; padding: 24px; line-height: 1.7; }
.candidate-entry a { display: inline-block; margin-top: 20px; padding: 12px 20px; background: #182333; color: white; border-radius: 8px; }
</style>

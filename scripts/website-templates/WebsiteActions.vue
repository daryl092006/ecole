<template>
  <nav v-if="inline" class="website-actions" aria-label="Préparer sa candidature">
    <NuxtLink to="/brochures">Télécharger une brochure</NuxtLink>
    <NuxtLink to="/inscription">Postuler en ligne</NuxtLink>
  </nav>
  <a v-else href="https://api.whatsapp.com/send?phone=22898012727" target="_blank" rel="noopener noreferrer" class="website-adviser" aria-label="Échanger avec ESCEN sur WhatsApp">WhatsApp · ESCEN</a>
</template>
<script setup>
defineProps({ inline: Boolean })
</script>
<style scoped>
.website-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 20px; }
.website-actions a { display: inline-block; padding: 10px 14px; color: white; text-decoration: underline; text-underline-offset: 4px; border-radius: 6px; }
.website-actions a:focus-visible, .website-adviser:focus-visible { outline: 3px solid #01b4d5; outline-offset: 4px; }
.website-adviser { position: fixed; bottom: 24px; left: 16px; z-index: 30; max-width: calc(100vw - 100px); padding: 12px 16px; color: white; background: #176c38; border-radius: 24px; font-size: 14px; font-weight: 600; box-shadow: 0 3px 12px #0002; }
@media (min-width: 1024px) { .website-actions { justify-content: flex-start; } }
</style>

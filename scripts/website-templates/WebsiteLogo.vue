<template>
  <img src="/logo-escen.png" width="3035" height="602"
    alt="ESCEN — École supérieure de commerce et d’économie numérique"
    class="website-logo" :class="[{ 'website-logo--light': light, 'website-logo--compact': compact }, `website-logo--${context}`]">
</template>
<script setup>
defineProps({ light: Boolean, compact: Boolean, context: { type: String, default: 'header' } })
</script>
<style scoped>
.website-logo { display: block; width: 220px; max-width: 100%; height: auto; object-fit: contain; }
.website-logo--light { filter: brightness(0) invert(1); }
.website-logo--compact { width: 180px; }
.website-logo--application { width: 320px; }
.website-logo--footer { width: 280px; }
.website-logo--application-mobile { width: 160px; }
@media (max-width: 768px) { .website-logo { width: 180px; } .website-logo--application { width: 220px; } .website-logo--application-mobile { width: 160px; } }
</style>

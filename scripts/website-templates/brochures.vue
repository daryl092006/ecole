<template>
  <main class="min-h-screen bg-gray-50 text-gray-900 px-6 py-24">
    <div class="max-w-3xl mx-auto"><h1 class="text-3xl font-bold">Brochures ESCEN</h1>
      <BrochureModal :is-open="true" inline />
    </div>
  </main>
</template>
<script setup>
useHead({ title: 'Brochures | ESCEN' })
</script>

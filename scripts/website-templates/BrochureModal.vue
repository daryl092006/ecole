<template>
  <div v-if="isOpen" :class="inline ? '' : 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4'" @click.self="!inline && $emit('close')">
    <section :role="inline ? undefined : 'dialog'" :aria-modal="inline ? undefined : true" :aria-labelledby="inline ? undefined : 'brochure-title'" :class="inline ? 'bg-white rounded-xl p-6 mt-6' : 'bg-white text-gray-900 rounded-xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto'">
      <div v-if="!inline" class="flex justify-between gap-4"><h2 id="brochure-title" class="text-xl font-bold">Brochures ESCEN</h2><button type="button" @click="$emit('close')">Fermer</button></div>
      <p v-if="loading" role="status" class="py-6">Chargement des brochures…</p>
      <div v-else-if="error" role="alert" class="py-6"><p>{{ error }}</p><button type="button" class="underline" @click="load">Réessayer</button></div>
      <p v-else-if="!brochures.length" class="py-6">Aucune brochure disponible actuellement.</p>
      <article v-for="brochure in brochures" :key="brochure.id" class="border-t py-4 mt-4">
        <h3 class="font-bold">{{ brochure.title }}</h3><p>{{ brochure.description }}</p>
        <a :href="`${base}/public/brochures/${brochure.slug}/download`" class="inline-block mt-3 underline">Télécharger le PDF — {{ brochure.title }}</a>
      </article>
    </section>
  </div>
</template>
<script setup>
import config from '../../config'
const props = defineProps({ isOpen: Boolean, brochureName: String, inline: Boolean })
defineEmits(['close', 'submit'])
const base = config.app_dev_url
const brochures = ref([])
const loading = ref(false)
const error = ref('')
let requestNumber = 0
async function load() {
  const current = ++requestNumber
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${base}/public/brochures`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Brochures indisponibles. Réessayez.')
    const rows = await response.json()
    if (current === requestNumber) brochures.value = rows
  } catch (cause) {
    if (current === requestNumber) error.value = cause.message || 'Chargement impossible.'
  } finally {
    if (current === requestNumber) loading.value = false
  }
}
watch(() => props.isOpen, value => { if (value) load(); else requestNumber++ }, { immediate: true })
</script>

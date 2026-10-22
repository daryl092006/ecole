<template>
  <div v-if="isOpen" :class="inline ? '' : 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4'" @click.self="!inline && $emit('close')">
    <section ref="dialog" tabindex="-1" @keydown="onKeydown" :role="inline ? undefined : 'dialog'" :aria-modal="inline ? undefined : true" :aria-labelledby="inline ? undefined : 'brochure-title'" :class="inline ? 'bg-white rounded-xl p-6 mt-6' : 'bg-white text-gray-900 rounded-xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto'">
      <div v-if="!inline" class="flex justify-between items-center gap-4 border-b pb-3 mb-4">
        <h2 id="brochure-title" class="text-xl font-bold">
          {{ specificBrochure ? specificBrochure.title : (brochureName || 'Brochures ESCEN') }}
        </h2>
        <button type="button" aria-label="Fermer les brochures" class="text-gray-500 hover:text-gray-800 text-lg font-semibold" @click="$emit('close')">✕</button>
      </div>
      <p v-if="loading" role="status" class="py-6 text-center text-gray-600">Chargement de la brochure…</p>
      <div v-else-if="error" role="alert" class="py-6"><p class="text-red-600 mb-2">{{ error }}</p><button type="button" class="underline text-blue-600" @click="load">Réessayer</button></div>
      <p v-else-if="!displayedBrochures.length" class="py-6 text-gray-500 text-center">{{ association ? 'Aucune brochure publiée pour cette formation actuellement.' : 'Aucune brochure disponible actuellement.' }}</p>

      <div v-else-if="specificBrochure" class="py-2">
        <p class="text-gray-600 mb-4">{{ specificBrochure.description || 'Découvrez le programme détaillé, les compétences clés et les débouchés professionnels de cette formation.' }}</p>
        <div class="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <svg class="w-8 h-8 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
          </svg>
          <div class="grow">
            <p class="font-bold text-gray-800">{{ specificBrochure.filename }}</p>
            <p class="text-xs text-gray-500">{{ (specificBrochure.byte_size / 1024 / 1024).toFixed(1) }} Mo · Document officiel ESCEN</p>
          </div>
        </div>
        <a :href="`${base}/public/brochures/${specificBrochure.slug}/download`" target="_blank" class="w-full bg-[#00b3d4] hover:bg-[#009bb8] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 text-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Télécharger la brochure
        </a>
      </div>

      <div v-else>
        <article v-for="brochure in displayedBrochures" :key="brochure.id" class="border-t py-4 first:border-t-0">
          <div class="flex justify-between items-start gap-4">
            <div>
              <h3 class="font-bold text-gray-900">{{ brochure.title }}</h3>
              <p class="text-sm text-gray-600 mt-1">{{ brochure.description }}</p>
            </div>
            <a :href="`${base}/public/brochures/${brochure.slug}/download`" target="_blank" class="shrink-0 bg-gray-100 hover:bg-[#00b3d4] hover:text-white text-gray-800 text-sm font-semibold py-2 px-3 rounded-lg transition duration-150">
              PDF
            </a>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
<script setup>
import config from '../../config'
const props = defineProps({ isOpen: Boolean, brochureName: String, inline: Boolean })
const emit = defineEmits(['close', 'submit'])
const base = config.app_dev_url
const brochures = ref([])
const loading = ref(false)
const error = ref('')
let requestNumber = 0
let controller
const dialog = ref(null)
let previousFocus
function onKeydown(event) {
  if (props.inline) return
  if (event.key === 'Escape') { event.preventDefault(); emit('close') }
  if (event.key !== 'Tab') return
  const controls = [...dialog.value.querySelectorAll('button, a[href]')].filter(element => !element.disabled)
  const first = controls[0], last = controls.at(-1)
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) { event.preventDefault(); first?.focus() }
}

const route = useRoute()
const brochureAssociations = {
  '/formations/licence-professionnelle/finance-digitale': ['LICENCE', 'FD'],
  '/formations/licence-professionnelle/intelligence-artificielle': ['LICENCE', 'IA-GL'],
  '/formations/licence-professionnelle/management-projets': ['LICENCE', 'MPN'],
  '/formations/licence-professionnelle/marketing-digital': ['LICENCE', 'MDE'],
  '/formations/master-professionnel/finance-digitale': ['MASTER', 'FD'],
  '/formations/master-professionnel/management-projets': ['MASTER', 'MP-TD'],
  '/formations/master-professionnel/marketing-digital': ['MASTER', 'MDE'],
  '/formations/executive-education/finance-digitale': ['EXECUTIVE', 'FD'],
  '/formations/executive-education/management-projets-transformation-digitale': ['EXECUTIVE', 'MP-TD']
}
const association = computed(() => props.inline ? null : brochureAssociations[route.path.replace(/\/$/, '')])
const matchingBrochures = computed(() => {
  if (!association.value) return brochures.value
  const [cycle, code] = association.value
  return brochures.value.filter(item => item.cycle === cycle && item.program_code === code)
})
const specificBrochure = computed(() => {
  if (props.inline) return null
  if (!association.value) return null
  const matches = matchingBrochures.value
  return matches.length === 1 ? matches[0] : null
})

const displayedBrochures = computed(() => {
  if (specificBrochure.value) return [specificBrochure.value]
  return matchingBrochures.value
})

async function load() {
  const current = ++requestNumber
  controller?.abort()
  const requestController = new AbortController()
  controller = requestController
  const timeout = setTimeout(() => requestController.abort(), 15000)
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${base}/public/brochures`, { cache: 'no-store', signal: requestController.signal })
    if (!response.ok) throw new Error('Brochures indisponibles. Réessayez.')
    const rows = await response.json()
    if (!Array.isArray(rows)) throw new Error('Catalogue des brochures invalide. Réessayez.')
    if (current === requestNumber) brochures.value = rows
  } catch (cause) {
    if (current === requestNumber) error.value = cause.message || 'Chargement impossible.'
  } finally {
    clearTimeout(timeout)
    if (current === requestNumber) loading.value = false
  }
}
watch(() => props.isOpen, async value => {
  if (value) {
    if (import.meta.client && !props.inline) previousFocus = document.activeElement
    load()
    await nextTick()
    if (!props.inline) dialog.value?.focus()
  } else {
    requestNumber++
    controller?.abort()
    previousFocus?.focus()
  }
}, { immediate: true })
onBeforeUnmount(() => { requestNumber++; controller?.abort(); previousFocus?.focus() })
</script>

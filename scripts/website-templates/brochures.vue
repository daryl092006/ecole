<template>
  <main class="brochure-catalogue">
    <h1>Brochures ESCEN</h1>
    <p>Consultez les documents publiés par l’école pour découvrir les programmes de chaque formation et cycle.</p>
    <div v-if="error" role="alert"><p>Le catalogue des brochures est indisponible.</p><button type="button" @click="refresh()">Réessayer</button></div>
    <p v-else-if="!brochures.length" role="status">Aucune brochure disponible actuellement.</p>
    <div v-else class="brochure-catalogue-list">
      <article v-for="brochure in brochures" :key="brochure.id">
        <div><h2>{{ brochure.title }}</h2><p>{{ brochure.description }}</p></div>
        <a :href="`${base}/public/brochures/${brochure.slug}/download`" target="_blank" rel="noopener">Télécharger le PDF</a>
      </article>
    </div>
  </main>
</template>
<script setup>
import config from '../../config'
const base = config.app_dev_url
const { data: brochures, error, refresh } = await useAsyncData('public-brochure-catalogue', async () => {
  const fetchUrl = import.meta.server && process.env.ESCEN_SSR_API_URL ? `${process.env.ESCEN_SSR_API_URL}/public/brochures` : `${base}/public/brochures`
  const response = await fetch(fetchUrl, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error('Catalogue indisponible')
  const rows = await response.json()
  if (!Array.isArray(rows)) throw new Error('Catalogue invalide')
  return rows
}, {
  default: () => [],
  // Hydrate the rendered catalogue, but always revalidate a manual refresh.
  getCachedData: (key, app, context) => context.cause === 'initial' ? app.payload.data[key] ?? app.static.data[key] : undefined,
})
if (import.meta.server && error.value) throw createError({ statusCode: 503, statusMessage: 'Catalogue des brochures indisponible' })
onMounted(() => { void refresh() })
</script>
<style scoped>
.brochure-catalogue { max-width: 960px; margin: 0 auto; padding: 56px 24px; color: #202a50; min-height: 60vh; }
.brochure-catalogue h1 { font-size: 32px; font-weight: 700; margin-bottom: 16px; }
.brochure-catalogue > p { line-height: 1.7; margin-bottom: 32px; }
.brochure-catalogue-list article { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px 0; border-top: 1px solid #dce1e8; }
.brochure-catalogue h2 { font-size: 19px; font-weight: 600; margin-bottom: 8px; }
.brochure-catalogue article p { color: #4b5563; line-height: 1.6; }
.brochure-catalogue a, .brochure-catalogue button { text-decoration: underline; text-underline-offset: 4px; }
.brochure-catalogue a { flex-shrink: 0; }
@media (max-width: 768px) { .brochure-catalogue-list article { align-items: flex-start; flex-direction: column; gap: 16px; } }
</style>

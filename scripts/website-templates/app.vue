<template>
  <NuxtLayout><NuxtPage /><WebsiteActions v-if="!privatePage" /></NuxtLayout>
</template>

<script setup>
import seo from './generated/website-seo.json'
const route = useRoute()
const pathname = computed(() => route.path.replace(/\/$/, '') || '/')
const privatePage = computed(() => /^\/(connexion|inscription|preparation-inscription|candidat|docs|verif)(\/|$)/.test(pathname.value))
const name = computed(() => seo.pages[pathname.value])
const training = computed(() => pathname.value.startsWith('/formations/') && pathname.value.split('/').length === 4)
const canonical = computed(() => seo.origin + (pathname.value === '/' ? '/' : pathname.value))
const description = computed(() => training.value && name.value
  ? `${name.value} à l’ESCEN, à Lomé au Togo : programme, compétences, débouchés et modalités de candidature.`
  : name.value ? `${name.value} : découvrez les informations de l’ESCEN, école supérieure de commerce et d’économie numérique à Lomé, au Togo.`
  : 'Découvrez les formations et les actualités de l’ESCEN, école supérieure de commerce et d’économie numérique à Lomé, au Togo.')
useSeoMeta({
  title: () => name.value ? `${name.value}${training.value ? ' à Lomé, Togo' : ''} | ESCEN` : 'ESCEN — Commerce et économie numérique à Lomé, Togo',
  description: () => description.value,
  ogTitle: () => name.value ? `${name.value} | ESCEN` : 'ESCEN — Lomé, Togo',
  ogDescription: () => description.value,
  ogSiteName: 'ESCEN',
  ogUrl: () => canonical.value,
  ogImage: () => `${seo.origin}/valeurs/bg.jpg`,
  twitterCard: 'summary_large_image',
  robots: () => privatePage.value ? 'noindex, follow' : 'index, follow',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [{ key: 'escen-structured-data', type: 'application/ld+json', innerHTML: JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'EducationalOrganization', '@id': `${seo.origin}/#school`, name: 'École Supérieure de Commerce et d’Économie Numérique', alternateName: 'ESCEN', url: `${seo.origin}/`, address: { '@type': 'PostalAddress', addressLocality: 'Lomé', addressCountry: 'TG' } },
      ...(training.value && name.value ? [{ '@type': 'Course', name: name.value, description: description.value, url: canonical.value, provider: { '@id': `${seo.origin}/#school` } }] : []),
    ],
  }).replace(/</g, '\\u003c') }],
}))
</script>

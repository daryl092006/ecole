<template>
  <NuxtLayout><NuxtPage /><WebsiteActions v-if="!privatePage" /></NuxtLayout>
</template>

<script setup>
import seo from './generated/website-seo.json'
import { useBlogStore } from '~/stores/blog'
const route = useRoute()
const blog = useBlogStore()
const pageError = useError()
const pathname = computed(() => route.path.replace(/\/$/, '') || '/')
const privatePage = computed(() => /^\/(connexion|inscription|preparation-inscription|candidat|docs|verif)(\/|$)/.test(pathname.value))
const articleRoute = computed(() => /^\/blogs\/[^/]+$/.test(pathname.value))
const article = computed(() => articleRoute.value && [blog.currentArticle?.slug, blog.currentArticle?.id].includes(String(route.params.id)) ? blog.currentArticle : null)
const page = computed(() => seo.details[pathname.value])
const name = computed(() => article.value?.title || page.value?.name || (articleRoute.value ? 'Article indisponible' : 'ESCEN'))
const title = computed(() => article.value ? `${article.value.title} | ESCEN` : page.value?.title || `${name.value} | ESCEN Togo`)
const training = computed(() => page.value?.type === 'course')
const canonical = computed(() => seo.origin + (pathname.value === '/' ? '/' : pathname.value))
const description = computed(() => article.value?.excerpt || page.value?.description || 'Découvrez les formations et les actualités de l’ESCEN, école supérieure de commerce et d’économie numérique à Lomé, au Togo.')
const imageUrl = computed(() => {
  try { const url = new URL(article.value?.image || page.value?.image || '/logo-escen.png', seo.origin); return ['http:', 'https:'].includes(url.protocol) ? url.href : `${seo.origin}/logo-escen.png` }
  catch { return `${seo.origin}/logo-escen.png` }
})
useSeoMeta({
  title: () => title.value,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogSiteName: 'ESCEN',
  ogType: () => article.value ? 'article' : 'website',
  ogLocale: 'fr_TG',
  ogUrl: () => canonical.value,
  ogImage: () => imageUrl.value,
  ogImageAlt: () => article.value?.title || (training.value ? name.value : 'ESCEN — École supérieure de commerce et d’économie numérique'),
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
  twitterDescription: () => description.value,
  twitterImage: () => imageUrl.value,
  robots: () => privatePage.value || (articleRoute.value && !article.value) || !!pageError.value ? 'noindex, follow' : 'index, follow',
})
const graph = computed(() => {
  const schoolId = `${seo.origin}/#school`
  const siteId = `${seo.origin}/#website`
  const pageId = `${canonical.value}#webpage`
  const organization = {
    '@type': 'EducationalOrganization', '@id': schoolId,
    name: 'École Supérieure de Commerce et d’Économie Numérique', alternateName: 'ESCEN', url: `${seo.origin}/`,
    logo: { '@type': 'ImageObject', url: `${seo.origin}/logo-escen.png`, width: 3035, height: 602 },
    address: { '@type': 'PostalAddress', addressLocality: 'Lomé', addressCountry: 'TG' },
    telephone: '+22898012727', email: 'hello@escen.university',
    sameAs: ['https://www.linkedin.com/company/escenofficiel/', 'https://www.facebook.com/escenofficiel'],
  }
  const entries = [organization,
    { '@type': 'WebSite', '@id': siteId, name: 'ESCEN Togo', url: `${seo.origin}/`, publisher: { '@id': schoolId }, inLanguage: 'fr' },
    { '@type': page.value?.type === 'contact' ? 'ContactPage' : page.value?.type === 'collection' ? 'CollectionPage' : 'WebPage', '@id': pageId, name: name.value, url: canonical.value, description: description.value, isPartOf: { '@id': siteId }, about: { '@id': schoolId }, inLanguage: 'fr' },
  ]
  if (training.value) entries.push({ '@type': 'Course', '@id': `${canonical.value}#course`, name: name.value, description: description.value, url: canonical.value, provider: { '@id': schoolId }, inLanguage: 'fr', ...(page.value.timeRequired ? { timeRequired: page.value.timeRequired } : {}) })
  if (pathname.value === '/formations' || /^\/formations\/[^/]+$/.test(pathname.value)) {
    const courses = Object.entries(seo.details).filter(([path, details]) => details.type === 'course' && path.startsWith(pathname.value + '/'))
    if (courses.length) entries.push({ '@type': 'ItemList', name: name.value, itemListElement: courses.map(([path], index) => ({ '@type': 'ListItem', position: index + 1, url: seo.origin + path })) })
  }
  if (article.value) entries.push({ '@type': 'BlogPosting', '@id': `${canonical.value}#article`, headline: article.value.title, description: article.value.excerpt, image: imageUrl.value, url: canonical.value, mainEntityOfPage: { '@id': pageId }, author: { '@id': schoolId }, publisher: { '@id': schoolId }, inLanguage: 'fr', ...(article.value.date ? { datePublished: article.value.date } : {}) })
  if (pathname.value.startsWith('/formations/') || (articleRoute.value && article.value)) {
    const paths = pathname.value.split('/').filter(Boolean).map((_, index, parts) => '/' + parts.slice(0, index + 1).join('/'))
    const crumbs = [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: `${seo.origin}/` }, ...paths.map((path, index) => ({ '@type': 'ListItem', position: index + 2, name: path === pathname.value ? name.value : seo.details[path]?.name || seo.pages[path], item: seo.origin + path }))]
    entries.push({ '@type': 'BreadcrumbList', itemListElement: crumbs })
  }
  return { '@context': 'https://schema.org', '@graph': entries }
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [{ key: 'escen-structured-data', type: 'application/ld+json', innerHTML: JSON.stringify(graph.value).replace(/</g, String.fromCharCode(92) + 'u003c') }],
}))
</script>

<style src="~/assets/css/website-corners.css"></style>

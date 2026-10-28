import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function discoverPublishedArticles(portal, fetcher = fetch) {
  const response = await fetcher(`${portal}/api/website/public/blogs`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Catalogue des publications inaccessible (HTTP ${response.status}).`);
  const articles = await response.json();
  if (!Array.isArray(articles) || articles.length > 1000 || articles.some(article => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug || '') || article.slug.length > 200)) throw new Error('Catalogue des publications invalide.');
  return [...new Set(articles.map(article => `/blogs/${article.slug}`))];
}

export async function prepareWebsiteArticles(root, origins) {
  let routes;
  const portalUrl = process.env.ESCEN_DISCOVERY_URL || origins.portal;
  try { routes = await discoverPublishedArticles(portalUrl); }
  catch (error) {
    // Never publish an incomplete inventory when preparing production.
    if (origins.production) throw error;
    console.warn(`${error.message} Le portail doit être lancé pour prérendre ses articles ; aucune route d’article ajoutée pour ce build local.`);
    routes = [];
  }
  await writeFile(path.join(root, 'app/generated/public-article-routes.json'), JSON.stringify(routes, null, 2) + '\n');
  let config = await readFile(path.join(root, 'nuxt.config.ts'), 'utf8');
  if (!config.includes('import websiteArticleRoutes')) config = "import websiteArticleRoutes from './app/generated/public-article-routes.json';\n" + config;
  config = config.replace('failOnError: false,', 'failOnError: true,\n      routes: websiteArticleRoutes,');
  if (!config.includes('sitemap: { urls:')) config = config.replace('sitemap: { exclude:', 'sitemap: { urls: websiteArticleRoutes, exclude:');
  await writeFile(path.join(root, 'nuxt.config.ts'), config);

  for (const name of ['index.vue', '[id].vue']) {
    const file = path.join(root, 'app/pages/blogs', name);
    let source = await readFile(file, 'utf8');
    if (!source.includes('// ESCEN: public content in initial HTML')) {
      const detail = name === '[id].vue';
      source = source.replace('const blogStore = useBlogStore()', `const blogStore = useBlogStore()\n// ESCEN: public content in initial HTML; browser mount still revalidates publication.\nconst { error: publicContentError } = await useAsyncData(${detail ? "() => 'public-article-' + route.params.id" : "'public-articles'"}, async () => {\n  await blogStore.${detail ? 'fetchArticleById(String(route.params.id))' : 'fetchArticles()'}\n  if (blogStore.error) throw createError({ statusCode: ${detail ? "blogStore.notFound ? 404 : 503" : '503'}, statusMessage: 'Publication indisponible' })\n  return ${detail ? 'blogStore.currentArticle' : 'blogStore.articles'}\n})\nif (publicContentError.value) throw createError(publicContentError.value)`);
    }
    if (name === '[id].vue') {
      // Breadcrumb already supplies the page's H1.
      source = source.replace(/<h1([^>]*)>(\s*\{\{ article.title \}\}\s*)<\/h1>/, '<h2$1>$2</h2>');
    }
    await writeFile(file, source);
  }
  const storeFile = path.join(root, 'app/stores/blog.ts');
  let store = await readFile(storeFile, 'utf8');
  if (!store.includes('notFound:')) store = store.replace('currentArticle: null,', 'currentArticle: null,\n    notFound: false,');
  store = store.replace('async fetchArticleById(id: string) {', 'async fetchArticleById(id: string) {\n      this.notFound = false;');
  if (!store.includes('this.notFound = err.response?.status === 404')) store = store.replace("this.error = err.response?.data?.message || 'Erreur lors de la récupération de l\\'article'", "this.currentArticle = null\n        this.notFound = err.response?.status === 404\n        this.error = err.response?.data?.message || 'Erreur lors de la récupération de l\\'article'");
  // Keep regeneration idempotent.
  store = store.replace(/(this.notFound = false;\s*){2,}/g, 'this.notFound = false;\n');
  await writeFile(storeFile, store);
}

import { readFile, writeFile, realpath, access } from 'node:fs/promises';
import path from 'node:path';
import { adaptWebsite } from './website-adapter.mjs';
import { websiteOrigins, prepareWebsiteRelease } from './website-release.mjs';
import { applyWebsiteBranding } from './website-branding.mjs';
import { prepareWebsiteArticles } from './website-articles.mjs';
import { repairWebsiteNavigation } from './website-navigation.mjs';
import { prepareWebsiteHomepage } from './website-homepage.mjs';

// Run only against the private working copy, never the source in Downloads.
const projectRoot = await realpath('.');
const sibling = path.resolve(projectRoot, '../escen-website');
const hasSibling = await access(sibling).then(() => true).catch(() => false);
const expected = hasSibling ? sibling : path.join(projectRoot, '.tmp/escen-website');
const root = await realpath(expected);
if (root !== expected) throw new Error('La copie doit être un dossier local, sans lien symbolique.');
const origins = websiteOrigins();
const portal = new URL(origins.portal);
if (!['http:', 'https:'].includes(portal.protocol) || portal.username || portal.password || portal.search || portal.hash || portal.pathname !== '/') {
  throw new Error('ESCEN_PORTAL_URL doit être une origine HTTP(S) sans identifiants.');
}
const loginUrl = `${portal.origin}/connexion`;
for (const file of ['app/components/Header.vue', 'app/components/Footer.vue']) {
  const target = path.join(root, file);
  let source = await readFile(target, 'utf8');
  // /connexion belongs to the site and redirects to the configured portal.
  source = source.replaceAll('/candidat/login', '/connexion');
  if (file.endsWith('Header.vue') && !source.includes('aria-label="Ouvrir le menu"')) {
    source = source.replace('<button @click="isMobileMenuOpen = !isMobileMenuOpen"', '<button aria-label="Ouvrir le menu" :aria-expanded="isMobileMenuOpen" @click="isMobileMenuOpen = !isMobileMenuOpen"');
  }
  if (file.endsWith('Footer.vue') && !source.includes('to="/brochures"')) {
    source = source.replace('</footer>', '<NuxtLink to="/brochures" class="block px-6 py-4 underline">Brochures ESCEN</NuxtLink></footer>');
  }
  await writeFile(target, source);
}
await writeFile(path.join(root, 'app/pages/connexion/index.vue'), `<template>
  <main class="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
    <h1 class="text-2xl font-bold">Espace étudiant ESCEN</h1>
    <p>Accédez à votre scolarité et à vos documents dans le portail sécurisé.</p>
    <a href="${loginUrl}" class="px-6 py-3 rounded-xl bg-[#01b4d5] text-white font-bold">Ouvrir le portail ESCEN</a>
    <NuxtLink to="/">Revenir au site ESCEN</NuxtLink>
  </main>
</template>
<script setup>
definePageMeta({ layout: false })
</script>
`);
await adaptWebsite(root, portal);
await prepareWebsiteHomepage(root);
await prepareWebsiteRelease(root, origins);
await applyWebsiteBranding(root);
await prepareWebsiteArticles(root, origins);
await repairWebsiteNavigation(root);
console.log(`Copie interconnectée : ${root}\nPortail : ${loginUrl}\nAPI : ${portal.origin}/api/website`);

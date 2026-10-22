import { readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

export async function applyWebsiteBranding(root) {
  await copyFile(new URL('../public/logo-escen.png', import.meta.url), path.join(root, 'public/logo-escen.png'));
  await writeFile(path.join(root, 'app/components/WebsiteLogo.vue'), await readFile(new URL('./website-templates/WebsiteLogo.vue', import.meta.url), 'utf8'));
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { await visit(file); continue; }
      if (!file.endsWith('.vue')) continue;
      const source = await readFile(file, 'utf8');
      let corrected = source.replace(/<img\b(?=[^>]*\bsrc=["']\/logo\/)[^>]*>/g, image => {
        const footer = file.endsWith('Footer.vue');
        const application = /(?:left|mobile)-logo/.test(image);
        const light = footer || image.includes('left-logo') || image.includes('invert');
        return `<WebsiteLogo${light ? ' light' : ''}${image.includes('scrolled') ? ' :compact="scrolled"' : ''} context="${footer ? 'footer' : image.includes('mobile-logo') ? 'application-mobile' : application ? 'application' : 'header'}" />`;
      });
      corrected = corrected.replace('<WebsiteLogo context="application" />', '<WebsiteLogo context="application-mobile" />');
      if (file.endsWith('/connexion/index.vue') && !corrected.includes('<WebsiteLogo')) corrected = corrected.replace('<h1', '<NuxtLink to="/" aria-label="Accueil ESCEN"><WebsiteLogo /></NuxtLink>\n    <h1');
      if (corrected !== source) await writeFile(file, corrected);
    }
  }
  await visit(path.join(root, 'app'));
  let config = await readFile(path.join(root, 'nuxt.config.ts'), 'utf8');
  config = config.replace(/href: "\/logo\/LOGO_ESCEN\.png"/, 'href: "/logo-escen.png"');
  await writeFile(path.join(root, 'nuxt.config.ts'), config);
}

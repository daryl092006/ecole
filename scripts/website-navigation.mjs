import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function repairWebsiteNavigation(root) {
  const homeFile = path.join(root, 'app/pages/index.vue');
  let home = await readFile(homeFile, 'utf8');
  // Vue page transitions need one element root. The home page had a fragment:
  // leaving it in out-in mode could leave NuxtPage empty after navigation.
  if (!home.includes('class="website-homepage"')) home = home.replace('<template>', '<template>\n  <div class="website-homepage">').replace('</template>', '  </div>\n</template>');
  await writeFile(homeFile, home);

  const headerFile = path.join(root, 'app/components/Header.vue');
  let header = await readFile(headerFile, 'utf8');
  header = header.replace(/@mouseleave="closeFormationsDropdown"(?! @focusin)/, '@mouseleave="closeFormationsDropdown" @focusin="openFormationsDropdown" @focusout="closeFormationsDropdown"');
  header = header.replace(/<button(\s+class="relative px-4 py-2\.5[\s\S]*?Formations[\s\S]*?)<\/button>/, '<NuxtLink to="/formations"$1</NuxtLink>');
  if (!header.includes("{ label: 'Toutes les formations'")) header = header.replace('const mobileFormationLinks = [', "const mobileFormationLinks = [\n  { label: 'Toutes les formations', path: '/formations' },");
  // Keep the same navigation geometry as the contact bar folds away.
  header = header.replace('class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"', 'class="website-header fixed top-0 left-0 right-0 z-50 transition-all duration-300"');
  header = header.replace("'bg-transparent shadow-none'", "'bg-white shadow-none'");
  header = header.replace('class="hidden md:block transition-all', 'class="website-header-contact hidden md:block transition-all');
  header = header.replace('class="website-header-contact hidden', ':aria-hidden="scrolled" :inert="scrolled" class="website-header-contact hidden');
  // Avoid adding bindings a second time when the connector is rerun.
  header = header.replaceAll(':aria-hidden="scrolled" :inert="scrolled" :aria-hidden="scrolled" :inert="scrolled"', ':aria-hidden="scrolled" :inert="scrolled"');
  header = header.replace('<nav class="max-w-7xl', '<nav class="website-header-nav max-w-7xl');
  header = header.replace('class="flex items-center justify-between w-full relative"', 'class="website-header-row flex items-center justify-between w-full relative"');
  header = header.replace('class="group relative -ml-2 lg:-ml-4 py-2 z-10"', 'class="website-header-brand group relative py-2 z-10"');
  header = header.replace('<WebsiteLogo :compact="scrolled" context="header" />', '<WebsiteLogo context="header" />');
  header = header.replace('class="hidden lg:flex items-center justify-center absolute', 'class="website-header-links hidden lg:flex items-center justify-center absolute');
  header = header.replace('class="hidden lg:flex group relative px-6', 'class="website-header-cta hidden lg:flex group relative px-6');
  header = header.replace('class="lg:hidden flex items-center justify-center w-10', 'class="website-header-toggle lg:hidden flex items-center justify-center w-10');
  header = header.replace('class="h-20 sm:h-24 md:h-[calc(44px+6rem)] lg:h-[calc(44px+7rem)]"', 'class="website-header-spacer" aria-hidden="true"');
  header = header.replace("  window.addEventListener('scroll', handleScroll)", "  handleScroll()\n  window.addEventListener('scroll', handleScroll, { passive: true })");
  header = header.replace('  handleScroll()\n  handleScroll()', '  handleScroll()');
  if (!header.includes('assets/css/website-header.css')) header += '\n<style src="~/assets/css/website-header.css"></style>\n';
  await writeFile(path.join(root, 'app/assets/css/website-header.css'), await readFile(new URL('./website-templates/website-header.css', import.meta.url), 'utf8'));
  await writeFile(headerFile, header);

  const catalogFile = path.join(root, 'app/pages/formations/index.vue');
  let catalog = await readFile(catalogFile, 'utf8');
  // Public content must be visible before any observer or animation runs.
  catalog = catalog.replace('const isVisible = ref(false)', 'const isVisible = ref(true)');
  await writeFile(catalogFile, catalog);
}

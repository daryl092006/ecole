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
  await writeFile(headerFile, header);

  const catalogFile = path.join(root, 'app/pages/formations/index.vue');
  let catalog = await readFile(catalogFile, 'utf8');
  // Public content must be visible before any observer or animation runs.
  catalog = catalog.replace('const isVisible = ref(false)', 'const isVisible = ref(true)');
  await writeFile(catalogFile, catalog);
}

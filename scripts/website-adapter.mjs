import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { protectRegistrationDocuments } from './website-registration-resilience.mjs';

export async function adaptWebsite(root, portal) {
  // Keep the public checklist accessible; it reads the same requirements as uploads.
  const preparationFile = path.join(root, 'app/pages/preparation-inscription/index.vue');
  const preparation = await readFile(preparationFile, 'utf8');
  await writeFile(preparationFile, preparation.replace(/definePageMeta\(\{\s*redirect: '\/inscription'\s*\}\)/, ''));
  for (const [template, destination] of [
    ['BrochureModal.vue', 'app/components/BrochureModal.vue'],
    ['brochures.vue', 'app/pages/brochures.vue'],
  ]) {
    await writeFile(path.join(root, destination), await readFile(new URL(`./website-templates/${template}`, import.meta.url), 'utf8'));
  }
  // Always derive from the untouched source so that rerunning is deterministic.
  const sourceRoot = process.env.ESCEN_WEBSITE_SOURCE || path.join(os.homedir(), 'Downloads/escen-website');
  let registration = await readFile(path.join(sourceRoot, 'app/pages/inscription/index.vue'), 'utf8');
  registration = registration.replace(/<select v-model="formData.type_diplome_id"[\s\S]*?<\/select>/, '<input v-model="formData.type_diplome_id" required maxlength="200" class="field-input" placeholder="Intitulé de votre dernier diplôme">');
  registration = registration.replace(/const champsParcoursConfig = computed\(\(\) => \{[\s\S]*?\n\}\)/, "const champsParcoursConfig = computed(() => ({ annee_bac: false, serie: false, mention_bac: false, etablissement_diplome: false }))");
  // Required attachments are set explicitly by the platform per formation.
  registration = registration.replace(/if \(!prepDocs.value.length\) \{[\s\S]*?\n    \}/, '');
  registration = registration.replace('      : defaultDocs', '      : []').replace('fileInputs.value = defaultDocs', 'fileInputs.value = []');
  registration = registration.replace('const files = ref({})', 'const files = ref({})\nconst existingDocuments = ref([])');
  registration = registration.replace("const isFileSelected = (key) => {", "const isFileSelected = (key) => { if (existingDocuments.value.some(d => d.document_key === key)) return true;");
  registration = registration.replace("return f ? f.name : ''", "return f ? f.name : existingDocuments.value.filter(d => d.document_key === key).map(d => d.filename).join(', ')");
  registration = registration.replace('const candidat = await candidatureStore.recupererBrouillon(draftToken.value)', 'const draft = await candidatureStore.recupererBrouillon(draftToken.value)\n  const candidat = draft?.candidat\n  existingDocuments.value = draft?.documents || []');
  // Capture the reference on screen; clear the bearer token after final submission.
  registration = registration.replace('const etapeActive = ref(0)', "const etapeActive = ref(0)\nconst submittedReference = ref('')");
  registration = registration.replace("await candidatureStore.finaliserEtape4(draftToken.value, data)", "const receipt = await candidatureStore.finaliserEtape4(draftToken.value, data)\n    submittedReference.value = receipt.reference");
  registration = registration.replace('<div class="step-track">', '<div v-if="submittedReference" role="status" class="p-4 bg-white text-[#12192B]">Dossier reçu par ESCEN. Référence : {{ submittedReference }}. La réception ne vaut pas validation de votre inscription.</div>\n      <div class="step-track">');
  if (!registration.includes('Dossier reçu par ESCEN')) registration = registration.replace('<template>', '<template>\n  <div v-if="submittedReference" role="status" class="p-4 bg-white text-[#12192B]">Dossier reçu par ESCEN. Référence : {{ submittedReference }}. La réception ne vaut pas validation de votre inscription.</div>');
  registration = registration.replace("const submittedReference = ref('')", "const submittedReference = ref('')\nconst registrationYearId = ref('')\nconst registrationYearName = ref('')\nconst campaignChanged = ref(false)");
  registration = registration.replace("typesDiplome.value = res.data?.types_diplome || []", "registrationYearId.value = res.data?.academic_year?.id || ''\n    registrationYearName.value = res.data?.academic_year?.name || ''\n    typesDiplome.value = res.data?.types_diplome || []");
  registration = registration.replace('const payload = {', 'const payload = { academic_year_id: registrationYearId.value,');
  registration = registration.replace("data.append('niveau_id', formData.niveau_id)", "data.append('academic_year_id', registrationYearId.value)\n      data.append('niveau_id', formData.niveau_id)");
  registration = registration.replace('if (!candidat) { clearDraftToken(); return }', "if (!candidat) { clearDraftToken(); return }\n  if (candidat.academic_year_id !== registrationYearId.value) { campaignChanged.value = true; return }");
  registration = registration.replace('const clearDraftToken = () => {', 'const restartRegistration = () => { clearDraftToken(); window.location.reload() }\nconst clearDraftToken = () => {');
  registration = registration.replaceAll(':disabled="isSubmitting"', ':disabled="isSubmitting || !registrationYearId || campaignChanged"');
  registration = registration.replace('<div class="step-track">', `<p v-if="registrationYearName" class="p-3 font-semibold text-[#12192B]">Inscription pour l’année {{ registrationYearName }}</p>
        <p v-else-if="catalogLoading" role="status" class="p-3 text-[#12192B]">Chargement de la campagne de candidature…</p>
        <p v-else-if="catalogError" role="alert" class="p-3 text-[#12192B]">{{ catalogError }} <button type="button" @click="loadRegistrationCatalog">Réessayer</button></p>
        <p v-else role="status" class="p-3 text-[#12192B]">Aucune année d’inscription n’est ouverte actuellement.</p>
        <div v-if="campaignChanged" role="alert" class="p-3 text-[#12192B]">Ce brouillon conserve son ancienne année de dépôt. Pour la nouvelle campagne, commencez un autre dossier.
          <button type="button" class="btn-ghost" @click="restartRegistration">Commencer un nouveau dossier</button>
        </div>
        <div class="step-track">`);
  registration = registration.replace('const niveaux = ref([])', "const niveaux = ref([])\nconst catalogLoading = ref(true)\nconst catalogError = ref('')");
  registration = registration.replace("console.error('Erreur chargement configuration candidature', e)", "throw e");
  registration = registration.replace('  niveaux.value = await niveauStore.fetchNiveaux()\n  fetchCandidatureConfig()', '  await loadRegistrationCatalog()');
  registration = registration.replace('onMounted(async () => {', `const loadRegistrationCatalog = async () => {
  catalogLoading.value = true
  catalogError.value = ''
  niveaux.value = []
  try {
    await fetchCandidatureConfig()
    niveaux.value = await niveauStore.fetchNiveaux()
  } catch (error) {
    catalogError.value = 'Impossible de charger les niveaux. Réessayez.'
  } finally {
    catalogLoading.value = false
  }
}

onMounted(async () => {`);
  registration = registration.replace('<select v-model="prepNiveauId"', '<select aria-label="Pour quel niveau postulez-vous ?" :disabled="catalogLoading || !!catalogError || !niveaux.length" v-model="prepNiveauId"');
  registration = registration.replace('<option value="">Veuillez sélectionner un niveau...</option>', '<option value="">{{ catalogLoading ? "Chargement des niveaux…" : "Veuillez sélectionner un niveau..." }}</option>');
  registration = registration.replace('<div v-if="prepLoading"', `<p v-if="registrationYearName" class="text-sm font-semibold mt-3">Année scolaire : {{ registrationYearName }}</p>
          <p v-if="catalogLoading" role="status" class="mt-3">Chargement des niveaux…</p>
          <div v-else-if="catalogError" role="alert" class="mt-3"><p>{{ catalogError }}</p><button type="button" class="underline" @click="loadRegistrationCatalog">Réessayer</button></div>
          <p v-else-if="!niveaux.length" role="status" class="mt-3">{{ registrationYearId ? "Aucun niveau proposé pour cette année." : "Les inscriptions ne sont pas ouvertes actuellement." }}</p>
          <div v-if="prepLoading"`);
  registration = registration.replaceAll(':disabled="!prepNiveauId"', ':disabled="!prepNiveauId || catalogLoading || !!catalogError"');
  registration = registration.replaceAll('isSubmitting || !registrationYearId || campaignChanged', 'isSubmitting || catalogLoading || !!catalogError || !niveaux.length || !registrationYearId || campaignChanged');
  registration = protectRegistrationDocuments(registration);
  registration = registration.replace('</style>', `@media (max-width: 768px) {
  .step-item { flex: 1 1 0; min-width: 0; padding: 0 4px; }
  .step-label { max-width: 100%; font-size: 9px; letter-spacing: 0.04em; overflow-wrap: anywhere; }
}
</style>`);
  await writeFile(path.join(root, 'app/pages/inscription/index.vue'), registration);
  let store = await readFile(path.join(sourceRoot, 'app/stores/candidature.ts'), 'utf8');
  store = store.replace('return response.data?.candidat || null', 'return response.data || null');
  await writeFile(path.join(root, 'app/stores/candidature.ts'), store);
  await writeFile(path.join(root, 'app/plugins/axios.ts'), `import axios from 'axios';
import config from '../../config';
export default defineNuxtPlugin(() => {
  const client = axios.create({ baseURL: config.app_dev_url, timeout: 20000, headers: { Accept: 'application/json' } });
  return { provide: { axios: client } };
});
`);
  await writeFile(path.join(root, 'config.ts'), `export default {
  app_local: true,
  app_dev_url: '${portal.origin}/api/website',
  app_prod_url: '${portal.origin}/api/website',
  app_dev_storage_url: '${portal.origin}',
  app_prod_storage_url: '${portal.origin}',
} as const;
`);
}

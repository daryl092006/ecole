// Keep these fixes in the adapter so regenerating the site preserves them.
export function protectRegistrationDocuments(source) {
  if (source.includes('let documentsRequestNumber = 0')) return source;
  let result = source.replace("fetch('https://api.country.is/')", "fetch('https://api.country.is/', { signal: AbortSignal.timeout(3000) })");
  result = result.replace("if (!iti) return ''", "if (!iti) return inputEl?.value?.trim() || ''");
  result = result.replace("const prepLoading = ref(false)", "const prepLoading = ref(false)\nconst prepError = ref('')\nlet prepRequestNumber = 0\nconst documentsLoading = ref(false)\nconst documentsError = ref('')\nlet documentsRequestNumber = 0");
  result = result.replace(/const fetchPrepDocs = async \(\) => \{[\s\S]*?\n\}\n/, `const fetchPrepDocs = async () => {
  const current = ++prepRequestNumber
  prepError.value = ''
  prepDocs.value = []
  Object.keys(prepChecked).forEach(key => delete prepChecked[key])
  if (!prepNiveauId.value) { prepLoading.value = false; return }
  prepLoading.value = true
  try {
    const { $axios } = useNuxtApp()
    const response = await $axios.get('/public/niveau/' + prepNiveauId.value + '/document-requirements')
    if (!Array.isArray(response.data)) throw new Error('Réponse invalide')
    if (current === prepRequestNumber) prepDocs.value = response.data.map(row => ({
      key: row.document_key, label: row.nom_affichage,
      is_obligatoire: row.is_obligatoire == 1 || row.is_obligatoire === true
    }))
  } catch {
    if (current === prepRequestNumber) prepError.value = 'Impossible de charger les pièces à fournir. Réessayez avant de continuer.'
  } finally {
    if (current === prepRequestNumber) prepLoading.value = false
  }
}
`);
  result = result.replace(/const fetchDynamicDocuments = async \(\) => \{[\s\S]*?\n\}\n/, `const fetchDynamicDocuments = async () => {
  const current = ++documentsRequestNumber
  documentsError.value = ''
  fileInputs.value = []
  if (!formData.niveau_id) { documentsLoading.value = false; return }
  documentsLoading.value = true
  try {
    const { $axios } = useNuxtApp()
    let url = '/public/niveau/' + formData.niveau_id + '/document-requirements'
    if (formData.filiere_id) url += '?filiere_id=' + encodeURIComponent(formData.filiere_id)
    const response = await $axios.get(url)
    if (!Array.isArray(response.data)) throw new Error('Réponse invalide')
    if (current === documentsRequestNumber) fileInputs.value = response.data.map(row => ({
      key: row.document_key, label: row.nom_affichage,
      multiple: row.is_multiple == 1 || row.is_multiple === true,
      is_obligatoire: row.is_obligatoire == 1 || row.is_obligatoire === true,
      accepted_formats: row.accepted_formats || 'all'
    }))
  } catch {
    if (current === documentsRequestNumber) documentsError.value = 'Impossible de charger les pièces à fournir. Réessayez avant de continuer.'
  } finally {
    if (current === documentsRequestNumber) documentsLoading.value = false
  }
}
`);
  result = result.replace('<div v-if="prepLoading"', '<div v-if="prepError" role="alert" class="registration-feedback"><p>{{ prepError }}</p><button type="button" @click="fetchPrepDocs">Réessayer les pièces</button></div>\n          <div v-if="prepLoading"');
  result = result.replace(':disabled="!prepNiveauId || catalogLoading || !!catalogError"', ':disabled="!prepNiveauId || catalogLoading || !!catalogError || prepLoading || !!prepError"');
  result = result.replace('<template v-if="formData.niveau_id">', '<div v-if="documentsError" role="alert" class="registration-feedback"><p>{{ documentsError }}</p><button type="button" @click="fetchDynamicDocuments">Réessayer les pièces</button></div>\n              <p v-if="documentsLoading" role="status" class="field-hint">Vérification des pièces à fournir…</p>\n              <template v-if="formData.niveau_id && !documentsLoading && !documentsError">');
  result = result.replaceAll('isSubmitting || catalogLoading || !!catalogError || !niveaux.length || !registrationYearId || campaignChanged', 'isSubmitting || catalogLoading || !!catalogError || ((etapeActive === 2 || etapeActive === 3) && (documentsLoading || !!documentsError)) || !niveaux.length || !registrationYearId || campaignChanged');
  result = result.replace('const nextStep = async () => {', 'const nextStep = async () => {\n  if (etapeActive.value === 2 && (documentsLoading.value || documentsError.value)) return');
  result = result.replace('const closePreparationModal = () => {', 'const closePreparationModal = () => {\n  if (catalogLoading.value || catalogError.value || prepLoading.value || prepError.value || !prepNiveauId.value) return');
  result = result.replace('if (formData.niveau_id) {\n    loadingFilieres.value', "if (!formData.niveau_id) { documentsRequestNumber++; documentsLoading.value = false; documentsError.value = '' }\n  if (formData.niveau_id) {\n    loadingFilieres.value");
  result = result.replace('</style>', `.registration-feedback { margin: 16px 0; padding: 14px; border: 1px solid #dba5a5; border-radius: 10px; color: #842727; background: #fff7f7; }
.registration-feedback button { margin-top: 8px; padding: 8px 12px; text-decoration: underline; font-weight: 600; }
</style>`);
  if (!result.includes('const documentsError') || !result.includes('Réessayer les pièces')) throw new Error('Adaptation des pièces impossible : vérifier la structure du formulaire source.');
  return result;
}

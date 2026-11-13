// Associate each static formation page with the canonical cycle and program code.
export function protectBrochureSelection(source) {
  if (source.includes('const brochureAssociations =')) return protectListingContext(source);
  const start = source.indexOf('function normalize(');
  const end = source.indexOf('const displayedBrochures =');
  if (start < 0 || end < start) throw new Error('Structure des brochures inconnue : aucune modification appliquée.');
  return protectListingContext(source.slice(0, start) + `const route = useRoute()
const brochureAssociations = {
  '/formations/licence-professionnelle/finance-digitale': ['LICENCE', 'FD'],
  '/formations/licence-professionnelle/intelligence-artificielle': ['LICENCE', 'IA-GL'],
  '/formations/licence-professionnelle/management-projets': ['LICENCE', 'MPN'],
  '/formations/licence-professionnelle/marketing-digital': ['LICENCE', 'MDE'],
  '/formations/master-professionnel/finance-digitale': ['MASTER', 'FD'],
  '/formations/master-professionnel/management-projets': ['MASTER', 'MP-TD'],
  '/formations/master-professionnel/marketing-digital': ['MASTER', 'MDE'],
  '/formations/executive-education/finance-digitale': ['EXECUTIVE', 'FD'],
  '/formations/executive-education/management-projets-transformation-digitale': ['EXECUTIVE', 'MP-TD']
}
const specificBrochure = computed(() => {
  if (props.inline) return null
  const association = brochureAssociations[route.path.replace(/\\/$/, '')]
  if (!association) return null
  const [cycle, code] = association
  const matches = brochures.value.filter(item => item.cycle === cycle && item.program_code === code)
  return matches.length === 1 ? matches[0] : null
})

` + source.slice(end));
}

function protectListingContext(source) {
  return source
    .replace('brochureName: String, inline: Boolean', 'brochureName: String, formationPath: String, inline: Boolean')
    .replace("brochureAssociations[route.path.replace(/\\/$/, '')]", "brochureAssociations[(props.formationPath || route.path).replace(/\\/$/, '')]");
}

// Listing cards already carry the canonical detail-page path; never match titles.
export function protectBrochureListing(source) {
  if (source.includes(':formation-path="selectedFormationPath"')) return source;
  if (!source.includes('const handleDownloadClick = (formation) => {') || !source.includes('<BrochureModal')) {
    throw new Error('Structure de la liste des formations inconnue.');
  }
  return source
    .replace('<BrochureModal', '<BrochureModal :formation-path="selectedFormationPath"')
    .replace(/const selectedBrochureTitle = ref\((['"])\1\);?/, match => `${match}\nconst selectedFormationPath = ref('')`)
    .replace('const handleDownloadClick = (formation) => {', "const handleDownloadClick = (formation) => {\n  selectedFormationPath.value = formation.detailsUrl || ''");
}

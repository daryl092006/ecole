// Associate each static formation page with the canonical cycle and program code.
export function protectBrochureSelection(source) {
  if (source.includes('const brochureAssociations =')) return source;
  const start = source.indexOf('function normalize(');
  const end = source.indexOf('const displayedBrochures =');
  if (start < 0 || end < start) throw new Error('Structure des brochures inconnue : aucune modification appliquée.');
  return source.slice(0, start) + `const route = useRoute()
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

` + source.slice(end);
}

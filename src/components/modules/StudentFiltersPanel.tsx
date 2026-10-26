import IconButton from '@/components/ui/IconButton';
import type { RoleName, Student } from '@/types';
import { EMPTY_STUDENT_FILTERS, type StudentFilters } from '@/services/studentQueryService';
import { filterRegisteredStudents, studentGroupFilterKey, studentFilterValue, MISSING_STUDENT_VALUE } from '@/services/studentQueryService';
import { downloadCsv } from '@/utils/csv';
interface Props { students: Student[]; filters: StudentFilters; onChange: (filters: StudentFilters) => void; role: RoleName; }
export default function StudentFiltersPanel({ students, filters, onChange, role }: Props) {
  const results = filterRegisteredStudents(students, filters, role);
  const programs = [...new Set(students.map(item => item.filiere))].sort();
  const levels = [...new Set(students.map(item => item.niveau))].sort();
  const groups = students.filter(item => (!filters.program || item.filiere === filters.program) && (!filters.level || item.niveau === filters.level));
  const activeFilters = [filters.level, filters.program, filters.groupId, filters.nationality, filters.gender, filters.status].filter(Boolean).length;
  if (students.length <= 1 && !filters.search && !activeFilters) return null;
  const demographicFilter = (key: 'nationality' | 'gender' | 'status', label: string, all: string, missing: string) => {
    const options = [...new Map(students.map(student => [studentFilterValue(student[key]), student[key].trim() || missing])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
    if (options.length <= 1 && !filters[key]) return null;
    return <label className="form-group">{label}<select className="select-input" value={filters[key]} onChange={event => onChange({ ...filters, [key]: event.target.value })}><option value="">{all}</option>{options.map(([value, text]) => <option key={value} value={value}>{value === MISSING_STUDENT_VALUE ? missing : text}</option>)}</select></label>;
  };
  return <div className="card card-full mb-2 student-filters"><div className="student-search-row">
    <label className="form-group">Recherche<input className="input" type="search" value={filters.search} onChange={event => onChange({ ...filters, search: event.target.value })} placeholder="Nom, matricule, email…" /></label>
    {demographicFilter('nationality', 'Nationalité', 'Toutes les nationalités', 'Non renseignée')}
  </div><section className="workspace-filter-panel" aria-label="Filtrer les dossiers"><div className="form-row filter-grid">
    <label className="form-group">Niveau<select className="select-input" value={filters.level} onChange={event => onChange({ ...filters, level: event.target.value, groupId: '' })}><option value="">Tous les niveaux</option>{levels.map(item => <option key={item}>{item}</option>)}</select></label>
    <label className="form-group">Filière<select className="select-input" value={filters.program} onChange={event => onChange({ ...filters, program: event.target.value, groupId: '' })}><option value="">Toutes les filières</option>{programs.map(item => <option key={item}>{item}</option>)}</select></label>
    <label className="form-group">Groupe<select className="select-input" value={filters.groupId} onChange={event => onChange({ ...filters, groupId: event.target.value })}><option value="">Tous les groupes</option>{[...new Map(groups.map(item => [studentGroupFilterKey(item), item.groupe])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    {demographicFilter('gender', 'Sexe', 'Tous les sexes', 'Non renseigné')}
    {demographicFilter('status', 'Statut', 'Tous les statuts', 'Non renseigné')}
  </div></section><div className="student-filter-footer"><p role="status">{results.length} résultat(s) sur {students.length} dossier(s).</p>
    <div className="btn-group">{(filters.search || activeFilters > 0) && <button className="btn btn-outline" onClick={() => onChange(EMPTY_STUDENT_FILTERS)}>Effacer les filtres</button>}{results.length > 0 && <IconButton className="btn btn-outline" onClick={() => {
      const permitted = filterRegisteredStudents(students, filters, role);
      downloadCsv('escen-etudiants.csv', ['Matricule', 'Prénom', 'Nom', 'Email', 'Nationalité', 'Sexe', 'Filière', 'Niveau', 'Groupe', 'Statut'], permitted.map(item => [item.matricule, item.firstname, item.lastname, item.email, item.nationality, item.gender, item.filiere, item.niveau, item.groupe, item.status]));
    }} label="Exporter les résultats CSV" />}</div></div>
  </div>;
}

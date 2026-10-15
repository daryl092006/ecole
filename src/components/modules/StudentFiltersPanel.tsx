import type { RoleName, Student } from '@/types';
import { EMPTY_STUDENT_FILTERS, type StudentFilters } from '@/services/studentQueryService';
import { filterRegisteredStudents, studentGroupFilterKey } from '@/services/studentQueryService';
import { downloadCsv } from '@/utils/csv';
interface Props { students: Student[]; filters: StudentFilters; onChange: (filters: StudentFilters) => void; role: RoleName; }
export default function StudentFiltersPanel({ students, filters, onChange, role }: Props) {
  const results = filterRegisteredStudents(students, filters, role);
  const programs = [...new Set(students.map(item => item.filiere))].sort();
  const levels = [...new Set(students.map(item => item.niveau))].sort();
  const groups = students.filter(item => (!filters.program || item.filiere === filters.program) && (!filters.level || item.niveau === filters.level));
  const activeFilters = [filters.level, filters.program, filters.groupId].filter(Boolean).length;
  return <div className="card card-full mb-2 student-filters"><div className="student-search-row">
    <label className="form-group">Recherche<input className="input" type="search" value={filters.search} onChange={event => onChange({ ...filters, search: event.target.value })} placeholder="Nom, matricule, email…" /></label>
  </div><details className="student-advanced-filters"><summary>Filtrer par niveau, filière ou groupe{activeFilters > 0 ? ` (${activeFilters})` : ''}</summary><div className="form-row filter-grid">
    <label className="form-group">Niveau<select className="select-input" value={filters.level} onChange={event => onChange({ ...filters, level: event.target.value, groupId: '' })}><option value="">Tous les niveaux</option>{levels.map(item => <option key={item}>{item}</option>)}</select></label>
    <label className="form-group">Filière<select className="select-input" value={filters.program} onChange={event => onChange({ ...filters, program: event.target.value, groupId: '' })}><option value="">Toutes les filières</option>{programs.map(item => <option key={item}>{item}</option>)}</select></label>
    <label className="form-group">Groupe<select className="select-input" value={filters.groupId} onChange={event => onChange({ ...filters, groupId: event.target.value })}><option value="">Tous les groupes</option>{[...new Map(groups.map(item => [studentGroupFilterKey(item), item.groupe])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
  </div></details><div className="student-filter-footer"><p role="status">{results.length} résultat(s) sur {students.length} dossier(s).</p>
    <div className="btn-group">{(filters.search || activeFilters > 0) && <button className="btn btn-outline" onClick={() => onChange(EMPTY_STUDENT_FILTERS)}>Effacer les filtres</button>}<button className="btn btn-outline" disabled={!results.length} onClick={() => {
      const permitted = filterRegisteredStudents(students, filters, role);
      downloadCsv('escen-etudiants.csv', ['Matricule', 'Prénom', 'Nom', 'Email', 'Filière', 'Niveau', 'Groupe', 'Statut'], permitted.map(item => [item.matricule, item.firstname, item.lastname, item.email, item.filiere, item.niveau, item.groupe, item.status]));
    }}>Exporter les résultats CSV</button></div></div>
  </div>;
}

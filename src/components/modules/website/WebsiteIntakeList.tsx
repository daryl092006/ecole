'use client';

import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { DOCUMENT_LABELS } from '@/services/websiteService';
import type { WebsiteIntake, WebsiteManagement } from '@/types/website';

export interface WebsiteIntakeFilters { query: string; levelId: string; programId: string; status: string; }
export const EMPTY_INTAKE_FILTERS: WebsiteIntakeFilters = { query: '', levelId: '', programId: '', status: '' };

export default function WebsiteIntakeList({ data, yearLabel, canManage, filters, onFilters, onConfigure }: {
  data: WebsiteManagement; yearLabel: string; canManage: boolean | undefined;
  filters: WebsiteIntakeFilters; onFilters: (value: WebsiteIntakeFilters) => void;
  onConfigure: (intake: WebsiteIntake) => void;
}) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const rows = data.intakes.filter(item => (!filters.levelId || item.level_id === filters.levelId)
    && (!filters.programId || item.program_id === filters.programId)
    && (!filters.status || (filters.status === 'open' ? item.active : !item.active))
    && normalize(`${item.label} ${item.program_name || ''} ${item.level_name || ''}`).includes(normalize(filters.query.trim())))
    .sort((a, b) => (a.program_name || a.label).localeCompare(b.program_name || b.label, 'fr', { numeric: true })
      || (a.level_name || '').localeCompare(b.level_name || '', 'fr', { numeric: true }));
  const opened = data.intakes.filter(item => item.active).length;
  const filtered = Object.values(filters).some(Boolean);
  return <section className="card card-full" aria-label="Configuration des formations">
    <div className="card-header"><div><h2>Formations proposées à l’inscription</h2><p>Année consultée : <strong>{yearLabel}</strong></p></div><span className="pill pill-default">{data.intakes.length} {data.intakes.length === 1 ? 'formation' : 'formations'}</span></div>
    <p>Les formations viennent de la préparation annuelle. Leur ouverture et les pièces ci-dessous déterminent le formulaire de candidature du site.</p>
    <div className="btn-group" role="group" aria-label="Bilan des formations"><span className="pill pill-success">{opened} {opened === 1 ? 'ouverte' : 'ouvertes'}</span><span className="pill pill-default">{data.intakes.length - opened} {data.intakes.length - opened === 1 ? 'fermée' : 'fermées'}</span><span className="pill pill-default">{data.intakes.filter(item => !item.required_documents.length).length} sans pièce obligatoire</span></div>
    <div className="browser-toolbar">
      <label className="form-group">Rechercher une formation<input className="input" type="search" placeholder="Filière, niveau ou libellé" value={filters.query} onChange={event => onFilters({ ...filters, query: event.target.value })} /></label>
      <label className="form-group">Filtrer par filière<select className="select-input" value={filters.programId} onChange={event => onFilters({ ...filters, programId: event.target.value })}><option value="">Toutes les filières</option>{data.programs.filter(program => data.intakes.some(item => item.program_id === program.id)).map(program => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
      <label className="form-group">Filtrer par niveau<select className="select-input" value={filters.levelId} onChange={event => onFilters({ ...filters, levelId: event.target.value })}><option value="">Tous les niveaux</option>{data.levels.filter(level => data.intakes.some(item => item.level_id === level.id)).map(level => <option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
      <label className="form-group">Ouverture sur le site<select className="select-input" value={filters.status} onChange={event => onFilters({ ...filters, status: event.target.value })}><option value="">Tous les états</option><option value="open">Ouvertes</option><option value="closed">Fermées</option></select></label>
      {filtered && <button type="button" className="btn btn-outline" onClick={() => onFilters(EMPTY_INTAKE_FILTERS)}>Réinitialiser les filtres</button>}
    </div>
    {!data.intakes.length ? <div className="empty-state"><strong>Aucune formation pour {yearLabel}</strong><span>Préparez les formations dans « Année scolaire » avant de configurer les inscriptions du site.</span></div> : <>
      <p role="status">{rows.length} {rows.length === 1 ? 'formation affichée' : 'formations affichées'} sur {data.intakes.length}</p>
      <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Formation</th><th>Niveau</th><th>Année</th><th>Ouverture</th><th>Pièces obligatoires</th><th>Action</th></tr></thead><tbody>
        {rows.map(item => <tr key={item.id}>
          <td><strong>{item.program_name || item.label}</strong>{item.program_name && item.label !== `${item.program_name} · ${item.level_name}` && <div className="cell-sub">{item.label}</div>}</td>
          <td>{item.level_name || data.levels.find(level => level.id === item.level_id)?.name || 'Niveau non renseigné'}</td>
          <td>{data.years?.find(year => year.id === item.academic_year_id)?.name || 'Année non renseignée'}</td>
          <td><span className={`pill ${item.active ? 'pill-success' : 'pill-default'}`}>{item.active ? 'Ouverte' : 'Fermée'}</span></td>
          <td>{item.required_documents.length ? item.required_documents.map(key => DOCUMENT_LABELS[key] || key).join(', ') : <span className="cell-sub">Aucune pièce obligatoire</span>}</td>
          <td>{canManage ? <button type="button" className="btn btn-outline" aria-label={`Configurer : ${item.label}`} onClick={() => onConfigure(item)}>Configurer</button> : 'Consultation'}</td>
        </tr>)}
        {!rows.length && <tr><td colSpan={6}>Aucune formation ne correspond aux filtres choisis.</td></tr>}
      </tbody></ResponsiveTable></div>
    </>}
  </section>;
}

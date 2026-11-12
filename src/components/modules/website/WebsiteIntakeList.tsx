'use client';

import ResponsiveTable from '@/components/ui/ResponsiveTable';
import DataPanel from '@/components/ui/DataPanel';
import { websiteLevelGroups, type WebsiteLevelGroup } from '@/services/websiteLevelDocumentsService';
import { DOCUMENT_LABELS } from '@/services/websiteService';
import type { WebsiteIntake, WebsiteManagement } from '@/types/website';

export interface WebsiteIntakeFilters { query: string; levelId: string; programId: string; status: string; }
export const EMPTY_INTAKE_FILTERS: WebsiteIntakeFilters = { query: '', levelId: '', programId: '', status: '' };

export default function WebsiteIntakeList({ data, yearLabel, canManage, filters, onFilters, onConfigure, onConfigureLevel }: {
  data: WebsiteManagement; yearLabel: string; canManage: boolean | undefined;
  filters: WebsiteIntakeFilters; onFilters: (value: WebsiteIntakeFilters) => void;
  onConfigure: (intake: WebsiteIntake) => void; onConfigureLevel: (group: WebsiteLevelGroup) => void;
}) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const rows = data.intakes.filter(item => (!filters.levelId || item.level_id === filters.levelId)
    && (!filters.programId || item.program_id === filters.programId)
    && (!filters.status || (filters.status === 'open' ? item.active : !item.active))
    && normalize(`${item.label} ${item.program_name || ''} ${item.level_name || ''}`).includes(normalize(filters.query.trim())))
    .sort((a, b) => (a.program_name || a.label).localeCompare(b.program_name || b.label, 'fr', { numeric: true })
      || (a.level_name || '').localeCompare(b.level_name || '', 'fr', { numeric: true }));
  const levels = websiteLevelGroups(data);
  const opened = data.intakes.filter(item => item.active).length;
  const filtered = Object.values(filters).some(Boolean);
  return <><DataPanel title="Pièces par niveau" label="Pièces communes par niveau"
    description={`Pour ${yearLabel}, les pièces d’un niveau sont communes à toutes les filières. Configurez-les une seule fois ici.`}
    meta={<span className="pill pill-default">{levels.length} niveau(x)</span>}
    toolbar={canManage && data.level_document_rules === undefined ? <p role="status" className="info-box">La configuration des pièces communes est indisponible. Les règles existantes restent consultables.</p> : undefined}>
    {!levels.length ? <p>Aucun niveau proposé pour cette année.</p> : <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Niveau</th><th>Année</th><th>Filières concernées</th><th>Pièces communes</th><th>Action</th></tr></thead><tbody>{levels.map(group => <tr key={group.key}><td><strong>{group.levelName}</strong></td><td>{group.yearName}</td><td>{new Set(group.intakes.map(item => item.program_id)).size} filière(s)</td><td>{group.conflicting ? <span className="pill pill-warning">Différences à harmoniser</span> : <>{group.documents.length ? group.documents.map(key => DOCUMENT_LABELS[key] || key).join(', ') : 'Aucune pièce obligatoire'}{!group.rule && <div className="cell-sub">À confirmer pour le niveau</div>}</>}</td><td>{canManage && <button className="btn btn-outline" disabled={data.level_document_rules === undefined || !group.yearId} aria-label={`Configurer les pièces : ${group.levelName} · ${group.yearName}`} onClick={() => onConfigureLevel(group)}>Configurer les pièces</button>}</td></tr>)}</tbody></ResponsiveTable></div>}
  </DataPanel><DataPanel title="Filières proposées à l’inscription" label="Configuration des formations"
    description={`Année consultée : ${yearLabel}. Gérez l’ouverture de chaque formation ; les pièces sont définies dans « Pièces par niveau ».`}
    meta={<span className="pill pill-default">{new Set(data.intakes.map(item => item.program_id)).size} filière(s)</span>}
    footer={`${rows.length} ${rows.length === 1 ? 'formation affichée' : 'formations affichées'} sur ${data.intakes.length}`}
    toolbar={<><div className="panel-filter-grid">
      <label className="form-group">Rechercher une formation<input className="input" type="search" placeholder="Filière, niveau ou libellé" value={filters.query} onChange={event => onFilters({ ...filters, query: event.target.value })} /></label>
      <label className="form-group">Filtrer par filière<select className="select-input" value={filters.programId} onChange={event => onFilters({ ...filters, programId: event.target.value })}><option value="">Toutes les filières</option>{data.programs.filter(program => data.intakes.some(item => item.program_id === program.id)).map(program => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
      <label className="form-group">Filtrer par niveau<select className="select-input" value={filters.levelId} onChange={event => onFilters({ ...filters, levelId: event.target.value })}><option value="">Tous les niveaux</option>{data.levels.filter(level => data.intakes.some(item => item.level_id === level.id)).map(level => <option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
      <label className="form-group">Ouverture sur le site<select className="select-input" value={filters.status} onChange={event => onFilters({ ...filters, status: event.target.value })}><option value="">Tous les états</option><option value="open">Ouvertes</option><option value="closed">Fermées</option></select></label>
    </div><div className="panel-filter-options"><div className="btn-group" role="group" aria-label="Bilan des formations"><span className="pill pill-success">{opened} {opened === 1 ? 'ouverte' : 'ouvertes'}</span><span className="pill pill-default">{data.intakes.length - opened} {data.intakes.length - opened === 1 ? 'fermée' : 'fermées'}</span></div>{filtered && <button type="button" className="btn btn-outline" onClick={() => onFilters(EMPTY_INTAKE_FILTERS)}>Réinitialiser les filtres</button>}</div></>}>
    {!data.intakes.length ? <div className="empty-state"><strong>Aucune formation pour {yearLabel}</strong><span>Préparez les formations dans « Année scolaire » avant de configurer les inscriptions du site.</span></div> : <>
        <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Filière</th><th>Niveau</th><th>Année</th><th>Ouverture</th><th>Pièces</th><th>Action</th></tr></thead><tbody>{rows.map(item => <tr key={item.id}>
          <td><strong>{item.program_name || data.programs.find(program => program.id === item.program_id)?.name || item.label}</strong></td><td>{item.level_name || data.levels.find(level => level.id === item.level_id)?.name}</td><td>{data.years?.find(year => year.id === item.academic_year_id)?.name || 'Année non renseignée'}</td>
          <td><span className={`pill ${item.active ? 'pill-success' : 'pill-default'}`}>{item.active ? 'Ouverte' : 'Fermée'}</span></td><td>Communes au niveau</td>
          <td>{canManage ? <button type="button" className="btn btn-outline" aria-label={`Configurer l’ouverture : ${item.label}`} onClick={() => onConfigure(item)}>Configurer l’ouverture</button> : 'Consultation'}</td>
        </tr>)}{!rows.length && <tr><td colSpan={6}>Aucune formation ne correspond aux filtres choisis.</td></tr>}</tbody></ResponsiveTable></div>
    </>}
  </DataPanel></>;
}

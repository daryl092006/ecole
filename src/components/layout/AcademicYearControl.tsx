'use client';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import { YEAR_STATUS_LABELS } from '@/types/academicYearContext';
export default function AcademicYearControl() {
  const portal = usePortal(); const context = portal.academicYearContext;
  const visible = portal.perms.permissions.length > 0 || portal.perms.scope.ownDataOnly;
  if (!visible) return null;
  const current = context?.years.find(year => year.id === context.currentYearId);
  const selectedValue = current && portal.academicYearSelection === current.id ? 'current' : portal.academicYearSelection;
  return <div className="academic-year-control"><label htmlFor="consulted-academic-year">Année consultée</label><select id="consulted-academic-year" aria-label="Année consultée" className="select-input" value={selectedValue} onChange={event => {
    if (document.querySelector('.work-page') && !window.confirm('Changer d’année ferme le formulaire ou le dossier ouvert. Continuer ?')) return;
    portal.changeAcademicYearSelection(event.target.value);
  }}>
    <option value="current">{current ? `Année de travail : ${current.name}` : context?.currentYearConfigured ? 'Mes années autorisées · consultation' : 'Choisir une année scolaire'}</option>
    <option value="all">Toutes les années · consultation</option>
    {(context?.years || []).filter(year => year.id !== current?.id).map(year => <option key={year.id} value={year.id}>{year.name} · {YEAR_STATUS_LABELS[year.status]}</option>)}
  </select>{current && selectedValue !== 'current' && <span className="cell-sub">Année de travail : {current.name}</span>}{portal.globalAccess && (portal.perms.permissions.includes('academic.year.open') || portal.perms.permissions.includes('academic.structure.manage')) && <Link href="/academique/referentiel?collection=academic_years">Gérer</Link>}</div>;
}

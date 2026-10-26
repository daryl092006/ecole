import SecondaryDetails from '@/components/ui/SecondaryDetails';
import IconButton from '@/components/ui/IconButton';
import { focusForm } from '@/utils/formFocus';
import { useRef, useState } from 'react';
import type { AcademicYear, RoleName } from '@/types';
import { createAcademicYear, transitionAcademicYear, updateAcademicYear, type AcademicYearInput } from '@/services/academicYearService';
import { hasPermission } from '@/permissions/rolePermissions';
import { usePortal } from '@/hooks/usePortal';

interface AcademicYearsPanelProps {
  academicYears: AcademicYear[];
  actorRole: RoleName;
  onChange: (years: AcademicYear[]) => void;
}

const EMPTY_FORM: AcademicYearInput = { label: '', startDate: '', endDate: '' };
const STATUS_LABELS: Record<AcademicYear['status'], string> = {
  BROUILLON: 'Brouillon',
  OUVERTE: 'Ouverte',
  EN_CLOTURE: 'En clôture',
  CLOTUREE: 'Clôturée',
};

export default function AcademicYearsPanel({ academicYears, actorRole, onChange }: AcademicYearsPanelProps) {
  const portal = usePortal();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<AcademicYearInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AcademicYearInput | 'form', string>>>({});
  const [message, setMessage] = useState('');
  const [closingId, setClosingId] = useState('');
  const [closingReason, setClosingReason] = useState('');

  const editingYear = academicYears.find(year => year.id === editingId);
  const updateField = (field: keyof AcademicYearInput, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined, form: undefined }));
    setMessage('');
  };
  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
  };
  const edit = (year: AcademicYear) => {
    setEditingId(year.id);
    focusForm(formRef.current);
    setForm({ label: year.label, startDate: year.startDate, endDate: year.endDate });
    setErrors({});
    setMessage('');
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (editingYear && portal.references.semesters.some(item => item.academicYearId === editingYear.id && (item.startDate < form.startDate || item.endDate > form.endDate))) { setErrors({ form: 'Les dates doivent conserver les semestres existants dans l’année.' }); return; }
    const context = { actor: actorRole, role: actorRole };
    const result = editingYear
      ? updateAcademicYear(academicYears, editingYear, form, context)
      : createAcademicYear(academicYears, form, context);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    onChange(editingYear
      ? academicYears.map(year => year.id === result.academicYear.id ? result.academicYear : year)
      : [...academicYears, result.academicYear]);
    portal.logEvent('Enregistrement année', JSON.stringify({ entity: result.academicYear.id, oldValue: editingYear || null, newValue: result.academicYear }));
    setMessage(editingYear ? 'Année scolaire modifiée et historique mis à jour.' : 'Année scolaire créée au statut Brouillon.');
    reset();
  };
  const openYear = (year: AcademicYear) => {
    setErrors({});
    setMessage('');
    try {
      const openedYear = transitionAcademicYear(year, 'OUVERTE', {
        actor: actorRole,
        role: actorRole,
        reason: 'Ouverture officielle de l’année scolaire',
      });
      onChange(academicYears.map(item => item.id === openedYear.id ? openedYear : item));
      portal.logEvent('Ouverture année', JSON.stringify({ entity: year.id, oldValue: year.status, newValue: openedYear.status }));
      setMessage(`L’année ${year.label} est maintenant ouverte et active.`);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Impossible d’ouvrir cette année.' });
    }
  };

  return <>
    <div className="card-header">
      <div><h2>Années scolaires</h2></div>
    </div>
    <form ref={formRef} className="academic-year-form" onSubmit={submit} noValidate>
      <div className="form-group">
        <label className="form-label" htmlFor="academic-year-label">Libellé</label>
        <input id="academic-year-label" className="input" value={form.label} onChange={event => updateField('label', event.target.value)} placeholder="Ex. 2027-2028" />
        {errors.label && <span className="field-error">{errors.label}</span>}
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="academic-year-start">Date de début</label>
        <input id="academic-year-start" type="date" className="input" value={form.startDate} onChange={event => updateField('startDate', event.target.value)} />
        {errors.startDate && <span className="field-error">{errors.startDate}</span>}
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="academic-year-end">Date de fin</label>
        <input id="academic-year-end" type="date" className="input" value={form.endDate} onChange={event => updateField('endDate', event.target.value)} />
        {errors.endDate && <span className="field-error">{errors.endDate}</span>}
      </div>
      <div className="btn-group academic-year-form-actions">
        {editingId && <button type="button" className="btn btn-outline" onClick={reset}>Annuler</button>}
        <button type="submit" className="btn btn-primary">{editingId ? 'Enregistrer les modifications' : 'Créer en brouillon'}</button>
      </div>
    </form>
    {errors.form && <div className="restricted-box mb-2">{errors.form}</div>}
    {message && <div className="info-box mb-2">{message}</div>}
    <div className="academic-year-list">
      {!academicYears.length && <div className="empty-state"><strong>Aucune année scolaire</strong><span>Créez une année en brouillon, puis ouvrez-la pour commencer les inscriptions et les enseignements.</span></div>}
      {academicYears.map(year => <article key={year.id} className="academic-year-item">
        <div>
          <div className="flex items-center gap-2"><strong>{year.label}</strong><span className={`pill ${year.status === 'OUVERTE' ? 'pill-success' : year.status === 'CLOTUREE' ? 'pill-default' : 'pill-warning'}`}>{STATUS_LABELS[year.status]}</span></div>
          <div className="cell-sub">Du {year.startDate} au {year.endDate} · {year.active ? 'Année active' : 'Non active'}</div>
        </div>
        <div className="btn-group">
          {year.status !== 'CLOTUREE' && <IconButton type="button" className="btn btn-sm btn-outline" onClick={() => edit(year)} label="Modifier" />}
          {year.status === 'BROUILLON' && hasPermission(actorRole, 'academic.year.open') && <button type="button" className="btn btn-sm btn-primary" onClick={() => openYear(year)}>Ouvrir l’année</button>}
          {['OUVERTE', 'EN_CLOTURE'].includes(year.status) && hasPermission(actorRole, 'academic.year.open') && <button type="button" className="btn btn-sm btn-outline" onClick={() => { setClosingId(year.id); setClosingReason(''); }}>{year.status === 'OUVERTE' ? 'Préparer la clôture' : 'Clôturer l’année'}</button>}
        </div>
        <SecondaryDetails className="academic-year-history" title={`Historique (${year.history.length})`}>
          {year.history.map(entry => <div key={entry.id} className="history-entry">
            <strong>{entry.action.replaceAll('_', ' ')}</strong> · {new Date(entry.dateTime).toLocaleString('fr-FR')} · {entry.role}
            {entry.reason && <div className="cell-sub">Motif : {entry.reason}</div>}
          </div>)}
        </SecondaryDetails>
      </article>)}
    </div>
    {closingId && <form className="mt-2" onSubmit={event => {
      event.preventDefault(); try {
        const year = academicYears.find(item => item.id === closingId); if (!year) return;
        const assignments = portal.campus.data.assignments.filter(item => item.academicYearId === year.id).map(item => item.id);
        if (year.status === 'EN_CLOTURE' && portal.evaluations.some(item => assignments.includes(item.classId) && item.status !== 'PUBLIEES')) throw new Error('Publiez toutes les évaluations de cette année avant la clôture définitive.');
        const evaluations = portal.evaluations.filter(item => assignments.includes(item.classId)).map(item => item.id);
        if (year.status === 'EN_CLOTURE' && portal.reclamations.some(item => evaluations.includes(item.evaluationId) && item.status !== 'CLOTUREE')) throw new Error('Clôturez les réclamations en cours avant la clôture définitive.');
        const target = year.status === 'OUVERTE' ? 'EN_CLOTURE' : 'CLOTUREE';
        const updated = transitionAcademicYear(year, target, { actor: actorRole, role: actorRole, reason: closingReason });
        onChange(academicYears.map(item => item.id === updated.id ? updated : item)); portal.logEvent('Clôture année', JSON.stringify({ entity: year.id, oldValue: year.status, newValue: target, reason: closingReason })); setClosingId(''); setMessage('Statut de l’année mis à jour.');
      } catch (error) { setErrors({ form: error instanceof Error ? error.message : 'Clôture impossible.' }); }
    }}><label className="form-group">Motif de clôture<textarea autoFocus required minLength={3} className="input" value={closingReason} onChange={event => setClosingReason(event.target.value)} /></label><div className="btn-group"><button className="btn btn-primary">Confirmer le changement de statut</button><IconButton type="button" className="btn btn-outline" onClick={() => setClosingId('')} label="Fermer" /></div></form>}
  </>;
}

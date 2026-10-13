import { useState } from 'react';
import type { AcademicYear, RoleName } from '@/types';
import { createAcademicYear, transitionAcademicYear, updateAcademicYear, type AcademicYearInput } from '@/services/academicYearService';
import { hasPermission } from '@/permissions/rolePermissions';

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
  const [form, setForm] = useState<AcademicYearInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AcademicYearInput | 'form', string>>>({});
  const [message, setMessage] = useState('');

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
    setForm({ label: year.label, startDate: year.startDate, endDate: year.endDate });
    setErrors({});
    setMessage('');
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const context = { actor: 'Utilisateur de démonstration', role: actorRole };
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
    setMessage(editingYear ? 'Année scolaire modifiée et historique mis à jour.' : 'Année scolaire créée au statut Brouillon.');
    reset();
  };
  const openYear = (year: AcademicYear) => {
    setErrors({});
    setMessage('');
    try {
      const openedYear = transitionAcademicYear(year, 'OUVERTE', {
        actor: 'Utilisateur de démonstration',
        role: actorRole,
        reason: 'Ouverture officielle de l’année scolaire',
      });
      onChange(academicYears.map(item => item.id === openedYear.id ? openedYear : item));
      setMessage(`L’année ${year.label} est maintenant ouverte et active.`);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Impossible d’ouvrir cette année.' });
    }
  };

  return <>
    <div className="card-header">
      <div><h2>Années scolaires</h2><div className="cell-sub">Création indépendante avec dates, statut et historique local.</div></div>
    </div>
    <form className="academic-year-form" onSubmit={submit} noValidate>
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
      {academicYears.map(year => <article key={year.id} className="academic-year-item">
        <div>
          <div className="flex items-center gap-2"><strong>{year.label}</strong><span className={`pill ${year.status === 'OUVERTE' ? 'pill-success' : year.status === 'CLOTUREE' ? 'pill-default' : 'pill-warning'}`}>{STATUS_LABELS[year.status]}</span></div>
          <div className="cell-sub">Du {year.startDate} au {year.endDate} · {year.active ? 'Année active' : 'Non active'}</div>
        </div>
        <div className="btn-group">
          {year.status !== 'CLOTUREE' && <button type="button" className="btn btn-sm btn-outline" onClick={() => edit(year)}>Modifier</button>}
          {year.status === 'BROUILLON' && hasPermission(actorRole, 'academic.year.open') && <button type="button" className="btn btn-sm btn-primary" onClick={() => openYear(year)}>Ouvrir l’année</button>}
        </div>
        <details className="academic-year-history">
          <summary>Historique ({year.history.length})</summary>
          {year.history.map(entry => <div key={entry.id} className="history-entry">
            <strong>{entry.action.replaceAll('_', ' ')}</strong> · {new Date(entry.dateTime).toLocaleString('fr-FR')} · {entry.role}
            {entry.reason && <div className="cell-sub">Motif : {entry.reason}</div>}
          </div>)}
        </details>
      </article>)}
    </div>
    <div className="info-box mt-2">Le Directeur Académique peut ouvrir une année en brouillon après vérification. La préparation de clôture et la clôture restent indisponibles tant que le rôle habilité n’est pas confirmé.</div>
  </>;
}

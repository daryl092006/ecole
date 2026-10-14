import FormFeedback from '@/components/ui/FormFeedback';
import { useFeedback } from '@/hooks/useFeedback';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import type { InstitutionSettings } from '@/types/application';
import { workflowError } from '@/utils/workflowError';
export default function AcademicSettingsPanel() {
  const state = usePortal(); const [form, setForm] = useState<InstitutionSettings>({ ...state.campus.data.settings[0] }); const [feedback, setFeedback, feedbackError] = useFeedback();
  const change = <K extends keyof InstitutionSettings>(key: K, value: InstitutionSettings[K]) => { setForm(previous => ({ ...previous, [key]: value })); setFeedback(''); };
  return <div><div className="module-header"><h1>Paramètres de l’établissement</h1></div>
    <form className="card card-full" onSubmit={event => { event.preventDefault(); try { state.campus.runWorkflow('settings.update', form); setFeedback('Paramètres enregistrés. Les décisions de jury existantes conservent leurs règles d’origine.'); } catch (error) { setFeedback(workflowError(error), true); } }}>
      <h2>Informations institutionnelles</h2><div className="form-grid">{(['name', 'address', 'phone', 'email', 'receiptPrefix'] as const).map(key => <label className="form-group" key={key}>{({ name: 'Nom de l’établissement', address: 'Adresse', phone: 'Téléphone (+228)', email: 'Email', receiptPrefix: 'Préfixe des reçus' })[key]}<input className="input" required={key === 'name' || key === 'receiptPrefix'} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={form[key]} onChange={event => change(key, event.target.value)} /></label>)}</div>
      <h2 className="mt-2">Règles de délibération</h2><div className="form-grid">{([{ key: 'passMark', label: 'Moyenne de validation /20', min: 1, max: 20 }, { key: 'eliminationMark', label: 'Note éliminatoire /20', min: 0, max: 20 }, { key: 'creditsPerSemester', label: 'Crédits attendus par semestre', min: 1, max: 60 }, { key: 'examWeight', label: 'Poids des examens (%)', min: 1, max: 99 }] as const).map(item => <label className="form-group" key={item.key}>{item.label}<input className="input" required type="number" step={item.key === 'passMark' || item.key === 'eliminationMark' ? '0.5' : '1'} min={item.min} max={item.max} value={form[item.key]} onChange={event => change(item.key, Number(event.target.value))} /></label>)}</div>
      <label className="checkbox-field"><input type="checkbox" checked={form.compensation} onChange={event => change('compensation', event.target.checked)} /> Autoriser la compensation entre UE du semestre, sous réserve du seuil éliminatoire</label>
      <p className="cell-sub">Contrôle continu : {100 - form.examWeight} %. Rattrapage : meilleure moyenne conservée. UE : pondération par coefficients.</p>
      <label className="form-group">Référence ou motif du règlement<textarea className="input" minLength={3} maxLength={1000} required value={form.rulesReason} onChange={event => change('rulesReason', event.target.value)} placeholder="Règlement pédagogique de l’établissement, année et décision de validation" /></label>
      <label className="checkbox-field"><input type="checkbox" checked={form.rulesApproved} onChange={event => change('rulesApproved', event.target.checked)} /> Je valide ces règles pour les prochaines délibérations</label>
      <button className="btn btn-primary mt-2">Enregistrer les paramètres</button><FormFeedback message={feedback} error={feedbackError} />
    </form></div>;
}

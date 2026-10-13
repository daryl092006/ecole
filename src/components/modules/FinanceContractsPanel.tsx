import FormFeedback from '@/components/ui/FormFeedback';
import { useFeedback } from '@/hooks/useFeedback';
import { focusForm } from '@/utils/formFocus';
import { useRef, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { fmtMoney } from '@/hooks/useAppState';
import { workflowError } from '@/utils/workflowError';
export default function FinanceContractsPanel() {
  const state = usePortal(); const { data, runWorkflow } = state.campus;
  const [studentId, setStudentId] = useState(''); const [form, setForm] = useState({ tuition: '', registration: '0', other: '0', scholarshipPercent: '0', scholarshipLabel: '', reason: '' });
  const [dates, setDates] = useState(['']); const [feedback, setFeedback, feedbackError] = useFeedback();
  const formRef = useRef<HTMLFormElement>(null);
  const canEdit = state.perms.permissions.includes('payment.record');
  const selected = state.students.find(item => item.matricule === studentId); const net = Number(form.tuition) + Number(form.registration) + Number(form.other) - Math.floor(Number(form.tuition) * Number(form.scholarshipPercent) / 100);
  const selectStudent = (value: string) => {
    setStudentId(value); setFeedback(''); const student = state.students.find(item => item.matricule === value); const terms = student?.financials.terms;
    setForm({ tuition: String(terms?.tuition || student?.financials.expected || ''), registration: String(terms?.registration || 0), other: String(terms?.other || 0), scholarshipPercent: String(student?.bourse.percent || 0), scholarshipLabel: student?.bourse.type || '', reason: '' });
    setDates(student?.financials.installments.length ? student.financials.installments.map(item => item.dueDate) : ['']);
  };
  return <div><div className="module-header"><h1>Contrats, frais et bourses</h1><p>Définissez la scolarité, les frais d’inscription, les frais annexes et l’échéancier de chaque étudiant.</p></div>
    {canEdit && <form ref={formRef} className="card card-full mb-2" onSubmit={event => { event.preventDefault(); try {
      runWorkflow('finance.contract', { studentId, tuition: Number(form.tuition), registration: Number(form.registration), other: Number(form.other), scholarshipPercent: Number(form.scholarshipPercent), scholarshipLabel: form.scholarshipLabel, reason: form.reason, dates });
      setFeedback('Contrat et échéancier enregistrés. Les versements précédents sont conservés.'); setForm(previous => ({ ...previous, reason: '' }));
    } catch (error) { setFeedback(workflowError(error), true); } }}>
      <h2>Créer ou réviser un contrat</h2><label className="form-group">Étudiant<select className="select-input" required value={studentId} onChange={event => selectStudent(event.target.value)}><option value="">Sélectionner</option>{state.students.map(item => <option key={item.matricule} value={item.matricule}>{item.firstname} {item.lastname} · {item.matricule}</option>)}</select></label>
      <div className="form-grid">{([{ key: 'tuition', label: 'Scolarité annuelle (FCFA)' }, { key: 'registration', label: 'Frais d’inscription (FCFA)' }, { key: 'other', label: 'Autres frais (FCFA)' }, { key: 'scholarshipPercent', label: 'Bourse sur la scolarité (%)' }] as const).map(item => <label className="form-group" key={item.key}>{item.label}<input className="input" required type="number" min="0" max={item.key === 'scholarshipPercent' ? 100 : 1000000000} step={item.key === 'scholarshipPercent' ? '0.5' : '1'} value={form[item.key]} onChange={event => setForm({ ...form, [item.key]: event.target.value })} /></label>)}</div>
      <label className="form-group">Libellé de la bourse<input className="input" value={form.scholarshipLabel} onChange={event => setForm({ ...form, scholarshipLabel: event.target.value })} placeholder="Excellence, aide sociale, partenariat…" /></label>
      <div className="financial-summary"><span>Montant net du contrat</span><strong>{fmtMoney(Number.isFinite(net) ? net : 0)}</strong>{selected && <span>Déjà encaissé : {fmtMoney(selected.financials.paid)}</span>}</div>
      <h3 className="mt-2">Dates d’échéance</h3><p className="cell-sub">Le montant net est réparti entre les échéances. Le reliquat est affecté à la dernière.</p><div className="form-grid">{dates.map((value, index) => <label className="form-group" key={index}>Échéance {index + 1}<input className="input" type="date" required value={value} onChange={event => setDates(previous => previous.map((date, position) => position === index ? event.target.value : date))} /></label>)}</div><div className="btn-group"><button className="btn btn-outline" type="button" disabled={dates.length >= 24} onClick={() => setDates(previous => [...previous, ''])}>Ajouter une échéance</button>{dates.length > 1 && <button className="btn btn-outline" type="button" onClick={() => setDates(previous => previous.slice(0, -1))}>Retirer la dernière</button>}</div>
      <label className="form-group mt-2">Motif ou référence du contrat<textarea required minLength={3} maxLength={1000} className="input" value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} /></label><button className="btn btn-primary" disabled={!selected}>Enregistrer le contrat</button><FormFeedback message={feedback} error={feedbackError} />
    </form>}
    <div className="card card-full"><h2>Contrats de l’année courante</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Étudiant</th><th>Année</th><th>Net du contrat</th><th>Bourse</th><th>Reste</th>{canEdit && <th>Action</th>}</tr></thead><tbody>{state.students.map(item => <tr key={item.matricule}><td>{item.firstname} {item.lastname}<div className="cell-sub">{item.matricule}</div></td><td>{data.academicYears.find(year => year.id === item.academicYearId)?.label}</td><td>{item.financials.expected ? fmtMoney(item.financials.expected) : 'À définir'}{item.financials.terms && <div className="cell-sub">Inscription : {fmtMoney(item.financials.terms.registration)} · Autres : {fmtMoney(item.financials.terms.other)}</div>}</td><td>{item.bourse.active ? `${item.bourse.type} · ${item.bourse.percent}% · ${fmtMoney(item.bourse.amount)}` : 'Aucune'}</td><td>{fmtMoney(item.financials.remaining)}</td>{canEdit && <td><button className="btn btn-outline btn-sm" onClick={() => { selectStudent(item.matricule); focusForm(formRef.current); }}>{item.financials.expected ? 'Réviser' : 'Définir'}</button></td>}</tr>)}{!state.students.length && <tr><td colSpan={canEdit ? 6 : 5}>Créez les dossiers étudiants avant de définir les contrats.</td></tr>}</tbody></table></div></div>
  </div>;
}

import ActionPanel from '@/components/ui/ActionPanel';
import FormFeedback from '@/components/ui/FormFeedback';
import { useFeedback } from '@/hooks/useFeedback';
import { focusForm } from '@/utils/formFocus';
import { useRef, useState } from 'react';
import { useAcademicReferences } from '@/hooks/useAcademicReferences';
import type { RoleName, Teacher } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';
import { usePortal } from '@/hooks/usePortal';
const blank = (): Teacher => ({ id: createMockId('TEACH'), employeeNumber: '', firstname: '', lastname: '', email: '', specialty: '', active: true });
export default function TeachersPanel({ role }: { role: RoleName }) {
  const refs = useAcademicReferences(); const state = usePortal(); const [form, setForm] = useState(blank); const [feedback, setFeedback, feedbackError] = useFeedback(); const [search, setSearch] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const canEdit = hasPermission(role, 'academic.assignment.manage'); const filtered = refs.teachers.filter(item => `${item.firstname} ${item.lastname} ${item.specialty}`.toLowerCase().includes(search.toLowerCase()));
  return <div><h2>Enseignants et charge pédagogique</h2>{canEdit && <ActionPanel label="Ajouter ou modifier un enseignant"><form ref={formRef} className="mb-2" onSubmit={event => { event.preventDefault();
    try {
      if (!form.employeeNumber.trim() || !form.firstname.trim() || !form.lastname.trim()) throw new Error('Matricule, prénom et nom obligatoires.');
      if (refs.teachers.some(item => item.id !== form.id && (item.employeeNumber.toLowerCase() === form.employeeNumber.trim().toLowerCase() || (form.email && item.email.toLowerCase() === form.email.trim().toLowerCase())))) throw new Error('Matricule ou email déjà utilisé.');
      const old = refs.teachers.find(item => item.id === form.id); const updated = { ...form, employeeNumber: form.employeeNumber.trim(), firstname: form.firstname.trim(), lastname: form.lastname.trim(), email: form.email.trim(), specialty: form.specialty.trim() };
      refs.setTeachers(previous => old ? refs.updateLocalEntity(previous, updated) : refs.createLocalEntity(previous, updated));
      state.logEvent('Enseignant enregistré', JSON.stringify({ entity: form.id, oldValue: old || null, newValue: updated })); setForm(blank()); setFeedback('Enseignant enregistré.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Enregistrement impossible.', true); }
  }}><div className="form-grid">{(['employeeNumber', 'firstname', 'lastname', 'email', 'specialty'] as const).map(key => <label className="form-group" key={key}>{({ employeeNumber: 'Matricule enseignant', firstname: 'Prénom', lastname: 'Nom', email: 'Email', specialty: 'Spécialité' })[key]}<input className="input" required={['employeeNumber', 'firstname', 'lastname'].includes(key)} type={key === 'email' ? 'email' : 'text'} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}</div><label className="checkbox-field"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} /> Enseignant actif</label><div className="btn-group mt-2"><button className="btn btn-primary">Enregistrer l’enseignant</button><button className="btn btn-outline" type="button" onClick={() => setForm(blank())}>Réinitialiser le formulaire</button></div><FormFeedback message={feedback} error={feedbackError} /></form></ActionPanel>}
    <label className="form-group">Rechercher<input className="input" type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><div className="table-wrap"><table className="data-table"><thead><tr><th>Enseignant</th><th>Spécialité</th><th>Affectations actives</th><th>Statut</th>{canEdit && <th>Action</th>}</tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td>{item.firstname} {item.lastname}<div className="cell-sub">{item.employeeNumber} · {item.email}</div></td><td>{item.specialty || '—'}</td><td>{refs.assignments.filter(assignment => assignment.teacherId === item.id && assignment.active).length}</td><td>{item.active ? 'Actif' : 'Inactif'}</td>{canEdit && <td><button className="btn btn-sm btn-outline" onClick={() => { setForm({ ...item }); setFeedback(''); focusForm(formRef.current); }}>Modifier</button></td>}</tr>)}{!filtered.length && <tr><td colSpan={canEdit ? 5 : 4}>Aucun enseignant correspondant.</td></tr>}</tbody></table></div>
  </div>;
}

'use client';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import IconButton from '@/components/ui/IconButton';
import { useState } from 'react';
import type { Student } from '@/types';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';

const labels = { firstname: 'Prénom', lastname: 'Nom', email: 'Email', phone: 'Téléphone (+228)', birthDate: 'Date de naissance', nationality: 'Nationalité', address: 'Adresse', city: 'Ville', country: 'Pays' };
export default function StudentProfilePanel({ student }: { student: Student }) {
  const state = usePortal(); const [editing, setEditing] = useState(false);
  const initial = { firstname: student.firstname, lastname: student.lastname, email: student.email, phone: student.phone, gender: student.gender, birthDate: student.birthDate, nationality: student.nationality, address: student.address, city: student.city, country: student.country };
  const [form, setForm] = useState(initial); const [revision, setRevision] = useState(state.campusRevision);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const canEdit = state.perms.permissions.includes('student.update');
  return <div>
    {editing ? <WorkPage title={`Modifier le dossier · ${student.matricule}`} busy={saving} onClose={() => setEditing(false)}><ReviewedForm busy={saving} error={error} confirmLabel="Enregistrer les informations civiles" fields={[...Object.entries(labels), ['gender', 'Genre']].filter(([key]) => form[key as keyof typeof form] !== initial[key as keyof typeof initial]).map(([key, label]) => ({ label, previous: initial[key as keyof typeof initial], value: form[key as keyof typeof form] }))} consequence="Les informations civiles de ce dossier seront mises à jour et auditées. Le parcours académique, les notes et les paiements restent conservés." onConfirm={() => {
      setSaving(true); setError('');
      void state.updateStudentProfile(student.matricule, form, revision).then(() => { setEditing(false); state.reportActionOutcome({ title: 'Informations civiles enregistrées', detail: 'Le dossier a été mis à jour et la modification tracée. Vous pouvez maintenant consulter son parcours et ses pièces dans les sections du dossier.' }); }).catch(cause => setError(cause instanceof Error ? cause.message : 'Mise à jour impossible.')).finally(() => setSaving(false));
    }}><fieldset className="permission-fieldset" disabled={saving}><div className="form-grid">{(Object.keys(labels) as (keyof typeof labels)[]).map(key => <label className="form-group" key={key}>{labels[key]}<input className="input" required={key === 'firstname' || key === 'lastname'} type={key === 'birthDate' ? 'date' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}<label className="form-group">Genre<select className="select-input" value={form.gender} onChange={event => setForm({ ...form, gender: event.target.value })}><option value="">Non renseigné</option><option value="F">Féminin</option><option value="M">Masculin</option><option value="Autre">Autre</option></select></label></div><DrawerActions><button className="btn btn-primary" disabled={JSON.stringify(form) === JSON.stringify(initial)}>Vérifier les modifications</button><DrawerCloseButton className="btn btn-outline">Annuler les modifications</DrawerCloseButton></DrawerActions></fieldset></ReviewedForm></WorkPage>
      : <><dl className="record-details-grid">{Object.entries(labels).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{student[key as keyof typeof labels] || 'Non renseigné'}</dd></div>)}<div><dt>Genre</dt><dd>{student.gender || 'Non renseigné'}</dd></div></dl>{canEdit && <IconButton className="btn btn-primary" onClick={() => { setForm(initial); setRevision(state.campusRevision); setEditing(true); setError(''); }} label="Modifier les informations civiles" />}</>}
  </div>;
}

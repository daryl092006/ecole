'use client';
import PhoneInput from '@/components/ui/PhoneInput';
import CountrySelect from '@/components/ui/CountrySelect';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import { useState, type ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import type { Student } from '@/types';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';


function formatCivilValue(key: string, val: string | undefined): ReactNode {
  if (!val || !val.trim()) return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Non renseigné</span>;
  if (key === 'birthDate') {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch {}
  }
  if (key === 'gender') {
    if (val === 'F') return 'Féminin';
    if (val === 'M') return 'Masculin';
  }
  return val;
}

const labels = { firstname: 'Prénom', lastname: 'Nom', email: 'Email personnel (privé)', phone: 'Téléphone', birthDate: 'Date de naissance', nationality: 'Nationalité', address: 'Adresse', city: 'Ville', country: 'Pays' };
export default function StudentProfilePanel({ student, compact = false, onSaved }: { student: Student; compact?: boolean; onSaved?: () => void }) {
  const state = usePortal(); const [editing, setEditing] = useState(false);
  const initial = { firstname: student.firstname, lastname: student.lastname, email: student.email, phone: student.phone, gender: student.gender, birthDate: student.birthDate, nationality: student.nationality, address: student.address, city: student.city, country: student.country };
  const [form, setForm] = useState(initial); const [revision, setRevision] = useState(state.campusRevision);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const canEdit = state.perms.permissions.includes('student.update');
  return <div>
    {editing ? <WorkPage title={`Modifier le dossier · ${student.matricule}`} busy={saving} onClose={() => setEditing(false)}><ReviewedForm busy={saving} error={error} confirmLabel="Enregistrer les informations civiles" fields={[...Object.entries(labels), ['gender', 'Genre']].filter(([key]) => form[key as keyof typeof form] !== initial[key as keyof typeof initial]).map(([key, label]) => ({ label, previous: initial[key as keyof typeof initial], value: form[key as keyof typeof form] }))} consequence="Les informations civiles de ce dossier seront mises à jour et auditées. Le parcours académique, les notes et les paiements restent conservés." onConfirm={() => {
      setSaving(true); setError('');
      void state.updateStudentProfile(student.matricule, form, revision).then(() => { setEditing(false); onSaved?.(); state.reportActionOutcome({ title: 'Informations civiles enregistrées', detail: 'Le dossier a été mis à jour et la modification tracée. Vous pouvez maintenant consulter son parcours et ses pièces dans les sections du dossier.' }); }).catch(cause => setError(cause instanceof Error ? cause.message : 'Mise à jour impossible.')).finally(() => setSaving(false));
    }}><fieldset className="permission-fieldset" disabled={saving}><div className="form-grid">{(Object.keys(labels) as (keyof typeof labels)[]).map(key => key === 'phone' ? <PhoneInput key={key} label={labels[key]} value={form.phone} onChange={phone => setForm({ ...form, phone })} /> : key === 'nationality' || key === 'country' ? <CountrySelect key={key} label={labels[key]} kind={key} value={form[key]} onChange={value => setForm({ ...form, [key]: value })} /> : <label className="form-group" key={key}>{labels[key]}<input className="input" required={key === 'firstname' || key === 'lastname'} type={key === 'birthDate' ? 'date' : key === 'email' ? 'email' : 'text'} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}<label className="form-group">Genre<select className="select-input" value={form.gender} onChange={event => setForm({ ...form, gender: event.target.value })}><option value="">Non renseigné</option><option value="F">Féminin</option><option value="M">Masculin</option><option value="Autre">Autre</option></select></label></div><DrawerActions><button className="btn btn-primary" disabled={JSON.stringify(form) === JSON.stringify(initial)}>Vérifier les modifications</button><DrawerCloseButton className="btn btn-outline">Annuler les modifications</DrawerCloseButton></DrawerActions></fieldset></ReviewedForm></WorkPage>
      : <>
        {!compact && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: 'var(--text-main, #0f172a)' }}>Identité et coordonnées civiles</h2>
              <p className="cell-sub" style={{ margin: '3px 0 0' }}>Informations personnelles officielles enregistrées pour ce dossier.</p>
            </div>
            {canEdit && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={() => { setForm(initial); setRevision(state.campusRevision); setEditing(true); setError(''); }}
              >
                <Pencil size={15} />
                <span>Modifier les informations</span>
              </button>
            )}
          </div>
        )}
        {!compact && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            backgroundColor: 'var(--surface-sunken, #f8fafc)',
            padding: '20px 24px',
            borderRadius: '12px',
            border: '1px solid var(--border, #e2e8f0)',
            marginBottom: '8px'
          }}>
            {Object.entries(labels).map(([key, label]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {label}
                </span>
                <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                  {formatCivilValue(key, student[key as keyof typeof labels])}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary, #0369a1)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Email institutionnel (Pro)
                </span>
                <span className="pill pill-info" style={{ fontSize: '10px', padding: '1px 6px', fontWeight: 600 }}>M365</span>
              </div>
              <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--primary, #0369a1)' }}>
                {student.institutionalEmail || `${student.matricule.toLowerCase()}@escen.university`}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Genre / Sexe
              </span>
              <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                {formatCivilValue('gender', student.gender)}
              </span>
            </div>
          </div>
        )}
        {compact && canEdit && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => { setForm(initial); setRevision(state.campusRevision); setEditing(true); setError(''); }}
          >
            <Pencil size={13} />
            <span>Corriger les coordonnées</span>
          </button>
        )}
      </>}
  </div>;
}

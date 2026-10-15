'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
import { createStudentRecord, archiveStudentRecord } from '@/services/remoteCampusService';
import { studentPath } from '@/constants/portalRoutes';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
const emptyPerson = () => ({ firstname: '', lastname: '', email: '', phone: '', gender: '', birthDate: '', nationality: '', address: '', city: '', country: '' });
const labels = { firstname: 'Prénom', lastname: 'Nom', email: 'Email', phone: 'Téléphone', birthDate: 'Date de naissance', nationality: 'Nationalité', address: 'Adresse', city: 'Ville', country: 'Pays' };

export default function StudentCrudActions({ matricule, onCreated }: { matricule?: string; onCreated?: (matricule: string) => void }) {
  const portal = usePortal(); const router = useRouter();
  const [open, setOpen] = useState(false); const [person, setPerson] = useState(emptyPerson); const [number, setNumber] = useState(''); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  if (!portal.session || !portal.globalAccess || !portal.perms.permissions.includes('student.lifecycle.manage') || !matricule && !portal.perms.permissions.includes('student.update')) return null;
  const student = portal.students.find(row => row.matricule === matricule);
  return <><button className={`btn ${matricule ? 'btn-outline' : 'btn-primary'}`} onClick={() => { setOpen(true); setError(''); setPerson(emptyPerson()); setNumber(''); setReason(''); }}>{matricule ? 'Archiver le dossier' : 'Ajouter un dossier étudiant'}</button>
    {open && <WorkPage busy={saving} title={matricule ? 'Archiver le dossier étudiant' : 'Ajouter un dossier étudiant'} onClose={() => { if (!saving) setOpen(false); }}>
      <ReviewedForm busy={saving} error={error} danger={!!matricule} confirmLabel={matricule ? 'Confirmer l’archivage' : 'Confirmer la création du dossier'}
        fields={matricule ? [{ label: 'Étudiant', value: `${student?.firstname || ''} ${student?.lastname || ''} · ${matricule}` }, { label: 'Motif', value: reason }] : [{ label: 'Matricule officiel', value: number }, ...Object.entries(labels).map(([key, label]) => ({ label, value: person[key as keyof typeof person] }))]}
        consequence={matricule ? 'Le dossier sera retiré de l’annuaire et son accès révoqué. Les années, notes, paiements et traces existants seront conservés. Vous reviendrez à la liste des étudiants.' : onCreated ? 'L’identité et le dossier seront enregistrés. L’inscription reprendra ici avec ce dossier sélectionné ; aucun compte ni paiement ne sera créé.' : 'L’identité et le dossier seront enregistrés. Vous ouvrirez ensuite le dossier pour vérifier ses informations. Cette création ne constitue pas une inscription à une année ou à un groupe et ne crée pas un accès de connexion.'}
        onConfirm={() => {
          setSaving(true); setError('');
          void (matricule ? archiveStudentRecord(matricule, reason, portal.activeRole).then(() => { setOpen(false); portal.reportActionOutcome({ title: 'Dossier étudiant archivé', detail: `${matricule} a été retiré de l’annuaire. Ses données historiques restent conservées.` }); router.push('/etudiants'); portal.reloadCampus(); }) : createStudentRecord(number, person, portal.activeRole).then(result => { setOpen(false); if (onCreated) { portal.refreshCampus(); onCreated(result.matricule); return; } portal.reportActionOutcome({ title: 'Dossier étudiant créé', detail: `${person.firstname} ${person.lastname} · ${result.matricule}. Vérifiez maintenant les informations civiles et consultez le parcours dans les sections du dossier. Aucune inscription annuelle ni aucun accès n’a été créé automatiquement.` }); router.push(studentPath(result.matricule)); portal.reloadCampus(); })).catch(cause => setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setSaving(false));
        }}>
        <fieldset className="permission-fieldset" disabled={saving}>
          {matricule ? <><p>Vérifiez l’identité du dossier à retirer et indiquez le motif. Vous pourrez relire les conséquences avant de confirmer.</p><label className="form-group">Motif<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label></> : <><p>Renseignez l’identité officielle de la personne à inscrire. Recherchez d’abord son nom ou son matricule pour éviter un doublon. La nouvelle inscription annuelle sera confirmée dans le parcours Nouvelle inscription.</p><label className="form-group">Matricule officiel<input className="input" required maxLength={160} value={number} onChange={event => setNumber(event.target.value)} /></label><div className="form-grid">{(Object.keys(labels) as (keyof typeof labels)[]).map(key => <label className="form-group" key={key}>{labels[key]}<input className="input" required={key === 'firstname' || key === 'lastname'} maxLength={key === 'address' ? 1000 : key === 'phone' ? 80 : 160} type={key === 'birthDate' ? 'date' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={person[key]} onChange={event => setPerson({ ...person, [key]: event.target.value })} /></label>)}</div></>}
          <button className="btn btn-primary" type="submit">Vérifier les informations</button>
        </fieldset>
      </ReviewedForm>
    </WorkPage>}
  </>;
}

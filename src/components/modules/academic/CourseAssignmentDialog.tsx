'use client';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadTeachers, manageTeacher } from '@/services/remoteCampusService';
import type { TeacherDirectory } from '@/types/teachers';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import LoadingState from '@/components/ui/LoadingState';
import DrawerActions from '@/components/ui/DrawerActions';

export default function CourseAssignmentDialog({ groupId, offeringId, componentId, onClose, onSaved }: {
  groupId: string; offeringId: string; componentId: string; onClose: () => void; onSaved: (id: string) => Promise<void>;
}) {
  const portal = usePortal();
  const [directory, setDirectory] = useState<TeacherDirectory | null>(null);
  const [error, setError] = useState(''), [retry, setRetry] = useState(0), [busy, setBusy] = useState(false);
  const [teacherId, setTeacherId] = useState(''), [from, setFrom] = useState(''), [until, setUntil] = useState(''), [reason, setReason] = useState('');
  const [savedId, setSavedId] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setError('');
    void loadTeachers(portal.activeRole, controller.signal).then(data => { if (!controller.signal.aborted) setDirectory(data); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [portal.activeRole, retry]);
  const offering = directory?.offerings.find(row => row.id === offeringId);
  const valid = directory?.canManageAssignments && directory.groups.some(row => row.id === groupId && row.offeringIds.includes(offeringId)) && directory.components.some(row => row.id === componentId && row.curriculumId === offering?.curriculumId);
  return <WorkPage title="Choisir l’enseignant de ce cours" busy={busy} onClose={onClose}>
    {!directory ? error ? <div role="alert"><p>{error}</p><button className="btn btn-outline" onClick={() => setRetry(value => value + 1)}>Réessayer</button></div> : <LoadingState label="Chargement des enseignants…" /> : !valid ? <p role="alert">L’affectation n’est pas disponible pour ce groupe, cette matière ou cette année. Actualisez le planning.</p> : <ReviewedForm busy={busy} error={error} confirmLabel="Confirmer l’enseignant" fields={[
      { label: 'Groupe', value: directory.groups.find(row => row.id === groupId)?.label || '' }, { label: 'Formation', value: offering?.label || '' },
      { label: 'Matière', value: directory.components.find(row => row.id === componentId)?.label || '' }, { label: 'Enseignant', value: directory.teachers.find(row => row.id === teacherId)?.name || '' },
      { label: 'Début', value: from }, { label: 'Fin', value: until || 'Sans date de fin' }, { label: 'Motif', value: reason },
    ]} consequence="L’enseignant sera affecté à cette matière pour ce groupe et cette formation. Vous pourrez ensuite choisir le créneau du cours. Aucune séance n’est créée à cette étape." validate={() => until && until < from ? 'La fin doit être postérieure ou égale au début.' : null} onConfirm={() => {
      setBusy(true); setError('');
      let recorded = Boolean(savedId);
      void (async () => {
        let id = savedId;
        if (!id) {
          const result = await manageTeacher(portal.activeRole, { action: 'create_assignment', revision: directory.revision, teacherId, groupId, offeringId, componentId, validFrom: from, validUntil: until || null, reason });
          id = result.id; recorded = true; setSavedId(id); portal.refreshCampus();
        }
        await onSaved(id);
      })().catch(cause => setError(recorded ? `L’enseignant est enregistré. Réessayez pour actualiser le planning : ${cause.message}` : cause.message)).finally(() => setBusy(false));
    }}>
      <fieldset disabled={busy || Boolean(savedId)}>
      <p>{directory.groups.find(row => row.id === groupId)?.label} · {directory.components.find(row => row.id === componentId)?.label}</p>
      <label className="form-group">Enseignant<select aria-label="Enseignant" className="select-input" required value={teacherId} onChange={event => setTeacherId(event.target.value)}><option value="">Choisir un enseignant</option>{directory.teachers.filter(row => row.active).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      {!directory.teachers.some(row => row.active) && <p>Aucun enseignant actif. Complétez les profils dans « Enseignants et affectations » avant de programmer ce cours.</p>}
      <label className="form-group">Début de l’enseignement<input className="input" type="date" required value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label className="form-group">Fin de l’enseignement (facultative)<input className="input" type="date" min={from} value={until} onChange={event => setUntil(event.target.value)} /></label>
      <label className="form-group">Motif<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <DrawerActions><button className="btn btn-primary" disabled={busy || !directory.teachers.some(row => row.active)}>Vérifier l’enseignant</button></DrawerActions>
      </fieldset>
    </ReviewedForm>}
  </WorkPage>;
}

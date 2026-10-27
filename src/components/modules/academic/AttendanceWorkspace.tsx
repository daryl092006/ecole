'use client';

import { useEffect, useState } from 'react';
import { ROLES } from '@/types/permissions';
import { usePortal } from '@/hooks/usePortal';
import { loadAttendances, manageAttendance, loadAttendanceJustification } from '@/services/remoteCampusService';
import { ATTENDANCE_LABELS, ATTENDANCE_STATUSES, type AttendanceDirectory, type AttendanceEntry, type AttendanceJustification, type AttendanceStatus, type AttendanceCommand } from '@/types/attendanceManagement';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import HistoricalWorkspace from '@/components/modules/history/HistoricalWorkspace';
import StudentRecordDialog from '../StudentRecordDialog';

type Draft = { status: AttendanceStatus | ''; arrivedAt: string; leftAt: string; lateMinutes: string; comment: string };
type Operation = { kind: 'students' } | { kind: 'teacher' } | { kind: 'review'; justification: AttendanceJustification; decision: 'VALIDE' | 'REFUSE' };
const local = (value: string | null) => value ? new Date(Date.parse(value) - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 19) : '';
const instant = (value: string) => value ? new Date(value).toISOString() : null;
const date = (value: string | null) => value ? new Date(value).toLocaleString('fr-FR') : 'Non renseigné';
const justificationStatus = { EN_ATTENTE: 'En attente', VALIDE: 'Accepté', REFUSE: 'Refusé' };
const summary = (entry: Draft) => `${entry.status ? ATTENDANCE_LABELS[entry.status] : 'Non renseigné'} · arrivée ${entry.arrivedAt || 'non renseignée'} · départ ${entry.leftAt || 'non renseigné'} · retard ${entry.lateMinutes || 'non renseigné'} min · ${entry.comment || 'sans commentaire'}`;

export default function AttendanceWorkspace() {
  const portal = usePortal();
  const { activeRole, academicYearSelection } = portal;
  const [directory, setDirectory] = useState<AttendanceDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [operation, setOperation] = useState<Operation | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [teacher, setTeacher] = useState({ arrivedAt: '', leftAt: '', comment: '' });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileError, setFileError] = useState('');
  const [archives, setArchives] = useState(false);
  const [selectedStudentMatricule, setSelectedStudentMatricule] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setOperation(null); setArchives(false);
    void loadAttendances(activeRole, controller.signal).then(result => { if (!controller.signal.aborted) setDirectory(result); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeRole, academicYearSelection, reload]);
  if (loading) return <LoadingState label="Chargement des feuilles de présence…" variant="table" />;
  if (error || !directory) return <ErrorState title="Présences indisponibles" message={error || 'Les feuilles de présence n’ont pas pu être chargées.'} onRetry={() => setReload(value => value + 1)} />;
  if (archives) return <div><button className="btn btn-outline" onClick={() => setArchives(false)}>Revenir aux feuilles de présence</button><HistoricalWorkspace section="acad_attendance" /></div>;
  const session = directory.sessions.find(row => row.id === selectedId) || directory.sessions[0];
  const previous = (enrollmentId: string): Draft => {
    const row = session?.attendances.find(item => item.enrollmentId === enrollmentId);
    return { status: row?.status || '', arrivedAt: local(row?.arrivedAt || null), leftAt: local(row?.leftAt || null), lateMinutes: row?.lateMinutes == null ? '' : String(row.lateMinutes), comment: row?.comment || '' };
  };
  const changed = session?.students.filter(student => drafts[student.enrollmentId]?.status && JSON.stringify(drafts[student.enrollmentId]) !== JSON.stringify(previous(student.enrollmentId))) || [];
  const correcting = changed.some(student => session?.attendances.some(row => row.enrollmentId === student.enrollmentId));
  const teacherBefore = session?.teacherAttendances.find(row => row.teacherId === session.teacherId);
  const open = (next: Operation) => {
    if (!session) return;
    setOperation(next); setSaveError(''); setReason('');
    setDrafts(Object.fromEntries(session.students.map(student => [student.enrollmentId, previous(student.enrollmentId)])));
    setTeacher({ arrivedAt: local(teacherBefore?.arrivedAt || null), leftAt: local(teacherBefore?.leftAt || null), comment: teacherBefore?.comment || '' });
  };
  const title = operation?.kind === 'students' ? 'Émargement des étudiants' : operation?.kind === 'teacher' ? 'Présence enseignante'
    : operation?.kind === 'review' && operation.decision === 'VALIDE' ? 'Accepter le justificatif' : 'Refuser le justificatif';
  const validate = () => {
    if (!session || !operation) return 'Choisissez une séance.';
    if (operation.kind === 'students') {
      for (const student of session.students) {
        const draft = drafts[student.enrollmentId];
        if (!draft.status && (session.attendances.some(row => row.enrollmentId === student.enrollmentId) || draft.arrivedAt || draft.leftAt || draft.lateMinutes || draft.comment)) return `Choisissez un statut pour ${student.name}.`;
        if (draft.leftAt && (!draft.arrivedAt || draft.leftAt < draft.arrivedAt)) return `Vérifiez l’arrivée et le départ de ${student.name}.`;
      }
      if (!changed.length) return 'Renseignez ou modifiez au moins une présence.';
      if (correcting && reason.trim().length < 3) return 'Un motif de correction de 3 à 1000 caractères est obligatoire.';
    }
    if (operation.kind === 'teacher' && teacher.leftAt && teacher.leftAt <= teacher.arrivedAt) return 'Le départ enseignant doit être postérieur à son arrivée.';
    return null;
  };
  const fields = operation?.kind === 'students' ? changed.map(student => ({ label: `${student.name} · ${student.matricule}`, value: summary(drafts[student.enrollmentId]), previous: summary(previous(student.enrollmentId)) }))
    : operation?.kind === 'teacher' ? [
      { label: 'Enseignant', value: session?.teacherName || '' },
      { label: 'Arrivée', value: teacher.arrivedAt, previous: local(teacherBefore?.arrivedAt || null) },
      { label: 'Départ', value: teacher.leftAt, previous: local(teacherBefore?.leftAt || null) },
      { label: 'Commentaire', value: teacher.comment, previous: teacherBefore?.comment || '' },
    ] : operation?.kind === 'review' ? [
      { label: 'Étudiant', value: operation.justification.studentName }, { label: 'Justificatif', value: operation.justification.reason },
      { label: 'Décision', value: justificationStatus[operation.decision], previous: 'En attente' },
    ] : [];
  return <div className="attendance-workspace workspace-stack">
    <header className="page-intro"><div><h1>Feuilles de présence</h1></div>{portal.history.enabled && activeRole !== ROLES.DEL && <button className="btn btn-outline" onClick={() => setArchives(true)}>Consulter les séances historiques</button>}</header>
    {activeRole === ROLES.DEL && <p className="info-box">Vous pouvez faire l’appel de votre groupe et enregistrer les horaires du professeur prévu ou de son remplaçant. Les justificatifs sont traités par la direction académique.</p>}
    {success && <p role="status" className="attendance-success">{success}</p>}
    {fileError && <p role="alert" className="restricted-box">{fileError}</p>}
    <section className="card attendance-session-sheet"><label className="form-group">Séance<select className="select-input" value={session?.id || ''} onChange={event => setSelectedId(event.target.value)}>
      {!directory.sessions.length && <option value="">Aucune séance</option>}{directory.sessions.map(row => <option key={row.id} value={row.id}>{date(row.startsAt)} · {row.label}</option>)}
    </select></label>{!directory.selectedYearId && <p>Choisissez une année précise pour enregistrer des présences.</p>}{!session && <p>Aucune séance dans cette année et votre périmètre.</p>}
    {session && <>
      <div className="card-header"><div><h2>{session.label}</h2><p>{date(session.startsAt)} → {date(session.endsAt)} · {session.teacherName} · {session.status}</p></div>
        {session.canRecordStudents && <button className="btn btn-primary" onClick={() => open({ kind: 'students' })}>Saisir ou corriger les présences</button>}</div>
        <ResponsiveTable className="data-table"><thead><tr><th>Étudiant</th><th>Présence</th><th>Horaires</th><th>Commentaire</th></tr></thead><tbody>{session.students.map(student => {
          const attendance = session.attendances.find(row => row.enrollmentId === student.enrollmentId);
          return <tr key={student.enrollmentId}><td>
            <strong>{student.name}</strong>
            <div className="cell-sub">{student.matricule}</div>
            {portal.perms.permissions.includes('student.view') && !portal.perms.scope.ownDataOnly && student.matricule && (
              <button
                type="button"
                className="btn btn-sm btn-outline mt-1"
                onClick={() => setSelectedStudentMatricule(student.matricule)}
              >
                Dossier étudiant
              </button>
            )}
          </td><td>{attendance ? ATTENDANCE_LABELS[attendance.status] : 'Non renseignée'}</td><td>{date(attendance?.arrivedAt || null)} → {date(attendance?.leftAt || null)}{attendance?.lateMinutes != null && <div>{attendance.lateMinutes} min de retard</div>}</td><td>{attendance?.comment || '—'}{attendance?.reason && <div className="cell-sub">Motif : {attendance.reason}</div>}</td></tr>;
        })}{!session.students.length && <tr><td colSpan={4}>Aucun étudiant rattaché à ce groupe à la date de la séance.</td></tr>}</tbody></ResponsiveTable>
    </>}
    </section>
    {session && <>
      <section className="card"><h2>Présence enseignante</h2>{session.canRecordTeacher && <button className="btn btn-outline" onClick={() => open({ kind: 'teacher' })}>Enregistrer la présence enseignante</button>}
        {session.teacherAttendances.map(row => <p key={row.id}>{row.teacherName} · {date(row.arrivedAt)} → {date(row.leftAt)}{row.comment && ` · ${row.comment}`}</p>)}{!session.teacherAttendances.length && <p>Aucun horaire enseignant enregistré.</p>}
      </section>
      {activeRole !== ROLES.DEL && <section className="card card-full"><h2>Justificatifs</h2><ResponsiveTable className="data-table"><thead><tr><th>Étudiant</th><th>Justificatif</th><th>Décision</th><th>Actions</th></tr></thead><tbody>{session.justifications.map(row => <tr key={row.id}>
        <td>{row.studentName}</td><td>{row.reason}</td><td>{justificationStatus[row.status]}{row.reviewReason && <div className="cell-sub">{row.reviewReason} · {date(row.reviewedAt)}</div>}</td>
        <td><div className="btn-group">{row.hasFile && <button className="btn btn-sm btn-outline" onClick={() => { setFileError(''); void loadAttendanceJustification(activeRole, row.id).then(({ url }) => { const link = document.createElement('a'); link.href = url; link.rel = 'noopener noreferrer'; link.click(); }).catch(cause => setFileError(cause instanceof Error ? cause.message : 'Téléchargement impossible.')); }}>Télécharger la pièce</button>}
          {session.canReview && row.status === 'EN_ATTENTE' && <><button className="btn btn-sm btn-outline" onClick={() => open({ kind: 'review', justification: row, decision: 'VALIDE' })}>Accepter</button><button className="btn btn-sm btn-outline" onClick={() => open({ kind: 'review', justification: row, decision: 'REFUSE' })}>Refuser</button></>}
        </div></td></tr>)}{!session.justifications.length && <tr><td colSpan={4}>Aucun justificatif enregistré pour cette séance.</td></tr>}</tbody></ResponsiveTable>
      </section>}
      {operation && <WorkPage busy={saving} title={title} onClose={() => setOperation(null)}><ReviewedForm busy={saving} error={saveError} validate={validate} confirmLabel={`Confirmer : ${title.toLocaleLowerCase('fr')}`}
        fields={[{ label: 'Séance', value: `${session.label} · ${date(session.startsAt)}` }, ...fields, ...(operation.kind !== 'teacher' ? [{ label: 'Motif', value: reason }] : [])]}
        consequence={operation.kind === 'students' ? 'Les présences renseignées ou modifiées seront enregistrées ensemble. Les corrections conserveront leur motif, leur auteur et les valeurs avant/après.' : operation.kind === 'teacher' ? 'Les horaires enseignants seront enregistrés pour cette séance. Leur historique et leur auteur seront conservés.' : operation.decision === 'VALIDE' ? 'Le justificatif sera accepté et l’absence ou le retard deviendra justifié dans la même transaction. La décision sera conservée ; sa révision n’est pas disponible dans ce parcours.' : 'Le justificatif sera refusé avec ce motif. Le statut de présence actuel sera conservé. La décision ne pourra pas être révisée dans ce parcours.'}
        onConfirm={event => {
          event.preventDefault(); setSaving(true); setSaveError('');
          try {
            const command: AttendanceCommand = operation.kind === 'students' ? { action: 'record_students', sessionId: session.id, revision: directory.revision,
              ...(reason.trim() ? { reason: reason.trim() } : {}), entries: changed.map(student => { const draft = drafts[student.enrollmentId]; return { enrollmentId: student.enrollmentId, status: draft.status as AttendanceStatus,
                arrivedAt: instant(draft.arrivedAt), leftAt: instant(draft.leftAt), lateMinutes: draft.lateMinutes === '' ? null : Number(draft.lateMinutes), comment: draft.comment } satisfies AttendanceEntry; }) }
              : operation.kind === 'teacher' ? { action: 'record_teacher', sessionId: session.id, revision: directory.revision, arrivedAt: instant(teacher.arrivedAt)!, leftAt: instant(teacher.leftAt), comment: teacher.comment }
                : { action: 'review_justification', justificationId: operation.justification.id, decision: operation.decision, revision: directory.revision, reason: reason.trim() };
            void manageAttendance(activeRole, command).then(() => { setOperation(null); setSuccess('Enregistrement effectué. L’historique est conservé.'); setReload(value => value + 1); portal.refreshCampus(); })
              .catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setSaving(false));
          } catch { setSaveError('Vérifiez les dates et les valeurs saisies.'); setSaving(false); }
        }}>
        <fieldset className="permission-fieldset" disabled={saving}>
          {operation.kind === 'students' && <><p>Choisissez un statut pour chaque présence à enregistrer. Les lignes sans saisie restent non renseignées.</p>{session.students.map(student => {
            const draft = drafts[student.enrollmentId];
            const update = (value: Partial<Draft>) => setDrafts(current => ({ ...current, [student.enrollmentId]: { ...current[student.enrollmentId], ...value } }));
            return <fieldset key={student.enrollmentId}><legend>{student.name} · {student.matricule}</legend>
              <label className="form-group">Présence de {student.name}<select className="select-input" value={draft.status} onChange={event => update({ status: event.target.value as Draft['status'] })}><option value="">Non renseignée</option>{ATTENDANCE_STATUSES.map(status => <option key={status} value={status} disabled={status.endsWith('_JUSTIFIE') && previous(student.enrollmentId).status !== status || activeRole === ROLES.DEL && status !== previous(student.enrollmentId).status && (!['PRESENT','ABSENT','RETARD'].includes(status) || ['ABSENT_JUSTIFIE','RETARD_JUSTIFIE','DISPENSE'].includes(previous(student.enrollmentId).status))}>{ATTENDANCE_LABELS[status]}</option>)}</select></label>
              <label className="form-group">Arrivée de {student.name}<input className="input" type="datetime-local" step={1} value={draft.arrivedAt} onChange={event => update({ arrivedAt: event.target.value })} /></label>
              <label className="form-group">Départ de {student.name}<input className="input" type="datetime-local" step={1} value={draft.leftAt} onChange={event => update({ leftAt: event.target.value })} /></label>
              <label className="form-group">Retard de {student.name} (minutes)<input className="input" type="number" min={0} max={2147483647} step={1} value={draft.lateMinutes} onChange={event => update({ lateMinutes: event.target.value })} /></label>
              <label className="form-group">Commentaire pour {student.name}<textarea className="input" maxLength={4000} value={draft.comment} onChange={event => update({ comment: event.target.value })} /></label>
            </fieldset>;
          })}</>}
          {operation.kind === 'teacher' && <><p>{session.teacherName}</p><label className="form-group">Arrivée enseignante<input className="input" type="datetime-local" step={1} required value={teacher.arrivedAt} onChange={event => setTeacher({ ...teacher, arrivedAt: event.target.value })} /></label><label className="form-group">Départ enseignant<input className="input" type="datetime-local" step={1} value={teacher.leftAt} onChange={event => setTeacher({ ...teacher, leftAt: event.target.value })} /></label><label className="form-group">Commentaire enseignant<textarea className="input" maxLength={4000} value={teacher.comment} onChange={event => setTeacher({ ...teacher, comment: event.target.value })} /></label></>}
          {operation.kind === 'review' && <p>{operation.justification.studentName} · {operation.justification.reason}</p>}
          {operation.kind !== 'teacher' && <label className="form-group">Motif<textarea className="input" minLength={3} maxLength={1000} required={operation.kind === 'review' || correcting} value={reason} onChange={event => setReason(event.target.value)} /></label>}
          <DrawerActions><button className="btn btn-primary">Vérifier les informations</button></DrawerActions>
        </fieldset>
      </ReviewedForm></WorkPage>}
    </>}
    {selectedStudentMatricule && (
      <StudentRecordDialog
        matricule={selectedStudentMatricule}
        onClose={() => setSelectedStudentMatricule(null)}
      />
    )}
  </div>;
}

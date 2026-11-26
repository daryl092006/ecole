'use client';

import { useEffect, useState } from 'react';
import { ROLES } from '@/types/permissions';
import { usePortal } from '@/hooks/usePortal';
import { loadAttendances, manageAttendance, loadAttendanceJustification, loadCourseRecordingPlayback } from '@/services/remoteCampusService';
import { ATTENDANCE_LABELS, ATTENDANCE_STATUSES, type AttendanceDirectory, type AttendanceEntry, type AttendanceJustification, type AttendanceStatus, type AttendanceCommand } from '@/types/attendanceManagement';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import HistoricalWorkspace from '@/components/modules/history/HistoricalWorkspace';
import StudentRecordDialog from '../StudentRecordDialog';
import PageHeader from '@/components/ui/PageHeader';

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
  const [modeFilter, setModeFilter] = useState<'ALL' | 'EN_LIGNE' | 'PRESENTIEL'>('ALL');
  const [operation, setOperation] = useState<Operation | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [teacher, setTeacher] = useState({ arrivedAt: '', leftAt: '', comment: '' });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [playback, setPlayback] = useState<{ sessionId: string; title: string; url: string | null; inline: boolean; error: string } | null>(null);
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
  const filteredSessions = directory.sessions.filter(row => {
    if (modeFilter === 'EN_LIGNE') return row.mode === 'EN_LIGNE';
    if (modeFilter === 'PRESENTIEL') return row.mode !== 'EN_LIGNE';
    return true;
  });
  const session = filteredSessions.find(row => row.id === selectedId) || filteredSessions[0];
  const previous = (enrollmentId: string): Draft => {
    const row = session?.attendances.find(item => item.enrollmentId === enrollmentId);
    return { status: row?.status || '', arrivedAt: local(row?.arrivedAt || null), leftAt: local(row?.leftAt || null), lateMinutes: row?.lateMinutes == null ? '' : String(row.lateMinutes), comment: row?.comment || '' };
  };
  const changed = session?.students.filter(student => drafts[student.enrollmentId]?.status && JSON.stringify(drafts[student.enrollmentId]) !== JSON.stringify(previous(student.enrollmentId))) || [];
  const correcting = changed.some(student => session?.attendances.some(row => row.enrollmentId === student.enrollmentId));
  const teacherBefore = session?.teacherAttendances.find(row => row.teacherId === session.teacherId);
  const isStatusDisabled = (enrollmentId: string, status: AttendanceStatus) => {
    const prevStatus = previous(enrollmentId).status;
    return (
      activeRole === ROLES.DEL &&
      status !== prevStatus &&
      (!['PRESENT', 'ABSENT', 'RETARD'].includes(status) ||
        ['ABSENT_JUSTIFIE', 'RETARD_JUSTIFIE', 'DISPENSE'].includes(prevStatus))
    );
  };
  const setStudentStatus = (enrollmentId: string, status: AttendanceStatus | '') => {
    setDrafts(current => ({
      ...current,
      [enrollmentId]: { ...(current[enrollmentId] || previous(enrollmentId)), status },
    }));
  };
  const markAllStudents = (status: 'PRESENT' | 'ABSENT') => {
    if (!session) return;
    setDrafts(current => {
      const next = { ...current };
      for (const student of session.students) {
        if (!isStatusDisabled(student.enrollmentId, status)) {
          next[student.enrollmentId] = { ...(next[student.enrollmentId] || previous(student.enrollmentId)), status };
        }
      }
      return next;
    });
  };
  const open = (next: Operation, initialOverrides?: Record<string, Partial<Draft>>) => {
    if (!session) return;
    setOperation(next); setSaveError(''); setReason('');
    setDrafts(Object.fromEntries(session.students.map(student => [
      student.enrollmentId,
      { ...previous(student.enrollmentId), ...(initialOverrides?.[student.enrollmentId] || {}) },
    ])));
    setTeacher({ arrivedAt: local(teacherBefore?.arrivedAt || null), leftAt: local(teacherBefore?.leftAt || null), comment: teacherBefore?.comment || '' });
  };
  const quickMarkOnTable = (enrollmentId: string, status: AttendanceStatus) => {
    if (!session || isStatusDisabled(enrollmentId, status)) return;
    open({ kind: 'students' }, { [enrollmentId]: { status } });
  };
  const quickMarkAllOnTable = (status: 'PRESENT' | 'ABSENT') => {
    if (!session) return;
    const overrides: Record<string, Partial<Draft>> = {};
    for (const student of session.students) {
      if (!isStatusDisabled(student.enrollmentId, status)) {
        overrides[student.enrollmentId] = { status };
      }
    }
    open({ kind: 'students' }, overrides);
  };
  const statusPillClass = (status?: AttendanceStatus | '') => {
    if (!status) return 'pill pill-default';
    if (status === 'PRESENT') return 'pill pill-success';
    if (status === 'ABSENT') return 'pill pill-danger';
    if (status === 'RETARD') return 'pill pill-warning';
    return 'pill pill-info';
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
    <PageHeader
      eyebrow="ASSIDUITÉ & VIE SCOLAIRE"
      title="Feuilles de présence"
      description="Émargement des séances, pointage des heures d'arrivée et traitement des justificatifs d'absence."
    >
      {portal.history.enabled && activeRole !== ROLES.DEL && <button className="btn btn-outline" onClick={() => setArchives(true)}>Consulter les séances historiques</button>}
    </PageHeader>
    {activeRole === ROLES.DEL && <p className="info-box">Vous pouvez faire l’appel de votre groupe et enregistrer les horaires du professeur prévu ou de son remplaçant. Les justificatifs sont traités par la direction académique.</p>}
    {success && <p role="status" className="attendance-success">{success}</p>}
    {fileError && <p role="alert" className="restricted-box">{fileError}</p>}
    <section className="card attendance-session-sheet">
      <div className="form-grid">
        <label className="form-group">Modalité de séance
          <select className="select-input" value={modeFilter} onChange={event => { setModeFilter(event.target.value as 'ALL' | 'EN_LIGNE' | 'PRESENTIEL'); setSelectedId(''); }}>
            <option value="ALL">Toutes les séances ({directory.sessions.length})</option>
            <option value="EN_LIGNE">Cours en ligne ({directory.sessions.filter(row => row.mode === 'EN_LIGNE').length})</option>
            <option value="PRESENTIEL">Présentiel ({directory.sessions.filter(row => row.mode !== 'EN_LIGNE').length})</option>
          </select>
        </label>
        <label className="form-group">Séance
          <select className="select-input" value={session?.id || ''} onChange={event => setSelectedId(event.target.value)}>
            {!filteredSessions.length && <option value="">Aucune séance</option>}
            {filteredSessions.map(row => <option key={row.id} value={row.id}>{row.mode === 'EN_LIGNE' ? '[En ligne] ' : ''}{date(row.startsAt)} · {row.label}</option>)}
          </select>
        </label>
      </div>
      {!directory.selectedYearId && <p>Choisissez une année précise pour enregistrer des présences.</p>}
      {!session && <p>Aucune séance dans cette année et votre périmètre.</p>}
    {session && <>
      <div className="card-header"><div><h2>{session.label} {session.mode === 'EN_LIGNE' && <span className="pill pill-info">Cours en ligne</span>}</h2><p>{date(session.startsAt)} → {date(session.endsAt)} · {session.teacherName} · {session.status}</p>
        {session.mode === 'EN_LIGNE' && (session.meetingUrl || session.recordingUrl) && <div className="btn-group mt-1">
          {session.meetingUrl && <a className="btn btn-sm btn-outline" href={session.meetingUrl} target="_blank" rel="noopener noreferrer">Lien du cours en ligne</a>}
          {session.recordingUrl && <button type="button" className="btn btn-sm btn-outline" onClick={() => {
            const target = session;
            setPlayback({ sessionId: target.id, title: `Enregistrement · ${target.label}`, url: null, inline: false, error: '' });
            void loadCourseRecordingPlayback(activeRole, { sessionId: target.id })
              .then(result => setPlayback(current => current?.sessionId === target.id ? { ...current, url: result.url, inline: Boolean(result.inline) } : current))
              .catch(cause => setPlayback(current => current?.sessionId === target.id ? { ...current, error: cause instanceof Error ? cause.message : 'Lecture impossible.' } : current));
          }}>Voir l’enregistrement</button>}
        </div>}
      </div>
      {playback && (
        <WorkPage title={playback.title} onClose={() => setPlayback(null)}>
          {playback.error ? <p role="alert">{playback.error}</p> : playback.url && playback.inline ? (
            <video className="course-recording-player" controls playsInline preload="metadata" src={playback.url}>
              Votre navigateur ne prend pas en charge la lecture vidéo.
            </video>
          ) : playback.url ? <a className="btn btn-primary" href={playback.url} target="_blank" rel="noopener noreferrer">Ouvrir l’enregistrement</a>
            : <LoadingState label="Préparation de l’enregistrement…" />}
        </WorkPage>
      )}
        {session.canRecordStudents && (
          <div className="btn-group attendance-header-actions">
            {session.students.length > 0 && (
              <>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => quickMarkAllOnTable('PRESENT')}>
                  Tous présents
                </button>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => quickMarkAllOnTable('ABSENT')}>
                  Tous absents
                </button>
              </>
            )}
            <button type="button" className="btn btn-primary" onClick={() => open({ kind: 'students' })}>
              Saisir ou corriger les présences
            </button>
          </div>
        )}</div>
        <ResponsiveTable className="data-table attendance-sheet-table"><thead><tr><th>Étudiant</th><th>Statut</th>{session.canRecordStudents && <th>Pointage rapide</th>}<th>Détails & Commentaire</th></tr></thead><tbody>{session.students.map(student => {
          const attendance = session.attendances.find(row => row.enrollmentId === student.enrollmentId);
          const currentStatus = attendance?.status || '';
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
          </td><td><span className={statusPillClass(currentStatus)}>{attendance ? ATTENDANCE_LABELS[attendance.status] : 'Non renseignée'}</span></td>
          {session.canRecordStudents && (
            <td>
              <div className="btn-group attendance-quick-buttons">
                <button
                  type="button"
                  className={`btn btn-sm ${currentStatus === 'PRESENT' ? 'btn-primary' : 'btn-outline'}`}
                  disabled={isStatusDisabled(student.enrollmentId, 'PRESENT')}
                  onClick={() => quickMarkOnTable(student.enrollmentId, 'PRESENT')}
                >
                  Présent
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${currentStatus === 'ABSENT' ? 'btn-danger' : 'btn-outline'}`}
                  disabled={isStatusDisabled(student.enrollmentId, 'ABSENT')}
                  onClick={() => quickMarkOnTable(student.enrollmentId, 'ABSENT')}
                >
                  Absent
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${currentStatus === 'RETARD' ? 'btn-primary' : 'btn-outline'}`}
                  disabled={isStatusDisabled(student.enrollmentId, 'RETARD')}
                  onClick={() => quickMarkOnTable(student.enrollmentId, 'RETARD')}
                >
                  En retard
                </button>
              </div>
            </td>
          )}
          <td>
            {(attendance?.arrivedAt || attendance?.leftAt) ? <div>{date(attendance?.arrivedAt || null)} → {date(attendance?.leftAt || null)}</div> : null}
            {attendance?.lateMinutes != null && <div className="cell-sub">{attendance.lateMinutes} min de retard</div>}
            <div>{attendance?.comment || '—'}</div>
            {attendance?.reason && <div className="cell-sub">Motif : {attendance.reason}</div>}
          </td></tr>;
        })}{!session.students.length && <tr><td colSpan={session.canRecordStudents ? 4 : 3}>Aucun étudiant rattaché à ce groupe à la date de la séance.</td></tr>}</tbody></ResponsiveTable>
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
        fields={[{ label: 'Séance', value: `${session.label} · ${date(session.startsAt)}` }, ...fields]}
        consequence={operation.kind === 'students' ? 'Les présences renseignées ou modifiées seront enregistrées ensemble. Les corrections conserveront leur auteur et les valeurs avant/après.' : operation.kind === 'teacher' ? 'Les horaires enseignants seront enregistrés pour cette séance. Leur historique et leur auteur seront conservés.' : operation.decision === 'VALIDE' ? 'Le justificatif sera accepté et l’absence ou le retard sera immédiatement justifié. La décision sera conservée.' : 'Le justificatif sera refusé. Le statut de présence actuel sera conservé.'}
        onConfirm={event => {
          event.preventDefault(); setSaving(true); setSaveError('');
          try {
            const command: AttendanceCommand = operation.kind === 'students' ? { action: 'record_students', sessionId: session.id, revision: directory.revision,
              ...((reason.trim() || (correcting ? "Correction de présence" : "Émargement de séance")) ? { reason: reason.trim() || (correcting ? "Correction de présence" : "Émargement de séance") } : {}), entries: changed.map(student => { const draft = drafts[student.enrollmentId]; return { enrollmentId: student.enrollmentId, status: draft.status as AttendanceStatus,
                arrivedAt: instant(draft.arrivedAt), leftAt: instant(draft.leftAt), lateMinutes: draft.lateMinutes === '' ? null : Number(draft.lateMinutes), comment: draft.comment } satisfies AttendanceEntry; }) }
              : operation.kind === 'teacher' ? { action: 'record_teacher', sessionId: session.id, revision: directory.revision, arrivedAt: instant(teacher.arrivedAt)!, leftAt: instant(teacher.leftAt), comment: teacher.comment }
                : { action: 'review_justification', justificationId: operation.justification.id, decision: operation.decision, revision: directory.revision, reason: reason.trim() || (operation.decision === 'VALIDE' ? 'Validation du justificatif d’absence' : 'Refus du justificatif d’absence') };
            void manageAttendance(activeRole, command).then(() => { setOperation(null); setSuccess('Enregistrement effectué. L’historique est conservé.'); setReload(value => value + 1); portal.refreshCampus(); })
              .catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setSaving(false));
          } catch { setSaveError('Vérifiez les dates et les valeurs saisies.'); setSaving(false); }
        }}>
        <fieldset className="permission-fieldset" disabled={saving}>
          {operation.kind === 'students' && <>
            <div className="attendance-bulk-bar">
              <p>Cliquez sur <strong>Présent</strong> ou <strong>Absent</strong> pour chaque étudiant. Les lignes non cochées restent inchangées.</p>
              {session.students.length > 0 && (
                <div className="btn-group">
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => markAllStudents('PRESENT')}>
                    Tout marquer Présent
                  </button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => markAllStudents('ABSENT')}>
                    Tout marquer Absent
                  </button>
                </div>
              )}
            </div>
            <div className="attendance-student-cards">
              {session.students.map(student => {
                const draft = drafts[student.enrollmentId];
                const update = (value: Partial<Draft>) => setDrafts(current => ({ ...current, [student.enrollmentId]: { ...current[student.enrollmentId], ...value } }));
                const hasExtraDetails = Boolean(draft.arrivedAt || draft.leftAt || draft.lateMinutes || draft.comment || draft.status === 'RETARD');
                return (
                  <fieldset key={student.enrollmentId} className="attendance-student-row">
                    <legend>{student.name} · {student.matricule}</legend>
                    <div className="attendance-student-main">
                      <div className="attendance-student-identity">
                        <strong>{student.name}</strong>
                        <span className="cell-sub">{student.matricule}</span>
                      </div>
                      <div className="btn-group attendance-status-toggles" role="group" aria-label={`Boutons de présence pour ${student.name}`}>
                        <button
                          type="button"
                          className={`btn btn-sm ${draft.status === 'PRESENT' ? 'btn-primary' : 'btn-outline'}`}
                          disabled={isStatusDisabled(student.enrollmentId, 'PRESENT')}
                          onClick={() => setStudentStatus(student.enrollmentId, draft.status === 'PRESENT' ? '' : 'PRESENT')}
                        >
                          ✓ Présent
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${draft.status === 'ABSENT' ? 'btn-danger' : 'btn-outline'}`}
                          disabled={isStatusDisabled(student.enrollmentId, 'ABSENT')}
                          onClick={() => setStudentStatus(student.enrollmentId, draft.status === 'ABSENT' ? '' : 'ABSENT')}
                        >
                          ✕ Absent
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${draft.status === 'RETARD' ? 'btn-primary' : 'btn-outline'}`}
                          disabled={isStatusDisabled(student.enrollmentId, 'RETARD')}
                          onClick={() => setStudentStatus(student.enrollmentId, draft.status === 'RETARD' ? '' : 'RETARD')}
                        >
                          En retard
                        </button>
                        <label className="attendance-select-wrapper">
                          <span className="sr-only">Présence de {student.name}</span>
                          <select
                            aria-label={`Présence de ${student.name}`}
                            className="select-input attendance-compact-select"
                            value={draft.status}
                            onChange={event => update({ status: event.target.value as Draft['status'] })}
                          >
                            <option value="">Non renseignée</option>
                            {ATTENDANCE_STATUSES.map(status => (
                              <option
                                key={status}
                                value={status}
                                disabled={isStatusDisabled(student.enrollmentId, status)}
                              >
                                {ATTENDANCE_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                    <details className="attendance-extra-details" open={hasExtraDetails}>
                      <summary>Options avancées (retard en minutes, heures d’arrivée/départ, observation)</summary>
                      <div className="form-grid mt-1">
                        <label className="form-group">Retard de {student.name} (minutes)<input className="input" type="number" min={0} max={2147483647} step={1} value={draft.lateMinutes} onChange={event => update({ lateMinutes: event.target.value })} /></label>
                        <label className="form-group">Arrivée de {student.name}<input className="input" type="datetime-local" step={1} value={draft.arrivedAt} onChange={event => update({ arrivedAt: event.target.value })} /></label>
                        <label className="form-group">Départ de {student.name}<input className="input" type="datetime-local" step={1} value={draft.leftAt} onChange={event => update({ leftAt: event.target.value })} /></label>
                      </div>
                      <label className="form-group mt-1">Commentaire pour {student.name}<textarea className="input" rows={2} maxLength={4000} value={draft.comment} onChange={event => update({ comment: event.target.value })} /></label>
                    </details>
                  </fieldset>
                );
              })}
            </div>
          </>}
          {operation.kind === 'teacher' && <><p>{session.teacherName}</p><label className="form-group">Arrivée enseignante<input className="input" type="datetime-local" step={1} required value={teacher.arrivedAt} onChange={event => setTeacher({ ...teacher, arrivedAt: event.target.value })} /></label><label className="form-group">Départ enseignant<input className="input" type="datetime-local" step={1} value={teacher.leftAt} onChange={event => setTeacher({ ...teacher, leftAt: event.target.value })} /></label><label className="form-group">Commentaire enseignant<textarea className="input" maxLength={4000} value={teacher.comment} onChange={event => setTeacher({ ...teacher, comment: event.target.value })} /></label></>}
          {operation.kind === 'review' && <p>{operation.justification.studentName} · {operation.justification.reason}</p>}
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

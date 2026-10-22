'use client';

import { useEffect, useRef, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadSchedule, manageSchedule } from '@/services/remoteCampusService';
import { shiftExamAccess } from '@/services/scheduleManagementService';
import type { ManagedSession, ScheduleCommand, ScheduleDirectory, SessionMode } from '@/types/scheduleManagement';
import ConnectedDomainWorkspace from '../ConnectedDomainWorkspace';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ScheduleCalendar from '@/components/ui/ScheduleCalendar';
import ScheduleGroupFilter from '@/components/ui/ScheduleGroupFilter';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm, { type ReviewField } from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import { useSearchParams } from 'next/navigation';
import ScheduleCourseSelector from './ScheduleCourseSelector';
import CourseAssignmentDialog from './CourseAssignmentDialog';

type Action = ScheduleCommand['action'];
type Operation = { action: Action; session?: ManagedSession };
const titles: Record<Action, string> = { create_session: 'Nouvelle séance', update_session: 'Modifier la séance', move_session: 'Déplacer la séance', cancel_session: 'Annuler la séance', replace_teacher: 'Remplacer l’enseignant', block_period: 'Bloquer une période' };
// The institution uses Africa/Lome (UTC). Keep input and review independent of browser timezone.
const localTime = (value: string) => value ? new Date(value).toISOString().slice(0, 16) : '';
const iso = (value: string) => new Date(`${value}:00Z`).toISOString();
const displayTime = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lome' }).format(new Date(value));
const blank = () => ({ assignmentId: '', startsAt: '', endsAt: '', mode: 'COURS' as SessionMode, roomId: '', teacherId: '', name: '', kind: 'AUTRE' as 'AUTRE' | 'JOUR_FERIE' | 'VACANCES' | 'FERMETURE' | 'EXAMEN', siteId: '', reason: '' });

export default function ScheduleWorkspace() {
  const portal = usePortal();
  const writer = portal.perms.permissions.includes('schedule.create') || portal.perms.permissions.includes('schedule.update');
  return writer ? <ScheduleManager /> : <ConnectedDomainWorkspace section="acad_schedule" />;
}

function ScheduleManager() {
  const portal = usePortal();
  const params = useSearchParams();
  const requestedComponent = params.get('matiere') || '';
  const openedRequest = useRef('');
  const [assigning, setAssigning] = useState<{ groupId: string; offeringId: string; componentId: string } | null>(null);
  const { activeRole, academicYearSelection } = portal;
  const [directory, setDirectory] = useState<ScheduleDirectory | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0), [detail, setDetail] = useState<ManagedSession | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null), [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState('');
  const [groupSelection, setGroupSelection] = useState({ yearId: '', groupId: '' });
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setDetail(null); setOperation(null); setAssigning(null);
    void loadSchedule(activeRole, controller.signal).then(data => { if (!controller.signal.aborted) setDirectory(data); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeRole, academicYearSelection, reload]);
  useEffect(() => {
    const request = `${activeRole}:${academicYearSelection}:${requestedComponent}`;
    if (!directory?.canCreate || !requestedComponent || openedRequest.current === request || !directory.components.some(row => row.id === requestedComponent)) return;
    openedRequest.current = request; setDetail(null); setSaveError(''); setForm(blank()); setOperation({ action: 'create_session' });
  }, [directory, requestedComponent, activeRole, academicYearSelection]);
  if (loading) return <LoadingState label="Chargement du planning…" variant="cards" />;
  if (error || !directory) return <ErrorState title="Planning indisponible" message={error || 'Les séances n’ont pas pu être chargées.'} onRetry={() => setReload(value => value + 1)} />;
  const teacherName = (id: string | null) => directory.teachers.find(teacher => teacher.id === id)?.name || 'Enseignant indisponible';
  const groupName = (id: string) => directory.groups.find(group => group.id === id)?.label || String(portal.relationalSnapshot.tables.groups?.find(group => group.id === id)?.name || 'Groupe indisponible');
  const componentName = (assignmentId: string) => directory.components.find(component => component.id === directory.assignments.find(assignment => assignment.id === assignmentId)?.componentId)?.label || 'Matière';
  const assignmentName = (assignmentId: string) => {
    const assignment = directory.assignments.find(row => row.id === assignmentId);
    return assignment ? `${groupName(assignment.groupId)} · ${componentName(assignment.id)} · ${teacherName(assignment.teacherId)} · ${directory.offerings.find(offering => offering.id === assignment.offeringId)?.label || 'Formation'}` : 'Affectation indisponible';
  };
  const roomName = (id: string | null) => id ? directory.rooms.find(room => room.id === id)?.name || 'Salle indisponible' : 'En ligne';
  const open = (action: Action, session?: ManagedSession) => {
    setDetail(null); setSaveError(''); setOperation({ action, session });
    setForm({ ...blank(), siteId: directory.canBlockAllSites ? '' : directory.sites[0]?.id || '', ...(session ? {
      assignmentId: session.assignmentId, startsAt: localTime(session.startsAt), endsAt: localTime(session.endsAt), mode: session.mode,
      roomId: session.roomId || '', teacherId: session.replacementTeacherId || '',
    } : {}) });
  };
  const action = operation?.action;
  const current = operation?.session;
  const editing = action === 'create_session' || action === 'update_session';
  const timed = editing || action === 'move_session' || action === 'block_period';
  const movingExam = current?.exam && timed && form.startsAt && form.endsAt
    && (Date.parse(iso(form.startsAt)) !== Date.parse(current.startsAt) || Date.parse(iso(form.endsAt)) !== Date.parse(current.endsAt)) ? current.exam : null;
  const nextAccess = movingExam && current ? shiftExamAccess(movingExam, current.startsAt, iso(form.startsAt)) : null;
  const assignment = directory.assignments.find(row => row.id === form.assignmentId);
  const siteId = directory.offerings.find(offering => offering.id === assignment?.offeringId)?.siteId;
  const fields: ReviewField[] = [
    ...(editing ? [{ label: 'Cours', value: assignmentName(form.assignmentId), ...(current ? { previous: assignmentName(current.assignmentId) } : {}) },
      { label: 'Type de séance', value: form.mode, previous: current?.mode }, { label: 'Salle prévue', value: roomName(form.roomId || null), ...(current ? { previous: roomName(current.roomId) } : {}) }] : []),
    ...(timed ? [{ label: 'Début (heure de Lomé)', value: form.startsAt ? displayTime(iso(form.startsAt)) : '', ...(current ? { previous: displayTime(current.startsAt) } : {}) },
      { label: 'Fin (heure de Lomé)', value: form.endsAt ? displayTime(iso(form.endsAt)) : '', ...(current ? { previous: displayTime(current.endsAt) } : {}) }] : []),
    ...(movingExam && nextAccess ? [{ label: 'Épreuve déplacée', value: movingExam.name },
      { label: 'Ouverture de l’épreuve (Lomé)', value: displayTime(nextAccess.opensAt), previous: displayTime(movingExam.opensAt) },
      { label: 'Fermeture de l’épreuve (Lomé)', value: displayTime(nextAccess.closesAt), previous: displayTime(movingExam.closesAt) },
      { label: 'Durée de composition conservée', value: movingExam.durationMinutes == null ? 'Non renseignée' : `${movingExam.durationMinutes} minutes` }] : []),
    ...(action === 'cancel_session' && current ? [{ label: 'Séance', value: assignmentName(current.assignmentId) }, { label: 'Statut', value: 'ANNULE', previous: current.status }] : []),
    ...(action === 'replace_teacher' && current ? [{ label: 'Enseignant effectif', value: teacherName(form.teacherId || current.teacherId), previous: teacherName(current.replacementTeacherId || current.teacherId) }] : []),
    ...(action === 'block_period' ? [{ label: 'Intitulé', value: form.name }, { label: 'Type de période', value: form.kind }, { label: 'Site', value: directory.sites.find(site => site.id === form.siteId)?.name || 'Tous les sites' }] : []),
    { label: 'Motif', value: form.reason },
  ];
  const consequence = action === 'block_period' ? 'La période bloquera toute nouvelle séance sur ce créneau et ce périmètre dans l’année sélectionnée. Les séances existantes doivent être traitées avant ce blocage.'
    : action === 'cancel_session' ? 'La séance sera marquée annulée avec son motif et restera dans l’historique. Les émargements et les examens avec copies ou résultats protègent son annulation.'
      : action === 'replace_teacher' ? 'Seul l’enseignant effectif de cette séance changera. L’affectation d’origine et les autres séances seront conservées. Les conflits du remplaçant seront contrôlés.'
        : movingExam ? 'La séance et les horaires d’accès à l’épreuve seront déplacés ensemble, dans un seul enregistrement. La durée de composition sera conservée. Le déplacement sera refusé si l’épreuve est déjà ouverte, possède une copie ou un résultat, ou si un conflit apparaît.'
        : 'La séance sera enregistrée après contrôle du groupe, de l’enseignant, de la salle, du semestre et des périodes bloquées. Les autres séances resteront inchangées.';
  const yearId = directory.selectedYearId || '';
  const groups = [...new Map([...directory.groups, ...directory.sessions.map(session => ({ id: session.groupId, label: groupName(session.groupId) }))].map(group => [group.id, group])).values()];
  const groupId = groupSelection.yearId === yearId && groups.some(group => group.id === groupSelection.groupId) ? groupSelection.groupId : '';
  const sessions = directory.sessions.filter(session => !groupId || session.groupId === groupId);
  const active = sessions.filter(session => !['ANNULE', 'REPORTE'].includes(session.status));
  return <div className="domain-workspace">
    <div className="page-intro"><div><span className="page-eyebrow">PLANNING</span><h1>Séances et emploi du temps</h1><p>Horaires en heure de Lomé (UTC). Les conflits sont contrôlés avant enregistrement.</p></div><div className="btn-group">
      {directory.canCreate && <button className="btn btn-primary" onClick={() => open('create_session')}>Programmer un cours</button>}
      {directory.canUpdate && (directory.canBlockAllSites || directory.sites.length > 0) && <button className="btn btn-outline" onClick={() => open('block_period')}>Bloquer une période</button>}
    </div></div>
    {success && <p className="card" role="status">{success}</p>}
    {!directory.selectedYearId && <p className="restricted-box">Choisissez une année scolaire précise pour gérer le planning.</p>}
    <section className="card"><ScheduleGroupFilter groups={groups} value={groupId} onChange={id => setGroupSelection({ yearId, groupId: id })} count={active.length} /></section>
    <ScheduleCalendar period={portal.academicYearContext?.years.find(year => year.id === directory.selectedYearId)} sessions={active.map(session => ({ id: session.id, start: session.startsAt, end: session.endsAt, title: `${componentName(session.assignmentId)} · ${groupName(session.groupId)}`, subtitle: `${teacherName(session.replacementTeacherId || session.teacherId)} · ${roomName(session.actualRoomId || session.roomId)} · ${session.status}` }))} onSelect={id => setDetail(directory.sessions.find(session => session.id === id) || null)} />
    {sessions.some(session => ['ANNULE', 'REPORTE'].includes(session.status)) && <details className="card"><summary>Séances annulées ou reportées</summary>{sessions.filter(session => ['ANNULE', 'REPORTE'].includes(session.status)).map(session => <p key={session.id}><button className="btn btn-outline" onClick={() => setDetail(session)}>{displayTime(session.startsAt)} · {groupName(session.groupId)} · {session.status}</button></p>)}</details>}
    <details className="card"><summary>Périodes bloquées ({directory.blockedPeriods.length})</summary>{directory.blockedPeriods.map(period => <p key={period.id}><strong>{period.name}</strong> · {displayTime(period.startsAt)} → {displayTime(period.endsAt)} · {period.reason || 'Motif historique non renseigné'}</p>)}{!directory.blockedPeriods.length && <p>Aucune période bloquée.</p>}</details>
    {detail && <WorkPage title="Détail de la séance" onClose={() => setDetail(null)}><dl className="record-details-grid">
      <div><dt>Affectation</dt><dd>{assignmentName(detail.assignmentId)}</dd></div><div><dt>Horaires (Lomé)</dt><dd>{displayTime(detail.startsAt)} → {displayTime(detail.endsAt)}</dd></div>
      <div><dt>Enseignant effectif</dt><dd>{teacherName(detail.replacementTeacherId || detail.teacherId)}</dd></div><div><dt>Salle effective</dt><dd>{roomName(detail.actualRoomId || detail.roomId)}</dd></div>
      <div><dt>Statut</dt><dd>{detail.status}</dd></div><div><dt>Motif</dt><dd>{detail.reason || 'Non renseigné'}</dd></div></dl>
      {detail.exam && <section className="card"><h2>{detail.exam.name}</h2><p>Accès (Lomé) : {displayTime(detail.exam.opensAt)} → {displayTime(detail.exam.closesAt)}</p>{(detail.exam.hasCopies || detail.exam.hasResults) && <p className="restricted-box">Cette épreuve possède une copie ou un résultat : ses horaires ne peuvent plus être déplacés.</p>}</section>}
      {detail.hasAttendance && <p className="restricted-box">Séance déjà émargée : ses horaires, son affectation et son annulation sont protégés.</p>}
      {directory.canUpdate && !['ANNULE', 'REPORTE'].includes(detail.status) && <div className="btn-group">
        <button className="btn btn-outline" onClick={() => open('update_session', detail)}>Modifier la séance</button>
        {!detail.hasAttendance && <button className="btn btn-outline" onClick={() => open('move_session', detail)}>Déplacer la séance</button>}
        <button className="btn btn-outline" onClick={() => open('replace_teacher', detail)}>Remplacer l’enseignant</button>
        {!detail.hasAttendance && <button className="btn btn-danger" onClick={() => open('cancel_session', detail)}>Annuler la séance</button>}
      </div>}
    </WorkPage>}
    {operation && <WorkPage title={titles[operation.action]} busy={saving} onClose={() => setOperation(null)}><ReviewedForm busy={saving} error={saveError} fields={fields} consequence={consequence}
      confirmLabel={`Confirmer : ${titles[operation.action].toLocaleLowerCase('fr')}`} danger={action === 'cancel_session'}
      validate={() => editing && !assignment ? 'Choisissez le groupe, la matière et l’enseignant du cours.' : timed && form.endsAt <= form.startsAt ? 'La fin doit être postérieure au début.' : form.reason.trim().length < 3 ? 'Le motif doit contenir au moins 3 caractères.' : null}
      onConfirm={event => {
        event.preventDefault(); setSaving(true); setSaveError('');
        const common = { revision: directory.revision, reason: form.reason };
        const sessionId = current?.id || '';
        const command: ScheduleCommand = operation.action === 'block_period' ? { ...common, action: 'block_period', name: form.name, kind: form.kind, siteId: form.siteId || null, startsAt: iso(form.startsAt), endsAt: iso(form.endsAt) }
          : operation.action === 'cancel_session' ? { ...common, action: 'cancel_session', sessionId }
            : operation.action === 'replace_teacher' ? { ...common, action: 'replace_teacher', sessionId, teacherId: form.teacherId || null }
              : operation.action === 'move_session' ? { ...common, action: 'move_session', sessionId, startsAt: iso(form.startsAt), endsAt: iso(form.endsAt) }
                : { ...common, action: operation.action, ...(operation.action === 'update_session' ? { sessionId } : {}), assignmentId: form.assignmentId, roomId: form.roomId || null, mode: form.mode, startsAt: iso(form.startsAt), endsAt: iso(form.endsAt) } as ScheduleCommand;
        void manageSchedule(activeRole, command).then(() => { setOperation(null); setSuccess('Planning enregistré. Le motif et l’historique sont conservés.'); setReload(value => value + 1); portal.refreshCampus(); })
          .catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setSaving(false));
      }}>
      {editing && <>
        {action === 'create_session' ? <ScheduleCourseSelector directory={directory} assignmentId={form.assignmentId} initialGroupId={groupId} initialComponentId={params.get('matiere') || ''} canAssign={portal.perms.permissions.includes('academic.assignment.manage')} onChange={id => setForm({ ...form, assignmentId: id, roomId: '' })} onAssign={setAssigning} /> : <label className="form-group">Affectation<select className="select-input" required value={form.assignmentId} onChange={event => setForm({ ...form, assignmentId: event.target.value, roomId: '' })}><option value="">Choisir une affectation</option>{directory.assignments.filter(assignment => assignment.id === current?.assignmentId || directory.teachers.some(teacher => teacher.id === assignment.teacherId && teacher.active)).map(assignment => <option key={assignment.id} value={assignment.id}>{assignmentName(assignment.id)}</option>)}</select></label>}
        <label className="form-group">Type de séance<select className="select-input" value={form.mode} onChange={event => setForm({ ...form, mode: event.target.value as SessionMode, roomId: '' })}><option value="COURS">Cours en présentiel</option><option value="PAPIER">Épreuve sur papier</option><option value="EN_LIGNE">En ligne</option></select></label>
        {form.mode !== 'EN_LIGNE' && <label className="form-group">Salle prévue<select className="select-input" required disabled={!assignment} value={form.roomId} onChange={event => setForm({ ...form, roomId: event.target.value })}><option value="">Choisir une salle disponible</option>{directory.rooms.filter(room => room.available && (!room.siteId || room.siteId === siteId)).map(room => <option key={room.id} value={room.id}>{room.name} · {room.capacity} places</option>)}</select></label>}
      </>}
      {action === 'block_period' && <><label className="form-group">Intitulé<input className="input" required maxLength={160} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
        <label className="form-group">Type de période<select className="select-input" value={form.kind} onChange={event => setForm({ ...form, kind: event.target.value as typeof form.kind })}>{['AUTRE', 'JOUR_FERIE', 'VACANCES', 'FERMETURE', 'EXAMEN'].map(kind => <option key={kind} value={kind}>{kind}</option>)}</select></label>
        <label className="form-group">Site<select className="select-input" required={!directory.canBlockAllSites} value={form.siteId} onChange={event => setForm({ ...form, siteId: event.target.value })}>{directory.canBlockAllSites ? <option value="">Tous les sites</option> : <option value="">Choisir un site</option>}{directory.sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
      </>}
      {timed && <div className="form-grid"><label className="form-group">Début (heure de Lomé)<input className="input" type="datetime-local" required value={form.startsAt} onChange={event => setForm({ ...form, startsAt: event.target.value })} /></label><label className="form-group">Fin (heure de Lomé)<input className="input" type="datetime-local" required min={form.startsAt || undefined} value={form.endsAt} onChange={event => setForm({ ...form, endsAt: event.target.value })} /></label></div>}
      {action === 'replace_teacher' && current && <label className="form-group">Remplaçant<select className="select-input" value={form.teacherId} onChange={event => setForm({ ...form, teacherId: event.target.value })}><option value="">Enseignant d’origine : {teacherName(current.teacherId)}</option>{directory.teachers.filter(teacher => teacher.active && teacher.id !== current.teacherId).map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>}
      {action === 'cancel_session' && current && <p>{assignmentName(current.assignmentId)} · {displayTime(current.startsAt)} → ANNULE</p>}
      <label className="form-group">Motif<textarea className="input" required minLength={3} maxLength={1000} value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} /></label>
      <DrawerActions><button className="btn btn-primary">Vérifier les informations</button><DrawerCloseButton className="btn btn-outline" disabled={saving}>Annuler</DrawerCloseButton></DrawerActions>
    </ReviewedForm></WorkPage>}
    {assigning && <CourseAssignmentDialog {...assigning} onClose={() => setAssigning(null)} onSaved={async id => {
      const updated = await loadSchedule(activeRole); setDirectory(updated); setForm(value => ({ ...value, assignmentId: id, roomId: '' })); setAssigning(null);
    }} />}
  </div>;
}

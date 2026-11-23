'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import { loadSchedule, manageSchedule, updateScheduledTeacherContact, loadCourseRecordingPlayback } from '@/services/remoteCampusService';
import { teacherPersonalEmailSchema, teacherAccessMessage } from '@/services/teacherIdentityService';
import { shiftExamAccess } from '@/services/scheduleManagementService';
import type { ManagedSession, ScheduleCommand, ScheduleDirectory, SessionMode } from '@/types/scheduleManagement';
import ConnectedDomainWorkspace from '../ConnectedDomainWorkspace';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ScheduleCalendar from '@/components/ui/ScheduleCalendar';
import ScheduleDatePicker from '@/components/ui/ScheduleDatePicker';
import ScheduleGroupFilter from '@/components/ui/ScheduleGroupFilter';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm, { type ReviewField } from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import { useSearchParams } from 'next/navigation';
import ScheduleCourseSelector from './ScheduleCourseSelector';
import CourseAssignmentDialog from './CourseAssignmentDialog';
import EvaluationCreateDialog from './EvaluationCreateDialog';
import PageHeader from '@/components/ui/PageHeader';

type Action = ScheduleCommand['action'];
type Operation = { action: Action; session?: ManagedSession };
type ScheduleCadence = 'single' | 'multi';

const titles: Record<Action, string> = {
  create_session: 'Nouvelle séance',
  create_shared_course: 'Nouveau cours commun',
  update_session: 'Modifier la séance',
  move_session: 'Déplacer la séance',
  cancel_session: 'Annuler la séance',
  replace_teacher: 'Remplacer l’enseignant',
  generate_online_link: 'Lien du cours en ligne (Microsoft Teams)',
  sync_recording: 'Enregistrement du cours en ligne',
  block_period: 'Bloquer une période',
};

const QUICK_TIME_PRESETS = [
  { label: '08:00 – 10:00', start: '08:00', end: '10:00' },
  { label: '10:00 – 12:00', start: '10:00', end: '12:00' },
  { label: '08:00 – 12:00', start: '08:00', end: '12:00' },
  { label: '14:00 – 16:00', start: '14:00', end: '16:00' },
  { label: '16:00 – 18:00', start: '16:00', end: '18:00' },
  { label: '14:00 – 18:00', start: '14:00', end: '18:00' },
  { label: 'Journée (08:00 – 17:00)', start: '08:00', end: '17:00' },
] as const;

// The institution uses Africa/Lome (UTC). Keep input and review independent of browser timezone.
const localTime = (value: string) => value ? new Date(value).toISOString().slice(0, 16) : '';
const iso = (value: string) => new Date(`${value}:00Z`).toISOString();
const displayTime = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lome' }).format(new Date(value));
const blank = () => ({ assignmentId: '', startsAt: '', endsAt: '', mode: 'COURS' as SessionMode, roomId: '', teacherId: '', meetingUrl: '', recordingUrl: '', name: '', kind: 'AUTRE' as 'AUTRE' | 'JOUR_FERIE' | 'VACANCES' | 'FERMETURE' | 'EXAMEN', siteId: '', reason: '' });

export default function ScheduleWorkspace() {
  const portal = usePortal();
  const writer = portal.perms.permissions.includes('schedule.create') || portal.perms.permissions.includes('schedule.update');
  return writer ? <ScheduleManager /> : <ConnectedDomainWorkspace section="acad_schedule" />;
}

function ScheduleManager() {
  const portal = usePortal();
  const params = useSearchParams();
  const requestedComponent = params.get('matiere') || '';
  const requestedGroup = params.get('groupe') || '';
  const requestedAssignment = params.get('affectation') || '';
  const openedRequest = useRef('');
  const [assigning, setAssigning] = useState<{ groupId: string; offeringId: string; componentId: string } | null>(null);
  const [creatingExamSession, setCreatingExamSession] = useState<ManagedSession | null>(null);
  const [playback, setPlayback] = useState<{ sessionId: string; title: string; url: string | null; inline: boolean; error: string } | null>(null);
  const { activeRole, academicYearSelection } = portal;
  const [directory, setDirectory] = useState<ScheduleDirectory | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0), [detail, setDetail] = useState<ManagedSession | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null), [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactStep, setContactStep] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [groupSelection, setGroupSelection] = useState({ yearId: '', groupId: '' });

  // Explicit dates share the same time range and are sent in one transaction.
  const [cadence, setCadence] = useState<ScheduleCadence>('single');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [sharedGroupIds, setSharedGroupIds] = useState<string[]>([]);
  const [sharedComponentId, setSharedComponentId] = useState('');
  const [sharedTeacherId, setSharedTeacherId] = useState('');
  const [multiStartTime, setMultiStartTime] = useState('08:00');
  const [multiEndTime, setMultiEndTime] = useState('12:00');


  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setDetail(null); setOperation(null); setAssigning(null);
    void loadSchedule(activeRole, controller.signal).then(data => { if (!controller.signal.aborted) setDirectory(data); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeRole, academicYearSelection, reload]);

  useEffect(() => {
    const request = `${activeRole}:${academicYearSelection}:${requestedComponent}:${requestedGroup}:${requestedAssignment}`;
    if (!directory?.canCreate || openedRequest.current === request) return;
    const assignment = directory.assignments.find(row => row.id === requestedAssignment);
    const hasGroup = Boolean(requestedGroup && directory.groups.some(row => row.id === requestedGroup));
    if (!assignment && !hasGroup && (!requestedComponent || !directory.components.some(row => row.id === requestedComponent))) return;
    openedRequest.current = request; setDetail(null); setSaveError('');
    setCadence('single');
    setSelectedDates([]);
    setForm({ ...blank(), assignmentId: assignment?.id || '', mode: assignment ? params.get('mode') === 'EN_LIGNE' ? 'EN_LIGNE' : 'PAPIER' : 'COURS' });
    setOperation({ action: 'create_session' });
  }, [directory, requestedComponent, requestedGroup, requestedAssignment, activeRole, academicYearSelection, params]);

  const multiSlots = useMemo(() => {
    if (cadence !== 'multi' || !multiStartTime || !multiEndTime || multiEndTime <= multiStartTime) return [];
    return [...selectedDates].sort().map(date => ({
      date,
      startsAt: iso(date + 'T' + multiStartTime),
      endsAt: iso(date + 'T' + multiEndTime),
      label: date.split('-').reverse().join('/') + ' (' + multiStartTime + '–' + multiEndTime + ')',
    }));
  }, [cadence, selectedDates, multiStartTime, multiEndTime]);

  if (loading) return <LoadingState label="Chargement du planning…" variant="cards" />;
  if (error || !directory) return <ErrorState title="Planning indisponible" message={error || 'Les séances n’ont pas pu être chargées.'} onRetry={() => setReload(value => value + 1)} />;

  const teacherName = (id: string | null) => directory.teachers.find(teacher => teacher.id === id)?.name || 'Enseignant indisponible';
  const groupName = (id: string) => directory.groups.find(group => group.id === id)?.label || String(portal.relationalSnapshot.tables.groups?.find(group => group.id === id)?.name || 'Groupe indisponible');
  const componentName = (assignmentId: string) => directory.components.find(component => component.id === directory.assignments.find(assignment => assignment.id === assignmentId)?.componentId)?.label || 'Matière';
  const assignmentName = (assignmentId: string) => {
    const assignment = directory.assignments.find(row => row.id === assignmentId);
    return assignment ? `${groupName(assignment.groupId)} · ${componentName(assignment.id)} · ${teacherName(assignment.teacherId)} · ${directory.offerings.find(offering => offering.id === assignment.offeringId)?.label || 'Formation'}` : 'Affectation indisponible';
  };
  const sessionGroups = (session: ManagedSession) => [...new Set(session.participants.map(participant => participant.groupId))];
  const sessionGroupNames = (session: ManagedSession) => sessionGroups(session).map(groupName).join(' + ');
  const roomName = (id: string | null, mode?: SessionMode) =>
    mode === 'EN_LIGNE'
      ? 'En ligne (Microsoft Teams)'
      : id
        ? directory.rooms.find(room => room.id === id)?.name || 'Salle indisponible'
        : 'Salle non précisée';

  const open = (action: Action, session?: ManagedSession) => {
    setDetail(null); setSaveError(''); setOperation({ action, session });
    setSharedGroupIds(requestedGroup ? [requestedGroup] : groupId ? [groupId] : []);
    setSharedComponentId(requestedComponent || '');
    setSharedTeacherId('');
    setContactEmail(''); setContactStep(false); setContactMessage('');
    setCadence('single');
    setSelectedDates([]);
    setMultiStartTime('08:00');
    setMultiEndTime('12:00');

    setForm({ ...blank(), siteId: directory.canBlockAllSites ? '' : directory.sites[0]?.id || '', ...(session ? {
      assignmentId: session.assignmentId, startsAt: localTime(session.startsAt), endsAt: localTime(session.endsAt), mode: session.mode,
      roomId: session.roomId || '', teacherId: session.replacementTeacherId || '',
      meetingUrl: session.meetingUrl || '', recordingUrl: session.recordingUrl || '',
    } : {}) });
  };

  const applySingleQuickSlot = (startHour: string, endHour: string) => {
    const currentDay = form.startsAt ? form.startsAt.slice(0, 10) : (directory.assignments.find(a => a.id === form.assignmentId)?.validFrom || new Date().toISOString().slice(0, 10));
    setForm(prev => ({
      ...prev,
      startsAt: `${currentDay}T${startHour}`,
      endsAt: `${currentDay}T${endHour}`,
    }));
  };

  const action = operation?.action;
  const current = operation?.session;
  const sharedCreate = action === 'create_shared_course';
  const editing = action === 'create_session' || action === 'update_session' || sharedCreate;
  const timed = editing || action === 'move_session' || action === 'block_period';
  const isMultiCreate = (action === 'create_session' || sharedCreate) && cadence === 'multi';
  const effectiveStartsAt = isMultiCreate ? (multiSlots[0] ? localTime(multiSlots[0].startsAt) : '') : form.startsAt;
  const effectiveEndsAt = isMultiCreate ? (multiSlots[0] ? localTime(multiSlots[0].endsAt) : '') : form.endsAt;
  const effectiveReason = form.reason.trim() || (sharedCreate
    ? (isMultiCreate && multiSlots.length > 1 ? `Programmation groupée de ${multiSlots.length} séances de cours commun aux groupes sélectionnés` : 'Programmation du cours commun aux groupes sélectionnés')
    : action === 'create_session'
    ? (isMultiCreate && multiSlots.length > 1 ? `Programmation groupée de ${multiSlots.length} séances de cours` : 'Programmation pédagogique du cours')
    : action === 'update_session' ? 'Mise à jour des horaires ou de la salle du cours'
    : action === 'move_session' ? 'Déplacement de séance de cours'
    : action === 'replace_teacher' ? 'Remplacement d’enseignant pour la séance'
    : action === 'generate_online_link' ? 'Création ou mise à jour du lien de cours en ligne Teams'
    : action === 'sync_recording' ? 'Mise à disposition de l’enregistrement du cours en ligne'
    : action === 'cancel_session' ? 'Annulation de la séance de cours'
    : action === 'block_period' ? (form.name ? `Période bloquée : ${form.name}` : 'Période bloquée')
    : 'Opération sur le planning');

  const movingExam = current?.exam && timed && effectiveStartsAt && effectiveEndsAt
    && (Date.parse(iso(effectiveStartsAt)) !== Date.parse(current.startsAt) || Date.parse(iso(effectiveEndsAt)) !== Date.parse(current.endsAt)) ? current.exam : null;
  const nextAccess = movingExam && current ? shiftExamAccess(movingExam, current.startsAt, iso(effectiveStartsAt)) : null;
  const assignment = directory.assignments.find(row => row.id === form.assignmentId);
  const sharedComponent = directory.components.find(row => row.id === sharedComponentId);
  const sharedPrimaryGroup = directory.groups.find(group => group.id === sharedGroupIds[0]);
  const sharedPrimaryOffering = directory.offerings.find(offering => sharedPrimaryGroup?.offeringIds.includes(offering.id));
  const programmingTeacherId = action === 'replace_teacher' ? form.teacherId || current?.teacherId
    : action === 'move_session' ? current?.replacementTeacherId || current?.teacherId
      : sharedCreate ? sharedTeacherId || null
        : editing ? (action === 'update_session' ? current?.replacementTeacherId : null) || assignment?.teacherId : null;
  const missingContact = directory.teachers.find(teacher => teacher.id === programmingTeacherId && teacher.requiresPersonalEmail);
  const siteId = sharedCreate
    ? sharedPrimaryOffering?.siteId
    : directory.offerings.find(offering => offering.id === assignment?.offeringId)?.siteId;

  const sharedGroupOfferingCurricula = new Set(
    directory.groups
      .filter(group => sharedGroupIds.includes(group.id))
      .flatMap(group => group.offeringIds)
      .map(offId => directory.offerings.find(o => o.id === offId)?.curriculumId)
      .filter((cid): cid is string => Boolean(cid))
  );
  const candidateComponentsForShared = sharedGroupOfferingCurricula.size > 0
    ? [
        ...directory.components.filter(c => sharedGroupOfferingCurricula.has(c.curriculumId)),
        ...directory.components.filter(c => !sharedGroupOfferingCurricula.has(c.curriculumId)),
      ]
    : directory.components;
  const seenSharedSubjects = new Set<string>();
  const sharedAvailableComponents = candidateComponentsForShared.filter(comp => {
    const key = comp.subjectId || comp.id;
    if (seenSharedSubjects.has(key)) return false;
    seenSharedSubjects.add(key);
    return true;
  });
  const sharedSubjectAssignedTeacherIds = new Set(
    directory.assignments
      .filter(a => {
        const comp = directory.components.find(c => c.id === a.componentId);
        return comp && sharedComponent && (comp.subjectId === sharedComponent.subjectId || comp.id === sharedComponent.id);
      })
      .map(a => a.teacherId)
  );
  const selectedYear = portal.academicYearContext?.years.find(year => year.id === directory.selectedYearId);
  const dateMin = [selectedYear?.starts_on, !sharedCreate ? assignment?.validFrom : undefined].filter((date): date is string => Boolean(date)).sort().at(-1);
  const dateMax = [selectedYear?.ends_on, !sharedCreate ? assignment?.validUntil : undefined].filter((date): date is string => Boolean(date)).sort()[0];

  const fields: ReviewField[] = [
    ...(sharedCreate ? [
      { label: 'Groupes participants', value: sharedGroupIds.map(groupName).join(' + ') },
      { label: 'Matière', value: sharedComponent?.label || '' },
      { label: 'Enseignant', value: teacherName(sharedTeacherId) },
      { label: 'Type de séance', value: form.mode },
      { label: 'Salle prévue', value: roomName(form.roomId || null, form.mode) },
      ...(form.mode === 'EN_LIGNE' ? [{ label: 'Lien de visioconférence', value: form.meetingUrl.trim() || 'Génération automatique Microsoft Teams (@escen.university)' }] : []),
    ] : []),
    ...(current?.shared ? [{ label: 'Tous les groupes concernés', value: sessionGroupNames(current) }] : []),
    ...(editing && !sharedCreate ? [{ label: 'Cours', value: assignmentName(form.assignmentId), ...(current ? { previous: assignmentName(current.assignmentId) } : {}) },
      { label: 'Type de séance', value: form.mode, previous: current?.mode }, { label: 'Salle prévue', value: roomName(form.roomId || null, form.mode), ...(current ? { previous: roomName(current.roomId, current.mode) } : {}) }] : []),
    ...(isMultiCreate ? [
      { label: 'Nombre de séances', value: String(multiSlots.length) },
      ...multiSlots.map((slot, index) => ({ label: `Séance ${index + 1}`, value: slot.label })),
    ] : timed ? [{ label: 'Début (heure de Lomé)', value: effectiveStartsAt ? displayTime(iso(effectiveStartsAt)) : '', ...(current ? { previous: displayTime(current.startsAt) } : {}) },
      { label: 'Fin (heure de Lomé)', value: effectiveEndsAt ? displayTime(iso(effectiveEndsAt)) : '', ...(current ? { previous: displayTime(current.endsAt) } : {}) }] : []),
    ...(movingExam && nextAccess ? [{ label: 'Épreuve déplacée', value: movingExam.name },
      { label: 'Ouverture de l’épreuve (Lomé)', value: displayTime(nextAccess.opensAt), previous: displayTime(movingExam.opensAt) },
      { label: 'Fermeture de l’épreuve (Lomé)', value: displayTime(nextAccess.closesAt), previous: displayTime(movingExam.closesAt) },
      { label: 'Durée de composition conservée', value: movingExam.durationMinutes == null ? 'Non renseignée' : `${movingExam.durationMinutes} minutes` }] : []),
    ...(action === 'cancel_session' && current ? [{ label: 'Séance', value: assignmentName(current.assignmentId) }, { label: 'Statut', value: 'ANNULE', previous: current.status }] : []),
    ...(action === 'replace_teacher' && current ? [{ label: 'Enseignant effectif', value: teacherName(form.teacherId || current.teacherId), previous: teacherName(current.replacementTeacherId || current.teacherId) }] : []),
    ...(action === 'generate_online_link' && current ? [
      { label: 'Séance', value: `${assignmentName(current.assignmentId)} · ${displayTime(current.startsAt)}` },
      { label: 'Lien de visioconférence', value: form.meetingUrl.trim() || 'Génération automatique Microsoft Teams (@escen.university)', previous: current.meetingUrl || 'Aucun' },
    ] : []),
    ...(action === 'sync_recording' && current ? [
      { label: 'Séance', value: `${assignmentName(current.assignmentId)} · ${displayTime(current.startsAt)}` },
      { label: 'Enregistrement (Replay)', value: form.recordingUrl.trim() || 'Synchronisation automatique Microsoft Graph / OneDrive', previous: current.recordingUrl || 'Aucun' },
    ] : []),
    ...(action === 'block_period' ? [{ label: 'Intitulé', value: form.name }, { label: 'Type de période', value: form.kind }, { label: 'Site', value: directory.sites.find(site => site.id === form.siteId)?.name || 'Tous les sites' }] : []),
  ];

  const consequence = sharedCreate ? (form.mode === 'EN_LIGNE'
    ? 'Un seul cours en ligne et un même lien de réunion seront partagés par tous les groupes sélectionnés. Aucune salle ne sera réservée ; chaque groupe conservera ses présences et sa formation.'
    : 'Un seul cours sera créé pour tous les groupes sélectionnés. La salle et l’enseignant seront réservés une seule fois ; chaque groupe conservera ses présences et sa formation.')
    : current?.shared ? 'Cette opération concerne tous les groupes de ce cours commun. Le déplacement, le remplacement de l’enseignant ou l’annulation s’applique à leur séance unique ; leurs rattachements pédagogiques restent conservés.'
    : action === 'block_period' ? 'La période bloquera toute nouvelle séance sur ce créneau et ce périmètre dans l’année sélectionnée. Les séances existantes doivent être traitées avant ce blocage.'
    : action === 'cancel_session' ? 'La séance sera marquée annulée avec son motif et restera dans l’historique. Les émargements et les examens avec copies ou résultats protègent son annulation.'
      : action === 'replace_teacher' ? 'Seul l’enseignant effectif de cette séance changera. L’affectation d’origine et les autres séances seront conservées. Les conflits du remplaçant seront contrôlés.'
        : movingExam ? 'La séance et les horaires d’accès à l’épreuve seront déplacés ensemble, dans un seul enregistrement. La durée de composition sera conservée. Le déplacement sera refusé si l’épreuve est déjà ouverte, possède une copie ou un résultat, ou si un conflit apparaît.'
        : isMultiCreate ? `Les ${multiSlots.length} séances seront créées en une seule opération après contrôle du groupe, de l’enseignant, de la salle et des périodes bloquées.`
        : 'La séance sera enregistrée après contrôle du groupe, de l’enseignant, de la salle, du semestre et des périodes bloquées. Les autres séances resteront inchangées.';

  const yearId = directory.selectedYearId || '';
  const groups = [...new Map([...directory.groups, ...directory.sessions.flatMap(session => sessionGroups(session).map(id => ({ id, label: groupName(id) })))].map(group => [group.id, group])).values()];
  const groupId = groupSelection.yearId === yearId && groups.some(group => group.id === groupSelection.groupId) ? groupSelection.groupId : '';
  const sessions = directory.sessions.filter(session => !groupId || sessionGroups(session).includes(groupId));
  const active = sessions.filter(session => !['ANNULE', 'REPORTE'].includes(session.status));

  return <div className="domain-workspace workspace-stack">
    <PageHeader
      eyebrow="PLANNING & LOGISTIQUE ACADÉMIQUE"
      title="Séances et emploi du temps"
      description="Horaires en heure de Lomé (UTC). Programmation à l’heure précise, par séance ou sur plusieurs dates."
    >
      {directory.canCreate && <><button className="btn btn-primary" onClick={() => open('create_session')}>Programmer un cours</button><button className="btn btn-outline" onClick={() => open('create_shared_course')}>Programmer un cours commun</button></>}
      {directory.canUpdate && (directory.canBlockAllSites || directory.sites.length > 0) && <button className="btn btn-outline" onClick={() => open('block_period')}>Bloquer une période</button>}
      <Link className="btn btn-outline" href="/academique/referentiel?collection=groups">Créer / gérer une classe</Link>
    </PageHeader>
    {params.get('epreuve') && <Link className="btn btn-outline mb-2" href={`/academique/examens?${new URLSearchParams({ epreuve: params.get('epreuve')!, ...(params.get('nature') === 'resit' ? { session: 'rattrapage' } : params.get('nature') === 'control' ? { session: 'controle' } : {}) })}`}>Revenir à la préparation de l’épreuve</Link>}
    {success && <p className="card" role="status">{success}</p>}
    {!directory.selectedYearId && <p className="restricted-box">Choisissez une année scolaire précise pour gérer le planning.</p>}
    <section className="card"><ScheduleGroupFilter groups={groups} value={groupId} onChange={id => setGroupSelection({ yearId, groupId: id })} count={active.length} /></section>
    <ScheduleCalendar
      period={portal.academicYearContext?.years.find(year => year.id === directory.selectedYearId)}
      sessions={active.map(session => ({
        id: session.id,
        start: session.startsAt,
        end: session.endsAt,
        title: `${componentName(session.assignmentId)} · ${sessionGroupNames(session)}`,
        subtitle: `${teacherName(session.replacementTeacherId || session.teacherId)} · ${roomName(session.actualRoomId || session.roomId, session.mode)} · ${session.status}`,
        subject: componentName(session.assignmentId),
        group: sessionGroupNames(session),
        teacher: teacherName(session.replacementTeacherId || session.teacherId),
        room: roomName(session.actualRoomId || session.roomId, session.mode),
        status: session.status,
      }))}
      onSelect={id => setDetail(directory.sessions.find(session => session.id === id) || null)}
    />
    {sessions.some(session => ['ANNULE', 'REPORTE'].includes(session.status)) && <section className="card"><h2>Séances annulées ou reportées</h2>{sessions.filter(session => ['ANNULE', 'REPORTE'].includes(session.status)).map(session => <p key={session.id}><button className="btn btn-outline" onClick={() => setDetail(session)}>{displayTime(session.startsAt)} · {sessionGroupNames(session)} · {session.status}</button></p>)}</section>}
    <section className="card"><h2>Périodes bloquées ({directory.blockedPeriods.length})</h2>{directory.blockedPeriods.map(period => <p key={period.id}><strong>{period.name}</strong> · {displayTime(period.startsAt)} → {displayTime(period.endsAt)} · {period.reason || 'Motif historique non renseigné'}</p>)}{!directory.blockedPeriods.length && <p>Aucune période bloquée.</p>}</section>
    {detail && <WorkPage title="Détail de la séance" onClose={() => setDetail(null)}><dl className="record-details-grid">
      <div><dt>Matière (Code REESAO)</dt><dd><strong>{componentName(detail.assignmentId)}</strong></dd></div>
      <div><dt>Affectation</dt><dd>{detail.participants.map(participant => assignmentName(participant.assignmentId)).join(' ; ')}</dd></div><div><dt>Horaires (Lomé)</dt><dd>{displayTime(detail.startsAt)} → {displayTime(detail.endsAt)}</dd></div>
      <div><dt>Enseignant effectif</dt><dd>{teacherName(detail.replacementTeacherId || detail.teacherId)}</dd></div><div><dt>Salle / Modalité</dt><dd>{roomName(detail.actualRoomId || detail.roomId, detail.mode)}</dd></div>
      {detail.mode === 'EN_LIGNE' && (
        <>
          <div><dt>Lien du cours en ligne</dt><dd>{detail.meetingUrl ? <a href={detail.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">Rejoindre le cours Teams</a> : 'Non généré'}</dd></div>
          <div><dt>Enregistrement (Replay)</dt><dd>{detail.recordingUrl ? <a href={detail.recordingUrl} onClick={event => {
            event.preventDefault();
            const target = detail;
            setPlayback({ sessionId: target.id, title: `Enregistrement · ${componentName(target.assignmentId)}`, url: null, inline: false, error: '' });
            void loadCourseRecordingPlayback(activeRole, { sessionId: target.id })
              .then(result => setPlayback(current => current?.sessionId === target.id ? { ...current, url: result.url, inline: Boolean(result.inline) } : current))
              .catch(cause => setPlayback(current => current?.sessionId === target.id ? { ...current, error: cause instanceof Error ? cause.message : 'Lecture impossible.' } : current));
          }} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">Accéder à l’enregistrement</a> : 'En attente d’enregistrement'}</dd></div>
        </>
      )}
      <div><dt>Statut</dt><dd>{detail.status}</dd></div><div><dt>Motif</dt><dd>{detail.reason || 'Non renseigné'}</dd></div></dl>
      {detail.exam && <section className="card"><h2>{detail.exam.name}</h2><p>Accès (Lomé) : {displayTime(detail.exam.opensAt)} → {displayTime(detail.exam.closesAt)}</p>{(detail.exam.hasCopies || detail.exam.hasResults) && <p className="restricted-box">Cette épreuve possède une copie ou un résultat : ses horaires ne peuvent plus être déplacés.</p>}</section>}
      {detail.hasAttendance && <p className="restricted-box">Séance déjà émargée : ses horaires, son affectation et son annulation sont protégés.</p>}
      {directory.canUpdate && detail.canUpdate && !['ANNULE', 'REPORTE'].includes(detail.status) && <div className="btn-group">
        {!detail.shared && !detail.exam && portal.perms.permissions.includes('evaluation.create') && (
          <button
            className="btn btn-primary"
            onClick={() => {
              const target = detail;
              setDetail(null);
              setCreatingExamSession(target);
            }}
          >
            Programmer une évaluation sur cette séance
          </button>
        )}
        {!detail.shared && <button className="btn btn-outline" onClick={() => open('update_session', detail)}>Modifier la séance</button>}
        {detail.mode === 'EN_LIGNE' && (
          <>
            <button className="btn btn-primary" onClick={() => open('generate_online_link', detail)}>
              {detail.meetingUrl ? 'Mettre à jour le lien Teams' : 'Créer le lien Teams automatiquement'}
            </button>
            <button className="btn btn-outline" onClick={() => open('sync_recording', detail)}>
              {detail.recordingUrl ? 'Modifier l’enregistrement' : 'Synchroniser / Ajouter l’enregistrement'}
            </button>
          </>
        )}
        {!detail.hasAttendance && <button className="btn btn-outline" onClick={() => open('move_session', detail)}>Déplacer la séance</button>}
        <button className="btn btn-outline" onClick={() => open('replace_teacher', detail)}>Remplacer l’enseignant</button>
        {!detail.hasAttendance && <button className="btn btn-danger" onClick={() => open('cancel_session', detail)}>Annuler la séance</button>}
      </div>}
    </WorkPage>}
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
    {operation && <WorkPage title={titles[operation.action]} busy={saving} onClose={() => setOperation(null)}>{missingContact && contactStep ? <ReviewedForm key={`contact-${missingContact.id}`} busy={saving} error={saveError}
      fields={[{ label: 'Enseignant', value: missingContact.name }, { label: 'E-mail personnel', value: contactEmail }]}
      consequence="L’e-mail personnel sera enregistré dans le dossier enseignant et les instructions d’accès seront envoyées à cette adresse. Vous pourrez ensuite poursuivre la programmation de la séance. Le compte Microsoft 365 et son mot de passe seront conservés."
      confirmLabel="Confirmer l’e-mail personnel"
      validate={() => teacherPersonalEmailSchema.safeParse(contactEmail).success ? null : 'Indiquez un e-mail personnel valide, différent du compte ESCEN.'}
      onConfirm={event => {
        event.preventDefault(); setSaving(true); setSaveError('');
        void updateScheduledTeacherContact(activeRole, { teacherId: missingContact.id, personalEmail: contactEmail,
          revision: directory.revision, reason: 'Contact personnel complété avant la programmation d’une séance.',
          ...(current ? { sessionId: current.id } : { assignmentId: form.assignmentId }),
        }).then(result => {
          setDirectory(previous => previous ? { ...previous, revision: result.revision,
            teachers: previous.teachers.map(teacher => teacher.id === missingContact.id ? { ...teacher, requiresPersonalEmail: false } : teacher),
          } : previous);
          setContactEmail(''); setContactStep(false);
          setContactMessage(result.digitalAccess?.status === 'FAILED'
            ? 'Contact enregistré. Les accès n’ont pas pu être envoyés ; contactez le support pour terminer leur envoi.'
            : `Contact enregistré. ${teacherAccessMessage(result.digitalAccess)}`);
          portal.refreshCampus();
        }).catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Enregistrement du contact impossible.')).finally(() => setSaving(false));
      }}>
      <p>L’e-mail personnel de <strong>{missingContact.name}</strong> est nécessaire avant de programmer ce professeur.</p>
      <label className="form-group">E-mail personnel<input className="input" type="email" required maxLength={254} value={contactEmail} onChange={event => setContactEmail(event.target.value)} /></label>
      <DrawerActions><button type="button" className="btn btn-outline" disabled={saving} onClick={() => setContactStep(false)}>Revenir à la séance</button><button className="btn btn-primary" disabled={saving}>Vérifier les informations</button></DrawerActions>
    </ReviewedForm> : <ReviewedForm busy={saving} error={saveError} fields={fields} consequence={consequence}
      confirmLabel={`Confirmer : ${titles[operation.action].toLocaleLowerCase('fr')}`} danger={action === 'cancel_session'}
      validate={() => {
        if (missingContact) return 'Complétez d’abord l’e-mail personnel de l’enseignant pour programmer cette séance.';
        if (sharedCreate) {
          if (sharedGroupIds.length < 2 || sharedGroupIds.length > 30) return 'Choisissez au moins 2 groupes pour programmer un cours commun.';
          if (!sharedComponent) return 'Choisissez la matière du cours commun.';
          if (!sharedTeacherId) return 'Choisissez l’enseignant du cours commun.';
          if (form.mode !== 'EN_LIGNE' && !form.roomId) return 'Choisissez une salle disponible pour ce cours commun.';
        } else if (editing && !assignment) {
          return 'Choisissez le groupe, la matière et l’enseignant du cours.';
        }
        if (isMultiCreate) {
          if (!multiSlots.length) return 'Sélectionnez au moins une date et des heures cohérentes.';
          if (multiSlots.length > 60) return 'Sélectionnez au maximum 60 dates par enregistrement.';
          if (selectedDates.some(date => (dateMin && date < dateMin) || (dateMax && date > dateMax))) return 'Les dates doivent appartenir à l’année scolaire et à la période d’affectation de l’enseignant.';
        } else if (timed && effectiveEndsAt <= effectiveStartsAt) {
          return 'La fin doit être postérieure au début.';
        }
        return null;
      }}
      onConfirm={event => {
        event.preventDefault(); setSaving(true); setSaveError('');
        const common = { revision: directory.revision, reason: effectiveReason };
        const sessionId = current?.id || '';
        const command: ScheduleCommand = operation.action === 'create_shared_course' ? {
          ...common,
          action: 'create_shared_course',
          groupIds: sharedGroupIds,
          componentId: sharedComponentId,
          teacherId: sharedTeacherId,
          roomId: form.mode === 'EN_LIGNE' ? null : form.roomId,
          mode: form.mode as 'COURS' | 'EN_LIGNE',
          ...(form.mode === 'EN_LIGNE' && form.meetingUrl.trim() ? { meetingUrl: form.meetingUrl.trim() } : {}),
          startsAt: isMultiCreate ? multiSlots[0].startsAt : iso(form.startsAt),
          endsAt: isMultiCreate ? multiSlots[0].endsAt : iso(form.endsAt),
          ...(isMultiCreate ? { slots: multiSlots.map(slot => ({ startsAt: slot.startsAt, endsAt: slot.endsAt })) } : {}),
        }
          : operation.action === 'block_period' ? { ...common, action: 'block_period', name: form.name, kind: form.kind, siteId: form.siteId || null, startsAt: iso(form.startsAt), endsAt: iso(form.endsAt) }
          : operation.action === 'cancel_session' ? { ...common, action: 'cancel_session', sessionId }
            : operation.action === 'replace_teacher' ? { ...common, action: 'replace_teacher', sessionId, teacherId: form.teacherId || null }
              : operation.action === 'generate_online_link' ? { ...common, action: 'generate_online_link', sessionId, customMeetingUrl: form.meetingUrl.trim() || null }
                : operation.action === 'sync_recording' ? { ...common, action: 'sync_recording', sessionId, recordingUrl: form.recordingUrl.trim() || null }
                  : operation.action === 'move_session' ? { ...common, action: 'move_session', sessionId, startsAt: iso(form.startsAt), endsAt: iso(form.endsAt) }
                    : isMultiCreate ? {
                      ...common,
                      action: 'create_session',
                      assignmentId: form.assignmentId,
                      roomId: form.roomId || null,
                      mode: form.mode,
                      ...(form.mode === 'EN_LIGNE' && form.meetingUrl.trim() ? { meetingUrl: form.meetingUrl.trim() } : {}),
                      startsAt: multiSlots[0].startsAt,
                      endsAt: multiSlots[0].endsAt,
                      slots: multiSlots.map(slot => ({ startsAt: slot.startsAt, endsAt: slot.endsAt })),
                    }
                    : { ...common, action: operation.action, ...(operation.action === 'update_session' ? { sessionId } : {}), assignmentId: form.assignmentId, roomId: form.roomId || null, mode: form.mode, ...(form.mode === 'EN_LIGNE' && form.meetingUrl.trim() ? { meetingUrl: form.meetingUrl.trim() } : {}), startsAt: iso(form.startsAt), endsAt: iso(form.endsAt) } as ScheduleCommand;
        void manageSchedule(activeRole, command).then(() => {
          setOperation(null);
          setSuccess(isMultiCreate && multiSlots.length > 1 ? `${multiSlots.length} séances programmées avec succès.` : 'Planning enregistré. Le motif et l’historique sont conservés.');
          setReload(value => value + 1);
          portal.refreshCampus();
        }).catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setSaving(false));
      }}>
      {contactMessage && <p className="review-notice" role="status">{contactMessage}</p>}
      {missingContact && <div className="review-notice"><p>L’e-mail personnel de {missingContact.name} est obligatoire avant de programmer cette séance.</p><button type="button" className="btn btn-outline" onClick={() => { setSaveError(''); setContactStep(true); }}>Renseigner l’e-mail personnel</button></div>}
      {editing && <>
        {(action === 'create_session' || sharedCreate) && (
          <div className="form-group">
            <span className="form-label">Portée du cours</span>
            <div className="btn-group">
              <button
                type="button"
                className={`btn btn-sm ${action === 'create_session' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setOperation({ action: 'create_session' })}
              >
                Un seul groupe
              </button>
              <button
                type="button"
                className={`btn btn-sm ${sharedCreate ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => {
                  setForm(prev => ({ ...prev, mode: 'COURS' }));
                  setOperation({ action: 'create_shared_course' });
                }}
              >
                Cours en commun (plusieurs groupes)
              </button>
            </div>
          </div>
        )}
        {action === 'create_session' ? (
          <ScheduleCourseSelector
            directory={directory}
            assignmentId={form.assignmentId}
            initialGroupId={requestedGroup || groupId}
            initialComponentId={params.get('matiere') || ''}
            canAssign={portal.perms.permissions.includes('academic.assignment.manage')}
            onChange={id => setForm({ ...form, assignmentId: id, roomId: '' })}
            onAssign={setAssigning}
          />
        ) : sharedCreate ? (
          <fieldset>
            <legend>Quel cours commun programmer ?</legend>
            <p>Cochez tous les groupes qui suivent ce cours ensemble, puis choisissez la matière et l’enseignant.</p>
            <fieldset className="offering-levels-box mb-1">
              <legend>Groupes du cours commun (cochez au moins 2 groupes)</legend>
              <p className="cell-sub" style={{ margin: '0 0 10px' }}>
                {sharedGroupIds.length} groupe(s) sélectionné(s)
                {sharedGroupIds.length < 2
                  ? ' — sélectionnez au moins 2 groupes à réunir.'
                  : ` : ${sharedGroupIds.map(groupName).join(' + ')}`}
              </p>
              <div className="offering-modes-grid">
                {directory.groups.map(group => {
                  const checked = sharedGroupIds.includes(group.id);
                  return (
                    <label className="offering-mode-option" key={group.id}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={event => {
                          const nextGroups = event.target.checked
                            ? [...sharedGroupIds, group.id]
                            : sharedGroupIds.filter(id => id !== group.id);
                          setSharedGroupIds(nextGroups);
                        }}
                      />
                      <span>{group.label}</span>
                    </label>
                  );
                })}
              </div>
              {!directory.groups.length && (
                <p>
                  Aucun groupe disponible. <Link href="/academique/referentiel?collection=groups">Créer une classe / un groupe</Link>.
                </p>
              )}
            </fieldset>
            <label className="form-group">
              Matière du cours
              <select
                aria-label="Matière du cours"
                className="select-input"
                required
                disabled={sharedGroupIds.length < 2}
                value={sharedComponentId}
                onChange={event => {
                  const nextCompId = event.target.value;
                  setSharedComponentId(nextCompId);
                  const nextComp = directory.components.find(c => c.id === nextCompId);
                  const matchingAssign = directory.assignments.find(a => {
                    const comp = directory.components.find(c => c.id === a.componentId);
                    return (
                      sharedGroupIds.includes(a.groupId) &&
                      comp &&
                      nextComp &&
                      (comp.subjectId === nextComp.subjectId || comp.id === nextComp.id) &&
                      directory.teachers.some(t => t.id === a.teacherId && t.active)
                    );
                  }) || directory.assignments.find(a => {
                    const comp = directory.components.find(c => c.id === a.componentId);
                    return (
                      comp &&
                      nextComp &&
                      (comp.subjectId === nextComp.subjectId || comp.id === nextComp.id) &&
                      directory.teachers.some(t => t.id === a.teacherId && t.active)
                    );
                  });
                  if (matchingAssign) setSharedTeacherId(matchingAssign.teacherId);
                }}
              >
                <option value="">{sharedGroupIds.length < 2 ? 'Cochez d’abord au moins 2 groupes' : 'Choisir une matière'}</option>
                {sharedAvailableComponents.map(row => (
                  <option key={row.id} value={row.id}>{row.label}</option>
                ))}
              </select>
            </label>
            <label className="form-group">
              Enseignant du cours
              <select
                aria-label="Enseignant du cours"
                className="select-input"
                required
                disabled={sharedGroupIds.length < 2 || !sharedComponentId}
                value={sharedTeacherId}
                onChange={event => setSharedTeacherId(event.target.value)}
              >
                <option value="">Choisir l’enseignant</option>
                {directory.teachers
                  .filter(teacher => teacher.active)
                  .sort((a, b) => Number(sharedSubjectAssignedTeacherIds.has(b.id)) - Number(sharedSubjectAssignedTeacherIds.has(a.id)) || a.name.localeCompare(b.name, 'fr'))
                  .map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}{sharedSubjectAssignedTeacherIds.has(teacher.id) ? ' · Affecté à cette matière' : ''}
                    </option>
                  ))}
              </select>
            </label>
          </fieldset>
        ) : (
          <label className="form-group">
            Affectation
            <select
              className="select-input"
              required
              value={form.assignmentId}
              onChange={event => setForm({ ...form, assignmentId: event.target.value, roomId: '' })}
            >
              <option value="">Choisir une affectation</option>
              {directory.assignments
                .filter(assignment => assignment.id === current?.assignmentId || directory.teachers.some(teacher => teacher.id === assignment.teacherId && teacher.active))
                .map(assignment => (
                  <option key={assignment.id} value={assignment.id}>{assignmentName(assignment.id)}</option>
                ))}
            </select>
          </label>
        )}
        <label className="form-group">Type de séance<select className="select-input" value={form.mode} onChange={event => setForm({ ...form, mode: event.target.value as SessionMode, roomId: '' })}><option value="COURS">Cours en présentiel</option>{!sharedCreate && <option value="PAPIER">Épreuve sur papier</option>}<option value="EN_LIGNE">En ligne</option></select></label>
        {form.mode !== 'EN_LIGNE' && <label className="form-group">Salle prévue<select className="select-input" required disabled={sharedCreate ? (sharedGroupIds.length < 2 || !sharedComponentId || !sharedTeacherId) : !assignment} value={form.roomId} onChange={event => setForm({ ...form, roomId: event.target.value })}><option value="">Choisir une salle disponible</option>{directory.rooms.filter(room => room.available && (!room.siteId || !siteId || room.siteId === siteId)).map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>}
        {form.mode === 'EN_LIGNE' && (
          <div className="form-group">
            <label className="form-label" htmlFor="schedule-meeting-url">Lien Microsoft Teams (créé automatiquement si laissé vide)</label>
            <input id="schedule-meeting-url" className="input" type="url" placeholder="Automatique via Microsoft 365 (@escen.university) ou saisir une URL..." value={form.meetingUrl} onChange={event => setForm({ ...form, meetingUrl: event.target.value })} />
          </div>
        )}
      </>}
      {action === 'block_period' && <><label className="form-group">Intitulé<input className="input" required maxLength={160} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
        <label className="form-group">Type de période<select className="select-input" value={form.kind} onChange={event => setForm({ ...form, kind: event.target.value as typeof form.kind })}>{['AUTRE', 'JOUR_FERIE', 'VACANCES', 'FERMETURE', 'EXAMEN'].map(kind => <option key={kind} value={kind}>{kind}</option>)}</select></label>
        <label className="form-group">Site<select className="select-input" required={!directory.canBlockAllSites} value={form.siteId} onChange={event => setForm({ ...form, siteId: event.target.value })}>{directory.canBlockAllSites ? <option value="">Tous les sites</option> : <option value="">Choisir un site</option>}{directory.sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
      </>}
      {(action === 'create_session' || sharedCreate) && (
        <div className="form-group">
          <span className="form-label">Mode de programmation</span>
          <div className="btn-group">
            <button type="button" className={`btn btn-sm ${cadence === 'single' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCadence('single')}>
              Séance unique
            </button>
            <button type="button" className={`btn btn-sm ${cadence === 'multi' ? 'btn-primary' : 'btn-outline'}`} onClick={() => {
              setCadence('multi');
            }}>
              Récurrence / Plusieurs dates
            </button>
          </div>
        </div>
      )}
      {timed && !isMultiCreate && (
        <>
          {(action === 'create_session' || sharedCreate) && (
            <div className="form-group">
              <span className="form-label">Créneaux horaires rapides (heure précise)</span>
              <div className="btn-group">
                {QUICK_TIME_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => applySingleQuickSlot(preset.start, preset.end)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="form-grid">
            <label className="form-group">Début (heure de Lomé)<input className="input" type="datetime-local" required value={form.startsAt} onChange={event => setForm({ ...form, startsAt: event.target.value })} /></label>
            <label className="form-group">Fin (heure de Lomé)<input className="input" type="datetime-local" required min={form.startsAt || undefined} value={form.endsAt} onChange={event => setForm({ ...form, endsAt: event.target.value })} /></label>
          </div>
        </>
      )}
      {isMultiCreate && (
        <fieldset className="card">
          <legend>Dates et horaires des séances</legend>
          <ScheduleDatePicker dates={selectedDates} onChange={setSelectedDates} min={dateMin} max={dateMax} initialDate={form.startsAt.slice(0, 10) || assignment?.validFrom || dateMin || new Date().toISOString().slice(0, 10)} />
          <div className="form-group">
            <span className="form-label">Créneaux horaires rapides</span>
            <div className="btn-group mb-1">
              {QUICK_TIME_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  className={`btn btn-sm ${multiStartTime === preset.start && multiEndTime === preset.end ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setMultiStartTime(preset.start); setMultiEndTime(preset.end); }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-grid">
            <label className="form-group">Heure précise de début (Lomé)<input className="input" type="time" required value={multiStartTime} onChange={event => setMultiStartTime(event.target.value)} /></label>
            <label className="form-group">Heure précise de fin (Lomé)<input className="input" type="time" required value={multiEndTime} onChange={event => setMultiEndTime(event.target.value)} /></label>
          </div>
          <div className="info-box mt-1" role="status">
            <strong>{multiSlots.length} séance(s) à programmer :</strong>{' '}
            {multiSlots.length > 0
              ? multiSlots.map(s => s.label).join(' · ')
              : 'Choisissez au moins une date et des heures de début et de fin cohérentes.'}
          </div>
        </fieldset>
      )}
      {action === 'replace_teacher' && current && <label className="form-group">Remplaçant<select className="select-input" value={form.teacherId} onChange={event => setForm({ ...form, teacherId: event.target.value })}><option value="">Enseignant d’origine : {teacherName(current.teacherId)}</option>{directory.teachers.filter(teacher => teacher.active && teacher.id !== current.teacherId).map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>}
      {action === 'generate_online_link' && current && (
        <div className="form-group">
          <p className="info-box mb-1">Laissez le champ vide pour générer automatiquement un nouveau lien de réunion Microsoft Teams via le compte @escen.university, ou collez un lien de visioconférence existant.</p>
          <label className="form-group">Lien de réunion (optionnel — automatique si vide)<input className="input" type="url" placeholder="https://teams.microsoft.com/l/meetup-join/..." value={form.meetingUrl} onChange={event => setForm({ ...form, meetingUrl: event.target.value })} /></label>
        </div>
      )}
      {action === 'sync_recording' && current && (
        <div className="form-group">
          <p className="info-box mb-1">Laissez le champ vide pour synchroniser automatiquement l’enregistrement depuis Microsoft Teams / OneDrive, ou collez directement le lien du replay pour le rendre immédiatement accessible aux étudiants dans leur espace Supports & Cours.</p>
          <label className="form-group">Lien de l’enregistrement (Replay)<input className="input" type="url" placeholder="https://escenuniversity-my.sharepoint.com/..." value={form.recordingUrl} onChange={event => setForm({ ...form, recordingUrl: event.target.value })} /></label>
        </div>
      )}
      {action === 'cancel_session' && current && <p>{assignmentName(current.assignmentId)} · {displayTime(current.startsAt)} → ANNULE</p>}
      <DrawerActions><DrawerCloseButton className="btn btn-outline" disabled={saving}>Annuler</DrawerCloseButton><button className="btn btn-primary">Vérifier les informations</button></DrawerActions>
    </ReviewedForm>}</WorkPage>}
    {assigning && <CourseAssignmentDialog {...assigning} onClose={() => setAssigning(null)} onSaved={async id => {
      const updated = await loadSchedule(activeRole); setDirectory(updated); setForm(value => ({ ...value, assignmentId: id, roomId: '' })); setAssigning(null);
    }} />}
    {creatingExamSession && (
      <EvaluationCreateDialog
        preselectedAssignmentId={creatingExamSession.assignmentId}
        preselectedSessionId={creatingExamSession.id}
        category="exam"
        onClose={() => setCreatingExamSession(null)}
        onCreated={() => {
          setCreatingExamSession(null);
          setSuccess('Épreuve créée et programmée sur cette séance de cours.');
          setReload(value => value + 1);
          portal.refreshCampus();
        }}
      />
    )}
  </div>;
}

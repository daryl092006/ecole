'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import { roleHeaderValue } from '@/services/remoteCampusService';
import { academicYearRequestHeaders } from '@/services/academicYearSelection';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  COURSE_RESOURCE_KIND_LABELS,
  type CourseResourceItem,
  type CourseResourceKind,
  type CourseResourcesDirectory,
  type OnlineCourseSessionItem,
} from '@/types/courseResources';
import PageHeader from '@/components/ui/PageHeader';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';

type ActiveView = 'courses' | 'resources' | 'online';
type ModalOperation =
  | { kind: 'create_resource'; preselectedAssignmentId?: string; preselectedSessionId?: string }
  | { kind: 'archive_resource'; resource: CourseResourceItem }
  | { kind: 'generate_meeting_link'; session: OnlineCourseSessionItem }
  | { kind: 'save_recording'; session: OnlineCourseSessionItem };

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lome' }) : '—';

const formatBytes = (bytes: number | null) => {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

async function apiFetch<T>(role: string, path: string, init?: RequestInit): Promise<T> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  if (!data.session) throw new Error('Session expirée. Veuillez vous reconnecter.');
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'x-escen-role': roleHeaderValue(role as Parameters<typeof roleHeaderValue>[0]),
      ...academicYearRequestHeaders(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Opération impossible.');
  return body as T;
}

export default function CourseResourcesWorkspace() {
  const portal = usePortal();
  const { activeRole, academicYearSelection } = portal;
  const [directory, setDirectory] = useState<CourseResourcesDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<ActiveView>('courses');
  const [groupFilter, setGroupFilter] = useState('');
  const [kindFilter, setKindFilter] = useState<CourseResourceKind | ''>('');
  const [search, setSearch] = useState('');
  const [operation, setOperation] = useState<ModalOperation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [assignmentId, setAssignmentId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceKind, setResourceKind] = useState<CourseResourceKind>('SUPPORT');
  const [resourceUrl, setResourceUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [fileContentBase64, setFileContentBase64] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void apiFetch<CourseResourcesDirectory>(activeRole, '/api/course-resources', { signal: controller.signal })
      .then(result => {
        if (!controller.signal.aborted) setDirectory(result);
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [activeRole, academicYearSelection, reload]);

  if (loading) return <LoadingState label="Chargement de la liste des cours, supports et enregistrements…" variant="table" />;
  if (error || !directory) {
    return (
      <ErrorState
        title="Espace cours et supports indisponible"
        message={error || 'Les cours et supports n’ont pas pu être chargés.'}
        onRetry={() => setReload(v => v + 1)}
      />
    );
  }

  const groups = Array.from(
    new Map(
      [
        ...directory.courses.map(c => [c.groupId, c.groupName] as const),
        ...directory.onlineSessions.map(s => [s.groupId, s.groupName] as const),
      ]
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const q = search.trim().toLowerCase();
  const filteredCourses = directory.courses.filter(course => {
    if (groupFilter && course.groupId !== groupFilter) return false;
    if (q && !`${course.subjectName} ${course.subjectCode} ${course.groupName} ${course.teacherName} ${course.semesterName}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  const filteredResources = directory.resources.filter(res => {
    if (groupFilter && res.groupId !== groupFilter) return false;
    if (kindFilter && res.kind !== kindFilter) return false;
    if (q && !`${res.title} ${res.subjectName} ${res.groupName} ${res.teacherName} ${res.description || ''}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  const onlineOnlySessions = directory.onlineSessions.filter(s => {
    if (s.mode !== 'EN_LIGNE') return false;
    if (groupFilter && s.groupId !== groupFilter) return false;
    if (q && !`${s.subjectName} ${s.groupName} ${s.teacherName}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const openCreateModal = (preselectedAssignment?: string, preselectedSession?: string, defaultKind: CourseResourceKind = 'SUPPORT') => {
    const defaultCourse = directory.courses.find(c => c.assignmentId === preselectedAssignment) || directory.courses[0];
    setAssignmentId(defaultCourse?.assignmentId || '');
    setSessionId(preselectedSession || '');
    setTitle('');
    setDescription('');
    setResourceKind(defaultKind);
    setResourceUrl('');
    setFileName('');
    setMimeType('');
    setFileContentBase64('');
    setReason('Mise à disposition de support pédagogique');
    setSaveError('');
    setOperation({ kind: 'create_resource', preselectedAssignmentId: preselectedAssignment, preselectedSessionId: preselectedSession });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName('');
      setMimeType('');
      setFileContentBase64('');
      return;
    }
    setFileName(file.name);
    setMimeType(file.type || 'application/octet-stream');
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setFileContentBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenResource = async (res: CourseResourceItem) => {
    try {
      if (res.hasStorageFile) {
        const { url } = await apiFetch<{ url: string }>(activeRole, `/api/course-resources?downloadId=${encodeURIComponent(res.id)}`);
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (res.resourceUrl) {
        window.open(res.resourceUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Téléchargement impossible.');
    }
  };

  const selectedCourse = directory.courses.find(c => c.assignmentId === assignmentId);

  return (
    <div className="domain-workspace workspace-stack">
      <PageHeader
        eyebrow="PÉDAGOGIE & NUMÉRIQUE"
        title="Cours, supports et enregistrements"
        description="Liste des enseignements, supports de cours téléchargeables, création automatique des liens de cours en ligne Microsoft Teams et accès aux replays."
      >
        {directory.canManage && directory.courses.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={() => openCreateModal()}>
            + Déposer un support ou un replay
          </button>
        )}
        {portal.perms.permissions.includes('schedule.create') && (
          <Link className="btn btn-outline" href="/academique/emploi-du-temps">
            Programmer un cours →
          </Link>
        )}
        {portal.perms.permissions.includes('attendance.view') && (
          <Link className="btn btn-outline" href="/academique/presences">
            Présences en ligne / présentiel →
          </Link>
        )}
      </PageHeader>

      {success && <p className="attendance-success" role="status">{success}</p>}

      <section className="card">
        <div className="btn-group mb-2">
          <button
            type="button"
            className={`btn ${view === 'courses' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setView('courses')}
          >
            Liste des cours ({filteredCourses.length})
          </button>
          <button
            type="button"
            className={`btn ${view === 'resources' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setView('resources')}
          >
            Supports de cours & Documents ({filteredResources.length})
          </button>
          <button
            type="button"
            className={`btn ${view === 'online' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setView('online')}
          >
            Cours en ligne & Enregistrements ({onlineOnlySessions.length})
          </button>
        </div>

        <div className="form-grid">
          <label className="form-group">
            Classe / Groupe
            <select className="select-input" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
              <option value="">Tous les groupes ({groups.length})</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>
          {view === 'resources' && (
            <label className="form-group">
              Type de ressource
              <select className="select-input" value={kindFilter} onChange={e => setKindFilter(e.target.value as CourseResourceKind | '')}>
                <option value="">Tous les types</option>
                {(Object.keys(COURSE_RESOURCE_KIND_LABELS) as CourseResourceKind[]).map(k => (
                  <option key={k} value={k}>{COURSE_RESOURCE_KIND_LABELS[k]}</option>
                ))}
              </select>
            </label>
          )}
          <label className="form-group">
            Rechercher un cours, enseignant ou support
            <input
              className="input"
              type="search"
              placeholder="Ex. Marketing, Algorithmique, Licence 1..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
        </div>
      </section>

      {view === 'courses' && (
        <section className="card card-full">
          <div className="card-header">
            <div>
              <h2>Liste des cours ({filteredCourses.length})</h2>
              <p className="cell-sub">Enseignements actifs de l’année sélectionnée avec leurs supports et séances en ligne.</p>
            </div>
          </div>
          <ResponsiveTable className="data-table">
            <thead>
              <tr>
                <th>Matière & Semestre</th>
                <th>Classe / Formation</th>
                <th>Enseignant</th>
                <th>Crédits / Coef.</th>
                <th>Séances & En ligne</th>
                <th>Supports & Replays</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map(course => (
                <tr key={course.assignmentId}>
                  <td>
                    <strong>{course.subjectName}</strong>
                    <div className="cell-sub">{course.subjectCode} · {course.semesterName}</div>
                  </td>
                  <td>
                    <strong>{course.groupName}</strong>
                    <div className="cell-sub">{course.offeringLabel}</div>
                  </td>
                  <td>
                    <div>{course.teacherName}</div>
                    {course.teacherEmail && <div className="cell-sub">{course.teacherEmail}</div>}
                  </td>
                  <td>
                    {course.credits} cr. · coef. {course.coefficient}
                  </td>
                  <td>
                    <div>{course.totalSessions} séance(s)</div>
                    {course.onlineSessions > 0 && (
                      <span className="pill pill-info">{course.onlineSessions} en ligne</span>
                    )}
                  </td>
                  <td>
                    <div>{course.resourcesCount} support(s)</div>
                    {course.recordingsCount > 0 && (
                      <div className="cell-sub">{course.recordingsCount} enregistrement(s)</div>
                    )}
                  </td>
                  <td>
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          setGroupFilter(course.groupId);
                          setSearch(course.subjectName);
                          setView('resources');
                        }}
                      >
                        Voir les supports ({course.resourcesCount})
                      </button>
                      {directory.canManage && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => openCreateModal(course.assignmentId)}
                        >
                          + Support
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredCourses.length && (
                <tr>
                  <td colSpan={7}>Aucun cours ne correspond aux critères sélectionnés dans cette année scolaire.</td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </section>
      )}

      {view === 'resources' && (
        <section className="card card-full">
          <div className="card-header">
            <div>
              <h2>Supports de cours & Documents ({filteredResources.length})</h2>
              <p className="cell-sub">Documents pédagogiques, fiches de TD et enregistrements mis à la disposition des étudiants.</p>
            </div>
            {directory.canManage && directory.courses.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={() => openCreateModal()}>
                + Ajouter un support
              </button>
            )}
          </div>
          <ResponsiveTable className="data-table">
            <thead>
              <tr>
                <th>Intitulé du support</th>
                <th>Type</th>
                <th>Cours & Classe</th>
                <th>Déposé par</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map(res => (
                <tr key={res.id}>
                  <td>
                    <strong>{res.title}</strong>
                    {res.description && <div className="cell-sub">{res.description}</div>}
                    {res.fileName && (
                      <div className="cell-sub">
                        Fichier : {res.fileName} {res.byteSize ? `(${formatBytes(res.byteSize)})` : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="pill pill-default">{COURSE_RESOURCE_KIND_LABELS[res.kind] || res.kind}</span>
                  </td>
                  <td>
                    <strong>{res.subjectName}</strong>
                    <div className="cell-sub">{res.groupName} · {res.teacherName}</div>
                    {res.sessionLabel && <div className="cell-sub">Séance du {res.sessionLabel}</div>}
                  </td>
                  <td>{res.uploadedByName}</td>
                  <td>{formatDate(res.createdAt)}</td>
                  <td>
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => void handleOpenResource(res)}
                      >
                        {res.kind === 'ENREGISTREMENT' ? 'Voir l’enregistrement' : res.hasStorageFile ? 'Télécharger' : 'Ouvrir le support'}
                      </button>
                      {directory.canManage && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            setReason('');
                            setSaveError('');
                            setOperation({ kind: 'archive_resource', resource: res });
                          }}
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredResources.length && (
                <tr>
                  <td colSpan={6}>Aucun support de cours déposé pour cette sélection.</td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </section>
      )}

      {view === 'online' && (
        <section className="card card-full">
          <div className="card-header">
            <div>
              <h2>Séances de cours en ligne & Enregistrements ({onlineOnlySessions.length})</h2>
              <p className="cell-sub">
                Accès direct aux salles virtuelles Microsoft Teams (@escen.university) et aux enregistrements vidéo (replays) pour les étudiants et l’équipe académique.
              </p>
            </div>
          </div>
          <ResponsiveTable className="data-table">
            <thead>
              <tr>
                <th>Date & Horaires (Lomé)</th>
                <th>Matière & Classe</th>
                <th>Enseignant</th>
                <th>Lien du cours en ligne</th>
                <th>Enregistrement (Replay)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {onlineOnlySessions.map(session => (
                <tr key={session.id}>
                  <td>
                    <strong>{formatDate(session.startsAt)}</strong>
                    <div className="cell-sub">→ {formatDate(session.endsAt)} · {session.status}</div>
                  </td>
                  <td>
                    <strong>{session.subjectName}</strong>
                    <div className="cell-sub">{session.groupName}</div>
                  </td>
                  <td>{session.teacherName}</td>
                  <td>
                    {session.meetingUrl ? (
                      <a
                        className="btn btn-sm btn-primary"
                        href={session.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Rejoindre le cours Teams
                      </a>
                    ) : (
                      <span className="cell-sub">Lien non encore généré</span>
                    )}
                  </td>
                  <td>
                    {session.recordingUrl ? (
                      <a
                        className="btn btn-sm btn-outline"
                        href={session.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Accéder à l’enregistrement
                      </a>
                    ) : (
                      <span className="cell-sub">En attente d’enregistrement</span>
                    )}
                  </td>
                  <td>
                    <div className="btn-group">
                      {directory.canScheduleOnline && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setResourceUrl(session.meetingUrl || '');
                              setReason('Création automatique du lien de cours en ligne Teams');
                              setSaveError('');
                              setOperation({ kind: 'generate_meeting_link', session });
                            }}
                          >
                            {session.meetingUrl ? 'Lien Teams' : 'Créer lien Teams'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setResourceUrl(session.recordingUrl || '');
                              setReason('Mise à disposition de l’enregistrement du cours en ligne');
                              setSaveError('');
                              setOperation({ kind: 'save_recording', session });
                            }}
                          >
                            {session.recordingUrl ? 'Modifier le replay' : 'Associer le replay'}
                          </button>
                        </>
                      )}
                      {directory.canManage && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => openCreateModal(session.assignmentId, session.id)}
                        >
                          + Support de séance
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!onlineOnlySessions.length && (
                <tr>
                  <td colSpan={6}>Aucune séance en ligne programmée pour ce filtre.</td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </section>
      )}

      {operation && (
        <WorkPage
          busy={saving}
          title={
            operation.kind === 'create_resource'
              ? 'Déposer un support de cours ou un enregistrement'
              : operation.kind === 'archive_resource'
              ? 'Retirer le support de cours'
              : operation.kind === 'generate_meeting_link'
              ? 'Générer ou modifier le lien Microsoft Teams'
              : 'Synchroniser ou associer l’enregistrement (Replay)'
          }
          onClose={() => setOperation(null)}
        >
          <ReviewedForm
            busy={saving}
            error={saveError}
            danger={operation.kind === 'archive_resource'}
            confirmLabel={
              operation.kind === 'create_resource'
                ? 'Confirmer le dépôt du support'
                : operation.kind === 'archive_resource'
                ? 'Confirmer le retrait du support'
                : operation.kind === 'generate_meeting_link'
                ? 'Confirmer le lien du cours en ligne'
                : 'Confirmer la publication de l’enregistrement'
            }
            fields={
              operation.kind === 'create_resource'
                ? [
                    { label: 'Cours', value: selectedCourse ? `${selectedCourse.subjectName} · ${selectedCourse.groupName}` : '' },
                    { label: 'Intitulé', value: title.trim() },
                    { label: 'Type', value: COURSE_RESOURCE_KIND_LABELS[resourceKind] },
                    { label: 'Fichier joint', value: fileName || 'Aucun fichier' },
                    { label: 'Lien URL', value: resourceUrl.trim() || 'Aucun lien externe' },
                    { label: 'Motif', value: reason.trim() },
                  ]
                : operation.kind === 'archive_resource'
                ? [
                    { label: 'Support', value: operation.resource.title },
                    { label: 'Cours', value: `${operation.resource.subjectName} · ${operation.resource.groupName}` },
                    { label: 'Motif du retrait', value: reason.trim() },
                  ]
                : operation.kind === 'generate_meeting_link'
                ? [
                    { label: 'Séance en ligne', value: `${operation.session.subjectName} · ${operation.session.groupName} (${formatDate(operation.session.startsAt)})` },
                    { label: 'Lien Microsoft Teams', value: resourceUrl.trim() || 'Création automatique via Microsoft Graph (@escen.university)' },
                    { label: 'Motif', value: reason.trim() },
                  ]
                : [
                    { label: 'Séance en ligne', value: `${operation.session.subjectName} · ${operation.session.groupName} (${formatDate(operation.session.startsAt)})` },
                    { label: 'Lien de l’enregistrement', value: resourceUrl.trim() || 'Synchronisation automatique Microsoft Teams / OneDrive' },
                    { label: 'Motif', value: reason.trim() },
                  ]
            }
            consequence={
              operation.kind === 'create_resource'
                ? 'Le support sera immédiatement accessible aux étudiants inscrits dans cette classe ainsi qu’à l’équipe pédagogique.'
                : operation.kind === 'archive_resource'
                ? 'Le support sera archivé avec son motif et ne sera plus affiché aux étudiants.'
                : operation.kind === 'generate_meeting_link'
                ? 'Le lien de visioconférence Microsoft Teams sera rattaché à la séance et visible par les étudiants et l’enseignant.'
                : 'L’enregistrement vidéo sera rattaché à la séance et publié automatiquement dans l’espace Supports & Replays des étudiants.'
            }
            validate={() => {
              if (reason.trim().length < 3) return 'Renseignez un motif d’au moins 3 caractères.';
              if (operation.kind === 'create_resource') {
                if (!assignmentId) return 'Choisissez un cours.';
                if (title.trim().length < 2) return 'Renseignez l’intitulé du support.';
                if (!fileContentBase64 && !resourceUrl.trim()) {
                  return 'Sélectionnez un fichier à téléverser ou renseignez un lien URL.';
                }
              }
              return null;
            }}
            onConfirm={event => {
              event.preventDefault();
              setSaving(true);
              setSaveError('');
              const payload =
                operation.kind === 'create_resource'
                  ? {
                      action: 'create_resource',
                      revision: directory.revision,
                      assignmentId,
                      sessionId: sessionId || null,
                      title: title.trim(),
                      description: description.trim() || null,
                      kind: resourceKind,
                      resourceUrl: resourceUrl.trim() || null,
                      fileName: fileName || null,
                      mimeType: mimeType || null,
                      fileContentBase64: fileContentBase64 || null,
                      reason: reason.trim(),
                    }
                  : operation.kind === 'archive_resource'
                  ? {
                      action: 'archive_resource',
                      revision: directory.revision,
                      resourceId: operation.resource.id,
                      reason: reason.trim(),
                    }
                  : operation.kind === 'generate_meeting_link'
                  ? {
                      action: 'generate_meeting_link',
                      revision: directory.revision,
                      sessionId: operation.session.id,
                      customMeetingUrl: resourceUrl.trim() || null,
                      reason: reason.trim(),
                    }
                  : {
                      action: 'save_recording',
                      revision: directory.revision,
                      sessionId: operation.session.id,
                      recordingUrl: resourceUrl.trim() || null,
                      reason: reason.trim(),
                    };

              void apiFetch(activeRole, '/api/course-resources', {
                method: 'POST',
                body: JSON.stringify(payload),
              })
                .then(() => {
                  setOperation(null);
                  setSuccess('Enregistrement effectué avec succès.');
                  setReload(v => v + 1);
                  portal.refreshCampus();
                })
                .catch(cause => {
                  setSaveError(cause instanceof Error ? cause.message : 'Enregistrement impossible.');
                })
                .finally(() => setSaving(false));
            }}
          >
            {operation.kind === 'create_resource' && (
              <>
                <label className="form-group">
                  Cours concerné
                  <select className="select-input" required value={assignmentId} onChange={e => setAssignmentId(e.target.value)}>
                    <option value="">Choisir un cours</option>
                    {directory.courses.map(c => (
                      <option key={c.assignmentId} value={c.assignmentId}>
                        {c.groupName} · {c.subjectName} ({c.teacherName})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label className="form-group">
                    Intitulé du support
                    <input
                      className="input"
                      required
                      maxLength={200}
                      placeholder="Ex. Chapitre 1 — Support de cours PDF"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </label>
                  <label className="form-group">
                    Catégorie
                    <select className="select-input" value={resourceKind} onChange={e => setResourceKind(e.target.value as CourseResourceKind)}>
                      {(Object.keys(COURSE_RESOURCE_KIND_LABELS) as CourseResourceKind[]).map(k => (
                        <option key={k} value={k}>{COURSE_RESOURCE_KIND_LABELS[k]}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="form-group">
                  Fichier à téléverser (PDF, Word, PowerPoint, Archive...)
                  <input className="input" type="file" onChange={handleFileChange} />
                </label>
                <label className="form-group">
                  Ou lien externe / lien de l’enregistrement (Teams, OneDrive, SharePoint, Web)
                  <input
                    className="input"
                    type="url"
                    placeholder="https://..."
                    value={resourceUrl}
                    onChange={e => setResourceUrl(e.target.value)}
                  />
                </label>
                <label className="form-group">
                  Description / Consignes (optionnel)
                  <textarea
                    className="input"
                    maxLength={2000}
                    placeholder="Précisions pour les étudiants..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </label>
              </>
            )}

            {operation.kind === 'generate_meeting_link' && (
              <>
                <p className="info-box mb-1">
                  Laissez le champ vide pour créer automatiquement un lien de réunion Microsoft Teams depuis l’espace via Microsoft 365 (@escen.university), ou collez un lien de réunion personnalisé.
                </p>
                <label className="form-group">
                  Lien de la réunion (optionnel — automatique si laissé vide)
                  <input
                    className="input"
                    type="url"
                    placeholder="https://teams.microsoft.com/l/meetup-join/..."
                    value={resourceUrl}
                    onChange={e => setResourceUrl(e.target.value)}
                  />
                </label>
              </>
            )}

            {operation.kind === 'save_recording' && (
              <>
                <p className="info-box mb-1">
                  Collez le lien de l’enregistrement (OneDrive / SharePoint / Teams) ou laissez vide pour interroger automatiquement Microsoft Graph. L’enregistrement sera immédiatement accessible aux étudiants dans leur espace.
                </p>
                <label className="form-group">
                  Lien de l’enregistrement vidéo (Replay)
                  <input
                    className="input"
                    type="url"
                    placeholder="https://escenuniversity-my.sharepoint.com/..."
                    value={resourceUrl}
                    onChange={e => setResourceUrl(e.target.value)}
                  />
                </label>
              </>
            )}

            <label className="form-group">
              Motif de l’opération
              <input
                className="input"
                required
                minLength={3}
                maxLength={1000}
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </label>

            <DrawerActions>
              <DrawerCloseButton className="btn btn-outline" disabled={saving}>Annuler</DrawerCloseButton>
              <button type="submit" className="btn btn-primary">Vérifier les informations</button>
            </DrawerActions>
          </ReviewedForm>
        </WorkPage>
      )}
    </div>
  );
}


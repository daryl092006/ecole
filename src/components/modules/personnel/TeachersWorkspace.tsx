'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadTeachers, manageTeacher } from '@/services/remoteCampusService';
import type { TeacherCommand, TeacherDirectory, TeacherProfile, TeachingAssignmentRecord } from '@/types/teachers';
import LoadingState from '@/components/ui/LoadingState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm, { type ReviewField } from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';

type Operation = { kind: 'create_profile' } | { kind: 'update_profile' | 'set_active'; teacher: TeacherProfile }
  | { kind: 'create_assignment' } | { kind: 'end_assignment'; assignment: TeachingAssignmentRecord };
const blank = () => ({ staffId: '', specialty: '', teacherId: '', offeringId: '', groupId: '', componentId: '',
  validFrom: new Date().toISOString().slice(0, 10), validUntil: '', endOn: '', reason: '' });

export default function TeachersWorkspace() {
  const portal = usePortal();
  const { activeRole, academicYearSelection } = portal;
  const [directory, setDirectory] = useState<TeacherDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<'teachers' | 'assignments'>('teachers');
  const [operation, setOperation] = useState<Operation | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setOperation(null);
    void loadTeachers(activeRole, controller.signal).then(result => { if (!controller.signal.aborted) setDirectory(result); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeRole, academicYearSelection, reload]);
  const open = (next: Operation, teacherId = '') => {
    setOperation(next); setSaveError('');
    setForm({ ...blank(), teacherId, ...('teacher' in next ? { specialty: next.teacher.specialty } : {}),
      ...(next.kind === 'end_assignment' ? { endOn: next.assignment.validUntil || new Date().toISOString().slice(0, 10) } : {}) });
  };
  if (loading) return <LoadingState label="Chargement des enseignants et affectations…" />;
  if (error || !directory) return <section className="card" role="alert"><p>{error || 'Annuaire indisponible.'}</p><button className="btn btn-outline" onClick={() => setReload(value => value + 1)}>Réessayer</button></section>;
  const offering = directory.offerings.find(row => row.id === form.offeringId);
  const teacherName = (id: string) => directory.teachers.find(row => row.id === id)?.name || 'Enseignant indisponible';
  const offeringName = (id: string) => directory.offerings.find(row => row.id === id)?.label || 'Formation indisponible';
  const groupName = (id: string) => directory.groups.find(row => row.id === id)?.label || 'Groupe indisponible';
  const componentName = (id: string) => directory.components.find(row => row.id === id)?.label || 'Matière indisponible';
  const title = operation?.kind === 'create_profile' ? 'Créer un profil enseignant' : operation?.kind === 'update_profile' ? 'Modifier le profil enseignant'
    : operation?.kind === 'set_active' ? `${operation.teacher.active ? 'Désactiver' : 'Activer'} l’enseignant`
    : operation?.kind === 'end_assignment' ? 'Terminer l’affectation' : 'Nouvelle affectation';
  const consequence = operation?.kind === 'create_profile' ? 'Le profil enseignant sera lié au dossier du personnel existant. Aucun compte ni rôle de connexion ne sera créé.'
    : operation?.kind === 'update_profile' ? 'La spécialité sera mise à jour. L’identité et le matricule se modifient dans les dossiers du personnel.'
      : operation?.kind === 'set_active' ? 'Le statut pédagogique sera modifié avec son motif. La désactivation est bloquée si des séances restent à assurer ; aucune séance ni aucun compte ne sera modifié automatiquement.'
        : operation?.kind === 'end_assignment' ? 'La date de fin sera enregistrée avec son motif. Les séances et l’historique restent conservés ; toute séance non annulée doit rester comprise dans les dates de l’affectation.'
          : 'L’enseignant sera affecté à ce groupe, cette formation et cette matière pour les dates indiquées. Aucune séance ne sera créée automatiquement.';
  const fields: ReviewField[] = operation?.kind === 'create_profile' ? [
    { label: 'Membre du personnel', value: directory.staff.find(row => row.id === form.staffId)?.name || '' }, { label: 'Spécialité', value: form.specialty },
  ] : operation?.kind === 'update_profile' ? [
    { label: 'Enseignant', value: operation.teacher.name }, { label: 'Spécialité', value: form.specialty, previous: operation.teacher.specialty },
  ] : operation?.kind === 'set_active' ? [
    { label: 'Enseignant', value: operation.teacher.name }, { label: 'Statut', value: operation.teacher.active ? 'Inactif' : 'Actif', previous: operation.teacher.active ? 'Actif' : 'Inactif' },
  ] : operation?.kind === 'end_assignment' ? [
    { label: 'Enseignant', value: teacherName(operation.assignment.teacherId) }, { label: 'Groupe', value: groupName(operation.assignment.groupId) },
    { label: 'Fin de l’affectation', value: form.endOn, previous: operation.assignment.validUntil || 'Sans date de fin' },
  ] : [
    { label: 'Enseignant', value: teacherName(form.teacherId) }, { label: 'Formation annuelle', value: offeringName(form.offeringId) },
    { label: 'Groupe', value: groupName(form.groupId) }, { label: 'Matière du programme', value: componentName(form.componentId) },
    { label: 'Début', value: form.validFrom }, { label: 'Fin', value: form.validUntil || 'Sans date de fin' },
  ];
  const filtered = directory.teachers.filter(teacher => `${teacher.name} ${teacher.employeeNumber} ${teacher.specialty}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  return <div>
    <div className="page-intro"><div><span className="page-eyebrow">PERSONNEL ENSEIGNANT</span><h1>Enseignants et affectations</h1><p>Profils pédagogiques et affectations de l’année sélectionnée.</p></div><div className="btn-group">
      {directory.canManageProfiles && <button className="btn btn-primary" onClick={() => open({ kind: 'create_profile' })}>Créer un profil enseignant</button>}
      {directory.canManageAssignments && <button className="btn btn-primary" onClick={() => open({ kind: 'create_assignment' })}>Nouvelle affectation</button>}
    </div></div>
    {success && <p className="card" role="status">{success}</p>}
    {!directory.selectedYearId && <p className="restricted-box">Choisissez une année scolaire précise pour consulter et gérer ses affectations.</p>}
    <nav className="record-sections" aria-label="Données enseignants"><button className={section === 'teachers' ? 'selected' : ''} aria-pressed={section === 'teachers'} onClick={() => setSection('teachers')}>Enseignants ({directory.teachers.length})</button><button className={section === 'assignments' ? 'selected' : ''} aria-pressed={section === 'assignments'} onClick={() => setSection('assignments')}>Affectations ({directory.assignments.length})</button></nav>
    {section === 'teachers' ? <section className="card card-full"><label className="form-group">Rechercher un enseignant<input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <ResponsiveTable className="data-table"><thead><tr><th>Enseignant</th><th>Spécialité</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{filtered.map(teacher => <tr key={teacher.id}>
        <td>{teacher.name}<div className="cell-sub">{teacher.employeeNumber}</div></td><td>{teacher.specialty || 'Non renseignée'}</td><td>{teacher.active ? 'Actif' : 'Inactif'}</td><td><div className="btn-group">
          {directory.canManageProfiles && <><button className="btn btn-sm btn-outline" onClick={() => open({ kind: 'update_profile', teacher })}>Modifier le profil</button><button className="btn btn-sm btn-outline" onClick={() => open({ kind: 'set_active', teacher })}>{teacher.active ? 'Désactiver' : 'Activer'}</button></>}
          {directory.canManageAssignments && teacher.active && <button className="btn btn-sm btn-outline" onClick={() => open({ kind: 'create_assignment' }, teacher.id)}>Affecter</button>}
        </div></td></tr>)}{!filtered.length && <tr><td colSpan={4}>Aucun enseignant pour cette recherche.</td></tr>}</tbody></ResponsiveTable>
      {directory.canManageProfiles && <p><Link href="/personnel">Ouvrir les dossiers du personnel pour créer ou modifier une identité</Link></p>}
    </section> : <section className="card card-full"><ResponsiveTable className="data-table"><thead><tr><th>Enseignant</th><th>Groupe et formation</th><th>Matière</th><th>Dates</th><th>Actions</th></tr></thead><tbody>{directory.assignments.map(assignment => <tr key={assignment.id}>
      <td>{teacherName(assignment.teacherId)}</td><td>{groupName(assignment.groupId)}<div className="cell-sub">{offeringName(assignment.offeringId)}</div></td><td>{componentName(assignment.componentId)}</td><td>{assignment.validFrom} → {assignment.validUntil || 'Sans date de fin'}</td>
      <td>{directory.canManageAssignments && <button className="btn btn-sm btn-outline" onClick={() => open({ kind: 'end_assignment', assignment })}>Terminer l’affectation</button>}</td>
    </tr>)}{!directory.assignments.length && <tr><td colSpan={5}>Aucune affectation dans cette année et ce périmètre.</td></tr>}</tbody></ResponsiveTable></section>}
    {operation && <WorkPage busy={saving} title={title} onClose={() => setOperation(null)}><ReviewedForm busy={saving} error={saveError}
      confirmLabel={`Confirmer : ${title.toLocaleLowerCase('fr')}`} fields={[...fields, { label: 'Motif', value: form.reason }]} consequence={consequence}
      validate={() => operation.kind === 'create_assignment' && form.validUntil && form.validUntil < form.validFrom ? 'La date de fin ne peut pas précéder la date de début.' : null}
      onConfirm={event => {
        event.preventDefault(); setSaving(true); setSaveError('');
        const common = { revision: directory.revision, reason: form.reason };
        const command: TeacherCommand = operation.kind === 'create_profile' ? { ...common, action: 'create_profile', staffId: form.staffId, specialty: form.specialty }
          : operation.kind === 'update_profile' ? { ...common, action: 'update_profile', teacherId: operation.teacher.id, specialty: form.specialty }
            : operation.kind === 'set_active' ? { ...common, action: 'set_active', teacherId: operation.teacher.id, active: !operation.teacher.active }
              : operation.kind === 'end_assignment' ? { ...common, action: 'end_assignment', assignmentId: operation.assignment.id, endOn: form.endOn }
                : { ...common, action: 'create_assignment', teacherId: form.teacherId, offeringId: form.offeringId, groupId: form.groupId, componentId: form.componentId, validFrom: form.validFrom, validUntil: form.validUntil || null };
        void manageTeacher(activeRole, command).then(() => {
          setOperation(null); setSuccess('Enregistrement effectué. Le motif et l’historique sont conservés.'); setReload(value => value + 1); portal.refreshCampus();
        }).catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setSaving(false));
      }}>
      {operation.kind === 'create_profile' && <label className="form-group">Membre du personnel<select className="select-input" required value={form.staffId} onChange={event => setForm({ ...form, staffId: event.target.value })}><option value="">Choisir un dossier existant</option>{directory.staff.map(member => <option key={member.id} value={member.id}>{member.name} · {member.employeeNumber}</option>)}</select></label>}
      {(operation.kind === 'create_profile' || operation.kind === 'update_profile') && <label className="form-group">Spécialité<input className="input" maxLength={160} value={form.specialty} onChange={event => setForm({ ...form, specialty: event.target.value })} /></label>}
      {operation.kind === 'set_active' && <p>{operation.teacher.name} : {operation.teacher.active ? 'Actif → Inactif' : 'Inactif → Actif'}</p>}
      {operation.kind === 'create_assignment' && <div className="form-grid">
        <label className="form-group">Enseignant<select className="select-input" required value={form.teacherId} onChange={event => setForm({ ...form, teacherId: event.target.value })}><option value="">Choisir un enseignant actif</option>{directory.teachers.filter(teacher => teacher.active).map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
        <label className="form-group">Formation annuelle<select className="select-input" required value={form.offeringId} onChange={event => setForm({ ...form, offeringId: event.target.value, groupId: '', componentId: '' })}><option value="">Choisir une formation</option>{directory.offerings.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
        <label className="form-group">Groupe<select className="select-input" required disabled={!offering} value={form.groupId} onChange={event => setForm({ ...form, groupId: event.target.value })}><option value="">Choisir un groupe rattaché</option>{directory.groups.filter(group => group.offeringIds.includes(form.offeringId)).map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
        <label className="form-group">Matière du programme<select className="select-input" required disabled={!offering} value={form.componentId} onChange={event => setForm({ ...form, componentId: event.target.value })}><option value="">Choisir une matière de la maquette</option>{directory.components.filter(component => component.curriculumId === offering?.curriculumId).map(component => <option key={component.id} value={component.id}>{component.label}</option>)}</select></label>
        <label className="form-group">Début de l’affectation<input className="input" type="date" required value={form.validFrom} onChange={event => setForm({ ...form, validFrom: event.target.value })} /></label>
        <label className="form-group">Fin prévue (facultative)<input className="input" type="date" min={form.validFrom} value={form.validUntil} onChange={event => setForm({ ...form, validUntil: event.target.value })} /></label>
      </div>}
      {operation.kind === 'end_assignment' && <label className="form-group">Fin de l’affectation<input className="input" type="date" required min={operation.assignment.validFrom} max={operation.assignment.validUntil || undefined} value={form.endOn} onChange={event => setForm({ ...form, endOn: event.target.value })} /></label>}
      <label className="form-group">Motif<textarea className="input" required minLength={3} maxLength={1000} value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} /></label>
      <DrawerActions><button className="btn btn-primary">Vérifier les informations</button><DrawerCloseButton className="btn btn-outline" disabled={saving}>Annuler</DrawerCloseButton></DrawerActions>
    </ReviewedForm></WorkPage>}
  </div>;
}

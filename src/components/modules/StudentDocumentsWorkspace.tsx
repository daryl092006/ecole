'use client';
import ListFilters from '@/components/ui/ListFilters';
import SecondaryDetails from '@/components/ui/SecondaryDetails';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadStudentDocuments, uploadStudentDocument, reviewStudentDocument, studentDocumentUrl } from '@/services/remoteCampusService';
import type { StudentDocumentDirectory } from '@/types/studentDocumentWorkspace';
import type { DatabaseRow } from '@/types/persistence';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import ConnectedDomainWorkspace from './ConnectedDomainWorkspace';
import TranscriptPrintAction from './academic/TranscriptPrintAction';
import { connectedRecordValue } from '@/services/connectedRecordDisplayService';
const labels: Record<string, string> = { A_VERIFIER: 'À vérifier', CONFORME: 'Conforme', NON_CONFORME: 'Non conforme' };
type Action = { kind: 'upload'; previous?: DatabaseRow } | { kind: 'review'; row: DatabaseRow; status: 'CONFORME' | 'NON_CONFORME' };
export default function StudentDocumentsWorkspace({ studentMatricule }: { studentMatricule?: string }) {
  const portal = usePortal();
  const [directory, setDirectory] = useState<StudentDocumentDirectory | null>(null);
  const [loadError, setLoadError] = useState(''); const [reload, setReload] = useState(0);
  const [filter, setFilter] = useState(''); const [action, setAction] = useState<Action | null>(null);
  const [studentId, setStudentId] = useState(''); const [enrollmentId, setEnrollmentId] = useState(''); const [typeId, setTypeId] = useState('');
  const [file, setFile] = useState<File | null>(null); const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [issued, setIssued] = useState(false);
  useEffect(() => { const controller = new AbortController(); setLoadError(''); void loadStudentDocuments(portal.activeRole, controller.signal).then(data => { if (!controller.signal.aborted) setDirectory(data); }).catch(cause => { if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Chargement impossible.'); }); return () => controller.abort(); }, [portal.activeRole, portal.academicYearSelection, reload]);
  function open(next: Action) { setAction(next); setFile(null); setReason(''); setError(''); setStudentId(String(next.kind === 'upload' && next.previous?.student_id || '')); setEnrollmentId(String(next.kind === 'upload' && next.previous?.enrollment_id || '')); setTypeId(String(next.kind === 'upload' && next.previous?.document_type_id || '')); }
  if (issued && !studentMatricule) return <div className="workspace-stack"><button className="btn btn-outline" onClick={() => setIssued(false)}>Revenir aux pièces et vérifications</button><ConnectedDomainWorkspace section="stud_cards" studentMatricule={studentMatricule} onlyCollection="generated_documents" /></div>;
  if (!directory) return loadError ? <ErrorState title="Pièces indisponibles" message={loadError} onRetry={() => setReload(value => value + 1)} /> : <LoadingState label="Chargement des pièces étudiantes…" variant="cards" />;
  const students = directory.students.filter(row => !studentMatricule || row.matricule === studentMatricule);
  const selectedStudentId = studentId || (students.length === 1 ? students[0].id : '');
  const enrollments = directory.enrollments.filter(row => row.student_id === selectedStudentId);
  const selectedEnrollmentId = enrollmentId || (enrollments.length === 1 ? enrollments[0].id : '');
  const selectedTypeId = typeId || (directory.types.length === 1 ? directory.types[0].id : '');
  const selectedType = directory.types.find(row => row.id === selectedTypeId);
  const studentName = (id: unknown) => String(directory.students.find(row => row.id === id)?.name || 'Étudiant');
  const superseded = new Set(directory.documents.map(row => row.supersedes_id));
  const issuedDocuments = (portal.relationalSnapshot.tables.generated_documents || []).filter(row => students.some(student => student.id === row.student_id) && !row.archived_at);
  const documents = directory.documents.filter(row => students.some(student => student.id === row.student_id) && `${row.filename} ${studentName(row.student_id)}`.toLocaleLowerCase('fr').includes(filter.toLocaleLowerCase('fr')));
  const label = action?.kind === 'upload' ? action.previous ? 'Enregistrer la nouvelle version' : 'Déposer la pièce' : 'Confirmer la vérification';
  async function save() {
    if (!directory || !action || busy) return; setBusy(true); setError('');
    try {
      if (action.kind === 'upload') { if (!file) throw new Error('Choisissez un fichier.'); await uploadStudentDocument({ revision: directory.revision, studentId: selectedStudentId, enrollmentId: selectedEnrollmentId, documentTypeId: selectedTypeId, supersedesId: action.previous?.id || null }, file, portal.activeRole); }
      else await reviewStudentDocument({ revision: directory.revision, id: action.row.id, status: action.status, reason: reason.trim() }, portal.activeRole);
      setAction(null); setSuccess('La pièce et son suivi ont été enregistrés.'); await portal.refreshCampus(); setReload(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.'); } finally { setBusy(false); }
  }
  async function download(id: string) {
    try {
      setLoadError('');
      const url = await studentDocumentUrl(id, portal.activeRole);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Téléchargement impossible.');
    }
  }
  return <div className="domain-workspace workspace-stack student-document-workspace">
    <div className="page-intro">
      <div>
        <span className="page-eyebrow">DOSSIERS & ÉTUDIANTS</span>
        <h1>{studentMatricule ? 'Pièces du dossier étudiant' : 'Pièces étudiantes'}</h1>
        <p>Vérifiez la conformité des pièces déposées et suivez les versions officielles.</p>
      </div>
      <div className="btn-group">
        <button className="btn btn-outline" onClick={() => setReload(value => value + 1)}>Actualiser</button>
        {directory.canUpload && <button className="btn btn-primary" disabled={!directory.yearId || !students.length} onClick={() => open({ kind: 'upload' })}>Ajouter une pièce</button>}
      </div>
    </div>
    {!studentMatricule && issuedDocuments.length > 0 && <button className="btn btn-outline" onClick={() => setIssued(true)}>Consulter les documents établis</button>}{!directory.yearId && <p className="info-box">Toutes les années : consultation uniquement.</p>}{success && <p className="info-box" role="status">{success}</p>}{loadError && <p className="restricted-box" role="alert">{loadError}</p>}
    {!studentMatricule && <ListFilters count={directory.documents.length} active={Boolean(filter)}><section className="card"><label className="form-group">Rechercher une pièce<input className="input" type="search" value={filter} onChange={event => setFilter(event.target.value)} /></label></section></ListFilters>}
    {!documents.length && <section className="card"><p>{studentMatricule ? 'Aucune pièce déposée.' : 'Aucune pièce pour ces critères.'}</p></section>}
    {documents.map(row => <section className="card publication-card" key={row.id}><div className="card-header"><h2>{String(row.filename)}</h2><span className="pill pill-default">{superseded.has(row.id) ? 'Ancienne version' : labels[String(row.status)]}</span></div><p>{!studentMatricule && `${studentName(row.student_id)} · `}{String(directory.types.find(type => type.id === row.document_type_id)?.name || 'Pièce')}{(!studentMatricule || Number(row.version) > 1) && ` · Version ${String(row.version)}`}</p><div className="btn-group"><button className="btn btn-outline" onClick={() => { void download(row.id); }}>Télécharger</button>{directory.yearId && !superseded.has(row.id) && <>{directory.canUpload && <button className="btn btn-outline" onClick={() => open({ kind: 'upload', previous: row })}>Remplacer la pièce</button>}{directory.canReview && <>{row.status !== 'CONFORME' && <button className="btn btn-primary" onClick={() => open({ kind: 'review', row, status: 'CONFORME' })}>Déclarer conforme</button>}{row.status !== 'NON_CONFORME' && <button className="btn btn-outline" onClick={() => open({ kind: 'review', row, status: 'NON_CONFORME' })}>Déclarer non conforme</button>}</>}</>}</div>{directory.reviews.some(review => review.document_id === row.id) && <SecondaryDetails title="Historique de vérification">{directory.reviews.filter(review => review.document_id === row.id).map(review => <p key={review.id}>{labels[String(review.status)]} · {String(review.reason)}</p>)}</SecondaryDetails>}</section>)}
    {studentMatricule && issuedDocuments.length > 0 && <section className="card"><div className="card-header"><h2>Documents établis & Relevés officiels</h2><span className="pill pill-default">{issuedDocuments.length} document(s)</span></div><div className="workspace-stack" style={{ gap: '0.75rem', marginTop: '0.75rem' }}>{issuedDocuments.map(document => <div key={document.id} className="dossier-doc-card"><div className="dossier-doc-main"><div><strong>{document.kind === 'RELEVE' ? 'Relevé de notes officiel REESAO' : String(document.reference || 'Document établi')}</strong><div className="cell-sub">Réf. {String(document.reference || '—')} · Émis le {connectedRecordValue('generated_documents', 'issued_at', document.issued_at, portal.relationalSnapshot)}</div></div></div><div className="btn-group">{document.kind === 'RELEVE' && <TranscriptPrintAction document={document} />}</div></div>)}</div></section>}
    {action && <WorkPage title={label} busy={busy} onClose={() => setAction(null)}><ReviewedForm busy={busy} error={error} confirmLabel={label} onConfirm={() => { void save(); }} fields={action.kind === 'upload' ? [{ label: 'Étudiant', value: studentName(selectedStudentId) }, { label: 'Inscription', value: selectedEnrollmentId }, { label: 'Type de pièce', value: String(selectedType?.name || '') }, { label: 'Fichier', value: file ? `${file.name} · ${file.size.toLocaleString('fr-FR')} octets` : '' }, ...(action.previous ? [{ label: 'Version remplacée', value: String(action.previous.version) }] : [])] : [{ label: 'Fichier', value: String(action.row.filename) }, { label: 'Conformité', previous: labels[String(action.row.status)], value: labels[action.status] }, { label: 'Motif', value: reason }]}
      consequence={action.kind === 'upload' ? 'Le fichier sera conservé dans un stockage privé et soumis à vérification. Les versions précédentes seront conservées.' : 'Le statut et le motif seront enregistrés ensemble dans l’historique de cette pièce.'}
      validate={() => action.kind === 'upload' ? !selectedStudentId || !selectedEnrollmentId || !selectedTypeId || !file ? 'Choisissez le dossier, l’inscription, le type et le fichier.' : file.size > Math.min(5242880, Number(selectedType?.max_byte_size || 5242880)) ? 'Le fichier dépasse la taille autorisée.' : null : reason.trim().length < 3 ? 'Le motif doit contenir au moins trois caractères.' : null}>
      {action.kind === 'upload' ? <>{!studentMatricule && <label className="form-group">Étudiant<select className="select-input" required disabled={!!action.previous} value={selectedStudentId} onChange={event => { setStudentId(event.target.value); setEnrollmentId(''); }}><option value="">Choisir un dossier</option>{students.map(row => <option key={row.id} value={row.id}>{String(row.matricule)} · {String(row.name)}</option>)}</select></label>}{(!studentMatricule || enrollments.length !== 1) && <label className="form-group">Inscription annuelle<select className="select-input" required disabled={!!action.previous} value={selectedEnrollmentId} onChange={event => setEnrollmentId(event.target.value)}><option value="">Choisir</option>{enrollments.map(row => <option key={row.id} value={row.id}>{String(row.label || 'Inscription annuelle')} · {String(row.status)}</option>)}</select></label>}<label className="form-group">Type de pièce<select className="select-input" required disabled={!!action.previous} value={selectedTypeId} onChange={event => setTypeId(event.target.value)}><option value="">Choisir</option>{directory.types.map(row => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></label><label className="form-group">Fichier PDF, JPEG ou PNG (5 Mo maximum)<input className="input" type="file" required accept="application/pdf,image/jpeg,image/png" onChange={event => setFile(event.target.files?.[0] || null)} /></label></> : <label className="form-group">Motif de vérification<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>}
      <DrawerActions><button type="submit" className="btn btn-primary">Vérifier les informations</button></DrawerActions></ReviewedForm>{error && <button className="btn btn-outline" disabled={busy} onClick={() => setReload(value => value + 1)}>Actualiser les données avant de réessayer</button>}</WorkPage>}
  </div>;
}

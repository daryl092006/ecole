'use client';
import DrawerActions from '@/components/ui/DrawerActions';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { ROLES } from '@/types/permissions';
import type { ComplaintWorkflowStatus } from '@/types/academic';
import type { DatabaseRow } from '@/types/persistence';
import { connectedRecordName, connectedRecordValue } from '@/services/connectedRecordDisplayService';
import { manageComplaint } from '@/services/remoteCampusService';
import { academicYearRequestHeaders } from '@/services/academicYearSelection';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import LoadingState from '@/components/ui/LoadingState';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import PersistentExamCopies from './PersistentExamCopies';
import EvaluationGradeDialog from './EvaluationGradeDialog';
import StudentRecordDialog from '../StudentRecordDialog';

interface ComplaintDirectory { revision: number; complaints: DatabaseRow[]; events: DatabaseRow[]; revisions: DatabaseRow[]; }
interface TransitionAction { complaint: DatabaseRow; target: ComplaintWorkflowStatus; label: string; correction?: boolean; }

export default function ComplaintsPanel() {
  const portal = usePortal();
  const snapshot = portal.relationalSnapshot;
  const permissions = portal.perms.permissions;
  const [directory, setDirectory] = useState<ComplaintDirectory | null>(null);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<TransitionAction | null>(null);
  const [gradeId, setGradeId] = useState('');
  const [reason, setReason] = useState('');
  const [correctedGrade, setCorrectedGrade] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [viewingCopy, setViewingCopy] = useState<{ evaluationId: string; candidateId: string } | null>(null);
  const [viewingEvaluationId, setViewingEvaluationId] = useState<string | null>(null);
  const [viewingStudentMatricule, setViewingStudentMatricule] = useState<string | null>(null);
  const preciseYear = !!portal.academicYearContext?.selectedYearId;
  const canDeposit = permissions.includes('complaint.view') && [ROLES.STUD, ROLES.DEL, ROLES.IT].includes(portal.activeRole as typeof ROLES.STUD);
  const canReview = permissions.includes('complaint.review');
  const canCorrect = canReview && permissions.includes('grade.approve');

  useEffect(() => {
    const controller = new AbortController();
    setDirectory(null); setLoadError('');
    void (async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      if (!data.session) throw new Error('Connexion requise.');
      const response = await fetch('/api/complaints', {
        headers: { Authorization: `Bearer ${data.session.access_token}`, 'x-escen-role': portal.activeRole, ...academicYearRequestHeaders() },
        cache: 'no-store', signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chargement des réclamations impossible.');
      if (!controller.signal.aborted) setDirectory(result);
    })().catch(cause => { if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [portal.activeRole, portal.academicYearSelection, retry]);

  const candidates = snapshot.tables.evaluation_candidates || [];
  const evaluations = snapshot.tables.evaluations || [];
  const grades = snapshot.tables.grades || [];
  const eligibleGrades = grades.filter(grade => {
    const candidate = candidates.find(row => row.id === grade.candidate_id);
    const evaluation = evaluations.find(row => row.id === candidate?.evaluation_id);
    const enrollment = snapshot.tables.enrollments?.find(row => row.id === candidate?.enrollment_id);
    return evaluation?.status === 'PUBLIEES'
      && (portal.activeRole === ROLES.IT || enrollment?.student_id === portal.session?.studentId)
      && !directory?.complaints.some(row => row.grade_id === grade.id && row.status !== 'CLOTUREE');
  });
  const gradeLabel = (grade: DatabaseRow) => `${connectedRecordName('grades', grade, snapshot)} · ${grade.value == null ? 'Absence ou note non renseignée' : `${grade.value}/20`}`;
  const complaintLabel = (complaint: DatabaseRow) => {
    if (typeof complaint.label === 'string') return complaint.label;
    const candidate = candidates.find(row => row.id === complaint.candidate_id);
    return candidate ? connectedRecordName('evaluation_candidates', candidate, snapshot) : 'Dossier ou évaluation non retrouvé';
  };
  const choose = (complaint: DatabaseRow, target: ComplaintWorkflowStatus, label: string, correction = false) => {
    setSelected({ complaint, target, label, correction }); setReason(''); setCorrectedGrade(''); setError('');
  };
  const controls = (complaint: DatabaseRow) => {
    if (!preciseYear) return null;
    if (canReview) {
      if (complaint.status === 'NOUVELLE') return <button className="btn btn-outline" onClick={() => choose(complaint, 'EN_ANALYSE', 'Prendre en charge')}>Prendre en charge</button>;
      if (complaint.status === 'EN_ANALYSE') return <button className="btn btn-outline" onClick={() => choose(complaint, 'TRANSMISE_ENSEIGNANT', 'Transmettre à l’enseignant')}>Transmettre à l’enseignant</button>;
      if (complaint.status === 'AVIS_ENSEIGNANT') return <button className="btn btn-outline" onClick={() => choose(complaint, 'DECISION_ACADEMIQUE', 'Enregistrer la décision académique')}>Prendre une décision</button>;
      if (complaint.status === 'DECISION_ACADEMIQUE') return <div className="btn-group"><button className="btn btn-outline" onClick={() => choose(complaint, 'CLOTUREE', 'Clôturer sans correction')}>Clôturer sans correction</button><button className="btn btn-outline" onClick={() => choose(complaint, 'CORRECTION_EVENTUELLE', 'Demander une correction')}>Demander une correction</button></div>;
      if (complaint.status === 'CORRECTION_EVENTUELLE' && canCorrect) return <button className="btn btn-outline" onClick={() => choose(complaint, 'CLOTUREE', 'Corriger la note et clôturer', true)}>Appliquer la correction</button>;
    }
    if (complaint.status === 'TRANSMISE_ENSEIGNANT' && permissions.includes('complaint.view') && (portal.activeRole === ROLES.ENS || portal.activeRole === ROLES.IT && canReview)) {
      return <button className="btn btn-outline" onClick={() => choose(complaint, 'AVIS_ENSEIGNANT', 'Enregistrer mon avis')}>Donner mon avis</button>;
    }
    return <p className="cell-sub">{complaint.status === 'CLOTUREE' ? 'Traitement terminé' : 'En attente du rôle compétent'}</p>;
  };
  const save = async () => {
    if (!directory || busy) return;
    setBusy(true); setError('');
    try {
      await manageComplaint(portal.activeRole, creating ? {
        action: 'create_complaint', gradeId, reason, revision: directory.revision,
      } : {
        action: 'transition_complaint', complaintId: selected!.complaint.id,
        fromStatus: selected!.complaint.status, toStatus: selected!.target,
        reason, revision: directory.revision,
        ...(selected!.correction ? { correctedGrade: Number(correctedGrade) } : {}),
      });
      setMessage(creating ? 'Réclamation déposée. Son traitement est disponible dans la liste.' : selected?.correction ? 'Note corrigée et réclamation clôturée. L’ancienne valeur est conservée.' : 'Étape de traitement enregistrée.');
      setCreating(false); setSelected(null); setRetry(value => value + 1); portal.refreshCampus();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  const records = directory?.complaints.filter(row => !filter || (filter === 'EN_COURS' ? row.status !== 'CLOTUREE' : row.status === filter)) || [];
  const chosenGrade = eligibleGrades.find(row => row.id === gradeId);
  return <div>
    <div className="module-header"><h1>Réclamations académiques</h1>{canDeposit && preciseYear && <button className="btn btn-primary" disabled={!directory || !!loadError} onClick={() => { setCreating(true); setGradeId(''); setReason(''); setError(''); }}>Déposer une réclamation</button>}</div>
    {!preciseYear && <p className="info-box">Toutes les années : consultation uniquement. Choisissez une année précise pour déposer ou traiter une réclamation.</p>}
    {message && <p role="status">{message}</p>}
    {loadError ? <section className="card" role="alert"><p>{loadError}</p><button className="btn btn-outline" onClick={() => setRetry(value => value + 1)}>Réessayer</button></section> : !directory ? <LoadingState label="Chargement des réclamations…" /> : <section className="card card-full">
      <div className="card-header"><h2>Réclamations ({records.length})</h2><label className="form-group">État du traitement<select className="select-input" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Toutes</option><option value="EN_COURS">En cours</option><option value="CLOTUREE">Clôturées</option></select></label></div>
      {records.map(complaint => {
        const candidate = candidates.find(row => row.id === complaint.candidate_id);
        const evalId = String(complaint.evaluation_id || candidate?.evaluation_id || '');
        const hasOnlineCopy = Boolean(complaint.has_online_copy || (snapshot.tables.exam_attempts || []).some(a => a.candidate_id === complaint.candidate_id));
        const studentMat = typeof complaint.student_matricule === 'string' && complaint.student_matricule
          ? complaint.student_matricule
          : (() => {
              const enr = candidate ? snapshot.tables.enrollments?.find(e => e.id === candidate.enrollment_id) : undefined;
              const stud = enr ? snapshot.tables.students?.find(s => s.id === enr.student_id) : undefined;
              return stud?.matricule ? String(stud.matricule) : '';
            })();
        const gradeRow = grades.find(g => g.id === complaint.grade_id);
        const displayGrade = complaint.grade_value !== undefined && complaint.grade_value !== null
          ? `${Number(complaint.grade_value)} / 20`
          : gradeRow?.value != null
          ? `${Number(gradeRow.value)} / 20`
          : (complaint.absence_status || gradeRow?.absence_status)
          ? connectedRecordValue('grades', 'absence_status', complaint.absence_status || gradeRow?.absence_status, snapshot)
          : null;
        return <article className="ledger-item" key={complaint.id}>
          <div className="catalog-item">
            <div>
              <strong>{complaintLabel(complaint)}</strong>
              {displayGrade && <span className="cell-sub" style={{ marginLeft: 8 }}>· Note actuelle : <strong>{displayGrade}</strong></span>}
            </div>
            <span className="pill pill-default">{connectedRecordValue('complaints', 'status', complaint.status, snapshot)}</span>
          </div>
          <p>{String(complaint.reason || '')}</p>
          <div className="btn-group" style={{ flexWrap: 'wrap', gap: 8 }}>
            {controls(complaint)}
            {hasOnlineCopy && evalId && (
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setViewingCopy({ evaluationId: evalId, candidateId: String(complaint.candidate_id) })}>
                Consulter la copie en ligne
              </button>
            )}
            {evalId && (permissions.includes('grade.review') || permissions.includes('grade.enter') || permissions.includes('grade.approve')) && (
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setViewingEvaluationId(evalId)}>
                Grille de l’évaluation
              </button>
            )}
            {studentMat && permissions.includes('student.view') && !portal.perms.scope.ownDataOnly && (
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setViewingStudentMatricule(studentMat)}>
                Dossier étudiant ({studentMat})
              </button>
            )}
          </div>
          <details><summary>Historique du traitement</summary>
            <p>Motif du dépôt : {String(complaint.reason || 'Non renseigné')}</p>
            {directory.events.filter(row => row.complaint_id === complaint.id).sort((a, b) => String(a.happened_at || '').localeCompare(String(b.happened_at || ''))).map(event => <p key={event.id}>{connectedRecordValue('complaint_events', 'happened_at', event.happened_at, snapshot)} · {connectedRecordValue('complaint_events', 'from_status', event.from_status, snapshot)} → {connectedRecordValue('complaint_events', 'to_status', event.to_status, snapshot)} · {String(event.reason || '')} · Auteur : {String(event.actor_id || 'Non renseigné')}</p>)}
            {directory.revisions.filter(row => row.complaint_id === complaint.id).map(revision => <p key={revision.id}>Correction : {String(revision.old_value)} → {String(revision.new_value)}/20 · {String(revision.reason || '')}</p>)}
          </details>
        </article>;
      })}
      {!records.length && <p>Aucune réclamation pour ce filtre dans votre périmètre.</p>}
    </section>}
    {(creating || selected) && <WorkPage title={creating ? 'Déposer une réclamation' : selected!.label} busy={busy} onClose={() => { setCreating(false); setSelected(null); }}>
      <ReviewedForm busy={busy} error={error} confirmLabel={creating ? 'Confirmer le dépôt' : 'Confirmer le traitement'}
        fields={[{ label: 'Note ou dossier', value: creating ? chosenGrade ? gradeLabel(chosenGrade) : '' : complaintLabel(selected!.complaint) }, { label: 'Motif', value: reason }, ...(selected?.correction ? [{ label: 'Nouvelle note /20', value: correctedGrade }] : [])]}
        consequence={creating ? 'La réclamation sera enregistrée sur cette note publiée. La note reste inchangée pendant son analyse.' : selected?.correction ? 'La correction et la clôture seront enregistrées ensemble, avec conservation de l’ancienne note et du motif.' : 'Cette étape sera enregistrée avec son auteur et son motif.'}
        validate={() => creating && !chosenGrade ? 'Choisissez une note publiée disponible.' : selected?.correction && (!correctedGrade.trim() || !Number.isFinite(Number(correctedGrade)) || Number(correctedGrade) < 0 || Number(correctedGrade) > 20) ? 'La note doit être comprise entre 0 et 20.' : null}
        onConfirm={() => { void save(); }}>
        {creating && <label className="form-group">Note concernée<select className="select-input" required value={gradeId} onChange={event => setGradeId(event.target.value)}><option value="">Choisir une note publiée</option>{eligibleGrades.map(grade => <option key={grade.id} value={grade.id}>{gradeLabel(grade)}</option>)}</select>{!eligibleGrades.length && <span>Aucune note publiée sans réclamation en cours dans votre périmètre.</span>}</label>}
        {selected?.correction && <label className="form-group">Nouvelle note /20<input className="input" required type="number" min="0" max="20" step="0.25" value={correctedGrade} onChange={event => setCorrectedGrade(event.target.value)} /></label>}
        <label className="form-group">{creating ? 'Motif de la réclamation' : 'Avis ou motif'}<textarea className="input" required minLength={creating ? 5 : 3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
        <DrawerActions><button className="btn btn-primary" disabled={creating && !eligibleGrades.length}>Vérifier les informations</button></DrawerActions>
      </ReviewedForm>
    </WorkPage>}
    {viewingCopy && <PersistentExamCopies evaluationId={viewingCopy.evaluationId} candidateId={viewingCopy.candidateId} onClose={() => setViewingCopy(null)} />}
    {viewingEvaluationId && <EvaluationGradeDialog evaluationId={viewingEvaluationId} onClose={() => { setViewingEvaluationId(null); setRetry(v => v + 1); }} />}
    {viewingStudentMatricule && <StudentRecordDialog matricule={viewingStudentMatricule} onClose={() => setViewingStudentMatricule(null)} />}
  </div>;
}

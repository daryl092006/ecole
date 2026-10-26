'use client';
import IconButton from '@/components/ui/IconButton';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import ConnectedDomainWorkspace from './ConnectedDomainWorkspace';
import StudentDocumentsWorkspace from './StudentDocumentsWorkspace';
import HistoricalWorkspace from '@/components/modules/history/HistoricalWorkspace';
import StudentOperationsPanel from './StudentOperationsPanel';
import StudentEnrollmentsPanel from './StudentEnrollmentsPanel';
import StudentProfilePanel from '@/components/modules/StudentProfilePanel';
import LoadingState from '@/components/ui/LoadingState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import PersistentExamCopies from './academic/PersistentExamCopies';
import EvaluationGradeDialog from './academic/EvaluationGradeDialog';
import { loadStudentRecord } from '@/services/remoteCampusService';
import { connectedRecordName, connectedRecordValue } from '@/services/connectedRecordDisplayService';
import {
  evaluationCandidateStatusLabel,
  evaluationGradeNoteLabel,
  evaluationGradeValue,
  evaluationGradeIsComplete,
} from '@/services/evaluationGradePolicy';
import type { Student } from '@/types/student';
import { useEffect, useState } from 'react';

export default function StudentRecordPanel({ studentId, embedded = false, initialSection = 'identity' }: { studentId: string; embedded?: boolean; initialSection?: 'identity' | 'finance' | 'parcours' }) {
  const state = usePortal();
  const current = state.students.find(item => item.matricule === studentId);
  const [loaded, setLoaded] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [viewingCopy, setViewingCopy] = useState<{ evaluationId: string; candidateId: string } | null>(null);
  const [viewingEvalId, setViewingEvalId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoaded(null);
    setError('');
    void loadStudentRecord(studentId, state.activeRole, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setLoaded(result.student);
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [studentId, state.activeRole, state.academicYearSelection, current, retry]);

  const student = loaded || current;
  const [section, setSection] = useState<string>(initialSection);
  if (!student && !error) return <LoadingState label="Chargement du dossier étudiant…" />;
  if (!student) {
    return (
      <div>
        <div className="module-header">
          <h1>Dossier indisponible</h1>
          <p>{error}</p>
        </div>
        <IconButton className="btn btn-outline" onClick={() => setRetry(value => value + 1)} label="Réessayer" />
      </div>
    );
  }

  const snapshot = state.relationalSnapshot;
  const nativeStudent = snapshot.tables.students?.find(item => item.matricule === student.matricule);
  const studentEnrollmentIds = new Set(
    (snapshot.tables.enrollments || [])
      .filter(row => nativeStudent && row.student_id === nativeStudent.id)
      .map(row => String(row.id)),
  );
  const studentAttendances = (snapshot.tables.attendances || []).filter(row =>
    studentEnrollmentIds.has(String(row.enrollment_id)),
  );
  const studentAbsencesCount = studentAttendances.filter(row =>
    ['ABSENT', 'ABSENT_JUSTIFIE'].includes(String(row.status || '')),
  ).length;
  const studentLatesCount = studentAttendances.filter(row =>
    ['RETARD', 'RETARD_JUSTIFIE'].includes(String(row.status || '')),
  ).length;
  const studentCandidates = (snapshot.tables.evaluation_candidates || []).filter(row =>
    studentEnrollmentIds.has(String(row.enrollment_id)),
  );
  const gradesByCandidate = new Map((snapshot.tables.grades || []).map(g => [String(g.candidate_id), g]));
  const studentEvaluationsSummary = studentCandidates.map(cand => {
    const ev = (snapshot.tables.evaluations || []).find(e => e.id === cand.evaluation_id);
    const comp = ev ? (snapshot.tables.curriculum_components || []).find(c => c.id === ev.component_id) : undefined;
    const subj = comp ? (snapshot.tables.subjects || []).find(s => s.id === comp.subject_id) : undefined;
    const grade = gradesByCandidate.get(String(cand.id));
    const gradeVal = evaluationGradeValue(grade);
    const lastAttempt = (snapshot.tables.exam_attempts || [])
      .filter(a => a.candidate_id === cand.id)
      .sort((a, b) => Number(b.attempt_number) - Number(a.attempt_number))[0];
    const complaint = (snapshot.tables.complaints || []).find(
      c => c.candidate_id === cand.id || (grade && c.grade_id === grade.id),
    );
    return {
      candidateId: String(cand.id),
      evaluationId: String(cand.evaluation_id || ''),
      subjectName: subj ? String(subj.name || subj.code || '') : comp ? connectedRecordName('curriculum_components', comp, snapshot) : 'Matière',
      evaluationName: ev ? String(ev.name || '') : 'Évaluation',
      evaluationKind: ev ? String(ev.kind || '') : '',
      evaluationStatus: ev ? String(ev.status || '') : '',
      gradeVal,
      gradeComplete: evaluationGradeIsComplete(grade),
      noteLabel: evaluationGradeNoteLabel(grade, lastAttempt?.status),
      statusLabel: evaluationCandidateStatusLabel(grade, lastAttempt?.status),
      absenceStatus: grade?.absence_status ? String(grade.absence_status) : null,
      hasOnlineCopy: Boolean(lastAttempt),
      complaintStatus: complaint ? String(complaint.status) : null,
    };
  });
  const numericStudentGrades = studentEvaluationsSummary
    .filter(item => item.gradeComplete)
    .map(item => item.gradeVal)
    .filter((v): v is number => v !== null);
  const pendingCorrectionStudentCount = studentEvaluationsSummary.filter(
    item => !item.gradeComplete,
  ).length;

  const annualEnrollments = state.campus.data.enrollments.filter(item => item.studentId === student.matricule);
  const selectedYear = state.academicYearContext?.years.find(item => item.id === state.academicYearContext?.selectedYearId);
  const sections = [
    { id: 'identity', name: 'Identité et contacts', table: '', native: '' },
    { id: 'parcours', name: 'Années et groupes', table: 'etudiant_group', native: 'stud_status' },
    ...(state.perms.permissions.includes('attendance.view')
      ? [{ id: 'assiduite', name: 'Assiduité et présences', table: 'presences', native: 'acad_attendance' }]
      : []),
    ...(state.perms.permissions.includes('finance.view')
      ? [{ id: 'finance', name: 'Frais et versements', table: 'frais_etudiants', native: 'fin_payments' }]
      : []),
    ...(state.perms.permissions.includes('grade.view')
      ? [{ id: 'notes', name: 'Notes', table: 'notes', native: 'acad_grades' }]
      : []),
    { id: 'documents', name: 'Pièces du dossier', table: 'documents', native: 'stud_cards' },
  ];

  return (
    <div>
      {!embedded && (
        <Link href="/etudiants" className="btn btn-outline">
          ← Revenir aux étudiants
        </Link>
      )}
      <div className="page-intro">
        <div>
          <span className="page-eyebrow">DOSSIER ÉTUDIANT · {student.matricule}</span>
          <h1>
            {student.firstname} {student.lastname}
          </h1>
          <p>
            {[student.filiere, student.niveau, student.groupe]
              .filter(value => value && !['À reprendre', 'Non affecté'].includes(value))
              .join(' · ') || 'Formation et groupe non confirmés pour l’année consultée'}
          </p>
        </div>
      </div>

      <section className="card card-full" aria-label="Situation scolaire et financière">
        <h2>Situation {selectedYear ? `en ${selectedYear.name}` : 'dans les années consultées'}</h2>
        <dl className="data-summary">
          <div>
            <dt>Inscription annuelle</dt>
            <dd>
              {annualEnrollments.length
                ? annualEnrollments.map(item => (
                    <p key={item.id}>
                      {state.campus.data.academicYears.find(year => year.id === item.academicYearId)?.label} ·{' '}
                      {item.status === 'REINSCRIT' ? 'Réinscrit' : item.status === 'INSCRIT' ? 'Inscrit' : item.status}
                    </p>
                  ))
                : 'Aucune inscription enregistrée pour l’année consultée'}
            </dd>
          </div>
          {state.perms.permissions.includes('finance.view') && (
            <>
              <div>
                <dt>Montant payé</dt>
                <dd>
                  {student.financials?.available === true
                    ? `${student.financials.paid.toLocaleString('fr-FR')} FCFA`
                    : 'Montant non établi : paiements et rattachements à vérifier'}
                </dd>
              </div>
              <div>
                <dt>Reste à payer</dt>
                <dd>
                  {student.financials?.available === true
                    ? `${student.financials.remaining.toLocaleString('fr-FR')} FCFA`
                    : 'Solde non établi'}
                </dd>
              </div>
            </>
          )}
          {state.perms.permissions.includes('attendance.view') && studentAttendances.length > 0 && (
            <div>
              <dt>Assiduité</dt>
              <dd>
                {studentAttendances.length} pointage(s) · {studentAbsencesCount} absence(s)
                {studentLatesCount > 0 ? ` · ${studentLatesCount} retard(s)` : ''}
              </dd>
            </div>
          )}
          {state.perms.permissions.includes('grade.view') && studentEvaluationsSummary.length > 0 && (
            <div>
              <dt>Évaluations & Notes</dt>
              <dd>
                {numericStudentGrades.length} notée(s)
                {pendingCorrectionStudentCount > 0 ? ` · ${pendingCorrectionStudentCount} à corriger` : ''}
              </dd>
            </div>
          )}
        </dl>
        {!annualEnrollments.length && (
          <p className="cell-sub">L’inscription pour cette année doit être enregistrée avant un encaissement.</p>
        )}
        {state.history.error && (
          <p role="alert">
            {state.history.error}
            <IconButton className="btn btn-outline" onClick={state.history.retry} label="Réessayer l’historique" />
          </p>
        )}
        {error && (
          <p role="alert">
            {error}
            <IconButton className="btn btn-outline" onClick={() => setRetry(value => value + 1)} label="Réessayer le dossier" />
          </p>
        )}
      </section>

      <nav className="record-sections" aria-label="Sections du dossier étudiant">
        {sections.map(item => (
          <button
            className={section === item.id ? 'selected' : ''}
            key={item.id}
            aria-pressed={section === item.id}
            onClick={() => setSection(item.id)}
          >
            {item.name}
          </button>
        ))}
      </nav>

      {section === 'identity' ? (
        <>
          <section className="card card-full">
            <h2>Identité et contacts</h2>
            <StudentProfilePanel key={student.matricule} student={student} />
          </section>
        </>
      ) : !annualEnrollments.length && student.historical && state.history.enabled ? (
        <HistoricalWorkspace
          embedded
          key={section}
          section={`student_${section}`}
          initialTable={sections.find(item => item.id === section)?.table}
          studentId={student.historical.sourceId}
          batchId={student.historical.batchId}
        />
      ) : (
        <>
          {['parcours', 'finance'].includes(section) && (
            <StudentOperationsPanel key={section} mode={section === 'finance' ? 'finance' : 'academic'} matricule={student.matricule} onChanged={() => setRetry(value => value + 1)} />
          )}
          {section === 'notes' && studentEvaluationsSummary.length > 0 && (
            <section className="card card-full mb-2" aria-label="Synthèse des évaluations et copies de l’étudiant">
              <div className="card-header">
                <div>
                  <h2>Évaluations, copies et résultats ({studentEvaluationsSummary.length})</h2>
                  <p className="cell-sub">
                    Vue consolidée des épreuves, de l’état de correction par l’enseignant, des copies en ligne et des réclamations.
                  </p>
                </div>
              </div>
              <div className="table-wrap">
                <ResponsiveTable className="data-table">
                  <thead>
                    <tr>
                      <th>Matière</th>
                      <th>Évaluation</th>
                      <th>État épreuve</th>
                      <th>Note / 20</th>
                      <th>Présence & Correction</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentEvaluationsSummary.map(item => (
                      <tr key={item.candidateId}>
                        <td><strong>{item.subjectName}</strong></td>
                        <td>
                          <div>{item.evaluationName}</div>
                          {item.evaluationKind && <div className="cell-sub">{item.evaluationKind}</div>}
                        </td>
                        <td>
                          <span className="pill pill-default">
                            {connectedRecordValue('evaluations', 'status', item.evaluationStatus, snapshot)}
                          </span>
                        </td>
                        <td><strong>{item.noteLabel}</strong></td>
                        <td>
                          <span className={`pill ${item.absenceStatus ? 'pill-warning' : item.gradeVal !== null ? 'pill-success' : 'pill-default'}`}>
                            {item.statusLabel}
                          </span>
                          {item.complaintStatus && (
                            <div className="cell-sub" style={{ marginTop: 4 }}>
                              Réclamation : {connectedRecordValue('complaints', 'status', item.complaintStatus, snapshot)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="btn-group">
                            {item.hasOnlineCopy && item.evaluationId && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => setViewingCopy({ evaluationId: item.evaluationId, candidateId: item.candidateId })}
                              >
                                Lire la copie
                              </button>
                            )}
                            {item.evaluationId &&
                              (state.perms.permissions.includes('grade.enter') ||
                                state.perms.permissions.includes('grade.review') ||
                                state.perms.permissions.includes('grade.approve')) && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  onClick={() => setViewingEvalId(item.evaluationId)}
                                >
                                  Ouvrir l’évaluation
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ResponsiveTable>
              </div>
            </section>
          )}
          {section === 'parcours' ? <StudentEnrollmentsPanel matricule={student.matricule} /> : section === 'documents' ? <StudentDocumentsWorkspace studentMatricule={student.matricule} /> : <ConnectedDomainWorkspace
            key={section}
            section={sections.find(item => item.id === section)!.native}
            studentMatricule={student.matricule}
          />}
        </>
      )}

      {viewingCopy && (
        <PersistentExamCopies
          evaluationId={viewingCopy.evaluationId}
          candidateId={viewingCopy.candidateId}
          onClose={() => setViewingCopy(null)}
        />
      )}
      {viewingEvalId && (
        <EvaluationGradeDialog
          evaluationId={viewingEvalId}
          onClose={() => {
            setViewingEvalId(null);
            setRetry(v => v + 1);
          }}
        />
      )}
    </div>
  );
}

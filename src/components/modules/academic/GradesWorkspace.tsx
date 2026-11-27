'use client';

import { useMemo, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { useAcademicReferences } from '@/hooks/useAcademicReferences';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import DataPanel from '@/components/ui/DataPanel';
import WorkspaceSummary from '@/components/ui/WorkspaceSummary';
import StudentRecordDialog from '@/components/modules/StudentRecordDialog';
import type { DatabaseRow } from '@/types/persistence';
import {
  evaluationGradeIsComplete,
  evaluationGradeValue,
  evaluationGradeNoteLabel,
} from '@/services/evaluationGradePolicy';
import EvaluationGradeDialog from './EvaluationGradeDialog';
import PersistentExamCopies from './PersistentExamCopies';
import PageHeader from '@/components/ui/PageHeader';
import { downloadCsv } from '@/utils/csv';
import { formatSubjectCode } from '@/services/resaoCodeService';
import { computeSubjectAverage } from '@/services/gradeCalculationService';
import { buildProvisionalTranscriptDocument } from '@/services/schoolCertificateService';
import { printTranscript } from '@/utils/printTranscript';
import { ROLES } from '@/types/permissions';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Download,
  FileCheck2,
  Edit3,
  Printer,
  BookOpen,
  Files,
  UsersRound,
} from 'lucide-react';

function evalTypeLabel(ev: DatabaseRow): string {
  if (ev.session_type === 'RATTRAPAGE' || ev.kind === 'RATTRAPAGE') return 'Rattrapage';
  if (ev.kind === 'DEVOIR') return 'Devoir';
  if (ev.kind === 'INTERROGATION') return 'Interro';
  if (ev.kind === 'TP') return 'TP';
  if (ev.kind === 'PROJET') return 'Projet';
  if (ev.kind === 'SOUTENANCE') return 'Soutenance';
  return 'Examen';
}

export default function GradesWorkspace() {
  const portal = usePortal();
  const snapshot = portal.relationalSnapshot;
  const tables = snapshot.tables;
  const { assignments = [] } = useAcademicReferences();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [managingEvalId, setManagingEvalId] = useState('');
  const [onlineCopiesId, setOnlineCopiesId] = useState('');
  const [selectedStudentMatricule, setSelectedStudentMatricule] = useState<string | null>(null);
  const canViewStudent = portal.perms.permissions.includes('student.view') && !portal.perms.scope.ownDataOnly;

  const gradeByCandidate = useMemo(() => {
    const map = new Map<string, DatabaseRow>();
    for (const g of tables.grades || []) map.set(String(g.candidate_id), g);
    return map;
  }, [tables.grades]);

  const attemptByCandidate = useMemo(() => {
    const map = new Map<string, DatabaseRow>();
    for (const att of tables.exam_attempts || []) {
      const cId = String(att.candidate_id);
      const prev = map.get(cId);
      if (!prev || Number(att.attempt_number || 0) >= Number(prev.attempt_number || 0)) {
        map.set(cId, att);
      }
    }
    return map;
  }, [tables.exam_attempts]);

  const groupsData = useMemo(() => {
    const rawGroups = (tables.groups || []).filter(row => !row.archived_at);
    const rawEvals = (tables.evaluations || []).filter(row => !row.cancelled_at && !row.archived_at);
    const rawCands = tables.evaluation_candidates || [];
    const rawComponents = tables.curriculum_components || [];
    const rawSubjects = tables.subjects || [];
    const rawEnrollmentGroups = tables.enrollment_groups || [];
    const rawLevels = tables.levels || [];

    const getGroupId = (ev: DatabaseRow): string => {
      if (ev.group_id) return String(ev.group_id);
      const assign = assignments.find(a => a.id === ev.assignment_id);
      return assign?.groupId ? String(assign.groupId) : '';
    };

    const getSubject = (ev: DatabaseRow): { id: string; code: string; name: string } => {
      const rawAssign = (tables.teaching_assignments || []).find(a => a.id === ev.assignment_id);
      const compId = ev.component_id || rawAssign?.component_id;
      const comp = rawComponents.find(c => c.id === compId);
      const assignObj = assignments.find(a => a.id === ev.assignment_id);
      const subj = (comp && rawSubjects.find(s => s.id === comp.subject_id)) || (assignObj && rawSubjects.find(s => s.id === assignObj.subjectId));
      if (subj) {
        const subjectName = String(subj.name || subj.code || 'Matière');
        return {
          id: String(subj.id),
          code: formatSubjectCode(comp?.code || subj.code, subjectName),
          name: subjectName,
        };
      }
      const rawName = String(ev.name || '');
      const parts = rawName.split(' · ');
      const fallbackName = parts.length >= 2 ? parts[1] : rawName || 'Matière';
      return { id: `fallback:${fallbackName}`, code: '', name: fallbackName };
    };

    return rawGroups.map(group => {
      const gId = String(group.id);
      const groupEvals = rawEvals.filter(ev => getGroupId(ev) === gId);
      const groupEvalIds = new Set(groupEvals.map(ev => String(ev.id)));
      const groupCands = rawCands.filter(c => groupEvalIds.has(String(c.evaluation_id)));
      const completedCands = groupCands.filter(c => evaluationGradeIsComplete(gradeByCandidate.get(String(c.id))));

      const numericGrades = groupCands
        .map(c => evaluationGradeValue(gradeByCandidate.get(String(c.id))))
        .filter((v): v is number => v !== null);

      const classAverage = numericGrades.length > 0
        ? Math.round((numericGrades.reduce((sum, v) => sum + v, 0) / numericGrades.length) * 100) / 100
        : null;

      const subjectMap = new Map<string, { id: string; code: string; name: string; evals: DatabaseRow[] }>();
      for (const ev of groupEvals) {
        const subj = getSubject(ev);
        if (!subjectMap.has(subj.id)) subjectMap.set(subj.id, { ...subj, evals: [] });
        subjectMap.get(subj.id)!.evals.push(ev);
      }
      for (const assign of (tables.teaching_assignments || []).filter(a => String(a.group_id) === gId && !a.archived_at)) {
        const comp = rawComponents.find(c => c.id === assign.component_id);
        const subj = comp && rawSubjects.find(s => s.id === comp.subject_id);
        if (subj && !subjectMap.has(String(subj.id))) {
          const subjectName = String(subj.name || subj.code || 'Matière');
          subjectMap.set(String(subj.id), {
            id: String(subj.id),
            code: formatSubjectCode(comp?.code || subj.code, subjectName),
            name: subjectName,
            evals: [],
          });
        }
      }

      const memberEnrollmentIds = new Set(
        rawEnrollmentGroups
          .filter(eg => String(eg.group_id) === gId && eg.historical_only !== true)
          .map(eg => String(eg.enrollment_id))
      );
      for (const c of groupCands) memberEnrollmentIds.add(String(c.enrollment_id));

      const level = rawLevels.find(l => String(l.id) === String(group.level_id));

      return {
        id: gId,
        group,
        name: String(group.name || gId),
        levelName: String(level?.name || ''),
        studentCount: memberEnrollmentIds.size,
        subjectsCount: subjectMap.size,
        subjects: [...subjectMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        evaluationsCount: groupEvals.length,
        completedCount: completedCands.length,
        expectedCount: groupCands.length,
        progressPercent: groupCands.length > 0 ? Math.round((completedCands.length / groupCands.length) * 100) : 0,
        classAverage,
        memberEnrollmentIds,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [tables.groups, tables.evaluations, tables.evaluation_candidates, tables.curriculum_components, tables.subjects, tables.enrollment_groups, tables.levels, tables.teaching_assignments, assignments, gradeByCandidate]);

  // Filtrage des classes pour la vue d'ensemble
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupsData;
    return groupsData.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.levelName.toLowerCase().includes(q)
    );
  }, [groupsData, searchQuery]);

  // Données de la classe active
  const activeGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groupsData.find(g => g.id === selectedGroupId) || null;
  }, [groupsData, selectedGroupId]);

  // Matière active au sein de la classe
  const activeSubject = useMemo(() => {
    if (!activeGroup || !activeGroup.subjects.length) return null;
    if (selectedSubjectId) {
      const found = activeGroup.subjects.find(s => s.id === selectedSubjectId);
      if (found) return found;
    }
    return activeGroup.subjects[0];
  }, [activeGroup, selectedSubjectId]);

  // Évaluations de la matière active
  const activeSubjectEvals = useMemo(() => {
    if (!activeSubject) return [];
    return [...activeSubject.evals].sort((a, b) =>
      String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'fr')
    );
  }, [activeSubject]);

  // Enseignant de la matière
  const subjectTeacherName = useMemo(() => {
    const firstEval = activeSubjectEvals[0];
    const groupAssign = activeGroup && activeSubject
      ? (tables.teaching_assignments || []).find(a => {
          if (String(a.group_id) !== activeGroup.id || a.archived_at) return false;
          const comp = (tables.curriculum_components || []).find(c => c.id === a.component_id);
          return String(comp?.subject_id || '') === activeSubject.id;
        })
      : undefined;
    const assign = firstEval ? assignments.find(a => a.id === firstEval.assignment_id) : undefined;
    const rawAssign = firstEval
      ? (tables.teaching_assignments || []).find(a => a.id === firstEval.assignment_id)
      : groupAssign;
    const tId = assign?.teacherId || firstEval?.teacher_id || rawAssign?.teacher_id;
    if (!tId) return 'Non renseigné';
    const teacher = (tables.teachers || []).find(t => String(t.id) === String(tId));
    if (!teacher) return 'Enseignant responsable';
    const staff = (tables.staff || []).find(s => String(s.id) === String(teacher.staff_id));
    const person = (tables.people || []).find(p => String(p.id) === String(staff?.person_id || teacher.person_id));
    return person ? `${person.firstname} ${person.lastname}`.trim() : 'Enseignant';
  }, [activeSubjectEvals, activeGroup, activeSubject, assignments, tables.teaching_assignments, tables.curriculum_components, tables.teachers, tables.staff, tables.people]);

  // Données des étudiants pour le carnet de notes de la matière
  const activeSubjectStudentRows = useMemo(() => {
    if (!activeGroup || !activeSubject) return [];
    const rawEnrollments = tables.enrollments || [];
    const rawStudents = tables.students || [];
    const rawPeople = tables.people || [];
    const rawOfferings = tables.academic_offerings || [];
    const rawCurricula = tables.curricula || [];
    const rawPrograms = tables.programs || [];
    const rawCandidates = tables.evaluation_candidates || [];

    return [...activeGroup.memberEnrollmentIds].flatMap(enrollmentId => {
      const enrollment = rawEnrollments.find(e => String(e.id) === enrollmentId);
      if (!enrollment) return [];
      const stud = rawStudents.find(s => s.id === enrollment.student_id);
      if (!stud) return [];
      const person = rawPeople.find(p => p.id === stud.person_id);
      const offering = rawOfferings.find(o => o.id === enrollment.offering_id);
      const curr = offering && rawCurricula.find(c => c.id === offering.curriculum_id);
      const prog = curr && rawPrograms.find(p => p.id === curr.program_id);
      const fullName = [person?.firstname, person?.lastname].filter(Boolean).join(' ') || String(stud.matricule || stud.id);
      const matricule = String(stud.matricule || '');
      const filiere = String(prog?.name || 'Tronc commun');

      const evalCells = activeSubjectEvals.map(ev => {
        const cand = rawCandidates.find(
          c => String(c.enrollment_id) === enrollmentId && String(c.evaluation_id) === String(ev.id)
        );
        if (!cand) {
          return { evalId: String(ev.id), candidate: false, complete: false, value: null as number | null, absenceStatus: '', attemptStatus: '', noteLabel: '—' };
        }
        const grade = gradeByCandidate.get(String(cand.id));
        const attempt = attemptByCandidate.get(String(cand.id));
        const val = evaluationGradeValue(grade);
        const complete = evaluationGradeIsComplete(grade);
        const absenceStatus = String(grade?.absence_status || '');
        const attemptStatus = String(attempt?.status || '');
        const noteLabel = evaluationGradeNoteLabel(grade, attemptStatus);
        return { evalId: String(ev.id), candidate: true, complete, value: val, absenceStatus, attemptStatus, noteLabel };
      });

      const gradeInputs = evalCells.map(c => {
        const ev = activeSubjectEvals.find(e => String(e.id) === c.evalId);
        return { kind: String(ev?.kind || ''), value: c.value };
      });
      const computedResult = computeSubjectAverage(gradeInputs);
      const studentSubjectAverage = computedResult.average;
      const devoirAverage = computedResult.devoirAverage;
      const examFinalNote = computedResult.examFinalNote;

      const completedCount = evalCells.filter(c => c.candidate && c.complete).length;
      const candidateCount = evalCells.filter(c => c.candidate).length;

      return [{
        enrollmentId,
        matricule,
        fullName,
        filiere,
        evalCells,
        studentSubjectAverage,
        devoirAverage,
        examFinalNote,
        completedCount,
        candidateCount,
        hasAllGrades: candidateCount > 0 && completedCount === candidateCount,
      }];
    }).filter(row => {
      if (!studentSearch.trim()) return true;
      const q = studentSearch.trim().toLowerCase();
      return row.fullName.toLowerCase().includes(q) || row.matricule.toLowerCase().includes(q);
    }).sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
  }, [activeGroup, activeSubject, activeSubjectEvals, tables.enrollments, tables.students, tables.people, tables.academic_offerings, tables.curricula, tables.programs, tables.evaluation_candidates, gradeByCandidate, attemptByCandidate, studentSearch]);

  // Export CSV du relevé de notes
  const handleExportCsv = () => {
    if (!activeGroup || !activeSubject) return;
    const headers = [
      'Matricule',
      'Étudiant',
      'Filière',
      ...activeSubjectEvals.map(ev => `${evalTypeLabel(ev)} (${String(ev.name)})`),
      'Moyenne Matière / 20',
      'Statut',
    ];
    const rows = activeSubjectStudentRows.map(row => [
      row.matricule,
      row.fullName,
      row.filiere,
      ...row.evalCells.map(cell => cell.noteLabel),
      row.studentSubjectAverage !== null ? row.studentSubjectAverage : '—',
      row.studentSubjectAverage !== null ? (row.studentSubjectAverage >= 10 ? 'Validé' : 'Non validé') : 'En attente',
    ]);
    downloadCsv(`releve-notes-${activeGroup.name}-${activeSubject.name}.csv`, headers, rows);
  };

  const isStudentRole = portal.activeRole === ROLES.STUD || portal.activeRole === ROLES.DEL;
  const selfTranscript = useMemo(() => {
    if (!isStudentRole || !portal.session?.matricule) return null;
    return buildProvisionalTranscriptDocument(
      snapshot,
      portal.session.matricule,
      portal.academicYearContext?.selectedYearId
    );
  }, [isStudentRole, portal.session?.matricule, snapshot, portal.academicYearContext?.selectedYearId]);

  return (
    <div className="domain-workspace workspace-stack">
      <PageHeader
        eyebrow="PÉDAGOGIE & RÉSULTATS"
        title="Notes et résultats"
        description="Suivi des carnets de notes, saisie des évaluations et procès-verbaux par promotion."
      >
        {activeGroup && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setSelectedGroupId(null);
              setSelectedSubjectId(null);
            }}
          >
            <ArrowLeft size={15} /> Toutes les classes
          </button>
        )}
      </PageHeader>

      {isStudentRole && selfTranscript && (
        <DataPanel
          title={`Mon bulletin de notes · ${selfTranscript.academicYear}`}
          description={`${selfTranscript.student.name} (${selfTranscript.student.matricule}) · ${selfTranscript.program} · ${selfTranscript.level}`}
          meta={
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => printTranscript(selfTranscript)}
            >
              <Printer size={15} /> Imprimer mon relevé de notes (A4 REESAO)
            </button>
          }
        >
          <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
            <div className="kpi-card">
              <span className="kpi-label">Moyenne générale</span>
              <strong className="kpi-value">{selfTranscript.average !== null ? `${selfTranscript.average.toFixed(2)} / 20` : 'En cours'}</strong>
              <span className="cell-sub">{selfTranscript.mention ? `Mention : ${selfTranscript.mention}` : 'Calculée sur les notes saisies'}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Crédits validés</span>
              <strong className="kpi-value" style={{ color: 'var(--success)' }}>{selfTranscript.earnedCredits} / {selfTranscript.totalCredits}</strong>
              <span className="cell-sub">Crédits CAMES / REESAO</span>
            </div>
          </div>
          <div className="table-wrap">
            <ResponsiveTable pageSize={0} className="data-table">
              <thead>
                <tr>
                  <th>Semestre</th>
                  <th>Code UE</th>
                  <th>Unité d’enseignement / Matière</th>
                  <th style={{ textAlign: 'center' }}>Crédits</th>
                  <th style={{ textAlign: 'center' }}>Moyenne / 20</th>
                  <th style={{ textAlign: 'center' }}>Validation</th>
                </tr>
              </thead>
              <tbody>
                {selfTranscript.semesters.flatMap(sem =>
                  sem.rows.map(row => (
                    <tr key={`${sem.name}:${row.code}`}>
                      <td><span className="cell-sub">{sem.name}</span></td>
                      <td><code>{row.code}</code></td>
                      <td><strong>{row.name}</strong></td>
                      <td style={{ textAlign: 'center' }}>{row.credits}</td>
                      <td style={{ textAlign: 'center' }}>
                        {row.average !== null ? (
                          <strong style={{ color: row.average >= 10 ? 'var(--success)' : 'var(--danger)' }}>
                            {row.average.toFixed(2)}
                          </strong>
                        ) : (
                          <span className="cell-sub">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {row.validated === null ? (
                          <span className="pill pill-subtle">En attente</span>
                        ) : row.validated ? (
                          <span className="pill pill-success">Validée</span>
                        ) : (
                          <span className="pill pill-warning">Non validée</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResponsiveTable>
          </div>
        </DataPanel>
      )}
      {!selectedGroupId && (
        <>
          <WorkspaceSummary
            label="Synthèse des notes et évaluations"
            items={[
              {
                label: 'Classes suivies',
                value: groupsData.length.toLocaleString('fr-FR'),
                description: 'Promotions et groupes de l’année consultée',
                icon: <UsersRound size={21} />,
                tone: 'primary',
              },
              {
                label: 'Épreuves créées',
                value: groupsData.reduce((sum, g) => sum + g.evaluationsCount, 0).toLocaleString('fr-FR'),
                description: 'Contrôles continus, examens et rattrapages',
                icon: <Files size={21} />,
              },
              {
                label: 'Copies traitées',
                value: `${groupsData.reduce((sum, g) => sum + g.completedCount, 0).toLocaleString('fr-FR')} / ${groupsData.reduce((sum, g) => sum + g.expectedCount, 0).toLocaleString('fr-FR')}`,
                description: 'Notes saisies ou absences constatées',
                icon: <BookOpen size={21} />,
              },
            ]}
          />

          <DataPanel
            title="Carnets de notes par classe"
            description="Sélectionnez une classe pour consulter les matières, saisir les notes ou exporter les relevés."
            meta={<span className="pill pill-default">{filteredGroups.length} classe(s)</span>}
            footer={`${filteredGroups.length} classe(s) affichée(s) sur ${groupsData.length}`}
            toolbar={
              <div className="panel-filter-grid">
                <label className="form-group">
                  Rechercher une classe ou un niveau
                  <span className="assessment-search-input">
                    <Search size={18} aria-hidden="true" />
                    <input
                      className="input"
                      type="search"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Rechercher une classe, un niveau…"
                    />
                  </span>
                </label>
              </div>
            }
          >
            <div className="table-wrap">
              <ResponsiveTable className="data-table">
                <thead>
                  <tr>
                    <th>Classe / Promotion</th>
                    <th style={{ textAlign: 'center' }}>Effectif</th>
                    <th style={{ textAlign: 'center' }}>Épreuves</th>
                    <th>Avancement des saisies</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map(g => (
                    <tr key={g.id}>
                      <td>
                        <strong>{g.name}</strong>
                        <div className="cell-sub">{g.levelName || 'Niveau standard'} · {g.subjectsCount} matière(s)</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="pill pill-default">{g.studentCount} étud.</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{g.evaluationsCount}</td>
                      <td>
                        <span className={`pill ${g.progressPercent === 100 && g.expectedCount > 0 ? 'pill-success' : g.completedCount > 0 ? 'pill-info' : 'pill-default'}`}>
                          {g.completedCount}/{g.expectedCount} ({g.progressPercent}%)
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setSelectedGroupId(g.id);
                            setSelectedSubjectId(null);
                          }}
                        >
                          Consulter <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredGroups.length && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                        Aucune classe trouvée pour cette recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </ResponsiveTable>
            </div>
          </DataPanel>
        </>
      )}

      {activeGroup && (
        <DataPanel
          title={`${activeGroup.name}${activeSubject ? ` · ${activeSubject.name}` : ''}`}
          description={`${activeGroup.levelName || 'Formation'} · ${activeGroup.studentCount} étudiant(s) inscrit(s)${activeSubject ? ` · Enseignant : ${subjectTeacherName}` : ''}`}
          meta={
            <div className="btn-group">
              <label htmlFor="quick-group-select" className="sr-only">Changer de classe</label>
              <select
                id="quick-group-select"
                aria-label="Changer de classe"
                className="select-input"
                value={activeGroup.id}
                onChange={e => {
                  setSelectedGroupId(e.target.value);
                  setSelectedSubjectId(null);
                }}
              >
                {groupsData.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.studentCount} étud.)
                  </option>
                ))}
              </select>
            </div>
          }
          toolbar={
            <div className="workspace-stack">
              <div className="btn-group" style={{ flexWrap: 'wrap' }}>
                {activeGroup.subjects.map(s => {
                  const isActive = activeSubject?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setSelectedSubjectId(s.id)}
                    >
                      {s.name} ({s.evals.length})
                    </button>
                  );
                })}
                {!activeGroup.subjects.length && (
                  <p className="cell-sub">Aucune matière affectée à ce groupe.</p>
                )}
              </div>
              {activeSubject && (
                <div className="panel-filter-grid">
                  <label className="form-group">
                    Filtrer un étudiant
                    <input
                      className="input"
                      type="search"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Nom ou matricule…"
                    />
                  </label>
                  <div className="btn-group" style={{ alignItems: 'flex-end' }}>
                    {activeSubjectEvals.length > 0 && !isStudentRole && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setManagingEvalId(String(activeSubjectEvals[0].id))}
                      >
                        <Edit3 size={14} /> Saisir / Gérer les notes
                      </button>
                    )}
                    {activeSubjectEvals.some(ev => (tables.exam_attempts || []).some(a => a.evaluation_id === ev.id)) && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          const onlineEval = activeSubjectEvals.find(ev => (tables.exam_attempts || []).some(a => a.evaluation_id === ev.id));
                          if (onlineEval) setOnlineCopiesId(String(onlineEval.id));
                        }}
                      >
                        <FileCheck2 size={14} /> Copies en ligne
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={handleExportCsv}
                    >
                      <Download size={14} /> Exporter CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          }
          footer="Barème officiel ESCEN : Devoir (40%) + Examen (60%) (ou 100% Examen si pas de devoir)"
        >
          {activeSubject && (
            <div className="table-wrap">
              <ResponsiveTable className="data-table">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Filière</th>
                    {activeSubjectEvals.map(ev => (
                      <th key={ev.id} style={{ textAlign: 'center' }}>
                        <div>{evalTypeLabel(ev)}</div>
                        <div className="cell-sub">{String(ev.name)}</div>
                        {!isStudentRole && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline mt-1"
                            onClick={() => setManagingEvalId(String(ev.id))}
                          >
                            Gérer
                          </button>
                        )}
                      </th>
                    ))}
                    <th style={{ textAlign: 'center' }}>
                      <div>Moyenne finale</div>
                      <div className="cell-sub">40/60 ou 100% Ex.</div>
                    </th>
                    <th style={{ textAlign: 'center' }}>Décision</th>
                    {canViewStudent && <th style={{ textAlign: 'right' }}>Dossier</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeSubjectStudentRows.map(row => {
                    const isAdmis = row.studentSubjectAverage !== null && row.studentSubjectAverage >= 10;
                    return (
                      <tr key={row.enrollmentId}>
                        <td>
                          <strong>{row.fullName}</strong>
                          <div className="cell-sub">{row.matricule}</div>
                        </td>
                        <td>
                          <span className="cell-sub">{row.filiere}</span>
                        </td>
                        {row.evalCells.map(cell => (
                          <td key={cell.evalId} style={{ textAlign: 'center' }}>
                            {!cell.candidate ? (
                              <span className="cell-sub">—</span>
                            ) : cell.absenceStatus === 'ABSENT' ? (
                              <span className="pill pill-danger">Absent</span>
                            ) : cell.absenceStatus === 'JUSTIFIE' ? (
                              <span className="pill pill-default">Justifié</span>
                            ) : cell.value !== null ? (
                              <strong style={{ color: cell.value >= 10 ? 'var(--success)' : 'var(--danger)' }}>
                                {cell.value.toFixed(2)}
                              </strong>
                            ) : cell.attemptStatus === 'REMISE' || cell.attemptStatus === 'EXPIREE' ? (
                              <span className="pill pill-info">Copie remise</span>
                            ) : (
                              <span className="cell-sub">En attente</span>
                            )}
                          </td>
                        ))}
                        <td style={{ textAlign: 'center' }}>
                          {row.studentSubjectAverage !== null ? (
                            <strong style={{ color: isAdmis ? 'var(--success)' : 'var(--danger)' }}>
                              {row.studentSubjectAverage.toFixed(2)}
                            </strong>
                          ) : (
                            <span className="cell-sub">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {row.studentSubjectAverage !== null ? (
                            <span className={`pill ${isAdmis ? 'pill-success' : 'pill-warning'}`}>
                              {isAdmis ? 'Validé' : 'Non validé'}
                            </span>
                          ) : (
                            <span className="pill pill-subtle">En attente</span>
                          )}
                        </td>
                        {canViewStudent && (
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setSelectedStudentMatricule(row.matricule)}
                            >
                              Fiche dossier →
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {!activeSubjectStudentRows.length && (
                    <tr>
                      <td colSpan={activeSubjectEvals.length + (canViewStudent ? 5 : 4)} style={{ textAlign: 'center', padding: '24px' }}>
                        Aucun étudiant trouvé dans cette matière pour cette recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </ResponsiveTable>
            </div>
          )}
        </DataPanel>
      )}

      {/* MODALES ET DIALOGUES DE GESTION */}
      {managingEvalId && (
        <EvaluationGradeDialog
          evaluationId={managingEvalId}
          evaluationIds={activeSubjectEvals.map(e => String(e.id))}
          onClose={() => setManagingEvalId('')}
        />
      )}
      {onlineCopiesId && (
        <PersistentExamCopies
          evaluationId={onlineCopiesId}
          onClose={() => setOnlineCopiesId('')}
        />
      )}
      {selectedStudentMatricule && (
        <StudentRecordDialog
          matricule={selectedStudentMatricule}
          onClose={() => setSelectedStudentMatricule(null)}
        />
      )}
    </div>
  );
}

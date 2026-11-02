'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import { useAcademicReferences } from '@/hooks/useAcademicReferences';
import { studentPath } from '@/constants/portalRoutes';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import type { DatabaseRow } from '@/types/persistence';
import {
  evaluationGradeIsComplete,
  evaluationGradeValue,
  evaluationGradeNoteLabel,
} from '@/services/evaluationGradePolicy';
import EvaluationGradeDialog from './EvaluationGradeDialog';
import EvaluationCreateDialog from './EvaluationCreateDialog';
import PersistentExamCopies from './PersistentExamCopies';
import PageHeader from '@/components/ui/PageHeader';
import { downloadCsv } from '@/utils/csv';
import {
  GraduationCap,
  BookOpen,
  Search,
  ArrowLeft,
  ArrowRight,
  Download,
  FileCheck2,
  Clock,
  Edit3,
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
  const [creatingEval, setCreatingEval] = useState(false);

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
      if (subj) return { id: String(subj.id), code: String(subj.code || ''), name: String(subj.name || subj.code || 'Matière') };
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

      const memberEnrollmentIds = new Set(
        rawEnrollmentGroups.filter(eg => String(eg.group_id) === gId).map(eg => String(eg.enrollment_id))
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

  // KPI globaux
  const globalKpis = useMemo(() => {
    const totalStudents = groupsData.reduce((acc, g) => acc + g.studentCount, 0);
    const totalEvals = groupsData.reduce((acc, g) => acc + g.evaluationsCount, 0);
    const totalExpected = groupsData.reduce((acc, g) => acc + g.expectedCount, 0);
    const totalCompleted = groupsData.reduce((acc, g) => acc + g.completedCount, 0);
    const globalPercent = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;
    return { totalStudents, totalEvals, totalExpected, totalCompleted, globalPercent };
  }, [groupsData]);

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
    if (!activeSubjectEvals.length) return 'Non renseigné';
    const firstEval = activeSubjectEvals[0];
    const assign = assignments.find(a => a.id === firstEval.assignment_id);
    const tId = assign?.teacherId || firstEval.teacher_id;
    const teacher = (tables.teachers || []).find(t => String(t.id) === String(tId));
    if (!teacher) return 'Enseignant responsable';
    const person = (tables.people || []).find(p => String(p.id) === String(teacher.person_id));
    return person ? `${person.firstname} ${person.lastname}` : 'Enseignant';
  }, [activeSubjectEvals, assignments, tables.teachers, tables.people]);

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

      const numericValues = evalCells.map(c => c.value).filter((v): v is number => v !== null);
      const studentSubjectAverage = numericValues.length > 0
        ? Math.round((numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length) * 100) / 100
        : null;

      const completedCount = evalCells.filter(c => c.candidate && c.complete).length;
      const candidateCount = evalCells.filter(c => c.candidate).length;

      return [{
        enrollmentId,
        matricule,
        fullName,
        filiere,
        evalCells,
        studentSubjectAverage,
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

  // Statistiques de la matière active
  const activeSubjectStats = useMemo(() => {
    if (!activeSubjectStudentRows.length) return { average: null, min: null, max: null, completion: 0 };
    const averages = activeSubjectStudentRows
      .map(r => r.studentSubjectAverage)
      .filter((v): v is number => v !== null);

    const average = averages.length > 0
      ? Math.round((averages.reduce((sum, v) => sum + v, 0) / averages.length) * 100) / 100
      : null;
    const min = averages.length > 0 ? Math.min(...averages) : null;
    const max = averages.length > 0 ? Math.max(...averages) : null;

    const totalNotesExpected = activeSubjectStudentRows.reduce((acc, r) => acc + r.candidateCount, 0);
    const totalNotesCompleted = activeSubjectStudentRows.reduce((acc, r) => acc + r.completedCount, 0);
    const completion = totalNotesExpected > 0 ? Math.round((totalNotesCompleted / totalNotesExpected) * 100) : 0;

    return { average, min, max, completion, totalNotesExpected, totalNotesCompleted };
  }, [activeSubjectStudentRows]);

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

  return (
    <div className="domain-workspace" style={{ padding: '0 0 32px' }}>
      {/* VUE 1 : VUE D'ENSEMBLE PAR CLASSE */}
      {!selectedGroupId && (
        <>
          <PageHeader
            eyebrow="PÉDAGOGIE & RÉSULTATS"
            title="Notes et résultats académiques"
            description="Suivi des carnets de notes, saisie des évaluations, moyennes de classe et procès-verbaux par promotion."
          >
            {portal.perms.permissions.includes('evaluation.create') && (
              <button className="btn btn-primary" onClick={() => setCreatingEval(true)}>
                + Nouvelle évaluation
              </button>
            )}
          </PageHeader>

          <section className="card card-full" style={{ padding: '24px 28px', borderRadius: '12px', border: '1px solid var(--border)' }}>

          {/* KPI Tiles */}
          <div className="kpi-stat-grid" style={{ marginBottom: '24px' }}>
            <div className="kpi-stat-tile">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <GraduationCap size={18} style={{ color: 'var(--primary)' }} />
                <strong style={{ fontSize: '1.6rem', color: '#0f172a' }}>{groupsData.length}</strong>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Classes & Promotions</span>
            </div>
            <div className="kpi-stat-tile">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <BookOpen size={18} style={{ color: '#0284c7' }} />
                <strong style={{ fontSize: '1.6rem', color: '#0f172a' }}>{globalKpis.totalEvals}</strong>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Évaluations au catalogue</span>
            </div>
            <div className="kpi-stat-tile">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FileCheck2 size={18} style={{ color: '#16a34a' }} />
                <strong style={{ fontSize: '1.6rem', color: '#0f172a' }}>
                  {globalKpis.totalCompleted} / {globalKpis.totalExpected}
                </strong>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Notes saisies ({globalKpis.globalPercent}%)</span>
            </div>
            <div className="kpi-stat-tile">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Clock size={18} style={{ color: '#d97706' }} />
                <strong style={{ fontSize: '1.6rem', color: '#0f172a' }}>
                  {Math.max(0, globalKpis.totalExpected - globalKpis.totalCompleted)}
                </strong>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Copies en attente de note</span>
            </div>
          </div>

          {/* Barre de recherche */}
          <div style={{ marginBottom: '20px', maxWidth: '360px' }}>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher une classe, un niveau…"
                style={{ paddingLeft: '34px', width: '100%' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          {/* Tableau de toutes les classes */}
          <div className="table-wrap">
            <ResponsiveTable className="data-table">
              <thead>
                <tr>
                  <th>Classe / Promotion</th>
                  <th>Niveau</th>
                  <th style={{ textAlign: 'center' }}>Effectif</th>
                  <th style={{ textAlign: 'center' }}>Matières</th>
                  <th style={{ textAlign: 'center' }}>Épreuves</th>
                  <th>Avancement des saisies</th>
                  <th style={{ textAlign: 'center' }}>Moyenne estimée</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map(g => (
                  <tr key={g.id}>
                    <td>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{g.name}</strong>
                    </td>
                    <td>
                      <span className="pill pill-subtle" style={{ fontSize: '11px' }}>
                        {g.levelName || 'Niveau standard'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="pill pill-default" style={{ fontWeight: 600 }}>
                        {g.studentCount} étud.
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{g.subjectsCount}</td>
                    <td style={{ textAlign: 'center' }}>{g.evaluationsCount}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${g.progressPercent}%`,
                              height: '100%',
                              background: g.progressPercent === 100 ? '#16a34a' : 'var(--primary)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: g.progressPercent === 100 ? '#16a34a' : '#475569' }}>
                          {g.completedCount}/{g.expectedCount} ({g.progressPercent}%)
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {g.classAverage !== null ? (
                        <span style={{ fontWeight: 700, color: g.classAverage >= 10 ? '#15803d' : '#b91c1c' }}>
                          {g.classAverage.toFixed(2)} / 20
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          setSelectedGroupId(g.id);
                          setSelectedSubjectId(null);
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        Consulter <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredGroups.length && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                      Aucune classe trouvée pour cette recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </ResponsiveTable>
          </div>
        </section>
      </>
      )}

      {/* VUE 2 : CARNET DE NOTES DÉTAILLÉ DE LA CLASSE SÉLECTIONNÉE */}
      {activeGroup && (
        <section className="card card-full" style={{ padding: '24px 28px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          {/* Header de la classe avec retour et sélecteur rapide */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  setSelectedGroupId(null);
                  setSelectedSubjectId(null);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={15} /> Toutes les classes
              </button>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>
                  {activeGroup.name}
                </h1>
                <span className="cell-sub" style={{ fontSize: '12px' }}>
                  {activeGroup.levelName} · {activeGroup.studentCount} étudiant(s) inscrit(s)
                </span>
              </div>
            </div>

            {/* Sélecteur de classe rapide */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="quick-group-select" style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Changer de classe :</label>
              <select
                id="quick-group-select"
                aria-label="Changer de classe"
                className="select-input"
                value={activeGroup.id}
                onChange={e => {
                  setSelectedGroupId(e.target.value);
                  setSelectedSubjectId(null);
                }}
                style={{ minWidth: '220px' }}
              >
                {groupsData.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.studentCount} étud.)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Onglets des Matières de la classe */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
              Matières de la classe ({activeGroup.subjects.length}) :
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {activeGroup.subjects.map(s => {
                const isActive = activeSubject?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(s.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: isActive ? '2px solid var(--primary, #2563eb)' : '1px solid #cbd5e1',
                      background: isActive ? '#eff6ff' : '#ffffff',
                      color: isActive ? '#1e40af' : '#334155',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 1px 3px rgba(37,99,235,0.15)' : 'none',
                    }}
                  >
                    <span>{s.code ? `${s.code} · ` : ''}{s.name}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: isActive ? '#bfdbfe' : '#f1f5f9',
                        color: isActive ? '#1e3a8a' : '#64748b',
                      }}
                    >
                      {s.evals.length} éval.
                    </span>
                  </button>
                );
              })}
              {!activeGroup.subjects.length && (
                <p className="cell-sub">Aucune matière affectée à ce groupe.</p>
              )}
            </div>
          </div>

          {/* CARTOUCHE DE LA MATIÈRE ACTIVE */}
          {activeSubject && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                    {activeSubject.code ? `${activeSubject.code} — ` : ''}{activeSubject.name}
                  </h2>
                  <span className="cell-sub" style={{ fontSize: '13px' }}>
                    Enseignant référent : <strong>{subjectTeacherName}</strong> · {activeSubjectEvals.length} épreuve(s)
                  </span>
                </div>

                {/* Actions sur la matière */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {activeSubjectEvals.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => setManagingEvalId(String(activeSubjectEvals[0].id))}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
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
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FileCheck2 size={14} /> Copies en ligne
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleExportCsv}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> Exporter PV (CSV)
                  </button>
                </div>
              </div>

              {/* Statistiques clés de la matière */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Moyenne classe</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: activeSubjectStats.average !== null && activeSubjectStats.average >= 10 ? '#16a34a' : '#b91c1c' }}>
                    {activeSubjectStats.average !== null ? `${activeSubjectStats.average.toFixed(2)} / 20` : '—'}
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Note min / max</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    {activeSubjectStats.min !== null && activeSubjectStats.max !== null ? `${activeSubjectStats.min} / ${activeSubjectStats.max}` : '—'}
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Complétion saisies</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: activeSubjectStats.completion === 100 ? '#16a34a' : 'var(--primary)' }}>
                    {activeSubjectStats.completion}%
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Effectif évalué</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    {activeSubjectStudentRows.length} étudiants
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABLEAU PROCÈS-VERBAL DES NOTES */}
          {activeSubject && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                  Procès-verbal de notes — {activeSubject.name}
                </h3>
                <div style={{ position: 'relative', width: '260px' }}>
                  <input
                    className="input"
                    type="search"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Filtrer un étudiant…"
                    style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>

              <div className="table-wrap">
                <ResponsiveTable className="data-table">
                  <thead>
                    <tr>
                      <th>Étudiant</th>
                      <th>Filière</th>
                      {activeSubjectEvals.map(ev => (
                        <th key={ev.id} style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 700 }}>{evalTypeLabel(ev)}</div>
                          <div className="cell-sub" style={{ fontSize: '11px' }}>{String(ev.name)}</div>
                        </th>
                      ))}
                      <th style={{ textAlign: 'center' }}>Moyenne / 20</th>
                      <th style={{ textAlign: 'center' }}>Décision</th>
                      <th style={{ textAlign: 'right' }}>Dossier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSubjectStudentRows.map(row => {
                      const isAdmis = row.studentSubjectAverage !== null && row.studentSubjectAverage >= 10;
                      return (
                        <tr key={row.enrollmentId}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: '#e2e8f0',
                                  color: '#334155',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {row.fullName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                              </div>
                              <div>
                                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{row.fullName}</strong>
                                <div className="cell-sub" style={{ fontSize: '11px' }}>{row.matricule}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: '#475569' }}>{row.filiere}</span>
                          </td>
                          {row.evalCells.map(cell => (
                            <td key={cell.evalId} style={{ textAlign: 'center' }}>
                              {!cell.candidate ? (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              ) : cell.absenceStatus === 'ABSENT' ? (
                                <span className="pill pill-danger" style={{ fontSize: '11px' }}>Absent</span>
                              ) : cell.absenceStatus === 'JUSTIFIE' ? (
                                <span className="pill pill-default" style={{ fontSize: '11px' }}>Justifié</span>
                              ) : cell.value !== null ? (
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    color: cell.value >= 10 ? '#166534' : '#b91c1c',
                                  }}
                                >
                                  {cell.value.toFixed(2)}
                                </span>
                              ) : cell.attemptStatus === 'REMISE' || cell.attemptStatus === 'EXPIREE' ? (
                                <span className="pill pill-info" style={{ fontSize: '11px' }}>Copie remise</span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>En attente</span>
                              )}
                            </td>
                          ))}
                          <td style={{ textAlign: 'center' }}>
                            {row.studentSubjectAverage !== null ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  fontSize: '13px',
                                  background: isAdmis ? '#f0fdf4' : '#fef2f2',
                                  color: isAdmis ? '#166534' : '#991b1b',
                                  border: isAdmis ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                }}
                              >
                                {row.studentSubjectAverage.toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {row.studentSubjectAverage !== null ? (
                              <span className={`pill ${isAdmis ? 'pill-success' : 'pill-warning'}`} style={{ fontSize: '11px', fontWeight: 600 }}>
                                {isAdmis ? '✓ Validé' : 'Non validé'}
                              </span>
                            ) : (
                              <span className="pill pill-subtle" style={{ fontSize: '11px' }}>
                                En attente
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link
                              className="btn btn-sm btn-outline"
                              href={studentPath(row.matricule)}
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                            >
                              Fiche →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {!activeSubjectStudentRows.length && (
                      <tr>
                        <td colSpan={activeSubjectEvals.length + 5} style={{ textAlign: 'center', padding: '24px' }}>
                          Aucun étudiant trouvé dans cette matière pour cette recherche.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </ResponsiveTable>
              </div>
            </div>
          )}
        </section>
      )}

      {/* MODALES ET DIALOGUES DE GESTION */}
      {managingEvalId && (
        <EvaluationGradeDialog
          evaluationId={managingEvalId}
          onClose={() => setManagingEvalId('')}
        />
      )}
      {onlineCopiesId && (
        <PersistentExamCopies
          evaluationId={onlineCopiesId}
          onClose={() => setOnlineCopiesId('')}
        />
      )}
      {creatingEval && (
        <EvaluationCreateDialog
          category="exam"
          onClose={() => setCreatingEval(false)}
          onCreated={id => {
            setCreatingEval(false);
            setManagingEvalId(id);
          }}
        />
      )}
    </div>
  );
}

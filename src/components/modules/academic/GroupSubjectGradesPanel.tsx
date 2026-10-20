'use client';
import { useState } from 'react';
import Link from 'next/link';
import { studentPath } from '@/constants/portalRoutes';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import { usePortal } from '@/hooks/usePortal';
import EvaluationGradeDialog from './EvaluationGradeDialog';
import EvaluationCreateDialog from './EvaluationCreateDialog';
import { evaluationGradeIsComplete, evaluationGradeValue } from '@/services/evaluationGradePolicy';

interface Props {
  snapshot: RelationalSnapshot;
  canViewStudents: boolean;
  onSelectStudent?: (matricule: string) => void;
}

function evalTypeLabel(ev: DatabaseRow): string {
  if (ev.session_type === 'RATTRAPAGE' || ev.kind === 'RATTRAPAGE') return 'Rattrapage';
  if (ev.kind === 'DEVOIR') return 'Devoir';
  if (ev.kind === 'INTERROGATION') return 'Interrogation';
  if (ev.kind === 'TP') return 'TP';
  if (ev.kind === 'PROJET') return 'Projet';
  if (ev.kind === 'SOUTENANCE') return 'Soutenance';
  return 'Examen';
}

export default function GroupSubjectGradesPanel({ snapshot, canViewStudents, onSelectStudent }: Props) {
  const portal = usePortal();
  const [managingEvalId, setManagingEvalId] = useState('');
  const [creatingEval, setCreatingEval] = useState(false);
  const groups = (snapshot.tables.groups || []).filter(row => !row.archived_at);
  const evaluations = (snapshot.tables.evaluations || []).filter(row => !row.cancelled_at && !row.archived_at);
  const candidates = snapshot.tables.evaluation_candidates || [];
  const grades = snapshot.tables.grades || [];
  const components = snapshot.tables.curriculum_components || [];
  const subjects = snapshot.tables.subjects || [];
  const enrollments = snapshot.tables.enrollments || [];
  const enrollmentGroups = snapshot.tables.enrollment_groups || [];
  const students = snapshot.tables.students || [];
  const people = snapshot.tables.people || [];
  const offerings = snapshot.tables.academic_offerings || [];
  const curricula = snapshot.tables.curricula || [];
  const programs = snapshot.tables.programs || [];
  const levels = snapshot.tables.levels || [];
  const assignments = snapshot.tables.teaching_assignments || [];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [search, setSearch] = useState('');

  if (!evaluations.length || !groups.length) return null;

  const evalGroupId = (ev: DatabaseRow): string => {
    if (ev.group_id) return String(ev.group_id);
    const assign = assignments.find(a => a.id === ev.assignment_id);
    return assign?.group_id ? String(assign.group_id) : '';
  };

  const evalSubject = (ev: DatabaseRow): { id: string; code: string; name: string } => {
    const compId = ev.component_id || assignments.find(a => a.id === ev.assignment_id)?.component_id;
    const comp = components.find(c => c.id === compId);
    const subj = comp && subjects.find(s => s.id === comp.subject_id);
    if (subj) return { id: String(subj.id), code: String(subj.code || ''), name: String(subj.name || subj.code || 'Matière') };
    const rawName = String(ev.name || '');
    const parts = rawName.split(' · ');
    const fallbackName = parts.length >= 2 ? parts[1] : rawName || 'Matière non renseignée';
    return { id: `fallback:${fallbackName}`, code: '', name: fallbackName };
  };

  const gradeByCandidate = new Map<string, DatabaseRow>();
  for (const g of grades) gradeByCandidate.set(String(g.candidate_id), g);

  const groupsWithData = groups.map(group => {
    const gId = String(group.id);
    const groupEvals = evaluations.filter(ev => evalGroupId(ev) === gId);
    const groupEvalIds = new Set(groupEvals.map(ev => String(ev.id)));
    const groupCands = candidates.filter(c => groupEvalIds.has(String(c.evaluation_id)));
    const completedCands = groupCands.filter(c => evaluationGradeIsComplete(gradeByCandidate.get(String(c.id))));
    const subjectMap = new Map<string, { id: string; code: string; name: string; evals: DatabaseRow[] }>();
    for (const ev of groupEvals) {
      const subj = evalSubject(ev);
      if (!subjectMap.has(subj.id)) subjectMap.set(subj.id, { ...subj, evals: [] });
      subjectMap.get(subj.id)!.evals.push(ev);
    }
    const memberEnrollmentIds = new Set(enrollmentGroups.filter(eg => eg.group_id === gId).map(eg => String(eg.enrollment_id)));
    for (const c of groupCands) memberEnrollmentIds.add(String(c.enrollment_id));
    const level = levels.find(l => l.id === group.level_id);
    return {
      group,
      id: gId,
      name: String(group.name || gId),
      levelName: String(level?.name || ''),
      studentCount: memberEnrollmentIds.size,
      subjects: [...subjectMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      evaluationsCount: groupEvals.length,
      completedCount: completedCands.length,
      expectedCount: groupCands.length,
      memberEnrollmentIds,
    };
  }).filter(item => item.subjects.length > 0 || item.studentCount > 0)
    .sort((a, b) => b.completedCount - a.completedCount || a.name.localeCompare(b.name, 'fr'));

  if (!groupsWithData.length) return null;

  const activeGroup = groupsWithData.find(g => g.id === selectedGroupId) || groupsWithData[0];
  const activeSubjects = activeGroup.subjects;
  const activeSubject = activeSubjects.find(s => s.id === selectedSubjectId) || activeSubjects[0] || null;

  const subjectSummaries = activeSubjects.map(subj => {
    const evalIds = new Set(subj.evals.map(e => String(e.id)));
    const subjCands = candidates.filter(c => evalIds.has(String(c.evaluation_id)));
    const vals = subjCands
      .map(c => evaluationGradeValue(gradeByCandidate.get(String(c.id))))
      .filter((value): value is number => value !== null);
    const absenceCount = subjCands.filter(c => {
      const status = gradeByCandidate.get(String(c.id))?.absence_status;
      return status === 'ABSENT' || status === 'JUSTIFIE';
    }).length;
    const min = vals.length ? Math.min(...vals) : null;
    const max = vals.length ? Math.max(...vals) : null;
    const kinds = [...new Set(subj.evals.map(evalTypeLabel))];
    return {
      ...subj,
      kinds,
      expectedCount: subjCands.length,
      notesCount: vals.length,
      absenceCount,
      min,
      max,
    };
  });

  const activeSubjectSummary = subjectSummaries.find(s => s.id === activeSubject?.id) || null;
  const orderedSubjectEvals = [...(activeSubjectSummary?.evals || [])].sort((a, b) =>
    String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')) ||
    String(a.name || '').localeCompare(String(b.name || ''), 'fr'),
  );

  const studentRows = [...activeGroup.memberEnrollmentIds].flatMap(enrollmentId => {
    const enrollment = enrollments.find(e => String(e.id) === enrollmentId);
    if (!enrollment) return [];
    const stud = students.find(s => s.id === enrollment.student_id);
    if (!stud) return [];
    const person = people.find(p => p.id === stud.person_id);
    const offering = offerings.find(o => o.id === enrollment.offering_id);
    const curr = offering && curricula.find(c => c.id === offering.curriculum_id);
    const prog = curr && programs.find(p => p.id === curr.program_id);
    const fullName = [person?.firstname, person?.lastname].filter(Boolean).join(' ') || String(stud.matricule || stud.id);
    const matricule = String(stud.matricule || '');
    const filiere = String(prog?.name || 'Tronc commun / Non renseignée');

    const evalCells = orderedSubjectEvals.map(ev => {
      const cand = candidates.find(
        c => String(c.enrollment_id) === enrollmentId && String(c.evaluation_id) === String(ev.id),
      );
      if (!cand) {
        return { evalId: String(ev.id), candidate: false, complete: false, value: null as number | null, absenceStatus: '' };
      }
      const grade = gradeByCandidate.get(String(cand.id));
      const val = evaluationGradeValue(grade);
      const complete = evaluationGradeIsComplete(grade);
      const absenceStatus = String(grade?.absence_status || '');
      return { evalId: String(ev.id), candidate: true, complete, value: val, absenceStatus };
    });

    const candidateCells = evalCells.filter(cell => cell.candidate);
    const completedCells = candidateCells.filter(cell => cell.complete);

    return [{
      enrollmentId,
      matricule,
      fullName,
      filiere,
      evalCells,
      candidateCount: candidateCells.length,
      completedCount: completedCells.length,
      hasAnyGrade: completedCells.length > 0,
    }];
  }).filter(row => {
    if (!search.trim()) return true;
    const q = search.toLocaleLowerCase('fr');
    return `${row.fullName} ${row.matricule} ${row.filiere}`.toLocaleLowerCase('fr').includes(q);
  }).sort((a, b) => Number(b.hasAnyGrade) - Number(a.hasAnyGrade) || a.fullName.localeCompare(b.fullName, 'fr'));

  const fmtGrade = (val: number | null) => val === null ? '—' : `${val.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} / 20`;

  return (
    <section className="card card-full mb-2" aria-label="Résultats par groupe et par matière">
      <div className="card-header">
        <div>
          <h2>Par groupe et matière</h2>
        </div>
        {portal.perms.permissions.includes('evaluation.create') && (
          <button className="btn btn-sm btn-primary" onClick={() => setCreatingEval(true)}>
            Nouvelle évaluation
          </button>
        )}
      </div>

      <div className="form-grid mb-2">
        <label className="form-group">
          Groupe
          <select
            className="select-input"
            aria-label="Groupe à consulter"
            value={activeGroup.id}
            onChange={e => { setSelectedGroupId(e.target.value); setSelectedSubjectId(''); }}
          >
            {groupsWithData.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.subjects.length} mat. · {g.completedCount}/{g.expectedCount} saisies)
              </option>
            ))}
          </select>
        </label>

        <label className="form-group">
          Matière
          <select
            className="select-input"
            aria-label="Matière du groupe"
            value={activeSubject?.id || ''}
            onChange={e => setSelectedSubjectId(e.target.value)}
            disabled={!activeSubjects.length}
          >
            {activeSubjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.code ? `${s.code} — ` : ''}{s.name}
              </option>
            ))}
            {!activeSubjects.length && <option value="">Aucune matière</option>}
          </select>
        </label>

        <label className="form-group">
          Recherche
          <input
            className="input"
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom ou matricule…"
          />
        </label>
      </div>

      <div className="kpi-stat-grid mb-2">
        <div className="kpi-stat-tile">
          <strong>{activeGroup.studentCount}</strong>
          <span>Effectif ({activeGroup.name})</span>
        </div>
        <div className="kpi-stat-tile">
          <strong>{activeGroup.subjects.length}</strong>
          <span>Matières ({activeGroup.evaluationsCount} éval.)</span>
        </div>
        <div className="kpi-stat-tile">
          <strong>{activeGroup.completedCount} / {activeGroup.expectedCount}</strong>
          <span>Copies traitées dans le groupe</span>
        </div>
      </div>

      {subjectSummaries.length > 0 && (
        <div className="mb-2">
          <h3>Matières ({activeGroup.name})</h3>
          <ResponsiveTable className="data-table">
            <thead>
              <tr>
                <th>Matière</th>
                <th>Épreuves</th>
                <th>Copies attendues</th>
                <th>Notes chiffrées</th>
                <th>Absents / Justifiés</th>
                <th>Min / Max observés</th>
              </tr>
            </thead>
            <tbody>
              {subjectSummaries.map(item => (
                <tr
                  key={item.id}
                  className={item.id === activeSubject?.id ? 'selected-row' : ''}
                  onClick={() => setSelectedSubjectId(item.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <strong>{item.name}</strong>
                    {item.code && <div className="cell-sub">{item.code}</div>}
                  </td>
                  <td>{item.kinds.join(' + ')} ({item.evals.length})</td>
                  <td>{item.expectedCount}</td>
                  <td><strong>{item.notesCount}</strong></td>
                  <td>{item.absenceCount}</td>
                  <td>{item.min !== null && item.max !== null ? `${item.min.toLocaleString('fr-FR')} – ${item.max.toLocaleString('fr-FR')} / 20` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
        </div>
      )}

      {activeSubjectSummary && (
        <div>
          {orderedSubjectEvals.length > 0 && (
            <div className="mb-2">
              <div className="card-header">
                <h4>Évaluations de la matière ({orderedSubjectEvals.length})</h4>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {orderedSubjectEvals.map(ev => (
                  <div key={ev.id} className="card p-2" style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border)' }}>
                    <div>
                      <strong>{String(ev.name)}</strong>
                      <div className="cell-sub">{evalTypeLabel(ev)} · État : <span className="pill pill-default">{String(ev.status)}</span></div>
                    </div>
                    {(portal.perms.permissions.includes('grade.enter') || portal.perms.permissions.includes('grade.review') || portal.perms.permissions.includes('grade.approve') || portal.perms.permissions.includes('grade.publish')) && (
                      <button className="btn btn-sm btn-primary" onClick={() => setManagingEvalId(String(ev.id))}>
                        Saisir / Gérer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3>
            Notes de {activeSubjectSummary.name} — {activeGroup.name} ({studentRows.filter(r => r.hasAnyGrade).length} traité(s) sur {studentRows.length})
          </h3>
          <div className="table-wrap">
            <ResponsiveTable className="data-table">
              <thead>
                <tr>
                  <th>Étudiant</th>
                  <th>Filière</th>
                  {orderedSubjectEvals.map(ev => (
                    <th key={ev.id}>
                      <div>{evalTypeLabel(ev)}</div>
                      <div className="cell-sub">{String(ev.name)}</div>
                    </th>
                  ))}
                  <th>État de saisie</th>
                  {canViewStudents && <th>Dossier</th>}
                </tr>
              </thead>
              <tbody>
                {studentRows.map(row => (
                  <tr key={row.enrollmentId}>
                    <td>
                      <strong>{row.fullName}</strong>
                      <div className="cell-sub">{row.matricule}</div>
                    </td>
                    <td>{row.filiere}</td>
                    {row.evalCells.map(cell => (
                      <td key={cell.evalId}>
                        {!cell.candidate ? (
                          '—'
                        ) : cell.absenceStatus === 'ABSENT' ? (
                          <span className="pill pill-warning">Absent</span>
                        ) : cell.absenceStatus === 'JUSTIFIE' ? (
                          <span className="pill pill-default">Justifié</span>
                        ) : cell.value !== null ? (
                          <strong>{fmtGrade(cell.value)}</strong>
                        ) : (
                          <span className="cell-sub">En attente</span>
                        )}
                      </td>
                    ))}
                    <td>
                      {row.candidateCount === 0 ? (
                        <span className="pill pill-default">Non inscrit à l&apos;épreuve</span>
                      ) : row.completedCount === row.candidateCount ? (
                        <span className="pill pill-success">Complet ({row.completedCount}/{row.candidateCount})</span>
                      ) : row.completedCount > 0 ? (
                        <span className="pill pill-warning">Partiel ({row.completedCount}/{row.candidateCount})</span>
                      ) : (
                        <span className="pill pill-default">En attente (0/{row.candidateCount})</span>
                      )}
                    </td>
                    {canViewStudents && (
                      <td>
                        {onSelectStudent ? (
                          <Link
                            className="btn btn-sm btn-outline"
                            href={studentPath(row.matricule)}
                            onClick={e => {
                              if (onSelectStudent) {
                                e.preventDefault();
                                onSelectStudent(row.matricule);
                              }
                            }}
                          >
                            Voir les notes
                          </Link>
                        ) : (
                          <Link className="btn btn-sm btn-outline" href={studentPath(row.matricule)}>
                            Fiche & Dossier
                          </Link>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!studentRows.length && (
                  <tr>
                    <td colSpan={orderedSubjectEvals.length + (canViewStudents ? 4 : 3)}>
                      Aucun étudiant pour ce filtre dans ce groupe.
                    </td>
                  </tr>
                )}
              </tbody>
            </ResponsiveTable>
          </div>
        </div>
      )}
      {creatingEval && <EvaluationCreateDialog onClose={() => setCreatingEval(false)} onCreated={id => { setCreatingEval(false); setManagingEvalId(id); }} />}
      {managingEvalId && <EvaluationGradeDialog evaluationId={managingEvalId} onClose={() => setManagingEvalId('')} />}
    </section>
  );
}

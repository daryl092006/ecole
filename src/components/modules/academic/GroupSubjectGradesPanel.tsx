'use client';
import { useState } from 'react';
import Link from 'next/link';
import { studentPath } from '@/constants/portalRoutes';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';

interface Props {
  snapshot: RelationalSnapshot;
  canViewStudents: boolean;
  onSelectStudent?: (matricule: string) => void;
}

export default function GroupSubjectGradesPanel({ snapshot, canViewStudents, onSelectStudent }: Props) {
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
    const numericGrades = groupCands
      .map(c => gradeByCandidate.get(String(c.id)))
      .filter((g): g is DatabaseRow => !!g && g.value != null && Number.isFinite(Number(g.value)))
      .map(g => Number(g.value));
    const subjectMap = new Map<string, { id: string; code: string; name: string; evals: DatabaseRow[] }>();
    for (const ev of groupEvals) {
      const subj = evalSubject(ev);
      if (!subjectMap.has(subj.id)) subjectMap.set(subj.id, { ...subj, evals: [] });
      subjectMap.get(subj.id)!.evals.push(ev);
    }
    const memberEnrollmentIds = new Set(enrollmentGroups.filter(eg => eg.group_id === gId).map(eg => String(eg.enrollment_id)));
    for (const c of groupCands) memberEnrollmentIds.add(String(c.enrollment_id));
    const level = levels.find(l => l.id === group.level_id);
    const avg = numericGrades.length ? numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length : null;
    const passCount = numericGrades.filter(v => v >= 10).length;
    return {
      group,
      id: gId,
      name: String(group.name || gId),
      levelName: String(level?.name || ''),
      studentCount: memberEnrollmentIds.size,
      subjects: [...subjectMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      gradeCount: numericGrades.length,
      average: avg,
      passRate: numericGrades.length ? Math.round((passCount / numericGrades.length) * 100) : null,
      memberEnrollmentIds,
    };
  }).filter(item => item.subjects.length > 0 || item.studentCount > 0)
    .sort((a, b) => b.gradeCount - a.gradeCount || a.name.localeCompare(b.name, 'fr'));

  if (!groupsWithData.length) return null;

  const activeGroup = groupsWithData.find(g => g.id === selectedGroupId) || groupsWithData[0];
  const activeSubjects = activeGroup.subjects;
  const activeSubject = activeSubjects.find(s => s.id === selectedSubjectId) || activeSubjects[0] || null;

  const subjectSummaries = activeSubjects.map(subj => {
    const evalIds = new Set(subj.evals.map(e => String(e.id)));
    const subjCands = candidates.filter(c => evalIds.has(String(c.evaluation_id)));
    const vals = subjCands
      .map(c => gradeByCandidate.get(String(c.id)))
      .filter((g): g is DatabaseRow => !!g && g.value != null && Number.isFinite(Number(g.value)))
      .map(g => Number(g.value));
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const min = vals.length ? Math.min(...vals) : null;
    const max = vals.length ? Math.max(...vals) : null;
    const pass = vals.filter(v => v >= 10).length;
    const kinds = [...new Set(subj.evals.map(e => e.session_type === 'RATTRAPAGE' || e.kind === 'RATTRAPAGE' ? 'Rattrapage' : e.kind === 'DEVOIR' ? 'Contrôle continu' : 'Examen'))];
    return {
      ...subj,
      kinds,
      notesCount: vals.length,
      average: avg,
      min,
      max,
      passRate: vals.length ? Math.round((pass / vals.length) * 100) : null,
    };
  });

  const activeSubjectSummary = subjectSummaries.find(s => s.id === activeSubject?.id) || null;

  // Build student rows for activeGroup & activeSubject
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

    const evalIds = new Set((activeSubject?.evals || []).map(e => String(e.id)));
    const studCands = candidates.filter(c => String(c.enrollment_id) === enrollmentId && evalIds.has(String(c.evaluation_id)));

    let controlGrade: number | null = null;
    let examGrade: number | null = null;
    let resitGrade: number | null = null;

    for (const c of studCands) {
      const ev = activeSubject?.evals.find(e => String(e.id) === String(c.evaluation_id));
      const g = gradeByCandidate.get(String(c.id));
      if (!ev || !g || g.value == null || !Number.isFinite(Number(g.value))) continue;
      const val = Number(g.value);
      if (ev.session_type === 'RATTRAPAGE' || ev.kind === 'RATTRAPAGE') resitGrade = val;
      else if (ev.kind === 'DEVOIR' || ev.kind === 'INTERROGATION' || ev.kind === 'TP' || ev.kind === 'PROJET') controlGrade = val;
      else examGrade = val;
    }

    const availableGrades = [controlGrade, resitGrade ?? examGrade].filter((v): v is number => v !== null);
    const finalAverage = availableGrades.length ? availableGrades.reduce((a, b) => a + b, 0) / availableGrades.length : null;

    return [{
      enrollmentId,
      matricule,
      fullName,
      filiere,
      controlGrade,
      examGrade,
      resitGrade,
      finalAverage,
      hasAnyGrade: controlGrade !== null || examGrade !== null || resitGrade !== null,
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
                {g.name} ({g.subjects.length} mat. · {g.gradeCount} notes)
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
          <span>Matières ({activeGroup.gradeCount} notes)</span>
        </div>
        <div className="kpi-stat-tile">
          <strong>{activeGroup.average !== null ? fmtGrade(activeGroup.average) : '—'}</strong>
          <span>Moyenne ({activeGroup.passRate !== null ? `${activeGroup.passRate} % réussite` : '—'})</span>
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
                <th>Notes saisies</th>
                <th>Moyenne</th>
                <th>Min / Max</th>
                <th>Réussite (≥ 10)</th>
              </tr>
            </thead>
            <tbody>
              {subjectSummaries.map(item => (
                <tr key={item.id} className={item.id === activeSubject?.id ? 'selected-row' : ''}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.code && <div className="cell-sub">{item.code}</div>}
                  </td>
                  <td>{item.kinds.join(' + ')}</td>
                  <td>{item.notesCount}</td>
                  <td><strong>{item.average !== null ? fmtGrade(item.average) : '—'}</strong></td>
                  <td>{item.min !== null && item.max !== null ? `${item.min.toLocaleString('fr-FR')} – ${item.max.toLocaleString('fr-FR')} / 20` : '—'}</td>
                  <td>{item.passRate !== null ? `${item.passRate} %` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
        </div>
      )}

      {activeSubjectSummary && (
        <div>
          <h3>
            Notes de {activeSubjectSummary.name} — {activeGroup.name} ({studentRows.filter(r => r.hasAnyGrade).length} noté(s) sur {studentRows.length})
          </h3>
          <ResponsiveTable className="data-table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Filière</th>
                <th>Contrôle continu</th>
                <th>Examen</th>
                <th>Rattrapage</th>
                <th>Moyenne matière</th>
                <th>Appréciation</th>
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
                  <td>{fmtGrade(row.controlGrade)}</td>
                  <td>{fmtGrade(row.examGrade)}</td>
                  <td>{fmtGrade(row.resitGrade)}</td>
                  <td><strong>{fmtGrade(row.finalAverage)}</strong></td>
                  <td>
                    {row.finalAverage === null ? (
                      <span className="pill pill-default">Sans note</span>
                    ) : row.finalAverage >= 10 ? (
                      <span className="pill pill-success">Validé ({row.finalAverage.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}/20)</span>
                    ) : (
                      <span className="pill pill-warning">Ajourné ({row.finalAverage.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}/20)</span>
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
                  <td colSpan={canViewStudents ? 8 : 7}>Aucun étudiant pour ce filtre dans ce groupe.</td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </div>
      )}
    </section>
  );
}

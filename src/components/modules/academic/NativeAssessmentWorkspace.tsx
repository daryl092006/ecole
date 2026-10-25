'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
import { ASSESSMENT_LABELS, combinedAssessmentProgress, type AssessmentCategory } from '@/services/assessmentDisplayService';
import { connectedRecordName, connectedRecordValue } from '@/services/connectedRecordDisplayService';
import type { DatabaseRow } from '@/types/persistence';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import IconButton from '@/components/ui/IconButton';
import WorkPage from '@/components/ui/WorkPage';
import ExamCopies from '../history/ExamCopies';
import { downloadCsv } from '@/utils/csv';
import EvaluationGradeDialog from './EvaluationGradeDialog';
import EvaluationCreateDialog from './EvaluationCreateDialog';
import PersistentExamCopies from './PersistentExamCopies';
import ExamDeliveryScheduleDialog from './ExamDeliveryScheduleDialog';
import {
  evaluationCandidateStatusLabel,
  evaluationGradeIsComplete,
  evaluationGradeNoteLabel,
  evaluationGradeValue,
} from '@/services/evaluationGradePolicy';

export default function NativeAssessmentWorkspace({ category }: { category: AssessmentCategory }) {
  const { relationalSnapshot: data, perms, history } = usePortal();
  const params = useSearchParams();
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [withdrawn, setWithdrawn] = useState(false);
  const [selectedId, setSelectedId] = useState(() => params.get('epreuve') || '');
  const [copies, setCopies] = useState(false);
  const [exported, setExported] = useState(false);
  const [creatingEval, setCreatingEval] = useState(false);
  const [managingEvalIds, setManagingEvalIds] = useState<string[]>([]);
  const [onlineCopiesId, setOnlineCopiesId] = useState('');
  const [schedulingDelivery, setSchedulingDelivery] = useState<DatabaseRow | null>(null);

  const groupName = (row: DatabaseRow) => {
    const assignment = data.tables.teaching_assignments?.find(item => item.id === row.assignment_id);
    return connectedRecordValue('teaching_assignments', 'group_id', assignment?.group_id ?? row.group_id, data);
  };
  const subjectName = (row: DatabaseRow) => {
    const assignment = data.tables.teaching_assignments?.find(item => item.id === row.assignment_id);
    const compId = row.component_id ?? assignment?.component_id;
    const comp = data.tables.curriculum_components?.find(item => item.id === compId);
    const subj = comp && data.tables.subjects?.find(item => item.id === comp.subject_id);
    if (subj?.name) return String(subj.name);
    const parts = String(row.name || '').split(' · ');
    return parts.length >= 2 ? parts[1] : 'Non renseignée';
  };
  const isResit = (row: DatabaseRow) => row.kind === 'RATTRAPAGE' || row.session_type === 'RATTRAPAGE';
  const groupKey = (row: DatabaseRow) => row.legacy_source_row_id ? `${row.legacy_source_row_id}:${String(row.name || '')}` : row.id;
  const allEvaluations = data.tables.evaluations || [];
  const allCandidates = data.tables.evaluation_candidates || [];
  const allGrades = data.tables.grades || [];
  const gradeDataAvailable = Array.isArray(data.tables.grades);
  const allAttempts = data.tables.exam_attempts || [];
  const gradeByCand = new Map(allGrades.map(g => [String(g.candidate_id), g]));
  const lastAttemptByCand = new Map<string, DatabaseRow>();
  for (const attempt of allAttempts) {
    const cId = String(attempt.candidate_id);
    const prev = lastAttemptByCand.get(cId);
    if (!prev || Number(attempt.attempt_number || 0) >= Number(prev.attempt_number || 0)) {
      lastAttemptByCand.set(cId, attempt);
    }
  }
  const directMatch = allEvaluations.find(row => row.id === selectedId);
  const selectedGroupKey = directMatch ? groupKey(directMatch) : '';
  const linkedRaw = allEvaluations.filter(row => !!selectedId && (row.id === selectedId || (selectedGroupKey && groupKey(row) === selectedGroupKey) || (!directMatch && (row.legacy_source_row_id === selectedId || groupKey(row) === selectedId))));
  const linkedKeys = new Set(linkedRaw.map(groupKey));
  const matching = allEvaluations.filter(row => (linkedKeys.size < 2 || linkedKeys.has(groupKey(row))) && Boolean(row.cancelled_at || row.archived_at) === withdrawn
    && (category === 'resit' ? isResit(row) : category === 'exam' ? row.kind === 'EXAMEN' && !isResit(row) : !isResit(row) && ['DEVOIR', 'INTERROGATION', 'TP', 'EXPOSE', 'PROJET'].includes(String(row.kind))));
  const groupedMap = new Map<string, typeof matching>();
  for (const row of matching) {
    const k = groupKey(row);
    if (!groupedMap.has(k)) groupedMap.set(k, []);
    groupedMap.get(k)!.push(row);
  }
  const allGroupedItems = [...groupedMap.values()].map(members => {
    const memberIds = new Set(members.map(m => String(m.id)));
    const cands = allCandidates.filter(c => memberIds.has(String(c.evaluation_id)));
    const vals = gradeDataAvailable ? cands.map(c => evaluationGradeValue(gradeByCand.get(String(c.id)))).filter((value): value is number => value !== null) : [];
    const absentCount = gradeDataAvailable ? cands.filter(c => ['ABSENT', 'JUSTIFIE'].includes(String(gradeByCand.get(String(c.id))?.absence_status || ''))).length : 0;
    const pendingCount = gradeDataAvailable ? cands.filter(c => !evaluationGradeIsComplete(gradeByCand.get(String(c.id)))).length : 0;
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const statsLabel = !gradeDataAvailable
      ? `${cands.length} candidat(s)`
      : vals.length
      ? `${vals.length} note(s) · Moy. ${avg!.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}/20${absentCount ? ` · ${absentCount} abs.` : ''}${pendingCount ? ` · ${pendingCount} à corriger` : ''}`
      : `${cands.length} candidat(s)${absentCount ? ` · ${absentCount} abs.` : ''}${pendingCount ? ` · ${pendingCount} à corriger` : ''}`;
    return {
      key: groupKey(members[0]),
      primary: members[0],
      members,
      subjectLabel: subjectName(members[0]),
      groupLabel: groupName(members[0]),
      statusLabel: combinedAssessmentProgress(members, pendingCount, cands.length),
      notesCount: vals.length,
      absentCount,
      pendingCount,
      average: avg,
      statsLabel,
    };
  });
  const availableGroups = [...new Set(allGroupedItems.map(item => item.groupLabel).filter(g => g && g !== 'Non renseigné'))].sort((a, b) => a.localeCompare(b, 'fr'));
  const availableSubjects = [...new Set(allGroupedItems.filter(item => !groupFilter || item.groupLabel === groupFilter).map(item => item.subjectLabel).filter(s => s && s !== 'Non renseignée'))].sort((a, b) => a.localeCompare(b, 'fr'));
  const rows = allGroupedItems.filter(item => (!statusFilter || item.statusLabel === statusFilter) && (!groupFilter || item.groupLabel === groupFilter)
    && (!subjectFilter || item.subjectLabel === subjectFilter)
    && `${item.primary.name} ${item.subjectLabel} ${item.groupLabel} ${item.statusLabel}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  const selectedMembers = linkedKeys.size === 1 ? linkedRaw : undefined;
  const selected = selectedMembers?.[0];
  const selectedStatusLabel = selected ? allGroupedItems.find(item => item.key === groupKey(selected))?.statusLabel : undefined;
  const selectedMemberIds = new Set((selectedMembers || []).map(row => row.id));
  const source = selected && history.catalog?.references.evaluations?.find(row => row.id === selected.legacy_source_row_id);
  const candidates = allCandidates.filter(row => selectedMemberIds.has(String(row.evaluation_id)));
  if (copies && source) return <ExamCopies exam={source} onBack={() => setCopies(false)} backLabel="Revenir à l’épreuve" />;
  return <div>
    <div className="page-intro">
      <div>
        <span className="page-eyebrow">PÉDAGOGIE</span>
        <h1>{ASSESSMENT_LABELS[category]}</h1>
        <p>Épreuves et résultats de l’année consultée, classés par groupe et par matière.</p>
      </div>
      <div className="btn-group">
        {perms.permissions.includes('evaluation.create') && (
          <button className="btn btn-primary" onClick={() => setCreatingEval(true)}>
            Nouvelle évaluation
          </button>
        )}
        {perms.permissions.includes('evaluation.create') && (
          <Link className="btn btn-outline" href={`/academique/sujets?nouveau=1&nature=${category}`}>
            Composer une épreuve
          </Link>
        )}
      </div>
    </div>
    <section className="card card-full">
      {linkedKeys.size > 1 && <p role="status">Ce lien regroupe plusieurs épreuves. Choisissez celle à consulter.</p>}
      <div className="browser-toolbar">
        <label className="form-group">Rechercher une épreuve<input className="input" type="search" value={query} onChange={event => { setQuery(event.target.value); setExported(false); }} placeholder="Matière, groupe ou état" /></label>
        {availableGroups.length > 0 && <label className="form-group">Filtrer par groupe<select className="select-input" value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setSubjectFilter(''); setExported(false); }}><option value="">Tous les groupes ({availableGroups.length})</option>{availableGroups.map(g => <option key={g} value={g}>{g}</option>)}</select></label>}
        {availableSubjects.length > 0 && <label className="form-group">Filtrer par matière<select className="select-input" value={subjectFilter} onChange={e => { setSubjectFilter(e.target.value); setExported(false); }}><option value="">Toutes les matières ({availableSubjects.length})</option>{availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}</select></label>}
        <label className="form-group">État de l’épreuve<select className="select-input" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setExported(false); }}><option value="">Tous les états</option>{[...new Set(allGroupedItems.map(item => item.statusLabel))].sort().map(status => <option key={status}>{status}</option>)}</select></label>
        <IconButton className="btn btn-outline" label="Exporter les épreuves" disabled={!rows.length} onClick={() => { downloadCsv('epreuves.csv', ['Épreuve', 'Matière', 'Groupe', 'Notes et moyenne', 'État de l’épreuve'], rows.map(item => [String(item.primary.name), item.subjectLabel, item.groupLabel, item.statsLabel, item.statusLabel])); setExported(true); }} />
      </div>
      <label className="checkbox-field"><input type="checkbox" checked={withdrawn} onChange={event => { setWithdrawn(event.target.checked); setStatusFilter(''); setExported(false); }} /> Épreuves retirées</label>
      {exported && <p role="status">{rows.length} épreuve(s) exportée(s).</p>}
      <ResponsiveTable className="data-table"><thead><tr><th>Épreuve</th><th>Matière</th><th>Groupe</th><th>Notes et moyenne</th><th>État de l’épreuve</th><th>Actions</th></tr></thead><tbody>{rows.map(item => <tr key={item.primary.id}><td>{String(item.primary.name)}</td><td>{item.subjectLabel}</td><td>{item.groupLabel}</td><td>{item.statsLabel}</td><td>{item.statusLabel}</td><td><div className="btn-group"><IconButton className="btn btn-outline" label="Ouvrir le détail" onClick={() => { setSelectedId(item.primary.id); setCopies(false); }} />{(perms.permissions.includes('grade.enter') || perms.permissions.includes('grade.review') || perms.permissions.includes('grade.approve') || perms.permissions.includes('grade.publish')) && <IconButton className="btn btn-primary" label="Saisir / Gérer" onClick={() => setManagingEvalIds(item.members.map(m => String(m.id)))} />}</div></td></tr>)}{!rows.length && <tr><td colSpan={6}>Aucune épreuve pour cette catégorie et ces filtres.</td></tr>}</tbody></ResponsiveTable>
    </section>
    {selected && selectedMembers && (() => {
      const selectedPaper = (data.tables.exam_papers || [])
        .filter(row => row.evaluation_id === selected.id && !row.archived_at)
        .sort((a, b) => Number(b.version) - Number(a.version))[0];
      const selectedDelivery = (data.tables.exam_deliveries || []).find(row => row.evaluation_id === selected.id);
      const selectedSession = selectedDelivery && (data.tables.sessions || []).find(row => row.id === selectedDelivery.session_id);
      const planningQuery = new URLSearchParams({ affectation: String(selected.assignment_id), mode: 'PAPIER', epreuve: String(selected.id), nature: category });
      return (
        <WorkPage title={String(selected.name)} onClose={() => setSelectedId('')}>
          <section className="exam-preparation" aria-label="Préparation de l’épreuve">
            <h3>Mise en place de l’épreuve</h3>
            <ol className="exam-preparation-steps">
              <li><strong>1. Groupe et candidats</strong><span>{groupName(selected)} · {candidates.length} candidat(s)</span></li>
              <li><strong>2. Sujet et barème</strong><span>{selectedPaper ? selectedPaper.status === 'AUTORISE' ? 'Sujet autorisé' : 'Sujet en brouillon' : 'Sujet à composer'}</span></li>
              <li><strong>3. Date et salle</strong><span>{selectedSession ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lome' }).format(new Date(String(selectedSession.starts_at))) : 'Séance à choisir dans la programmation'}</span></li>
              <li><strong>4. Accès étudiant en ligne</strong><span>{selectedDelivery && selectedPaper?.status === 'AUTORISE' ? 'Sujet autorisé et fenêtre configurée' : 'Sujet autorisé et programmation nécessaires'}</span></li>
            </ol>
            <p>Pour une composition en ligne, les candidats éligibles accèdent au sujet autorisé pendant la fenêtre programmée. Les notes suivent leur propre circuit de validation.</p>
          </section>
          <dl className="record-details-grid">
            <div><dt>Matière</dt><dd>{subjectName(selected)}</dd></div>
            <div><dt>Groupe</dt><dd>{groupName(selected)}</dd></div>
            <div><dt>État des notes</dt><dd>{selectedStatusLabel || connectedRecordValue('evaluations', 'status', selected.status, data)}</dd></div>
            <div>
              <dt>Sujet d’examen</dt>
              <dd>
                {selectedPaper ? (
                  <span>
                    <span className={`pill ${selectedPaper.status === 'AUTORISE' ? 'pill-success' : 'pill-warning'}`}>
                      {selectedPaper.status === 'AUTORISE' ? 'Autorisé' : 'Brouillon'} (v{String(selectedPaper.version)})
                    </span>{' '}
                    {String(selectedPaper.title || '')} · {String(selectedPaper.duration_minutes)} min
                  </span>
                ) : (
                  <span className="cell-sub">Aucun sujet composé</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Diffusion en ligne</dt>
              <dd>
                {selectedDelivery ? (
                  <span>
                    Du {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lome' }).format(new Date(String(selectedDelivery.access_opens_at)))} au {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lome' }).format(new Date(String(selectedDelivery.access_closes_at)))} ({String(selectedDelivery.duration_minutes)} min)
                  </span>
                ) : (
                  <span className="cell-sub">Non programmée</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="btn-group mb-2">
            {(perms.permissions.includes('grade.enter') || perms.permissions.includes('grade.review') || perms.permissions.includes('grade.approve') || perms.permissions.includes('grade.publish')) && (
              <button className="btn btn-primary" onClick={() => setManagingEvalIds(selectedMembers.map(m => String(m.id)))}>
                Saisir / Gérer les notes
              </button>
            )}
            {perms.permissions.includes('evaluation.create') && (
              <Link className="btn btn-outline" href={selectedPaper ? `/academique/sujets?sujet=${encodeURIComponent(String(selectedPaper.id))}` : `/academique/sujets?nouveau=1&nature=${category}&evalId=${encodeURIComponent(String(selected.id))}&titre=${encodeURIComponent(String(selected.name || ''))}`}>
                {selectedPaper ? 'Modifier le sujet' : 'Composer le sujet'}
              </Link>
            )}
            {perms.permissions.includes('schedule.create') && <Link className="btn btn-outline" href={`/academique/emploi-du-temps?${planningQuery}`}>Planifier la date et la salle</Link>}
            {perms.permissions.includes('evaluation.create') && (
              <button className="btn btn-outline" onClick={() => setSchedulingDelivery(selected)}>
                {selectedDelivery ? 'Modifier la diffusion' : 'Programmer la diffusion'}
              </button>
            )}
            {perms.permissions.includes('grade.enter') && selectedDelivery && (
              <button className="btn btn-outline" onClick={() => setOnlineCopiesId(selected.id)}>
                Copies en ligne
              </button>
            )}
            {source && (
              <button className="btn btn-outline" onClick={() => setCopies(true)}>
                Consulter les copies et le sujet
              </button>
            )}
          </div>
          <h3>Résultats ({candidates.length})</h3>
          <p className="cell-sub mb-2">Une copie sans note signifie qu’elle est en attente de correction par l’enseignant. Seuls les statuts « Absent injustifié » et « Absent justifié » indiquent une absence de l’étudiant à l’épreuve.</p>
          <ResponsiveTable className="data-table">
            <thead>
              <tr><th>Étudiant</th><th>Note</th><th>Statut de correction &amp; présence</th></tr>
            </thead>
            <tbody>
              {candidates.map(candidate => {
                const grade = gradeByCand.get(String(candidate.id));
                const attempt = lastAttemptByCand.get(String(candidate.id));
                return (
                  <tr key={candidate.id}>
                    <td>{connectedRecordName('enrollments', data.tables.enrollments?.find(row => row.id === candidate.enrollment_id) || { id: String(candidate.enrollment_id) }, data)}</td>
                    <td>{evaluationGradeNoteLabel(grade, attempt?.status)}</td>
                    <td>{evaluationCandidateStatusLabel(grade, attempt?.status)}</td>
                  </tr>
                );
              })}
              {!candidates.length && <tr><td colSpan={3}>Aucun candidat rattaché à cette épreuve.</td></tr>}
            </tbody>
          </ResponsiveTable>
        </WorkPage>
      );
    })()}
    {schedulingDelivery && (
      <ExamDeliveryScheduleDialog
        evaluation={schedulingDelivery}
        onClose={() => setSchedulingDelivery(null)}
        onScheduled={() => setSchedulingDelivery(null)}
      />
    )}
    {onlineCopiesId && <PersistentExamCopies evaluationId={onlineCopiesId} onClose={() => setOnlineCopiesId('')} />}
    {creatingEval && <EvaluationCreateDialog category={category === 'unknown' ? 'control' : category} onClose={() => setCreatingEval(false)} onCreated={id => { setCreatingEval(false); setSelectedId(id); }} />}
    {managingEvalIds.length > 0 && <EvaluationGradeDialog evaluationId={managingEvalIds[0]} evaluationIds={managingEvalIds} onClose={() => setManagingEvalIds([])} />}
  </div>;
}

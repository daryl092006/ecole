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
import { evaluationGradeValue } from '@/services/evaluationGradePolicy';

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
  const [managingEvalId, setManagingEvalId] = useState('');
  const [onlineCopiesId, setOnlineCopiesId] = useState('');

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
  const formatOfferings = (offeringIds: unknown[]) => {
    const unique = [...new Set(offeringIds.filter(Boolean))];
    if (unique.length <= 1) return connectedRecordValue('evaluations', 'offering_id', unique[0], data);
    const names = unique.map(id => {
      const off = data.tables.academic_offerings?.find(item => item.id === id);
      const curr = off && data.tables.curricula?.find(item => item.id === off.curriculum_id);
      const prog = curr && data.tables.programs?.find(item => item.id === curr.program_id);
      return prog?.name ? String(prog.name) : '';
    }).filter(Boolean);
    const distinctProgs = [...new Set(names)];
    const firstOff = data.tables.academic_offerings?.find(item => item.id === unique[0]);
    const level = firstOff && data.tables.levels?.find(item => item.id === firstOff.level_id);
    return distinctProgs.length ? `${distinctProgs.join(', ')}${level?.name ? ` · ${level.name}` : ''}` : connectedRecordValue('evaluations', 'offering_id', unique[0], data);
  };
  const allEvaluations = data.tables.evaluations || [];
  const allCandidates = data.tables.evaluation_candidates || [];
  const allGrades = data.tables.grades || [];
  const gradeByCand = new Map(allGrades.map(g => [String(g.candidate_id), g]));
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
    const vals = cands.map(c => evaluationGradeValue(gradeByCand.get(String(c.id)))).filter((value): value is number => value !== null);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return {
      key: groupKey(members[0]),
      primary: members[0],
      members,
      subjectLabel: subjectName(members[0]),
      formationLabel: formatOfferings(members.map(m => m.offering_id)),
      groupLabel: groupName(members[0]),
      statusLabel: combinedAssessmentProgress(members),
      notesCount: vals.length,
      average: avg,
      statsLabel: vals.length ? `${vals.length} note(s) · Moy. ${avg!.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}/20` : `${cands.length} candidat(s)`,
    };
  });
  const availableGroups = [...new Set(allGroupedItems.map(item => item.groupLabel).filter(g => g && g !== 'Non renseigné'))].sort((a, b) => a.localeCompare(b, 'fr'));
  const availableSubjects = [...new Set(allGroupedItems.filter(item => !groupFilter || item.groupLabel === groupFilter).map(item => item.subjectLabel).filter(s => s && s !== 'Non renseignée'))].sort((a, b) => a.localeCompare(b, 'fr'));
  const rows = allGroupedItems.filter(item => (!statusFilter || item.statusLabel === statusFilter) && (!groupFilter || item.groupLabel === groupFilter)
    && (!subjectFilter || item.subjectLabel === subjectFilter)
    && `${item.primary.name} ${item.subjectLabel} ${item.formationLabel} ${item.groupLabel} ${item.statusLabel}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  const selectedMembers = linkedKeys.size === 1 ? linkedRaw : undefined;
  const selected = selectedMembers?.[0];
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
      {linkedKeys.size > 1 && <p role="status">Ce lien concerne plusieurs formations. Choisissez l’épreuve de la formation à consulter.</p>}
      <div className="browser-toolbar">
        <label className="form-group">Rechercher une épreuve<input className="input" type="search" value={query} onChange={event => { setQuery(event.target.value); setExported(false); }} placeholder="Matière, groupe ou état" /></label>
        {availableGroups.length > 0 && <label className="form-group">Filtrer par groupe<select className="select-input" value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setSubjectFilter(''); setExported(false); }}><option value="">Tous les groupes ({availableGroups.length})</option>{availableGroups.map(g => <option key={g} value={g}>{g}</option>)}</select></label>}
        {availableSubjects.length > 0 && <label className="form-group">Filtrer par matière<select className="select-input" value={subjectFilter} onChange={e => { setSubjectFilter(e.target.value); setExported(false); }}><option value="">Toutes les matières ({availableSubjects.length})</option>{availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}</select></label>}
        <label className="form-group">État de l’épreuve<select className="select-input" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setExported(false); }}><option value="">Tous les états</option>{[...new Set(allGroupedItems.map(item => item.statusLabel))].sort().map(status => <option key={status}>{status}</option>)}</select></label>
        <IconButton className="btn btn-outline" label="Exporter les épreuves" disabled={!rows.length} onClick={() => { downloadCsv('epreuves.csv', ['Épreuve', 'Matière', 'Formation', 'Groupe', 'Notes et moyenne', 'État de l’épreuve'], rows.map(item => [String(item.primary.name), item.subjectLabel, item.formationLabel, item.groupLabel, item.statsLabel, item.statusLabel])); setExported(true); }} />
      </div>
      <label className="checkbox-field"><input type="checkbox" checked={withdrawn} onChange={event => { setWithdrawn(event.target.checked); setStatusFilter(''); setExported(false); }} /> Épreuves retirées</label>
      {exported && <p role="status">{rows.length} épreuve(s) exportée(s).</p>}
      <ResponsiveTable className="data-table"><thead><tr><th>Épreuve</th><th>Matière</th><th>Groupe</th><th>Formation</th><th>Notes et moyenne</th><th>État de l’épreuve</th><th>Actions</th></tr></thead><tbody>{rows.map(item => <tr key={item.primary.id}><td>{String(item.primary.name)}</td><td>{item.subjectLabel}</td><td>{item.groupLabel}</td><td>{item.formationLabel}</td><td>{item.statsLabel}</td><td>{item.statusLabel}</td><td><div className="btn-group"><IconButton className="btn btn-outline" label="Ouvrir le détail" onClick={() => { setSelectedId(item.primary.id); setCopies(false); }} />{(perms.permissions.includes('grade.enter') || perms.permissions.includes('grade.review') || perms.permissions.includes('grade.approve') || perms.permissions.includes('grade.publish')) && <IconButton className="btn btn-primary" label="Saisir / Gérer" onClick={() => setManagingEvalId(item.primary.id)} />}</div></td></tr>)}{!rows.length && <tr><td colSpan={7}>Aucune épreuve pour cette catégorie et ces filtres.</td></tr>}</tbody></ResponsiveTable>
    </section>
    {selected && selectedMembers && <WorkPage title={String(selected.name)} onClose={() => setSelectedId('')}><dl className="record-details-grid"><div><dt>Matière</dt><dd>{subjectName(selected)}</dd></div><div><dt>Groupe</dt><dd>{groupName(selected)}</dd></div><div><dt>Formation</dt><dd>{formatOfferings(selectedMembers.map(m => m.offering_id))}</dd></div><div><dt>État des notes</dt><dd>{connectedRecordValue('evaluations', 'status', selected.status, data)}</dd></div></dl><div className="btn-group mb-2">{(perms.permissions.includes('grade.enter') || perms.permissions.includes('grade.review') || perms.permissions.includes('grade.approve') || perms.permissions.includes('grade.publish')) && <button className="btn btn-primary" onClick={() => setManagingEvalId(selected.id)}>Saisir / Gérer les notes</button>}{perms.permissions.includes('evaluation.create') && <Link className="btn btn-outline" href={`/academique/sujets?nouveau=1&nature=${category}&evalId=${encodeURIComponent(String(selected.id))}&titre=${encodeURIComponent(String(selected.name || ''))}`}>Composer le sujet</Link>}{perms.permissions.includes('grade.enter') && data.tables.exam_deliveries?.some(row => row.evaluation_id === selected.id) && <button className="btn btn-outline" onClick={() => setOnlineCopiesId(selected.id)}>Copies en ligne</button>}{source && <button className="btn btn-outline" onClick={() => setCopies(true)}>Consulter les copies et le sujet</button>}</div><h3>Résultats ({candidates.length})</h3><ResponsiveTable className="data-table"><thead><tr><th>Étudiant</th><th>Note</th><th>Présence</th></tr></thead><tbody>{candidates.map(candidate => { const grade = data.tables.grades?.find(row => row.candidate_id === candidate.id); return <tr key={candidate.id}><td>{connectedRecordName('enrollments', data.tables.enrollments?.find(row => row.id === candidate.enrollment_id) || { id: String(candidate.enrollment_id) }, data)}</td><td>{grade ? connectedRecordValue('grades', 'value', evaluationGradeValue(grade), data) : 'Non saisie'}</td><td>{grade ? connectedRecordValue('grades', 'absence_status', grade.absence_status, data) : 'Non renseignée'}</td></tr>; })}{!candidates.length && <tr><td colSpan={3}>Aucun candidat rattaché à cette épreuve.</td></tr>}</tbody></ResponsiveTable></WorkPage>}
    {onlineCopiesId && <PersistentExamCopies evaluationId={onlineCopiesId} onClose={() => setOnlineCopiesId('')} />}
    {creatingEval && <EvaluationCreateDialog onClose={() => setCreatingEval(false)} onCreated={id => { setCreatingEval(false); setManagingEvalId(id); }} />}
    {managingEvalId && <EvaluationGradeDialog evaluationId={managingEvalId} onClose={() => setManagingEvalId('')} />}
  </div>;
}

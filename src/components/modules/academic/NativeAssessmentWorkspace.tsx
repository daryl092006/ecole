'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
import { ASSESSMENT_LABELS, type AssessmentCategory } from '@/services/assessmentDisplayService';
import { connectedRecordName, connectedRecordValue } from '@/services/connectedRecordDisplayService';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import IconButton from '@/components/ui/IconButton';
import WorkPage from '@/components/ui/WorkPage';
import ExamCopies from '../history/ExamCopies';
import { downloadCsv } from '@/utils/csv';

export default function NativeAssessmentWorkspace({ category }: { category: AssessmentCategory }) {
  const { relationalSnapshot: data, perms, history } = usePortal();
  const params = useSearchParams();
  const [query, setQuery] = useState('');
  const [withdrawn, setWithdrawn] = useState(false);
  const [selectedId, setSelectedId] = useState(() => params.get('epreuve') || '');
  const [copies, setCopies] = useState(false);
  const [exported, setExported] = useState(false);
  const groupName = (assignmentId: unknown) => {
    const assignment = data.tables.teaching_assignments?.find(row => row.id === assignmentId);
    return connectedRecordValue('teaching_assignments', 'group_id', assignment?.group_id, data);
  };
  const linked = (data.tables.evaluations || []).filter(row => row.id === selectedId || !!selectedId && row.legacy_source_row_id === selectedId);
  const rows = (data.tables.evaluations || []).filter(row => (linked.length < 2 || linked.some(match => match.id === row.id)) && Boolean(row.cancelled_at) === withdrawn
    && (category === 'exam' ? row.kind === 'EXAMEN' : category === 'resit' ? row.kind === 'RATTRAPAGE' : ['DEVOIR', 'INTERROGATION', 'TP', 'EXPOSE', 'PROJET'].includes(String(row.kind)))
    && `${row.name} ${connectedRecordValue('evaluations', 'offering_id', row.offering_id, data)} ${groupName(row.assignment_id)} ${connectedRecordValue('evaluations', 'status', row.status, data)}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  const selected = linked.length === 1 ? linked[0] : undefined;
  const source = selected && history.catalog?.references.evaluations?.find(row => row.id === selected.legacy_source_row_id);
  const candidates = (data.tables.evaluation_candidates || []).filter(row => row.evaluation_id === selected?.id);
  if (copies && source) return <ExamCopies exam={source} onBack={() => setCopies(false)} backLabel="Revenir à l’épreuve" />;
  return <div>
    <div className="page-intro"><div><span className="page-eyebrow">PÉDAGOGIE</span><h1>{ASSESSMENT_LABELS[category]}</h1><p>Épreuves et résultats de l’année consultée, dans votre périmètre d’enseignement.</p></div>{perms.permissions.includes('evaluation.create') && <Link className="btn btn-primary" href={`/academique/sujets?nouveau=1&nature=${category}`}>Composer une épreuve</Link>}</div>
    <section className="card card-full">
      {linked.length > 1 && <p role="status">Ce lien concerne plusieurs formations. Choisissez l’épreuve de la formation à consulter.</p>}
      <div className="browser-toolbar"><label className="form-group">Rechercher une épreuve<input className="input" type="search" value={query} onChange={event => { setQuery(event.target.value); setExported(false); }} placeholder="Matière, groupe ou état" /></label><IconButton className="btn btn-outline" label="Exporter les épreuves" disabled={!rows.length} onClick={() => { downloadCsv('epreuves.csv', ['Épreuve', 'Formation', 'Groupe', 'État des notes'], rows.map(row => [String(row.name), connectedRecordValue('evaluations', 'offering_id', row.offering_id, data), groupName(row.assignment_id), connectedRecordValue('evaluations', 'status', row.status, data)])); setExported(true); }} /></div>
      <label className="checkbox-field"><input type="checkbox" checked={withdrawn} onChange={event => { setWithdrawn(event.target.checked); setExported(false); }} /> Épreuves retirées</label>
      {exported && <p role="status">{rows.length} épreuve(s) exportée(s).</p>}
      <ResponsiveTable className="data-table"><thead><tr><th>Épreuve</th><th>Formation</th><th>Groupe</th><th>État des notes</th><th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{String(row.name)}</td><td>{connectedRecordValue('evaluations', 'offering_id', row.offering_id, data)}</td><td>{groupName(row.assignment_id)}</td><td>{connectedRecordValue('evaluations', 'status', row.status, data)}</td><td><IconButton className="btn btn-outline" label="Ouvrir le détail" onClick={() => { setSelectedId(row.id); setCopies(false); }} /></td></tr>)}{!rows.length && <tr><td colSpan={5}>Aucune épreuve pour cette catégorie et ces filtres.</td></tr>}</tbody></ResponsiveTable>
    </section>
    {selected && <WorkPage title={String(selected.name)} onClose={() => setSelectedId('')}><dl className="record-details-grid"><div><dt>Formation</dt><dd>{connectedRecordValue('evaluations', 'offering_id', selected.offering_id, data)}</dd></div><div><dt>Groupe</dt><dd>{groupName(selected.assignment_id)}</dd></div><div><dt>État des notes</dt><dd>{connectedRecordValue('evaluations', 'status', selected.status, data)}</dd></div></dl><h3>Résultats</h3><ResponsiveTable className="data-table"><thead><tr><th>Étudiant</th><th>Note</th><th>Présence</th></tr></thead><tbody>{candidates.map(candidate => { const grade = data.tables.grades?.find(row => row.candidate_id === candidate.id); return <tr key={candidate.id}><td>{connectedRecordName('enrollments', data.tables.enrollments?.find(row => row.id === candidate.enrollment_id) || { id: String(candidate.enrollment_id) }, data)}</td><td>{grade ? connectedRecordValue('grades', 'value', grade.value, data) : 'Non saisie'}</td><td>{grade ? connectedRecordValue('grades', 'absence_status', grade.absence_status, data) : 'Non renseignée'}</td></tr>; })}{!candidates.length && <tr><td colSpan={3}>Aucun candidat rattaché à cette épreuve.</td></tr>}</tbody></ResponsiveTable>{source && <button className="btn btn-outline" onClick={() => setCopies(true)}>Consulter les copies et le sujet</button>}</WorkPage>}
  </div>;
}

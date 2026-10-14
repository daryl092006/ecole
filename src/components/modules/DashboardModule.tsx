import ResponsiveTable from '@/components/ui/ResponsiveTable';
import type { Student } from '@/types';
import { usePortal } from '@/hooks/usePortal';
import { downloadCsv } from '@/utils/csv';
import { fmtMoney } from '@/hooks/useAppState';
interface Props { currentSubTab: string; students: Student[]; }
export default function DashboardModule({ currentSubTab, students }: Props) {
  const state = usePortal(); const data = state.campus.data;
  const [expected, paid] = data.enrollments.reduce(([due, collected], item) => [due + item.financials.expected, collected + item.financials.paid], [0, 0]);
  const decisions = new Map<string, typeof data.juryDecisions[number]>();
  for (const item of data.juryDecisions) decisions.set(`${item.studentId}:${item.semesterId}`, item);
  const admitted = [...decisions.values()].filter(item => item.decision === 'ADMIS').length;
  const groups = data.levels.map(level => ({ label: level.name, count: students.filter(student => student.niveau === level.name && ['Inscrit', 'Réinscrit'].includes(student.status)).length }));
  const headers = ['Année', 'Inscriptions', 'Abandons', 'Contrats nets FCFA', 'Encaissé FCFA', 'Reste FCFA'];
  const reports = data.academicYears.map(year => { const records = data.enrollments.filter(item => item.academicYearId === year.id); const due = records.reduce((sum, item) => sum + item.financials.expected, 0); const collected = records.reduce((sum, item) => sum + item.financials.paid, 0); return [year.label, records.length, records.filter(item => item.status === 'ABANDON').length, due, collected, due - collected]; });
  return <div><div className="module-header"><h1>{currentSubTab === 'dashboard_reports' ? 'Rapports de pilotage' : 'Vue d’ensemble'}</h1></div>
    {currentSubTab === 'dashboard_kpis' ? <>
      <div className="metrics-grid">{[{ label: 'Dossiers étudiants', value: students.length }, { label: 'Taux de recouvrement', value: expected ? `${(100 * paid / expected).toFixed(1)} %` : '—' }, { label: 'Semestres admis', value: decisions.size ? `${admitted}/${decisions.size}` : '—' }, { label: 'Abandons déclarés', value: students.filter(item => item.status === 'Abandonné').length }].map(item => <div className="metric-card" key={item.label}><div><div className="metric-value">{item.value}</div><div className="metric-label">{item.label}</div></div></div>)}</div>
      <div className="content-grid"><div className="card"><h2>Effectifs actifs par niveau</h2>{groups.map(item => <div className="catalog-item" key={item.label}><span>{item.label}</span><strong>{item.count}</strong></div>)}</div><div className="card"><h2>Activité académique</h2>{[{ label: 'Enseignants actifs', value: data.teachers.filter(item => item.active).length }, { label: 'Enseignements affectés', value: data.assignments.filter(item => item.active).length }, { label: 'Séances planifiées', value: data.sessions.filter(item => item.status !== 'Annulé').length }, { label: 'Évaluations publiées', value: data.evaluations.filter(item => item.status === 'PUBLIEES').length }, { label: 'Demandes d’achat en attente', value: data.purchases.filter(item => item.status === 'DEMANDE').length }].map(item => <div className="catalog-item" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></div>
    </> : <>
      <div className="card card-full mb-2"><div className="card-header"><h2>Synthèse par année universitaire</h2><button className="btn btn-outline" disabled={!reports.length} onClick={() => downloadCsv('pilotage-universitaire.csv', headers, reports)}>Exporter le rapport</button></div><div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{reports.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{column >= 3 ? fmtMoney(Number(value)) : value}</td>)}</tr>)}{!reports.length && <tr><td colSpan={6}>Créez une année universitaire pour commencer le reporting.</td></tr>}</tbody></ResponsiveTable></div></div>
      <div className="card card-full"><div className="card-header"><h2>Effectifs par filière</h2><button className="btn btn-outline" disabled={!data.programs.length} onClick={() => downloadCsv('effectifs-filieres.csv', ['Filière', 'Inscrits', 'Abandons', 'Boursiers'], data.programs.map(program => { const records = students.filter(student => student.filiere === program.name); return [program.name, records.length, records.filter(item => item.status === 'Abandonné').length, records.filter(item => item.bourse.active).length]; }))}>Exporter les effectifs</button></div>{data.programs.map(program => <div className="catalog-item" key={program.id}><strong>{program.name}</strong><span>{students.filter(student => student.filiere === program.name).length} dossier(s)</span></div>)}{!data.programs.length && <p className="cell-sub">Aucune filière créée.</p>}</div>
    </>}
  </div>;
}

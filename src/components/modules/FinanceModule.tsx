import { usePortal } from '@/hooks/usePortal';
import { fmtMoney } from '@/hooks/useAppState';
import FinancialSituationPanel from './FinancialSituationPanel';
import FinanceContractsPanel from './FinanceContractsPanel';
import FinancePaymentsPanel from './FinancePaymentsPanel';

export default function FinanceModule() {
  const state = usePortal(); const { data } = state.campus;
  if (state.currentSubTab === 'fin_contracts') return <FinanceContractsPanel />;
  if (state.currentSubTab === 'fin_payments') return <FinancePaymentsPanel />;
  if (state.currentSubTab === 'fin_reports') return <div><div className="module-header"><h1>Rapports financiers</h1></div><FinancialSituationPanel students={state.students} role={state.activeRole} /></div>;
  const expected = data.enrollments.reduce((sum, item) => sum + item.financials.expected, 0);
  const paid = data.enrollments.reduce((sum, item) => sum + item.financials.paid, 0);
  const remaining = data.enrollments.reduce((sum, item) => sum + item.financials.remaining, 0);
  const scholarship = state.students.reduce((sum, item) => sum + item.bourse.amount, 0);
  return <div><div className="module-header"><h1>Situation financière</h1><span className="pill pill-default">Toutes les années</span></div>
    <div className="metrics-grid">{[{ label: 'Contrats nets', value: fmtMoney(expected) }, { label: 'Versements encaissés', value: fmtMoney(paid) }, { label: 'Reste à recouvrer', value: fmtMoney(remaining) }, { label: 'Recouvrement', value: expected ? `${(100 * paid / expected).toFixed(1)} %` : '—' }].map(item => <div className="metric-card" key={item.label}><div><div className="metric-value">{item.value}</div><div className="metric-label">{item.label}</div></div></div>)}</div>
    <div className="card card-full mb-2"><div className="card-header"><h2>Bourses de l’année courante</h2><strong>{fmtMoney(scholarship)}</strong></div><p>{state.students.filter(item => item.bourse.active).length} étudiant(s) bénéficiaire(s).</p></div>
    <div className="card card-full"><h2>Recouvrement par année</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Année universitaire</th><th>Contrats nets</th><th>Encaissé</th><th>Reste</th><th>Taux</th></tr></thead><tbody>{data.academicYears.map(year => { const records = data.enrollments.filter(item => item.academicYearId === year.id); const due = records.reduce((sum, item) => sum + item.financials.expected, 0); const collected = records.reduce((sum, item) => sum + item.financials.paid, 0); return <tr key={year.id}><td>{year.label}</td><td>{fmtMoney(due)}</td><td>{fmtMoney(collected)}</td><td>{fmtMoney(due - collected)}</td><td>{due ? `${(100 * collected / due).toFixed(1)} %` : '—'}</td></tr>; })}{!data.academicYears.length && <tr><td colSpan={5}>Les indicateurs seront disponibles après la création des années et des contrats.</td></tr>}</tbody></table></div></div>
  </div>;
}

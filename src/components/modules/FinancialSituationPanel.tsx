import { useState } from 'react';
import type { RoleName, Student } from '@/types';
import { getFinancialReport, type FinancialSituation } from '@/services/financialReportService';
import { fmtMoney } from '@/hooks/useAppState';
import { downloadCsv } from '@/utils/csv';
const labels: Record<FinancialSituation, string> = { SANS_CONTRAT: 'Sans contrat', SCOLARITE_SOLDEE: 'Scolarité soldée', A_JOUR: 'À jour', EN_RETARD: 'En retard' };
export default function FinancialSituationPanel({ students, role }: { students: Student[]; role: RoleName }) {
  const [situation, setSituation] = useState<FinancialSituation | ''>('');
  const [program, setProgram] = useState('');
  const [level, setLevel] = useState('');
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().slice(0, 10));
  const date = referenceDate || new Date().toISOString().slice(0, 10);
  const allRows = getFinancialReport(students, role, date);
  const rows = allRows.filter(row => (!situation || row.situation === situation) && (!program || row.student.filiere === program) && (!level || row.student.niveau === level));
  const lateCount = allRows.filter(row => row.situation === 'EN_RETARD').length;
  return <div className="card card-full"><h2>Situation financière de scolarité</h2><p>Le retard correspond aux échéances antérieures à la date de classement dont le montant reste impayé. Ces montants concernent la scolarité ; les frais d’inscription ne sont pas inclus. Les paiements pris en compte sont ceux enregistrés actuellement ; changer la date classe les échéances et ne reconstitue pas un solde historique.</p>
    <div className="form-row"><label>Date de classement des échéances<input required className="input" type="date" value={referenceDate} onChange={event => setReferenceDate(event.target.value)} /></label>
      <label>Situation<select className="select-input" value={situation} onChange={event => setSituation(event.target.value as FinancialSituation | '')}><option value="">Toutes les situations</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Filière<select className="select-input" value={program} onChange={event => setProgram(event.target.value)}><option value="">Toutes les filières</option>{[...new Set(students.map(item => item.filiere))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Niveau<select className="select-input" value={level} onChange={event => setLevel(event.target.value)}><option value="">Tous les niveaux</option>{[...new Set(students.map(item => item.niveau))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
    </div><div className="btn-group mt-2"><button className="btn btn-outline" onClick={() => { setSituation('EN_RETARD'); setProgram(''); setLevel(''); }}>Étudiants en retard ({lateCount})</button><button className="btn btn-outline" onClick={() => { setSituation(''); setProgram(''); setLevel(''); }}>Toutes les situations</button><button className="btn btn-primary" disabled={!rows.length} onClick={() => {
      const allowed = getFinancialReport(students, role, date).filter(row => (!situation || row.situation === situation) && (!program || row.student.filiere === program) && (!level || row.student.niveau === level));
      downloadCsv('escen-situation-scolarite.csv', ['Date de classement des échéances', 'Matricule', 'Nom', 'Filière', 'Niveau', 'Attendu FCFA', 'Payé FCFA', 'Restant FCFA', 'Échu impayé FCFA', 'Situation'], allowed.map(row => [date, row.student.matricule, row.student.firstname + ' ' + row.student.lastname, row.student.filiere, row.student.niveau, row.student.financials.expected, row.student.financials.paid, row.student.financials.remaining, row.overdue, labels[row.situation]]));
    }}>Exporter le résultat CSV</button></div>
    <p role="status">{rows.length} résultat(s) filtré(s) sur {allRows.length} dossier(s) autorisé(s).</p>
    <p>Attendu : {fmtMoney(rows.reduce((total, row) => total + row.student.financials.expected, 0))} · Payé : {fmtMoney(rows.reduce((total, row) => total + row.student.financials.paid, 0))} · Restant : {fmtMoney(rows.reduce((total, row) => total + row.student.financials.remaining, 0))}</p>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Étudiant</th><th>Filière / niveau</th><th>Situation</th><th>Reste à payer</th><th>Échu impayé</th></tr></thead><tbody>{rows.map(row => <tr key={row.student.matricule}><td>{row.student.firstname} {row.student.lastname}<div className="cell-sub">{row.student.matricule}</div></td><td>{row.student.filiere} · {row.student.niveau}</td><td>{labels[row.situation]}</td><td>{fmtMoney(row.student.financials.remaining)}</td><td>{fmtMoney(row.overdue)}</td></tr>)}{!rows.length && <tr><td colSpan={5}>{allRows.length ? 'Aucun dossier ne correspond aux filtres.' : 'Aucun dossier étudiant disponible.'}</td></tr>}</tbody></table></div>
  </div>;
}

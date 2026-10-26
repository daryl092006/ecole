'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import { studentPath } from '@/constants/portalRoutes';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import IconButton from '@/components/ui/IconButton';
import { downloadCsv } from '@/utils/csv';

const money = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;

export default function FinanceOverview() {
  const portal = usePortal();
  const [query, setQuery] = useState('');
  const [debtOnly, setDebtOnly] = useState(false);
  const [exported, setExported] = useState(false);
  const enrollments = portal.campus.data.enrollments;
  const situations = [
    ...enrollments.flatMap(enrollment => {
      const student = portal.students.find(item => item.matricule === enrollment.studentId);
      return student ? [{ ...student, rowId: enrollment.id, academicYearId: enrollment.academicYearId, filiere: enrollment.program || student.filiere, niveau: enrollment.level || student.niveau, financials: enrollment.financials }] : [];
    }),
    ...portal.students.filter(student => !enrollments.some(enrollment => enrollment.studentId === student.matricule)).map(student => ({ ...student, rowId: student.matricule })),
  ];
  const yearName = (yearId: string) => portal.academicYearContext?.years.find(year => year.id === yearId)?.name || portal.campus.data.academicYears.find(year => year.id === yearId)?.label || 'Année non renseignée';
  const students = situations.filter(student => `${student.firstname} ${student.lastname} ${student.matricule} ${student.filiere} ${student.niveau} ${yearName(student.academicYearId)}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  const rows = students.filter(student => !debtOnly || student.financials.available !== false && student.financials.remaining > 0);
  const known = rows.filter(student => student.financials.available !== false);
  const missing = rows.length - known.length;
  const totals = [
    { label: 'Montant contractuel', value: known.reduce((sum, student) => sum + student.financials.expected, 0) },
    { label: 'Montant payé', value: known.reduce((sum, student) => sum + student.financials.paid, 0) },
    { label: 'Reste à payer', value: known.reduce((sum, student) => sum + student.financials.remaining, 0) },
  ];
  return <div><div className="page-intro"><div><h1>Situation financière</h1><p>Contrats et règlements de l’année consultée. Les paiements en attente ne comptent pas dans les montants payés.</p></div><Link className="btn btn-outline" href="/finance/versements">Versements et reçus</Link></div>
    <section className="card card-full"><label className="form-group">Rechercher un étudiant ou une formation<input className="input" type="search" value={query} onChange={event => { setQuery(event.target.value); setExported(false); }} /></label>
      <dl className="data-summary">{totals.map(total => <div key={total.label}><dt>{total.label}</dt><dd>{known.length ? money(total.value) : 'Non établi'}</dd></div>)}</dl>
      <p>{known.length} dossier(s) avec une situation financière établie sur {rows.length} résultat(s). Les totaux portent sur ces dossiers.</p>
      {missing > 0 && <p>{missing} dossier(s) sans situation financière établie, exclus des totaux. Vérifiez l’inscription et le contrat dans le dossier.</p>}
      <div className="browser-toolbar"><label className="checkbox-field"><input type="checkbox" checked={debtOnly} onChange={event => { setDebtOnly(event.target.checked); setExported(false); }} /> Dossiers avec un reste à payer uniquement</label><IconButton className="btn btn-outline" label="Exporter les situations financières" disabled={!rows.length} onClick={() => { downloadCsv('situations-financieres.csv', ['Matricule', 'Étudiant', 'Année', 'Formation', 'Montant contractuel FCFA', 'Montant payé FCFA', 'Reste à payer FCFA'], rows.map(student => [student.matricule, `${student.firstname} ${student.lastname}`, yearName(student.academicYearId), `${student.filiere} · ${student.niveau}`, ...(['expected', 'paid', 'remaining'] as const).map(key => student.financials.available !== false ? student.financials[key] : 'Non établi')])); setExported(true); }} /></div>
      {exported && <p role="status">{rows.length} situation(s) exportée(s).</p>}
      <ResponsiveTable className="data-table"><thead><tr><th>Étudiant</th><th>Année</th><th>Formation</th><th>Montant contractuel</th><th>Montant payé</th><th>Reste à payer</th></tr></thead><tbody>{rows.map(student => <tr key={student.rowId}><td>{portal.perms.permissions.includes('student.view') ? <Link href={studentPath(student.matricule)}>{student.firstname} {student.lastname}</Link> : `${student.firstname} ${student.lastname}`}<div className="cell-sub">{student.matricule}</div></td><td>{yearName(student.academicYearId)}</td><td>{student.filiere} · {student.niveau}</td>{(['expected', 'paid', 'remaining'] as const).map(key => <td key={key}>{student.financials.available !== false ? money(student.financials[key]) : 'Non établi'}</td>)}</tr>)}{!rows.length && <tr><td colSpan={6}>Aucun dossier pour ces filtres.</td></tr>}</tbody></ResponsiveTable>
    </section></div>;
}

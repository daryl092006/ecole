'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import { studentPath } from '@/constants/portalRoutes';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import DataPanel from '@/components/ui/DataPanel';
import PageHeader from '@/components/ui/PageHeader';
import { downloadCsv } from '@/utils/csv';
import KpiChart from '@/components/ui/KpiChart';

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
      return student
        ? [
            {
              ...student,
              rowId: enrollment.id,
              academicYearId: enrollment.academicYearId,
              filiere: enrollment.program || student.filiere,
              niveau: enrollment.level || student.niveau,
              financials: enrollment.financials
            }
          ]
        : [];
    }),
    ...portal.students
      .filter(student => !enrollments.some(enrollment => enrollment.studentId === student.matricule))
      .map(student => ({ ...student, rowId: student.matricule }))
  ];

  const yearName = (yearId: string) =>
    portal.academicYearContext?.years.find(year => year.id === yearId)?.name ||
    portal.campus.data.academicYears.find(year => year.id === yearId)?.label ||
    'Année non renseignée';

  const students = situations.filter(student =>
    `${student.firstname} ${student.lastname} ${student.matricule} ${student.filiere} ${student.niveau} ${yearName(student.academicYearId)}`
      .toLocaleLowerCase('fr')
      .includes(query.toLocaleLowerCase('fr'))
  );

  const rows = students.filter(
    student => !debtOnly || (student.financials.available !== false && student.financials.remaining > 0)
  );
  const known = rows.filter(student => student.financials.available !== false);
  const missing = rows.length - known.length;

  const totalContract = known.reduce((sum, student) => sum + student.financials.expected, 0);
  const totalPaid = known.reduce((sum, student) => sum + student.financials.paid, 0);
  const totalRemaining = known.reduce((sum, student) => sum + student.financials.remaining, 0);

  return (
    <div>
      <PageHeader
        eyebrow="FINANCES & COMPTABILITÉ"
        title="Situation financière globale"
        description="Suivi consolidé des contrats d’études et des règlements pour l’année consultée. Les paiements en attente sont exclus des montants payés."
      >
        <Link className="btn btn-outline" href="/finance/versements">
          Versements et reçus →
        </Link>
      </PageHeader>

      {/* Grille de KPI harmonisée */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <span className="kpi-label">Montant contractuel</span>
          <strong className="kpi-value">{known.length ? money(totalContract) : 'Non établi'}</strong>
          <span className="cell-sub">{known.length} contrat(s) audité(s)</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Montant encaissé</span>
          <strong className="kpi-value" style={{ color: 'var(--success)' }}>
            {known.length ? money(totalPaid) : 'Non établi'}
          </strong>
          <span className="cell-sub">Paiements validés</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Reste à recouvrer</span>
          <strong className="kpi-value" style={{ color: totalRemaining > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
            {known.length ? money(totalRemaining) : 'Non établi'}
          </strong>
          <span className="cell-sub">Échéances en cours</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Couverture des dossiers</span>
          <strong className="kpi-value" style={{ color: missing === 0 ? 'var(--success)' : undefined }}>
            {known.length} / {rows.length}
          </strong>
          <span className="cell-sub">{!rows.length ? 'Aucun dossier pour cette sélection' : missing > 0 ? `${missing} dossier(s) sans contrat` : 'Tous les dossiers sont renseignés'}</span>
        </div>
      </div>

      <div className="home-bottom-grid">
        <KpiChart title="Répartition des frais" description="Montants des situations financières correspondant aux filtres ci-dessous. Les paiements en attente sont exclus." kind="donut" format="currency" available={known.length > 0} series={[{ label: 'Frais', values: [{ label: 'Réglé', value: totalPaid }, { label: 'Reste à régler', value: totalRemaining }] }]} />
        <KpiChart title="Couverture des situations financières" description="Situations visibles selon la présence des données contractuelles ; les dossiers sans contrat restent identifiés." kind="donut" series={[{ label: 'Situations', values: [{ label: 'Renseignées', value: known.length }, { label: 'Sans contrat', value: missing }] }]} />
      </div>

      <DataPanel title={`Détail par étudiant (${rows.length})`}
        footer={exported ? `${rows.length} situation(s) exportée(s).` : `${rows.length} situation(s) affichée(s).`}
        toolbar={<><div className="panel-filter-grid"><label className="form-group">Rechercher un étudiant
          <input className="input" type="search" placeholder="Rechercher par étudiant, matricule ou formation…" value={query} onChange={event => { setQuery(event.target.value); setExported(false); }} />
        </label></div><div className="panel-filter-options">
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={debtOnly}
                onChange={event => {
                  setDebtOnly(event.target.checked);
                  setExported(false);
                }}
              />{' '}
              Dossiers avec solde débiteur uniquement
            </label>
            <button type="button"
              className="btn btn-outline"
              disabled={!rows.length}
              onClick={() => {
                downloadCsv(
                  'situations-financieres.csv',
                  ['Matricule', 'Étudiant', 'Année', 'Formation', 'Montant contractuel FCFA', 'Montant payé FCFA', 'Reste à payer FCFA'],
                  rows.map(student => [
                    student.matricule,
                    `${student.firstname} ${student.lastname}`,
                    yearName(student.academicYearId),
                    `${student.filiere} · ${student.niveau}`,
                    ...(['expected', 'paid', 'remaining'] as const).map(key =>
                      student.financials.available !== false ? student.financials[key] : 'Non établi'
                    )
                  ])
                );
                setExported(true);
              }}
            >Exporter CSV</button>
          </div></>}>

        {missing > 0 && (
          <p className="cell-sub">
            {missing} dossier(s) n’ont pas encore de situation financière établie. L’inscription et le contrat doivent être validés dans le dossier étudiant.
          </p>
        )}

        <div className="table-wrap">
          <ResponsiveTable className="data-table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Année</th>
                <th>Formation</th>
                <th>Montant contractuel</th>
                <th>Montant payé</th>
                <th>Reste à payer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(student => (
                <tr key={student.rowId}>
                  <td>
                    {portal.perms.permissions.includes('student.view') ? (
                      <Link href={studentPath(student.matricule)} style={{ fontWeight: 600 }}>
                        {student.firstname} {student.lastname}
                      </Link>
                    ) : (
                      <span style={{ fontWeight: 600 }}>
                        {student.firstname} {student.lastname}
                      </span>
                    )}
                    <div className="cell-sub"><code>{student.matricule}</code></div>
                  </td>
                  <td>{yearName(student.academicYearId)}</td>
                  <td>
                    {student.filiere} · {student.niveau}
                  </td>
                  {(['expected', 'paid', 'remaining'] as const).map(key => (
                    <td key={key}>
                      {student.financials.available !== false ? (
                        <span
                          style={{
                            fontWeight: key === 'remaining' && student.financials.remaining > 0 ? 600 : 'normal',
                            color:
                              key === 'paid'
                                ? 'var(--success)'
                                : key === 'remaining' && student.financials.remaining > 0
                                ? 'var(--warning)'
                                : undefined
                          }}
                        >
                          {money(student.financials[key])}
                        </span>
                      ) : (
                        <span className="cell-sub">Non établi</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6}>Aucun dossier pour ces filtres.</td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </div>
      </DataPanel>
    </div>
  );
}

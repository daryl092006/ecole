'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import { studentPath } from '@/constants/portalRoutes';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import IconButton from '@/components/ui/IconButton';
import PageHeader from '@/components/ui/PageHeader';
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
            {known.length ? money(totalRemaining) : '0 FCFA'}
          </strong>
          <span className="cell-sub">Échéances en cours</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Couverture des dossiers</span>
          <strong className="kpi-value" style={{ color: missing === 0 ? 'var(--success)' : undefined }}>
            {known.length} / {rows.length}
          </strong>
          <span className="cell-sub">{missing > 0 ? `${missing} dossier(s) sans contrat` : '100% contrats établis'}</span>
        </div>
      </div>

      <section className="card card-full">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Détail par étudiant ({rows.length})</h2>
          <div className="browser-toolbar" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
            <label className="checkbox-field" style={{ margin: 0 }}>
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
            <IconButton
              className="btn btn-outline"
              label="Exporter CSV"
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
            />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="form-group" style={{ margin: 0 }}>
            <input
              className="input"
              type="search"
              placeholder="Rechercher par étudiant, matricule ou formation…"
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setExported(false);
              }}
            />
          </label>
        </div>

        {missing > 0 && (
          <p className="cell-sub" style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
            ⚠️ {missing} dossier(s) n’ont pas encore de situation financière établie. L’inscription et le contrat doivent être validés dans le dossier étudiant.
          </p>
        )}

        {exported && <p role="status">{rows.length} situation(s) exportée(s).</p>}

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
      </section>
    </div>
  );
}

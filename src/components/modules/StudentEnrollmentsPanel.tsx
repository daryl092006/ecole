'use client';

import { usePortal } from '@/hooks/usePortal';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { connectedRecordName, connectedRecordValue } from '@/services/connectedRecordDisplayService';

export default function StudentEnrollmentsPanel({ matricule }: { matricule: string }) {
  const { relationalSnapshot: snapshot } = usePortal();
  const student = snapshot.tables.students?.find(row => row.matricule === matricule);
  const enrollments = (snapshot.tables.enrollments || []).filter(row => student && row.student_id === student.id && !row.archived_at);
  return <section className="card card-full">
    <h2>Inscriptions et groupes</h2>
    <div className="table-wrap"><ResponsiveTable className="data-table">
      <thead><tr><th>Année</th><th>Formation</th><th>Groupes et affectations</th><th>Date d’inscription</th><th>Statut</th></tr></thead>
      <tbody>{enrollments.map(enrollment => {
        const offering = snapshot.tables.academic_offerings?.find(row => row.id === enrollment.offering_id);
        const year = snapshot.tables.academic_years?.find(row => row.id === (offering?.academic_year_id || enrollment.academic_year_id));
        const groups = (snapshot.tables.enrollment_groups || []).filter(row => row.enrollment_id === enrollment.id && !row.archived_at);
        return <tr key={enrollment.id}>
          <td>{year ? String(year.name || year.code || 'Non renseignée') : 'Non renseignée'}</td>
          <td>{offering ? connectedRecordName('academic_offerings', offering, snapshot) : 'Formation non renseignée'}</td>
          <td>{groups.length ? groups.map(group => <div key={group.id}>
            <strong>{connectedRecordValue('enrollment_groups', 'group_id', group.group_id, snapshot)}</strong>
            {Boolean(group.valid_from || group.valid_until) && <p className="cell-sub">
              {group.valid_from ? `Depuis le ${connectedRecordValue('enrollment_groups', 'valid_from', group.valid_from, snapshot)}` : 'Début non renseigné'}
              {group.valid_until ? ` · Jusqu’au ${connectedRecordValue('enrollment_groups', 'valid_until', group.valid_until, snapshot)}` : ''}
            </p>}
          </div>) : 'Aucun groupe renseigné'}</td>
          <td>{connectedRecordValue('enrollments', 'enrolled_on', enrollment.enrolled_on, snapshot)}</td>
          <td>{connectedRecordValue('enrollments', 'status', enrollment.status, snapshot)}</td>
        </tr>;
      })}{!enrollments.length && <tr><td colSpan={5}>Aucune inscription dans le périmètre consulté.</td></tr>}</tbody>
    </ResponsiveTable></div>
  </section>;
}

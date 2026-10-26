'use client';

import { usePortal } from '@/hooks/usePortal';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { ATTENDANCE_LABELS, type AttendanceStatus } from '@/types/attendanceManagement';
import { connectedRecordValue } from '@/services/connectedRecordDisplayService';

const justificationLabels: Record<string, string> = { EN_ATTENTE: 'En attente', VALIDE: 'Validé', REFUSE: 'Refusé' };

export default function StudentAttendancePanel({ matricule }: { matricule: string }) {
  const { relationalSnapshot: snapshot } = usePortal();
  const student = snapshot.tables.students?.find(row => row.matricule === matricule);
  const enrollments = new Set((snapshot.tables.enrollments || []).filter(row => student && row.student_id === student.id).map(row => row.id));
  const records = (snapshot.tables.attendances || []).filter(row => enrollments.has(String(row.enrollment_id)) && !row.archived_at);
  const recordIds = new Set(records.map(row => row.id));
  const justifications = (snapshot.tables.absence_justifications || []).filter(row => recordIds.has(String(row.attendance_id)) && !row.archived_at);
  return <section className="card card-full">
    <h2>Présences</h2>
    {!records.length ? <p>Aucun pointage enregistré pour l’année consultée.</p> : <div className="table-wrap"><ResponsiveTable className="data-table">
      <thead><tr><th>Date</th><th>Matière</th><th>Présence</th>{justifications.length > 0 && <th>Justificatif</th>}</tr></thead>
      <tbody>{records.map(record => {
        const session = snapshot.tables.sessions?.find(row => row.id === record.session_id);
        const assignment = snapshot.tables.teaching_assignments?.find(row => row.id === session?.assignment_id);
        const component = snapshot.tables.curriculum_components?.find(row => row.id === (session?.component_id || assignment?.component_id));
        const subject = snapshot.tables.subjects?.find(row => row.id === component?.subject_id);
        const proofs = justifications.filter(row => row.attendance_id === record.id);
        return <tr key={record.id}>
          <td>{connectedRecordValue('sessions', 'starts_at', session?.starts_at, snapshot)}</td>
          <td>{subject ? String(subject.name || subject.code || 'Matière non renseignée') : 'Matière non renseignée'}</td>
          <td>{ATTENDANCE_LABELS[String(record.status) as AttendanceStatus] || connectedRecordValue('attendances', 'status', record.status, snapshot)}</td>
          {justifications.length > 0 && <td>{proofs.length ? proofs.map(proof => <div key={proof.id}>
            <span>{justificationLabels[String(proof.status)] || 'État non renseigné'}</span>
            {Boolean(proof.reason) && <p className="cell-sub">{String(proof.reason)}</p>}
          </div>) : '—'}</td>}
        </tr>;
      })}</tbody>
    </ResponsiveTable></div>}
  </section>;
}

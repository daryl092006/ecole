'use client';

import { usePortal } from '@/hooks/usePortal';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import PageHeader from '@/components/ui/PageHeader';
import { ATTENDANCE_LABELS, type AttendanceStatus } from '@/types/attendanceManagement';
import { connectedRecordValue } from '@/services/connectedRecordDisplayService';
import { ROLES } from '@/types/permissions';

function statusPill(status: string) {
  const code = String(status).toUpperCase();
  if (code === 'PRESENT') return <span className="pill pill-success">Présent</span>;
  if (code === 'RETARD') return <span className="pill pill-warning">En retard</span>;
  if (code === 'ABSENT') return <span className="pill pill-danger">Absent</span>;
  if (code === 'ABSENT_JUSTIFIE') return <span className="pill pill-info">Absence justifiée</span>;
  if (code === 'RETARD_JUSTIFIE') return <span className="pill pill-info">Retard justifié</span>;
  if (code === 'DISPENSE') return <span className="pill pill-default">Dispensé</span>;
  return <span className="pill pill-default">{ATTENDANCE_LABELS[code as AttendanceStatus] || code}</span>;
}

function justificationPill(status: string) {
  const code = String(status).toUpperCase();
  if (code === 'VALIDE') return <span className="pill pill-success">Validé</span>;
  if (code === 'REFUSE') return <span className="pill pill-danger">Refusé</span>;
  return <span className="pill pill-warning">En attente</span>;
}

export default function StudentAttendancePanel({ matricule, embedded = false }: { matricule: string; embedded?: boolean }) {
  const portal = usePortal();
  const snapshot = portal.relationalSnapshot;
  const isSelfStudent = portal.activeRole === ROLES.STUD && portal.session?.matricule === matricule;
  const student = snapshot.tables.students?.find(row => row.matricule === matricule);
  const enrollments = new Set((snapshot.tables.enrollments || []).filter(row => student && row.student_id === student.id).map(row => row.id));
  const records = (snapshot.tables.attendances || []).filter(row => enrollments.has(String(row.enrollment_id)) && !row.archived_at);
  const recordIds = new Set(records.map(row => row.id));
  const justifications = (snapshot.tables.absence_justifications || []).filter(row => recordIds.has(String(row.attendance_id)) && !row.archived_at);

  const presentCount = records.filter(r => String(r.status).toUpperCase() === 'PRESENT').length;
  const lateCount = records.filter(r => ['RETARD', 'RETARD_JUSTIFIE'].includes(String(r.status).toUpperCase())).length;
  const absentCount = records.filter(r => ['ABSENT', 'ABSENT_JUSTIFIE'].includes(String(r.status).toUpperCase())).length;
  const justifiedCount = records.filter(r => ['ABSENT_JUSTIFIE', 'RETARD_JUSTIFIE'].includes(String(r.status).toUpperCase())).length;
  const attendanceRate = records.length > 0 ? Math.round(((presentCount + lateCount) / records.length) * 100) : 100;

  return (
    <section className="card card-full">
      {!embedded && (
        <PageHeader
          eyebrow="SCOLARITÉ & PÉDAGOGIE"
          title={isSelfStudent ? 'Mon assiduité' : 'Assiduité et présences'}
          description={isSelfStudent ? 'Consultez l’historique complet de vos pointages de présence et le suivi de vos absences pour l’année universitaire.' : 'Historique des pointages de présence et suivi de l’assiduité de l’étudiant pour l’année universitaire.'}
        />
      )}

      {records.length > 0 && (
        <div className="btn-group mb-2">
          <span className="pill pill-default">Assiduité : {attendanceRate}% ({records.length} séances)</span>
          <span className="pill pill-success">{presentCount} présence(s)</span>
          {lateCount > 0 && <span className="pill pill-warning">{lateCount} retard(s)</span>}
          {absentCount > 0 && (
            <span className="pill pill-danger">
              {absentCount} absence(s){justifiedCount > 0 ? ` (${justifiedCount} justifiée(s))` : ''}
            </span>
          )}
        </div>
      )}

      {!records.length ? (
        <p className="cell-sub">Aucun pointage de présence enregistré pour le moment pour cette année universitaire.</p>
      ) : (
        <div className="table-wrap">
          <ResponsiveTable className="data-table">
            <thead>
              <tr>
                <th>Date et heure</th>
                <th>Matière</th>
                <th>Statut</th>
                {justifications.length > 0 && <th>Suivi justificatif</th>}
              </tr>
            </thead>
            <tbody>
              {records.map(record => {
                const session = snapshot.tables.sessions?.find(row => row.id === record.session_id);
                const assignment = snapshot.tables.teaching_assignments?.find(row => row.id === session?.assignment_id);
                const component = snapshot.tables.curriculum_components?.find(row => row.id === (session?.component_id || assignment?.component_id));
                const subject = snapshot.tables.subjects?.find(row => row.id === component?.subject_id);
                const proofs = justifications.filter(row => row.attendance_id === record.id);
                return (
                  <tr key={record.id}>
                    <td>
                      <div className="cell-main">{connectedRecordValue('sessions', 'starts_at', session?.starts_at, snapshot)}</div>
                      {Boolean(session?.ends_at) && <div className="cell-sub">Fin : {connectedRecordValue('sessions', 'ends_at', session?.ends_at, snapshot)}</div>}
                    </td>
                    <td>
                      <div className="cell-main">{subject ? String(subject.name || subject.code || 'Matière non renseignée') : 'Matière non renseignée'}</div>
                      {Boolean(subject?.code) ? <div className="cell-sub">Code : {String(subject?.code)}</div> : null}
                    </td>
                    <td>{statusPill(String(record.status))}</td>
                    {justifications.length > 0 && (
                      <td>
                        {proofs.length ? proofs.map(proof => (
                          <div key={proof.id}>
                            {justificationPill(String(proof.status))}
                            {Boolean(proof.reason) && <p className="cell-sub" style={{ marginTop: '4px' }}>{String(proof.reason)}</p>}
                          </div>
                        )) : <span className="cell-sub">—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </ResponsiveTable>
        </div>
      )}
    </section>
  );
}

'use client';

import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import PageHeader from '@/components/ui/PageHeader';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { ATTENDANCE_LABELS, type AttendanceStatus } from '@/types/attendanceManagement';
import { connectedRecordValue } from '@/services/connectedRecordDisplayService';
import { manageAttendance } from '@/services/remoteCampusService';
import { ROLES } from '@/types/permissions';
import type { DatabaseRow } from '@/types/persistence';

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
  const isSelfStudent = (portal.activeRole === ROLES.STUD || portal.activeRole === ROLES.DEL) && portal.session?.matricule === matricule;
  const canJustify = Boolean(portal.academicYearContext?.selectedYearId) && (
    isSelfStudent ||
    portal.perms.permissions.includes('attendance.record') ||
    portal.perms.permissions.includes('attendance.review')
  );
  const [justifyingRecord, setJustifyingRecord] = useState<{ record: DatabaseRow; subjectLabel: string; dateLabel: string } | null>(null);
  const [reason, setReason] = useState('');
  const [fileName, setFileName] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [contentBase64, setContentBase64] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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

  const hasUnjustified = records.some(r => ['ABSENT', 'RETARD'].includes(String(r.status).toUpperCase()));
  const showJustificationColumn = justifications.length > 0 || (canJustify && hasUnjustified);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName('');
      setMimeType('');
      setContentBase64('');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La pièce justificative ne doit pas dépasser 5 Mo.');
      return;
    }
    setError('');
    setFileName(file.name);
    setMimeType(file.type || 'application/octet-stream');
    const reader = new FileReader();
    reader.onload = () => {
      const res = typeof reader.result === 'string' ? reader.result : '';
      const base64 = res.includes(',') ? res.split(',')[1] || '' : res;
      setContentBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="card card-full">
      {!embedded && (
        <PageHeader
          eyebrow="SCOLARITÉ & PÉDAGOGIE"
          title={isSelfStudent ? 'Mon assiduité' : 'Assiduité et présences'}
          description={isSelfStudent ? 'Consultez l’historique complet de vos pointages de présence et déposez vos justificatifs d’absence ou de retard.' : 'Historique des pointages de présence et suivi de l’assiduité de l’étudiant pour l’année universitaire.'}
        />
      )}

      {message && <p role="status" className="info-box mb-2">{message}</p>}

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
                {showJustificationColumn && <th>Suivi justificatif</th>}
              </tr>
            </thead>
            <tbody>
              {records.map(record => {
                const session = snapshot.tables.sessions?.find(row => row.id === record.session_id);
                const assignment = snapshot.tables.teaching_assignments?.find(row => row.id === session?.assignment_id);
                const component = snapshot.tables.curriculum_components?.find(row => row.id === (session?.component_id || assignment?.component_id));
                const subject = snapshot.tables.subjects?.find(row => row.id === component?.subject_id);
                const proofs = justifications.filter(row => row.attendance_id === record.id);
                const code = String(record.status).toUpperCase();
                const canDepositProof = canJustify && ['ABSENT', 'RETARD'].includes(code) && !proofs.some(p => ['EN_ATTENTE', 'VALIDE'].includes(String(p.status).toUpperCase()));
                const subjectLabel = subject ? String(subject.name || subject.code || 'Matière non renseignée') : 'Matière non renseignée';
                const dateLabel = connectedRecordValue('sessions', 'starts_at', session?.starts_at, snapshot);

                return (
                  <tr key={record.id}>
                    <td>
                      <div className="cell-main">{dateLabel}</div>
                      {Boolean(session?.ends_at) && <div className="cell-sub">Fin : {connectedRecordValue('sessions', 'ends_at', session?.ends_at, snapshot)}</div>}
                    </td>
                    <td>
                      <div className="cell-main">{subjectLabel}</div>
                      {Boolean(subject?.code) ? <div className="cell-sub">Code : {String(subject?.code)}</div> : null}
                    </td>
                    <td>{statusPill(String(record.status))}</td>
                    {showJustificationColumn && (
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                          {proofs.map(proof => (
                            <div key={proof.id}>
                              {justificationPill(String(proof.status))}
                              {Boolean(proof.reason) && <p className="cell-sub" style={{ marginTop: '4px', marginBottom: 0 }}>{String(proof.reason)}</p>}
                              {Boolean(proof.review_reason) && <p className="cell-sub" style={{ marginTop: '2px', marginBottom: 0 }}>Décision : {String(proof.review_reason)}</p>}
                            </div>
                          ))}
                          {canDepositProof && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                setJustifyingRecord({ record, subjectLabel, dateLabel });
                                setReason('');
                                setFileName('');
                                setMimeType('');
                                setContentBase64('');
                                setError('');
                                setMessage('');
                              }}
                            >
                              Justifier {code === 'RETARD' ? 'le retard' : 'l’absence'}
                            </button>
                          )}
                          {!proofs.length && !canDepositProof && <span className="cell-sub">—</span>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </ResponsiveTable>
        </div>
      )}

      {justifyingRecord && (
        <WorkPage
          title={`Justifier ${String(justifyingRecord.record.status).toUpperCase() === 'RETARD' ? 'un retard' : 'une absence'}`}
          busy={busy}
          onClose={() => { if (!busy) setJustifyingRecord(null); }}
        >
          <ReviewedForm
            busy={busy}
            error={error}
            confirmLabel="Confirmer l’envoi du justificatif"
            fields={[
              { label: 'Séance', value: `${justifyingRecord.subjectLabel} · ${justifyingRecord.dateLabel}` },
              { label: 'Statut constaté', value: ATTENDANCE_LABELS[String(justifyingRecord.record.status) as AttendanceStatus] || String(justifyingRecord.record.status) },
              { label: 'Motif présenté', value: reason.trim() },
              { label: 'Pièce jointe', value: fileName || 'Déclaration écrite (sans pièce jointe)' },
            ]}
            consequence="Votre justificatif sera transmis à la Direction Académique pour validation. Le statut de présence sera mis à jour dès la décision rendue."
            validate={() => reason.trim().length < 5 ? 'Veuillez préciser le motif de votre absence ou retard (minimum 5 caractères).' : null}
            onConfirm={event => {
              event.preventDefault();
              setBusy(true);
              setError('');
              void manageAttendance(portal.activeRole, {
                action: 'submit_justification',
                revision: snapshot.revision,
                attendanceId: String(justifyingRecord.record.id),
                reason: reason.trim(),
                ...(contentBase64 ? { fileName, mimeType, contentBase64 } : {}),
              })
                .then(() => {
                  setJustifyingRecord(null);
                  setMessage('Justificatif transmis à la Direction Académique. Son état est désormais « En attente ».');
                  portal.refreshCampus();
                })
                .catch(cause => {
                  setError(cause instanceof Error ? cause.message : 'Envoi du justificatif impossible.');
                })
                .finally(() => setBusy(false));
            }}
          >
            <fieldset className="permission-fieldset" disabled={busy}>
              <p className="cell-sub">
                Séance : <strong>{justifyingRecord.subjectLabel}</strong> ({justifyingRecord.dateLabel})
              </p>
              <label className="form-group">
                Motif de l’absence ou du retard
                <textarea
                  className="input"
                  rows={3}
                  required
                  minLength={5}
                  maxLength={1000}
                  placeholder="Expliquez le motif (ex. certificat médical, convocation administrative, problème de transport)…"
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                />
              </label>
              <label className="form-group">
                Pièce justificative (PDF, image JPG/PNG — max 5 Mo, facultatif)
                <input
                  className="input"
                  type="file"
                  accept=".pdf,image/jpeg,image/png"
                  onChange={handleFileChange}
                />
                {fileName && <span className="cell-sub">Fichier sélectionné : {fileName}</span>}
              </label>
              <DrawerActions>
                <button className="btn btn-primary" disabled={busy}>
                  Vérifier les informations
                </button>
              </DrawerActions>
            </fieldset>
          </ReviewedForm>
        </WorkPage>
      )}
    </section>
  );
}

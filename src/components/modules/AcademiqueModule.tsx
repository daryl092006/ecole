import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { getSessionCandidateIds } from '@/services/scheduleService';
import ActionPanel from '@/components/ui/ActionPanel';
import { displayDate } from '@/utils/display';
import FormFeedback from '@/components/ui/FormFeedback';
import { useFeedback } from '@/hooks/useFeedback';
import { useState } from 'react';
import ScheduleResourcesForm from './academic/ScheduleResourcesForm';
import { CheckCircle, Plus } from 'lucide-react';
import type { ClassItem, Evaluation, Reclamation, PermissionSchema, RoleName, Student, Room, Session, BlockedPeriod } from '@/types';
import AcademicReferenceModule from '@/components/modules/academic/AcademicReferenceModule';
import GradeWorkflowPanel from './academic/GradeWorkflowPanel';
import ComplaintsPanel from './academic/ComplaintsPanel';

type AttendanceStatus = NonNullable<Session['attendance']>[string];

interface AcademiqueModuleProps {
  addRoom: (room: Room) => void;
  addBlockedPeriod: (label: string, start: string, end: string) => void;
  blockedPeriods: BlockedPeriod[];
  recordAttendance: (sessionId: string, attendance: NonNullable<Session['attendance']>) => void;
  activeRole: RoleName;
  perms: PermissionSchema;
  currentSubTab: string;
  classes: ClassItem[];
  reclamations: Reclamation[];
  students: Student[];
  rooms: Room[];
  sessions: Session[];
  checkConflictsAndAddSession: (classId: string, roomCode: string, date: string, startTime: string, endTime: string) => { success: boolean; error?: string };
  selectedClassForGrades: ClassItem | null;
  setSelectedClassForGrades: (c: ClassItem | null) => void;
  filteredEvals: Evaluation[];
  newEvalName: string;
  setNewEvalName: (v: string) => void;
  newEvalType: string;
  setNewEvalType: (v: string) => void;
  addEvaluation: () => void;
  submitGrades: (ev: Evaluation) => void;
  changeGradeStatus: (ev: Evaluation, status: Evaluation['status'], comment?: string) => boolean;
  updateGrade: (evaluationId: string, gradeIndex: number, value: number | null) => void;
  transitionReclamation: (id: string, target: Reclamation['status'], comment?: string, correctedGrade?: number) => void;
}

export default function AcademiqueModule({
  addRoom, addBlockedPeriod, blockedPeriods, recordAttendance,
  activeRole,
  perms,
  currentSubTab,
  classes,
  students,
  rooms,
  sessions,
  checkConflictsAndAddSession,
  selectedClassForGrades,
  setSelectedClassForGrades,
  filteredEvals,
  newEvalName,
  setNewEvalName,
  newEvalType,
  setNewEvalType,
  addEvaluation,
  submitGrades,
  changeGradeStatus,
  updateGrade,
}: AcademiqueModuleProps) {

  // Pour la planification de séances
  const [selectedClassForPlan, setSelectedClassForPlan] = useState('');
  const [selectedRoomForPlan, setSelectedRoomForPlan] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [planStart, setPlanStart] = useState('08:30');
  const [planEnd, setPlanEnd] = useState('12:00');
  const [planError, setPlanError] = useState('');
  const [planSuccess, setPlanSuccess] = useState('');

  // Pour la présence
  const [activeSessionForAttendance, setActiveSessionForAttendance] = useState<Session | null>(null);
  const [attendanceFeedback, setAttendanceFeedback, attendanceError] = useFeedback();

  const handlePlanSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPlanError('');
    setPlanSuccess('');
    if (!selectedClassForPlan || !selectedRoomForPlan || !planDate || !planStart || !planEnd) {
      setPlanError('Veuillez remplir tous les champs.');
      return;
    }
    const res = checkConflictsAndAddSession(selectedClassForPlan, selectedRoomForPlan, planDate, planStart, planEnd);
    if (!res.success) {
      setPlanError(res.error || "Erreur de planification.");
    } else {
      setPlanSuccess('Séance planifiée.');
      // Reset form
      setSelectedClassForPlan('');
      setSelectedRoomForPlan('');
      setPlanDate('');
    }
  };

  return (
    <div>
      {currentSubTab === 'acad_reference' && <AcademicReferenceModule
        actorRole={activeRole}
        canManageStructure={perms.permissions.includes('academic.structure.manage')}
        canManageGroups={perms.permissions.includes('academic.group.manage')}
        canManageAssignments={perms.permissions.includes('academic.assignment.manage')}
      />}
      {/* ── SUBTAB: acad_program (Filières & Matières) ── */}
      {currentSubTab === 'acad_program' && (
        <div>
          <div className="module-header">
            <h1>Filières &amp; Matières</h1>
          </div>
          <div className="card">
            <div className="card-header"><h2>Matières actives ({classes.length})</h2></div>
            <div className="table-wrap">
              <ResponsiveTable className="data-table">
                <thead>
                  <tr><th>Code</th><th>Matière</th><th>Enseignant</th><th>Coefficient</th><th>Semestre</th></tr>
                </thead>
                <tbody>
                  {classes.map(cls => (
                    <tr key={cls.id}>
                      <td><code>{cls.code}</code></td>
                      <td>
                        <div className="cell-main">{cls.name}</div>
                        <div className="cell-sub">{cls.level} · {cls.filiere}</div>
                      </td>
                      <td>{cls.teacher}</td>
                      <td><span className="pill pill-info">{cls.coefficient} Coef.</span></td>
                      <td>{cls.semester}</td>
                    </tr>
                  ))}
                  {!classes.length && <tr><td colSpan={5}>Aucun enseignement affecté dans votre périmètre.</td></tr>}
                </tbody>
              </ResponsiveTable>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB: acad_schedule (Emploi du temps & Planification) ── */}
      {currentSubTab === 'acad_schedule' && (
        <div>
          <div className="module-header">
            <h1>Emploi du temps</h1>
          </div>
          {perms.canPlanCourses && <ScheduleResourcesForm rooms={rooms} periods={blockedPeriods} onRoom={addRoom} onPeriod={addBlockedPeriod} />}

          {perms.canPlanCourses && <ActionPanel label="Planifier une séance"><form onSubmit={handlePlanSessionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="session-class">Enseignement</label>
                    <select id="session-class" required className="select-input" value={selectedClassForPlan} onChange={e => setSelectedClassForPlan(e.target.value)}>
                      <option value="">-- Choisir un enseignement --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.level} - {c.teacher})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="session-room">Salle physique</label>
                    <select id="session-room" required className="select-input" value={selectedRoomForPlan} onChange={e => setSelectedRoomForPlan(e.target.value)}>
                      <option value="">-- Choisir une salle --</option>
                      {rooms.map(r => (
                        <option key={r.code} value={r.code}>{r.name} ({r.building} - Cap: {r.capacity})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="session-date">Date</label>
                      <input id="session-date" required type="date" className="input" value={planDate} onChange={e => setPlanDate(e.target.value)} />
                    </div>
                    <div className="form-group session-time-field">
                      <label className="form-label" htmlFor="session-start">Début</label>
                      <input id="session-start" required type="time" className="input" value={planStart} onChange={e => setPlanStart(e.target.value)} />
                    </div>
                    <div className="form-group session-time-field">
                      <label className="form-label" htmlFor="session-end">Fin</label>
                      <input id="session-end" required type="time" className="input" value={planEnd} onChange={e => setPlanEnd(e.target.value)} />
                    </div>
                  </div>

                  {planError && <div className="restricted-box" role="alert" style={{ padding: '0.5rem 1rem' }}>{planError}</div>}
                  {planSuccess && <div role="status" style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>{planSuccess}</div>}

                  <button className="btn btn-primary" type="submit" style={{ marginTop: '0.5rem' }}>
                    <Plus size={14} /> Valider la planification
                  </button>
                </form></ActionPanel>}
        </div>
      )}

      {/* ── SUBTAB: acad_attendance (Feuilles de présence) ── */}
      {currentSubTab === 'acad_attendance' && (
        <div>
          <div className="module-header">
            <h1>Feuilles de présence</h1>
          </div>

          <FormFeedback message={attendanceFeedback} error={attendanceError} />
          {!activeSessionForAttendance ? (
            <div className="card card-full">
              <div className="card-header"><h2>{perms.permissions.includes('attendance.record') ? 'Sélectionner une séance pour faire l’appel' : 'Consulter les présences d’une séance'}</h2></div>
              <div className="table-wrap">
                <ResponsiveTable className="data-table">
                  <thead>
                    <tr><th>Matière</th><th>Salle &amp; Date</th><th>Appel</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {sessions.map(sess => {
                      const cls = classes.find(c => c.id === sess.classId);
                      return (
                        <tr key={sess.id}>
                          <td>
                            <div className="cell-main">{cls?.name}</div>
                            <div className="cell-sub">{cls?.level} · {cls?.teacher}</div>
                          </td>
                          <td>{displayDate(sess.date)} · {sess.startTime} ({sess.roomCode})</td>
                          <td><span className={`pill ${Object.keys(sess.attendance || {}).length ? 'pill-success' : 'pill-default'}`}>{Object.keys(sess.attendance || {}).length ? 'Enregistré' : 'À renseigner'}</span></td>
                          <td>
                            <button className="btn btn-sm btn-primary" onClick={() => { setAttendanceFeedback(''); setActiveSessionForAttendance({ ...sess, attendance: { ...sess.attendance } }); }}>
                              Ouvrir la feuille →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!sessions.length && <tr><td colSpan={4}>Aucune séance disponible. Vérifiez votre identité et les séances qui vous sont affectées.</td></tr>}
                  </tbody>
                </ResponsiveTable>
              </div>
            </div>
          ) : (
            <div className="card card-full">
              <div className="card-header">
                <h2>Feuille d'appel : {classes.find(c => c.id === activeSessionForAttendance.classId)?.name}</h2>
                <button className="btn btn-sm btn-outline" onClick={() => setActiveSessionForAttendance(null)}>← Retour</button>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Séance du <strong>{displayDate(activeSessionForAttendance.date)}</strong> de <strong>{activeSessionForAttendance.startTime}</strong> · <strong>{activeSessionForAttendance.endTime}</strong> (Salle {activeSessionForAttendance.roomCode}).
                </p>

                <div className="table-wrap">
                  <ResponsiveTable className="data-table">
                    <thead>
                      <tr><th>Matricule</th><th>Étudiant</th><th>Statut de présence</th></tr>
                    </thead>
                    <tbody>
                      {students.filter(stud => getSessionCandidateIds(activeSessionForAttendance, students).includes(stud.matricule)).map(stud => {
                        const currentStatus = activeSessionForAttendance.attendance?.[stud.matricule] || 'Présent';
                        return (
                          <tr key={stud.matricule}>
                            <td><code>{stud.matricule}</code></td>
                            <td>{stud.firstname} {stud.lastname}</td>
                            <td>
                              <select
                                aria-label={`Présence de ${stud.firstname} ${stud.lastname}`}
                                className="select-input"
                                style={{ width: 'auto' }}
                                value={currentStatus}
                                disabled={!perms.permissions.includes('attendance.record')}
                                onChange={e => {
                                  const val = e.target.value as AttendanceStatus;
                                  setActiveSessionForAttendance(previous => previous ? { ...previous, attendance: { ...previous.attendance, [stud.matricule]: val } } : null);
                                }}
                              >
                                <option value="Présent">Présent</option>
                                <option value="Absent">Absent</option>
                                <option value="Retard">Retard</option>
                                <option value="Absent justifié">Absent justifié</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </ResponsiveTable>
                </div>

                {perms.permissions.includes('attendance.record') && <button
                  className="btn btn-success mt-2"
                  onClick={() => {
                    try {
                      const attendance = Object.fromEntries(students.filter(student => getSessionCandidateIds(activeSessionForAttendance, students).includes(student.matricule)).map(student => [student.matricule, activeSessionForAttendance.attendance?.[student.matricule] ?? 'Présent'])) as NonNullable<Session['attendance']>;
                      recordAttendance(activeSessionForAttendance.id, attendance);
                      setActiveSessionForAttendance(null);
                      setAttendanceFeedback('Appel enregistré. Les présences sont disponibles pour cette séance.');
                    } catch (error) {
                      setAttendanceFeedback(error instanceof Error ? error.message : 'Enregistrement impossible.', true);
                    }
                  }}
                >
                  <CheckCircle size={14} /> Valider l'appel
                </button>}
              </div>
            </div>
          )}
        </div>
      )}

      {currentSubTab === 'acad_grades' && <div><div className="module-header"><h1>Évaluations et notes</h1></div><GradeWorkflowPanel perms={perms} classes={classes} selectedClass={selectedClassForGrades} onSelectClass={setSelectedClassForGrades} evaluations={filteredEvals} newEvalName={newEvalName} onEvalNameChange={setNewEvalName} newEvalType={newEvalType} onEvalTypeChange={setNewEvalType} onCreate={addEvaluation} onGradeChange={updateGrade} onSubmit={submitGrades} onStatusChange={changeGradeStatus} /></div>}

      {currentSubTab === 'acad_complaints' && <ComplaintsPanel />}
    </div>
  );
}

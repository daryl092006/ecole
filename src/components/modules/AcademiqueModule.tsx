import React, { useState } from 'react';
import ScheduleResourcesForm from './academic/ScheduleResourcesForm';
import { ShieldAlert, FilePlus, CheckCircle, Calendar, Plus } from 'lucide-react';
import type { ClassItem, Evaluation, Reclamation, PermissionSchema, RoleName, Student, Room, Session, BlockedPeriod } from '@/types';
import { ROLES } from '@/types/permissions';
import AcademicReferenceModule from '@/components/modules/academic/AcademicReferenceModule';
import WorkflowStepper from '@/components/ui/WorkflowStepper';

const GRADE_STEPS = [
  { id: 'BROUILLON', label: 'Préparation', owner: 'Enseignant' },
  { id: 'SAISIES', label: 'Notes saisies', owner: 'Enseignant' },
  { id: 'SOUMISES', label: 'Soumission', owner: 'Direction académique' },
  { id: 'A_CONTROLER', label: 'Contrôle', owner: 'Direction académique' },
  { id: 'VALIDEES', label: 'Validation', owner: 'Direction académique' },
  { id: 'PUBLIEES', label: 'Publication', owner: 'Étudiants' },
];

const COMPLAINT_STEPS = [
  { id: 'NOUVELLE', label: 'Réception', owner: 'Direction académique' },
  { id: 'EN_ANALYSE', label: 'Analyse', owner: 'Direction académique' },
  { id: 'TRANSMISE_ENSEIGNANT', label: 'Transmission', owner: 'Enseignant concerné' },
  { id: 'AVIS_ENSEIGNANT', label: 'Avis reçu', owner: 'Direction académique' },
  { id: 'DECISION_ACADEMIQUE', label: 'Décision', owner: 'Direction académique' },
  { id: 'CORRECTION_EVENTUELLE', label: 'Correction', owner: 'Direction académique' },
  { id: 'CLOTUREE', label: 'Clôture', owner: 'Terminé' },
];

const EVALUATION_CREATION_STEPS = [
  { id: 'class', label: "Choisir l'enseignement", owner: 'Enseignant affecté' },
  { id: 'details', label: "Définir l'examen", owner: 'Enseignant affecté' },
  { id: 'create', label: 'Créer le brouillon', owner: 'Enseignant affecté' },
  { id: 'grades', label: 'Saisir les notes', owner: 'Enseignant affecté' },
  { id: 'validation', label: 'Soumettre au contrôle', owner: 'Direction académique' },
];

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
  changeGradeStatus: (ev: Evaluation, status: Evaluation['status'], comment?: string) => void;
  updateGrade: (evaluationId: string, gradeIndex: number, value: number | null) => void;
  transitionReclamation: (id: string, target: Reclamation['status'], comment?: string, correctedGrade?: number) => void;
}

export default function AcademiqueModule({
  addRoom, addBlockedPeriod, blockedPeriods, recordAttendance,
  activeRole,
  perms,
  currentSubTab,
  classes,
  reclamations,
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
  transitionReclamation,
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
      setPlanSuccess('Séance ajoutée avec succès sans aucun conflit de planning !');
      // Reset form
      setSelectedClassForPlan('');
      setSelectedRoomForPlan('');
      setPlanDate('');
    }
  };

  const complaintAction = (rec: Reclamation) => {
    const ask = (label: string, target: Reclamation['status'], promptLabel?: string) => (
      <button className="btn btn-sm btn-primary" onClick={() => {
        const comment = promptLabel ? prompt(promptLabel) : undefined;
        if (!promptLabel || comment) transitionReclamation(rec.id, target, comment ?? undefined);
      }}>{label}</button>
    );
    if (perms.permissions.includes('complaint.review')) {
      if (rec.status === 'NOUVELLE') return ask('Prendre en charge', 'EN_ANALYSE');
      if (rec.status === 'EN_ANALYSE') return ask("Transmettre à l'enseignant", 'TRANSMISE_ENSEIGNANT', 'Instruction pour l’enseignant');
      if (rec.status === 'AVIS_ENSEIGNANT') return ask('Prendre une décision', 'DECISION_ACADEMIQUE', 'Décision académique');
      if (rec.status === 'DECISION_ACADEMIQUE') return <div className="btn-group">
        {ask('Clôturer sans correction', 'CLOTUREE', 'Motif de clôture')}
        {ask('Demander une correction', 'CORRECTION_EVENTUELLE', 'Motif de correction')}
      </div>;
      if (rec.status === 'CORRECTION_EVENTUELLE') return <button className="btn btn-sm btn-success" onClick={() => {
        const value = prompt('Nouvelle note (0 à 20)'); const reason = prompt('Motif de la correction');
        if (value && reason) transitionReclamation(rec.id, 'CLOTUREE', reason, Number(value));
      }}>Appliquer la correction</button>;
    }
    if (activeRole === ROLES.ENS && rec.status === 'TRANSMISE_ENSEIGNANT') return ask('Donner mon avis', 'AVIS_ENSEIGNANT', 'Avis de l’enseignant');
    return <span className="text-muted">En attente du rôle compétent</span>;
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
            <p>Organisation des matières, coefficients et affectations des enseignants d'ESCEN.</p>
          </div>
          <div className="card">
            <div className="card-header"><h2>Matières actives ({classes.length})</h2></div>
            <div className="table-wrap">
              <table className="data-table">
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB: acad_schedule (Emploi du temps & Planification) ── */}
      {currentSubTab === 'acad_schedule' && (
        <div>
          {perms.canPlanCourses && <ScheduleResourcesForm rooms={rooms} periods={blockedPeriods} onRoom={addRoom} onPeriod={addBlockedPeriod} />}
          <div className="module-header">
            <h1>Emploi du temps</h1>
            <p>Planification des séances de cours et examens avec détection automatique des conflits.</p>
          </div>

          <div className="content-grid">
            {/* Formulaire de planification */}
            <div className="card">
              <div className="card-header"><h2>Planifier une nouvelle séance</h2></div>
              {perms.canPlanCourses ? (
                <form onSubmit={handlePlanSessionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Matière / Classe</label>
                    <select className="select-input" value={selectedClassForPlan} onChange={e => setSelectedClassForPlan(e.target.value)}>
                      <option value="">-- Choisir un enseignement --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.level} - {c.teacher})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Salle physique</label>
                    <select className="select-input" value={selectedRoomForPlan} onChange={e => setSelectedRoomForPlan(e.target.value)}>
                      <option value="">-- Choisir une salle --</option>
                      {rooms.map(r => (
                        <option key={r.code} value={r.code}>{r.name} ({r.building} - Cap: {r.capacity})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Date</label>
                      <input type="date" className="input" value={planDate} onChange={e => setPlanDate(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ width: 100 }}>
                      <label className="form-label">Début</label>
                      <input type="text" className="input" placeholder="08:30" value={planStart} onChange={e => setPlanStart(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ width: 100 }}>
                      <label className="form-label">Fin</label>
                      <input type="text" className="input" placeholder="12:00" value={planEnd} onChange={e => setPlanEnd(e.target.value)} />
                    </div>
                  </div>

                  {planError && <div className="restricted-box" style={{ padding: '0.5rem 1rem' }}>{planError}</div>}
                  {planSuccess && <div style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>{planSuccess}</div>}

                  <button className="btn btn-primary" type="submit" style={{ marginTop: '0.5rem' }}>
                    <Plus size={14} /> Valider la planification
                  </button>
                </form>
              ) : <div className="text-muted">Consultation du planning.</div>}
            </div>

            {/* Liste des séances planifiées */}
            <div className="card">
              <div className="card-header"><h2>Séances planifiées ({sessions.length})</h2></div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Matière / Salle</th><th>Date &amp; Horaire</th><th>Statut</th></tr>
                  </thead>
                  <tbody>
                    {sessions.map(sess => {
                      const cls = classes.find(c => c.id === sess.classId);
                      return (
                        <tr key={sess.id}>
                          <td>
                            <div className="cell-main">{cls?.name}</div>
                            <div className="cell-sub">{sess.roomCode} · {cls?.level}</div>
                          </td>
                          <td style={{ fontSize: '0.83rem' }}>
                            <Calendar size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                            {sess.date} ({sess.startTime} - {sess.endTime})
                          </td>
                          <td>
                            <span className="pill pill-success">{sess.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB: acad_attendance (Feuilles de présence) ── */}
      {currentSubTab === 'acad_attendance' && (
        <div>
          <div className="module-header">
            <h1>Feuilles de présence</h1>
            <p>Gestion des présences par séance de cours programmée.</p>
          </div>

          {!activeSessionForAttendance ? (
            <div className="card card-full">
              <div className="card-header"><h2>Sélectionner une séance pour faire l'appel</h2></div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Matière</th><th>Salle &amp; Date</th><th>Action</th></tr>
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
                          <td>{sess.date} · {sess.startTime} ({sess.roomCode})</td>
                          <td>
                            <button className="btn btn-sm btn-primary" onClick={() => setActiveSessionForAttendance({ ...sess, attendance: { ...sess.attendance } })}>
                              Ouvrir la feuille →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                  Séance du <strong>{activeSessionForAttendance.date}</strong> de <strong>{activeSessionForAttendance.startTime}</strong> · <strong>{activeSessionForAttendance.endTime}</strong> (Salle {activeSessionForAttendance.roomCode}).
                </p>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr><th>Matricule</th><th>Étudiant</th><th>Statut de présence</th></tr>
                    </thead>
                    <tbody>
                      {students.filter(stud => stud.groupId === activeSessionForAttendance.groupId).map(stud => {
                        const currentStatus = activeSessionForAttendance.attendance?.[stud.matricule] || 'Présent';
                        return (
                          <tr key={stud.matricule}>
                            <td><code>{stud.matricule}</code></td>
                            <td>{stud.firstname} {stud.lastname}</td>
                            <td>
                              <select
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
                  </table>
                </div>

                {perms.permissions.includes('attendance.record') && <button
                  className="btn btn-success mt-2"
                  onClick={() => {
                    const attendance = Object.fromEntries(students.filter(student => student.groupId === activeSessionForAttendance.groupId).map(student => [student.matricule, activeSessionForAttendance.attendance?.[student.matricule] ?? 'Présent'])) as NonNullable<Session['attendance']>;
                    recordAttendance(activeSessionForAttendance.id, attendance);
                    setActiveSessionForAttendance(null);
                  }}
                >
                  <CheckCircle size={14} /> Valider l'appel
                </button>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUBTAB: acad_grades (Évaluations & Notes) ── */}
      {currentSubTab === 'acad_grades' && (
        <div>
          <div className="module-header">
            <h1>Évaluations &amp; Saisie de notes</h1>
            <p>Saisie sécurisée des notes par l'enseignant, soumission, validation et publication.</p>
          </div>

          <WorkflowStepper
            steps={EVALUATION_CREATION_STEPS}
            currentStep={!selectedClassForGrades ? 'class' : !newEvalName ? 'details' : 'create'}
            title="Parcours : création d'un examen et publication des notes"
          />

          {!selectedClassForGrades ? (
            <div className="card card-full">
              <div className="card-header"><h2>Sélectionner un enseignement</h2></div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Matière</th><th>Classe / Niveau</th><th>Enseignant</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {classes.map(cls => (
                      <tr key={cls.id}>
                        <td><div className="cell-main">{cls.name}</div></td>
                        <td>{cls.level}</td>
                        <td>{cls.teacher}</td>
                        <td>
                          <button className="btn btn-sm" onClick={() => setSelectedClassForGrades(cls)}>Saisir / Valider →</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card card-full">
              <div className="card-header">
                <h2>Notes : {selectedClassForGrades.name}</h2>
                <button className="btn btn-sm btn-outline" onClick={() => setSelectedClassForGrades(null)}>← Retour</button>
              </div>

              {perms.permissions.includes('grade.view') ? (
                <>
                  {perms.permissions.includes('evaluation.create') && (
                  <div className="form-row mt-2">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Nom de l&apos;évaluation</label>
                      <input
                        className="input"
                        placeholder="ex: Devoir Sur Table n°2"
                        value={newEvalName}
                        onChange={e => setNewEvalName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Type</label>
                      <select
                        className="select-input"
                        value={newEvalType}
                        onChange={e => setNewEvalType(e.target.value)}
                        style={{ width: 'auto' }}
                      >
                        <option>Devoir</option>
                        <option>Examen</option>
                        <option>Projet</option>
                        <option>TP</option>
                      </select>
                    </div>
                    <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={addEvaluation}>
                      <FilePlus size={14} /> Créer évaluation
                    </button>
                  </div>
                  )}

                  {filteredEvals.length === 0 && <p className="text-muted mt-2">Aucune évaluation enregistrée pour cette matière.</p>}

                  {filteredEvals.map(ev => (
                    <div key={ev.id} style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <strong>{ev.name}</strong>
                          <span className="pill pill-default" style={{ marginLeft: '0.5rem' }}>{ev.type}</span>
                        </div>
                        <span className={`pill ${ev.status === 'PUBLIEES' ? 'pill-success' : ['SOUMISES', 'A_CONTROLER', 'VALIDEES'].includes(ev.status) ? 'pill-warning' : 'pill-default'}`}>
                          {ev.status}
                        </span>
                      </div>

                      <WorkflowStepper steps={GRADE_STEPS} currentStep={ev.status} title="Circuit de validation des notes" />

                      {ev.grades.map((g, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid var(--border)' }}>
                          <code>{g.matricule}</code>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            step={0.5}
                            value={g.value ?? ''}
                            disabled={!perms.permissions.includes('grade.enter') || !['BROUILLON', 'SAISIES'].includes(ev.status)}
                            onChange={e => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              if (val !== null && (!Number.isFinite(val) || val < 0 || val > 20)) return;
                              updateGrade(ev.id, i, val);
                            }}
                            style={{
                              background: 'var(--bg-card)', border: '1px solid var(--border)',
                              color: 'var(--text-primary)', padding: '0.3rem',
                              width: 70, borderRadius: 6, textAlign: 'center',
                            }}
                          />
                        </div>
                      ))}

                      <div className="btn-group mt-2">
                        {perms.permissions.includes('grade.submit') && ['BROUILLON', 'SAISIES'].includes(ev.status) && (
                          <button className="btn btn-sm btn-primary" onClick={() => submitGrades(ev)}>
                            Soumettre à la direction
                          </button>
                        )}
                        {ev.status === 'SOUMISES' && perms.canValidateGrades && (
                          <button className="btn btn-sm btn-primary" onClick={() => changeGradeStatus(ev, 'A_CONTROLER')}>
                            Prendre en contrôle
                          </button>
                        )}
                        {ev.status === 'SOUMISES' && !perms.canValidateGrades && (
                          <span className="text-muted" style={{ alignSelf: 'center' }}>
                            Soumis. En attente de validation par le Directeur Académique.
                          </span>
                        )}
                        {ev.status === 'PUBLIEES' && (
                          <span className="text-muted" style={{ alignSelf: 'center' }}>
                            Notes publiées. Modification restreinte et tracée dans le journal d'audit.
                          </span>
                        )}
                        {ev.status === 'A_CONTROLER' && perms.permissions.includes('grade.approve') && (
                          <button className="btn btn-sm btn-success" onClick={() => changeGradeStatus(ev, 'VALIDEES')}>Valider</button>
                        )}
                        {ev.status === 'VALIDEES' && perms.permissions.includes('grade.publish') && (
                          <button className="btn btn-sm btn-success" onClick={() => changeGradeStatus(ev, 'PUBLIEES')}>Publier</button>
                        )}
                        {['SOUMISES', 'A_CONTROLER'].includes(ev.status) && perms.permissions.includes('grade.review') && (
                          <button className="btn btn-sm btn-outline" onClick={() => {
                            const motif = prompt('Motif du retour à l’enseignant');
                            if (motif) changeGradeStatus(ev, 'SAISIES', motif);
                          }}>Retourner à l&apos;enseignant</button>
                        )}
                      </div>
                      {ev.corrections?.map((entry, index) => <p key={index}>{entry.studentId} : {entry.oldValue} → {entry.newValue}/20 · {entry.actor} · {entry.date} · {entry.reason}</p>)}
                      {ev.history.length > 0 && (
                        <details className="mt-2"><summary>Historique ({ev.history.length})</summary>
                          {ev.history.map(entry => <div key={entry.id} className="text-muted" style={{ fontSize: '0.78rem', paddingTop: 4 }}>{new Date(entry.date).toLocaleString('fr-FR')} · {entry.role} · {entry.from} → {entry.to}{entry.comment ? ` · ${entry.comment}` : ''}</div>)}
                        </details>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="restricted-box mt-2">
                  <ShieldAlert size={18} /> Seul l'Enseignant affecté à la matière ou le Directeur Académique peut modifier ces notes.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SUBTAB: acad_complaints (Réclamations) ── */}
      {currentSubTab === 'acad_complaints' && (
        <div>
          <div className="module-header">
            <h1>Suivi des réclamations</h1>
            <p>Traitement des demandes de correction de notes introduites par les étudiants.</p>
          </div>

          <div className="card">
            <div className="card-header"><h2>Liste des réclamations académiques</h2></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Étudiant</th><th>Motif</th><th>Statut</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {reclamations.map(rec => (
                    <React.Fragment key={rec.id}>
                    <tr>
                      <td><code>{rec.studentMatricule}</code></td>
                      <td style={{ fontSize: '0.85rem' }}>{rec.reason}</td>
                      <td>
                        <span className={`pill ${rec.status === 'CLOTUREE' ? 'pill-success' : 'pill-warning'}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td>
                        {rec.status !== 'CLOTUREE' ? complaintAction(rec) : <span className="text-muted">Clôturée</span>}
                      </td>
                    </tr>
                    <tr><td colSpan={4}><WorkflowStepper steps={COMPLAINT_STEPS} currentStep={rec.status} title="Traitement de la réclamation" /></td></tr>
                    {rec.history.length > 0 && <tr><td colSpan={4}><details><summary>Historique ({rec.history.length})</summary>{rec.history.map(entry => <div key={entry.id} className="text-muted" style={{ fontSize: '0.78rem' }}>{new Date(entry.date).toLocaleString('fr-FR')} · {entry.role} · {entry.from} → {entry.to}{entry.comment ? ` · ${entry.comment}` : ''}</div>)}</details>{rec.correction && <div className="text-muted">Correction : {rec.correction.previousGrade} → {rec.correction.newGrade} · {rec.correction.reason}</div>}</td></tr>}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

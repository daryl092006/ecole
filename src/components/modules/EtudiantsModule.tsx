import { useState } from 'react';
import StudentFiltersPanel from './StudentFiltersPanel';
import { EMPTY_STUDENT_FILTERS, filterRegisteredStudents } from '@/services/studentQueryService';
import StudentRegistrationForm from './StudentRegistrationForm';
import type { StudentInput } from '@/services/studentService';
import type { Group, PermissionSchema, Student, RoleName } from '@/types';
import { fmtMoney } from '@/hooks/useAppState';
import WorkflowStepper from '@/components/ui/WorkflowStepper';

interface EtudiantsModuleProps {
  activeRole: RoleName;
  createStudent: (input: StudentInput) => void;
  perms: PermissionSchema;
  currentSubTab: string;
  students: Student[];
  groups: Group[];
  selectedStudent: Student | null;
  setSelectedStudent: (s: Student | null) => void;
  assignStudentToGroup: (studentId: string, groupId: string) => { success: boolean; error?: string };
}

const GROUP_STEPS = [
  { id: 'student', label: "Choisir l'étudiant", owner: 'Logisticien académique' },
  { id: 'group', label: 'Choisir le groupe', owner: 'Logisticien académique' },
  { id: 'confirm', label: 'Vérifier et confirmer', owner: 'Logisticien académique' },
];

export default function EtudiantsModule({ activeRole, createStudent, perms, currentSubTab, students, groups, selectedStudent, setSelectedStudent, assignStudentToGroup }: EtudiantsModuleProps) {
  const [filters, setFilters] = useState(EMPTY_STUDENT_FILTERS);
  const filteredStudents = filterRegisteredStudents(students, filters, activeRole);
  const [studentToAssign, setStudentToAssign] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const assignmentStep = !studentToAssign ? 'student' : !targetGroup ? 'group' : 'confirm';

  const confirmAssignment = () => {
    const result = assignStudentToGroup(studentToAssign, targetGroup);
    setAssignmentMessage(result.success ? 'Affectation enregistrée et journalisée.' : result.error ?? 'Affectation impossible.');
    if (result.success) { setStudentToAssign(''); setTargetGroup(''); }
  };
  return (
    <div>
      {/* ── SUBTAB: stud_list (Liste des Étudiants & Dossiers) ── */}
      {currentSubTab === 'stud_list' && (
        <div>
          <div className="module-header">
            <h1>Liste des étudiants inscrits</h1>
            <p>Dossier unique, informations civiles et parcours académique d'ESCEN.</p>
          </div>

          {perms.permissions.includes('student.group.assign') && <StudentRegistrationForm groups={groups} onCreate={createStudent} />}
          <div className="card card-full mb-2">
            <div className="card-header"><h2>Affecter un étudiant à un groupe</h2><span className="pill pill-info">Workflow guidé</span></div>
            <WorkflowStepper steps={GROUP_STEPS} currentStep={assignmentStep} title="Parcours d'affectation" />
            {perms.permissions.includes('student.group.assign') ? <div className="guided-form">
              <div className="guided-field"><span className="guided-number">1</span><div className="form-group"><label className="form-label">Étudiant inscrit</label><select className="select-input" value={studentToAssign} onChange={event => { setStudentToAssign(event.target.value); setTargetGroup(''); setAssignmentMessage(''); }}><option value="">Sélectionner un étudiant</option>{students.map(student => <option key={student.matricule} value={student.matricule}>{student.firstname} {student.lastname} · {student.groupe}</option>)}</select></div></div>
              <div className="guided-field"><span className="guided-number">2</span><div className="form-group"><label className="form-label">Groupe compatible</label><select className="select-input" disabled={!studentToAssign} value={targetGroup} onChange={event => { setTargetGroup(event.target.value); setAssignmentMessage(''); }}><option value="">Sélectionner un groupe</option>{groups.filter(group => { const student = students.find(item => item.matricule === studentToAssign); return student && group.academicYearId === student.academicYearId && group.niveau === student.niveau && group.filieres.includes(student.filiere); }).map(group => <option key={group.id} value={group.id}>{group.name} · {group.niveau} · {group.filieres.join(', ')}</option>)}</select></div></div>
              <div className="guided-field"><span className="guided-number">3</span><div><div className="form-label">Confirmation</div><button className="btn btn-primary" disabled={!studentToAssign || !targetGroup} onClick={confirmAssignment}>Confirmer l'affectation</button></div></div>
            </div> : <div className="info-box">Consultation uniquement. L'affectation d'un étudiant à un groupe est réservée au Logisticien académique.</div>}
            {assignmentMessage && <div className="info-box mt-2">{assignmentMessage}</div>}
          </div>

          <StudentFiltersPanel students={students} filters={filters} onChange={setFilters} role={activeRole} />
          <div className="card card-full">
            <div className="card-header">
              <h2>Dossiers filtrés ({filteredStudents.length} / {students.length})</h2>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Matricule</th>
                    <th>Nom complet</th>
                    <th>Filière / Niveau</th>
                    <th>Situation financière</th>
                    <th>Bourse</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => (
                    <tr key={s.matricule}>
                      <td><code>{s.matricule}</code></td>
                      <td>
                        <div className="cell-main">{s.firstname} {s.lastname}</div>
                        <div className="cell-sub">{s.email}</div>
                      </td>
                      <td>
                        <div className="cell-main">{s.niveau}</div>
                        <div className="cell-sub">{s.groupe}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--success)' }}>Payé: {fmtMoney(s.financials.paid)}</span><br />
                          <span style={{ color: 'var(--warning)' }}>Reste: {fmtMoney(s.financials.remaining)}</span>
                        </div>
                      </td>
                      <td>
                        {s.bourse.active
                          ? <span className="pill pill-purple">{s.bourse.percent}% – {s.bourse.type}</span>
                          : <span className="text-muted">Aucune</span>}
                      </td>
                      <td><span className="pill pill-success">{s.status}</span></td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => setSelectedStudent(s)}>
                          Fiche &amp; Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && <tr><td colSpan={7}>{students.length ? 'Aucun étudiant ne correspond aux filtres.' : 'Aucun dossier étudiant créé.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB: stud_cards (Cartes d'Étudiant) ── */}
      {currentSubTab === 'stud_cards' && (
        <div>
          <div className="module-header">
            <h1>Génération de Cartes d&apos;Étudiant</h1>
            <p>Visualisation et impression des cartes d'étudiant pour l'année en cours.</p>
          </div>

          <div className="content-grid">
            {students.map(s => (
              <div key={s.matricule} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="id-card" style={{ marginTop: 0 }}>
                  <div className="id-card-top">
                    <span>CARTE D&apos;ÉTUDIANT – ESCEN</span>
                    <span>2026 – 2027</span>
                  </div>
                  <div className="id-card-body">
                    <div className="id-photo">PHOTO</div>
                    <div className="id-info">
                      <h4>{s.firstname} {s.lastname}</h4>
                      <p>Matricule : {s.matricule}</p>
                      <p>{s.niveau} – {s.filiere}</p>
                      <p>{s.groupe}</p>
                    </div>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => alert(`Impression de la carte pour ${s.firstname} lancée.`)}>
                  Imprimer la carte
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUBTAB: stud_status (Réinscriptions & Abandons) ── */}
      {currentSubTab === 'stud_status' && (
        <div>
          <div className="module-header">
            <h1>Réinscriptions &amp; Abandons</h1>
            <p>Cycle de vie académique de l'étudiant d'une année sur l'autre.</p>
          </div>

          <div className="card card-full">
            <div className="card-header"><h2>Suivi du statut de réinscription académique</h2></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Matricule</th><th>Étudiant</th><th>Années validées</th><th>Niveau actuel</th><th>Actions de cycle</th></tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.matricule}>
                      <td><code>{s.matricule}</code></td>
                      <td><strong>{s.firstname} {s.lastname}</strong></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <span>2024-2025: Licence 1 IAGL (Validé)</span>
                          <span>2025-2026: Licence 2 IAGL (En cours)</span>
                        </div>
                      </td>
                      <td><span className="pill pill-info">{s.niveau}</span></td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-sm btn-outline" onClick={() => alert('Réinscription générée pour la nouvelle année.')}>Réinscrire</button>
                          <button className="btn btn-sm btn-danger" onClick={() => alert('Étudiant marqué comme Abandonné (conservation de l\'historique).')}>Déclarer Abandon</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Student detail modal */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Fiche Individuelle : {selectedStudent.firstname} {selectedStudent.lastname}</h3>
            <p className="modal-sub">Matricule : {selectedStudent.matricule}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {[
                ['Date de naissance', selectedStudent.birthDate],
                ['Nationalité', selectedStudent.nationality],
                ['Filière', selectedStudent.filiere],
                ['Niveau', selectedStudent.niveau],
                ['Groupe', selectedStudent.groupe],
                ['Bourse', selectedStudent.bourse.active
                  ? `${selectedStudent.bourse.type} (${selectedStudent.bourse.percent}%)`
                  : 'Aucune'],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                  <div className="text-muted" style={{ marginBottom: 2 }}>{k}</div>
                  <div style={{ fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedStudent(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

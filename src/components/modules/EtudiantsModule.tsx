'use client';

import EnrollmentDialog from './EnrollmentDialog';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import ActionPanel from '@/components/ui/ActionPanel';
import StudentRecordDialog from './StudentRecordDialog';
import PageHeader from '@/components/ui/PageHeader';

import { useState } from 'react';
import StudentCrudActions from './StudentCrudActions';

import StudentFiltersPanel from './StudentFiltersPanel';
import { EMPTY_STUDENT_FILTERS, filterRegisteredStudents } from '@/services/studentQueryService';
import StudentRegistrationForm from './StudentRegistrationForm';
import type { StudentInput } from '@/services/studentService';
import type { Group, PermissionSchema, Student, RoleName } from '@/types';
import { fmtMoney } from '@/hooks/useAppState';

interface EtudiantsModuleProps {
  persistent?: boolean;
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

export default function EtudiantsModule({
  persistent = false,
  activeRole,
  createStudent,
  perms,
  currentSubTab,
  students,
  groups,
  selectedStudent,
  setSelectedStudent,
  assignStudentToGroup
}: EtudiantsModuleProps) {
  const [newEnrollment, setNewEnrollment] = useState(false);
  const [filters, setFilters] = useState(EMPTY_STUDENT_FILTERS);
  const filteredStudents = filterRegisteredStudents(students, filters, activeRole);
  const [studentToAssign, setStudentToAssign] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const canViewFinance = perms.permissions.includes('finance.view');

  const confirmAssignment = () => {
    const result = assignStudentToGroup(studentToAssign, targetGroup);
    setAssignmentMessage(result.success ? 'Affectation enregistrée et journalisée.' : result.error ?? 'Affectation impossible.');
    if (result.success) {
      setStudentToAssign('');
      setTargetGroup('');
    }
  };

  const totalCount = students.length;
  const activeCount = students.filter(s => ['Inscrit', 'Réinscrit', 'INSCRIT', 'REINSCRIT'].includes(s.status)).length;
  const scholarshipCount = students.filter(s => s.bourse?.active).length;
  const settledCount = students.filter(s => s.financials?.available !== false && s.financials?.remaining === 0).length;

  return (
    <div>
      {newEnrollment && <EnrollmentDialog kind="new" onClose={() => setNewEnrollment(false)} />}

      {/* ── SUBTAB: stud_list (Liste des Étudiants & Dossiers) ── */}
      {currentSubTab === 'stud_list' && (
        <div>
          <PageHeader
            eyebrow="SCOLARITÉ & ADMISSIONS"
            title="Dossiers étudiants"
            description="Consultez, filtrez et gérez les dossiers administratifs, académiques et financiers des étudiants."
          >
            {persistent && (
              <>
                <StudentCrudActions />
                {perms.permissions.includes('student.lifecycle.manage') && perms.permissions.includes('payment.record') && (
                  <button className="btn btn-primary" onClick={() => setNewEnrollment(true)}>
                    Nouvelle inscription
                  </button>
                )}
              </>
            )}
          </PageHeader>

          {/* Grille de KPI standardisée */}
          <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="kpi-card">
              <span className="kpi-label">Effectif total</span>
              <strong className="kpi-value">{totalCount}</strong>
              <span className="cell-sub">Dossiers répertoriés</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Inscriptions actives</span>
              <strong className="kpi-value" style={{ color: 'var(--success)' }}>
                {activeCount}
              </strong>
              <span className="cell-sub">En scolarité régulière</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Bourses attribuées</span>
              <strong className="kpi-value" style={{ color: 'var(--purple, #7c3aed)' }}>
                {scholarshipCount}
              </strong>
              <span className="cell-sub">Dossiers bénéficiaires</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">{canViewFinance ? 'Soldes à jour' : 'Filtres actifs'}</span>
              <strong className="kpi-value" style={{ color: canViewFinance ? 'var(--accent)' : undefined }}>
                {canViewFinance ? settledCount : filteredStudents.length}
              </strong>
              <span className="cell-sub">{canViewFinance ? 'Reste à payer soldé' : 'Dossiers affichés'}</span>
            </div>
          </div>

          {!persistent && perms.permissions.includes('student.group.assign') && (
            <StudentRegistrationForm groups={groups} onCreate={createStudent} />
          )}

          {!persistent && perms.permissions.includes('student.group.assign') && (
            <ActionPanel label="Affecter un étudiant à un groupe">
              {perms.permissions.includes('student.group.assign') ? (
                <div className="guided-form">
                  <div className="guided-field">
                    <div className="form-group">
                      <label className="form-label" htmlFor="assignment-student">
                        Étudiant inscrit
                      </label>
                      <select
                        id="assignment-student"
                        className="select-input"
                        value={studentToAssign}
                        onChange={event => {
                          setStudentToAssign(event.target.value);
                          setTargetGroup('');
                          setAssignmentMessage('');
                        }}
                      >
                        <option value="">Sélectionner un étudiant</option>
                        {students.map(student => (
                          <option key={student.matricule} value={student.matricule}>
                            {student.firstname} {student.lastname} · {student.groupe}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="guided-field">
                    <div className="form-group">
                      <label className="form-label" htmlFor="assignment-group">
                        Groupe compatible
                      </label>
                      <select
                        id="assignment-group"
                        className="select-input"
                        disabled={!studentToAssign}
                        value={targetGroup}
                        onChange={event => {
                          setTargetGroup(event.target.value);
                          setAssignmentMessage('');
                        }}
                      >
                        <option value="">Sélectionner un groupe</option>
                        {groups
                          .filter(group => {
                            const student = students.find(item => item.matricule === studentToAssign);
                            return (
                              student &&
                              group.academicYearId === student.academicYearId &&
                              group.niveau === student.niveau &&
                              group.filieres.includes(student.filiere)
                            );
                          })
                          .map(group => (
                            <option key={group.id} value={group.id}>
                              {group.name} · {group.niveau} · {group.filieres.join(', ')}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="guided-field">
                    <div>
                      <div className="form-label">Confirmation</div>
                      <button className="btn btn-primary" disabled={!studentToAssign || !targetGroup} onClick={confirmAssignment}>
                        Confirmer l'affectation
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="info-box">
                  Consultation uniquement. L'affectation d'un étudiant à un groupe est réservée au Logisticien académique.
                </div>
              )}
              {assignmentMessage && (
                <div className="info-box mt-2" role="status">
                  {assignmentMessage}
                </div>
              )}
            </ActionPanel>
          )}

          <StudentFiltersPanel students={students} filters={filters} onChange={setFilters} role={activeRole} />

          <div className="card card-full">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>
                Dossiers filtrés ({filteredStudents.length} / {students.length})
              </h2>
            </div>
            <div className="table-wrap">
              <ResponsiveTable className="data-table">
                <thead>
                  <tr>
                    <th>Matricule</th>
                    <th>Nom complet</th>
                    <th>Nationalité</th>
                    <th>Filière / Niveau</th>
                    {canViewFinance && <th>Situation financière</th>}
                    {canViewFinance && <th>Bourse</th>}
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => (
                    <tr key={s.matricule}>
                      <td>
                        <code>{s.matricule}</code>
                      </td>
                      <td>
                        <div className="cell-main">
                          {s.firstname} {s.lastname}
                        </div>
                        <div className="cell-sub">{s.email}</div>
                      </td>
                      <td>{s.nationality.trim() || 'Non renseignée'}</td>
                      <td>
                        <div className="cell-main">{s.filiere}</div>
                        <div className="cell-sub">
                          {s.niveau} · {s.groupe}
                        </div>
                      </td>
                      {canViewFinance && (
                        <td>
                          {s.financials.available === false ? (
                            <span className="cell-sub">Situation financière non établie</span>
                          ) : (
                            <div style={{ fontSize: '0.85rem' }}>
                              <span style={{ color: 'var(--success)' }}>Payé : {fmtMoney(s.financials.paid)}</span>
                              <br />
                              <span style={{ color: s.financials.remaining > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                                Reste : {fmtMoney(s.financials.remaining)}
                              </span>
                            </div>
                          )}
                        </td>
                      )}
                      {canViewFinance && (
                        <td>
                          {s.financials.available === false ? (
                            <span className="cell-sub">Non établie</span>
                          ) : s.bourse.active ? (
                            <span className="pill pill-purple">
                              {s.bourse.percent}% – {s.bourse.type}
                            </span>
                          ) : (
                            <span className="text-muted">Aucune</span>
                          )}
                        </td>
                      )}
                      <td>
                        <span className={`pill ${['Inscrit', 'Réinscrit', 'INSCRIT', 'REINSCRIT'].includes(s.status) ? 'pill-success' : 'pill-default'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => setSelectedStudent(s)}>
                          Dossier complet →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={canViewFinance ? 8 : 6}>
                        {students.length ? 'Aucun étudiant ne correspond aux filtres.' : 'Aucun dossier étudiant créé.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </ResponsiveTable>
            </div>
          </div>
        </div>
      )}

      {selectedStudent && (
        <StudentRecordDialog matricule={selectedStudent.matricule} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}

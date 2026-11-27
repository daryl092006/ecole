'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import { useAcademicReferences } from '@/hooks/useAcademicReferences';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import PageHeader from '@/components/ui/PageHeader';
import DataPanel from '@/components/ui/DataPanel';
import WorkspaceSummary from '@/components/ui/WorkspaceSummary';
import StudentRecordDialog from '@/components/modules/StudentRecordDialog';
import { downloadCsv } from '@/utils/csv';
import { formatSubjectCode } from '@/services/resaoCodeService';
import type { TeachingAssignment, Subject, Teacher } from '@/types/academic';
import { Users, Search, ArrowRight, ShieldAlert, ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';

export default function GroupsWorkspace() {
  const portal = usePortal();
  const { groups = [], students = [], academicYearContext, perms } = portal;
  const tables = portal.relationalSnapshot.tables;
  const { assignments = [], subjects = [], teachers = [] } = useAcademicReferences();
  const canViewStudent = perms.permissions.includes('student.view');

  const currentYearId = academicYearContext?.selectedYearId;
  const currentYearName = academicYearContext?.years?.find(y => y.id === currentYearId)?.name || 'Année en cours';

  const [activeTab, setActiveTab] = useState<'classes' | 'unassigned'>('classes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiliere, setSelectedFiliere] = useState<string>('ALL');
  const [selectedNiveau, setSelectedNiveau] = useState<string>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentDrawer, setSelectedStudentDrawer] = useState<{ matricule: string; section?: 'identity' | 'finance' | 'parcours' } | null>(null);

  // Groupes rattachés à l'année de travail active
  const yearGroups = useMemo(() => {
    if (!currentYearId) return groups;
    return groups.filter(g => !g.academicYearId || g.academicYearId === currentYearId);
  }, [groups, currentYearId]);

  // Étudiants rattachés à l'année active
  const yearStudents = useMemo(() => {
    if (!currentYearId) return students;
    return students.filter(s => !s.academicYearId || s.academicYearId === currentYearId);
  }, [students, currentYearId]);

  // Liste des filières et niveaux distincts
  const filieresList = useMemo(() => {
    const set = new Set<string>();
    yearGroups.forEach(g => (g.filieres || []).forEach(f => set.add(f)));
    yearStudents.forEach(s => { if (s.filiere && s.filiere !== 'Filière non renseignée') set.add(s.filiere); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [yearGroups, yearStudents]);

  const niveauxList = useMemo(() => {
    const set = new Set<string>();
    yearGroups.forEach(g => { if (g.niveau) set.add(g.niveau); });
    yearStudents.forEach(s => { if (s.niveau && s.niveau !== 'Niveau non renseigné') set.add(s.niveau); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [yearGroups, yearStudents]);

  // Association des étudiants et cours à chaque groupe
  const groupsWithDetails = useMemo(() => {
    const snapAssignments = (tables.teaching_assignments || []).filter(row => !row.archived_at);
    const snapComponents = tables.curriculum_components || [];
    const snapSubjects = tables.subjects || [];
    const snapTeachers = tables.teachers || [];
    const snapStaff = tables.staff || [];
    const snapPeople = tables.people || [];

    return yearGroups.map(group => {
      const groupStudents = yearStudents.filter(
        s => s.groupId === group.id || (group.studentIds && group.studentIds.includes(s.matricule))
      );
      const rawSnapForGroup = snapAssignments.filter(a => a.group_id === group.id);
      const resolvedAssignments: { id: string; subjectCode: string; subjectName: string; teacherName: string }[] = [];
      const seenKeys = new Set<string>();

      for (const a of rawSnapForGroup) {
        const comp = snapComponents.find(c => c.id === a.component_id);
        const sub = snapSubjects.find(s => s.id === (comp?.subject_id || a.subject_id));
        const teacherRow = snapTeachers.find(t => t.id === a.teacher_id);
        const staffRow = teacherRow ? snapStaff.find(st => st.id === teacherRow.staff_id) : undefined;
        const personRow = staffRow ? snapPeople.find(p => p.id === staffRow.person_id) : undefined;
        const subjectName = String(sub?.name || comp?.name || 'Matière');
        const subjectCode = formatSubjectCode(comp?.code || sub?.code, subjectName) || '—';
        const teacherName = personRow
          ? `${String(personRow.firstname || '').trim()} ${String(personRow.lastname || '').trim()}`.trim()
          : 'Non assigné';
        const dedupKey = `${subjectCode}::${subjectName}::${teacherName}`;
        if (!seenKeys.has(dedupKey)) {
          seenKeys.add(dedupKey);
          resolvedAssignments.push({
            id: String(a.id),
            subjectCode,
            subjectName,
            teacherName,
          });
        }
      }

      if (resolvedAssignments.length === 0) {
        const fallbackAssignments = assignments.filter((a: TeachingAssignment) => a.groupId === group.id);
        for (const item of fallbackAssignments) {
          const sub = subjects.find((s: Subject) => s.id === item.subjectId);
          const prof = teachers.find((t: Teacher) => t.id === item.teacherId);
          resolvedAssignments.push({
            id: item.id,
            subjectCode: sub?.code || '—',
            subjectName: sub?.name || 'Matière',
            teacherName: prof ? `${prof.firstname} ${prof.lastname}`.trim() : 'Non assigné',
          });
        }
      }

      return {
        ...group,
        studentsCount: groupStudents.length,
        studentsList: groupStudents,
        assignmentsCount: resolvedAssignments.length,
        assignmentsList: resolvedAssignments,
      };
    });
  }, [yearGroups, yearStudents, assignments, subjects, teachers, tables]);

  // Étudiants non affectés
  const unassignedStudents = useMemo(() => {
    return yearStudents.filter(s => !s.groupId || s.groupe === 'Non affecté' || s.groupe === 'Sans groupe');
  }, [yearStudents]);

  // Filtrage des groupes
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groupsWithDetails.filter(group => {
      if (selectedFiliere !== 'ALL' && !(group.filieres || []).includes(selectedFiliere)) {
        return false;
      }
      if (selectedNiveau !== 'ALL' && group.niveau !== selectedNiveau) {
        return false;
      }
      if (!q) return true;
      const matchName = group.name.toLowerCase().includes(q);
      const matchFiliere = (group.filieres || []).some(f => f.toLowerCase().includes(q));
      const matchNiveau = (group.niveau || '').toLowerCase().includes(q);
      const matchStudent = group.studentsList.some(
        s => `${s.firstname} ${s.lastname}`.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q)
      );
      return matchName || matchFiliere || matchNiveau || matchStudent;
    });
  }, [groupsWithDetails, searchQuery, selectedFiliere, selectedNiveau]);

  const activeGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groupsWithDetails.find(g => g.id === selectedGroupId) || null;
  }, [groupsWithDetails, selectedGroupId]);

  // Filtrage des étudiants de la classe active
  const filteredClassStudents = useMemo(() => {
    if (!activeGroup) return [];
    const q = studentSearch.trim().toLowerCase();
    if (!q) return activeGroup.studentsList;
    return activeGroup.studentsList.filter(s =>
      s.matricule.toLowerCase().includes(q) ||
      `${s.firstname} ${s.lastname}`.toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.institutionalEmail || '').toLowerCase().includes(q)
    );
  }, [activeGroup, studentSearch]);

  return (
    <div className="domain-workspace workspace-stack">
      {/* En-tête officiel */}
      <PageHeader
        eyebrow="PÉDAGOGIE & SCOLARITÉ"
        title="Classes et groupes d'étudiants"
        description={`Consultez la composition exacte de chaque classe, l'effectif des inscrits et les étudiants rattachés pour l'année ${currentYearName}.`}
      >
        {activeGroup ? (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => { setSelectedGroupId(null); setStudentSearch(''); }}
          >
            <ArrowLeft size={16} />
            <span>Retour à toutes les classes</span>
          </button>
        ) : (
          activeTab === 'classes' && perms.permissions.includes('academic.group.manage') && (
            <Link className="btn btn-outline" href="/academique/referentiel">
              Gérer les groupes dans le référentiel →
            </Link>
          )
        )}
      </PageHeader>

      {!activeGroup && (
        <WorkspaceSummary
          label="Vue d’ensemble des classes et effectifs"
          items={[
            {
              label: 'Classes actives',
              value: yearGroups.length.toLocaleString('fr-FR'),
              description: `Groupes ouverts en ${currentYearName}`,
              icon: <GraduationCap size={21} />,
              tone: 'primary',
            },
            {
              label: 'Étudiants inscrits',
              value: yearStudents.length.toLocaleString('fr-FR'),
              description: unassignedStudents.length > 0 ? `${unassignedStudents.length} non affecté(s)` : 'Tous rattachés à une classe',
              icon: <Users size={21} />,
              tone: unassignedStudents.length > 0 ? 'warning' : undefined,
            },
            {
              label: 'Enseignements affectés',
              value: groupsWithDetails.reduce((sum, g) => sum + g.assignmentsCount, 0).toLocaleString('fr-FR'),
              description: 'Matières et enseignants rattachés aux classes',
              icon: <BookOpen size={21} />,
            },
          ]}
        />
      )}

      {/* CAS 1 : VUE DÉTAILLÉE D'UNE CLASSE SÉLECTIONNÉE (PLEINE LARGEUR) */}
      {activeGroup ? (
        <>
          <DataPanel
            title={activeGroup.name}
            description={[activeGroup.niveau, ...(activeGroup.filieres || [])].filter(Boolean).join(' · ') || 'Classe de l’année consultée'}
            meta={
              <div className="btn-group">
                <span className="pill pill-success">{activeGroup.studentsCount} étudiants inscrits</span>
                <label htmlFor="quick-group-select" className="sr-only">Changer de classe</label>
                <select
                  id="quick-group-select"
                  className="select-input"
                  value={activeGroup.id}
                  onChange={e => { setSelectedGroupId(e.target.value); setStudentSearch(''); }}
                >
                  {groupsWithDetails.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.studentsCount} étud.)
                    </option>
                  ))}
                </select>
              </div>
            }
            footer={`Affichage de ${filteredClassStudents.length} sur ${activeGroup.studentsCount} étudiant(s)`}
            toolbar={
              <div className="panel-filter-grid">
                <label className="form-group">
                  Filtrer les étudiants de cette classe
                  <span className="assessment-search-input">
                    <Search size={18} aria-hidden="true" />
                    <input
                      type="search"
                      className="input"
                      placeholder="Nom, prénom, matricule, email…"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                    />
                  </span>
                </label>
                <div className="btn-group" style={{ alignItems: 'flex-end' }}>
                  {studentSearch && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setStudentSearch('')}
                    >
                      Effacer le filtre
                    </button>
                  )}
                  {filteredClassStudents.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        downloadCsv(
                          `classe-${activeGroup.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.csv`,
                          ['#', 'Matricule', 'Prénom', 'Nom', 'Email M365', 'Téléphone', 'Filière', 'Niveau', 'Classe', 'Statut'],
                          filteredClassStudents.map((s, idx) => [
                            idx + 1,
                            s.matricule,
                            s.firstname,
                            s.lastname,
                            s.institutionalEmail || s.email || '',
                            s.phone || '',
                            s.filiere || (activeGroup.filieres || []).join(', '),
                            s.niveau || activeGroup.niveau || '',
                            activeGroup.name,
                            s.status || 'Inscrit',
                          ])
                        );
                      }}
                    >
                      Exporter la liste CSV ({filteredClassStudents.length})
                    </button>
                  )}
                </div>
              </div>
            }
          >

          {/* Tableau complet des étudiants de la classe */}
          {activeGroup.studentsCount === 0 ? (
            <div className="empty-state" style={{ padding: '48px 16px' }}>
              <Users size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <h3>Aucun étudiant affecté à cette classe</h3>
              <p className="cell-sub">
                Les étudiants inscrits à cette formation peuvent être affectés depuis les dossiers étudiants.
              </p>
              {perms.permissions.includes('student.group.assign') && (
                <Link className="btn btn-primary" href="/etudiants" style={{ marginTop: '16px' }}>
                  Affecter des étudiants
                </Link>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <ResponsiveTable className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '48px' }}>#</th>
                    <th>Matricule</th>
                    <th>Nom & Prénoms</th>
                    <th>Email institutionnel M365</th>
                    <th>Téléphone</th>
                    <th>Statut</th>
                    {canViewStudent && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredClassStudents.map((student, idx) => {
                    const fullName = `${student.firstname} ${student.lastname}`.trim() || 'Étudiant';
                    const email = student.institutionalEmail || student.email || '—';

                    return (
                      <tr key={student.matricule}>
                        <td style={{ color: '#64748b', fontSize: '12px' }}>{idx + 1}</td>
                        <td>
                          {canViewStudent ? (
                            <button
                              type="button"
                              className="btn-link"
                              onClick={() => setSelectedStudentDrawer({ matricule: student.matricule })}
                              style={{ fontWeight: 600, color: 'var(--primary, #202a51)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              <code>{student.matricule}</code>
                            </button>
                          ) : (
                            <code>{student.matricule}</code>
                          )}
                        </td>
                        <td>
                          <strong>{fullName}</strong>
                        </td>
                        <td>
                          <code style={{ fontSize: '12px', color: '#334155' }}>{email}</code>
                        </td>
                        <td>{student.phone || '—'}</td>
                        <td>
                          <span
                            className={`pill ${
                              student.status === 'Inscrit' || student.status === 'INSCRIT'
                                ? 'pill-success'
                                : student.status === 'Réinscrit' || student.status === 'REINSCRIT'
                                ? 'pill-info'
                                : 'pill-default'
                            }`}
                          >
                            {student.status || 'Inscrit'}
                          </span>
                        </td>
                        {canViewStudent && (
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setSelectedStudentDrawer({ matricule: student.matricule })}
                            >
                              Fiche dossier →
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredClassStudents.length === 0 && (
                    <tr>
                      <td colSpan={canViewStudent ? 7 : 6} style={{ textAlign: 'center', padding: '32px' }}>
                        Aucun étudiant ne correspond à votre recherche « {studentSearch} ».
                      </td>
                    </tr>
                  )}
                </tbody>
              </ResponsiveTable>
            </div>
          )}

          </DataPanel>

          {/* Section secondaire : Enseignements et matières du groupe */}
          {activeGroup.assignmentsCount > 0 && (
            <DataPanel
              title={`Matières et enseignants affectés à ce groupe (${activeGroup.assignmentsCount})`}
              description="Enseignements rattachés à cette classe pour l’année universitaire."
            >
              <div className="table-wrap">
                <ResponsiveTable className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Matière</th>
                      <th>Enseignant affecté</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroup.assignmentsList.map(item => (
                      <tr key={item.id}>
                        <td><code>{item.subjectCode}</code></td>
                        <td><strong>{item.subjectName}</strong></td>
                        <td>{item.teacherName}</td>
                      </tr>
                    ))}
                  </tbody>
                </ResponsiveTable>
              </div>
            </DataPanel>
          )}
        </>
      ) : (
        /* CAS 2 : VUE D'ENSEMBLE PLEINE LARGEUR (TABLEAU DES CLASSES OU SANS CLASSE) */
        <DataPanel
          title={activeTab === 'classes' ? 'Liste des classes de l’établissement' : 'Étudiants non affectés à une classe'}
          description={activeTab === 'classes' ? 'Sélectionnez une classe pour afficher la liste complète de ses étudiants et matières.' : 'Étudiants inscrits en attente de rattachement à un groupe de classe.'}
          meta={
            <div className="btn-group" role="group" aria-label="Vue des classes et des étudiants non affectés">
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'classes' ? 'btn-primary' : 'btn-outline'}`}
                aria-pressed={activeTab === 'classes'}
                onClick={() => setActiveTab('classes')}
              >
                Toutes les classes ({yearGroups.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'unassigned' ? 'btn-primary' : 'btn-outline'}`}
                aria-pressed={activeTab === 'unassigned'}
                onClick={() => setActiveTab('unassigned')}
              >
                <ShieldAlert size={15} />
                <span>Étudiants non affectés ({unassignedStudents.length})</span>
              </button>
            </div>
          }
          footer={activeTab === 'classes' ? `${filteredGroups.length} classe(s) affichée(s) sur ${yearGroups.length}` : `${unassignedStudents.length} étudiant(s) non affecté(s)`}
          toolbar={
            activeTab === 'classes' ? (
              <div className="panel-filter-grid">
                <label className="form-group">
                  Rechercher une classe ou un étudiant
                  <span className="assessment-search-input">
                    <Search size={18} aria-hidden="true" />
                    <input
                      type="search"
                      className="input"
                      placeholder="Classe, filière, niveau ou étudiant…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </span>
                </label>
                <label className="form-group">
                  Filière
                  <select
                    className="select-input"
                    value={selectedFiliere}
                    onChange={e => setSelectedFiliere(e.target.value)}
                  >
                    <option value="ALL">Toutes les filières ({filieresList.length})</option>
                    {filieresList.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label className="form-group">
                  Niveau
                  <select
                    className="select-input"
                    value={selectedNiveau}
                    onChange={e => setSelectedNiveau(e.target.value)}
                  >
                    <option value="ALL">Tous les niveaux ({niveauxList.length})</option>
                    {niveauxList.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : undefined
          }
        >
          {activeTab === 'classes' ? (
            <>
              {/* Grand tableau récapitulatif des classes */}
              <div className="table-wrap">
                <ResponsiveTable className="data-table">
                  <thead>
                    <tr>
                      <th>Classe / Groupe</th>
                      <th>Niveau</th>
                      <th>Filières rattachées</th>
                      <th>Effectif étudiants</th>
                      <th>Cours affectés</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map(group => {
                      return (
                        <tr
                          key={group.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedGroupId(group.id)}
                        >
                          <td>
                            <strong style={{ fontSize: '14px', color: 'var(--primary, #202a51)' }}>
                              {group.name}
                            </strong>
                          </td>
                          <td>
                            {group.niveau ? (
                              <span className="pill pill-default">{group.niveau}</span>
                            ) : (
                              <span className="cell-sub">—</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {(group.filieres || []).length > 0 ? (
                                group.filieres.map(f => (
                                  <span key={f} className="pill pill-info">{f}</span>
                                ))
                              ) : (
                                <span className="cell-sub">Non renseignée</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`pill ${group.studentsCount > 0 ? 'pill-success' : 'pill-warning'}`}
                              style={{ fontWeight: 600 }}
                            >
                              {group.studentsCount} étudiant{group.studentsCount > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td>
                            {group.assignmentsCount > 0 ? (
                              <span>{group.assignmentsCount} matière{group.assignmentsCount > 1 ? 's' : ''}</span>
                            ) : (
                              <span className="cell-sub">Aucun cours</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGroupId(group.id);
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <span>Voir la liste ({group.studentsCount})</span>
                              <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredGroups.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                          Aucune classe ne correspond à vos filtres.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </ResponsiveTable>
              </div>
            </>
          ) : (
            /* VUE DES ÉTUDIANTS NON AFFECTÉS */
            <div className="table-wrap">
              <ResponsiveTable className="data-table">
                <thead>
                  <tr>
                    <th>Matricule</th>
                    <th>Nom & Prénoms</th>
                    <th>Filière</th>
                    <th>Niveau</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedStudents.map(student => (
                    <tr key={student.matricule}>
                      <td>
                        {canViewStudent ? (
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => setSelectedStudentDrawer({ matricule: student.matricule, section: 'parcours' })}
                            style={{ fontWeight: 600, color: 'var(--primary, #202a51)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          >
                            <code>{student.matricule}</code>
                          </button>
                        ) : (
                          <code>{student.matricule}</code>
                        )}
                      </td>
                      <td>
                        <strong>{student.firstname} {student.lastname}</strong>
                      </td>
                      <td>{student.filiere || 'Non renseignée'}</td>
                      <td>{student.niveau || 'Non renseigné'}</td>
                      <td>
                        <span className="pill pill-warning">Non affecté</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {canViewStudent ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setSelectedStudentDrawer({ matricule: student.matricule, section: 'parcours' })}
                          >
                            Affecter dans dossier →
                          </button>
                        ) : (
                          <span className="cell-sub">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {unassignedStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                        Tous les étudiants inscrits sont affectés à une classe !
                      </td>
                    </tr>
                  )}
                </tbody>
              </ResponsiveTable>
            </div>
          )}
        </DataPanel>
      )}
      {selectedStudentDrawer && (
        <StudentRecordDialog
          matricule={selectedStudentDrawer.matricule}
          initialSection={selectedStudentDrawer.section}
          onClose={() => setSelectedStudentDrawer(null)}
        />
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import { useAcademicReferences } from '@/hooks/useAcademicReferences';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import PageHeader from '@/components/ui/PageHeader';
import type { TeachingAssignment, Subject, Teacher } from '@/types/academic';
import { Users, Search, ArrowRight, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function GroupsWorkspace() {
  const portal = usePortal();
  const { groups = [], students = [], academicYearContext, perms } = portal;
  const { assignments = [], subjects = [], teachers = [] } = useAcademicReferences();

  const currentYearId = academicYearContext?.selectedYearId;
  const currentYearName = academicYearContext?.years?.find(y => y.id === currentYearId)?.name || 'Année en cours';

  const [activeTab, setActiveTab] = useState<'classes' | 'unassigned'>('classes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiliere, setSelectedFiliere] = useState<string>('ALL');
  const [selectedNiveau, setSelectedNiveau] = useState<string>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

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
    return yearGroups.map(group => {
      const groupStudents = yearStudents.filter(
        s => s.groupId === group.id || (group.studentIds && group.studentIds.includes(s.matricule))
      );
      const groupAssignments = assignments.filter((a: TeachingAssignment) => a.groupId === group.id);
      return {
        ...group,
        studentsCount: groupStudents.length,
        studentsList: groupStudents,
        assignmentsCount: groupAssignments.length,
        assignmentsList: groupAssignments,
      };
    });
  }, [yearGroups, yearStudents, assignments]);

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
      />

      {/* CAS 1 : VUE DÉTAILLÉE D'UNE CLASSE SÉLECTIONNÉE (PLEINE LARGEUR) */}
      {activeGroup ? (
        <section className="card card-full" aria-label={`Détail de la classe ${activeGroup.name}`}>
          {/* Barre de navigation retour & sélecteur rapide */}
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setSelectedGroupId(null); setStudentSearch(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Retour à toutes les classes</span>
              </button>
              <div>
                <h2 style={{ margin: 0 }}>{activeGroup.name}</h2>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                  {activeGroup.niveau && <span className="pill pill-default">{activeGroup.niveau}</span>}
                  {(activeGroup.filieres || []).map(f => (
                    <span key={f} className="pill pill-info">{f}</span>
                  ))}
                  <span className="pill pill-success">{activeGroup.studentsCount} étudiants inscrits</span>
                </div>
              </div>
            </div>

            {/* Sélecteur direct pour basculer vers une autre classe sans revenir en arrière */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="quick-group-select" className="cell-sub" style={{ fontWeight: 500 }}>
                Changer de classe :
              </label>
              <select
                id="quick-group-select"
                className="select-input"
                style={{ minWidth: '220px' }}
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
          </div>

          {/* Recherche dans la classe */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', background: '#f8fafc' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '36px' }}
                  placeholder="Filtrer les étudiants de cette classe (nom, prénom, matricule, email)..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                />
              </div>
              {studentSearch && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setStudentSearch('')}
                >
                  Effacer le filtre
                </button>
              )}
              <span className="cell-sub">
                Affichage de <strong>{filteredClassStudents.length}</strong> sur <strong>{activeGroup.studentsCount}</strong> étudiant(s)
              </span>
            </div>
          </div>

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
                    <th style={{ textAlign: 'right' }}>Actions</th>
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
                          <Link
                            href={`/etudiants/${encodeURIComponent(student.matricule)}`}
                            style={{ fontWeight: 600, color: 'var(--primary, #2563eb)', textDecoration: 'none' }}
                          >
                            <code>{student.matricule}</code>
                          </Link>
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
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            className="btn btn-sm btn-outline"
                            href={`/etudiants/${encodeURIComponent(student.matricule)}`}
                          >
                            Fiche dossier →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredClassStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                        Aucun étudiant ne correspond à votre recherche « {studentSearch} ».
                      </td>
                    </tr>
                  )}
                </tbody>
              </ResponsiveTable>
            </div>
          )}

          {/* Section secondaire : Enseignements et matières du groupe */}
          {activeGroup.assignmentsCount > 0 && (
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '20px' }}>
              <div style={{ padding: '0 20px 12px' }}>
                <h3 style={{ fontSize: '15px', margin: 0 }}>
                  Matières et enseignants affectés à ce groupe ({activeGroup.assignmentsCount})
                </h3>
              </div>
              <div className="table-wrap">
                <ResponsiveTable className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Matière</th>
                      <th>Enseignant affecté</th>
                      <th>Coefficient</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroup.assignmentsList.map((item: TeachingAssignment) => {
                      const sub = subjects.find((s: Subject) => s.id === item.subjectId);
                      const prof = teachers.find((t: Teacher) => t.id === item.teacherId);
                      return (
                        <tr key={item.id}>
                          <td><code>{sub?.code || '—'}</code></td>
                          <td><strong>{sub?.name || 'Matière'}</strong></td>
                          <td>{prof ? `${prof.firstname} ${prof.lastname}` : 'Non assigné'}</td>
                          <td>{sub?.coefficient ?? 1}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </ResponsiveTable>
              </div>
            </div>
          )}
        </section>
      ) : (
        /* CAS 2 : VUE D'ENSEMBLE PLEINE LARGEUR (TABLEAU DES CLASSES OU SANS CLASSE) */
        <section className="card card-full" aria-label="Liste des classes de l'établissement">
          {/* Onglets supérieurs de sélection de vue */}
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '12px' }}>
            <div className="btn-group" role="group" aria-label="Vue des classes et des étudiants non affectés">
              <button
                type="button"
                className={`btn ${activeTab === 'classes' ? 'btn-primary' : 'btn-outline'}`}
                aria-pressed={activeTab === 'classes'}
                onClick={() => setActiveTab('classes')}
              >
                Toutes les classes ({yearGroups.length})
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'unassigned' ? 'btn-primary' : 'btn-outline'}`}
                aria-pressed={activeTab === 'unassigned'}
                onClick={() => setActiveTab('unassigned')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldAlert size={15} style={{ color: activeTab === 'unassigned' ? '#fff' : 'var(--warning, #d97706)' }} />
                <span>Étudiants non affectés ({unassignedStudents.length})</span>
              </button>
            </div>

            {activeTab === 'classes' && perms.permissions.includes('academic.group.manage') && (
              <Link className="btn btn-outline" href="/academique/referentiel">
                Gérer les groupes dans le référentiel →
              </Link>
            )}
          </div>

          {activeTab === 'classes' ? (
            <>
              {/* Filtres de recherche des classes */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', background: '#f8fafc' }}>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '36px' }}
                      placeholder="Rechercher une classe, filière, niveau ou étudiant..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div>
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
                  </div>

                  <div>
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
                  </div>
                </div>
              </div>

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
                            <strong style={{ fontSize: '14px', color: 'var(--primary, #2563eb)' }}>
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
                        <Link
                          href={`/etudiants/${encodeURIComponent(student.matricule)}`}
                          style={{ fontWeight: 600, color: 'var(--primary, #2563eb)' }}
                        >
                          <code>{student.matricule}</code>
                        </Link>
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
                        <Link
                          className="btn btn-sm btn-outline"
                          href={`/etudiants/${encodeURIComponent(student.matricule)}`}
                        >
                          Affecter dans dossier →
                        </Link>
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
        </section>
      )}
    </div>
  );
}

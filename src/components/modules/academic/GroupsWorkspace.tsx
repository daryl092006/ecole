'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import { useAcademicReferences } from '@/hooks/useAcademicReferences';
import PageHeader from '@/components/ui/PageHeader';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import type { TeachingAssignment, Subject, Teacher } from '@/types/academic';
import { Users, GraduationCap, BookOpen, Search, ArrowRight, ShieldAlert } from 'lucide-react';

export default function GroupsWorkspace() {
  const portal = usePortal();
  const { groups = [], students = [], academicYearContext, perms } = portal;
  const { assignments = [], subjects = [], teachers = [] } = useAcademicReferences();

  const currentYearId = academicYearContext?.selectedYearId;
  const currentYearName = academicYearContext?.years?.find(y => y.id === currentYearId)?.name || 'Année en cours';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiliere, setSelectedFiliere] = useState<string>('ALL');
  const [selectedNiveau, setSelectedNiveau] = useState<string>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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

  // Association des étudiants à chaque groupe
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
      if (q) {
        const matchesName = group.name.toLowerCase().includes(q);
        const matchesNiveau = (group.niveau || '').toLowerCase().includes(q);
        const matchesFiliere = (group.filieres || []).some(f => f.toLowerCase().includes(q));
        const matchesStudent = group.studentsList.some(
          s => s.firstname.toLowerCase().includes(q) || s.lastname.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q)
        );
        return matchesName || matchesNiveau || matchesFiliere || matchesStudent;
      }
      return true;
    });
  }, [groupsWithDetails, selectedFiliere, selectedNiveau, searchQuery]);

  // Sélection active (premier groupe par défaut si non sélectionné)
  const activeGroup = useMemo(() => {
    if (selectedGroupId === '__UNASSIGNED__') return null;
    if (selectedGroupId) {
      return groupsWithDetails.find(g => g.id === selectedGroupId) || null;
    }
    return filteredGroups[0] || null;
  }, [groupsWithDetails, filteredGroups, selectedGroupId]);

  const showingUnassigned = selectedGroupId === '__UNASSIGNED__';

  return (
    <div className="domain-workspace workspace-stack">
      <PageHeader
        eyebrow="PÉDAGOGIE & SCOLARITÉ"
        title="Classes et groupes d'étudiants"
        description={`Consultez les promotions, classes et effectifs pour l’année universitaire ${currentYearName}.`}
      >
        <Link className="btn btn-outline" href="/etudiants">
          <GraduationCap size={16} />
          <span>Tous les dossiers étudiants</span>
        </Link>
        <Link className="btn btn-outline" href="/academique/emploi-du-temps">
          <BookOpen size={16} />
          <span>Emploi du temps par classe</span>
        </Link>
      </PageHeader>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Classes & Groupes</span>
          <strong className="kpi-value">{yearGroups.length}</strong>
          <span className="cell-sub">Promotions répertoriées</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Étudiants affectés</span>
          <strong className="kpi-value" style={{ color: 'var(--success, #16a34a)' }}>
            {yearStudents.length - unassignedStudents.length}
          </strong>
          <span className="cell-sub">Inscrits dans une classe</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Sans affectation</span>
          <strong className="kpi-value" style={{ color: unassignedStudents.length > 0 ? 'var(--warning, #d97706)' : 'var(--text-muted, #64748b)' }}>
            {unassignedStudents.length}
          </strong>
          <span className="cell-sub">À affecter à un groupe</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Filières actives</span>
          <strong className="kpi-value">{filieresList.length}</strong>
          <span className="cell-sub">Parcours couverts</span>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <section className="card card-full">
        <div className="browser-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', minWidth: '220px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #64748b)' }} />
            <input
              type="search"
              className="input"
              style={{ paddingLeft: '32px', width: '100%' }}
              placeholder="Rechercher une classe, filière, ou un étudiant…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <label className="form-group" style={{ margin: 0, minWidth: '180px' }}>
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

          <label className="form-group" style={{ margin: 0, minWidth: '150px' }}>
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

          {unassignedStudents.length > 0 && (
            <button
              type="button"
              className={`btn ${showingUnassigned ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedGroupId(showingUnassigned ? null : '__UNASSIGNED__')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ShieldAlert size={15} style={{ color: showingUnassigned ? '#fff' : 'var(--warning, #d97706)' }} />
              <span>Non affectés ({unassignedStudents.length})</span>
            </button>
          )}
        </div>
      </section>

      {/* Disposition principale : Liste des groupes (Master) & Détail des étudiants (Detail) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* Colonne gauche : Sélecteur de groupes */}
        <section className="card" style={{ padding: '16px' }}>
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px' }}>Classes ({filteredGroups.length})</h2>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <strong>Aucun groupe trouvé</strong>
              <p className="cell-sub">Modifiez vos critères de recherche ou de filtre.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredGroups.map(group => {
                const isSelected = activeGroup?.id === group.id && !showingUnassigned;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '6px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid var(--primary, #2563eb)' : '1px solid #e2e8f0',
                      background: isSelected ? 'var(--primary-light, #eff6ff)' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all .15s ease',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <strong style={{ fontSize: '14px', color: isSelected ? 'var(--primary, #2563eb)' : '#0f172a' }}>
                        {group.name}
                      </strong>
                      <span className="badge badge-info" style={{ fontSize: '11px' }}>
                        {group.studentsCount} étudiant{group.studentsCount > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '11px', color: '#64748b' }}>
                      {group.niveau && <span className="pill pill-default">{group.niveau}</span>}
                      {(group.filieres || []).map(f => (
                        <span key={f} className="pill pill-default" title={f}>
                          {f.length > 24 ? f.slice(0, 24) + '…' : f}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Colonne droite : Fiche du groupe sélectionné ou Étudiants non affectés */}
        <div>
          {showingUnassigned ? (
            <section className="card card-full">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ color: 'var(--warning, #d97706)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={20} />
                    <span>Étudiants sans groupe d'affectation ({unassignedStudents.length})</span>
                  </h2>
                  <p className="cell-sub" style={{ marginTop: '4px' }}>
                    Ces étudiants ont une inscription valide mais ne sont rattachés à aucun groupe ou classe pour l’année en cours.
                  </p>
                </div>
              </div>

              <div className="table-wrap">
                <ResponsiveTable className="data-table">
                  <thead>
                    <tr>
                      <th>Matricule</th>
                      <th>Nom & Prénoms</th>
                      <th>Filière & Niveau</th>
                      <th>Contact</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedStudents.map(student => (
                      <tr key={student.matricule}>
                        <td>
                          <Link href={`/etudiants/${student.matricule}`} style={{ fontWeight: 600, color: 'var(--primary, #2563eb)' }}>
                            <code>{student.matricule}</code>
                          </Link>
                        </td>
                        <td>
                          <strong>{student.lastname}</strong> {student.firstname}
                        </td>
                        <td>
                          <div>{student.filiere}</div>
                          <small className="cell-sub">{student.niveau}</small>
                        </td>
                        <td>
                          <div>{student.email || '—'}</div>
                          {student.phone && <small className="cell-sub">{student.phone}</small>}
                        </td>
                        <td>
                          <span className="pill pill-warning">{student.status}</span>
                        </td>
                        <td>
                          <Link className="btn btn-outline" href={`/etudiants/${student.matricule}`} style={{ padding: '4px 8px', fontSize: '12px' }}>
                            <span>Ouvrir dossier</span>
                            <ArrowRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ResponsiveTable>
              </div>
            </section>
          ) : activeGroup ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Carte d'en-tête de la classe */}
              <section className="card card-full" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <span className="page-eyebrow">FICHE DE CLASSE</span>
                    <h1 style={{ fontSize: '22px', margin: '4px 0 8px', color: '#0f172a' }}>
                      {activeGroup.name}
                    </h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      {activeGroup.niveau && (
                        <span className="pill pill-default" style={{ fontWeight: 600 }}>
                          Niveau : {activeGroup.niveau}
                        </span>
                      )}
                      {(activeGroup.filieres || []).map(f => (
                        <span key={f} className="badge badge-info">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="kpi-card" style={{ padding: '10px 16px', background: '#ffffff', minWidth: '120px' }}>
                      <span className="kpi-label">Effectif classe</span>
                      <strong className="kpi-value" style={{ fontSize: '20px', color: 'var(--primary, #2563eb)' }}>
                        {activeGroup.studentsCount}
                      </strong>
                    </div>
                    {activeGroup.assignmentsCount > 0 && (
                      <div className="kpi-card" style={{ padding: '10px 16px', background: '#ffffff', minWidth: '120px' }}>
                        <span className="kpi-label">Enseignements</span>
                        <strong className="kpi-value" style={{ fontSize: '20px' }}>
                          {activeGroup.assignmentsCount}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Tableau de la liste exacte des étudiants inscrits dans ce groupe */}
              <section className="card card-full">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={18} />
                      <span>Liste exacte des étudiants inscrits ({activeGroup.studentsCount})</span>
                    </h2>
                    <p className="cell-sub" style={{ marginTop: '4px' }}>
                      Étudiants officiellement rattachés à ce groupe pour l’année {currentYearName}.
                    </p>
                  </div>
                </div>

                {activeGroup.studentsCount === 0 ? (
                  <div className="empty-state" style={{ padding: '36px 16px' }}>
                    <Users size={32} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                    <strong>Aucun étudiant affecté à cette classe</strong>
                    <p className="cell-sub">
                      Les inscriptions pour cette formation peuvent être affectées depuis les dossiers étudiants.
                    </p>
                    {perms.permissions.includes('student.group.assign') && (
                      <Link className="btn btn-primary" href="/etudiants" style={{ marginTop: '12px' }}>
                        Affecter des étudiants
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="table-wrap">
                    <ResponsiveTable className="data-table">
                      <thead>
                        <tr>
                          <th>Matricule</th>
                          <th>Nom & Prénoms</th>
                          <th>Email de connexion officiel</th>
                          <th>Téléphone</th>
                          <th>Filière</th>
                          <th>Statut</th>
                          <th>Dossier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeGroup.studentsList.map(student => (
                          <tr key={student.matricule}>
                            <td>
                              <Link
                                href={`/etudiants/${student.matricule}`}
                                style={{ fontWeight: 600, color: 'var(--primary, #2563eb)' }}
                                title="Consulter le dossier officiel complet"
                              >
                                <code>{student.matricule}</code>
                              </Link>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {student.lastname} {student.firstname}
                              </div>
                            </td>
                            <td>
                              <span style={{ color: 'var(--primary, #0369a1)', fontSize: '13px' }}>
                                {student.institutionalEmail || `${student.matricule.toLowerCase()}@escen.university`}
                              </span>
                            </td>
                            <td>
                              <span>{student.phone || 'Non renseigné'}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: '12px' }}>{student.filiere}</span>
                            </td>
                            <td>
                              <span className={`pill ${['Inscrit', 'INSCRIT', 'Réinscrit', 'REINSCRIT'].includes(student.status) ? 'pill-success' : 'pill-default'}`}>
                                {student.status}
                              </span>
                            </td>
                            <td>
                              <Link
                                className="btn btn-outline"
                                href={`/etudiants/${student.matricule}`}
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                              >
                                <span>Fiche</span>
                                <ArrowRight size={13} />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </ResponsiveTable>
                  </div>
                )}
              </section>

              {/* Matières & Professeurs assignés à cette classe (si existants) */}
              {activeGroup.assignmentsCount > 0 && (
                <section className="card card-full">
                  <div className="card-header" style={{ marginBottom: '14px' }}>
                    <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={16} />
                      <span>Enseignements & Matières programmés ({activeGroup.assignmentsCount})</span>
                    </h2>
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
                </section>
              )}

            </div>
          ) : (
            <div className="card card-full empty-state" style={{ padding: '48px 16px' }}>
              <Users size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <h3>Sélectionnez une classe</h3>
              <p className="cell-sub">
                Choisissez une classe dans la liste de gauche pour afficher ses détails et ses étudiants inscrits.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


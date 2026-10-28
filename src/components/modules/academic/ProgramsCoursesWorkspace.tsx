'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import ReferenceCrudWorkspace from './ReferenceCrudWorkspace';

export default function ProgramsCoursesWorkspace() {
  const portal = usePortal();
  const tables = portal.relationalSnapshot.tables;
  const [groupId, setGroupId] = useState('');
  const [programId, setProgramId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [task, setTask] = useState<{ collection: string; create?: boolean; editId?: string } | null>(null);
  const refreshedEmptySemesters = useRef(false);
  const canEdit = portal.globalAccess && portal.perms.permissions.includes('academic.structure.manage');
  const canSchedule = portal.perms.permissions.includes('schedule.create');
  const year = portal.academicYearContext?.years.find(row => row.id === portal.academicYearContext?.selectedYearId);

  useEffect(() => {
    if (!refreshedEmptySemesters.current && !(tables.curriculum_semesters || []).length) {
      refreshedEmptySemesters.current = true;
      portal.refreshCampus();
    }
  }, [tables.curriculum_semesters, portal]);

  const yearGroups = (tables.groups || []).filter(row => !row.archived_at && (!year || row.academic_year_id === year.id));
  const selectedGroup = yearGroups.find(row => row.id === groupId);
  const programs = (tables.programs || []).filter(row => !row.archived_at && row.active !== false);
  const allCurricula = (tables.curricula || []).filter(row => !row.archived_at && row.status !== 'ARCHIVED');
  const curricula = allCurricula.filter(row => row.program_id === programId);
  const levels = (tables.levels || []).filter(row => !row.archived_at && curricula.some(curriculum => curriculum.level_id === row.id));
  const versions = curricula.filter(row => row.level_id === levelId);
  const curriculum = versions.find(row => row.id === versionId) || (versions.length === 1 ? versions[0] : undefined);
  const semesters = (tables.curriculum_semesters || []).filter(row => !row.archived_at && row.curriculum_id === curriculum?.id).sort((a, b) => Number(a.position) - Number(b.position));
  const effectiveSemesterId = semesterId || semesters[0]?.id || '';
  const showAllSemesters = effectiveSemesterId === 'ALL';
  const semester = semesters.find(row => row.id === effectiveSemesterId);
  const allCurriculumComponents = (tables.curriculum_components || []).filter(row => !row.archived_at && row.curriculum_id === curriculum?.id);
  const components = allCurriculumComponents.filter(row => {
    if (showAllSemesters) return true;
    if (!semester) return false;
    if (!row.unit_id) return Number(semester.position) === 1 || semesters[0]?.id === semester.id;
    return tables.teaching_units?.some(unit => !unit.archived_at && unit.id === row.unit_id && unit.semester_id === semester.id);
  });
  const selectedProgram = programs.find(row => row.id === programId);
  const selectedLevel = levels.find(row => row.id === levelId) || (tables.levels || []).find(row => row.id === selectedGroup?.level_id);
  const activeSemesterLabel = showAllSemesters ? 'Tous les semestres' : semester ? String(semester.name) : '';
  const context = [selectedGroup?.name || selectedProgram?.name, selectedLevel?.name, activeSemesterLabel].filter(Boolean).join(' · ');
  const editableProgram = canEdit && !!year && curriculum?.status === 'DRAFT';
  const unassigned = (tables.subjects || []).filter(subject => !subject.archived_at && !(tables.curriculum_components || []).some(component => !component.archived_at && component.subject_id === subject.id));
  const offeringIds = new Set((tables.academic_offerings || []).filter(row => !row.archived_at && row.curriculum_id === curriculum?.id && (!year || row.academic_year_id === year.id)).map(row => row.id));
  const linkedGroupIds = new Set((tables.group_offerings || []).filter(row => !row.archived_at && offeringIds.has(String(row.offering_id))).map(row => String(row.group_id)));
  const levelGroups = yearGroups.filter(row => linkedGroupIds.has(row.id));
  const changed = () => { setTask(null); portal.refreshCampus(); };

  const selectGroup = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    if (!nextGroupId) {
      setProgramId('');
      setLevelId('');
      setVersionId('');
      setSemesterId('');
      return;
    }
    const grp = yearGroups.find(row => row.id === nextGroupId);
    const grpOfferingIds = new Set(
      (tables.group_offerings || [])
        .filter(row => !row.archived_at && row.group_id === nextGroupId)
        .map(row => String(row.offering_id))
    );
    const grpOfferings = (tables.academic_offerings || []).filter(row => !row.archived_at && grpOfferingIds.has(row.id));
    const candidateCurricula = allCurricula.filter(c => grpOfferings.some(o => o.curriculum_id === c.id));
    // Prefer a curriculum that already has subjects attached, or the first linked curriculum
    const bestCurriculum =
      candidateCurricula.find(c => (tables.curriculum_components || []).some(comp => !comp.archived_at && comp.curriculum_id === c.id)) ||
      candidateCurricula[0] ||
      allCurricula.find(c => c.level_id === grp?.level_id);
    if (bestCurriculum) {
      const nextProgramId = String(bestCurriculum.program_id || '');
      const nextLevelId = String(bestCurriculum.level_id || grp?.level_id || '');
      const nextSemesters = (tables.curriculum_semesters || [])
        .filter(row => !row.archived_at && row.curriculum_id === bestCurriculum.id)
        .sort((a, b) => Number(a.position) - Number(b.position));
      setProgramId(nextProgramId);
      setLevelId(nextLevelId);
      setVersionId(bestCurriculum.id);
      setSemesterId(nextSemesters[0]?.id || '');
    } else if (grp?.level_id) {
      setLevelId(String(grp.level_id));
      setVersionId('');
      setSemesterId('');
    }
  };

  const selectLevel = (nextLevelId: string) => {
    setLevelId(nextLevelId);
    setVersionId('');
    const nextVersions = curricula.filter(row => row.level_id === nextLevelId);
    const nextCurriculum = nextVersions.length === 1 ? nextVersions[0] : undefined;
    const nextSemesters = (tables.curriculum_semesters || [])
      .filter(row => !row.archived_at && row.curriculum_id === nextCurriculum?.id)
      .sort((a, b) => Number(a.position) - Number(b.position));
    setSemesterId(nextSemesters[0]?.id || '');
    const nextOfferingIds = new Set((tables.academic_offerings || []).filter(row => !row.archived_at && row.curriculum_id === nextCurriculum?.id && (!year || row.academic_year_id === year.id)).map(row => row.id));
    const nextGroupIds = new Set((tables.group_offerings || []).filter(row => !row.archived_at && nextOfferingIds.has(String(row.offering_id))).map(row => String(row.group_id)));
    const matchingGroups = yearGroups.filter(row => nextGroupIds.has(row.id));
    if (matchingGroups.length === 1) setGroupId(matchingGroups[0].id);
    else if (!matchingGroups.some(g => g.id === groupId)) setGroupId('');
  };

  return <div className="domain-workspace workspace-stack">
    <div className="page-intro"><div><h1>Programmes de cours et matières</h1></div>{canEdit && <button className="btn btn-outline" onClick={() => setTask({ collection: 'programs' })}>Gérer les filières et leurs niveaux</button>}</div>
    <section className="card" aria-label="Choisir le programme">
      <div className="form-grid">
        {yearGroups.length > 0 && (
          <label className="form-group">
            Groupe ({year?.name || 'année en cours'})
            <select className="select-input" value={groupId} onChange={event => selectGroup(event.target.value)}>
              <option value="">Choisir un groupe (ex. L1 Tronc Commun, Licence 3 FD…)</option>
              {yearGroups.map(row => {
                const lvl = (tables.levels || []).find(l => l.id === row.level_id);
                return <option key={row.id} value={row.id}>{String(row.name)}{lvl && !String(row.name).toLowerCase().includes(String(lvl.code || '').toLowerCase()) && !String(row.name).toLowerCase().includes(String(lvl.name || '').toLowerCase()) ? ` (${String(lvl.name)})` : ''}</option>;
              })}
            </select>
          </label>
        )}
        <label className="form-group">1. Filière<select className="select-input" value={programId} onChange={event => { setGroupId(''); setProgramId(event.target.value); setLevelId(''); setVersionId(''); setSemesterId(''); }}><option value="">Choisir une filière</option>{programs.map(row => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></label>
        <label className="form-group">2. Niveau<select className="select-input" disabled={!programId} value={levelId} onChange={event => selectLevel(event.target.value)}><option value="">Choisir un niveau</option>{levels.map(row => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></label>
        {versions.length > 1 && <label className="form-group">Version du programme<select className="select-input" value={versionId} onChange={event => {
          const nextVerId = event.target.value;
          setVersionId(nextVerId);
          const nextSems = (tables.curriculum_semesters || []).filter(row => !row.archived_at && row.curriculum_id === nextVerId).sort((a, b) => Number(a.position) - Number(b.position));
          setSemesterId(nextSems[0]?.id || '');
        }}><option value="">Choisir une version</option>{versions.map(row => <option key={row.id} value={row.id}>Version {String(row.version ?? 1)} · {row.status === 'DRAFT' ? 'Ouverte' : 'Validée'}</option>)}</select></label>}
        <label className="form-group">3. Semestre<select className="select-input" disabled={!curriculum} value={semesterId} onChange={event => setSemesterId(event.target.value)}><option value="">Choisir un semestre</option>{semesters.map(row => <option key={row.id} value={row.id}>{String(row.name)}</option>)}{semesters.length > 1 && <option value="ALL">Tous les semestres ({allCurriculumComponents.length} matières)</option>}</select></label>
      </div>
      {!programId && !groupId ? <p>Choisissez directement un <strong>Groupe</strong> (ex. L1 Tronc Commun, Licence 3 FD…) ou filtrez par filière et niveau.</p> : !levels.length ? <p>Aucun niveau n’est défini pour cette filière. Complétez ses niveaux avec « Gérer les filières et leurs niveaux ».</p> : curriculum && !semesters.length ? <p>Ce programme ne contient pas encore de semestre.</p> : null}
      {curriculum && <div className="btn-group">{editableProgram && <><button className="btn btn-outline" onClick={() => setTask({ collection: 'curriculum_semesters', create: true })}>Ajouter un semestre</button>{semester && <button className="btn btn-outline" onClick={() => setTask({ collection: 'curriculum_semesters', editId: semester.id })}>Modifier le semestre</button>}</>}{curriculum.status === 'APPROVED' && <span className="pill pill-success">Programme approuvé</span>}{levelGroups.length > 0 && <span className="pill pill-default">Groupe(s) : {levelGroups.map(g => String(g.name)).join(', ')}</span>}</div>}
      {!year && <p className="restricted-box">Choisissez une année scolaire précise avant d’ajouter ou de modifier des matières.</p>}
    </section>
    {(semester || showAllSemesters) && (semesterId || groupId) && <section className="card" aria-label="Matières du semestre">
      <div className="card-header"><div><h2>{selectedGroup ? `${String(selectedGroup.name)} · ${activeSemesterLabel}` : activeSemesterLabel}</h2><p>{context}</p></div>{editableProgram && <button className="btn btn-primary" onClick={() => { if (showAllSemesters && semesters[0]) setSemesterId(semesters[0].id); setTask({ collection: 'subjects', create: true }); }}>Ajouter une matière</button>}</div>
      <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Matière</th><th>Code</th>{showAllSemesters && <th>Semestre</th>}<th>Crédits</th><th>Coefficient</th><th>Actions</th></tr></thead><tbody>{components.map(component => {
        const subject = tables.subjects?.find(row => row.id === component.subject_id && !row.archived_at);
        if (!subject) return null;
        const unit = tables.teaching_units?.find(u => u.id === component.unit_id && !u.archived_at);
        const compSem = semesters.find(s => s.id === unit?.semester_id);
        const scheduleHref = canSchedule
          ? `/academique/emploi-du-temps?matiere=${encodeURIComponent(component.id)}${groupId ? `&groupe=${encodeURIComponent(groupId)}` : ''}`
          : '/academique/emploi-du-temps';
        return <tr key={component.id}><td><strong>{String(subject.name)}</strong></td><td>{String(component.code || subject.code || 'Non renseigné')}</td>{showAllSemesters && <td>{String(compSem?.name || semesters[0]?.name || 'Semestre 1')}</td>}<td>{String(component.credits ?? 'Non renseignés')}</td><td>{String(component.coefficient ?? 'Non renseigné')}</td><td><div className="btn-group">{canEdit && year && <button className="btn btn-outline" onClick={() => setTask({ collection: 'subjects', editId: subject.id })}>Modifier la matière</button>}{portal.perms.permissions.includes('schedule.view') && <Link className="btn btn-outline" href={scheduleHref}>{canSchedule ? 'Programmer un cours' : 'Voir l’emploi du temps'}</Link>}</div></td></tr>;
      })}{!components.length && <tr><td colSpan={showAllSemesters ? 6 : 5}>Aucune matière dans ce semestre. Ajoutez la première matière pour préparer les cours.</td></tr>}</tbody></ResponsiveTable></div>
    </section>}
    {unassigned.length > 0 && <section className="card"><h2>Matières sans rattachement renseigné ({unassigned.length})</h2><p>Ces matières sont conservées dans le catalogue, sans semestre associé.</p>{unassigned.map(subject => <p key={subject.id}>{String(subject.name)} · {String(subject.code || 'Code non renseigné')}</p>)}</section>}
    {task && <WorkPage title={task.collection === 'programs' ? 'Filières et niveaux' : `${task.collection === 'subjects' ? 'Matière' : 'Semestre'} · ${context}`} onClose={() => setTask(null)}>
      <ReferenceCrudWorkspace section="acad_program" setup={{ collection: task.collection, yearId: year?.id || '', yearName: year?.name || '', createOnLoad: task.create ?? false, editId: task.editId,
        contextValues: task.collection === 'curriculum_semesters' ? { curriculum_id: curriculum?.id || '' } : task.create && task.collection === 'subjects' ? { semester_id: semester?.id || semesters[0]?.id || '' } : undefined,
        onSaved: changed, onCancel: () => setTask(null), onDone: () => setTask(null), onChoose: collection => setTask({ collection }) }} />
    </WorkPage>}
  </div>;
}

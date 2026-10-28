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
  const programs = (tables.programs || []).filter(row => !row.archived_at && row.active !== false);
  const allCurricula = (tables.curricula || []).filter(row => !row.archived_at && row.status !== 'ARCHIVED');

  const groupOptions = yearGroups.length > 0
    ? yearGroups.map(grp => {
        const lvl = (tables.levels || []).find(l => l.id === grp.level_id);
        const grpOfferingIds = new Set(
          (tables.group_offerings || [])
            .filter(row => !row.archived_at && row.group_id === grp.id)
            .map(row => String(row.offering_id))
        );
        const grpOfferings = (tables.academic_offerings || []).filter(row => !row.archived_at && grpOfferingIds.has(row.id));
        const candidateCurricula = allCurricula.filter(c => grpOfferings.some(o => o.curriculum_id === c.id));
        const bestCurriculum =
          candidateCurricula.find(c => (tables.curriculum_components || []).some(comp => !comp.archived_at && comp.curriculum_id === c.id)) ||
          candidateCurricula.find(c => (tables.curriculum_semesters || []).some(sem => !sem.archived_at && sem.curriculum_id === c.id)) ||
          candidateCurricula[0] ||
          allCurricula.find(c => c.level_id === grp.level_id);
        const rawName = String(grp.name);
        const suffix =
          lvl &&
          !rawName.toLowerCase().includes(String(lvl.code || '').toLowerCase()) &&
          !rawName.toLowerCase().includes(String(lvl.name || '').toLowerCase())
            ? ` (${String(lvl.name)})`
            : '';
        return {
          id: String(grp.id),
          name: rawName,
          label: `${rawName}${suffix}`,
          level: lvl,
          curriculum: bestCurriculum,
          isRealGroup: true,
        };
      })
    : [
        ...allCurricula.map(c => {
          const lvl = (tables.levels || []).find(l => l.id === c.level_id);
          const prog = programs.find(p => p.id === c.program_id);
          const singleForProgram = allCurricula.filter(other => other.program_id === c.program_id).length === 1;
          const id = singleForProgram && c.program_id ? String(c.program_id) : String(c.id);
          const name = [lvl?.name, prog?.name || c.name].filter(Boolean).join(' · ') || String(c.name || c.id);
          return {
            id,
            name,
            label: name,
            level: lvl,
            curriculum: c,
            isRealGroup: false,
          };
        }),
        ...programs
          .filter(p => !allCurricula.some(c => c.program_id === p.id))
          .map(p => ({
            id: String(p.id),
            name: String(p.name),
            label: String(p.name),
            level: undefined,
            curriculum: undefined,
            isRealGroup: false,
          })),
      ];

  const selectedOption = groupOptions.find(opt => opt.id === groupId || opt.curriculum?.id === groupId);
  const curriculum = selectedOption?.curriculum;
  const semesters = (tables.curriculum_semesters || [])
    .filter(row => !row.archived_at && row.curriculum_id === curriculum?.id)
    .sort((a, b) => Number(a.position) - Number(b.position));
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
  const selectedLevel = selectedOption?.level || (tables.levels || []).find(row => row.id === curriculum?.level_id);
  const activeSemesterLabel = showAllSemesters ? 'Tous les semestres' : semester ? String(semester.name) : '';
  const contextParts = [selectedOption?.name, selectedLevel?.name && !String(selectedOption?.name || '').includes(String(selectedLevel.name)) ? String(selectedLevel.name) : '', activeSemesterLabel].filter(Boolean);
  const context = contextParts.join(' · ');
  const editableProgram = canEdit && !!year && curriculum?.status === 'DRAFT';
  const unassigned = (tables.subjects || []).filter(subject => !subject.archived_at && !(tables.curriculum_components || []).some(component => !component.archived_at && component.subject_id === subject.id));
  const changed = () => { setTask(null); portal.refreshCampus(); };

  const selectGroup = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    if (!nextGroupId) {
      setSemesterId('');
      return;
    }
    const opt = groupOptions.find(o => o.id === nextGroupId || o.curriculum?.id === nextGroupId);
    const nextSemesters = (tables.curriculum_semesters || [])
      .filter(row => !row.archived_at && row.curriculum_id === opt?.curriculum?.id)
      .sort((a, b) => Number(a.position) - Number(b.position));
    setSemesterId(nextSemesters[0]?.id || '');
  };

  return <div className="domain-workspace workspace-stack">
    <div className="page-intro"><div><h1>Programmes de cours et matières</h1></div></div>
    <section className="card" aria-label="Choisir le programme">
      <div className="form-grid">
        <label className="form-group">
          1. Groupe
          <select className="select-input" value={groupId} onChange={event => selectGroup(event.target.value)}>
            <option value="">Choisir un groupe</option>
            {groupOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className="form-group">
          2. Semestre
          <select className="select-input" disabled={!curriculum} value={semesterId} onChange={event => setSemesterId(event.target.value)}>
            <option value="">Choisir un semestre</option>
            {semesters.map(row => <option key={row.id} value={row.id}>{String(row.name)}</option>)}
            {semesters.length > 1 && <option value="ALL">Tous les semestres ({allCurriculumComponents.length} matières)</option>}
          </select>
        </label>
      </div>
      {!groupId ? <p>Choisissez un groupe puis un semestre pour afficher ou compléter les matières du programme.</p> : !curriculum ? <p>Aucun programme de cours n’est rattaché à ce groupe.</p> : !semesters.length ? <p>Ce programme ne contient pas encore de semestre.</p> : null}
      {curriculum && <div className="btn-group">{editableProgram && <><button className="btn btn-outline" onClick={() => setTask({ collection: 'curriculum_semesters', create: true })}>Ajouter un semestre</button>{semester && <button className="btn btn-outline" onClick={() => setTask({ collection: 'curriculum_semesters', editId: semester.id })}>Modifier le semestre</button>}</>}{curriculum.status === 'APPROVED' && <span className="pill pill-success">Programme approuvé</span>}{selectedOption && <span className="pill pill-default">Groupe : {selectedOption.name}</span>}</div>}
      {!year && <p className="restricted-box">Choisissez une année scolaire précise avant d’ajouter ou de modifier des matières.</p>}
    </section>
    {(semester || showAllSemesters) && (semesterId || groupId) && <section className="card" aria-label="Matières du semestre">
      <div className="card-header"><div><h2>{selectedOption ? `${selectedOption.name} · ${activeSemesterLabel}` : activeSemesterLabel}</h2><p>{context}</p></div>{editableProgram && <button className="btn btn-primary" onClick={() => { if (showAllSemesters && semesters[0]) setSemesterId(semesters[0].id); setTask({ collection: 'subjects', create: true }); }}>Ajouter une matière</button>}</div>
      <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Matière</th><th>Code</th>{showAllSemesters && <th>Semestre</th>}<th>Crédits</th><th>Coefficient</th><th>Actions</th></tr></thead><tbody>{components.map(component => {
        const subject = tables.subjects?.find(row => row.id === component.subject_id && !row.archived_at);
        if (!subject) return null;
        const unit = tables.teaching_units?.find(u => u.id === component.unit_id && !u.archived_at);
        const compSem = semesters.find(s => s.id === unit?.semester_id);
        const scheduleHref = canSchedule
          ? `/academique/emploi-du-temps?matiere=${encodeURIComponent(component.id)}${selectedOption?.isRealGroup ? `&groupe=${encodeURIComponent(selectedOption.id)}` : ''}`
          : '/academique/emploi-du-temps';
        return <tr key={component.id}><td><strong>{String(subject.name)}</strong></td><td>{String(component.code || subject.code || 'Non renseigné')}</td>{showAllSemesters && <td>{String(compSem?.name || semesters[0]?.name || 'Semestre 1')}</td>}<td>{String(component.credits ?? 'Non renseignés')}</td><td>{String(component.coefficient ?? 'Non renseigné')}</td><td><div className="btn-group">{canEdit && year && <button className="btn btn-outline" onClick={() => setTask({ collection: 'subjects', editId: subject.id })}>Modifier la matière</button>}{portal.perms.permissions.includes('schedule.view') && <Link className="btn btn-outline" href={scheduleHref}>{canSchedule ? 'Programmer un cours' : 'Voir l’emploi du temps'}</Link>}</div></td></tr>;
      })}{!components.length && <tr><td colSpan={showAllSemesters ? 6 : 5}>Aucune matière dans ce semestre. Ajoutez la première matière pour préparer les cours.</td></tr>}</tbody></ResponsiveTable></div>
    </section>}
    {unassigned.length > 0 && <section className="card"><h2>Matières sans rattachement renseigné ({unassigned.length})</h2><p>Ces matières sont conservées dans le catalogue, sans semestre associé.</p>{unassigned.map(subject => <p key={subject.id}>{String(subject.name)} · {String(subject.code || 'Code non renseigné')}</p>)}</section>}
    {task && <WorkPage title={`${task.collection === 'subjects' ? 'Matière' : 'Semestre'} · ${context}`} onClose={() => setTask(null)}>
      <ReferenceCrudWorkspace section="acad_program" setup={{ collection: task.collection, yearId: year?.id || '', yearName: year?.name || '', createOnLoad: task.create ?? false, editId: task.editId,
        contextValues: task.collection === 'curriculum_semesters' ? { curriculum_id: curriculum?.id || '' } : task.create && task.collection === 'subjects' ? { semester_id: semester?.id || semesters[0]?.id || '' } : undefined,
        onSaved: changed, onCancel: () => setTask(null), onDone: () => setTask(null), onChoose: collection => setTask({ collection }) }} />
    </WorkPage>}
  </div>;
}

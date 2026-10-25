'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import ReferenceCrudWorkspace from './ReferenceCrudWorkspace';

export default function ProgramsCoursesWorkspace() {
  const portal = usePortal();
  const tables = portal.relationalSnapshot.tables;
  const [programId, setProgramId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [task, setTask] = useState<{ collection: string; create?: boolean; editId?: string } | null>(null);
  const canEdit = portal.globalAccess && portal.perms.permissions.includes('academic.structure.manage');
  const canSchedule = portal.perms.permissions.includes('schedule.create');
  const year = portal.academicYearContext?.years.find(row => row.id === portal.academicYearContext?.selectedYearId);
  const programs = (tables.programs || []).filter(row => !row.archived_at && row.active !== false);
  const curricula = (tables.curricula || []).filter(row => !row.archived_at && row.status !== 'ARCHIVED' && row.program_id === programId);
  const levels = (tables.levels || []).filter(row => !row.archived_at && curricula.some(curriculum => curriculum.level_id === row.id));
  const versions = curricula.filter(row => row.level_id === levelId);
  const curriculum = versions.find(row => row.id === versionId) || (versions.length === 1 ? versions[0] : undefined);
  const semesters = (tables.curriculum_semesters || []).filter(row => !row.archived_at && row.curriculum_id === curriculum?.id).sort((a, b) => Number(a.position) - Number(b.position));
  const semester = semesters.find(row => row.id === semesterId);
  const components = (tables.curriculum_components || []).filter(row => !row.archived_at && row.curriculum_id === curriculum?.id && tables.teaching_units?.some(unit => !unit.archived_at && unit.id === row.unit_id && unit.semester_id === semester?.id));
  const selectedProgram = programs.find(row => row.id === programId);
  const selectedLevel = levels.find(row => row.id === levelId);
  const context = [selectedProgram?.name, selectedLevel?.name, semester?.name].filter(Boolean).join(' · ');
  const editableProgram = canEdit && !!year && curriculum?.status === 'DRAFT';
  const unassigned = (tables.subjects || []).filter(subject => !subject.archived_at && !(tables.curriculum_components || []).some(component => !component.archived_at && component.subject_id === subject.id));
  const changed = () => { setTask(null); portal.refreshCampus(); };

  return <div className="domain-workspace workspace-stack">
    <div className="page-intro"><div><span className="page-eyebrow">ENSEIGNEMENTS</span><h1>Programmes de cours et matières</h1><p>Choisissez une filière, un niveau, puis un semestre pour organiser ses matières.</p></div>{canEdit && <button className="btn btn-outline" onClick={() => setTask({ collection: 'programs' })}>Gérer les filières et leurs niveaux</button>}</div>
    <section className="card" aria-label="Choisir le programme">
      <div className="form-grid">
        <label className="form-group">1. Filière<select className="select-input" value={programId} onChange={event => { setProgramId(event.target.value); setLevelId(''); setVersionId(''); setSemesterId(''); }}><option value="">Choisir une filière</option>{programs.map(row => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></label>
        <label className="form-group">2. Niveau<select className="select-input" disabled={!programId} value={levelId} onChange={event => { setLevelId(event.target.value); setVersionId(''); setSemesterId(''); }}><option value="">Choisir un niveau</option>{levels.map(row => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></label>
        {versions.length > 1 && <label className="form-group">Version du programme<select className="select-input" value={versionId} onChange={event => { setVersionId(event.target.value); setSemesterId(''); }}><option value="">Choisir une version</option>{versions.map(row => <option key={row.id} value={row.id}>Version {String(row.version ?? 1)} · {row.status === 'DRAFT' ? 'Brouillon' : 'Approuvée'}</option>)}</select></label>}
        <label className="form-group">3. Semestre<select className="select-input" disabled={!curriculum} value={semesterId} onChange={event => setSemesterId(event.target.value)}><option value="">Choisir un semestre</option>{semesters.map(row => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></label>
      </div>
      {!programId ? <p>Commencez par choisir la filière dont vous souhaitez préparer les cours.</p> : !levels.length ? <p>Aucun niveau n’est défini pour cette filière. Complétez ses niveaux avec « Gérer les filières et leurs niveaux ».</p> : curriculum && !semesters.length ? <p>Ce programme ne contient pas encore de semestre.</p> : null}
      {curriculum && <div className="btn-group">{editableProgram && <><button className="btn btn-outline" onClick={() => setTask({ collection: 'curriculum_semesters', create: true })}>Ajouter un semestre</button>{semester && <button className="btn btn-outline" onClick={() => setTask({ collection: 'curriculum_semesters', editId: semester.id })}>Modifier le semestre</button>}</>}<span className="pill pill-default">{curriculum.status === 'DRAFT' ? 'Programme en brouillon' : 'Programme approuvé'}</span></div>}
      {!year && <p className="restricted-box">Choisissez une année scolaire précise avant d’ajouter ou de modifier des matières.</p>}
    </section>
    {semester && <section className="card" aria-label="Matières du semestre">
      <div className="card-header"><div><h2>{String(semester.name)}</h2><p>{context}</p></div>{editableProgram && <button className="btn btn-primary" onClick={() => setTask({ collection: 'subjects', create: true })}>Ajouter une matière</button>}</div>
      <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Matière</th><th>Code</th><th>Crédits</th><th>Coefficient</th><th>Actions</th></tr></thead><tbody>{components.map(component => {
        const subject = tables.subjects?.find(row => row.id === component.subject_id && !row.archived_at);
        if (!subject) return null;
        return <tr key={component.id}><td><strong>{String(subject.name)}</strong></td><td>{String(component.code || subject.code || 'Non renseigné')}</td><td>{String(component.credits ?? 'Non renseignés')}</td><td>{String(component.coefficient ?? 'Non renseigné')}</td><td><div className="btn-group">{canEdit && year && <button className="btn btn-outline" onClick={() => setTask({ collection: 'subjects', editId: subject.id })}>Modifier la matière</button>}{portal.perms.permissions.includes('schedule.view') && <Link className="btn btn-outline" href={canSchedule ? `/academique/emploi-du-temps?matiere=${encodeURIComponent(component.id)}` : '/academique/emploi-du-temps'}>{canSchedule ? 'Programmer un cours' : 'Voir l’emploi du temps'}</Link>}</div></td></tr>;
      })}{!components.length && <tr><td colSpan={5}>Aucune matière dans ce semestre. Ajoutez la première matière pour préparer les cours.</td></tr>}</tbody></ResponsiveTable></div>
    </section>}
    {unassigned.length > 0 && <details className="card"><summary>Matières sans rattachement renseigné ({unassigned.length})</summary><p>Ces matières sont conservées dans le catalogue, sans semestre associé.</p>{unassigned.map(subject => <p key={subject.id}>{String(subject.name)} · {String(subject.code || 'Code non renseigné')}</p>)}</details>}
    {task && <WorkPage title={task.collection === 'programs' ? 'Filières et niveaux' : `${task.collection === 'subjects' ? 'Matière' : 'Semestre'} · ${context}`} onClose={() => setTask(null)}>
      <ReferenceCrudWorkspace section="acad_program" setup={{ collection: task.collection, yearId: year?.id || '', yearName: year?.name || '', createOnLoad: task.create ?? false, editId: task.editId,
        contextValues: task.collection === 'curriculum_semesters' ? { curriculum_id: curriculum?.id || '' } : task.create && task.collection === 'subjects' ? { semester_id: semesterId } : undefined,
        onSaved: changed, onCancel: () => setTask(null), onDone: () => setTask(null), onChoose: collection => setTask({ collection }) }} />
    </WorkPage>}
  </div>;
}

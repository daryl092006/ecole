import { useState } from 'react';
import { useAcademicReferences } from '@/hooks/useAcademicReferences';
import { createAssignment, createSemester } from '@/services/academicPlanningService';
import type { RoleName } from '@/types';
import { SEMESTERS_BY_LEVEL } from '@/constants/academicStructure';

export default function PlanningReferenceForms({ mode, role }: { mode: 'semester' | 'assignment'; role: RoleName }) {
  const refs = useAcademicReferences();
  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const select = (key: string, label: string, options: { id: string; name: string }[]) => <label className="form-group">{label}<select required className="select-input" value={values[key] ?? ''} onChange={event => setValues({ ...values, [key]: event.target.value })}><option value="">Sélectionner</option>{options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
  return <form className="mb-2" onSubmit={event => {
    event.preventDefault();
    try {
      if (mode === 'semester') {
        const item = createSemester(refs, values.year, values.level, Number(values.order), values.start, values.end, role);
        refs.setSemesters(previous => [...previous, item]);
      } else {
        const group = refs.groups.find(item => item.id === values.group);
        const item = createAssignment(refs, { subjectId: values.subject, teacherId: values.teacher, groupId: values.group, semesterId: values.semester, academicYearId: group?.academicYearId ?? '' }, role);
        refs.setAssignments(previous => [...previous, item]);
      }
      setValues({}); setFeedback('Enregistrement effectué.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Opération impossible.'); }
  }}>
    <div className="form-row">
    {mode === 'semester' ? <>
      {select('year', 'Année', refs.academicYears.filter(item => item.status !== 'CLOTUREE').map(item => ({ id: item.id, name: item.label })))}
      {select('level', 'Niveau', refs.levels.filter(item => item.active))}
      {select('order', 'Semestre', (SEMESTERS_BY_LEVEL[refs.levels.find(item => item.id === values.level)?.code ?? ''] ?? []).map(order => ({ id: String(order), name: `Semestre ${order}` })))}
      {['start', 'end'].map(key => <label className="form-group" key={key}>{key === 'start' ? 'Début' : 'Fin'}<input className="input" required type="date" value={values[key] ?? ''} onChange={event => setValues({ ...values, [key]: event.target.value })} /></label>)}
    </> : <>
      {select('subject', 'Matière', refs.subjects.filter(item => item.active))}
      {select('teacher', 'Enseignant', refs.teachers.filter(item => item.active).map(item => ({ id: item.id, name: `${item.firstname} ${item.lastname}` })))}
      {select('group', 'Groupe', refs.groups)}
      {select('semester', 'Semestre', refs.semesters.filter(item => { const group = refs.groups.find(group => group.id === values.group); return item.active && item.academicYearId === group?.academicYearId && item.levelId === group?.levelId; }))}
    </>}
    </div><button className="btn btn-primary">{mode === 'semester' ? 'Créer le semestre' : 'Créer l’affectation'}</button>
    {feedback && <p role="status">{feedback}</p>}
    {mode === 'semester' && refs.semesters.map(item => <p key={item.id}>{item.name} · {refs.levels.find(level => level.id === item.levelId)?.name} · {item.startDate} · {item.endDate}</p>)}
  </form>;
}

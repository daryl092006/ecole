import { useState } from 'react';
import type { RoleName } from '@/types';
import { useAcademicReferences } from '@/hooks/useAcademicReferences';
import { createTeachingUnit, createAnnualSubject } from '@/services/teachingUnitService';
export default function TeachingUnitsPanel({ role }: { role: RoleName }) {
  const refs = useAcademicReferences();
  const [unit, setUnit] = useState({ code: '', name: '', programId: '', academicYearId: '', semesterId: '', credits: '' });
  const [subject, setSubject] = useState({ code: '', name: '', teachingUnitId: '', coefficient: '1', credits: '' });
  const [feedback, setFeedback] = useState('');
  const run = (action: () => void) => { try { action(); setFeedback('Enregistrement effectué.'); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Opération impossible.'); } };
  return <div><h2>UE et matières par année</h2>
    <form className="mb-2" onSubmit={event => { event.preventDefault(); run(() => { const item = createTeachingUnit(refs, { ...unit, credits: Number(unit.credits) }, role); refs.setUnits(previous => [...previous, item]); setUnit({ code: '', name: '', programId: '', academicYearId: '', semesterId: '', credits: '' }); }); }}>
      <div className="form-row">{(['code', 'name', 'credits'] as const).map(key => <label key={key}>{key === 'code' ? 'Code UE' : key === 'name' ? 'Nom UE' : 'Crédits UE'}<input className="input" required type={key === 'credits' ? 'number' : 'text'} min="1" value={unit[key]} onChange={event => setUnit({ ...unit, [key]: event.target.value })} /></label>)}
      <label>Filière<select className="select-input" required value={unit.programId} onChange={event => setUnit({ ...unit, programId: event.target.value })}><option value="">Sélectionner</option>{refs.programs.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Année<select className="select-input" required value={unit.academicYearId} onChange={event => setUnit({ ...unit, academicYearId: event.target.value, semesterId: '' })}><option value="">Sélectionner</option>{refs.academicYears.filter(item => item.status !== 'CLOTUREE').map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Semestre<select className="select-input" required value={unit.semesterId} onChange={event => setUnit({ ...unit, semesterId: event.target.value })}><option value="">Sélectionner</option>{refs.semesters.filter(item => item.active && item.academicYearId === unit.academicYearId).map(item => <option key={item.id} value={item.id}>{item.name} · {refs.levels.find(level => level.id === item.levelId)?.name}</option>)}</select></label></div><button className="btn btn-primary">Créer l’UE</button>
    </form>
    <form className="mb-2" onSubmit={event => { event.preventDefault(); run(() => { const item = createAnnualSubject(refs, { ...subject, credits: Number(subject.credits), coefficient: Number(subject.coefficient) }, role); refs.setSubjects(previous => [...previous, item]); setSubject({ code: '', name: '', teachingUnitId: '', coefficient: '1', credits: '' }); }); }}>
      <div className="form-row">{(['code', 'name', 'coefficient', 'credits'] as const).map(key => <label key={key}>{({ code: 'Code matière', name: 'Nom matière', coefficient: 'Coefficient', credits: 'Crédits matière' })[key]}<input className="input" required type={['coefficient', 'credits'].includes(key) ? 'number' : 'text'} min={key === 'coefficient' ? '0.1' : '1'} step={key === 'coefficient' ? '0.1' : '1'} value={subject[key]} onChange={event => setSubject({ ...subject, [key]: event.target.value })} /></label>)}
      <label>UE<select required className="select-input" value={subject.teachingUnitId} onChange={event => setSubject({ ...subject, teachingUnitId: event.target.value })}><option value="">Sélectionner</option>{refs.units.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.code} · {item.name} · {refs.academicYears.find(year => year.id === item.academicYearId)?.label}</option>)}</select></label></div><button className="btn btn-primary">Créer la matière</button>
    </form>{feedback && <p role="status">{feedback}</p>}
    {refs.units.map(item => <p key={item.id}><strong>{item.code} · {item.name}</strong> · {item.credits} crédits · {refs.subjects.filter(subject => subject.teachingUnitId === item.id).map(subject => subject.name).join(', ') || 'Aucune matière'}</p>)}
    {refs.subjects.map(item => <p key={item.id}>{item.code} · {item.name} · Coef. {item.coefficient} · {item.credits ?? '—'} crédits</p>)}
  </div>;
}

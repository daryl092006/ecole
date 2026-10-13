import { useState } from 'react';
import TeachingUnitsPanel from './TeachingUnitsPanel';
import PlanningReferenceForms from './PlanningReferenceForms';
import { useAcademicReferences } from '@/hooks/useAcademicReferences';
import AcademicYearsPanel from '@/components/modules/academic/AcademicYearsPanel';
import ProgramsTracksPanel from '@/components/modules/academic/ProgramsTracksPanel';
import type { RoleName } from '@/types';
import { SEMESTERS_BY_LEVEL } from '@/constants/academicStructure';
import { createGroup } from '@/services/groupService';

type Section = 'years' | 'programs' | 'levels' | 'subjects' | 'groups' | 'teachers' | 'assignments';
const ask = (label: string, initial = '') => prompt(label, initial)?.trim();

interface Props {
  actorRole: RoleName;
  canManageStructure: boolean;
  canManageGroups: boolean;
  canManageAssignments: boolean;
}

export default function AcademicReferenceModule({ actorRole, canManageStructure, canManageGroups, canManageAssignments }: Props) {
  const refs = useAcademicReferences();
  const [section, setSection] = useState<Section>('years');
  const [groupProgramIds, setGroupProgramIds] = useState<string[]>([]);
  const [groupLevelId, setGroupLevelId] = useState('');
  const [groupYearId, setGroupYearId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupFeedback, setGroupFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const action = (callback: () => void) => { try { callback(); } catch (error) { alert(error instanceof Error ? error.message : 'Opération impossible.'); } };
  const structureSections: Section[] = ['years', 'programs', 'levels', 'subjects'];
  const canManageSection = structureSections.includes(section)
    ? canManageStructure
    : section === 'groups'
      ? canManageGroups
      : canManageAssignments;
  const sectionOwner = structureSections.includes(section) ? 'Directeur Académique ou Logisticien académique' : 'Logisticien académique';
  return <div><div className="module-header"><h1>Référentiel académique</h1><p>Chaque domaine est indépendant. Sélectionnez directement ce que vous souhaitez gérer.</p></div>
    <div className="btn-group mb-2"><button className={`btn btn-sm ${section === 'years' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('years')}>Années scolaires</button><button className={`btn btn-sm ${section === 'programs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('programs')}>Filières & parcours</button><button className={`btn btn-sm ${section === 'levels' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('levels')}>Niveaux & semestres</button><button className={`btn btn-sm ${section === 'subjects' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('subjects')}>Matières</button><button className={`btn btn-sm ${section === 'groups' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('groups')}>Groupes</button><button className={`btn btn-sm ${section === 'teachers' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('teachers')}>Enseignants</button><button className={`btn btn-sm ${section === 'assignments' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('assignments')}>Affectations</button></div>
    {!canManageSection && <div className="info-box mb-2">Mode consultation : cette étape est gérée par le {sectionOwner}.</div>}
    <fieldset className="permission-fieldset" disabled={!canManageSection}><div className="card card-full">
      {section === 'years' && <AcademicYearsPanel academicYears={refs.academicYears} actorRole={actorRole} onChange={refs.setAcademicYears} />}
      {section === 'programs' && <ProgramsTracksPanel programs={refs.programs} tracks={refs.tracks} actorRole={actorRole} onProgramsChange={refs.setPrograms} onTracksChange={refs.setTracks} />}
      {section === 'levels' && <><PlanningReferenceForms mode="semester" role={actorRole} /><div className="card-header"><div><h2>Niveaux et semestres associés</h2><div className="cell-sub">La numérotation est imposée par le cycle et ne peut pas être saisie librement.</div></div></div>{refs.levels.map(item => <div key={item.id} className="card-header"><span><code>{item.code}</code> {item.name}<div className="cell-sub">Cycle {item.cycle === 'LICENCE' ? 'Licence' : 'Master'} · {(SEMESTERS_BY_LEVEL[item.code] ?? []).map(number => `Semestre ${number}`).join(' et ')}</div></span><button className="btn btn-sm btn-outline" onClick={() => refs.setLevels(prev => refs.toggleLocalEntity(prev, item.id))}>{item.active ? 'Désactiver' : 'Activer'}</button></div>)}</>}
      {section === 'groups' && <>
        <div className="card-header"><div><h2>Groupes</h2><div className="cell-sub">Un groupe appartient à une année et un niveau, et peut réunir plusieurs filières. Il n’est ni une filière ni une salle.</div></div></div>
        <div className="guided-form mb-2">
          <div className="guided-field"><span className="guided-number">1</span><div className="form-group"><label className="form-label">Filières concernées</label>{refs.programs.filter(item => item.active).length === 0 ? <span className="field-error">Créez d’abord au moins une filière active.</span> : refs.programs.filter(item => item.active).map(program => <label key={program.id} style={{ display: 'block', marginTop: '0.5rem' }}><input type="checkbox" checked={groupProgramIds.includes(program.id)} onChange={event => { setGroupProgramIds(current => event.target.checked ? [...current, program.id] : current.filter(id => id !== program.id)); setGroupFeedback(null); }} /> {program.name}</label>)}</div></div>
          <div className="guided-field"><span className="guided-number">2</span><div className="form-group"><label className="form-label">Niveau</label><select className="select-input" value={groupLevelId} onChange={event => setGroupLevelId(event.target.value)}><option value="">Sélectionner</option>{refs.levels.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>
          <div className="guided-field"><span className="guided-number">3</span><div className="form-group"><label className="form-label">Année scolaire</label><select className="select-input" value={groupYearId} onChange={event => setGroupYearId(event.target.value)}><option value="">Sélectionner une année ouverte</option>{refs.academicYears.filter(item => item.active).map(year => <option key={year.id} value={year.id}>{year.label}</option>)}</select></div></div>
        </div>
        <div className="form-row mb-2"><div className="form-group" style={{ flex: 1 }}><label className="form-label">Nom du groupe</label><input className="input" value={groupName} onChange={event => { setGroupName(event.target.value); setGroupFeedback(null); }} placeholder="Ex. Groupe IA" /></div><button className="btn btn-primary" onClick={() => { const result = createGroup(refs.groups, refs.programs, refs.levels, refs.academicYears, { name: groupName, programIds: groupProgramIds, levelId: groupLevelId, academicYearId: groupYearId }, actorRole); if (!result.success) { setGroupFeedback({ type: 'error', text: result.error }); return; } refs.setGroups(previous => [...previous, result.group]); setGroupName(''); setGroupProgramIds([]); setGroupLevelId(''); setGroupYearId(''); setGroupFeedback({ type: 'success', text: `Le groupe ${result.group.name} a été créé.` }); }}>Créer le groupe</button></div>
        {groupFeedback && <div className={groupFeedback.type === 'error' ? 'restricted-box mb-2' : 'info-box mb-2'}>{groupFeedback.text}</div>}
        {refs.groups.map(item => <div key={item.id} className="card-header"><span><strong>{item.name}</strong><div className="cell-sub">{item.niveau} · {item.filieres.join(', ')} · {item.academicYear} · {item.studentIds.length} étudiant(s)</div></span><button className="btn btn-sm btn-outline" onClick={() => { const name = ask('Nom du groupe', item.name); if (name) refs.setGroups(prev => refs.updateLocalEntity(prev, { ...item, name })); }}>Modifier</button></div>)}
      </>}
      {section === 'subjects' && <TeachingUnitsPanel role={actorRole} />}
      {section === 'teachers' && <><div className="card-header"><h2>Enseignants</h2><button className="btn btn-sm btn-primary" onClick={() => { const firstname = ask('Prénom'); const lastname = ask('Nom'); if (firstname && lastname) action(() => refs.setTeachers(prev => refs.createLocalEntity(prev, { id: `TEACH-${Date.now()}`, employeeNumber: `ENS-${prev.length + 1}`, firstname, lastname, email: '', specialty: '', active: true }))); }}>Ajouter</button></div>{refs.teachers.map(item => <div key={item.id} className="card-header"><span><strong>{item.firstname} {item.lastname}</strong><div className="cell-sub">{item.employeeNumber} · {item.specialty || 'Spécialité non renseignée'}</div></span><div className="btn-group"><button className="btn btn-sm btn-outline" onClick={() => { const specialty = ask('Spécialité', item.specialty); if (specialty !== undefined) refs.setTeachers(prev => refs.updateLocalEntity(prev, { ...item, specialty })); }}>Modifier</button><button className="btn btn-sm btn-outline" onClick={() => refs.setTeachers(prev => refs.toggleLocalEntity(prev, item.id))}>{item.active ? 'Désactiver' : 'Activer'}</button></div></div>)}</>}
      {section === 'assignments' && <><PlanningReferenceForms mode="assignment" role={actorRole} /><div className="card-header"><h2>Affectations pédagogiques</h2></div>{refs.assignments.length === 0 && <div className="empty-state"><strong>Aucune affectation pédagogique</strong><span>Créez les matières, enseignants, groupes et semestres, puis utilisez le formulaire ci-dessus.</span></div>}{refs.assignments.map(item => <div key={item.id} className="card-header"><span><strong>{refs.subjects.find(subject => subject.id === item.subjectId)?.name}</strong><div className="cell-sub">{refs.teachers.find(teacher => teacher.id === item.teacherId)?.firstname} {refs.teachers.find(teacher => teacher.id === item.teacherId)?.lastname} · {refs.groups.find(group => group.id === item.groupId)?.name} · {refs.semesters.find(semester => semester.id === item.semesterId)?.name} · {refs.academicYears.find(year => year.id === item.academicYearId)?.label}</div></span><button className="btn btn-sm btn-outline" onClick={() => refs.setAssignments(prev => refs.toggleLocalEntity(prev, item.id))}>{item.active ? 'Désactiver' : 'Activer'}</button></div>)}</>}
    </div></fieldset>
  </div>;
}

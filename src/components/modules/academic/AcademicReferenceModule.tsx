import IconButton from '@/components/ui/IconButton';
import TeachersPanel from './TeachersPanel';
import { useState } from 'react';
import TeachingUnitsPanel from './TeachingUnitsPanel';
import PlanningReferenceForms from './PlanningReferenceForms';
import { useAcademicReferences } from '@/hooks/useAcademicReferences';
import AcademicYearsPanel from '@/components/modules/academic/AcademicYearsPanel';
import ProgramsTracksPanel from '@/components/modules/academic/ProgramsTracksPanel';
import type { RoleName } from '@/types';
import { SEMESTERS_BY_LEVEL } from '@/constants/academicStructure';
import { createGroup } from '@/services/groupService';
import { usePortal } from '@/hooks/usePortal';

type Section = 'years' | 'programs' | 'levels' | 'subjects' | 'groups' | 'teachers' | 'assignments';

interface Props {
  actorRole: RoleName;
  canManageStructure: boolean;
  canManageGroups: boolean;
  canManageAssignments: boolean;
}

export default function AcademicReferenceModule({ actorRole, canManageStructure, canManageGroups, canManageAssignments }: Props) {
  const refs = useAcademicReferences();
  const portal = usePortal();
  const [section, setSection] = useState<Section>('years');
  const [groupProgramIds, setGroupProgramIds] = useState<string[]>([]);
  const [groupLevelId, setGroupLevelId] = useState('');
  const [groupYearId, setGroupYearId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState('');
  const [editingGroupName, setEditingGroupName] = useState('');
  const [groupFeedback, setGroupFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const structureSections: Section[] = ['years', 'programs', 'levels', 'subjects'];
  const canManageSection = structureSections.includes(section)
    ? canManageStructure
    : section === 'groups'
      ? canManageGroups
      : canManageAssignments;
  const sectionOwner = structureSections.includes(section) ? 'Directeur Académique ou Logisticien académique' : 'Logisticien académique';
  return <div><div className="module-header"><h1>Référentiel académique</h1></div>
    <div className="btn-group section-tabs mb-2" role="group" aria-label="Domaines du référentiel"><button aria-pressed={section === 'years'} className={`btn btn-sm ${section === 'years' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('years')}>Années scolaires</button><button aria-pressed={section === 'programs'} className={`btn btn-sm ${section === 'programs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('programs')}>Filières & parcours</button><button aria-pressed={section === 'levels'} className={`btn btn-sm ${section === 'levels' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('levels')}>Niveaux & semestres</button><button aria-pressed={section === 'subjects'} className={`btn btn-sm ${section === 'subjects' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('subjects')}>Matières</button><button aria-pressed={section === 'groups'} className={`btn btn-sm ${section === 'groups' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('groups')}>Groupes</button><button aria-pressed={section === 'teachers'} className={`btn btn-sm ${section === 'teachers' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('teachers')}>Enseignants</button><button aria-pressed={section === 'assignments'} className={`btn btn-sm ${section === 'assignments' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSection('assignments')}>Affectations</button></div>
    {!canManageSection && <div className="info-box mb-2">Mode consultation : cette étape est gérée par le {sectionOwner}.</div>}
    <fieldset className="permission-fieldset" disabled={!canManageSection}><div className="card card-full">
      {section === 'years' && <AcademicYearsPanel academicYears={refs.academicYears} actorRole={actorRole} onChange={refs.setAcademicYears} />}
      {section === 'programs' && <ProgramsTracksPanel programs={refs.programs} tracks={refs.tracks} actorRole={actorRole} onProgramsChange={refs.setPrograms} onTracksChange={refs.setTracks} />}
      {section === 'levels' && <><PlanningReferenceForms mode="semester" role={actorRole} /><div className="card-header"><div><h2>Niveaux et semestres associés</h2></div></div>{refs.levels.map(item => <div key={item.id} className="card-header"><span><code>{item.code}</code> {item.name}<div className="cell-sub">Cycle {item.cycle === 'LICENCE' ? 'Licence' : 'Master'} · {(SEMESTERS_BY_LEVEL[item.code] ?? []).map(number => `Semestre ${number}`).join(' et ')}</div></span><button className="btn btn-sm btn-outline" onClick={() => refs.setLevels(prev => refs.toggleLocalEntity(prev, item.id))}>{item.active ? 'Désactiver' : 'Activer'}</button></div>)}</>}
      {section === 'groups' && <>
        <div className="card-header"><div><h2>Groupes</h2></div></div>
        <div className="guided-form mb-2">
          <div className="guided-field"><span className="guided-number">1</span><div className="form-group"><label className="form-label">Filières concernées</label>{refs.programs.filter(item => item.active).length === 0 ? <span className="field-error">Créez d’abord au moins une filière active.</span> : refs.programs.filter(item => item.active).map(program => <label key={program.id} style={{ display: 'block', marginTop: '0.5rem' }}><input type="checkbox" checked={groupProgramIds.includes(program.id)} onChange={event => { setGroupProgramIds(current => event.target.checked ? [...current, program.id] : current.filter(id => id !== program.id)); setGroupFeedback(null); }} /> {program.name}</label>)}</div></div>
          <div className="guided-field"><span className="guided-number">2</span><div className="form-group"><label className="form-label" htmlFor="group-level">Niveau</label><select id="group-level" className="select-input" value={groupLevelId} onChange={event => setGroupLevelId(event.target.value)}><option value="">Sélectionner</option>{refs.levels.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>
          <div className="guided-field"><span className="guided-number">3</span><div className="form-group"><label className="form-label" htmlFor="group-year">Année scolaire</label><select id="group-year" className="select-input" value={groupYearId} onChange={event => setGroupYearId(event.target.value)}><option value="">Sélectionner une année ouverte</option>{refs.academicYears.filter(item => item.active).map(year => <option key={year.id} value={year.id}>{year.label}</option>)}</select></div></div>
        </div>
        <div className="form-row mb-2"><div className="form-group" style={{ flex: 1 }}><label className="form-label" htmlFor="group-name">Nom du groupe</label><input id="group-name" className="input" value={groupName} onChange={event => { setGroupName(event.target.value); setGroupFeedback(null); }} placeholder="Ex. Groupe IA" /></div><button className="btn btn-primary" onClick={() => { const result = createGroup(refs.groups, refs.programs, refs.levels, refs.academicYears, { name: groupName, programIds: groupProgramIds, levelId: groupLevelId, academicYearId: groupYearId }, actorRole); if (!result.success) { setGroupFeedback({ type: 'error', text: result.error }); return; } refs.setGroups(previous => [...previous, result.group]); portal.logEvent('Création groupe', JSON.stringify({ entity: result.group.id, oldValue: null, newValue: result.group })); setGroupName(''); setGroupProgramIds([]); setGroupLevelId(''); setGroupYearId(''); setGroupFeedback({ type: 'success', text: `Le groupe ${result.group.name} a été créé.` }); }}>Créer le groupe</button></div>
        {groupFeedback && <div className={groupFeedback.type === 'error' ? 'restricted-box mb-2' : 'info-box mb-2'}>{groupFeedback.text}</div>}
        {refs.groups.map(item => <div key={item.id} className="card-header"><span><strong>{item.name}</strong><div className="cell-sub">{item.niveau} · {item.filieres.join(', ')} · {item.academicYear} · {item.studentIds.length} étudiant(s)</div></span><IconButton className="btn btn-sm btn-outline" onClick={() => { setEditingGroupId(item.id); setEditingGroupName(item.name); }} label="Modifier" /></div>)}
      </>}
      {section === 'groups' && editingGroupId && <div className="card card-full mt-2"><form onSubmit={event => { event.preventDefault(); try { portal.renameGroup(editingGroupId, editingGroupName); setEditingGroupId(''); setGroupFeedback({ type: 'success', text: 'Groupe renommé et dossiers actualisés.' }); } catch (error) { setGroupFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Modification impossible.' }); } }}><label className="form-group">Nouveau nom du groupe<input className="input" required value={editingGroupName} onChange={event => setEditingGroupName(event.target.value)} /></label><div className="btn-group"><button className="btn btn-primary">Enregistrer le nom</button><IconButton className="btn btn-outline" type="button" onClick={() => setEditingGroupId('')} label="Fermer" /></div></form></div>}
      {section === 'subjects' && <TeachingUnitsPanel role={actorRole} />}
      {section === 'teachers' && <TeachersPanel role={actorRole} />}
      {section === 'assignments' && <><PlanningReferenceForms mode="assignment" role={actorRole} /><div className="card-header"><h2>Affectations pédagogiques</h2></div>{refs.assignments.length === 0 && <div className="empty-state"><strong>Aucune affectation pédagogique</strong><span>Créez les matières, enseignants, groupes et semestres, puis utilisez le formulaire ci-dessus.</span></div>}{refs.assignments.map(item => <div key={item.id} className="card-header"><span><strong>{refs.subjects.find(subject => subject.id === item.subjectId)?.name}</strong><div className="cell-sub">{refs.teachers.find(teacher => teacher.id === item.teacherId)?.firstname} {refs.teachers.find(teacher => teacher.id === item.teacherId)?.lastname} · {refs.groups.find(group => group.id === item.groupId)?.name} · {refs.semesters.find(semester => semester.id === item.semesterId)?.name} · {refs.academicYears.find(year => year.id === item.academicYearId)?.label}</div></span><button className="btn btn-sm btn-outline" onClick={() => refs.setAssignments(prev => refs.toggleLocalEntity(prev, item.id))}>{item.active ? 'Désactiver' : 'Activer'}</button></div>)}</>}
    </div></fieldset>
  </div>;
}
